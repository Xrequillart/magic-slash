-- pgTAP: prove that agents are org-VISIBLE but user-OWNED.
--
-- Companion to rls_isolation.test.sql (which covers the cross-ORG boundary).
-- This file covers the cross-MEMBER boundary inside a single org, introduced by
-- 20260725110000_agents_owner_scope.sql: every member still reads the whole org's
-- agents (the team dashboard depends on it), but INSERT/UPDATE/DELETE are gated
-- to the owner — plus org admins for owner-less rows, which is the only way an
-- ex-member's orphaned agents stay cleanable.
--
-- Same impersonation caveat as rls_isolation.test.sql: pgTAP runs as the table
-- OWNER, which bypasses RLS, so each assertion sets `role authenticated` and a
-- `request.jwt.claims` `sub` for auth.uid() to read.

begin;
select plan(11);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed here). One org, two members: u1 is its
-- admin, u2 a plain member.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user');

-- One agent per member, plus TWO owner-less agents (the state the membership FK
-- leaves behind when a member is removed): one to prove an admin can delete it,
-- one to prove an admin can adopt it.
insert into public.agents (id, org_id, owner_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'U1 Agent'),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'U2 Agent'),
  ('a0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Orphan To Delete'),
  ('a0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Orphan To Adopt');

-- ---------------------------------------------------------------------------
-- Context: u2, a plain member of the org.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 1. READ stays org-wide: u2 sees every agent of the org, its own included.
--    This is what the team dashboard (loadOrgAgents) reads.
select is(
  (select count(*) from public.agents),
  4::bigint,
  'a member still reads every agent of its org'
);

-- 2. A member cannot UPDATE a teammate's agent. The UPDATE policy filters by
--    USING, so the statement succeeds and touches zero rows (no error).
with upd as (
  update public.agents set name = 'Hijacked'
   where id = 'a0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from upd), 0::bigint, 'a member cannot update a teammate''s agent');

-- 3. A member cannot DELETE a teammate's agent.
with del as (
  delete from public.agents
   where id = 'a0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from del), 0::bigint, 'a member cannot delete a teammate''s agent');

-- 4. …but does own its own agent.
with upd as (
  update public.agents set name = 'U2 Agent Renamed'
   where id = 'a0000000-0000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from upd), 1::bigint, 'a member can update its own agent');

-- 5. Ownership cannot be forged on INSERT: no creating an agent for someone else.
select throws_ok(
  $sql$ insert into public.agents (org_id, owner_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Forged') $sql$,
  '42501',
  'new row violates row-level security policy for table "agents"',
  'a member cannot create an agent owned by a teammate'
);

-- 6. Owner-less agents cannot be created either — every new agent has an owner,
--    so `owner_id is null` can only ever come from the membership FK.
select throws_ok(
  $sql$ insert into public.agents (org_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ownerless') $sql$,
  '42501',
  'new row violates row-level security policy for table "agents"',
  'a member cannot create an owner-less agent'
);

-- 7. Ownership cannot be handed away: USING passes (u2 owns the row) but the
--    WITH CHECK requires the row to still be u2's afterwards → 42501.
select throws_ok(
  $sql$ update public.agents set owner_id = '11111111-1111-1111-1111-111111111111' where id = 'a0000000-0000-0000-0000-000000000002' $sql$,
  '42501',
  'new row violates row-level security policy for table "agents"',
  'a member cannot reassign its own agent to a teammate'
);

-- 8. A NON-admin member gets no write path to orphaned agents.
with del as (
  delete from public.agents
   where id = 'a0000000-0000-0000-0000-000000000003'
  returning 1
)
select is((select count(*) from del), 0::bigint, 'a non-admin member cannot delete an orphaned agent');

-- ---------------------------------------------------------------------------
-- Context: u1, the org admin.
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 9. An admin's extra power is scoped to orphans only — a teammate's agent stays
--    off limits even to them.
with del as (
  delete from public.agents
   where id = 'a0000000-0000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from del), 0::bigint, 'an admin cannot delete a member''s agent');

-- 10. An admin CAN delete an orphaned agent (the cleanup path).
with del as (
  delete from public.agents
   where id = 'a0000000-0000-0000-0000-000000000003'
  returning 1
)
select is((select count(*) from del), 1::bigint, 'an admin can delete an orphaned agent');

-- 11. An admin can also ADOPT an orphan (USING: orphan + admin, WITH CHECK: the
--     new owner is the admin itself).
with upd as (
  update public.agents set owner_id = '11111111-1111-1111-1111-111111111111'
   where id = 'a0000000-0000-0000-0000-000000000004'
  returning 1
)
select is((select count(*) from upd), 1::bigint, 'an admin can adopt an orphaned agent');

select * from finish();
rollback;
