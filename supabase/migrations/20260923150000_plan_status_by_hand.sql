-- Migration: plan_sessions.status — set by hand, held against the agent, and in the history
--
-- Until now a plan's status was only ever the planner agent's (`agent.metadata.status`,
-- mirrored on every upload by CloudStore.planSessionRow): "planning" while the spec is
-- written, "planned" once the tickets are filed. Nobody could say a plan was finished, or
-- dropped. This migration lets the people on a plan say so, and records it.
--
--   * WHO. Whoever may edit the plan's text (20260923100000): its author, and on a team
--     repository any member of the organization. `status` joins the columns
--     `guard_member_edit` lets a member write.
--   * THE HAND WINS OVER THE AGENT. A status set from the app sets `status_by_hand`, and
--     from then on the agent's uploads leave the status alone: without that, the next
--     launch reconcile would put "planned" back over a plan somebody just closed. The
--     agent's upload is told apart the way `record_revision` tells it (the owner's request
--     carrying `x-magic-plan-source: agent`); every other write by a user is a hand.
--     `status_by_hand` is the trigger's to set, never the client's: whatever a request
--     sends for it is replaced by the old value unless the trigger decides otherwise.
--   * WHICH WORDS. A hand may only set one of the four the app draws — planning, planned,
--     done, abandoned. The agent's path keeps the column's free text (20260821090000
--     declines a CHECK on purpose); only the hand is held to the list.
--   * RECORDED. Every change of status by a user lands in `plan_status_events`, with its
--     old and new values, who, and whether it was by hand or the agent's — the same
--     trigger-written, SELECT-only discipline as `plan_link_events`. A write with no user
--     (a migration, the console) records nothing, as for revisions. A held agent write
--     changes nothing, so it records nothing either.
--   * NO BACKFILL: nobody recorded who set the statuses the plans hold today.

alter table public.plan_sessions add column if not exists status_by_hand boolean not null default false;

comment on column public.plan_sessions.status_by_hand is
  'True once a person has set the status from the app: the planner agent''s uploads then '
  'leave `status` alone. Written by the hold_status trigger only; a client''s value is ignored.';

-- ---------------------------------------------------------------------------
-- Whose request this is: the owner's agent upload, or a hand
-- ---------------------------------------------------------------------------
-- `record_revision`'s test, lifted into one place for the triggers below. The header is
-- believed from the plan's OWNER alone, and a value that is not JSON reads as no header.
create or replace function public.plan_request_is_agent(p_owner_id uuid)
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_headers text;
begin
  if p_owner_id is distinct from auth.uid() then
    return false;
  end if;
  v_headers := nullif(current_setting('request.headers', true), '');
  if v_headers is null then
    return false;
  end if;
  begin
    return coalesce((v_headers::json ->> 'x-magic-plan-source') = 'agent', false);
  exception when others then
    return false;
  end;
end;
$$;

comment on function public.plan_request_is_agent(uuid) is
  'True when the current request is the plan owner''s app uploading its agent''s work '
  '(x-magic-plan-source: agent, from the owner only). Used by plan_sessions triggers.';

revoke execute on function public.plan_request_is_agent(uuid) from public;
grant execute on function public.plan_request_is_agent(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The column guard, with `status` and `status_by_hand` on the allow-list
-- ---------------------------------------------------------------------------
-- 20260923100000's function verbatim but for the list. `status_by_hand` is on it because
-- `hold_status` — which fires AFTER this one (g < h) — owns it, the way `number` is on it
-- for `set_plan_number`: a member's write is not refused for what the member did not do,
-- and what the member sends for it is overwritten.
create or replace function public.plan_sessions_guard_member_edit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  content_columns constant text[] := array['spec', 'title', 'idea', 'status', 'status_by_hand', 'updated_at', 'org_id', 'number'];
begin
  if current_user = 'authenticated' and old.owner_id is distinct from auth.uid() then
    if (to_jsonb(new) - content_columns) is distinct from (to_jsonb(old) - content_columns) then
      raise exception 'only the author of a plan session may change anything but its spec, title, idea and status'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.plan_sessions_guard_member_edit() is
  'Refuse a write by an org member (not the author) that changes anything on a plan '
  'session other than spec, title, idea and status. System paths (SECURITY DEFINER '
  'derivations, referential actions) do not run as authenticated and are not judged. '
  'Trigger-only.';

-- ---------------------------------------------------------------------------
-- hold_status: the hand wins, and only says words the app knows
-- ---------------------------------------------------------------------------
-- BEFORE UPDATE, after `guard_member_edit` (alphabetical). No column list, so a client
-- sending `status_by_hand` alone is still reset.
create or replace function public.plan_sessions_hold_status()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.status_by_hand := old.status_by_hand;
  if new.status is not distinct from old.status or auth.uid() is null or current_user <> 'authenticated' then
    return new;
  end if;

  if public.plan_request_is_agent(old.owner_id) then
    if old.status_by_hand then
      new.status := old.status;
    end if;
    return new;
  end if;

  if new.status not in ('planning', 'planned', 'done', 'abandoned') then
    -- 22023, invalid_parameter_value.
    raise exception 'unknown plan status: %', new.status using errcode = '22023';
  end if;
  new.status_by_hand := true;
  return new;
end;
$$;

comment on function public.plan_sessions_hold_status() is
  'Keep a status set by hand against the planner agent''s uploads, mark a hand-set status '
  'as such, and hold a hand to the four statuses the app draws. Trigger-only.';

revoke execute on function public.plan_sessions_hold_status() from public;

drop trigger if exists hold_status on public.plan_sessions;
create trigger hold_status
  before update on public.plan_sessions
  for each row execute function public.plan_sessions_hold_status();

-- ---------------------------------------------------------------------------
-- plan_status_events: every change of status, by whom and how
-- ---------------------------------------------------------------------------
create table if not exists public.plan_status_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- Free text, like the column they copy: the agent's path is not held to the list.
  from_status text,
  to_status text not null,
  source text not null,
  -- on delete set null: the change happened, whoever made it left.
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint plan_status_events_source check (source in ('human', 'agent'))
);

comment on table public.plan_status_events is
  'Every change of a /magic:plan session''s status: from what, to what, by whom, and whether '
  'by hand or by the planner agent. Written only by a trigger on plan_sessions; readable by '
  'whoever can read the session; the latest 500 per session are kept.';

create index if not exists idx_plan_status_events_session_created
  on public.plan_status_events (session_id, created_at desc);

alter table public.plan_status_events enable row level security;

revoke all on public.plan_status_events from authenticated, anon;
grant select on public.plan_status_events to authenticated;

create policy plan_status_events_select on public.plan_status_events
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

-- AFTER UPDATE OF status: what was actually written, once `hold_status` has had its say.
create or replace function public.plan_sessions_log_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or old.status is not distinct from new.status then
    return null;
  end if;

  insert into public.plan_status_events (session_id, from_status, to_status, source, actor_id)
  values (
    new.id, old.status, new.status,
    case when public.plan_request_is_agent(new.owner_id) then 'agent' else 'human' end,
    auth.uid()
  );

  delete from public.plan_status_events
   where session_id = new.id
     and id not in (
       select e.id from public.plan_status_events e
        where e.session_id = new.id
        order by e.created_at desc, e.id desc
        limit 500
     );

  return null;
end;
$$;

comment on function public.plan_sessions_log_status() is
  'Record a change of a plan session''s status in plan_status_events, by auth.uid(), '
  '''agent'' for the owner''s agent upload and ''human'' otherwise. Records nothing for a '
  'write with no user. Trigger-only.';

revoke execute on function public.plan_sessions_log_status() from public;

drop trigger if exists log_status on public.plan_sessions;
create trigger log_status
  after update of status on public.plan_sessions
  for each row execute function public.plan_sessions_log_status();
