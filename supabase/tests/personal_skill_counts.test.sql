-- pgTAP: personal_skill_counts — the caller's own runs, outside any organization.
--
-- Covers 20260731110000_personal_skill_counts.sql. What is proven:
--
--   1. The caller's own NULL-org runs are counted, summed per skill.
--   2. THE PRIVACY CANARY: another user's NULL-org runs are not. These rows are
--      readable by their author and nobody else — not a teammate, not an org admin —
--      and this is the assertion that says so through the function a caller uses.
--   3. The caller's ORG runs are excluded. Otherwise the personal tab would print
--      the same numbers as the org tab beside it, which is the failure a reader
--      cannot detect from the number.
--   4. A caller with no session is refused by the guard.
--   5. `anon` holds no execute privilege.
--   6. It is NOT security definer — the whole argument for this function is that it
--      borrows no privilege, and `definer` would turn assertion 2's empty result
--      into every user's personal history.
--   7. The plugin prefix is folded, identically to the other two rollups.
--   8. Someone who has only ever worked in an org gets no rows.
--
-- Same impersonation caveat as every other suite: pgTAP runs as the table OWNER,
-- which BYPASSES RLS, so seeding happens as the owner and each assertion sets
-- `role authenticated` + a `request.jwt.claims` sub so auth.uid() resolves.

begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 (1111) — 3 personal commits (one under its plugin name), 1 personal start,
--               plus 2 runs inside Org A which must NOT be counted.
--   u2 (2222) — personal runs of their own. The privacy canary.
--   u3 (3333) — a member of Org A with org runs only. Assertion 8.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user');

insert into public.skill_invocations (org_id, user_id, skill)
values
  -- u1, personal: 3 commits across both spellings, 1 start.
  (null, '11111111-1111-1111-1111-111111111111', 'magic-commit'),
  (null, '11111111-1111-1111-1111-111111111111', 'magic-commit'),
  (null, '11111111-1111-1111-1111-111111111111', 'magic-slash:magic-commit'),
  (null, '11111111-1111-1111-1111-111111111111', 'magic-start'),
  -- u1, inside the org: must stay out of the personal rollup.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-pr'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-commit'),
  -- u2, personal: another person's private history.
  (null, '22222222-2222-2222-2222-222222222222', 'magic-done'),
  (null, '22222222-2222-2222-2222-222222222222', 'magic-done'),
  -- u3, org only.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'magic-review');

-- ===========================================================================
-- 1. The guard: no session, no answer.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.personal_skill_counts() $sql$,
  'personal_skill_counts requires an authenticated user',
  'personal_skill_counts rejects a caller with no session'
);

-- ===========================================================================
-- 2..3. The GRANT layer, and the absence of SECURITY DEFINER. Read from the
-- catalog as the owner: querying another role's privileges requires membership.
-- ===========================================================================
reset role;

select ok(
  not has_function_privilege('anon', 'public.personal_skill_counts()', 'execute'),
  'anon cannot execute personal_skill_counts'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.personal_skill_counts()'::regprocedure),
  false,
  'personal_skill_counts is SECURITY INVOKER, so RLS backs the scope'
);

-- ===========================================================================
-- 4..7. As u1.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 4. Two skills: magic-commit and magic-start. NOT magic-pr, which u1 ran in the org.
select is(
  (select count(*) from public.personal_skill_counts()),
  2::bigint,
  'only the caller''s own out-of-org skills are listed'
);

-- 5. Two things at once. THREE proves the plugin-scoped spelling folded in. NOT FOUR
--    proves u1's ORG commit stayed out — the failure mode that would make the personal
--    tab echo the org tab beside it.
select is(
  (select total from public.personal_skill_counts() where skill = 'magic-commit'),
  3::bigint,
  'the plugin-scoped run folds in and the caller''s org run stays out'
);

-- 6. …and named directly: the skill u1 ran ONLY inside the org is absent altogether.
select is(
  (select count(*) from public.personal_skill_counts() where skill = 'magic-pr'),
  0::bigint,
  'a skill the caller only ran inside an org does not appear'
);

-- 7. THE PRIVACY CANARY: u2's personal runs are u2's alone. u1 is an admin of an org
--    u2 has nothing to do with, and no arrangement of memberships may surface this.
select is(
  (select count(*) from public.personal_skill_counts() where skill = 'magic-done'),
  0::bigint,
  'another user''s personal runs are not visible'
);

-- ===========================================================================
-- 8..9. From the other side.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 8. u2 sees their own two, so assertion 7's zero is isolation and not an empty table.
select is(
  (select total from public.personal_skill_counts() where skill = 'magic-done'),
  2::bigint,
  'each caller sees their own personal runs'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 9. Someone who has only ever worked inside an org has no personal rollup: no rows,
--    which is what lets the UI say "nothing here" instead of drawing zeros.
select is(
  (select count(*) from public.personal_skill_counts()),
  0::bigint,
  'a user with org work only gets no rows'
);

select * from finish();
rollback;
