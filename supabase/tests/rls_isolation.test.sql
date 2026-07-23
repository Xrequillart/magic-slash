-- pgTAP: prove strict per-org RLS isolation.
--
-- IMPORTANT: `supabase test db` (and pgTAP generally) runs as the database
-- OWNER, which BYPASSES Row Level Security. To actually exercise the policies
-- we must impersonate an authenticated end user for each assertion by:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- auth.uid() reads the "sub" claim, so this is what the policies see.
-- We `reset role;` back to the owner to seed data or switch users.

begin;
select plan(15);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed here). Fixed uuids for determinism.
-- ---------------------------------------------------------------------------
-- Two auth users. We populate the columns that are commonly NOT NULL / needed
-- for a valid row across Supabase auth.users versions; the rest default.
-- u3 is a REGULAR (non-admin) member of Org One, used to prove the admin gate.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now());

-- Two organizations. Direct insert works because the owner bypasses the
-- (deliberately absent) INSERT policy on organizations.
insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', '22222222-2222-2222-2222-222222222222');

-- One admin membership per user in their own org, plus u3 as a plain 'user'
-- member of Org One (to exercise the admin-only write policies).
insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user');

-- One agent, one skill, one config per org. Fixed agent ids so later
-- assertions can reference Org Two's agent to prove cross-tenant rejection.
insert into public.agents (id, org_id, owner_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Agent One'),
  ('b0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Agent Two');

insert into public.skills (org_id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Skill One', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Skill Two', '22222222-2222-2222-2222-222222222222');

insert into public.configs (org_id, user_id, data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '{"theme":"dark"}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '{"theme":"light"}'::jsonb);

-- One usage_event and one activity_event in Org One so the append-only
-- assertions operate on a non-empty table (a DELETE/UPDATE against an empty
-- table would return 0 even if the policy were permissive).
insert into public.usage_events (org_id, user_id, model, tokens)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'claude', 100);

insert into public.activity_events (org_id, user_id, action)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'started');

-- ---------------------------------------------------------------------------
-- Context: authenticate as u1 (member/admin of Org One)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 1. u1 sees exactly its own org's single agent.
select is(
  (select count(*) from public.agents),
  1::bigint,
  'u1 sees only its own org agent'
);

-- 2. u1 sees zero of Org Two's agents.
select is(
  (select count(*) from public.agents where org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'u1 sees no Org Two agents'
);

-- 3. u1 sees exactly its own org's single skill.
select is(
  (select count(*) from public.skills),
  1::bigint,
  'u1 sees only its own org skill'
);

-- 4. configs are per-user: u1 sees only its own config, never u2's.
select is(
  (select count(*) from public.configs),
  1::bigint,
  'u1 sees only its own config'
);

-- 5. Cross-org WRITE is rejected: u1 cannot insert an agent tagged with Org Two.
--    The agents_insert WITH CHECK (is_org_member(org_id)) must fail.
select throws_ok(
  $sql$ insert into public.agents (org_id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Injected') $sql$,
  '42501',
  'new row violates row-level security policy for table "agents"',
  'u1 cannot write an agent into another org'
);

-- ---------------------------------------------------------------------------
-- Context: authenticate as u2 (member/admin of Org Two)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 6. u2 sees exactly its own org's single agent.
select is(
  (select count(*) from public.agents),
  1::bigint,
  'u2 sees only its own org agent'
);

-- 7. u2 sees zero of Org One's agents.
select is(
  (select count(*) from public.agents where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'u2 sees no Org One agents'
);

-- ---------------------------------------------------------------------------
-- Context: authenticate as u3 (plain 'user' member of Org One).
-- Proves the admin-role gate and the append-only guarantee.
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 8. A non-admin member cannot create a skill (skills writes are admin-only).
select throws_ok(
  $sql$ insert into public.skills (org_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sneaky Skill') $sql$,
  '42501',
  'new row violates row-level security policy for table "skills"',
  'a non-admin member cannot create an org skill'
);

-- 9. A non-admin member cannot add a membership (memberships writes are admin-only).
select throws_ok(
  $sql$ insert into public.memberships (org_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user') $sql$,
  '42501',
  'new row violates row-level security policy for table "memberships"',
  'a non-admin member cannot add a membership'
);

-- 10. usage_events is append-only: the authenticated role is granted only
--     SELECT + INSERT (no UPDATE), so an UPDATE is rejected outright with
--     permission denied (42501) — a stronger guarantee than RLS row filtering.
select throws_ok(
  $sql$ update public.usage_events set tokens = 999 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $sql$,
  '42501',
  NULL,
  'usage_events cannot be updated (append-only)'
);

-- 11. activity_events is likewise append-only: no DELETE grant → permission denied.
select throws_ok(
  $sql$ delete from public.activity_events where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $sql$,
  '42501',
  NULL,
  'activity_events cannot be deleted (append-only)'
);

-- 12. Actor integrity: a member cannot record a usage event attributed to
--     another user (usage_events_insert WITH CHECK requires user_id = auth.uid()).
select throws_ok(
  $sql$ insert into public.usage_events (org_id, user_id, model) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'claude') $sql$,
  '42501',
  'new row violates row-level security policy for table "usage_events"',
  'a member cannot forge another user as the usage event actor'
);

-- 13. Tenant integrity: a usage event in Org One cannot reference Org Two's
--     agent. The composite FK (org_id, agent_id) → agents(org_id, id) rejects it
--     with a foreign_key_violation (23503), regardless of RLS.
select throws_ok(
  $sql$ insert into public.usage_events (org_id, user_id, agent_id, model) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000002', 'claude') $sql$,
  '23503',
  NULL,
  'a usage event cannot reference an agent from another org'
);

-- 14. Ownership integrity: an agent created in Org One cannot be owned by a user
--     who is not a member of Org One (agents_insert WITH CHECK is_org_member_of).
select throws_ok(
  $sql$ insert into public.agents (org_id, owner_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Forged Owner') $sql$,
  '42501',
  'new row violates row-level security policy for table "agents"',
  'an agent owner_id cannot point at a user from another org'
);

-- 15. Ownership cannot outlive membership. u3 (still authenticated) creates an
--     agent it owns; the admin then removes u3's membership. The composite FK
--     agents (org_id, owner_id) → memberships (org_id, user_id) ON DELETE SET
--     NULL (owner_id) must clear owner_id so no stale cross-tenant owner remains.
insert into public.agents (id, org_id, owner_id, name)
values
  ('c0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Agent Three');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';  -- admin of Org One
delete from public.memberships
  where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and user_id = '33333333-3333-3333-3333-333333333333';

reset role;  -- read back as owner (bypass RLS) to observe the FK side effect
select is(
  (select owner_id from public.agents where id = 'c0000000-0000-0000-0000-000000000003'),
  null::uuid,
  'removing a membership nulls owner_id on that member''s agents'
);

select * from finish();
rollback;
