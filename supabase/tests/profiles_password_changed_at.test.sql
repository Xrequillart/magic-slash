-- pgTAP: the password date is an ordinary own-rows column, and it starts out unknown.

begin;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.profiles (user_id, name, role, technical_level)
values
  ('11111111-1111-1111-1111-111111111111', 'Alice', 'dev', 'expert'),
  ('22222222-2222-2222-2222-222222222222', 'Bob', 'product', 'beginner');

-- 1. A row that predates the app ever stamping one is NULL, and NULL is the state the
--    whole feature is honest about: it means no change was RECORDED, never that the
--    password has not changed. There is no default and no backfill precisely so that
--    nothing can mistake a computed date for an observed one.
select is(
  (select password_changed_at from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  null,
  'a profile starts with no recorded password change'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 2. u1 stamps their own row.
update public.profiles
  set password_changed_at = '2026-09-16T10:00:00Z'
  where user_id = '11111111-1111-1111-1111-111111111111';

reset role;
select is(
  (select password_changed_at from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  '2026-09-16T10:00:00Z'::timestamptz,
  'a user can record their own password change'
);

-- 3. Writing that column touches nothing else. The app writes it with an UPSERT that
--    names two columns, and the trap that type guards against in TypeScript is the same
--    one here: a write that carried the whole profile would blank what it did not know.
select is(
  (select name from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'Alice',
  'stamping the password date leaves the rest of the profile alone'
);

-- 4. u1 cannot stamp u2's row: profiles_update is `user_id = auth.uid()`, so the
--    statement matches nothing rather than raising.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.profiles
  set password_changed_at = now()
  where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
select is(
  (select password_changed_at from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  null,
  'a user cannot record a password change for someone else'
);

-- 5. Nothing authorizes on this column, so it needs no definer function and no widened
--    policy: it is readable exactly where the rest of the profile is, and nowhere else.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(
  (select count(*) from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'a user cannot read another user password date'
);

select * from finish();
rollback;
