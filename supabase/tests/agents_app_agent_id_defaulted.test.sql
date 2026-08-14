-- pgTAP: the database keys an agent even when the writer does not.
--
-- Covers 20260814160000_agents_app_agent_id_defaulted.sql: the `fill_app_agent_id`
-- trigger, and the second fold — the one grouped on the EFFECTIVE app id, which is
-- what 20260814090000's block could not see.
--
-- WHAT IS ACTUALLY UNDER TEST. 20260814090000 made a duplicate unrepresentable for
-- a client that sends `app_agent_id`. Every desktop build older than its client
-- half does not, and a unique index treats null keys as distinct — so the rows kept
-- coming and the index had no opinion about them. The assertions below are written
-- from that writer's point of view: they insert the way a v0.70.0 app does, with no
-- mention of the column, and expect the database to key the row anyway.
--
-- The trigger half runs against the LIVE trigger. The fold half is a TRANSCRIPTION
-- of the migration's do-block, for the same reason the previous test transcribes
-- its own: a data migration runs once, inside a transaction that is long gone, so
-- rebuilding the state it met and replaying it is the only way to assert on it.
-- Keep the two in step.

begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- Seed. One user, one org, one team repo — enough to prove an event follows its
-- agent, which is all the org machinery this test needs (the composite-FK case
-- across two different derived orgs is covered by agents_app_agent_id.test.sql).
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
        'authenticated', 'authenticated', 'u1@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin');

insert into public.repositories (id, owner_id, org_id, name)
values ('c0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'repo-a');

-- ---------------------------------------------------------------------------
-- The trigger: a write that names no key still gets one
-- ---------------------------------------------------------------------------
-- Exactly the shape a build older than 20260814090000 sends: an `id` of its own
-- making, the app id living only inside the jsonb, and no app_agent_id column.
insert into public.agents (id, org_id, owner_id, name, metadata)
values ('a0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111',
        'Agent', '{"__app": {"id": "claude-old"}}'::jsonb);

-- 1. The database read the app id out of the metadata and keyed the row with it.
select is(
  (select app_agent_id from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  'claude-old',
  'an insert that omits app_agent_id is keyed from metadata->__app->>id'
);

-- 2. THE POINT OF THE WHOLE MIGRATION. The same old writer, having lost its id map,
--    inserts the same agent under a fresh uuid — which is how every duplicate in
--    the table was born. It is now a failed write instead of a second row.
--
--    Its update was already being lost: it landed on a phantom row nobody reads.
--    Losing it loudly, without polluting the table every other reader shares, is
--    the better of the two outcomes available.
select throws_ok(
  $$insert into public.agents (id, org_id, owner_id, name, metadata)
    values ('a0000000-0000-0000-0000-000000000002', null, '11111111-1111-1111-1111-111111111111',
            'Agent', '{"__app": {"id": "claude-old"}}'::jsonb)$$,
  '23505',
  null,
  'an unkeyed duplicate is refused rather than inserted alongside'
);

-- 3. A row with no app id anywhere is not the trigger's business: the expression
--    yields null, null keys stay distinct, and any number of them coexist. Rows no
--    desktop wrote — a test's, the webapp's — must keep working.
insert into public.agents (id, org_id, owner_id, name)
values ('a0000000-0000-0000-0000-000000000003', null, '11111111-1111-1111-1111-111111111111', 'No app id');

select lives_ok(
  $$insert into public.agents (id, org_id, owner_id, name)
    values ('a0000000-0000-0000-0000-000000000004', null, '11111111-1111-1111-1111-111111111111', 'Neither')$$,
  'rows carrying no app id at all still coexist freely'
);

-- 4. Closing an agent RELEASES its app id, and the trigger must not put it back —
--    archiveAgent nulls both columns in one statement and the release is the point
--    of it. A trigger that healed this would resurrect the id of a closed agent
--    and block the live one that reuses it.
update public.agents
   set archived_at = now(), app_agent_id = null
 where id = 'a0000000-0000-0000-0000-000000000001';

select is(
  (select app_agent_id from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  null,
  'archiving releases the app id and the trigger leaves it released'
);

-- 5. …whereas a LIVE row whose key was nulled is outside the invariant, and gets it
--    back. Reaching this state requires a writer the codebase does not have, which
--    is why the guard is cheaper than trusting that it never appears.
update public.agents
   set app_agent_id = null
 where id = 'a0000000-0000-0000-0000-000000000003';

select is(
  (select app_agent_id from public.agents where id = 'a0000000-0000-0000-0000-000000000003'),
  null,
  'a live row with no app id in its metadata stays unkeyed'
);

-- ---------------------------------------------------------------------------
-- The second fold: a keyed row and an unkeyed row are ONE agent
-- ---------------------------------------------------------------------------
-- The state the field is actually in, and the pair 20260814090000's block was blind
-- to — it grouped on the column alone, so these two were two groups of one:
--
--   * the OLDER row is the one the old prod build inserted after that migration's
--     backfill had already run, so it carries the app id only in its jsonb;
--   * the YOUNGER one is what an updated build added the first time it saved that
--     agent — it hydrated the row, read the app id from the jsonb, upserted WITH
--     the column set, matched nothing, and inserted.
--
-- The trigger and the index both have to come off to rebuild it: with either in
-- place this state cannot exist, which is the whole claim.
alter table public.agents disable trigger fill_app_agent_id;
drop index public.uq_agents_owner_app_agent_id;

insert into public.agents (id, org_id, owner_id, name, app_agent_id, metadata, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111', 'Prod',
   null,          '{"__app": {"id": "claude-mix"}}'::jsonb, '2026-08-14 09:30:00+00'),
  ('d0000000-0000-0000-0000-000000000002', null, '11111111-1111-1111-1111-111111111111', 'Dev',
   'claude-mix',  '{"__app": {"id": "claude-mix"}}'::jsonb, '2026-08-14 10:30:00+00');

-- The younger row is the one that accumulated the newer history, and it is the one
-- being archived — so this event is the assertion that the fold moves what it
-- archives rather than orphaning it. org_id is stamped from the agent by trigger.
insert into public.agent_repositories (agent_id, repo_id, created_at)
values ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000a', '2026-08-14 10:31:00+00');

insert into public.activity_events (id, org_id, user_id, agent_id, action)
values ('e0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111',
        'd0000000-0000-0000-0000-000000000002', 'pr_created');

-- ── transcription of 20260814160000: fold on the effective id, THEN backfill ──
-- The order is load-bearing and the reverse of 20260814090000's: backfilling first
-- would try to give the older row a key the younger one already holds, and the
-- index would reject it.
do $$
declare
  dup   record;
  loser record;
  keep_org uuid;
begin
  for dup in
    select owner_id,
           coalesce(app_agent_id, metadata->'__app'->>'id') as app_id,
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
      insert into public.agent_repositories (agent_id, repo_id, created_at)
      select dup.keep_id, ar.repo_id, ar.created_at
        from public.agent_repositories ar
       where ar.agent_id = loser.id
      on conflict do nothing;

      delete from public.agent_repositories where agent_id = loser.id;

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

update public.agents
   set app_agent_id = metadata->'__app'->>'id'
 where archived_at is null
   and app_agent_id is null
   and metadata->'__app'->>'id' is not null;

-- 6. The older row survives even though it was the UNKEYED one — the history points
--    at whichever row came first, and being keyed is not a claim to seniority.
select results_eq(
  $sql$ select id, app_agent_id from public.agents
         where owner_id = '11111111-1111-1111-1111-111111111111'
           and archived_at is null
           and coalesce(app_agent_id, metadata->'__app'->>'id') = 'claude-mix' $sql$,
  $sql$ values ('d0000000-0000-0000-0000-000000000001'::uuid, 'claude-mix'::text) $sql$,
  'the older unkeyed row survives the fold and is the one backfilled'
);

-- 7. The younger row is archived with its id released, like any other loser.
select is(
  (select count(*) from public.agents
    where id = 'd0000000-0000-0000-0000-000000000002'
      and archived_at is not null and app_agent_id is null),
  1::bigint,
  'the younger keyed row is archived with its app id released'
);

-- 8. Its history followed it — agent AND org together, since the keeper inherited
--    the repository link and with it the derived organization.
select results_eq(
  $sql$ select agent_id, org_id from public.activity_events
         where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  $sql$ values ('d0000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $sql$,
  'the loser''s event is repointed at the keeper with the keeper''s organization'
);

-- 9. And the table can carry the constraint again, which is what the fold is for.
select lives_ok(
  $$create unique index uq_agents_owner_app_agent_id on public.agents (owner_id, app_agent_id)$$,
  'the re-deduplicated table accepts the unique index'
);

alter table public.agents enable trigger fill_app_agent_id;

select * from finish();
rollback;
