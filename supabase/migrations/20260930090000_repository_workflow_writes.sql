-- Migration: a repository's workflow is editable by its owner or an org admin (#330)
--
-- REVERSES "READ-ONLY FOR CLIENTS IN V1", on purpose and in the open.
-- `20260929120000_repository_workflows.sql` created the table with SELECT only and no write
-- policy, "until editing lands with its own migration and its own write policies". This is
-- that migration: the desktop now edits a repository's flow, and saves it here.
--
-- WHAT A ROW HOLDS CHANGED: AN OVERLAY, NOT A WORKFLOW. The previous header describes the
-- definition as a full `{ id, entry, nodes, links }` workflow. What the app stores now is
-- only what an admin ADDED to the default line (desktop/src/workflow/overlay.ts):
--
--   { "version": 1,
--     "steps": [{ "skill", "mode": "blocking"|"advisory", "before": <built-in node id>|null }],
--     "kinds": { "<from>><to>": "auto"|"suggest" } }
--
-- The built-in steps are never stored, so no write, from the UI or straight through this
-- API, can remove, replace or move one: they come from the app's shipped default, and the
-- overlay is composed onto them. A row that is not an overlay the app understands — a
-- full Workflow written by hand under v1, say — is ignored with a warning and the default
-- flow is served, exactly as the previous header promised for any bad row. Deleting the row
-- is how a repository goes back to the default flow.
--
-- WHO MAY WRITE: THE REPOSITORY'S OWNER, OR AN ADMIN OF THE ORG IT IS SHARED TO. The same
-- "members read, owner or admin write" line `repositories` itself draws
-- (20260724110000 for delete, 20260726090000 for update): a flow steers what every
-- member's agents do next, so a plain member changing it changes how the whole team works.
-- A plain member keeps reading the team's flow (the select policy is untouched) and cannot
-- write it. As with the select policy, the test is repeated inside an EXISTS on
-- `repositories` rather than leaning on that table's RLS: a policy that reads correctly on
-- its own survives a later change to the other table's policies.
--
-- A SHAPE CHECK, AND ONLY A SHAPE CHECK. The previous header refused to duplicate the app's
-- validation in SQL — two validators drift, and the one that matters is the one the skills
-- are served through. That still holds: nothing below knows what a skill, a mode or a
-- built-in node id is. What the CHECK guarantees is the envelope — an object, version 1, a
-- `steps` array, a `kinds` object — so that a client which can now write cannot store
-- something that is not even trying to be an overlay. Everything inside the envelope stays
-- the app's to judge.
--
-- `NOT VALID`, deliberately. No client could ever write a row (v1 had no grant), but v1's
-- header invited rows "written by hand, as the table owner", and those would be full
-- Workflows that fail this check — a validated constraint would then fail the migration on
-- whichever project holds one. NOT VALID checks every insert and update from now on and
-- leaves such a row in place, where it is harmless: the app ignores it and serves the
-- default, and the first save from the editor replaces it with an overlay. Deleting those
-- rows here instead would destroy hand-written data to satisfy a constraint that protects
-- nothing the app does not already protect.
--
-- AUDITED, like the repository settings it sits next to: `log_settings_change` gains a
-- `repository_workflows` branch, and the trigger is attached below. The event carries the
-- repository's org (so a team flow's history is the team's, and a personal flow's is its
-- author's alone) and the repository as its target.
--
-- Realtime: NOW PUBLISHED, reversing the previous header's "deliberately NOT published" for
-- the reason it gave: "a flow nobody can edit from a client does not need a live stream".
-- One can be edited now, and a colleague's app must follow an admin's change without a
-- reload. `replica identity full`, like `repositories` and `repository_paths`, whose events
-- the config hydration already follows the same way. Realtime applies this table's select
-- policy to inserts and updates. It runs no RLS on a DELETE (see 20260929110000), and with
-- RLS on it trims the old image to the primary key. Here that key is `repo_id`: a delete,
-- which is how a repository returns to the default flow, tells a subscriber WHICH repository
-- went back, and never carries a definition.

-- ---------------------------------------------------------------------------
-- Grants and policies
-- ---------------------------------------------------------------------------
-- SELECT stays as it was; the three write verbs join it. RLS decides which rows.
grant insert, update, delete on public.repository_workflows to authenticated;

drop policy if exists repository_workflows_insert on public.repository_workflows;
create policy repository_workflows_insert on public.repository_workflows
  for insert to authenticated
  with check (
    exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_admin(r.org_id)))
    )
  );

-- USING picks the rows you may change, WITH CHECK the row you leave behind: moving a flow
-- onto a repository you do not administer is refused like inserting one there.
drop policy if exists repository_workflows_update on public.repository_workflows;
create policy repository_workflows_update on public.repository_workflows
  for update to authenticated
  using (
    exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_admin(r.org_id)))
    )
  )
  with check (
    exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_admin(r.org_id)))
    )
  );

drop policy if exists repository_workflows_delete on public.repository_workflows;
create policy repository_workflows_delete on public.repository_workflows
  for delete to authenticated
  using (
    exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_admin(r.org_id)))
    )
  );

-- ---------------------------------------------------------------------------
-- Shape check
-- ---------------------------------------------------------------------------
-- The envelope only; see the header for why nothing deeper, and why NOT VALID.
-- `definition->'version' = '1'` compares jsonb to jsonb: the number 1, not the string "1".
--
-- WRAPPED IN coalesce(…, false), and that is not decoration. A CHECK passes when its
-- expression is NULL, and a missing key makes every term below NULL (`->` yields NULL,
-- `jsonb_typeof(NULL)` too): without the coalesce, a v1 `{ id, entry, nodes, links }`
-- Workflow — no `version` at all — would sail through the one check meant to stop it.
alter table public.repository_workflows
  drop constraint if exists repository_workflows_definition_overlay;
alter table public.repository_workflows
  add constraint repository_workflows_definition_overlay check (
    coalesce(
      jsonb_typeof(definition) = 'object'
      and definition->'version' = '1'::jsonb
      and jsonb_typeof(definition->'steps') = 'array'
      and jsonb_typeof(definition->'kinds') = 'object',
      false
    )
  ) not valid;

comment on table public.repository_workflows is
  'The workflow overlay of a repository: the custom steps and link kinds its owner or an '
  'org admin added to the default flow the magic skills follow. Built-in steps are never '
  'stored. No row = the default flow. Readable by whoever can see the repository; writable '
  'by its owner or an admin of its org.';

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.repository_workflows;
alter table public.repository_workflows replica identity full;

-- ---------------------------------------------------------------------------
-- log_settings_change: a `repository_workflows` branch
-- ---------------------------------------------------------------------------
-- Copied from its latest definition (20260801110000_settings_events.sql), with one branch
-- added. The table has no org_id of its own, so the org is the repository's, looked up
-- through repo_id (the new row's repository first, then the old one's). SECURITY DEFINER
-- already, so the lookup sees the repository whatever the writer's RLS.
--
-- A DELETE CASCADING FROM ITS REPOSITORY IS NOT LOGGED. When the repository is gone, the
-- flow's delete is the cascade of the repository's own delete, which `repositories`'
-- trigger has already recorded, with the whole row. A second event would add nothing —
-- and with no repository left to read its org from, it could only be attributed to nobody,
-- which the settings_events policy would show to the actor alone.

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
  elsif TG_TABLE_NAME = 'repository_workflows' then
    -- A flow is the repository's, shared or personal as the repository is: its org is
    -- the repository's org. `found` rather than a null test, because a personal
    -- repository exists with a null org_id.
    v_target := (v_row->>'repo_id')::uuid;
    select r.org_id into v_org from public.repositories r where r.id = (v_new->>'repo_id')::uuid;
    if not found then
      select r.org_id into v_org from public.repositories r where r.id = (v_old->>'repo_id')::uuid;
      if not found then
        -- The repository is gone: this is the cascade of its delete, already logged.
        return null;
      end if;
    end if;
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

comment on table public.settings_events is
  'Append-only audit of settings changes, written by the log_settings_change trigger '
  'on user_settings, repositories, repository_paths and repository_workflows. One row per '
  'column actually changed, which is what makes an all-columns upsert legible. Nothing but '
  'the trigger writes here: authenticated holds SELECT only.';

drop trigger if exists log_settings on public.repository_workflows;
create trigger log_settings
  after insert or update or delete on public.repository_workflows
  for each row execute function public.log_settings_change();
