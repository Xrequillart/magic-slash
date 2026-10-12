-- pgTAP: a handle is unique across every user, case-insensitively, and the one fact
-- that leaves the table about somebody else's is a boolean.

begin;
select plan(9);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now());

-- Seeded as owner, RLS bypassed. u3 deliberately has NO handle: the unique index must
-- not treat "nobody picked one" as a slot two users contend for.
insert into public.profiles (user_id, name, role, technical_level, username)
values
  ('11111111-1111-1111-1111-111111111111', 'Alice', 'dev', 'expert', 'alice'),
  ('22222222-2222-2222-2222-222222222222', 'Bob', 'product', 'beginner', null),
  ('33333333-3333-3333-3333-333333333333', 'Carol', 'dev', 'expert', null);

-- ---------------------------------------------------------------------------
-- The index: uniqueness is the thing that actually decides
-- ---------------------------------------------------------------------------

-- 1. Two users cannot hold one handle.
select throws_ok(
  $sql$ update public.profiles set username = 'alice' where user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  '23505',
  null,
  'a handle another user holds is refused by the unique index'
);

-- 2. And not by changing the case either, which is the whole reason the index is on
--    lower(username): `Alice` and `alice` addressing two people is a phishing
--    primitive, not a feature.
select throws_ok(
  $sql$ update public.profiles set username = 'ALICE' where user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  '23505',
  null,
  'uniqueness is case-insensitive'
);

-- 3. Two users with no handle at all coexist. A unique index treats NULLs as distinct;
--    `nulls not distinct` would silently allow exactly one user in the whole table to
--    have no handle.
select is(
  (select count(*) from public.profiles where username is null),
  2::bigint,
  'several users may have no handle'
);

-- ---------------------------------------------------------------------------
-- The check constraint: what a handle is allowed to look like
-- ---------------------------------------------------------------------------
-- The twin of USERNAME_PATTERN in desktop/src/username.ts. These are the cases that
-- catch the two spellings drifting apart.

-- 4. Too short.
select throws_ok(
  $sql$ update public.profiles set username = 'ab' where user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  '23514',
  null,
  'a handle under three characters is refused'
);

-- 5. A space, which is what a display name would use.
select throws_ok(
  $sql$ update public.profiles set username = 'jean claude' where user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  '23514',
  null,
  'a handle with a space is refused'
);

-- 6. Opening with a separator, so a handle cannot read as a flag or a dotfile.
select throws_ok(
  $sql$ update public.profiles set username = '.config' where user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  '23514',
  null,
  'a handle opening with a separator is refused'
);

-- ---------------------------------------------------------------------------
-- username_available: the only window through which a handle leaves the table
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 7. u2 cannot READ u1's row — profiles_select is own-rows only and stays that way.
--    This is what makes the function necessary rather than a convenience.
select is(
  (select count(*) from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'a user still cannot read another user profile'
);

-- 8. …but can be told that the handle is taken, without learning whose.
select is(
  public.username_available('alice'),
  false,
  'a handle another user holds reports as unavailable'
);

select is(
  public.username_available('bob'),
  true,
  'an unheld handle reports as available'
);

select * from finish();
rollback;
