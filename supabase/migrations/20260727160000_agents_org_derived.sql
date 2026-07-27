-- Migration: an agent's organization is DERIVED from its repositories
--
-- Model change. Until now `agents.org_id` was an input: the desktop app stamped
-- every agent with whichever organization the user had made "active", and that
-- single choice also decided which repositories were visible, which agents the
-- team page showed, and which shared config applied.
--
-- An agent has no organization of its own. It belongs to its OWNER, it works on
-- REPOSITORIES, and repositories belong to organizations:
--
--     agent ──owner──▶ user
--     agent ──*:*──▶ repository ──▶ organization   (org_id null = personal)
--
-- So `org_id` stops being written by the client and becomes a derived column,
-- maintained by trigger from agent_repositories (previous migration).
--
-- Why keep the column at all instead of joining in RLS: the policy stays
-- indexable (`owner_id = auth.uid() or is_org_member(org_id)`) rather than an
-- EXISTS over three tables evaluated per row, and the composite foreign keys of
-- the event tables keep working. The column is a cache of the derivation, never
-- an input.

-- ---------------------------------------------------------------------------
-- Nullable: an agent on personal repos only — or on none yet — has no org
-- ---------------------------------------------------------------------------
alter table public.agents            alter column org_id drop not null;
alter table public.activity_events   alter column org_id drop not null;
alter table public.usage_events      alter column org_id drop not null;
alter table public.skill_invocations alter column org_id drop not null;

comment on column public.agents.org_id is
  'DERIVED from agent_repositories — never set by the client. Null when the '
  'agent works only on personal repositories, or on none.';

-- ---------------------------------------------------------------------------
-- The event tables must follow the agent when its derivation changes
-- ---------------------------------------------------------------------------
-- Their FK is composite — (org_id, agent_id) → agents (org_id, id) — so that an
-- event can never reference an agent of another tenant. It was created with the
-- default ON UPDATE NO ACTION, which would make re-deriving the org of an agent
-- that already has history fail outright. ON UPDATE CASCADE instead carries the
-- new org down to its events, which is what "this work now belongs to that org"
-- means. ON DELETE SET NULL (agent_id) is preserved from the original schema.
do $$
declare
  t text;
  c text;
begin
  foreach t in array array['activity_events', 'usage_events', 'skill_invocations'] loop
    select conname into c
      from pg_constraint
     where conrelid = ('public.' || t)::regclass
       and contype = 'f'
       and confrelid = 'public.agents'::regclass;

    if c is not null then
      execute format('alter table public.%I drop constraint %I', t, c);
    end if;

    execute format(
      'alter table public.%I add constraint %I foreign key (org_id, agent_id) '
      'references public.agents (org_id, id) on delete set null (agent_id) on update cascade',
      t, t || '_org_id_agent_id_fkey'
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The derivation
-- ---------------------------------------------------------------------------
-- The organization of the FIRST attached repository that has one. An agent
-- commonly spans a personal repo and a team repo; once every org's repos are
-- attachable it may even span two orgs. Attachment order makes the outcome
-- deterministic, and a team repo makes the work visible to that team — which is
-- the point of attaching it.
--
-- SECURITY DEFINER: moving a shared repository between orgs re-derives the org
-- of every agent working on it, including teammates' agents, which the caller
-- has no RLS write access to. The function is reachable only as a trigger.
create or replace function public.derive_agent_org(p_agent_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.agents a
     set org_id = (
       select r.org_id
         from public.agent_repositories ar
         join public.repositories r on r.id = ar.repo_id
        where ar.agent_id = p_agent_id
          and r.org_id is not null
        order by ar.created_at, ar.repo_id
        limit 1
     )
   where a.id = p_agent_id
     -- No-op write guard: this fires on every attach/detach, and each real
     -- update cascades into the three event tables.
     and a.org_id is distinct from (
       select r.org_id
         from public.agent_repositories ar
         join public.repositories r on r.id = ar.repo_id
        where ar.agent_id = p_agent_id
          and r.org_id is not null
        order by ar.created_at, ar.repo_id
        limit 1
     );
$$;

comment on function public.derive_agent_org(uuid) is
  'Recompute agents.org_id from the agent''s repositories. Trigger-only.';

revoke execute on function public.derive_agent_org(uuid) from public;

-- Attaching or detaching a repository
create or replace function public.agent_repositories_derive_org()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.derive_agent_org(coalesce(new.agent_id, old.agent_id));
  return null;
end;
$$;

drop trigger if exists derive_org on public.agent_repositories;
create trigger derive_org
  after insert or delete on public.agent_repositories
  for each row execute function public.agent_repositories_derive_org();

-- Sharing a repository with an org (or moving it between orgs) re-derives every
-- agent working on it.
create or replace function public.repositories_derive_agent_orgs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid;
begin
  for target in select agent_id from public.agent_repositories where repo_id = new.id loop
    perform public.derive_agent_org(target);
  end loop;
  return null;
end;
$$;

drop trigger if exists derive_agent_orgs on public.repositories;
create trigger derive_agent_orgs
  after update of org_id on public.repositories
  for each row when (old.org_id is distinct from new.org_id)
  execute function public.repositories_derive_agent_orgs();

-- ---------------------------------------------------------------------------
-- Re-derive everything the backfill just linked
-- ---------------------------------------------------------------------------
-- Agents whose paths matched nothing keep the org they were stamped with: their
-- history stays readable by their team. New attachments will correct them.
do $$
declare
  target uuid;
begin
  for target in select distinct agent_id from public.agent_repositories loop
    perform public.derive_agent_org(target);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: an agent without an org belongs to its owner alone
-- ---------------------------------------------------------------------------
-- SELECT was `is_org_member(org_id)`, which returns false for a null org and
-- would hide a personal agent from the person who created it.
drop policy if exists agents_select on public.agents;
create policy agents_select on public.agents
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_member(org_id))
  );

-- INSERT no longer requires an organization: the client does not know one, and
-- the trigger has not run yet (there is no repository attached at insert time).
-- What still holds: you may only create agents owned by yourself.
drop policy if exists agents_insert on public.agents;
create policy agents_insert on public.agents
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (org_id is null or public.is_org_member(org_id))
  );

-- UPDATE: the owner, or an org admin fixing an owner-less row (a membership was
-- removed). The WITH CHECK still forbids handing an agent to someone else.
drop policy if exists agents_update on public.agents;
create policy agents_update on public.agents
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (owner_id is null and org_id is not null and public.is_org_admin(org_id))
  )
  with check (owner_id = auth.uid());

-- DELETE: unchanged in intent — the owner, or an admin cleaning up an orphan.
drop policy if exists agents_delete on public.agents;
create policy agents_delete on public.agents
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (owner_id is null and org_id is not null and public.is_org_admin(org_id))
  );

-- Event tables: same reasoning. Their org is the agent's org, so it can be null,
-- and the actor must still be able to read back what they wrote.
drop policy if exists activity_events_select on public.activity_events;
create policy activity_events_select on public.activity_events
  for select to authenticated
  using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)));

drop policy if exists activity_events_insert on public.activity_events;
create policy activity_events_insert on public.activity_events
  for insert to authenticated
  with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id)));

drop policy if exists usage_events_select on public.usage_events;
create policy usage_events_select on public.usage_events
  for select to authenticated
  using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)));

drop policy if exists usage_events_insert on public.usage_events;
create policy usage_events_insert on public.usage_events
  for insert to authenticated
  with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id)));

drop policy if exists skill_invocations_select on public.skill_invocations;
create policy skill_invocations_select on public.skill_invocations
  for select to authenticated
  using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)));

drop policy if exists skill_invocations_insert on public.skill_invocations;
create policy skill_invocations_insert on public.skill_invocations
  for insert to authenticated
  with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id)));
