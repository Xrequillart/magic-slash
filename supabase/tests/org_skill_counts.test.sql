-- pgTAP: org_skill_counts — the member-facing per-skill run rollup.
--
-- Covers 20260731100000_org_skill_counts.sql. This function is SECURITY INVOKER, so
-- what is being tested is mostly the RLS policy DOING the scoping. What is proven:
--
--   1. A member of the org sees its rollup, summed per skill.
--   2. THE ISOLATION CANARY: a member of ANOTHER org gets nothing back. Under
--      SECURITY INVOKER this is the policy's work, so a regression here is likelier
--      to come from a future policy edit than from the function — which is exactly
--      why it is asserted against the function a real caller uses.
--   3. A caller with no session is refused by the guard.
--   4. `anon` holds no execute privilege, asserted through has_function_privilege:
--      a statement that throws proves only that SOMETHING refused it.
--   5. It is NOT security definer. Asserted on the catalog, because the whole
--      argument for this function is that it borrows no privilege — a later edit
--      adding `security definer` would silently turn the empty result of assertion
--      2 into another org's data.
--   6. The plugin prefix is folded, identically to admin_org_skill_counts. The two
--      surfaces show the same team the same numbers, so they must agree.
--   7. Personal (NULL-org) runs are counted for nobody, even for their own author.
--   8. An org with no runs returns no rows.
--
-- Same impersonation caveat as every other suite: pgTAP runs as the table OWNER,
-- which BYPASSES RLS, so seeding happens as the owner and each assertion sets
-- `role authenticated` + a `request.jwt.claims` sub so auth.uid() resolves.

begin;
select plan(10);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 (1111) — member of Org A. The ordinary caller throughout.
--   u2 (2222) — member of Org B only. The isolation canary.
--
--   Org A (aaaa) — 3 magic-commit (one logged under its plugin name), 1 magic-start.
--   Org B (bbbb) — one run of its own, so "empty" cannot be mistaken for "isolated".
--   Org C (cccc) — nobody's org, no runs. Assertion 8.
--
--   Plus one NULL-org run owned by u1: their own personal-repo work.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org C', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'admin');

insert into public.skill_invocations (org_id, user_id, skill)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-commit'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-commit'),
  -- The same skill under its plugin-scoped name. Must fold into the row above.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-slash:magic-commit'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-start'),
  -- Org B's own run.
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'magic-done'),
  -- u1's personal work: readable by u1 (the policy's first arm) but attributed to
  -- no org, so no org rollup may include it.
  (null,                                   '11111111-1111-1111-1111-111111111111', 'magic-commit');

-- ===========================================================================
-- 1. The guard: no session, no answer.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'org_skill_counts requires an authenticated user',
  'org_skill_counts rejects a caller with no session'
);

-- ===========================================================================
-- 2..3. The GRANT layer, and the absence of SECURITY DEFINER. Both read from the
-- catalog as the owner: querying another role's privileges requires membership.
-- ===========================================================================
reset role;

select ok(
  not has_function_privilege('anon', 'public.org_skill_counts(uuid)', 'execute'),
  'anon cannot execute org_skill_counts'
);

-- The load-bearing property: this function borrows no privilege, so RLS is what
-- scopes it. `prosecdef` true here would make assertion 5 below pass for the wrong
-- reason and leak every org's rollup to every caller.
select is(
  (select prosecdef from pg_proc where oid = 'public.org_skill_counts(uuid)'::regprocedure),
  false,
  'org_skill_counts is SECURITY INVOKER, so RLS does the scoping'
);

-- ===========================================================================
-- 4..7. As u1, a member of Org A.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 4. One row per distinct skill: the three commits (two spellings) and the start.
select is(
  (select count(*) from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  2::bigint,
  'a member gets one row per distinct skill'
);

-- 5. Two things at once, and both are load-bearing. THREE proves the plugin-scoped
--    spelling folded in (it would be 2 with a stray fourth row otherwise). NOT FOUR
--    proves u1's own NULL-org run stayed out: u1 owns that row and may read it, so
--    an implementation filtering on user_id instead of org_id lands on 4 here.
select is(
  (select total from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  3::bigint,
  'the plugin-scoped run folds in and the personal run stays out'
);

-- 6. The second skill is reported too, so assertion 4's row count is two REAL rows
--    rather than one row and one artefact of the folding.
select is(
  (select total from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-start'),
  1::bigint,
  'each distinct skill carries its own count'
);

-- 7. An org they belong to that has run nothing: no rows, not a row of zeros.
select is(
  (select count(*) from public.org_skill_counts('cccccccc-cccc-cccc-cccc-cccccccccccc')),
  0::bigint,
  'an org with no runs returns no rows'
);

-- ===========================================================================
-- 8..10. THE ISOLATION CANARY, from both sides.
-- ===========================================================================

-- 8. u1 is not a member of Org B, and Org B has a run. Nothing comes back.
select is(
  (select count(*) from public.org_skill_counts('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  0::bigint,
  'a non-member gets no rows for an org that does have runs'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 9. …and the mirror: u2 sees their own org.
select is(
  (select total from public.org_skill_counts('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') where skill = 'magic-done'),
  1::bigint,
  'each member sees their own org''s rollup'
);

-- 10. …but not Org A's four runs.
select is(
  (select count(*) from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  0::bigint,
  'a member of another org cannot read this org''s rollup'
);

select * from finish();
rollback;
