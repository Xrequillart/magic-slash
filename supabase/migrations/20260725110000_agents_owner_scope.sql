-- Migration: scope agent writes to their owner
--
-- Agents are org-VISIBLE but user-OWNED. The initial policies granted full CRUD
-- to any member of the org, which made a teammate's agent writable (and
-- deletable) by everyone else — the app's saveAgents() reconciliation could reach
-- another member's row. SELECT stays org-wide on purpose: the team dashboard
-- ("who is working on what", loadOrgAgents) and the Realtime subscription both
-- depend on it. Only INSERT/UPDATE/DELETE are narrowed to the owner.
--
-- owner_id is nullable and is nulled by the (org_id, owner_id) → memberships FK
-- when a membership is removed, so an ex-member's agents end up owner-less and
-- would otherwise be frozen forever. Org admins keep write access to exactly
-- those orphan rows so they remain cleanable.

-- True when the caller may write this agent row: it is theirs, or it is an
-- orphan (owner cleared with the membership) and they administer the org.
create or replace function public.can_write_agent(target_org uuid, target_owner uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select target_owner = auth.uid()
      or (target_owner is null and public.is_org_admin(target_org));
$$;

comment on function public.can_write_agent(uuid, uuid) is
  'Agent write gate: the owner, or an org admin for owner-less (orphaned) rows.';

-- Postgres grants EXECUTE to PUBLIC by default; revoke it so this definer
-- function is callable only by authenticated sessions (not anon) — same
-- treatment as the is_org_member/is_org_admin helpers.
revoke execute on function public.can_write_agent(uuid, uuid) from public;
grant execute on function public.can_write_agent(uuid, uuid) to authenticated;

-- INSERT: a member may only create agents owned by themselves. This replaces the
-- previous `owner_id is null or is_org_member_of(owner_id, org_id)` check — that
-- allowed both an owner-less agent and one attributed to another member.
drop policy if exists agents_insert on public.agents;
create policy agents_insert on public.agents
  for insert to authenticated
  with check (
    public.is_org_member(org_id)
    and owner_id = auth.uid()
  );

-- UPDATE: the owner (or an admin fixing an orphan). The WITH CHECK clause also
-- forbids handing an agent to someone else: the row must still be owned by the
-- caller afterwards, which is what lets an admin adopt an orphan.
drop policy if exists agents_update on public.agents;
create policy agents_update on public.agents
  for update to authenticated
  using (
    public.is_org_member(org_id)
    and public.can_write_agent(org_id, owner_id)
  )
  with check (
    public.is_org_member(org_id)
    and owner_id = auth.uid()
  );

-- DELETE: same gate as UPDATE's USING clause.
drop policy if exists agents_delete on public.agents;
create policy agents_delete on public.agents
  for delete to authenticated
  using (
    public.is_org_member(org_id)
    and public.can_write_agent(org_id, owner_id)
  );
