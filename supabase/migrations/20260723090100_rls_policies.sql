-- Migration: RLS policies
-- Enables Row Level Security on all 8 tables and enforces strict per-org
-- isolation keyed on org_id, with an admin role gate for privileged writes.
--
-- Design notes:
--  * Membership checks run through SECURITY DEFINER helper functions with a
--    locked search_path. This is required: if the memberships policies queried
--    memberships directly, RLS would recurse infinitely. The definer functions
--    read the table with the owner's privileges (bypassing RLS) instead.
--  * Every INSERT/UPDATE policy uses WITH CHECK so a user can never write a row
--    tagged with another org's id.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------

-- True if the current user has any membership in target_org.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org
      and m.user_id = auth.uid()
  );
$$;

-- True if the current user is an admin of target_org.
create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

-- True if the given user (not necessarily the caller) has a membership in
-- target_org. Used by WITH CHECK policies to reject cross-tenant references
-- (e.g. an agent owner_id pointing at a user from another org). SECURITY
-- DEFINER so the check is independent of the caller's RLS visibility.
create or replace function public.is_org_member_of(target_user uuid, target_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org
      and m.user_id = target_user
  );
$$;

-- Postgres grants EXECUTE to PUBLIC by default; revoke it so these definer
-- functions are callable only by authenticated sessions (not anon).
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.is_org_admin(uuid) from public;
revoke execute on function public.is_org_member_of(uuid, uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_member_of(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_organization: the ONLY way to create an organization
-- ---------------------------------------------------------------------------
-- There is deliberately no INSERT policy on organizations. Bootstrapping an org
-- (org row + the creator's admin membership) must be atomic, and the creator
-- must become an admin without any pre-existing membership to satisfy a policy.
-- This SECURITY DEFINER function performs both inserts as the table owner.
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_org_id uuid;
  current_uid uuid := auth.uid();
begin
  if current_uid is null then
    raise exception 'create_organization requires an authenticated user';
  end if;

  insert into public.organizations (name, created_by)
  values (org_name, current_uid)
  returning id into new_org_id;

  insert into public.memberships (org_id, user_id, role)
  values (new_org_id, current_uid, 'admin');

  return new_org_id;
end;
$$;

revoke execute on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.agents enable row level security;
alter table public.skills enable row level security;
alter table public.configs enable row level security;
alter table public.usage_events enable row level security;
alter table public.activity_events enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges for the authenticated role
-- ---------------------------------------------------------------------------
-- RLS and GRANTs are two independent layers: RLS decides WHICH ROWS a role may
-- touch, GRANTs decide whether the role may touch the TABLE at all. Both are
-- required. We grant privileges explicitly (rather than relying on Supabase's
-- default-privilege setup) so the schema is self-contained and portable. anon
-- is intentionally granted nothing. Grants mirror each table's policy surface:
--   organizations: no INSERT (creation flows only through create_organization()).
--   usage_events / activity_events: append-only (select + insert only).
grant select, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update, delete on public.skills to authenticated;
grant select, insert, update, delete on public.configs to authenticated;
grant select, insert on public.usage_events to authenticated;
grant select, insert on public.activity_events to authenticated;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
-- NOTE: there is intentionally no INSERT policy. New organizations are created
-- exclusively through public.create_organization(), which also provisions the
-- creator's admin membership atomically.
create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (public.is_org_admin(id));

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_org_member(org_id));

create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy memberships_update on public.memberships
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- invitations (admin-only, full CRUD)
-- ---------------------------------------------------------------------------
create policy invitations_select on public.invitations
  for select to authenticated
  using (public.is_org_admin(org_id));

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy invitations_update on public.invitations
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- agents (any org member, full CRUD within the org)
-- ---------------------------------------------------------------------------
create policy agents_select on public.agents
  for select to authenticated
  using (public.is_org_member(org_id));

create policy agents_insert on public.agents
  for insert to authenticated
  with check (
    public.is_org_member(org_id)
    -- owner_id, when set, must belong to this org (no cross-tenant ownership).
    and (owner_id is null or public.is_org_member_of(owner_id, org_id))
  );

create policy agents_update on public.agents
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (
    public.is_org_member(org_id)
    and (owner_id is null or public.is_org_member_of(owner_id, org_id))
  );

create policy agents_delete on public.agents
  for delete to authenticated
  using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- skills (members read, admins write)
-- ---------------------------------------------------------------------------
create policy skills_select on public.skills
  for select to authenticated
  using (public.is_org_member(org_id));

create policy skills_insert on public.skills
  for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy skills_update on public.skills
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy skills_delete on public.skills
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- configs (per-user, within the user's own org)
-- ---------------------------------------------------------------------------
create policy configs_select on public.configs
  for select to authenticated
  using (public.is_org_member(org_id) and user_id = auth.uid());

create policy configs_insert on public.configs
  for insert to authenticated
  with check (public.is_org_member(org_id) and user_id = auth.uid());

create policy configs_update on public.configs
  for update to authenticated
  using (user_id = auth.uid())
  with check (public.is_org_member(org_id) and user_id = auth.uid());

create policy configs_delete on public.configs
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- usage_events (append-only: select + insert only)
-- ---------------------------------------------------------------------------
create policy usage_events_select on public.usage_events
  for select to authenticated
  using (public.is_org_member(org_id));

create policy usage_events_insert on public.usage_events
  for insert to authenticated
  -- Actor must be the caller: prevents forging another user's usage/billing.
  with check (public.is_org_member(org_id) and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- activity_events (append-only: select + insert only)
-- ---------------------------------------------------------------------------
create policy activity_events_select on public.activity_events
  for select to authenticated
  using (public.is_org_member(org_id));

create policy activity_events_insert on public.activity_events
  for insert to authenticated
  -- Actor must be the caller: prevents forging the audit-log actor.
  with check (public.is_org_member(org_id) and user_id = auth.uid());
