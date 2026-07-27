-- Migration: agents.archived_at — closing an agent archives it, never deletes it
--
-- Until now, closing an agent in the desktop app hard-deleted its `agents` row
-- (CloudStore.saveAgents reconciled by absence). Every event table points at an
-- agent through a composite FK with `on delete set null (agent_id)` — see
-- 20260723090000_initial_schema.sql for activity_events / usage_events and
-- 20260725120000_skill_invocations.sql — so the deletion silently severed the
-- link: the rows survived but became unattributable, and the History page
-- rendered an empty agent name for every closed agent.
--
-- Soft-delete instead, mirroring organizations.archived_at
-- (20260723120000_org_member_management.sql). One difference, deliberate: the
-- filtering is done by the CLIENT queries, not by RLS. Archived agents must stay
-- SELECTable so that
--   * the History page can still resolve agent_id → name, and
--   * an org admin can still hard-delete orphaned rows (agents_delete policy).
-- The app adds `.is('archived_at', null)` to every read path that lists agents
-- (CloudStore.loadAgents, CloudStore.loadOrgAgents, webapp/lib/stats.ts).
--
-- No new policy or grant: agents_update (20260725110000_agents_owner_scope.sql)
-- already lets an owner update their own row, and its WITH CHECK
-- (owner_id = auth.uid()) is satisfied because archiving never touches owner_id.
-- No RPC either — unlike archive_organization, this needs no admin gate and no
-- privilege the caller lacks. There is deliberately no unarchive path in scope.

alter table public.agents add column if not exists archived_at timestamptz;

comment on column public.agents.archived_at is
  'Soft-delete: set when the user closes the agent. Archived agents are filtered '
  'out of every app read path, but the row is kept so its activity_events, '
  'usage_events and skill_invocations keep pointing at it. Never unset.';

-- Serves both filtered reads: loadAgents (org + owner + active) and
-- loadOrgAgents (org + active, on the leading column). Partial, because the
-- archived rows are only ever fetched by id for name resolution.
create index if not exists idx_agents_active
  on public.agents (org_id, owner_id)
  where archived_at is null;
