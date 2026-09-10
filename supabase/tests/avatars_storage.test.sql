-- pgTAP: avatars are strictly private — a user reads/writes only objects inside
-- their own `<uid>/` folder of the `avatars` bucket (acceptance criterion 7) — and
-- writes are pinned tighter still, to the one key `<uid>/avatar.webp`, so the bucket
-- cannot grow a second object per user.
--
-- Same impersonation trick as profiles.test.sql: pgTAP runs as the table owner, which
-- BYPASSES RLS, so every assertion sets `role authenticated` plus a
-- `request.jwt.claims` `sub` to make `auth.uid()` return a specific user and actually
-- exercise the avatars_* policies. `reset role;` goes back to seeding/reading raw.
--
-- Note: seeding a `storage.objects` row needs the `avatars` bucket row to exist —
-- objects_bucketId_fkey points at `storage.buckets`. That row is created by
-- 20260910090100_avatars_storage.sql, so this file only passes against a database
-- where that migration has been applied: run `supabase db reset` before
-- `supabase test db` the first time.

begin;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

-- u1 has an avatar at the one path the app ever writes. Seeded as owner (RLS
-- bypassed), the way the Storage API would have left it.
insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
values (
  'avatars',
  '11111111-1111-1111-1111-111111111111/avatar.webp',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"size": 1234, "mimetype": "image/webp"}'::jsonb
);

-- ---------------------------------------------------------------------------
-- As u2 — someone else's avatar must be neither readable nor writable.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 1. u1's object is invisible: the whole bucket reads as empty for u2.
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'),
  0::bigint,
  'a user cannot see another user avatar object'
);

-- 2. u2 cannot forge an object inside u1's folder (WITH CHECK on the path). This
--    is the write half of criterion 7: without it, overwriting someone else's face
--    would be a one-line upload.
--    Asserted on the SQLSTATE alone: 42501 IS the contract (insufficient
--    privilege), while the sentence Postgres wraps it in is version-sensitive
--    wording we do not control. Same `null` errmsg form as skill_invocations /
--    user_settings.
select throws_ok(
  $sql$ insert into storage.objects (bucket_id, name)
        values ('avatars', '11111111-1111-1111-1111-111111111111/avatar.webp') $sql$,
  '42501',
  null,
  'a user cannot write into another user avatar folder'
);

-- 3. u2 CAN write inside their own folder, at the blessed key. Without this the
--    suite would also pass with policies that simply deny everyone.
select lives_ok(
  $sql$ insert into storage.objects (bucket_id, name)
        values ('avatars', '22222222-2222-2222-2222-222222222222/avatar.webp') $sql$,
  'a user can write their own avatar object'
);

-- 4. ...and ONLY at that key. A second, differently named object in u2's OWN folder
--    is refused: the insert policy pins the whole name, not just the first path
--    segment. This is what bounds the bucket — a folder-only test would let a client
--    talk to Storage directly and pile up `<uid>/1.webp`, `<uid>/2.webp`, ..., each
--    one legal, with no per-user quota anywhere to stop it.
select throws_ok(
  $sql$ insert into storage.objects (bucket_id, name)
        values ('avatars', '22222222-2222-2222-2222-222222222222/1.webp') $sql$,
  '42501',
  null,
  'a user cannot write a second object name in their own avatar folder'
);

-- ---------------------------------------------------------------------------
-- As u1 — the owner still sees their own object, and only their own.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 5. Exactly one row: u1's own. u2's object, inserted above, is not among them.
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'),
  1::bigint,
  'a user sees their own avatar object and no other'
);

-- 6. And it is the expected path, not an accident of the count.
select is(
  (select name from storage.objects where bucket_id = 'avatars'),
  '11111111-1111-1111-1111-111111111111/avatar.webp',
  'a user reads their own avatar object at <uid>/avatar.webp'
);

select * from finish();
rollback;
