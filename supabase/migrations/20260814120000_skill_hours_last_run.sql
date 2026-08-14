-- Migration: skill_hours gains last_run_at — when the caller last USED a skill
--
-- WHY THIS IS A SECOND MIGRATION AND NOT AN EDIT TO 20260814110000
-- ---------------------------------------------------------------------------
-- Because that one is already applied. `supabase db push` compares the VERSIONS
-- recorded in supabase_migrations.schema_migrations, never the contents of the files,
-- so editing an applied migration is silent: the push reports nothing to do, the
-- database keeps the old definition, and the repository and the deployment disagree
-- with no error anywhere to say so. That is exactly what happened here — the front end
-- read a column the deployed function did not return and rendered an em dash. Applied
-- migrations are history; changes go in a new file.
--
-- WHY IT DROPS THE FUNCTION FIRST
-- ---------------------------------------------------------------------------
-- Adding an OUT column changes the function's return TYPE, and `create or replace`
-- refuses that outright ("cannot change return type of existing function"). A drop is
-- the only way through. Both statements live in this one migration, so they are applied
-- together and no committed state has skill_invocations without its reader.
--
-- DROP also takes the function's PRIVILEGES with it, which is why the revoke and the
-- grant are repeated below rather than assumed to have survived from 20260814110000.
-- Omitting them would leave a function `authenticated` cannot execute, which reads to a
-- client exactly like the RLS refusal it is not.
--
-- WHAT last_run_at MEANS, and why it does not obey the floor the durations do
-- ---------------------------------------------------------------------------
-- The two durations can only come from runs that were CLOSED — that is what a duration
-- is here (see 20260801090000). "When did I last use this" cannot: the answer is the
-- last time a skill STARTED, whether or not it reported finishing. Someone who launched
-- /magic:resolve an hour ago and interrupted it used the skills an hour ago, and a card
-- dating their last use to the previous day because the run went unclosed would be
-- wrong about the one fact on it they can personally check.
--
-- So the filters move from the WHERE clause onto the aggregates: the sums and the start
-- date see closed runs, last_run_at sees every one. The deliberate consequence is that
-- last_run_at can be MORE RECENT than the period the hours cover. That is the honest
-- shape of this data, not a discrepancy to paper over.
--
-- Everything else is unchanged from 20260814110000, whose header remains the reference
-- for the scope (the caller's own runs, every scope), the summing convention (concurrent
-- runs add up rather than merging), and the p_tz week boundary.

-- Not partial on `ended_at is not null` any more: last_run_at reads EVERY row of the
-- caller's, so the scan cannot be restricted and a partial index would leave it half
-- covered.
create index if not exists idx_skill_invocations_user_time
  on public.skill_invocations (user_id, occurred_at);

-- Superseded by the index above, which is its superset. Kept nothing else alive: it was
-- created by 20260814110000 for this function alone.
drop index if exists public.idx_skill_invocations_closed;

drop function if exists public.skill_hours(text);

create function public.skill_hours(p_tz text default 'UTC')
returns table (
  total_seconds     bigint,
  week_seconds      bigint,
  first_measured_at timestamptz,
  last_run_at       timestamptz
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
  -- zero, zero, and two null dates. A caller can then distinguish "nothing recorded
  -- yet" (null dates) from "recorded, but nothing this week" (a date and a zero week)
  -- without a second query — they are different sentences on screen.
  --
  -- Four aggregates over ONE scan of the user's rows, each with the filter it needs,
  -- rather than four passes over the same index.
  return query
    select
      coalesce(
        extract(
          epoch from sum(si.ended_at - si.occurred_at) filter (where si.ended_at is not null)
        ),
        0
      )::bigint,
      coalesce(
        extract(
          epoch from sum(si.ended_at - si.occurred_at)
            filter (where si.ended_at is not null and si.occurred_at >= v_week_start)
        ),
        0
      )::bigint,
      min(si.occurred_at) filter (where si.ended_at is not null),
      max(si.occurred_at)
    from public.skill_invocations si
    where si.user_id = auth.uid();
end;
$$;

revoke execute on function public.skill_hours(text) from public, anon;
grant execute on function public.skill_hours(text) to authenticated;

comment on function public.skill_hours(text) is
  'Total and current-week skill time for the CALLING user, across every scope, in '
  'seconds — plus the date of their first MEASURED run and of their LAST run of any '
  'kind. Sums (ended_at - occurred_at) over closed runs only, so the durations are a '
  'floor: an abandoned run has no duration and one run contributes at most four hours. '
  'Concurrent runs are summed, not unioned. last_run_at counts open runs too, since '
  '"when did I last use this" is about starting a skill rather than finishing one, and '
  'may therefore be more recent than the measured period. p_tz is an IANA zone name and '
  'sets where the Monday-to-Sunday week begins; an unknown name falls back to UTC.';
