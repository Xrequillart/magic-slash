-- pgTAP: an agent's organization is DERIVED from its repositories.
--
-- Covers 20260727150000_agent_repositories.sql (the link) and
-- 20260727160000_agents_org_derived.sql (the trigger + the reworked RLS).
-- Companion to agents_owner_scope.test.sql, which covers the cross-member
-- boundary; this one covers "who is this agent's org, and who may see it".
--
-- Same impersonation caveat as the other files: pgTAP runs as the table OWNER,
-- which bypasses RLS, so seeding is done here and every visibility assertion
-- sets `role authenticated` + a `request.jwt.claims` sub for auth.uid().

begin;
select plan(11);

-- ---------------------------------------------------------------------------
-- Seed. Two orgs; u1 belongs to both, u2 only to org A.
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

-- Three repos owned by u1: one in org A, one in org B, one personal.
insert into public.repositories (id, owner_id, org_id, name)
values
  ('c0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'repo-a'),
  ('c0000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'repo-b'),
  ('c0000000-0000-0000-0000-0000000000cc', '11111111-1111-1111-1111-111111111111', null,                                   'repo-perso');

-- Agents are created WITHOUT an org — the client no longer supplies one.
insert into public.agents (id, org_id, owner_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', null, '11111111-1111-1111-1111-111111111111', 'Team agent'),
  ('a0000000-0000-0000-0000-000000000002', null, '11111111-1111-1111-1111-111111111111', 'Personal agent'),
  ('a0000000-0000-0000-0000-000000000003', null, '11111111-1111-1111-1111-111111111111', 'Org B agent');

-- ---------------------------------------------------------------------------
-- The derivation
-- ---------------------------------------------------------------------------

-- 1. Attaching a team repo gives the agent that repo's org.
insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a');

select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'attaching a team repository derives its organization onto the agent'
);

-- 2. A personal repo attached afterwards does not steal it: the first repo that
--    HAS an org wins, deterministically.
insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000cc');

select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'a personal repository attached alongside does not clear the organization'
);

-- 3. An agent on personal repos only has no organization at all.
insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000cc');

select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000002'),
  null::uuid,
  'an agent working only on personal repositories has no organization'
);

-- 4. Detaching the last team repo takes the organization away again.
delete from public.agent_repositories
 where agent_id = 'a0000000-0000-0000-0000-000000000001'
   and repo_id = 'c0000000-0000-0000-0000-00000000000a';

select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  null::uuid,
  'detaching the only team repository clears the organization'
);

-- Re-attach for the visibility tests below.
insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a');

-- 5. Sharing a repository with another org re-derives every agent on it.
insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-00000000000b');

update public.repositories
   set org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
 where id = 'c0000000-0000-0000-0000-00000000000b';

select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000003'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'moving a repository to another organization re-derives its agents'
);

-- ---------------------------------------------------------------------------
-- Events follow the agent (the composite FK is ON UPDATE CASCADE)
-- ---------------------------------------------------------------------------

-- 6. An event on an agent with no organization inserts — org_id is nullable now.
insert into public.activity_events (org_id, user_id, agent_id, action)
values (null, '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000002', 'started');

select is(
  (select count(*) from public.activity_events where agent_id = 'a0000000-0000-0000-0000-000000000002'),
  1::bigint,
  'a personal agent can record activity without an organization'
);

-- 7. The regression guard for the derivation: re-deriving the org of an agent
--    that already has events used to be impossible (the FK was ON UPDATE NO
--    ACTION). The event must now follow the agent.
insert into public.activity_events (org_id, user_id, agent_id, action)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'pr_created');

delete from public.agent_repositories
 where agent_id = 'a0000000-0000-0000-0000-000000000001'
   and repo_id = 'c0000000-0000-0000-0000-00000000000a';

select is(
  (select org_id from public.activity_events where agent_id = 'a0000000-0000-0000-0000-000000000001'),
  null::uuid,
  'an existing activity event follows its agent when the derived org changes'
);

-- Put it back so the visibility tests below run against a team agent.
insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a');

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 8. A teammate sees the agent because a repo of THEIR org is attached to it.
select is(
  (select count(*) from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a member sees a colleague''s agent once a repo of their org is attached'
);

-- 9. …but never the one that only touches personal repositories.
select is(
  (select count(*) from public.agents where id = 'a0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a member cannot see a colleague''s personal agent'
);

-- 10. The link rows are visible exactly when the agent is.
select is(
  (select count(*) from public.agent_repositories where agent_id = 'a0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'the links of an invisible agent are invisible too'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 11. The owner always sees their own agent, organization or not.
select is(
  (select count(*) from public.agents where id = 'a0000000-0000-0000-0000-000000000002'),
  1::bigint,
  'the owner sees their own agent even with no organization'
);

select * from finish();
rollback;
