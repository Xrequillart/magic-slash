-- Migration: skill_hours — how long the caller has actually spent inside the skills
--
-- The three existing rollups (org_skill_counts, personal_skill_counts,
-- admin_org_skill_counts) all answer "how many times", which is the wrong unit for the
-- one number a user recognises as their own: the hours. A count says the cycle is being
-- used; hours say what it cost. This function is that other question, and it is a
-- fourth function rather than a column added to the other three because it aggregates a
-- different set of rows — see WHICH RUNS COUNT below.
--
-- WHICH RUNS COUNT, and why the total is a FLOOR
-- ---------------------------------------------------------------------------
-- Only CLOSED runs (ended_at is not null). 20260801090000 explains the shape: the
-- guaranteed PreToolUse signal opens the row, the voluntary end-of-skill signal closes
-- it, and a run that is never closed is classified rather than lost — running if
-- recent, abandoned past four hours. An abandoned run has no end, so it has no
-- duration, so it contributes NOTHING here. Two consequences a reader of these numbers
-- has to know:
--
--   * the total under-reports, always. It is the time the skills are known to have
--     spent, never the time they did spend. Presented as an exact total it would be
--     wrong; presented as "at least this much" it is sound.
--   * one run can contribute at most four hours, because close_skill_run refuses to
--     attach an end outside that window. A genuinely longer session is truncated to
--     the part that could be proved.
--
-- Runs from before 20260801090000 have no ended_at at all — nothing could have written
-- one — so they weigh zero however long they really took. That is why this function
-- returns first_measured_at (the first run that HAS a duration) rather than the first
-- run: a caller that printed "N hours since <first ever run>" would be spreading a
-- measured total over a period that was mostly unmeasured, and the honest read of the
-- number is the period it actually covers.
--
-- SUMMED, NOT UNIONED
-- ---------------------------------------------------------------------------
-- Three agents running for one hour each in the same hour is THREE hours here, not
-- one. The unit is skill-time, the same way a build farm reports CPU-hours: it measures
-- work done, and running more agents at once is precisely how a user does more of it.
-- The wall-clock reading (union the intervals, count that hour once) is a different and
-- also-valid number, deliberately not this one — mixing them in a single figure would
-- make it comparable to neither.
--
-- EVERY SCOPE, one person
-- ---------------------------------------------------------------------------
-- All of the caller's runs, personal and organizational together, because this answers
-- "how long have I spent on this" and a user does not experience their day split by
-- which repository an agent happened to touch. This is what makes it a fourth function
-- and not a parameter on personal_skill_counts, whose whole definition is the org_id
-- IS NULL half.
--
-- SECURITY INVOKER, like both sibling rollups, so the RLS policy on skill_invocations
-- is the only gate. But note the difference: that policy also exposes a TEAMMATE's rows
-- to an org member, so `user_id = auth.uid()` below is load-bearing rather than
-- belt-and-braces. Removing it would silently turn one person's hours into their whole
-- organization's.

-- Serves this function's only query: the caller's closed runs, and the week window
-- inside them. The existing indexes are on org_id and skill, and 20260801090000's is
-- the complement of this one (where ended_at IS null), so neither helps here.
create index if not exists idx_skill_invocations_closed
  on public.skill_invocations (user_id, occurred_at)
  where ended_at is not null;

-- ---------------------------------------------------------------------------
-- WHY p_tz IS A PARAMETER
-- ---------------------------------------------------------------------------
-- "This week" has to mean Monday 00:00 to Sunday 23:59 where the USER is, not a rolling
-- seven days and not a week that starts in another timezone. date_trunc('week', ...)
-- already lands on Monday — ISO-8601 weeks, Postgres has no first-day-of-week setting to
-- get wrong — but it truncates in the SESSION's timezone, which for a PostgREST
-- connection is UTC. Left alone, a user in Paris would see their week begin Sunday at
-- 21:00 and every Sunday-evening run would count towards the week that had just ended.
--
-- So the caller passes its own zone (the browser's
-- Intl.DateTimeFormat().resolvedOptions().timeZone) and the boundary is computed in it:
-- convert now() into local wall-clock, truncate there, convert the result back to an
-- instant. An unknown zone name falls back to UTC instead of raising: the server's tz
-- database can legitimately be older than the client's, and a week boundary a few hours
-- off is a far better failure than a banner that cannot render at all.

create or replace function public.skill_hours(p_tz text default 'UTC')
returns table (
  total_seconds     bigint,
  week_seconds      bigint,
  first_measured_at timestamptz
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_tz         text;
  v_week_start timestamptz;
begin
  if auth.uid() is null then
    raise exception 'skill_hours requires an authenticated user';
  end if;

  v_tz := case
            when p_tz is not null
             and exists (select 1 from pg_timezone_names where name = p_tz)
            then p_tz
            else 'UTC'
          end;

  v_week_start := date_trunc('week', now() at time zone v_tz) at time zone v_tz;

  -- No GROUP BY, so this returns exactly one row even for a user with no runs at all:
  -- zero, zero, and a null date. A caller can then distinguish "nothing recorded yet"
  -- (null date) from "recorded, but nothing this week" (a date and a zero week) without
  -- a second query — they are different sentences on screen.
  --
  -- filter rather than a second scan for the week: same rows, read once.
  return query
    select
      coalesce(extract(epoch from sum(si.ended_at - si.occurred_at)), 0)::bigint,
      coalesce(
        extract(
          epoch from sum(si.ended_at - si.occurred_at)
            filter (where si.occurred_at >= v_week_start)
        ),
        0
      )::bigint,
      min(si.occurred_at)
    from public.skill_invocations si
    where si.user_id = auth.uid()
      and si.ended_at is not null;
end;
$$;

revoke execute on function public.skill_hours(text) from public, anon;
grant execute on function public.skill_hours(text) to authenticated;

comment on function public.skill_hours(text) is
  'Total and current-week skill time for the CALLING user, across every scope, in '
  'seconds — plus the date of their first MEASURED run. Sums (ended_at - occurred_at) '
  'over closed runs only, so it is a floor: an abandoned run has no duration and one '
  'run contributes at most four hours. Concurrent runs are summed, not unioned. '
  'p_tz is an IANA zone name and sets where the Monday-to-Sunday week begins; an '
  'unknown name falls back to UTC.';
