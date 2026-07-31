-- An audit trail for settings changes.
--
-- WHY
-- ---------------------------------------------------------------------------
-- `user_settings`, `repositories` and `repository_paths` were updated in place with no
-- history whatsoever (supabase/README.md: "no audit log"). The previous value was
-- unrecoverable, and there was no record of who changed what or when — so "the commit
-- format changed and nobody knows why" had no answer, and neither did "when did this
-- repo become shared with us".
--
-- WHY A TRIGGER AND NOT THE DESKTOP APP
-- ---------------------------------------------------------------------------
-- Two reasons, both decisive.
--
-- First, there are two clients. The web app writes `user_settings` directly
-- (webapp/lib/settings.ts), so anything hooked into the Electron main process would
-- have recorded half the changes and quietly reported the other half as never having
-- happened. A trigger sees every writer, including whichever one is built next.
--
-- Second, the desktop saves settings by upserting ALL of user_settings' columns on
-- every change, so the WRITE does not know which setting the user touched — only the
-- database can tell, by comparing the row it has against the row arriving. The diff
-- below is therefore not an optimisation; it is the only place the answer exists.
--
-- WHAT IT DOES NOT SEE, and deliberately so — recorded here rather than left to be
-- discovered as a gap:
--   * the window zoom and the sidebar toggle, which are machine-local by design and
--     never reach the database;
--   * ~/.claude/settings.json and a repository's PR template, which are files the app
--     writes outside its own schema;
--   * profiles, org membership, and the skills library, which are separate surfaces
--     with their own semantics rather than settings.

create table if not exists public.settings_events (
  id          uuid primary key default gen_random_uuid(),
  -- The actor. Null when the change did not come from an end user — a service-role
  -- script or a manual SQL edit — which is the correct answer, not a missing one.
  user_id     uuid references auth.users (id) on delete set null,
  -- Null means personal: nobody but the author may read it. See the policy below.
  org_id      uuid references public.organizations (id) on delete cascade,
  scope       text not null,
  -- The repository the change is about; null for account-wide settings.
  target_id   uuid,
  action      text not null check (action in ('created', 'updated', 'deleted')),
  -- The column that changed. Null on created/deleted, which describe a whole row.
  setting     text,
  old_value   jsonb,
  new_value   jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_settings_events_org_id on public.settings_events (org_id);
create index if not exists idx_settings_events_user_id on public.settings_events (user_id);
create index if not exists idx_settings_events_occurred_at on public.settings_events (occurred_at desc);

comment on table public.settings_events is
  'Append-only audit of settings changes, written by the log_settings_change trigger '
  'on user_settings, repositories and repository_paths. One row per column actually '
  'changed, which is what makes an all-columns upsert legible. Nothing but the trigger '
  'writes here: authenticated holds SELECT only.';

alter table public.settings_events enable row level security;

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------
-- A team repository's settings are SHARED config: a member changing the org's commit
-- format changes it for everyone, so it is the org's event and the org can read it.
--
-- Personal preferences are not. `user_settings` and `repository_paths` carry a null
-- org and are readable by their author alone — a colleague's theme, notification
-- choices and local directory layout are none of the team's business, and an audit
-- log is exactly the kind of feature that turns into surveillance if that line is not
-- drawn at the start.
drop policy if exists settings_events_select on public.settings_events;
create policy settings_events_select on public.settings_events
  for select
  using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)));

revoke all on public.settings_events from authenticated, anon;
grant select on public.settings_events to authenticated;

-- ---------------------------------------------------------------------------
-- log_settings_change
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because `authenticated` deliberately has no INSERT here: the log
-- must not be forgeable by the clients it audits.
--
-- Generic over the three tables rather than three hand-written triggers, so a column
-- added to any of them is audited from the moment it exists instead of the day
-- somebody remembers to extend a list.

create or replace function public.log_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new    jsonb;
  v_old    jsonb;
  v_row    jsonb;
  v_org    uuid;
  v_target uuid;
begin
  if TG_OP <> 'DELETE' then v_new := to_jsonb(NEW); end if;
  if TG_OP <> 'INSERT' then v_old := to_jsonb(OLD); end if;
  v_row := coalesce(v_new, v_old);

  if TG_TABLE_NAME = 'repositories' then
    -- coalesce(new, old): when a repo LEAVES an org its new org_id is null, and
    -- attributing that to nobody would hide the departure from the very people it
    -- affects. The old org is the one that needs to see it.
    v_org := coalesce((v_new->>'org_id')::uuid, (v_old->>'org_id')::uuid);
    v_target := (v_row->>'id')::uuid;
  elsif TG_TABLE_NAME = 'repository_paths' then
    -- A local filesystem path is personal, even for a shared repository.
    v_target := (v_row->>'repo_id')::uuid;
  end if;

  if TG_OP = 'UPDATE' then
    -- ONE ROW PER COLUMN THAT ACTUALLY CHANGED. The desktop upserts all of
    -- user_settings on every toggle, so without this diff every theme change would
    -- read as seventeen simultaneous edits and the log would be unusable.
    --
    -- `is distinct from` rather than `<>`, so a change to or from NULL counts —
    -- clearing a setting is a change.
    insert into public.settings_events (user_id, org_id, scope, target_id, action, setting, old_value, new_value)
    select auth.uid(), v_org, TG_TABLE_NAME, v_target, 'updated', n.key, o.value, n.value
    from jsonb_each(v_new) n
    left join jsonb_each(v_old) o using (key)
    where n.value is distinct from o.value
      and n.key not in ('id', 'created_at', 'updated_at');
  else
    -- A create or a delete describes the whole row, so it is ONE event. Emitting a
    -- row per column would turn adding a repository into a dozen entries that say
    -- nothing the first one did not.
    insert into public.settings_events (user_id, org_id, scope, target_id, action, setting, old_value, new_value)
    values (
      auth.uid(),
      v_org,
      TG_TABLE_NAME,
      v_target,
      case TG_OP when 'INSERT' then 'created' else 'deleted' end,
      null,
      v_old,
      v_new
    );
  end if;

  return null; -- AFTER trigger: the return value is ignored
end;
$$;

comment on function public.log_settings_change() is
  'AFTER trigger that records settings changes in settings_events: one row per column '
  'on an update, one row for a create or a delete. SECURITY DEFINER because clients '
  'have no INSERT on the audit table — the log must not be forgeable by what it audits.';

drop trigger if exists log_settings on public.user_settings;
create trigger log_settings
  after insert or update or delete on public.user_settings
  for each row execute function public.log_settings_change();

drop trigger if exists log_settings on public.repositories;
create trigger log_settings
  after insert or update or delete on public.repositories
  for each row execute function public.log_settings_change();

drop trigger if exists log_settings on public.repository_paths;
create trigger log_settings
  after insert or update or delete on public.repository_paths
  for each row execute function public.log_settings_change();
