-- pgTAP: prove delete_account() removes the caller's account + personal data
-- WITHOUT destroying shared orgs that still have other members.
--
-- Like accept_invitation.test.sql, we impersonate an authenticated end user with
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>","email":"<email>"}';
-- delete_account is SECURITY DEFINER: it runs as the owner (so it can delete from
-- auth.users) but reads auth.uid() from the claims above. We `reset role;` to
-- seed data and to read results back bypassing RLS.

begin;
select plan(12);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 = the account we delete. Creator/admin of Org Shared (has u2 too) AND of
--        Org Solo (only u1), plus a member of Org Two (created by u2).
--   u2 = creator/admin of Org Two AND a member of Org Shared. Must survive with
--        all data intact, and must inherit ownership of Org Shared.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

-- Org Shared: created by u1, but u2 is also a member. Must survive u1's deletion.
insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org Shared', '11111111-1111-1111-1111-111111111111');

-- Org Solo: created by u1, no other members. Must be deleted (PII in its name).
insert into public.organizations (id, name, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org Solo', '11111111-1111-1111-1111-111111111111');

-- Org Two: created by u2, u1 is a plain member. Must survive; u1 detached.
insert into public.organizations (id, name, created_by)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', '22222222-2222-2222-2222-222222222222');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'user');

-- u1 has a config in each org they touch; u2 has a config in Org Shared.
insert into public.configs (org_id, user_id, data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '{}'::jsonb),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '{}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '{}'::jsonb),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '{}'::jsonb);

-- An invitation in Org Two whose invited_by = u1. Org Two survives, so the row
-- must remain but its invited_by must be nulled (not block the delete).
insert into public.invitations (org_id, email, role, token, status, invited_by)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'newbie@example.com', 'user', 'tok-inv', 'pending', '11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Act: authenticate as u1 and delete the account.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"u1@example.com"}';

select lives_ok(
  $sql$ select public.delete_account() $sql$,
  'delete_account runs for the authenticated caller'
);

-- Read results back as owner (bypass RLS).
reset role;

-- 1. The auth.users row for u1 is gone.
select is(
  (select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'delete_account removes the auth.users row'
);

-- 2. u2's account still exists.
select is(
  (select count(*) from auth.users where id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'delete_account leaves other accounts intact'
);

-- 3. u1 has no memberships left anywhere.
select is(
  (select count(*) from public.memberships where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'delete_account removes all of the caller memberships'
);

-- 4. u1 has no configs left anywhere (all cascaded on the auth.users delete).
select is(
  (select count(*) from public.configs where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'delete_account removes all of the caller configs'
);

-- 5. Org Solo (created by u1, no other members) is gone entirely.
select is(
  (select count(*) from public.organizations where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  0::bigint,
  'delete_account deletes a solo org the caller created'
);

-- 6. Org Shared (created by u1 but with u2) SURVIVES — not deleted.
select is(
  (select count(*) from public.organizations where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'delete_account keeps a shared org the caller created'
);

-- 7. Ownership of the shared org was handed off to the surviving member u2.
select is(
  (select created_by from public.organizations where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'delete_account reassigns created_by of a shared org to another member'
);

-- 8. u2's membership in the shared org is intact.
select is(
  (select count(*) from public.memberships
   where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'delete_account preserves other members of a shared org'
);

-- 9. u2's config in the shared org is intact (not cascaded away).
select is(
  (select count(*) from public.configs
   where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'delete_account preserves other members data in a shared org'
);

-- 10. Org Two (created by u2) survives, with u2's membership intact.
select is(
  (select count(*) from public.memberships
   where org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     and user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'delete_account leaves orgs the caller did not create intact'
);

-- 11. The invitation in the surviving org keeps its row but its invited_by is nulled.
select is(
  (select invited_by from public.invitations where token = 'tok-inv'),
  null,
  'delete_account nulls invited_by on surviving invitations'
);

select * from finish();
rollback;
