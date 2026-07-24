-- pgTAP: profiles are strictly private — a user reads/writes only their own row.

begin;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

-- Seed one profile per user (as owner, RLS bypassed).
insert into public.profiles (user_id, name, role, technical_level)
values
  ('11111111-1111-1111-1111-111111111111', 'Alice', 'dev', 'expert'),
  ('22222222-2222-2222-2222-222222222222', 'Bob', 'product', 'beginner');

-- ---------------------------------------------------------------------------
-- As u1
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 1. u1 sees only its own profile.
select is((select count(*) from public.profiles), 1::bigint, 'u1 sees only its own profile');
select is((select name from public.profiles), 'Alice', 'u1 reads its own profile');

-- 2. u1 can update its own profile.
update public.profiles set role = 'manager' where user_id = '11111111-1111-1111-1111-111111111111';
reset role;
select is(
  (select role from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'manager',
  'u1 can update its own profile'
);

-- 3. u1 cannot forge a profile for another user (WITH CHECK user_id = auth.uid()).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.profiles (user_id, name) values ('22222222-2222-2222-2222-222222222222', 'Hijack') $sql$,
  '42501',
  'new row violates row-level security policy for table "profiles"',
  'a user cannot create a profile for someone else'
);

-- 4. u2's profile is invisible to u1 (already covered by count above, assert directly).
select is(
  (select count(*) from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'a user cannot see another user profile'
);

select * from finish();
rollback;
