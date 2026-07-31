-- pgTAP: the three states a skill run can be in, and the three rollups agreeing on them.
--
-- The definitions live in the skill_run_facets view so they cannot drift; this proves
-- what they are, and that org_skill_counts / personal_skill_counts /
-- admin_org_skill_counts all report the same thing. A disagreement between the app
-- and the back-office gets read as data loss, which is why it is asserted rather
-- than assumed.
--
-- IMPORTANT: `supabase test db` runs as the database OWNER, which BYPASSES RLS.

begin;
select plan(15);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin');

insert into public.platform_admins (user_id)
values ('11111111-1111-1111-1111-111111111111');

insert into public.agents (id, org_id, owner_id, name)
values ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Agent One');

-- Four runs of magic-commit for the org, one of each interesting kind:
--   two finished (10s and 30s, so the median is a real midpoint),
--   one open and recent  -> still running, neither completed nor abandoned,
--   one open and stale   -> abandoned.
insert into public.skill_invocations (org_id, user_id, agent_id, skill, occurred_at, ended_at, outcome)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-commit', now() - interval '1 hour',   now() - interval '1 hour' + interval '10 seconds', 'success'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-commit', now() - interval '2 hours',  now() - interval '2 hours' + interval '30 seconds', 'success'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-commit', now() - interval '2 minutes', null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-commit', now() - interval '9 hours',   null, null);

-- A skill that has only ever been started, never finished.
insert into public.skill_invocations (org_id, user_id, agent_id, skill, occurred_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-review', now() - interval '3 minutes');

-- Personal (no org, no agent), including a plugin-prefixed name that must fold into
-- the same bucket as the bare one.
insert into public.skill_invocations (org_id, user_id, agent_id, skill, occurred_at, ended_at, outcome)
values
  (null, '11111111-1111-1111-1111-111111111111', null, 'magic-pr',              now() - interval '1 hour', now() - interval '1 hour' + interval '20 seconds', 'success'),
  (null, '11111111-1111-1111-1111-111111111111', null, 'magic-slash:magic-pr',  now() - interval '8 hours', null, null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- ---------------------------------------------------------------------------
-- The three states
-- ---------------------------------------------------------------------------

select is(
  (select total from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  4::bigint,
  'total counts every run STARTED, whatever became of it'
);

select is(
  (select completed from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  2::bigint,
  'completed counts the runs that reported finishing'
);

-- The one open for nine hours, NOT the one open for two minutes.
select is(
  (select abandoned from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  1::bigint,
  'abandoned counts only runs open past the 4-hour threshold'
);

-- 4 started, 2 done, 1 given up — the fourth is still going. Forcing the parts to sum
-- to the total would have to misreport whichever run is in flight.
select is(
  (select total - completed - abandoned from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  1::bigint,
  'a recent open run is neither completed nor abandoned — it is still running'
);

-- ---------------------------------------------------------------------------
-- Duration
-- ---------------------------------------------------------------------------

select is(
  (select median_duration_ms from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-commit'),
  20000::bigint,
  'the median is taken over the finished runs only (10s and 30s -> 20s)'
);

select is(
  (select median_duration_ms from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-review'),
  null,
  'the median is null when nothing has finished — not zero'
);

select is(
  (select total from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where skill = 'magic-review'),
  1::bigint,
  'a skill that only ever started still reports its runs'
);

-- ---------------------------------------------------------------------------
-- Personal scope, and the folded plugin prefix
-- ---------------------------------------------------------------------------

select is(
  (select total from public.personal_skill_counts() where skill = 'magic-pr'),
  2::bigint,
  'a plugin-prefixed run folds into the same skill as the bare one'
);

select is(
  (select completed from public.personal_skill_counts() where skill = 'magic-pr'),
  1::bigint,
  'the personal rollup splits its outcomes the same way'
);

select is(
  (select abandoned from public.personal_skill_counts() where skill = 'magic-pr'),
  1::bigint,
  'the 8-hour-old personal run reads as abandoned'
);

select is(
  (select count(*) from public.personal_skill_counts() where skill = 'magic-commit'),
  0::bigint,
  'the personal rollup excludes the org''s runs'
);

-- ---------------------------------------------------------------------------
-- The back-office must agree with what the team is shown
-- ---------------------------------------------------------------------------

select results_eq(
  $sql$ select skill, total, completed, abandoned, median_duration_ms
        from public.admin_org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  $sql$ select skill, total, completed, abandoned, median_duration_ms
        from public.org_skill_counts('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'the admin rollup returns exactly what the org''s own members are shown'
);

reset role;

-- ---------------------------------------------------------------------------
-- "Abandoned" requires evidence that the client can report an ending
-- ---------------------------------------------------------------------------
-- Without this rule, every row written before end-reporting existed reclassifies
-- itself as abandoned the moment the feature ships — and so does every run by anyone
-- who has not updated their skills yet, because their client emits starts and never
-- ends. Both are unknown outcomes, not given-up work.

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'legacy@example.com', now(), now());

-- A user who has NEVER closed a run: an old client, or history from before the
-- columns existed. Two stale open runs.
insert into public.skill_invocations (org_id, user_id, agent_id, skill, occurred_at)
values
  (null, '33333333-3333-3333-3333-333333333333', null, 'magic-commit', now() - interval '3 days'),
  (null, '33333333-3333-3333-3333-333333333333', null, 'magic-commit', now() - interval '2 days');

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

select is(
  (select abandoned from public.personal_skill_counts() where skill = 'magic-commit'),
  0::bigint,
  'a user who has never closed a run has no abandoned runs — the outcome is unknown'
);

select is(
  (select total from public.personal_skill_counts() where skill = 'magic-commit'),
  2::bigint,
  'those runs are still counted as started — the history is not hidden, only unjudged'
);

reset role;

-- The same user updates and completes one run. That is the evidence their client can
-- report endings, so the run still hanging is a real abandonment from then on.
insert into public.skill_invocations (org_id, user_id, agent_id, skill, occurred_at, ended_at, outcome)
values (null, '33333333-3333-3333-3333-333333333333', null, 'magic-commit', now() - interval '1 hour', now() - interval '1 hour' + interval '5 seconds', 'success');

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

select is(
  (select abandoned from public.personal_skill_counts() where skill = 'magic-commit'),
  2::bigint,
  'once the client proves it reports endings, its stale open runs count as abandoned'
);

reset role;

select * from finish();
rollback;
