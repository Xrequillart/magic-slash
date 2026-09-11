-- pgTAP: a face is readable by the team, and by nobody else.
--
-- The companion to avatars_storage.test.sql, which proves the strict own-folder rules
-- 20260910090100 laid down. This one covers what 20260911090000 widened and — more to
-- the point — what it did NOT: the read opens to co-members and stops at the one
-- blessed key, while writes and deletes stay exactly as private as they were.
--
-- Same impersonation trick as every other suite here: pgTAP runs as the table owner,
-- which BYPASSES RLS, so each assertion sets `role authenticated` plus a
-- `request.jwt.claims` `sub` to make `auth.uid()` return a specific user and actually
-- exercise the policies. `reset role;` goes back to seeding and reading raw.
--
-- Needs the `avatars` bucket row to exist (objects_bucketId_fkey), created by
-- 20260910090100: run `supabase db reset` before `supabase test db` the first time.

begin;
select plan(11);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   Org A (aaaa), live:     u1 (admin, has a photo) + u2 (user, no profile row at all)
--   Org B (bbbb), live:     u3 alone — shares nothing with anyone
--   Org C (cccc), ARCHIVED: u1 + u4 — a membership that must not grant a thing
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now());

insert into public.organizations (id, name, created_by, archived_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '33333333-3333-3333-3333-333333333333', null),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org C', '11111111-1111-1111-1111-111111111111', now());

insert into public.memberships (org_id, user_id, role, created_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin', now() - interval '2 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user',  now() - interval '1 day'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'admin', now() - interval '2 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'admin', now() - interval '2 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'user',  now() - interval '1 day');

-- u1 has the blessed object AND a stray. The stray is the point of assertion 2: it is
-- what an object written before the writes were pinned looks like, and a teammate must
-- not be able to read it.
insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
values
  ('avatars', '11111111-1111-1111-1111-111111111111/avatar.webp',
   '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"size": 1234, "mimetype": "image/webp"}'::jsonb),
  ('avatars', '11111111-1111-1111-1111-111111111111/legacy.png',
   '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"size": 4321, "mimetype": "image/png"}'::jsonb);

-- The pointer. u2 deliberately gets NO profiles row — assertion 9 is that the roster
-- still lists them, which is the left join in list_org_members.
insert into public.profiles (user_id, avatar_url)
values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/avatar.webp');

-- ===========================================================================
-- As u2 — a co-member of u1 in a live org.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 1. Exactly one object is visible: u1's photo. Not two — the stray is excluded — and
--    not zero, which is what the policy did before this change.
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'),
  1::bigint,
  'a co-member sees exactly one object of a teammate'
);

-- 2. ...and it is the blessed key, not an accident of the count. This is the whole
--    asymmetry of the new policy: the folder is not opened, one name in it is.
select is(
  (select name from storage.objects where bucket_id = 'avatars'),
  '11111111-1111-1111-1111-111111111111/avatar.webp',
  'a co-member reads the blessed key only, never a stray in the same folder'
);

-- 3. The roster carries the pointer, so a client knows to fetch the bytes at all.
select is(
  (select avatar_url from public.list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
   where email = 'u1@example.com'),
  '11111111-1111-1111-1111-111111111111/avatar.webp',
  'list_org_members hands a member the avatar path of a teammate'
);

-- 4. A member with no profiles row at all is still listed, with a null path. The left
--    join: an invitee who accepted but never opened the Profile tab must not vanish
--    from the roster just because they have no photo.
select ok(
  (select avatar_url is null from public.list_org_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
   where email = 'u2@example.com'),
  'a member with no profile row is listed with no avatar path'
);

-- 5. Reading is all that opened. The update matches no row the USING clause admits,
--    so the metadata is untouched — asserted on the surviving value rather than on an
--    error, because RLS filters an UPDATE silently instead of raising.
update storage.objects
set metadata = '{"size": 9, "mimetype": "image/webp"}'::jsonb
where bucket_id = 'avatars'
  and name = '11111111-1111-1111-1111-111111111111/avatar.webp';

reset role;
select is(
  (select (metadata->>'size')::int from storage.objects
   where name = '11111111-1111-1111-1111-111111111111/avatar.webp'),
  1234,
  'a co-member cannot overwrite a teammate avatar'
);

-- 6. And nothing but the read was touched: no write policy consults the new helper.
--
--    ASSERTED ON THE POLICY TEXT, not by attempting a delete, and that is forced
--    rather than preferred. Storage installs a `protect_delete` trigger that raises
--    on ANY direct `delete from storage.objects` — for the table owner as much as for
--    a policy-bound user — so a functional delete test cannot distinguish "RLS refused
--    it" from "the trigger refuses everyone", and would pass against a policy that had
--    been opened wide. Reading the catalogue asks the question that actually matters
--    here: this migration widened `avatars_select`, and the other three policies are
--    still the ones 20260910090100 wrote.
select is(
  (select count(*) from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname in ('avatars_insert', 'avatars_update', 'avatars_delete')
     and (coalesce(qual, '') || coalesce(with_check, '')) like '%shares_org_with%'),
  0::bigint,
  'no avatars write policy consults shares_org_with'
);

-- ===========================================================================
-- As u3 — shares no organization with anyone.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 7. The bucket still reads as empty for a stranger, exactly as before this change.
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'),
  0::bigint,
  'a user outside the org sees no avatar at all'
);

-- ===========================================================================
-- As u4 — shares ONLY an archived org with u1.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';

-- 8. Archiving removes an org from every read path, and a face is a read path. Without
--    the archived_at test in shares_org_with, archiving would leave every member of a
--    dead org still able to pull every other member's photo.
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'),
  0::bigint,
  'a membership in an archived org grants no access to a co-member avatar'
);

-- ===========================================================================
-- As u1 — the owner keeps everything they had.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 9. Both objects, stray included. The own-folder branch is deliberately NOT pinned to
--    the blessed key: a stray must stay readable and deletable by its owner and by
--    delete_account(), which clears the caller's objects by folder.
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'),
  2::bigint,
  'the owner still sees every object in their own folder, stray included'
);

-- ===========================================================================
-- Grants on the new helper, mirroring its three siblings in 20260723090100.
-- ===========================================================================
reset role;

select ok(
  not has_function_privilege('anon', 'public.shares_org_with(text)', 'execute'),
  'anon cannot execute shares_org_with'
);

select ok(
  has_function_privilege('authenticated', 'public.shares_org_with(text)', 'execute'),
  'authenticated can execute shares_org_with'
);

select * from finish();
rollback;
