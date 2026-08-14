-- pgTAP: skill_hours — the caller's own time inside the skills, total and this week.
--
-- Covers the function as it stands after 20260814150000_skill_hours_agent_title.sql —
-- the fourth version of it, after 110000's three columns, 120000's last_run_at and
-- 140000's last_run_agent. ONE suite for all of them rather than one per migration:
-- there is a single function, and a test pinned to a superseded shape would only assert
-- that history happened.
--
-- What is proven, because each is a way this function could be wrong in a way nobody
-- would notice from the number alone:
--
--   1. The guard: no session, no answer.
--   2. `anon` holds no execute privilege. Asserted through has_function_privilege
--      rather than by calling: a statement that throws proves only that SOMETHING
--      refused it, and the privilege is the layer no policy can re-open.
--   3. Closed runs are summed across EVERY scope — an org run and a personal one land
--      in the same total, which is the whole reason this is not personal_skill_counts
--      with a different aggregate.
--   4. Open runs weigh nothing. The documented floor: no end, no duration.
--   5. Concurrent runs are SUMMED, not unioned. Two agents in the same hour is two
--      hours. The opposite convention is defensible, which is exactly why the one this
--      function picked has to be pinned by a test.
--   6. Another user's run in MY org is not mine. skill_invocations' SELECT policy hands
--      an org member their teammates' rows, so `user_id = auth.uid()` is the only thing
--      keeping one person's hours from becoming their organization's.
--   7. The week is Monday-to-Sunday and NOT a rolling seven days: a run eight days old
--      is in the total and out of the week; last Sunday's is too.
--   8. p_tz decides where that Monday falls. The canary is a run just after midnight
--      Paris time, which is still Sunday in UTC: Paris counts it in the week, UTC does
--      not, from the same row. If the parameter were ignored, both would agree.
--   9. first_measured_at is the first run that HAS a duration, not the first run. Runs
--      predating close_skill_run have no end, and dating the total from one of them
--      would spread measured hours over an unmeasured period.
--  10. A user with no runs gets ONE row of zeros with a null date, not zero rows: the
--      banner distinguishes "nothing recorded yet" from "nothing this week".
--  11. An unknown timezone name falls back to UTC rather than raising — the server's tz
--      database may be older than the client's, and no banner is worse than a boundary
--      a few hours off.
--  12. last_run_at counts OPEN runs, unlike everything else here: "when did I last use
--      this" is about starting a skill, not finishing one. Proven on a user whose whole
--      history is one closed run and one later open one, so the two dates must diverge —
--      on a shared fixture the assertion would pass whether or not the filter was there.
--  13. last_run_agent is the agent's TITLE, not the generated name the app spawns a
--      terminal with. Every agent in the fixture carries both, and they differ: a
--      function returning `name` reads "claude 4" on screen, which names nothing the
--      person did. It must also be the title of THAT run's agent — u4 has two, one per
--      run, so naming the older one or "any agent this user has" fails here.
--  14. An EMPTY title falls back to that generated name. The app writes '' rather than
--      null for an agent nobody has named, so a plain coalesce would print blank.
--  15. And the column is NULL when the last run had no agent at all — a skill launched
--      in a terminal the app did not spawn. The card prints the date alone for it, which
--      only null gets it to do.
--
-- IMPORTANT: `supabase test db` runs as the database OWNER, which BYPASSES RLS. Each
-- assertion impersonates an authenticated end user via
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- and `reset role;` returns to the owner to seed or switch users.

begin;
select plan(20);

-- ---------------------------------------------------------------------------
-- Seed as the owner.
--   u1 (1111) — the subject.
--   u2 (2222) — a TEAMMATE in the same org, whose runs must never reach u1's total.
--   u3 (3333) — has never run anything. Assertion 10.
--   u4 (4444) — one closed run, then one open one. Assertion 12.
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user');

-- ---------------------------------------------------------------------------
-- u1's runs. Every duration is a round number of minutes so the expected totals are
-- readable as arithmetic rather than as constants.
--
-- The week boundary is derived, not hard-coded: these tests run on whatever day CI
-- runs them, and a fixed date would pass or fail by the calendar. `WEEK_PARIS` below
-- is the same expression the function computes internally, which is fair game — the
-- assertions are about WHICH rows fall either side of it, not about how Postgres
-- truncates a week.
--
-- IN THIS WEEK, everywhere:  30 min + 45 min + two overlapping 60 min = 195 min
--   Wednesday-of-this-week is used rather than "an hour ago", so the rows stay inside
--   the week even when the suite runs on a Monday morning.
-- ---------------------------------------------------------------------------

insert into public.skill_invocations (id, org_id, user_id, skill, occurred_at, ended_at, outcome)
values
  -- An ORG run and a PERSONAL run, both this week. Assertion 3 sums the two.
  ('50000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-commit',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 9 hours',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 9 hours 30 minutes',
   'success'),
  ('50000000-0000-0000-0000-000000000002',
   null, '11111111-1111-1111-1111-111111111111', 'magic-pr',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 11 hours',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 11 hours 45 minutes',
   'success'),

  -- TWO AGENTS IN THE SAME HOUR. Identical windows, so a union would report 60
  -- minutes and a sum reports 120. Assertion 5.
  ('50000000-0000-0000-0000-000000000003',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-review',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 14 hours',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 15 hours',
   'success'),
  ('50000000-0000-0000-0000-000000000004',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-resolve',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 14 hours',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 15 hours',
   'success'),

  -- OUT of the week, in the total: eight days ago (a rolling window would still hold
  -- it) and last Sunday afternoon (the day the ISO week ends). 90 min together.
  ('50000000-0000-0000-0000-000000000005',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-start',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' - interval '8 days',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' - interval '8 days' + interval '60 minutes',
   'success'),
  ('50000000-0000-0000-0000-000000000006',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-continue',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' - interval '10 hours',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' - interval '10 hours' + interval '30 minutes',
   'success'),

  -- OPEN: a run still going, and one old enough to read as abandoned. Both weigh
  -- nothing, both are recent enough that a bug counting them would move the week
  -- figure too. Assertion 4.
  ('50000000-0000-0000-0000-000000000007',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-done',
   now() - interval '10 minutes', null, null),
  ('50000000-0000-0000-0000-000000000008',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-done',
   now() - interval '6 hours', null, null),

  -- A run from BEFORE close_skill_run existed: old, and open forever. It is the
  -- earliest row u1 has, so first_measured_at must skip it. Assertion 9.
  ('50000000-0000-0000-0000-000000000009',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-commit',
   now() - interval '90 days', null, null);

-- u4's two agents, one per run below. PERSONAL agents (org_id null, which is what an
-- agent on a personal repository derives — see 20260727160000), so they match the org of
-- the runs that point at them. Two of them, and that is the whole point: an
-- implementation naming "an agent this user has" rather than "the agent of the last run"
-- passes with one and fails with two.
--
-- Both carry the GENERATED name the app spawns a terminal with ("claude 3") and the
-- TITLE the skills write as they go. The two differ on purpose: the column has to
-- report the title, and a fixture where they matched would pass either way.
insert into public.agents (id, org_id, owner_id, name, metadata)
values
  ('60000000-0000-0000-0000-000000000001', null,
   '44444444-4444-4444-4444-444444444444', 'claude 3',
   '{"title": "MAGIC-140 hooks"}'::jsonb),
  ('60000000-0000-0000-0000-000000000002', null,
   '44444444-4444-4444-4444-444444444444', 'claude 4',
   '{"title": "184:archiving fails silently"}'::jsonb);

-- u2's agent, with an EMPTY title — what the app writes for an agent nobody has named
-- yet, and the reason the function nullifs before it coalesces. Assertion 14.
insert into public.agents (id, org_id, owner_id, name, metadata)
values
  ('60000000-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222', 'claude 7', '{"title": ""}'::jsonb);

-- u4's whole history, and the reason it is a separate user: one closed run ten days ago
-- and one OPEN run an hour ago. Both dates are then unambiguous and neither depends on
-- what day the suite runs — the durations must come from the first, the last-use date
-- from the second, and no shared fixture could make those two the same row.
insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at, ended_at, outcome)
values
  ('50000000-0000-0000-0000-000000000040',
   null, '44444444-4444-4444-4444-444444444444', '60000000-0000-0000-0000-000000000001', 'magic-commit',
   now() - interval '10 days', now() - interval '10 days' + interval '30 minutes', 'success'),
  ('50000000-0000-0000-0000-000000000041',
   null, '44444444-4444-4444-4444-444444444444', '60000000-0000-0000-0000-000000000002', 'magic-resolve',
   now() - interval '1 hour', null, null);

-- u2's run, in u1's org, closed, this week: 300 minutes. Large enough that if it
-- leaked into u1's total the arithmetic could not accidentally still add up.
insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at, ended_at, outcome)
values
  ('50000000-0000-0000-0000-000000000020',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222',
   '60000000-0000-0000-0000-000000000020', 'magic-commit',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 8 hours',
   date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' + interval '2 days 13 hours',
   'success');

-- ===========================================================================
-- 1. The guard: no session, no answer.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{}';

select throws_ok(
  $sql$ select public.skill_hours('Europe/Paris') $sql$,
  'skill_hours requires an authenticated user',
  'skill_hours rejects a caller with no session'
);

reset role;

-- ===========================================================================
-- 2. anon cannot execute it at all.
-- ===========================================================================
select ok(
  not has_function_privilege('anon', 'public.skill_hours(text)', 'execute'),
  'anon cannot execute skill_hours'
);

-- ===========================================================================
-- 3..9. As u1.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 3 + 4 + 5 + 6, in one number: 195 min this week + 90 min earlier = 285 min. That
-- total holds only if the org run and the personal one are both in (3), the two open
-- runs and the ancient one are all out (4), the overlapping pair counts twice (5), and
-- u2's 300 minutes are absent (6). Any one of those failing lands elsewhere.
select is(
  (select total_seconds from public.skill_hours('Europe/Paris')),
  (285 * 60)::bigint,
  'sums closed runs across every scope, ignores open ones, counts concurrency twice, and excludes a teammate'
);

-- 7 + 8. The week holds the four runs inside it and neither of the two before it —
-- eight days back (out of a rolling window too) and last Sunday (out only if the week
-- is calendar-bounded).
select is(
  (select week_seconds from public.skill_hours('Europe/Paris')),
  (195 * 60)::bigint,
  'the week is Monday-to-Sunday, not a rolling seven days'
);

-- 8. The canary for p_tz, from a row and not a clock: a run 30 minutes into Monday in
-- Paris is still Sunday evening in UTC. Both totals below are the SAME rows read with
-- a different week boundary, so an ignored parameter makes them equal.
insert into public.skill_invocations (id, org_id, user_id, skill, occurred_at, ended_at, outcome)
select
  '50000000-0000-0000-0000-000000000030',
  null, '11111111-1111-1111-1111-111111111111', 'magic-start',
  paris_week + interval '30 minutes',
  paris_week + interval '50 minutes',
  'success'
from (
  select date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' as paris_week
) w;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select is(
  (select week_seconds from public.skill_hours('Europe/Paris')),
  (215 * 60)::bigint,
  'a run just after local midnight Monday is inside the Paris week'
);

select is(
  (select week_seconds from public.skill_hours('UTC')),
  (195 * 60)::bigint,
  'the same run is outside the UTC week — p_tz decides where Monday starts'
);

-- 11. An unknown zone falls back to UTC instead of raising.
select is(
  (select week_seconds from public.skill_hours('Mars/Olympus_Mons')),
  (195 * 60)::bigint,
  'an unknown timezone name falls back to UTC rather than failing the read'
);

-- 9. The earliest CLOSED run — last Monday minus eight days — and emphatically not the
-- 90-day-old row that never got an end.
select is(
  (select first_measured_at from public.skill_hours('Europe/Paris')),
  (select date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' - interval '8 days'),
  'first_measured_at is the first run with a duration, not the first run'
);

select ok(
  (select first_measured_at from public.skill_hours('Europe/Paris')) > now() - interval '30 days',
  'the 90-day-old run that was never closed does not date the total'
);

-- ===========================================================================
-- 10. As u3, who has never run anything.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- ONE row, not zero: the caller has to be able to tell "no runs" from "no week" and
-- both from a failed read, and it does that on the null date rather than on row count.
select is(
  (select count(*) from public.skill_hours('Europe/Paris')),
  1::bigint,
  'a user with no runs still gets exactly one row'
);

select is(
  (select total_seconds from public.skill_hours('Europe/Paris')),
  0::bigint,
  'and it reads zero rather than null'
);

select ok(
  (select first_measured_at is null from public.skill_hours('Europe/Paris')),
  'with a null date, which is how the caller says "nothing recorded yet"'
);

select ok(
  (select last_run_at is null from public.skill_hours('Europe/Paris')),
  'and a null last-use date, rather than an epoch or a today'
);

-- ===========================================================================
-- 12. As u4: one closed run ten days ago, one open run an hour ago.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';

-- The open run is the LAST USE even though it contributes no time. A last-use date that
-- ignored open runs would tell someone who launched a skill an hour ago and interrupted
-- it that they last used the app ten days ago — wrong about the one fact on the card
-- they can check themselves.
select ok(
  (select last_run_at from public.skill_hours('Europe/Paris')) > now() - interval '2 hours',
  'last_run_at counts an open run: starting a skill is using it'
);

-- And the measured period still begins at the closed one, so the two dates diverge by
-- design: last use can be more recent than anything the hours cover.
select ok(
  (select first_measured_at from public.skill_hours('Europe/Paris')) < now() - interval '9 days',
  'first_measured_at ignores that same open run'
);

select is(
  (select total_seconds from public.skill_hours('Europe/Paris')),
  (30 * 60)::bigint,
  'and the duration comes from the closed run alone'
);

-- ===========================================================================
-- 13. As u2, so u1's absent 300 minutes above is isolation and not an empty table.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

select is(
  (select total_seconds from public.skill_hours('Europe/Paris')),
  (300 * 60)::bigint,
  'u2 reads their own five hours, which u1 did not see'
);

-- u2's agent has an empty title, which is what the app writes for one nobody has named.
-- The generated name is then all there is to call it, and it is what the team page shows
-- for the same agent. A plain coalesce would take the empty string and print nothing.
select is(
  (select last_run_agent from public.skill_hours('Europe/Paris')),
  'claude 7',
  'an empty title falls back to the generated name rather than to blank'
);

-- ===========================================================================
-- 14. As u4 again: the agent NAMED is the one on the last run.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';

-- u4 owns two agents; the older run belongs to the other one. So this fails both for an
-- implementation that picks any agent of the caller's and for one that reads the FIRST
-- run rather than the last. The agent is personal (org_id null), which also exercises
-- the owner arm of the agents SELECT policy — this function is SECURITY INVOKER, and
-- without that arm a personal agent would be unreadable and the name would come back
-- null with nothing to explain why.
select is(
  (select last_run_agent from public.skill_hours('Europe/Paris')),
  '184:archiving fails silently',
  'last_run_agent is the TITLE of the last run''s agent, not its generated name'
);

-- ===========================================================================
-- 15. As u1: no agent on the last run, so no name.
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- Every one of u1's rows was seeded without an agent, which is what a skill run in a
-- terminal the app did not spawn looks like. NULL rather than an empty string: the card
-- prints the date alone for it, and only null gets it there.
select is(
  (select last_run_agent from public.skill_hours('Europe/Paris')),
  -- Cast, or `is()` cannot resolve its polymorphic argument from a bare NULL.
  null::text,
  'last_run_agent is null when the last run belonged to no agent'
);

reset role;

select * from finish();
rollback;
