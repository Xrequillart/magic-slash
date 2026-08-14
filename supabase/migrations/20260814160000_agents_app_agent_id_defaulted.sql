-- Migration: the database fills in the agent's app id when the client will not
--
-- THE BUG 20260814090000 LEFT OPEN
-- ---------------------------------------------------------------------------
-- That migration moved the agent's identity out of one process's memory and into
-- a column: `app_agent_id`, unique per owner, and what the upsert now arbitrates
-- on. It also folded the duplicates the missing constraint had let in.
--
-- It could not stop the duplicates from coming back, and the reason is the one
-- thing a unique index cannot see. NULLS ARE DISTINCT. A client that does not send
-- the column writes a row whose key is null, and any number of those coexist:
--
--   * every desktop build older than the client half of 20260814090000 upserts on
--     `id` with a uuid of its own making and never mentions `app_agent_id` at all,
--     so every row it INSERTS lands unkeyed;
--   * the migration's backfill ran once, inside a transaction that is long gone.
--     It could not reach a row created after it.
--
-- So the table went back to holding several live rows per agent, and the index
-- had no opinion about it. Worse, the two halves now actively disagree: an updated
-- client hydrates an unkeyed row (reading the app id out of
-- `metadata->'__app'->>'id'`, which is still mirrored there), then upserts it WITH
-- the column set — matches nothing, inserts a second row. Every unkeyed row
-- therefore spawns one more the first time a fixed build saves it, which turns
-- shipping the fix into one last round of duplication.
--
-- None of this was visible in the desktop app: it re-indexes the roster by app id
-- on hydration (`normalizeAgents`), so duplicates collapse into one entry on
-- screen. They are only visible where the rows are read as rows — the webapp, and
-- the agents table itself. That is why this survived a week.
--
-- THE FIX
-- ---------------------------------------------------------------------------
-- Stop asking the client to assert the key. The app id has been mirrored inside
-- the metadata since long before it had a column, so the database can read it
-- itself — and a BEFORE trigger that does so means every write is keyed whatever
-- the writer believes, which is the condition the unique index needed in order to
-- be an invariant rather than a suggestion.
--
-- Note what this does to an old build's duplicate: it becomes a FAILED WRITE
-- rather than an extra row. That is the intended trade. Its update was already
-- being lost — it landed on a phantom row nobody reads — and losing it loudly,
-- without polluting the table every other reader shares, is strictly the better
-- of the two. The write that fails is one that had no correct outcome available.

-- ---------------------------------------------------------------------------
-- 1. Fold what came back, on the EFFECTIVE app id
-- ---------------------------------------------------------------------------
-- Grouped by `coalesce(app_agent_id, metadata->'__app'->>'id')`, which is what
-- 20260814090000's block could not do: it grouped on the column alone, so a keyed
-- row and an unkeyed row of the same agent were two different groups to it and
-- neither had a duplicate. That pair is now the common case, and it is precisely
-- the one that has to collapse before the column can be backfilled — the index
-- would reject the backfill otherwise.
--
-- Everything else is deliberately identical to that block, because the reasoning
-- has not changed:
--
--   * the OLDEST row wins. The duplicates were minted later by processes that had
--     lost the binding, so the events, the usage and the skill runs of the first
--     sessions all reference the first row. Keeping the newest would mean moving
--     the most data and archiving the row every existing reference agrees on.
--   * the losers are ARCHIVED, not deleted, and release their app id in the same
--     statement — a soft delete is what closing an agent does, and whatever
--     accumulated under them stays reachable through the keeper.
--   * both `org_id` and `agent_id` move together on the event tables. Their
--     foreign key is the composite `(org_id, agent_id) → agents (org_id, id)`, and
--     two duplicates of one agent can perfectly well have derived different
--     organizations, so updating agent_id alone would point the row at an agent of
--     another org and the constraint would reject it.
do $$
declare
  dup   record;
  loser record;
  keep_org uuid;
begin
  for dup in
    select owner_id,
           coalesce(app_agent_id, metadata->'__app'->>'id') as app_id,
           -- created_at ties are broken by id so the choice is deterministic and
           -- the run is repeatable.
           (array_agg(id order by created_at, id))[1] as keep_id
      from public.agents
     where archived_at is null
       and owner_id is not null
       and coalesce(app_agent_id, metadata->'__app'->>'id') is not null
     group by owner_id, coalesce(app_agent_id, metadata->'__app'->>'id')
    having count(*) > 1
  loop
    for loser in
      select id
        from public.agents
       where owner_id = dup.owner_id
         and coalesce(app_agent_id, metadata->'__app'->>'id') = dup.app_id
         and archived_at is null
         and id <> dup.keep_id
    loop
      -- The repository links first: they are what the keeper's organization is
      -- derived from, so moving them before the events means the events land on an
      -- org that is already final. created_at travels with the row because
      -- attachment order is what picks the org among several.
      --
      -- `on conflict do nothing` — the primary key is (agent_id, repo_id), and two
      -- duplicates of one agent usually resolve to the SAME repositories. What
      -- cannot be moved is then deleted rather than left behind: the loser is being
      -- archived, and a link would keep re-deriving an organization for a row
      -- nobody works in.
      insert into public.agent_repositories (agent_id, repo_id, created_at)
      select dup.keep_id, ar.repo_id, ar.created_at
        from public.agent_repositories ar
       where ar.agent_id = loser.id
      on conflict do nothing;

      delete from public.agent_repositories where agent_id = loser.id;

      -- Read AFTER the links moved: the insert above fires derive_agent_org and may
      -- have just given the keeper an organization it did not have.
      select org_id into keep_org from public.agents where id = dup.keep_id;

      update public.usage_events
         set org_id = keep_org, agent_id = dup.keep_id
       where agent_id = loser.id;

      update public.activity_events
         set org_id = keep_org, agent_id = dup.keep_id
       where agent_id = loser.id;

      update public.skill_invocations
         set org_id = keep_org, agent_id = dup.keep_id
       where agent_id = loser.id;

      update public.agents
         set archived_at = now(), app_agent_id = null
       where id = loser.id;
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Key the survivors
-- ---------------------------------------------------------------------------
-- Safe only because step 1 ran: within one owner there is now at most one live row
-- per app id, so no two rows can be backfilled onto the same key.
--
-- Archived rows stay null, as they have since 20260814090000: app ids are
-- `claude-${Date.now()}` and closing an agent does not retire its id. The desktop
-- is free to reuse one, and a closed row must not win the conflict arbitration
-- against the live agent that reuses it — that would resurrect a row the user
-- closed, invisibly, because `archived_at` stays set. "Only a live agent holds an
-- app id" is what makes the total index safe.
update public.agents
   set app_agent_id = metadata->'__app'->>'id'
 where archived_at is null
   and app_agent_id is null
   and metadata->'__app'->>'id' is not null;

-- ---------------------------------------------------------------------------
-- 3. The trigger that keeps it true
-- ---------------------------------------------------------------------------
-- Steps 1 and 2 are one-shot, like the backfill they are repairing. This is the
-- part that does not expire.
--
-- WHY IT GUARDS ON archived_at. `archiveAgent` closes an agent with a single
-- `set archived_at = now(), app_agent_id = null` — the release of the id is the
-- point of that statement, and a trigger that put it straight back would undo the
-- close. So a row on its way out is left alone, and the invariant above holds
-- through it.
--
-- WHY IT FIRES ON UPDATE TOO, given that duplicates are only ever born on insert:
-- a live row whose key was nulled without archiving it is outside the invariant,
-- and nothing else would ever notice. Reaching that state requires a writer this
-- codebase does not have, which is exactly why the guard is cheaper than trusting
-- that it stays that way.
--
-- Not SECURITY DEFINER: it reads and writes nothing but the row being written, so
-- it needs no privilege of its own. `search_path` is pinned all the same — a
-- function on a table any authenticated user can write to should not resolve
-- anything through a caller-supplied path.
create or replace function public.agents_fill_app_agent_id()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.app_agent_id is null and new.archived_at is null then
    new.app_agent_id := new.metadata->'__app'->>'id';
  end if;
  return new;
end;
$$;

-- A row with no app id at all — one no desktop wrote, or a test's — comes through
-- untouched: the expression yields null and null keys are distinct, so any number
-- of them coexist. That has been true of the index since it was created and the
-- trigger does not change it.
drop trigger if exists fill_app_agent_id on public.agents;
create trigger fill_app_agent_id
  before insert or update on public.agents
  for each row execute function public.agents_fill_app_agent_id();

comment on function public.agents_fill_app_agent_id() is
  'Fills agents.app_agent_id from metadata->''__app''->>''id'' when the writer left '
  'it null, so uq_agents_owner_app_agent_id sees every live row. Without it a '
  'client that predates the column writes null keys, which a unique index treats '
  'as distinct — the hole 20260814090000 closed for updated clients only.';
