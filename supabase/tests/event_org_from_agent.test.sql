-- pgTAP: an event row's org_id is DERIVED from its agent, not from whatever
-- organization the writer thought was active.
--
-- Regression test for:
--   insert or update on table "activity_events" violates foreign key constraint
--   "activity_events_org_id_agent_id_fkey"
-- which fired for every agent whose derived org disagreed with the writer's active
-- org — an agent on a personal repository being the ordinary case.
--
-- IMPORTANT: `supabase test db` runs as the database OWNER, which BYPASSES RLS.
-- Each assertion impersonates an authenticated end user via
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- and `reset role;` returns to the owner to seed or switch users.

begin;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org C', '22222222-2222-2222-2222-222222222222');

-- u1 belongs to A and B. A is what resolveOrgId() would pick (oldest membership),
-- so A is the "active org" the desktop app used to stamp on every event.
insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'user'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'admin');

-- A personal repository (org_id null) and a repository shared with org B.
insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, 'personal-repo'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'team-repo');

-- Agents are inserted WITHOUT an org, exactly as the client now does: org_id is
-- derived by trigger from whatever repositories get attached.
insert into public.agents (id, owner_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'personal agent'),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'team agent'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'unattached agent');

insert into public.agent_repositories (agent_id, repo_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002');

-- Preconditions: the derivation produced what the rest of the file assumes.
select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000001'),
  null,
  'an agent on a personal repo derives no organization'
);
select is(
  (select org_id from public.agents where id = 'a0000000-0000-0000-0000-000000000002'),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'an agent on a team repo derives that team'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- ---------------------------------------------------------------------------
-- The bug: active org A stamped onto an agent that belongs elsewhere
-- ---------------------------------------------------------------------------

-- 3. The exact insert that used to raise 23503. Org A is what the client sends.
select lives_ok(
  $$insert into public.activity_events (org_id, user_id, agent_id, action)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
            'a0000000-0000-0000-0000-000000000001', 'started')$$,
  'an event for a personal agent no longer violates the composite FK'
);

-- 4. And it landed with the AGENT's org (none), not the one that was sent.
select is(
  (select org_id from public.activity_events where agent_id = 'a0000000-0000-0000-0000-000000000001'),
  null,
  'the personal agent''s event carries no organization'
);

-- 5. Same for an agent belonging to a DIFFERENT org than the active one: the row
--    is filed under org B, so B's team dashboard sees the work and A's does not.
insert into public.activity_events (org_id, user_id, agent_id, action)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
        'a0000000-0000-0000-0000-000000000002', 'merged');
select is(
  (select org_id from public.activity_events where agent_id = 'a0000000-0000-0000-0000-000000000002'),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'an event is filed under its agent''s org, not the active one'
);

-- 6. An agent with no repository yet derives nothing, and must still record.
select lives_ok(
  $$insert into public.usage_events (org_id, user_id, agent_id, cost_usd)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
            'a0000000-0000-0000-0000-000000000003', 1.5)$$,
  'an event for an agent with no repository records'
);

-- 7. The trigger is on all three event tables, not just the one that reported it.
insert into public.skill_invocations (org_id, user_id, agent_id, skill)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
        'a0000000-0000-0000-0000-000000000002', 'magic-commit');
select is(
  (select org_id from public.skill_invocations where agent_id = 'a0000000-0000-0000-0000-000000000002'),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'skill_invocations is stamped from its agent too'
);

-- ---------------------------------------------------------------------------
-- What the trigger must NOT do
-- ---------------------------------------------------------------------------

-- 8. No agent, no derivation: the client's org is the only attribution there is,
--    and it must survive (a skill run in a terminal the app did not spawn).
insert into public.skill_invocations (org_id, user_id, agent_id, skill)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', null, 'magic-plan');
select is(
  (select org_id from public.skill_invocations where skill = 'magic-plan'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'an agent-less row keeps the org it was written with'
);

-- 9. A dangling agent_id is still rejected. The trigger must leave org_id alone
--    for an unknown agent: nulling it would make the MATCH SIMPLE composite FK
--    skip its check and silently accept the dangling reference.
select throws_ok(
  $$insert into public.activity_events (org_id, user_id, agent_id, action)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
            'a0000000-0000-0000-0000-00000000dead', 'started')$$,
  '23503',
  null,
  'an event referencing no existing agent is still rejected'
);

-- ---------------------------------------------------------------------------
-- RLS is untouched: stamping happens BEFORE the WITH CHECK is evaluated
-- ---------------------------------------------------------------------------

-- 10. Attribution to someone else is still refused.
select throws_ok(
  $$insert into public.activity_events (org_id, user_id, agent_id, action)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', null, 'started')$$,
  '42501',
  null,
  'a user still cannot attribute an event to someone else'
);

-- 11. And an org the caller does not belong to is still refused. Proven on an
--     agent-less row, the only path left by which a client picks the org at all.
select throws_ok(
  $$insert into public.activity_events (org_id, user_id, agent_id, action)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', null, 'started')$$,
  '42501',
  null,
  'a user still cannot write an event into an org it does not belong to'
);

-- ---------------------------------------------------------------------------
-- An event written before the agent had any repository still ends up attributed
-- ---------------------------------------------------------------------------
-- The realistic sequence: the app creates the agent and records `agent_created`
-- immediately, and the repository is attached a moment later. The event is written
-- with no org (there is nothing to derive yet), and the FK's ON UPDATE CASCADE —
-- added by 20260727160000 — carries it to the org the agent then derives. Without
-- that, an agent's first events would be permanently invisible to its team.
reset role;

insert into public.agents (id, owner_id, name)
values ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'late attach');

insert into public.activity_events (org_id, user_id, agent_id, action)
values (null, '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000004', 'agent_created');

insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002');

-- 12. Attaching the team repo re-derived the agent, and the event followed.
select is(
  (select org_id from public.activity_events where agent_id = 'a0000000-0000-0000-0000-000000000004'),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'an event written before the repo was attached follows the agent''s new org'
);

select * from finish();
rollback;
