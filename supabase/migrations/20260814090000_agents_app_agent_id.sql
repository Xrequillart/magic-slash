-- Migration: the app's own agent id becomes the agent's identity in the database
--
-- THE BUG
-- ---------------------------------------------------------------------------
-- The same agent appears several times in `agents`, and on the Team page as
-- several people's worth of work. Every duplicate carries the same app-level id
-- inside its metadata — `metadata->'__app'->>'id'`, the `claude-<epoch>` string
-- the desktop mints when a terminal is created — under a different uuid primary
-- key.
--
-- Nothing in the database said those rows were the same agent. The binding from
-- an app id to a row uuid lived in ONE process's memory (CloudStore.agentIdMap),
-- rebuilt on each hydration and consulted on each write:
--
--     const uuid = this.agentIdMap.get(a.id) ?? randomUUID()
--     …upsert(rows, { onConflict: 'id' })
--
-- A cache miss therefore did not mean "this agent is new". It meant "this
-- process has not looked yet" — and it minted a brand-new identity for an agent
-- that already had one. Two ordinary situations produce the miss:
--
--   * two app instances (a second window, a relaunch before the first quit)
--     write the same roster; each has its own map, and the one that never
--     hydrated invents uuids for agents the other created;
--   * a single instance, mid-hydration: loadAgents() cleared the map BEFORE
--     awaiting its query, so any write landing inside that window re-minted the
--     WHOLE roster.
--
-- Each invented uuid is a new row, and `on conflict (id)` cannot object: the key
-- it arbitrates on is the one that was just made up.
--
-- THE FIX
-- ---------------------------------------------------------------------------
-- The app id descends into the database as a column, gets a unique index per
-- owner, and becomes what the upsert arbitrates on. Identity stops being a
-- process's recollection and becomes a constraint: whatever any client believes,
-- a second row for an app id it already owns cannot be inserted. The client
-- change is the natural consequence — it stops sending `id` at all, so the
-- primary key keeps its value on update and its `gen_random_uuid()` default on
-- insert, and the database is the only thing that ever mints one.
--
-- Why not make the app id the primary key outright: every event table references
-- agents through a composite `(org_id, agent_id)` foreign key, the webapp and the
-- Realtime feed key on the uuid, and `agent_repositories` has it in its own
-- primary key. Repointing all of that would be a rewrite of the schema to fix a
-- write path. The uuid stays the surrogate key; the app id becomes the NATURAL
-- key beside it, which is the only thing the duplicates ever needed.
--
-- Why not a partial index on the active rows, which is what the invariant really
-- is: PostgREST cannot express an index predicate in `on_conflict`, so an upsert
-- could not infer it. The index is total, and the invariant "an archived row
-- holds no app id" is maintained by the writers instead (see below).

-- ---------------------------------------------------------------------------
-- The column, backfilled from the jsonb it has been hiding in
-- ---------------------------------------------------------------------------
-- Text, not uuid: `claude-1754923118423` is a client-minted string and always
-- has been. Nullable, because a row that is not the desktop's — an agent created
-- by anything else, or by a test — has no app id, and null keys are distinct in
-- a unique index, so any number of them coexist.
alter table public.agents add column if not exists app_agent_id text;

-- ARCHIVED ROWS ARE LEFT NULL, deliberately. App ids are `claude-${Date.now()}`
-- and closing an agent does not retire its id: the desktop is free to reuse one,
-- and a closed agent must not win the conflict arbitration against the live agent
-- that reuses it — resurrecting a row the user closed, invisible because
-- `archived_at` stays set. "Only a live agent holds an app id" is the invariant
-- that makes the total index safe, and it starts here.
update public.agents
   set app_agent_id = metadata->'__app'->>'id'
 where archived_at is null
   and app_agent_id is null
   and metadata->'__app'->>'id' is not null;

-- ---------------------------------------------------------------------------
-- Fold the duplicates the missing constraint let in
-- ---------------------------------------------------------------------------
-- The OLDEST row of each group is the keeper, because it is the one the history
-- points at: the duplicates were minted later by processes that had lost the
-- binding, so the events, the usage and the skill runs of the first sessions all
-- reference the first row. Keeping the newest would mean moving the most data and
-- archiving the row every existing reference agrees on.
--
-- The losers are archived, not deleted: whatever DID accumulate under them stays
-- reachable through the keeper, and a soft delete is the same thing closing an
-- agent does (20260727140000). Their app_agent_id is released in the same
-- statement, per the invariant above.
--
-- Note what the repointing must move: the event tables' foreign key is composite,
-- `(org_id, agent_id) → agents (org_id, id)`, and two duplicates of one agent can
-- perfectly well have derived DIFFERENT organizations (the derivation reads their
-- own repository links, and the duplicates rarely have the same ones). So both
-- columns move together, to the keeper's pair — updating agent_id alone would
-- point the row at an agent of another org and the constraint would reject it.
do $$
declare
  dup   record;
  loser record;
  keep_org uuid;
begin
  for dup in
    select owner_id,
           app_agent_id,
           -- created_at ties are broken by id so the choice is deterministic and
           -- the run is repeatable.
           (array_agg(id order by created_at, id))[1] as keep_id
      from public.agents
     where archived_at is null
       and owner_id is not null
       and app_agent_id is not null
     group by owner_id, app_agent_id
    having count(*) > 1
  loop
    for loser in
      select id
        from public.agents
       where owner_id = dup.owner_id
         and app_agent_id = dup.app_agent_id
         and archived_at is null
         and id <> dup.keep_id
    loop
      -- The repository links first: they are what the keeper's organization is
      -- derived from, so moving them before the events means the events land on
      -- an org that is already final. created_at travels with the row because
      -- attachment order is what picks the org among several.
      --
      -- `on conflict do nothing` — the primary key is (agent_id, repo_id), and
      -- two duplicates of one agent usually resolve to the SAME repositories, so
      -- most of these links already exist on the keeper. What cannot be moved is
      -- then deleted rather than left behind: the loser is being archived, and a
      -- link would keep re-deriving an organization for a row nobody works in.
      insert into public.agent_repositories (agent_id, repo_id, created_at)
      select dup.keep_id, ar.repo_id, ar.created_at
        from public.agent_repositories ar
       where ar.agent_id = loser.id
      on conflict do nothing;

      delete from public.agent_repositories where agent_id = loser.id;

      -- Read AFTER the links moved: the insert above fires derive_agent_org and
      -- may have just given the keeper an organization it did not have.
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
-- The constraint that makes the duplicate unrepresentable
-- ---------------------------------------------------------------------------
-- Per OWNER, not per organization: an agent belongs to its owner, and its org is
-- derived from its repositories (20260727160000) — it can be null, it can change
-- under the agent's feet, and it is emphatically not part of who the agent is.
-- The owner is the scope the app writes in and the scope RLS enforces.
--
-- Total, not partial, because `on_conflict=owner_id,app_agent_id` in PostgREST
-- infers the index from the column list alone and cannot carry a `where`. Rows
-- outside the invariant are excluded by their nulls instead: archived rows hold
-- no app id, and a row whose owner_id was nulled by the membership foreign key
-- has no owner to be unique within.
create unique index if not exists uq_agents_owner_app_agent_id
  on public.agents (owner_id, app_agent_id);

comment on column public.agents.app_agent_id is
  'The desktop app''s own agent id (`claude-<epoch>`) — the NATURAL key an upsert '
  'arbitrates on, unique per owner. Null for a row no desktop created, and for '
  'every archived row: closing an agent releases its app id so a later agent may '
  'reuse it instead of resurrecting the closed one. Also mirrored in '
  'metadata->''__app''->>''id'' for readers written before this column existed.';
