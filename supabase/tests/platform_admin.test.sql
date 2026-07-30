-- pgTAP: the platform-admin identity and its read-only back-office RPCs.
--
-- Covers 20260728090000_platform_admins.sql. Three things are proven here, in
-- this order, because they are the three ways this feature could be wrong:
--
--   1. A non-admin authenticated caller is refused by EVERY admin_* function.
--      Six functions, six assertions — a guard that exists on five of six is a
--      hole, so none is taken on faith.
--   2. `platform_admins` is unreachable from the API, and `anon` can execute
--      none of these functions. Both are asserted through has_*_privilege rather
--      than by attempting the call: a statement that throws proves only that
--      SOMETHING refused it, and "RLS denied it" and "the role never held the
--      privilege" are different guarantees. The privilege is the one that cannot
--      be re-opened by adding a policy.
--   3. An admin sees 100% of users — including one seeded with NO `profiles` and
--      NO `user_settings` row, which is what a query driven off either of those
--      tables would silently drop.
--
-- Same impersonation caveat as every other suite: pgTAP runs as the table OWNER,
-- which BYPASSES RLS, so seeding happens as the owner and each assertion sets
-- `role authenticated` + a `request.jwt.claims` sub so auth.uid() resolves.

begin;

-- 38 fixed assertions, plus ONE PER admin_* function: the anon-privilege check
-- further down is a catalog sweep that emits a row per function, by design, so
-- that a function added later is covered without editing this test. The plan has
-- to follow the same count or the suite fails on "planned 38 but ran 39" the day
-- it works as intended — which is what happened when admin_list_orgs landed
-- (20260728100000). Derived here rather than bumped, so the next one is free too.
select plan(
  38 + (
    select count(*)::int
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'admin\_%'
  )
);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--   u1 (1111) — the platform admin. Deliberately owns nothing: an operator is
--               not a customer, and their own counts must come back as zero.
--   u2 (2222) — an ordinary user with a full footprint: profile, settings, one
--               org membership, one device, two agents (one archived), two repos.
--   u3 (3333) — signed up and never came back: NO profiles row, NO user_settings
--               row, no device, no org, no agent. The AC2 canary.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now() - interval '3 days', now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now() - interval '2 days', now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now() - interval '1 day', now());

-- The bootstrap the application cannot perform: a row inserted as the owner,
-- exactly as a human does it from the Supabase dashboard.
insert into public.platform_admins (user_id)
values ('11111111-1111-1111-1111-111111111111');

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '22222222-2222-2222-2222-222222222222');

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin');

-- free_text is seeded ON PURPOSE: the AC8 assertions below are meaningless if
-- the column is empty in the fixture.
insert into public.profiles (user_id, name, role, technical_level, communication_style, languages, free_text)
values ('22222222-2222-2222-2222-222222222222', 'Bob', 'product', 'beginner', 'concise', '{fr}', 'private prose about myself');

insert into public.user_settings (user_id, theme, language, usage_card_enabled, launch_mode)
values ('22222222-2222-2222-2222-222222222222', 'dark', 'fr', true, 'plan');

insert into public.app_installations (user_id, device_id, device_name, app_version, platform, arch)
values ('22222222-2222-2222-2222-222222222222', 'device-1', 'bob-mbp', '0.54.1', 'darwin', 'arm64');

-- One team repo and one personal repo, both u2's.
insert into public.repositories (id, owner_id, org_id, name, keywords)
values
  ('c0000000-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-repo', '{api}'),
  ('c0000000-0000-0000-0000-0000000000cc', '22222222-2222-2222-2222-222222222222', null,                                   'perso-repo', '{}');

-- Agents are inserted without an org — org_id is derived from the attachment
-- below (20260727160000). One is archived, to prove the drill-down keeps it.
insert into public.agents (id, org_id, owner_id, name, ticket_id, status, branch_name, archived_at)
values
  ('a0000000-0000-0000-0000-000000000001', null, '22222222-2222-2222-2222-222222222222', 'Live agent',   'PER-1', 'in review', 'feature/per-1', null),
  ('a0000000-0000-0000-0000-000000000002', null, '22222222-2222-2222-2222-222222222222', 'Closed agent', 'PER-2', 'merged',    'feature/per-2', now());

insert into public.agent_repositories (agent_id, repo_id)
values ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a');

-- A local path for the TEAM repo only: has_path must be true for that one and false
-- for the personal one, which is the pair that proves the flag is per (repo, user)
-- rather than "this user has any path at all".
insert into public.repository_paths (repo_id, user_id, path)
values ('c0000000-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', '/Users/bob/code/team-repo');

-- ===========================================================================
-- 1. A non-admin authenticated caller is refused everywhere (AC1, AC7).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 1. The gate itself says no.
select ok(
  not public.is_platform_admin(),
  'is_platform_admin is false for an ordinary user'
);

-- 2..7. Every admin_* function refuses that same caller. `p_user_id` is set to
-- the caller's OWN id on purpose: the guard must fire even when the request is
-- for data the caller is otherwise entitled to see.
select throws_ok(
  $sql$ select public.admin_list_users() $sql$,
  'not a platform admin',
  'admin_list_users rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_list_installations(null) $sql$,
  'not a platform admin',
  'admin_list_installations rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_get_user('22222222-2222-2222-2222-222222222222') $sql$,
  'not a platform admin',
  'admin_get_user rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_list_user_orgs('22222222-2222-2222-2222-222222222222') $sql$,
  'not a platform admin',
  'admin_list_user_orgs rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_list_user_agents('22222222-2222-2222-2222-222222222222') $sql$,
  'not a platform admin',
  'admin_list_user_agents rejects a non-admin'
);

select throws_ok(
  $sql$ select public.admin_list_user_repositories('22222222-2222-2222-2222-222222222222') $sql$,
  'not a platform admin',
  'admin_list_user_repositories rejects a non-admin'
);

-- ===========================================================================
-- 8. No session at all: the auth.uid() guard fires before the admin check.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.admin_list_users() $sql$,
  'admin_list_users requires an authenticated user',
  'admin_list_users rejects a caller with no session'
);

-- ===========================================================================
-- 9..12. platform_admins grants NOTHING to authenticated (AC6).
-- ===========================================================================
-- Read back as the owner: querying another role's privileges requires membership
-- in it, and the point of these four is the GRANT layer, not RLS.
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.platform_admins', 'insert'),
  'authenticated holds no INSERT privilege on platform_admins'
);

select ok(
  not has_table_privilege('authenticated', 'public.platform_admins', 'update'),
  'authenticated holds no UPDATE privilege on platform_admins'
);

select ok(
  not has_table_privilege('authenticated', 'public.platform_admins', 'delete'),
  'authenticated holds no DELETE privilege on platform_admins'
);

-- Not required by the ticket, but a SELECT grant would leak the operator roster
-- to every signed-in user, so it is pinned too.
select ok(
  not has_table_privilege('authenticated', 'public.platform_admins', 'select'),
  'authenticated holds no SELECT privilege on platform_admins'
);

-- ===========================================================================
-- 13..19. anon cannot execute anything under `admin_*`, nor the gate itself.
-- ===========================================================================
-- Postgres grants EXECUTE to PUBLIC by default, so `revoke execute … from public`
-- is the only thing standing between an unauthenticated PostgREST call and the
-- auth.uid() guard inside each function. It is asserted at the privilege layer
-- for the same reason as the table grants above, and swept from the catalog so a
-- seventh admin_* function added later is covered without editing this test.
select ok(
  not has_function_privilege('anon', 'public.is_platform_admin()', 'execute'),
  'anon holds no EXECUTE privilege on is_platform_admin'
);

select ok(
  not has_function_privilege('anon', p.oid, 'execute'),
  'anon holds no EXECUTE privilege on ' || p.proname
)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'admin\_%'
order by p.proname;

-- ===========================================================================
-- 20..36. The admin path.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 20. The gate recognises the seeded admin.
select ok(public.is_platform_admin(), 'is_platform_admin is true for a seeded admin');

-- 21. All three users come back — 100% of the fleet (AC2).
select is(
  (select count(*) from public.admin_list_users()),
  3::bigint,
  'admin_list_users returns every user'
);

-- 22. Including the one with no profiles and no user_settings row, which is what
--     a query driven off either table would have dropped.
select ok(
  exists (
    select 1 from public.admin_list_users()
    where user_id = '33333333-3333-3333-3333-333333333333'
  ),
  'admin_list_users includes a user with no profiles and no user_settings row'
);

-- 23. That user's counts are 0, not null — a null would render as blank rather
--     than as "none".
select is(
  (select device_count from public.admin_list_users()
   where user_id = '33333333-3333-3333-3333-333333333333'),
  0::bigint,
  'a user with no device counts as 0, not null'
);

-- 24. The app version is resolved per user from their most recent device (AC2).
select is(
  (select latest_app_version from public.admin_list_users()
   where user_id = '22222222-2222-2222-2222-222222222222'),
  '0.54.1',
  'admin_list_users resolves the app version from the latest device'
);

-- 25. Org membership is counted.
select is(
  (select org_count from public.admin_list_users()
   where user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'admin_list_users counts org memberships'
);

-- 26. Agents are counted in full…
select is(
  (select agent_count from public.admin_list_users()
   where user_id = '22222222-2222-2222-2222-222222222222'),
  2::bigint,
  'admin_list_users counts every agent, archived included'
);

-- 27. …and separately excluding the archived one.
select is(
  (select active_agent_count from public.admin_list_users()
   where user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'admin_list_users counts active agents separately'
);

-- 28. The organisation NAMES, not just how many. Element 0 is the org joined
--     first, which is the one the Users table prints.
select is(
  (select org_names from public.admin_list_users()
   where user_id = '22222222-2222-2222-2222-222222222222'),
  array['Org One'],
  'admin_list_users returns the names of the orgs a user belongs to'
);

-- 29. An empty ARRAY for a user in no org, never null: array_agg over zero rows
--     yields null, and the table would print "unknown" where the truth is "none".
select is(
  (select org_names from public.admin_list_users()
   where user_id = '33333333-3333-3333-3333-333333333333'),
  '{}'::text[],
  'a user in no org gets an empty org_names array, not null'
);

-- 30. Repositories REACHED, counted once each. u2 owns a personal repo and a
--     team repo in the org they belong to, so this also proves the two branches
--     of the predicate do not double-count the team one.
--     Coverage gap, stated rather than implied: no fixture user is a member of an
--     org WITHOUT owning its repos, so the membership branch is not exercised on
--     its own here — same gap as assertion 40 on admin_list_user_repositories,
--     whose predicate this one copies.
select is(
  (select repo_count from public.admin_list_users()
   where user_id = '22222222-2222-2222-2222-222222222222'),
  2::bigint,
  'admin_list_users counts personal and team repositories once each'
);

-- 31. And 0, not null, for the user who reaches none.
select is(
  (select repo_count from public.admin_list_users()
   where user_id = '33333333-3333-3333-3333-333333333333'),
  0::bigint,
  'a user with no repository counts as 0, not null'
);

-- 32. The whole fleet, one row per device.
select is(
  (select count(*) from public.admin_list_installations(null)),
  1::bigint,
  'admin_list_installations(null) returns the whole fleet'
);

-- 33. Scoped to one user.
select is(
  (select device_name from public.admin_list_installations('22222222-2222-2222-2222-222222222222')),
  'bob-mbp',
  'admin_list_installations scopes to one user'
);

-- 34. …and that scoping actually excludes the others.
select is(
  (select count(*) from public.admin_list_installations('11111111-1111-1111-1111-111111111111')),
  0::bigint,
  'admin_list_installations returns nothing for a user with no device'
);

-- 35. The drill-down header: name and role from profiles, nothing else.
select is(
  (select name || ' / ' || role from public.admin_get_user('22222222-2222-2222-2222-222222222222')),
  'Bob / product',
  'admin_get_user returns the profile name and role'
);

-- 36. And the settings row, column by column (one sample stands for the 17).
select is(
  (select theme from public.admin_get_user('22222222-2222-2222-2222-222222222222')),
  'dark',
  'admin_get_user returns the user_settings columns'
);

-- 37. A user with no profiles and no user_settings row still yields a row, with
--     nulls — driven off auth.users, so the page renders instead of 404ing.
select is(
  (select count(*) from public.admin_get_user('33333333-3333-3333-3333-333333333333')),
  1::bigint,
  'admin_get_user returns a row for a user with no profile and no settings'
);

-- 38. Orgs, with the role in each.
select is(
  (select name || ' / ' || role::text from public.admin_list_user_orgs('22222222-2222-2222-2222-222222222222')),
  'Org One / admin',
  'admin_list_user_orgs returns the org and the role in it'
);

-- 39. Agents include the archived one, with their repositories resolved by name.
select is(
  (select repo_names from public.admin_list_user_agents('22222222-2222-2222-2222-222222222222')
   where id = 'a0000000-0000-0000-0000-000000000001'),
  array['team-repo'],
  'admin_list_user_agents resolves repository names from agent_repositories'
);

-- 40. Repositories: the personal one and the team one, in a single list.
select is(
  (select count(*) from public.admin_list_user_repositories('22222222-2222-2222-2222-222222222222')),
  2::bigint,
  'admin_list_user_repositories returns personal and team repositories'
);

-- 41. The bound repo reports a path…
select is(
  (select has_path from public.admin_list_user_repositories('22222222-2222-2222-2222-222222222222')
   where name = 'team-repo'),
  true,
  'admin_list_user_repositories reports a repository bound to a local path'
);

-- 42. …and the unbound one reports none. Not null: the flag is an `exists`, and
--     "no binding" is a fact rather than a missing value.
select is(
  (select has_path from public.admin_list_user_repositories('22222222-2222-2222-2222-222222222222')
   where name = 'perso-repo'),
  false,
  'a repository with no local path reports has_path false, not null'
);

-- ===========================================================================
-- 43..44. The column allowlist holds: no admin_* function exposes free_text (AC8).
-- ===========================================================================
-- Asserted against the SIGNATURE, not against a result set. A row-level check
-- ("no row contains the seeded prose") passes for any fixture where the column
-- happens to be empty; pg_get_function_result reads the declared return type, so
-- it fails the moment a column is added to an allowlist — which is the event this
-- is meant to catch.
reset role;

select ok(
  pg_get_function_result('public.admin_get_user(uuid)'::regprocedure) not like '%free_text%',
  'admin_get_user does not return profiles.free_text'
);

-- The same guarantee for every admin_* function at once, and for the three other
-- profiles columns held back with it. Written as a catalog sweep so a SEVENTH
-- function added later is covered without editing this test.
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'admin\_%'
      and (
        pg_get_function_result(p.oid) like '%free_text%'
        or pg_get_function_result(p.oid) like '%technical_level%'
        or pg_get_function_result(p.oid) like '%communication_style%'
        or pg_get_function_result(p.oid) like '%languages%'
      )
  ),
  'no admin_* function returns free_text, technical_level, communication_style or languages'
);

select * from finish();
rollback;
