-- pgTAP: prove the org member-management RPCs, the last-admin lockout guard, and
-- archiving behave correctly and keep RLS isolation intact.
--
-- Like the other suites, we impersonate authenticated end users per assertion:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>"}';
-- auth.uid() reads the "sub" claim. The RPCs are SECURITY DEFINER: they run as
-- the owner but read auth.uid() from these claims. We `reset role;` to seed data
-- and to read results back bypassing RLS.

begin;
select plan(15);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   Org One (aaaa): u1 admin, u2 admin, u3 user — a second admin is present, so
--                   removals/demotions/leaves succeed here.
--   Org Two (bbbb): u4 SOLE admin, u5 user — used to prove the last-admin guard.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'u5@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', '44444444-4444-4444-4444-444444444444');

-- created_at values are staggered so list_org_members / promotion ordering is
-- deterministic.
insert into public.memberships (org_id, user_id, role, created_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin', now() - interval '3 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin', now() - interval '2 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user',  now() - interval '1 day'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'admin', now() - interval '2 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'user',  now() - interval '1 day');

-- ===========================================================================
-- Last-admin lockout guard (Org Two: u4 is the sole admin, u5 is a member).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';

-- 1. The sole admin cannot be removed (remove_member) while other members remain.
select throws_ok(
  $sql$ select public.remove_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444') $sql$,
  'cannot remove or demote the last admin while other members remain',
  'remove_member is blocked for the last admin'
);

-- 2. The sole admin cannot be demoted (update_member_role) while members remain.
select throws_ok(
  $sql$ select public.update_member_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'user') $sql$,
  'cannot remove or demote the last admin while other members remain',
  'update_member_role is blocked for the last admin'
);

-- 3. The sole admin cannot leave (leave_organization) while members remain.
select throws_ok(
  $sql$ select public.leave_organization('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $sql$,
  'cannot remove or demote the last admin while other members remain',
  'leave_organization is blocked for the last admin'
);

-- ===========================================================================
-- Successful management with a second admin present (Org One).
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';  -- u1, admin

-- 4. An admin removes a member.
select lives_ok(
  $sql$ select public.remove_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333') $sql$,
  'remove_member succeeds when another admin remains'
);

-- 5. The removed member is gone.
reset role;
select is(
  (select count(*) from public.memberships
   where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and user_id = '33333333-3333-3333-3333-333333333333'),
  0::bigint,
  'remove_member deletes the membership'
);

-- 6. An admin demotes the OTHER admin (u1 still admin, so no lockout).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $sql$ select public.update_member_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user') $sql$,
  'update_member_role succeeds when another admin remains'
);

-- 7. The demoted member's role is now 'user'.
reset role;
select is(
  (select role::text from public.memberships
   where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and user_id = '22222222-2222-2222-2222-222222222222'),
  'user',
  'update_member_role changes the role'
);

-- 8. A member leaves the org (u2, now a plain user; u1 remains admin).
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select lives_ok(
  $sql$ select public.leave_organization('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'leave_organization succeeds for a non-last-admin member'
);

-- 9. That membership is gone.
reset role;
select is(
  (select count(*) from public.memberships
   where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'leave_organization deletes the caller membership'
);

-- ===========================================================================
-- RLS isolation: a non-member of Org Two cannot manage it or read its members.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';  -- u1: NOT a member of Org Two

-- 10. A non-admin (here a non-member) cannot remove members from another org.
select throws_ok(
  $sql$ select public.remove_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555') $sql$,
  'not an admin of this organization',
  'remove_member rejects a non-admin of the org'
);

-- 11. A non-member cannot list another org's members.
select throws_ok(
  $sql$ select public.list_org_members('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $sql$,
  'not a member of this organization',
  'list_org_members rejects a non-member'
);

-- ===========================================================================
-- list_org_members exposes emails to members (safe member-email exposure).
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';  -- u4, member of Org Two

-- 12. A member sees other members' emails (which raw RLS never exposes).
select is(
  (select email from public.list_org_members('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
   where user_id = '55555555-5555-5555-5555-555555555555'),
  'u5@example.com',
  'list_org_members returns member emails to a member'
);

-- ===========================================================================
-- Archiving (Org Two).
-- ===========================================================================

-- 13. A non-admin member cannot archive the org.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';  -- u5, plain member
select throws_ok(
  $sql$ select public.archive_organization('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $sql$,
  'not an admin of this organization',
  'archive_organization rejects a non-admin'
);

-- 14. The admin archives the org (soft-delete: archived_at is set, row kept).
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';  -- u4, admin
select public.archive_organization('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

reset role;  -- read back as owner (bypass RLS)
select ok(
  (select archived_at is not null from public.organizations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'archive_organization sets archived_at (row is retained, not deleted)'
);

-- 15. The archived org drops out of the member read path: is_org_member is now
--     false for a member of the archived org.
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select ok(
  not public.is_org_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'an archived org is filtered out of the member read path'
);

select * from finish();
rollback;
