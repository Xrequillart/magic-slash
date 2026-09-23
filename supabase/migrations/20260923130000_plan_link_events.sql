-- Migration: plan_link_events — every link pinned to a plan, or taken off it
--
-- `plan_links` (20260923110000) holds the links a plan carries NOW. A link removed is a row
-- deleted, and with it goes the only record that the Figma file the team argued over was
-- ever attached. This table keeps that record: one row per link added or removed, with who
-- did it and, copied at that moment, the link's address, kind and title — so a removed link
-- stays readable in the plan's history after its row is gone.
--
-- WRITTEN BY A TRIGGER ON `plan_links`, NEVER BY A CLIENT. `authenticated` holds SELECT
-- only, as on `plan_revisions` and `settings_events`: the app does not have to remember to
-- log anything, and cannot log anything that did not happen. The trigger is SECURITY
-- DEFINER for exactly that reason — it writes a table its caller may not.
--
-- `link_id` IS NOT A FOREIGN KEY. It names a row that, for every `removed` event, no longer
-- exists; the event carries the link's content itself, and the id only lets a reader pair an
-- addition with its removal.
--
-- `actor_id` is whoever made the change — `auth.uid()`, or the link's own author for a write
-- that carries no user (a migration, the SQL console). on delete set null, for the reason
-- `plan_revisions.author_id` gives: the change happened, whoever made it left.
--
-- TWO CASCADES REACH `plan_links`, and the trigger has to survive both: the plan deleted
-- (its links go, and their history with them — nothing to record) and the link author's
-- account deleted (`plan_links.author_id` cascades — the plan stays, so the removal IS
-- recorded, under no name). See the trigger for how each is told apart.
--
-- BOUNDED: the latest 500 events per plan. A plan's links are a handful; the cap is there
-- so a runaway client pinning and unpinning cannot grow the table without end.

create table if not exists public.plan_link_events (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: deleting a plan deletes its history, links included.
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- The link's id at the time. Deliberately not a foreign key — see the header.
  link_id uuid not null,
  action text not null,
  -- Copied from the link when the event happened. The same caps as `plan_links`.
  url text not null,
  kind text not null,
  title text,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint plan_link_events_action check (action in ('added', 'removed'))
);

comment on table public.plan_link_events is
  'Every link pinned to or removed from a /magic:plan session, with who did it and the '
  'link''s address, kind and title as they were. Written only by a trigger on plan_links; '
  'readable by whoever can read the session; the latest 500 per session are kept.';

create index if not exists idx_plan_link_events_session_created
  on public.plan_link_events (session_id, created_at desc);

alter table public.plan_link_events enable row level security;

revoke all on public.plan_link_events from authenticated, anon;
grant select on public.plan_link_events to authenticated;

-- The session's own visibility test, verbatim from `plan_links`.
create policy plan_link_events_select on public.plan_link_events
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

-- ---------------------------------------------------------------------------
-- The trigger: one event per link added or removed
-- ---------------------------------------------------------------------------
-- THE CASCADES ARE TOLD APART BY WHAT IS STILL THERE, not by `pg_trigger_depth()`: the
-- rows a referential action deletes fire this trigger at the same depth as a person's own
-- DELETE — measured, not assumed: supabase/tests/plan_links.test.sql #20 fails against a
-- depth test. What differs is that the parent row is already gone
-- by the time an AFTER trigger runs, and an event naming it would fail its foreign key and,
-- with it, the whole delete:
--
--   * the SESSION gone means the plan is being deleted. Nothing to record: the events go
--     with it anyway (`on delete cascade`).
--   * the ACTOR gone means their account is being deleted — `auth.uid()` is theirs inside
--     `delete_account()`, and so is the link's `author_id`. The plan survives, so the
--     removal is recorded, with a null actor: the link left, whoever pinned it left too.
create or replace function public.plan_links_log_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.plan_links;
  v_action text;
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    v_link := new;
    v_action := 'added';
  else
    v_link := old;
    v_action := 'removed';
  end if;

  -- The plan is being deleted. See above.
  if not exists (select 1 from public.plan_sessions s where s.id = v_link.session_id) then
    return null;
  end if;

  -- The actor's account is being deleted. See above.
  v_actor := coalesce(auth.uid(), v_link.author_id);
  if not exists (select 1 from auth.users u where u.id = v_actor) then
    v_actor := null;
  end if;

  insert into public.plan_link_events (session_id, link_id, action, url, kind, title, actor_id)
  values (v_link.session_id, v_link.id, v_action, v_link.url, v_link.kind, v_link.title, v_actor);

  -- Keep the latest 500 of this plan.
  delete from public.plan_link_events
   where session_id = v_link.session_id
     and id not in (
       select e.id from public.plan_link_events e
        where e.session_id = v_link.session_id
        order by e.created_at desc, e.id desc
        limit 500
     );

  return null;
end;
$$;

comment on function public.plan_links_log_event() is
  'Record a link added to or removed from a plan in plan_link_events. Records nothing '
  'when the plan itself is being deleted, and no actor when the actor''s account is. '
  'Trigger-only.';

revoke execute on function public.plan_links_log_event() from public;

drop trigger if exists log_event on public.plan_links;
create trigger log_event
  after insert or delete on public.plan_links
  for each row execute function public.plan_links_log_event();

-- The links already pinned, as the additions they were — so a plan's history does not start
-- with links that seem to have always been there.
insert into public.plan_link_events (session_id, link_id, action, url, kind, title, actor_id, created_at)
select l.session_id, l.id, 'added', l.url, l.kind, l.title, l.author_id, l.created_at
  from public.plan_links l
 where not exists (select 1 from public.plan_link_events e where e.link_id = l.id);

-- The backfill writes directly, so the trigger's cap never ran on it: apply the same bound
-- here, or a plan pinned with more than 500 links would stay over it until its next change.
delete from public.plan_link_events e
 using (
   select id, row_number() over (partition by session_id order by created_at desc, id desc) as rank
     from public.plan_link_events
 ) ranked
 where ranked.id = e.id
   and ranked.rank > 500;
