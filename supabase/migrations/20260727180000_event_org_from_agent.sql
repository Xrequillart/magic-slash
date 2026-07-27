-- Migration: an event's organization is DERIVED from its agent
--
-- THE BUG
-- -----------------------------------------------------------------------------
--   insert or update on table "activity_events" violates foreign key constraint
--   "activity_events_org_id_agent_id_fkey"
--
-- 20260727160000 made `agents.org_id` a DERIVED column: the organization of the
-- agent's first attached repository, and NULL when it works only on personal
-- repositories (or on none yet). What it did not change is the desktop app, which
-- still stamps every event row with whichever organization the user has ACTIVE —
-- the first of their memberships. The composite foreign key
--
--     (org_id, agent_id) -> agents (org_id, id)
--
-- exists precisely so an event can never reference an agent of another tenant, so
-- the moment those two values disagree the insert is rejected. They disagree in
-- the ordinary case, not an exotic one:
--
--   * an agent on a PERSONAL repo derives org_id NULL, while its owner is a member
--     of some organization → (activeOrg, agent) matches no row. This is most
--     users' default path: one personal repo, one team.
--   * an agent on org B's repo while org A is active → (A, agent) matches nothing.
--   * an agent with no repository attached yet → same as the first case.
--
-- THE FIX
-- -----------------------------------------------------------------------------
-- The active organization was never the right answer: it is a property of what the
-- USER is looking at, not of the WORK. An event belongs where its agent belongs.
-- So org_id follows the same rule one level down, and for the same reason
-- 20260727160000 gave for agents — it is a cache of a derivation, never an input:
--
--     event ──agent──▶ agent ──repositories──▶ organization
--
-- A BEFORE INSERT trigger stamps it from the referenced agent. Two consequences
-- worth having:
--
--   1. The constraint becomes unviolatable by construction. The value no longer
--      comes from a client that has to guess it, but from the very row the foreign
--      key checks against.
--   2. Every app version already in the field is fixed without updating. The
--      trigger OVERRIDES what the client sent rather than merely filling a NULL,
--      so 0.57.0 and earlier stop erroring as soon as this migration lands.
--
-- Two deliberate non-overrides:
--
--   * agent_id NULL — a skill run in a terminal the app did not spawn has no agent
--     to derive from. The client's organization is kept (it is the only attribution
--     available), and the composite FK is skipped anyway: it is MATCH SIMPLE, so a
--     NULL in any referencing column bypasses the check.
--   * an agent_id matching no row — org_id is left ALONE rather than nulled. Nulling
--     it would make MATCH SIMPLE skip the check and silently accept a dangling
--     reference; leaving it lets the foreign key reject the row, which is the
--     integrity guarantee we are here to preserve.
--
-- SECURITY DEFINER: the lookup must not depend on the caller's RLS view of
-- `agents`. In practice a user only writes events for their own agents, but a
-- policy-invisible row would otherwise read as "no such agent" and fall through to
-- the client's value — deciding data integrity by visibility. Reachable only as a
-- trigger (execute is revoked from public), and it reads one row by primary key
-- without ever returning it to the caller.

create or replace function public.stamp_event_org()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  derived uuid;
begin
  -- No agent: nothing to derive from, and the composite FK does not apply.
  if new.agent_id is null then
    return new;
  end if;

  select a.org_id into derived from public.agents a where a.id = new.agent_id;

  -- FOUND distinguishes "the agent has no organization" (derived IS NULL, which we
  -- must write) from "there is no such agent" (leave org_id, let the FK reject it).
  if found then
    new.org_id := derived;
  end if;

  return new;
end;
$$;

comment on function public.stamp_event_org() is
  'Stamp an event row''s org_id from its agent (agents.org_id is itself derived '
  'from the agent''s repositories). Trigger-only.';

revoke execute on function public.stamp_event_org() from public;

-- BEFORE INSERT only: the three tables are append-only (no update, no delete is
-- granted), and an agent whose org is RE-derived later carries its events along
-- through the FK's ON UPDATE CASCADE, added by 20260727160000.
do $$
declare
  t text;
begin
  foreach t in array array['activity_events', 'usage_events', 'skill_invocations'] loop
    execute format('drop trigger if exists stamp_org on public.%I', t);
    execute format(
      'create trigger stamp_org before insert on public.%I '
      'for each row execute function public.stamp_event_org()', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Events must follow their agent when its derivation CHANGES, too
-- ---------------------------------------------------------------------------
-- 20260727160000 gave the composite FK ON UPDATE CASCADE for exactly this, and it
-- works for every event that already carries an organization. It cannot work for
-- one whose org_id is NULL: the FK is MATCH SIMPLE, so a NULL in a referencing
-- column means the row references nothing at all, and a cascade has nothing to
-- carry it by.
--
-- That is not a corner case, it is the common one. An agent records `agent_created`
-- the instant it is created, while its repositories are still being attached — the
-- desktop writes both fire-and-forget, in that order. So a team agent's FIRST
-- events are routinely written before there is any org to derive, and left to the
-- cascade they would stay NULL forever: permanently invisible to the team that owns
-- the work, with no way to tell from the data that anything was lost.
--
-- An AFTER UPDATE trigger on `agents` closes the gap, and closes it wherever org_id
-- comes from rather than only inside derive_agent_org(). "An event belongs where its
-- agent belongs" becomes an invariant of the agents table itself.
--
-- SECURITY DEFINER is required, not merely tidy: the event tables grant only SELECT
-- and INSERT to `authenticated`, so this write is one no caller is allowed to make
-- directly. Which is the point — reattributing an append-only row is a system
-- reconciliation, never a user action.
create or replace function public.sync_event_orgs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.activity_events   set org_id = new.org_id
   where agent_id = new.id and org_id is distinct from new.org_id;
  update public.usage_events      set org_id = new.org_id
   where agent_id = new.id and org_id is distinct from new.org_id;
  update public.skill_invocations set org_id = new.org_id
   where agent_id = new.id and org_id is distinct from new.org_id;
  return null;
end;
$$;

comment on function public.sync_event_orgs() is
  'Carry an agent''s events to its new organization, including the NULL-org rows '
  'the composite FK''s ON UPDATE CASCADE cannot reach. Trigger-only.';

revoke execute on function public.sync_event_orgs() from public;

drop trigger if exists sync_event_orgs on public.agents;
create trigger sync_event_orgs
  after update of org_id on public.agents
  for each row when (old.org_id is distinct from new.org_id)
  execute function public.sync_event_orgs();

-- ---------------------------------------------------------------------------
-- Reconcile any row that disagrees with its agent
-- ---------------------------------------------------------------------------
-- Expected to touch ZERO rows today, and kept as a guard. The composite FK has
-- existed since the initial schema, so no disagreeing row could ever have been
-- inserted; and where 20260727160000 re-derived an agent, the cascade moved its
-- events with it — including down to NULL, which is the one direction MATCH SIMPLE
-- can carry (the rows still referenced a real key at the time it fired).
--
-- Do not read that as "the cascade is sufficient": it is precisely blind to rows
-- that are ALREADY NULL, which is why sync_event_orgs() above exists. The statements
-- here make the invariant that trigger maintains true of the whole table rather than
-- only of rows written or moved from now on — cheap insurance against any path
-- neither of us has modelled.
--
-- Agent-less rows are left alone: they have no agent to disagree with, and the org
-- they were written with is the only attribution they will ever have.
update public.activity_events e
   set org_id = a.org_id
  from public.agents a
 where a.id = e.agent_id
   and e.org_id is distinct from a.org_id;

update public.usage_events e
   set org_id = a.org_id
  from public.agents a
 where a.id = e.agent_id
   and e.org_id is distinct from a.org_id;

update public.skill_invocations e
   set org_id = a.org_id
  from public.agents a
 where a.id = e.agent_id
   and e.org_id is distinct from a.org_id;
