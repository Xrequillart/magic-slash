-- pgTAP: push_devices is strictly the owner's, row by row.
--
-- Covers 20261014090000_push_devices.sql. `/api/push` reads and deletes these rows with the
-- caller's JWT and no service role, so these policies are the whole authorization of a push:
-- a row a colleague could read is a phone they could wake, and a row they could delete is a
-- phone they could silence.
--
-- The assertions that matter most are #8-12: an org colleague sees nothing, cannot file a
-- row in the owner's name, and cannot change or delete the owner's row. Membership of the
-- same org is set up on purpose — it is what opens `plan:` and must open nothing here.
--
-- Harness: see plan_comments.test.sql. Not run by CI (no pgTAP there): replay by hand
-- before touching these policies.

begin;
select plan(15);

-- u1 and u2 share Org A; u1 owns the couple under test.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user');

-- 1. RLS is on: without it every policy below would be decoration.
select is(
  (select relrowsecurity from pg_class where oid = 'public.push_devices'::regclass),
  true,
  'push_devices has row level security enabled'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 2. The owner files a row for a couple; user_id defaults to the caller, as the phone sends it.
select lives_ok(
  $sql$ insert into public.push_devices (phone_id, mac_id, apns_token, environment)
        values ('99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                repeat('ab', 32), 'sandbox') $sql$,
  'the owner may file a row for their couple'
);

-- 3. ...and reads it back, toggles on by default.
select is(
  (select (user_id, notify_waiting, notify_completed)::text from public.push_devices
    where phone_id = '99999999-9999-9999-9999-999999999999'),
  '(11111111-1111-1111-1111-111111111111,t,t)',
  'the owner reads their row, owned by them, both kinds on by default'
);

-- 4. Upper-case ids name the same couple: the columns are uuids.
select is(
  (select count(*)::int from public.push_devices
    where phone_id = '99999999-9999-9999-9999-999999999999'::uuid
      and mac_id = 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC'::uuid),
  1,
  'the case of an id decides nothing'
);

-- 5. The owner updates their toggles.
update public.push_devices set notify_waiting = false
  where phone_id = '99999999-9999-9999-9999-999999999999';
select is(
  (select notify_waiting from public.push_devices where phone_id = '99999999-9999-9999-9999-999999999999'),
  false,
  'the owner may update their toggles'
);

-- 6-7. The checks: an environment APNs does not have, and a token that is not hex.
select throws_ok(
  $sql$ update public.push_devices set environment = 'staging'
        where phone_id = '99999999-9999-9999-9999-999999999999' $sql$,
  '23514',
  null,
  'an unknown environment is rejected'
);
select throws_ok(
  $sql$ update public.push_devices set apns_token = 'not/a/token'
        where phone_id = '99999999-9999-9999-9999-999999999999' $sql$,
  '23514',
  null,
  'a token that is not hex is rejected'
);

-- 8. *** An org colleague sees nothing of it. ***
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(
  (select count(*)::int from public.push_devices),
  0,
  'a colleague of the same org cannot see another user''s rows'
);

-- 9. *** ...cannot file a row in the owner's name... ***
select throws_ok(
  $sql$ insert into public.push_devices (user_id, phone_id, mac_id, apns_token, environment)
        values ('11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888',
                'cccccccc-cccc-cccc-cccc-cccccccccccc', repeat('cd', 32), 'production') $sql$,
  '42501',
  null,
  'a colleague cannot file a row for someone else'
);

-- 10. *** ...cannot repoint the owner's token... ***
update public.push_devices set apns_token = repeat('ef', 32)
  where phone_id = '99999999-9999-9999-9999-999999999999';
-- 11. *** ...nor delete the owner's row. ***
delete from public.push_devices where phone_id = '99999999-9999-9999-9999-999999999999';

reset role;
select is(
  (select apns_token from public.push_devices where phone_id = '99999999-9999-9999-9999-999999999999'),
  repeat('ab', 32),
  'a colleague cannot update another user''s row'
);
select is(
  (select count(*)::int from public.push_devices where phone_id = '99999999-9999-9999-9999-999999999999'),
  1,
  'a colleague cannot delete another user''s row'
);

-- 12. *** Nor take it over by rewriting user_id on a row of their own. ***
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
insert into public.push_devices (phone_id, mac_id, apns_token, environment)
values ('77777777-7777-7777-7777-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd', repeat('12', 32), 'production');
select throws_ok(
  $sql$ update public.push_devices set user_id = '11111111-1111-1111-1111-111111111111'
        where phone_id = '77777777-7777-7777-7777-777777777777' $sql$,
  '42501',
  null,
  'a user cannot hand their row to someone else'
);

-- 13. The colleague still sees their own row only.
select is(
  (select count(*)::int from public.push_devices),
  1,
  'a colleague sees their own row and only that'
);

-- 14. The owner deletes their row (forget, sign-out, revocation).
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
delete from public.push_devices where phone_id = '99999999-9999-9999-9999-999999999999';
reset role;
select is(
  (select count(*)::int from public.push_devices where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'the owner may delete their row'
);

-- 15. Deleting the account takes its rows with it.
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.push_devices),
  0,
  'an account deletion cascades to its rows'
);

select * from finish();
rollback;
