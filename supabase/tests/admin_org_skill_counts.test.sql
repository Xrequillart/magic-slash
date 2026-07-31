-- pgTAP: admin_org_skill_counts — the per-skill run rollup for one org.
--
-- Covers 20260731090000_admin_org_skill_counts.sql. What is proven, because each is
-- a way this function could be wrong:
--
--   1. The two guards, in the order the function runs them: a non-admin
--      authenticated caller, then a caller with no session at all.
--   2. `anon` holds no execute privilege. Asserted through has_function_privilege
--      rather than by attempting the call: a statement that throws proves only that
--      SOMETHING refused it, and the privilege is the layer no policy can re-open.
--   3. Counting: several runs of one skill are one row carrying the total, and each
--      skill gets its own row.
--   4. ORG SCOPING. The other org's runs are the canary — a function that forgot
--      its WHERE returns the platform's totals under one tenant's name, which is
--      the worst failure available to a back-office and the one no operator could
--      spot from the number alone.
--   5. NULL-org runs (a personal-repo agent, per 20260727160000) are counted for
--      nobody. Documented behaviour, so it is asserted rather than left to drift.
--   6. The plugin prefix is folded: "magic-slash:magic-pr" and "magic-pr" are the
--      same skill and must sum into ONE row, not split into two.
--   7. Ordering is by count descending — the contract the function states.
--   8. An org with no runs returns zero ROWS (not a row of zeros): the caller
--      distinguishes "never ran it" by absence, so the shape matters.
--
-- Same impersonation caveat as every other suite: pgTAP runs as the table OWNER,
-- which BYPASSES RLS, so seeding happens as the owner and each assertion sets
-- `role authenticated` + a `request.jwt.claims` sub so auth.uid() resolves.

begin;
select plan(12);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 (1111) — the platform admin.
--   u2 (2222) — an ordinary user, the actor on every run below.
--
--   Org Busy (aaaa) — the subject. 4 magic-commit, 2 magic-pr (one of them logged
--                     under its plugin name), 1 magic-start.
--   Org Idle (bbbb) — exists, has never run anything. Assertion 8.
--   Org Other(cccc) — runs of its own, which must never reach Org Busy's totals.
--
-- agent_id is left NULL on every row: the stamp_event_org trigger derives org_id
-- from the agent when there is one, and this suite is about the ROLLUP. The
-- derivation has its own coverage in event_org_from_agent.test.sql.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

-- The bootstrap the application cannot perform (platform_admins grants
-- `authenticated` nothing) — a row inserted as the owner, as a human does it.
insert into public.platform_admins (user_id)
values ('11111111-1111-1111-1111-111111111111');

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org Busy',  '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Idle',  '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org Other', '22222222-2222-2222-2222-222222222222');

insert into public.skill_invocations (org_id, user_id, skill)
values
  -- Org Busy: 4 commits.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-commit'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-commit'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-commit'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-commit'),
  -- 2 PRs, logged under BOTH spellings: one bare, one plugin-scoped. Assertion 6.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-pr'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-slash:magic-pr'),
  -- 1 start.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-start'),
  -- Org Other's own runs. The scoping canary.
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'magic-commit'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'magic-done'),
  -- Attributed to NO org: a personal-repo run. Must be counted for nobody.
  (null,                                   '22222222-2222-2222-2222-222222222222', 'magic-commit');

-- ===========================================================================
-- 1..2. The two guards, in the order the function runs them.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

select throws_ok(
  $sql$ select public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'not a platform admin',
  'admin_org_skill_counts rejects a non-admin'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'admin_org_skill_counts requires an authenticated user',
  'admin_org_skill_counts rejects a caller with no session'
);

-- ===========================================================================
-- 3..4. The GRANT layer. Read back as the owner: querying another role's
-- privileges requires membership in it.
-- ===========================================================================
reset role;

select ok(
  not has_function_privilege('anon', 'public.admin_org_skill_counts(uuid)', 'execute'),
  'anon cannot execute admin_org_skill_counts'
);

select ok(
  has_function_privilege('authenticated', 'public.admin_org_skill_counts(uuid)', 'execute'),
  'authenticated can execute admin_org_skill_counts'
);

-- ===========================================================================
-- 5..12. As the platform admin.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 5. One row per distinct skill, not one per run.
select is(
  (select count(*) from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  3::bigint,
  'one row per distinct skill'
);

-- 6. The runs are summed.
select is(
  (select total from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  4::bigint,
  'magic-commit carries the total of its four runs'
);

-- 7. THE CANARY: Org Other ran magic-commit too, and it must not be in here. A
--    function missing its WHERE returns 5 rather than 4 above and would still look
--    plausible; this asserts the skill it ran EXCLUSIVELY is absent altogether.
select is(
  (select count(*) from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-done'),
  0::bigint,
  'another org''s runs do not leak in'
);

-- 8. …and read from the other side: Org Other sees only its own two.
select is(
  (select total from public.admin_org_skill_counts('cccccccc-cccc-cccc-cccc-cccccccccccc') where skill = 'magic-commit'),
  1::bigint,
  'each org gets its own count of the same skill'
);

-- 9. The plugin prefix is folded: 'magic-pr' + 'magic-slash:magic-pr' is ONE row
--    of 2, not two rows of 1. Assertion 5 above already fails if they split, but
--    this names the value.
select is(
  (select total from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-pr'),
  2::bigint,
  'a plugin-scoped run folds into the bare skill name'
);

-- 10. No row survives under the prefixed spelling.
select is(
  (select count(*) from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill like '%:%'),
  0::bigint,
  'no row keeps its plugin prefix'
);

-- 11. Ordering: commonest first, which is the function's stated contract.
select is(
  (select skill from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') offset 0 limit 1),
  'magic-commit',
  'the most-run skill comes first'
);

-- 12. An org that has run nothing returns NO ROWS. The caller reads "never ran it"
--     from absence, so a row of zeros would be a different answer.
select is(
  (select count(*) from public.admin_org_skill_counts('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  0::bigint,
  'an org with no runs returns no rows'
);

select * from finish();
rollback;
