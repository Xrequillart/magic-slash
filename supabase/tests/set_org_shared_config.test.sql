-- pgTAP: prove set_org_shared_config behaves correctly and round-trips through
-- get_org_shared_config.
--
-- Like accept_invitation.test.sql, we impersonate authenticated end users by
-- setting:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>","email":"<email>"}';
-- The RPCs are SECURITY DEFINER: they run as the owner but read auth.uid() from
-- the "sub" claim above. We `reset role;` to seed data and to read results back
-- bypassing RLS.

begin;
select plan(6);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   Org One (aaaa): u1 = admin/creator, u2 = plain member. No config yet — used
--                   for the write + round-trip and the non-admin rejection.
--   Org Two (bbbb): u3 = admin/creator, with a pre-existing config row carrying
--                   a non-shared key (repoPaths) — used to prove the merge
--                   preserves pre-existing keys.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', '33333333-3333-3333-3333-333333333333');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'admin');

-- Org Two's creator already has a config row with a non-shared, local-only key
-- (repoPaths) that the merge must preserve.
insert into public.configs (org_id, user_id, data)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '33333333-3333-3333-3333-333333333333',
  '{"repoPaths":{"api":"/local"}}'::jsonb
);

-- ===========================================================================
-- Org One: an admin writes the shared config, which round-trips through
-- get_org_shared_config.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"u1@example.com"}';  -- u1, admin/creator

-- 1. The admin sets the shared config. The extra repoPaths key is non-shared and
--    must be dropped by the projection (proved by the round-trip in #2).
select lives_ok(
  $sql$ select public.set_org_shared_config(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"languages":{"commit":"en"},"commit":{"format":"conventional"},"pullRequest":{"autoLinkTickets":true},"repoKeywords":{"api":["api","backend"]},"repoPaths":{"api":"/should-be-ignored"}}'::jsonb
  ) $sql$,
  'set_org_shared_config succeeds for an admin'
);

-- 2. get_org_shared_config returns exactly the shared fields just written
--    (repoPaths dropped) — full round-trip.
select is(
  public.get_org_shared_config('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '{"commit":{"format":"conventional"},"languages":{"commit":"en"},"pullRequest":{"autoLinkTickets":true},"repoKeywords":{"api":["api","backend"]}}'::jsonb,
  'set_org_shared_config round-trips through get_org_shared_config'
);

-- ===========================================================================
-- Org One: a non-admin member is rejected.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","email":"u2@example.com"}';  -- u2, plain member

-- 3. A non-admin member cannot set the shared config.
select throws_ok(
  $sql$ select public.set_org_shared_config(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"languages":{"commit":"fr"}}'::jsonb
  ) $sql$,
  'not an admin of this organization',
  'set_org_shared_config rejects a non-admin member'
);

-- ===========================================================================
-- Org Two: merging preserves pre-existing non-shared keys in the creator's row.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","email":"u3@example.com"}';  -- u3, admin/creator

-- 4. The admin sets the shared config on top of the pre-existing config row.
select lives_ok(
  $sql$ select public.set_org_shared_config(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '{"languages":{"commit":"fr"}}'::jsonb
  ) $sql$,
  'set_org_shared_config succeeds on an existing config row'
);

-- 5. The pre-existing non-shared key (repoPaths) is preserved by the merge.
reset role;  -- read back as owner (bypass RLS)
select is(
  (select data -> 'repoPaths' from public.configs
   where org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     and user_id = '33333333-3333-3333-3333-333333333333'),
  '{"api":"/local"}'::jsonb,
  'set_org_shared_config preserves pre-existing non-shared keys (merge)'
);

-- 6. The shared field was added and is visible through get_org_shared_config.
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","email":"u3@example.com"}';
select is(
  public.get_org_shared_config('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  '{"languages":{"commit":"fr"}}'::jsonb,
  'set_org_shared_config adds the shared field alongside existing keys'
);

select * from finish();
rollback;
