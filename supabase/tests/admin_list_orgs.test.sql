-- pgTAP: admin_list_orgs — the platform-wide organization list.
--
-- Covers 20260728100000_admin_list_orgs.sql. Four things are proven, because they
-- are the four ways this function could be wrong:
--
--   1. A non-admin authenticated caller is refused, and so is a caller with no
--      session at all — the two guards, in the order the function runs them.
--   2. `anon` holds no execute privilege. Asserted through has_function_privilege
--      rather than by attempting the call: a statement that throws proves only
--      that SOMETHING refused it, and the privilege is the layer that cannot be
--      re-opened by adding a policy.
--   3. An admin sees EVERY org — including one with no members, no repo, no agent
--      and no invitation, which is what a query driven off memberships (or off any
--      other one-to-many relation) would silently drop. This is the canary.
--   4. The counts are not inflated by join fan-out. The fixture gives one org
--      several memberships AND several repos AND several agents at once, which is
--      precisely the shape that multiplies counts under a naive five-way join: a
--      group-by implementation returns 4/4/4 here where the truth is 2/2/2.
--
-- Same impersonation caveat as every other suite: pgTAP runs as the table OWNER,
-- which BYPASSES RLS, so seeding happens as the owner and each assertion sets
-- `role authenticated` + a `request.jwt.claims` sub so auth.uid() resolves.

begin;
select plan(19);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 (1111) — the platform admin, owning nothing.
--   u2 (2222) — an ordinary user; creator of Org Full.
--   u3 (3333) — a second member of Org Full, so member_count is not 1.
--
--   Org Full  (aaaa) — 2 members (1 admin), 2 repos, 2 agents, 2 pending invites
--                      plus one accepted and one revoked. The fan-out fixture.
--   Org Empty (bbbb) — nothing attached at all. The canary for assertion 3.
--   Org Gone  (cccc) — archived, and created by nobody (created_by null), which
--                      is the orphan shape the LEFT JOIN on auth.users exists for.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now() - interval '3 days', now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now() - interval '2 days', now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now() - interval '1 day', now());

-- The bootstrap the application cannot perform (platform_admins grants
-- `authenticated` nothing) — a row inserted as the owner, as a human does it.
insert into public.platform_admins (user_id)
values ('11111111-1111-1111-1111-111111111111');

-- created_at is set explicitly: the function orders by it, and assertion 3 below
-- reads the rows positionally.
insert into public.organizations (id, name, created_by, created_at, archived_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org Full',  '22222222-2222-2222-2222-222222222222', now() - interval '3 days', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Empty', '22222222-2222-2222-2222-222222222222', now() - interval '2 days', null),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org Gone',  null,                                   now() - interval '1 day',  now());

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user');

insert into public.repositories (id, owner_id, org_id, name, keywords)
values
  ('c0000000-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-repo-1', '{api}'),
  ('c0000000-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-repo-2', '{web}'),
  -- A personal repo of the same owner: it must NOT be counted against the org.
  ('c0000000-0000-0000-0000-0000000000cc', '22222222-2222-2222-2222-222222222222', null,                                   'perso-repo',  '{}');

-- org_id is set directly here rather than derived through agent_repositories:
-- this suite is about the counting, and the derivation has its own coverage in
-- event_org_from_agent.test.sql. One agent is archived, to prove it still counts.
insert into public.agents (id, org_id, owner_id, name, ticket_id, status, branch_name, archived_at)
values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Live agent',   'ORG-1', 'in review', 'feature/org-1', null),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Closed agent', 'ORG-2', 'merged',    'feature/org-2', now());

-- Two pending, plus one accepted and one revoked which must NOT be counted.
insert into public.invitations (org_id, email, role, status, invited_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1@example.com', 'user',  'pending',  '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p2@example.com', 'admin', 'pending',  '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1@example.com', 'user',  'accepted', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r1@example.com', 'user',  'revoked',  '22222222-2222-2222-2222-222222222222');

-- ===========================================================================
-- 1..2. The two guards, in the order the function runs them.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

select throws_ok(
  $sql$ select public.admin_list_orgs() $sql$,
  'not a platform admin',
  'admin_list_orgs rejects a non-admin'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.admin_list_orgs() $sql$,
  'admin_list_orgs requires an authenticated user',
  'admin_list_orgs rejects a caller with no session'
);

-- ===========================================================================
-- 3..4. The GRANT layer. Read back as the owner: querying another role's
-- privileges requires membership in it.
-- ===========================================================================
reset role;

select ok(
  not has_function_privilege('anon', 'public.admin_list_orgs()', 'execute'),
  'anon cannot execute admin_list_orgs'
);

select ok(
  has_function_privilege('authenticated', 'public.admin_list_orgs()', 'execute'),
  'authenticated can execute admin_list_orgs'
);

-- ===========================================================================
-- 5..19. As the platform admin.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 5. EVERY org comes back — the canary. An implementation driven off memberships
--    returns 1 here (only Org Full has any), and an implementation that filtered
--    archived rows returns 2.
select is(
  (select count(*) from public.admin_list_orgs()),
  3::bigint,
  'admin_list_orgs returns every org, including the empty and the archived one'
);

-- 6..7. Ordering is by created_at ascending, which assertions 8+ rely on.
select is(
  (select name from public.admin_list_orgs() offset 0 limit 1),
  'Org Full',
  'the oldest org comes first'
);

select is(
  (select name from public.admin_list_orgs() offset 2 limit 1),
  'Org Gone',
  'the newest org comes last'
);

-- 8..12. Org Full: no count is inflated by another relation's fan-out. Two
--        memberships × two repos × two agents × four invitations is 64 rows under
--        a naive five-way join, so a group-by implementation fails all five.
select is(
  (select member_count from public.admin_list_orgs() where name = 'Org Full'),
  2::bigint,
  'member_count is not inflated by the repo/agent/invitation fan-out'
);

select is(
  (select admin_count from public.admin_list_orgs() where name = 'Org Full'),
  1::bigint,
  'admin_count counts only the admin membership'
);

select is(
  (select repo_count from public.admin_list_orgs() where name = 'Org Full'),
  2::bigint,
  'repo_count excludes the owner''s personal repo'
);

select is(
  (select agent_count from public.admin_list_orgs() where name = 'Org Full'),
  2::bigint,
  'agent_count includes the archived agent'
);

select is(
  (select pending_invitation_count from public.admin_list_orgs() where name = 'Org Full'),
  2::bigint,
  'pending_invitation_count ignores accepted and revoked invitations'
);

-- 13..17. Org Empty: zeros, not NULLs. A LEFT JOIN over zero rows yields NULL,
--         and "unknown" is a different claim from "none".
select is(
  (select member_count from public.admin_list_orgs() where name = 'Org Empty'),
  0::bigint,
  'member_count is 0 rather than NULL for an org with no members'
);

select is(
  (select admin_count from public.admin_list_orgs() where name = 'Org Empty'),
  0::bigint,
  'admin_count is 0 rather than NULL'
);

select is(
  (select repo_count from public.admin_list_orgs() where name = 'Org Empty'),
  0::bigint,
  'repo_count is 0 rather than NULL'
);

select is(
  (select agent_count from public.admin_list_orgs() where name = 'Org Empty'),
  0::bigint,
  'agent_count is 0 rather than NULL'
);

select is(
  (select pending_invitation_count from public.admin_list_orgs() where name = 'Org Empty'),
  0::bigint,
  'pending_invitation_count is 0 rather than NULL'
);

-- 18. The creator's email is resolved, so a uuid is not the only identification.
select is(
  (select created_by_email from public.admin_list_orgs() where name = 'Org Full'),
  'u2@example.com',
  'created_by_email is resolved through auth.users'
);

-- 19. The orphan shape: created_by is null, and the org must still come back
--     rather than being dropped by the join to auth.users.
select is(
  (select created_by_email from public.admin_list_orgs() where name = 'Org Gone'),
  null,
  'an org with no creator still comes back, with a null email'
);

select * from finish();
rollback;
