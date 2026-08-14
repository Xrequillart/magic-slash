-- pgTAP: the app's agent id is the agent's identity, and duplicates are refused.
--
-- Covers 20260814090000_agents_app_agent_id.sql: the `app_agent_id` column, the
-- unique index over (owner_id, app_agent_id), and the one-shot dedup that folded
-- the rows the missing constraint had let in.
--
-- No `set role authenticated` anywhere: nothing here is about RLS. What is under
-- test is a constraint, which holds for every writer including the ones that
-- bypass policies — that is the entire point of moving the identity out of a
-- client's memory and into the schema.
--
-- The dedup half is a TRANSCRIPTION of the migration's do-block, deliberately.
-- A data migration runs once, inside a transaction that is long gone, so the only
-- way to assert on its behaviour is to rebuild the state it met and replay it.
-- The index is dropped first — the duplicates it now forbids are exactly the ones
-- the block existed to remove — and recreated at the end, which is itself the
-- assertion that the dedup left the table indexable. Keep the two in step: a
-- change to the migration's block belongs here too.

begin;
select plan(12);

-- ---------------------------------------------------------------------------
-- Seed. Two orgs, u1 in both, u2 in org A. Two repos owned by u1: one in org B,
-- one personal — the pair the dedup needs to show that two duplicates of one agent
-- can derive different organizations.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'admin');

insert into public.repositories (id, owner_id, org_id, name)
values
  ('c0000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'repo-b'),
  ('c0000000-0000-0000-0000-0000000000cc', '11111111-1111-1111-1111-111111111111', null,                                   'repo-perso');

-- ---------------------------------------------------------------------------
-- The constraint: one live row per (owner, app id)
-- ---------------------------------------------------------------------------
insert into public.agents (id, org_id, owner_id, name, app_agent_id)
values ('a0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111', 'Agent', 'claude-1');

-- 1. The bug, made unrepresentable: a second process writing the same agent no
--    longer creates a second row, whatever its own id map believes.
select throws_ok(
  $$insert into public.agents (id, org_id, owner_id, name, app_agent_id)
    values ('a0000000-0000-0000-0000-000000000002', null, '11111111-1111-1111-1111-111111111111', 'Agent', 'claude-1')$$,
  '23505',
  null,
  'a second live row for one app id is refused'
);

-- 2. The app id is scoped to its OWNER, not to the product: two people whose
--    apps both minted `claude-1` in the same millisecond are unrelated agents.
select lives_ok(
  $$insert into public.agents (id, org_id, owner_id, name, app_agent_id)
    values ('a0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Agent', 'claude-1')$$,
  'another owner may hold the same app id'
);

-- 3. Closing an agent releases its app id (archiveAgent nulls both columns
--    together), so the id becomes free again — app ids are `claude-${Date.now()}`
--    and the desktop is entitled to reuse one.
update public.agents
   set archived_at = now(), app_agent_id = null
 where id = 'a0000000-0000-0000-0000-000000000001';

select lives_ok(
  $$insert into public.agents (id, org_id, owner_id, name, app_agent_id)
    values ('a0000000-0000-0000-0000-000000000004', null, '11111111-1111-1111-1111-111111111111', 'Agent again', 'claude-1')$$,
  'an app id reused after archiving is accepted as a new row'
);

-- 4. …and it is a NEW row: the closed agent stays closed rather than being
--    resurrected by the write that reused its id.
select is(
  (select count(*) from public.agents
    where owner_id = '11111111-1111-1111-1111-111111111111' and archived_at is null and app_agent_id = 'claude-1'),
  1::bigint,
  'reusing an app id leaves exactly one live agent holding it'
);

-- 5. Any number of archived rows may have carried the same app id. This is why
--    archiving nulls the column rather than relying on a partial index: the index
--    has to be total (PostgREST cannot infer a predicate in on_conflict), and
--    null keys are what keeps closed agents out of its way.
update public.agents
   set archived_at = now(), app_agent_id = null
 where id = 'a0000000-0000-0000-0000-000000000004';

select lives_ok(
  $$insert into public.agents (id, org_id, owner_id, name, app_agent_id, archived_at)
    values ('a0000000-0000-0000-0000-000000000005', null, '11111111-1111-1111-1111-111111111111', 'Third', null, now())$$,
  'two closed agents that both carried one app id coexist'
);

-- ---------------------------------------------------------------------------
-- The dedup: the oldest row wins, and it wins the history with it
-- ---------------------------------------------------------------------------
-- Rebuild what the migration met: three rows for one app id, the id living only
-- in the jsonb, and the duplicates carrying DIFFERENT derived organizations —
-- which is the ordinary case, since each duplicate resolved its own repository
-- links.
drop index public.uq_agents_owner_app_agent_id;

insert into public.agents (id, org_id, owner_id, name, metadata, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111', 'Keeper',
   '{"__app": {"id": "claude-dup"}}'::jsonb, '2026-01-01 10:00:00+00'),
  ('d0000000-0000-0000-0000-000000000002', null, '11111111-1111-1111-1111-111111111111', 'Loser 1',
   '{"__app": {"id": "claude-dup"}}'::jsonb, '2026-01-02 10:00:00+00'),
  ('d0000000-0000-0000-0000-000000000003', null, '11111111-1111-1111-1111-111111111111', 'Loser 2',
   '{"__app": {"id": "claude-dup"}}'::jsonb, '2026-01-03 10:00:00+00');

-- The keeper works on a personal repo (org null); the first loser on a team repo,
-- which derives org B onto it. The events' composite FK is (org_id, agent_id), so
-- repointing has to move both columns at once — moving agent_id alone would point
-- the row at an agent of another organization.
-- Explicit stamps, because attachment order is what decides the derived org and
-- one statement's rows would otherwise share a single now().
insert into public.agent_repositories (agent_id, repo_id, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000cc', '2026-01-01 11:00:00+00'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000b', '2026-01-02 11:00:00+00');

-- One event per row; org_id is stamped from the agent by trigger.
insert into public.activity_events (id, org_id, user_id, agent_id, action)
values
  ('e0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111',
   'd0000000-0000-0000-0000-000000000001', 'agent_created'),
  ('e0000000-0000-0000-0000-000000000002', null, '11111111-1111-1111-1111-111111111111',
   'd0000000-0000-0000-0000-000000000002', 'pr_created');

-- ── transcription of 20260814090000: backfill, then fold ────────────────────
update public.agents
   set app_agent_id = metadata->'__app'->>'id'
 where archived_at is null
   and app_agent_id is null
   and metadata->'__app'->>'id' is not null;

do $$
declare
  dup   record;
  loser record;
  keep_org uuid;
begin
  for dup in
    select owner_id,
           app_agent_id,
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

-- 6. The oldest row survives — it is the one the history already points at.
select is(
  (select id from public.agents
    where owner_id = '11111111-1111-1111-1111-111111111111'
      and app_agent_id = 'claude-dup' and archived_at is null),
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'the oldest row of a duplicate group is the one kept, and it holds the app id'
);

-- 7. The younger ones are archived, not deleted: whatever accumulated under them
--    stays readable, and their app id is released so it cannot collide again.
select is(
  (select count(*) from public.agents
    where id in ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003')
      and archived_at is not null and app_agent_id is null),
  2::bigint,
  'every loser is archived with its app id released'
);

-- 8. The keeper's own events were never touched.
select is(
  (select agent_id from public.activity_events where id = 'e0000000-0000-0000-0000-000000000001'),
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'the keeper keeps the events it already owned'
);

-- 9. The loser's event followed it — agent AND org together. The keeper inherited
--    the team repo along the way, so its derived org is now B and the composite
--    FK is satisfied by a pair that exists.
select results_eq(
  $sql$ select agent_id, org_id from public.activity_events
         where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  $sql$ values ('d0000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) $sql$,
  'a loser''s event is repointed at the keeper with the keeper''s organization'
);

-- 10. The links merged rather than being dropped: the work the duplicate did on a
--     repository is work the surviving agent did.
select results_eq(
  $sql$ select repo_id from public.agent_repositories
         where agent_id = 'd0000000-0000-0000-0000-000000000001' order by created_at $sql$,
  $sql$ values ('c0000000-0000-0000-0000-0000000000cc'::uuid), ('c0000000-0000-0000-0000-00000000000b'::uuid) $sql$,
  'the losers'' repository links move to the keeper, in attachment order'
);

-- 11. …and none is left on an archived row, where it would keep re-deriving an
--     organization for an agent nobody works in.
select is(
  (select count(*) from public.agent_repositories
    where agent_id in ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003')),
  0::bigint,
  'no repository link is left pointing at an archived duplicate'
);

-- 12. The whole point of the fold: the table can now carry the constraint.
select lives_ok(
  $$create unique index uq_agents_owner_app_agent_id on public.agents (owner_id, app_agent_id)$$,
  'the deduplicated table accepts the unique index'
);

select * from finish();
rollback;
