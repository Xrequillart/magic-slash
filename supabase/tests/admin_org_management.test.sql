-- pgTAP: admin org management — the back-office's first write surface.
--
-- Covers 20260729120000_admin_org_management.sql: two reads
-- (admin_list_org_members, admin_list_org_invitations) and three writes
-- (admin_set_membership_role, admin_set_org_archived, admin_revoke_invitation).
--
-- The suite is organised around what would actually go wrong:
--
--   1. Both guards on all five functions, in the order each runs them. Ten
--      assertions that look repetitive and are not: a write reachable by a
--      non-admin is a privilege escalation, and the gate is per-function.
--   2. The GRANT layer, asserted through has_function_privilege rather than by
--      attempting a call — a throwing statement proves only that SOMETHING
--      refused, while the privilege is the layer no policy can re-open.
--   3. THE INVITATION TOKEN IS NOT IN THE RETURN TYPE. Asserted against
--      pg_get_function_result, so it fails if anyone ever adds the column back.
--      A token is a bearer credential for org membership; a back-office that
--      printed one would be handing out tenant access.
--   4. The last-admin invariant still holds through the new write path. The
--      trigger, not this function, is what enforces it, so the test proves the
--      trigger is actually reached rather than bypassed by SECURITY DEFINER.
--   5. Restore — the capability this migration adds that no org admin has —
--      really clears archived_at, and both directions are idempotent.
--   6. Revoking a pending invite flips it to 'revoked' AND drops it out of
--      admin_list_orgs' pending count, which is the fact that makes the token in
--      the invitee's mailbox stop working.
--
-- Same impersonation caveat as every other suite: pgTAP runs as the table OWNER,
-- which BYPASSES RLS, so seeding happens as the owner and each assertion sets
-- `role authenticated` + a `request.jwt.claims` sub so auth.uid() resolves.

begin;
select plan(45);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 (1111) — the platform admin, member of nothing.
--   u2 (2222) — creator and SOLE admin of Org Full. Has a profile.
--   u3 (3333) — ordinary member of Org Full. NO profile row: the LEFT JOIN
--               canary, and the shape of an invitee who never opened the app.
--
--   Org Full  (aaaa) — u2 admin + u3 user; 2 pending invites, 1 accepted,
--                      1 revoked. Sole-admin-with-other-members is exactly the
--                      shape the last-admin trigger guards.
--   Org Empty (bbbb) — live, nothing attached. Archived by assertion 34.
--   Org Gone  (cccc) — already archived. Restored by assertion 35.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now() - interval '3 days', now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now() - interval '2 days', now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now() - interval '1 day', now());

insert into public.platform_admins (user_id)
values ('11111111-1111-1111-1111-111111111111');

-- u2 only. u3's absence is asserted at 26.
insert into public.profiles (user_id, name)
values ('22222222-2222-2222-2222-222222222222', 'Deux Dupont');

insert into public.organizations (id, name, created_by, created_at, archived_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org Full',  '22222222-2222-2222-2222-222222222222', now() - interval '3 days', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Empty', '22222222-2222-2222-2222-222222222222', now() - interval '2 days', null),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org Gone',  null,                                   now() - interval '1 day',  now());

-- created_at set explicitly: admin_list_org_members orders on it after the
-- admin-first predicate, and assertion 23 reads the first row positionally.
insert into public.memberships (org_id, user_id, role, created_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin', now() - interval '3 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user',  now() - interval '2 days');

-- Fixed ids so the write assertions can target one invitation precisely.
-- created_at is explicit because the function orders by it descending (28).
insert into public.invitations (id, org_id, email, role, status, invited_by, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1@example.com', 'user',  'pending',  '22222222-2222-2222-2222-222222222222', now() - interval '4 hours'),
  ('d0000000-0000-0000-0000-00000000000e', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p2@example.com', 'admin', 'pending',  '22222222-2222-2222-2222-222222222222', now() - interval '3 hours'),
  ('d0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1@example.com', 'user',  'accepted', '22222222-2222-2222-2222-222222222222', now() - interval '2 hours'),
  ('d0000000-0000-0000-0000-00000000000c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r1@example.com', 'user',  'revoked',  '22222222-2222-2222-2222-222222222222', now() - interval '1 hour');

-- ===========================================================================
-- 1..10. Both guards on all five functions.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

select throws_ok(
  $sql$ select public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'not a platform admin',
  'admin_list_org_members rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_list_org_invitations('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'not a platform admin',
  'admin_list_org_invitations rejects a non-admin'
);

-- u2 IS an admin of Org Full, so this proves the gate is is_platform_admin and
-- not is_org_admin: being the org's own admin must not open the back-office RPC.
select throws_ok(
  $sql$ select public.admin_set_membership_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin') $sql$,
  'not a platform admin',
  'admin_set_membership_role rejects a non-admin, even the org''s own admin'
);

select throws_ok(
  $sql$ select public.admin_set_org_archived('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true) $sql$,
  'not a platform admin',
  'admin_set_org_archived rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_revoke_invitation('d0000000-0000-0000-0000-00000000000e') $sql$,
  'not a platform admin',
  'admin_revoke_invitation rejects a non-admin'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'admin_list_org_members requires an authenticated user',
  'admin_list_org_members rejects a caller with no session'
);

select throws_ok(
  $sql$ select public.admin_list_org_invitations('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'admin_list_org_invitations requires an authenticated user',
  'admin_list_org_invitations rejects a caller with no session'
);

select throws_ok(
  $sql$ select public.admin_set_membership_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin') $sql$,
  'admin_set_membership_role requires an authenticated user',
  'admin_set_membership_role rejects a caller with no session'
);

select throws_ok(
  $sql$ select public.admin_set_org_archived('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true) $sql$,
  'admin_set_org_archived requires an authenticated user',
  'admin_set_org_archived rejects a caller with no session'
);

select throws_ok(
  $sql$ select public.admin_revoke_invitation('d0000000-0000-0000-0000-00000000000e') $sql$,
  'admin_revoke_invitation requires an authenticated user',
  'admin_revoke_invitation rejects a caller with no session'
);

-- ===========================================================================
-- 11..20. The GRANT layer. Read back as the owner: querying another role's
-- privileges requires membership in it.
-- ===========================================================================
reset role;

select ok(
  not has_function_privilege('anon', 'public.admin_list_org_members(uuid)', 'execute'),
  'anon cannot execute admin_list_org_members'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_list_org_members(uuid)', 'execute'),
  'authenticated can execute admin_list_org_members'
);

select ok(
  not has_function_privilege('anon', 'public.admin_list_org_invitations(uuid)', 'execute'),
  'anon cannot execute admin_list_org_invitations'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_list_org_invitations(uuid)', 'execute'),
  'authenticated can execute admin_list_org_invitations'
);

select ok(
  not has_function_privilege('anon', 'public.admin_set_membership_role(uuid, uuid, public.membership_role)', 'execute'),
  'anon cannot execute admin_set_membership_role'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_set_membership_role(uuid, uuid, public.membership_role)', 'execute'),
  'authenticated can execute admin_set_membership_role'
);

select ok(
  not has_function_privilege('anon', 'public.admin_set_org_archived(uuid, boolean)', 'execute'),
  'anon cannot execute admin_set_org_archived'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_set_org_archived(uuid, boolean)', 'execute'),
  'authenticated can execute admin_set_org_archived'
);

select ok(
  not has_function_privilege('anon', 'public.admin_revoke_invitation(uuid)', 'execute'),
  'anon cannot execute admin_revoke_invitation'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_revoke_invitation(uuid)', 'execute'),
  'authenticated can execute admin_revoke_invitation'
);

-- ===========================================================================
-- 21. The token stays out of the return type. Structural, so it survives any
--     rewrite of the function body — and fails loudly if the column is re-added.
-- ===========================================================================
select ok(
  pg_get_function_result(
    'public.admin_list_org_invitations(uuid)'::regprocedure
  ) not like '%token%',
  'admin_list_org_invitations does not return the invitation token'
);

-- ===========================================================================
-- 22..30. The two reads, as the platform admin.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select is(
  (select count(*) from public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  2::bigint,
  'admin_list_org_members returns every member of the org'
);

-- The admin comes first even though u3 has the LATER created_at, so the sort is
-- the admin predicate and not the timestamp alone.
select is(
  (select email from public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') offset 0 limit 1),
  'u2@example.com',
  'admins are listed before ordinary members'
);

select is(
  (select role::text from public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') offset 0 limit 1),
  'admin',
  'the role comes back for each member'
);

select is(
  (select name from public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where email = 'u2@example.com'),
  'Deux Dupont',
  'the profile name is resolved when there is a profile'
);

-- The canary: a member with no profile row must still appear, with a null name.
select is(
  (select name from public.admin_list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where email = 'u3@example.com'),
  null,
  'a member with no profile still comes back, with a null name'
);

select is(
  (select count(*) from public.admin_list_org_invitations('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  4::bigint,
  'admin_list_org_invitations returns every invitation whatever its status'
);

select is(
  (select email from public.admin_list_org_invitations('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') offset 0 limit 1),
  'r1@example.com',
  'invitations come back newest first'
);

select is(
  (select invited_by_email from public.admin_list_org_invitations('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where email = 'p1@example.com'),
  'u2@example.com',
  'the inviter''s email is resolved through auth.users'
);

-- Raw, not derived: the expired-at-read-time rule lives in the client.
select is(
  (select status::text from public.admin_list_org_invitations('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where email = 'p1@example.com'),
  'pending',
  'the stored status is returned raw'
);

-- ===========================================================================
-- 31..34. admin_set_membership_role.
--
-- The demotion test runs FIRST, while u2 is still the sole admin — promoting u3
-- beforehand would give the org a second admin and the trigger would have
-- nothing to refuse.
-- ===========================================================================
select throws_ok(
  $sql$ select public.admin_set_membership_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user') $sql$,
  'cannot remove or demote the last admin while other members remain',
  'the last-admin trigger still fires through the platform-admin write path'
);

select lives_ok(
  $sql$ select public.admin_set_membership_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin') $sql$,
  'a platform admin can promote a member of an org they do not belong to'
);

-- Read back as the OWNER, not as the caller. RLS applies to `authenticated`, and
-- a platform admin is a member of none of these orgs — so a direct table SELECT
-- as that role correctly returns nothing. Which is the point worth stating: the
-- operator holds no table privileges at all, and every one of these writes lands
-- only because the function is SECURITY DEFINER. Asserting through the caller's
-- own visibility would test RLS, not the write.
reset role;

select is(
  (select role::text from public.memberships where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '33333333-3333-3333-3333-333333333333'),
  'admin',
  'the promotion is persisted'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $sql$ select public.admin_set_membership_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'admin') $sql$,
  'no such membership in this organization',
  'setting a role on a membership that does not exist raises rather than passing quietly'
);

-- ===========================================================================
-- 35..41. admin_set_org_archived, including the restore this migration adds.
--
-- Each step is its own statement: calling the function from inside a WHERE
-- clause would leave the read and the write in one query, whose evaluation order
-- Postgres does not guarantee.
-- ===========================================================================
select lives_ok(
  $sql$ select public.admin_set_org_archived('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true) $sql$,
  'a live org can be archived'
);

reset role;

select isnt(
  (select archived_at from public.organizations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  null,
  'archiving sets archived_at'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select lives_ok(
  $sql$ select public.admin_set_org_archived('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true) $sql$,
  're-archiving an archived org is a no-op rather than an error'
);

-- The capability this migration adds: no org admin can do this.
select lives_ok(
  $sql$ select public.admin_set_org_archived('cccccccc-cccc-cccc-cccc-cccccccccccc', false) $sql$,
  'an archived org can be restored'
);

reset role;

select is(
  (select archived_at from public.organizations where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  null,
  'restoring clears archived_at'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select lives_ok(
  $sql$ select public.admin_set_org_archived('cccccccc-cccc-cccc-cccc-cccccccccccc', false) $sql$,
  'restoring an already-live org is a no-op rather than an error'
);

select throws_ok(
  $sql$ select public.admin_set_org_archived('99999999-9999-9999-9999-999999999999', true) $sql$,
  'no such organization',
  'archiving an org that does not exist raises'
);

-- ===========================================================================
-- 42..45. admin_revoke_invitation.
-- ===========================================================================
select lives_ok(
  $sql$ select public.admin_revoke_invitation('d0000000-0000-0000-0000-00000000000e') $sql$,
  'a pending invitation can be revoked'
);

reset role;

select is(
  (select status::text from public.invitations where id = 'd0000000-0000-0000-0000-00000000000e'),
  'revoked',
  'revoking flips the status rather than deleting the row'
);

-- Back to the operator: the pending count below comes from an RPC, which is
-- gated on is_platform_admin() and would refuse the owner's empty jwt claims.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- The fact that makes the token stop working: accept_invitation requires
-- 'pending', and admin_list_orgs counts only 'pending'. Org Full started with 2.
select is(
  (select pending_invitation_count from public.admin_list_orgs() where name = 'Org Full'),
  1::bigint,
  'a revoked invitation drops out of the pending count'
);

select throws_ok(
  $sql$ select public.admin_revoke_invitation('d0000000-0000-0000-0000-00000000000a') $sql$,
  'only a pending invitation can be revoked (this one is accepted)',
  'revoking an accepted invitation raises rather than reporting success'
);

select * from finish();
rollback;
