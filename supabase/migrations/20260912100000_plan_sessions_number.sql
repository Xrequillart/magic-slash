-- Migration: plan_sessions.number — a plan's short, human id
--
-- A plan has had three identities and no name: a uuid nobody reads, a `spec_key` that is
-- a sha256, and a `slug` that is the spec file's basename. The slug is the only readable
-- one and it is explicitly NOT an identity (see its comment in 20260821090000): two
-- repositories can hold the same one, and it changes if the file is renamed. So the app
-- has been printing a filename where every other object it lists — a Jira issue, a
-- GitHub issue — wears a short number a person can say out loud.
--
-- This is that number. GitHub's model: small, sequential, permanent, and scoped to the
-- thing the reader shares with the people they are talking to.
--
-- ── THE SCOPE IS THE ORGANIZATION, FALLING BACK TO THE OWNER ─────────────────────────
--
-- `org_id` is what makes a plan shareable — it is the column RLS reads to decide who else
-- can see the row — so it is also the scope in which a number has to mean one thing.
-- Two teammates saying "plan #7" must land on the same plan.
--
-- It is nullable, though: a session on a personal repository, on no repository, or on one
-- that was deleted has no org. Those fall back to the OWNER, which is the widest scope
-- they are ever visible in. The two are kept apart by two PARTIAL unique indexes rather
-- than one index over a coalesced expression, so each states its own invariant and
-- neither can be satisfied by a null.
--
-- ── THE NUMBER FOLLOWS A MOVE ────────────────────────────────────────────────────────
--
-- `org_id` is DERIVED and can change under the row's feet: sharing a repository with an
-- org, moving it between orgs, or deleting the org re-derives every session on it
-- (repositories_derive_plan_session_orgs, 20260821090000). A number minted in one scope
-- would then land in another where it may already be taken, and the unique index would
-- reject a write the user did not make.
--
-- So a scope change re-mints the number. This is the one case where a plan's id is NOT
-- permanent, and it is the lesser evil: the alternative is either a collision that breaks
-- an unrelated write, or numbers that are unique nowhere. It is also rare, and it is a
-- move the reader can see happening.
--
-- ── CONCURRENCY ──────────────────────────────────────────────────────────────────────
--
-- `max + 1` is a read-modify-write, and two inserts into one scope at the same instant
-- would both read the same max. The advisory lock below serialises numbering PER SCOPE
-- for the length of the transaction — not the table, so plans on different orgs never
-- wait on each other. The unique indexes stay as the backstop; the lock is what keeps
-- them from ever having to fire.

alter table public.plan_sessions
  add column if not exists number integer;

comment on column public.plan_sessions.number is
  'Short human id, sequential within the session''s organization (or within its '
  'owner when it has none). Assigned by the trigger below, never by the client. '
  'Re-minted if the session''s org changes, which is the only time it moves.';

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Oldest first, so the numbers read as the order the plans were actually made in.
-- `id` breaks a tie between two rows created in the same microsecond, so the result
-- is deterministic if this ever runs twice on a restored copy.
with numbered as (
  select
    id,
    row_number() over (
      partition by coalesce(org_id::text, 'owner:' || owner_id::text)
      order by created_at, id
    ) as n
  from public.plan_sessions
)
update public.plan_sessions s
set number = numbered.n
from numbered
where numbered.id = s.id
  and s.number is null;

-- ---------------------------------------------------------------------------
-- Uniqueness
-- ---------------------------------------------------------------------------
-- PARTIAL, unlike uq_plan_sessions_owner_spec_key above them, and safely so: nothing
-- upserts on these. PostgREST's inability to find a partial arbiter only matters for a
-- column pair named in an `on_conflict`, and `number` never is — it is assigned by a
-- trigger and the client does not know it.
create unique index if not exists uq_plan_sessions_org_number
  on public.plan_sessions (org_id, number)
  where org_id is not null;

create unique index if not exists uq_plan_sessions_owner_number
  on public.plan_sessions (owner_id, number)
  where org_id is null;

-- ---------------------------------------------------------------------------
-- Assignment
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: the max it reads is over the whole scope, which on an org includes
-- sessions belonging to OTHER members — rows the inserting user can select today, but
-- the function must not depend on that staying true as the policies evolve.
--
-- Reachable only as a trigger.
create or replace function public.plan_sessions_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  scope text := coalesce(new.org_id::text, 'owner:' || new.owner_id::text);
  old_scope text;
begin
  if tg_op = 'UPDATE' then
    old_scope := coalesce(old.org_id::text, 'owner:' || old.owner_id::text);
    -- Same scope: the number the row already carries is still the right one, and
    -- re-minting it on every ordinary write would change a plan's id every time its
    -- spec was uploaded.
    if old_scope = scope and new.number is not null then
      new.number := old.number;
      return new;
    end if;
  end if;

  -- One waiter per scope, released at commit. `hashtext` collisions merely make two
  -- unrelated scopes queue behind each other for a few microseconds.
  perform pg_advisory_xact_lock(hashtext('plan_sessions_number:' || scope));

  select coalesce(max(s.number), 0) + 1
    into new.number
    from public.plan_sessions s
   where case
           when new.org_id is null then s.org_id is null and s.owner_id = new.owner_id
           else s.org_id = new.org_id
         end
     and s.id is distinct from new.id;

  return new;
end;
$$;

comment on function public.plan_sessions_assign_number() is
  'Assign plan_sessions.number, sequential within the session''s org (or owner). '
  'Trigger-only.';

revoke execute on function public.plan_sessions_assign_number() from public;

-- AFTER `derive_org` in the same BEFORE phase, which is what the name buys: Postgres
-- fires same-timing triggers in alphabetical order, and 'derive_org' < 'set_plan_number'.
-- The order matters — this reads `new.org_id`, and on an insert that column is set by
-- that trigger and not by the client.
drop trigger if exists set_plan_number on public.plan_sessions;
create trigger set_plan_number
  before insert or update on public.plan_sessions
  for each row execute function public.plan_sessions_assign_number();

alter table public.plan_sessions
  alter column number set not null;
