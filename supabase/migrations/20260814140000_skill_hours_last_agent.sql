-- Migration: skill_hours gains last_run_agent — WHICH agent the last run belonged to
--
-- The card's third figure is a date and nothing else, which answers "when" and leaves
-- "on what" unanswered. The agent's name is the one word that turns a date into a
-- memory: "12/06/2026" says little, "12/06/2026 · MAGIC-182 pagination" is recognised
-- instantly by the person who lived it.
--
-- A THIRD MIGRATION, for the reason 20260814120000 states at length: 20260814110000 and
-- 20260814120000 are applied, and `supabase db push` compares the VERSIONS recorded in
-- supabase_migrations.schema_migrations, never file contents. Editing either would be
-- silent — the push reports nothing to do, the deployed function keeps its old shape,
-- and the front end reads a column that is not there. Applied migrations are history.
--
-- Same reason as last time for the DROP: adding an OUT column changes the return type,
-- and `create or replace` refuses that outright. The revoke and the grant are repeated
-- because DROP takes the privileges with it, and a function `authenticated` cannot
-- execute looks to a client exactly like the RLS refusal it is not.
--
-- WHY A SCALAR SUBQUERY RATHER THAN A JOIN
-- ---------------------------------------------------------------------------
-- The four aggregates scan the caller's rows once, and joining agents into that scan
-- would resolve a name for every row in a history to keep exactly one. The subquery
-- below walks idx_skill_invocations_user_time backwards and stops at the first row —
-- the same row `max(si.occurred_at)` reports — then resolves that one agent.
--
-- LEFT JOIN, and every one of its nulls is a real case rather than a defensive habit:
--   * agent_id NULL — a skill run in a terminal the app did not spawn belongs to no
--     agent (see 20260727180000).
--   * the agent was deleted — the FK is `on delete set null (agent_id)`, so the run
--     survives its agent and keeps its hours.
--   * the agent is not READABLE. This function is SECURITY INVOKER, so agents' RLS
--     applies: the owner arm added in 20260727160000 is what makes a personal agent
--     visible to its owner here. A name the caller could not select is simply absent.
-- The front end prints the date alone in all three, which is what it did before this
-- column existed.
--
-- ARCHIVED AGENTS STILL ANSWER. Closing an agent stamps archived_at and hides it from
-- the roster, but its runs and their hours remain the user's, so the name of an agent
-- they closed last month is still the right label for what they did with it. No
-- archived_at filter, deliberately.
--
-- Everything else is unchanged from 20260814120000, which remains the reference for
-- what the durations count, why last_run_at does not obey the same floor, and how p_tz
-- decides where the week begins.

drop function if exists public.skill_hours(text);

create function public.skill_hours(p_tz text default 'UTC')
returns table (
  total_seconds     bigint,
  week_seconds      bigint,
  first_measured_at timestamptz,
  last_run_at       timestamptz,
  last_run_agent    text
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
  -- zero, zero, and three nulls. A caller can then distinguish "nothing recorded yet"
  -- (null dates) from "recorded, but nothing this week" (a date and a zero week)
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
      max(si.occurred_at),
      -- The agent of the row `max(si.occurred_at)` just reported. `id desc` only decides
      -- ties, which the timestamp cannot: two runs launched in the same instant would
      -- otherwise name whichever agent the scan happened to reach first, and the column
      -- would flicker between two answers that are both "the last run".
      (
        select a.name
          from public.skill_invocations s2
          left join public.agents a on a.id = s2.agent_id
         where s2.user_id = auth.uid()
         order by s2.occurred_at desc, s2.id desc
         limit 1
      )
    from public.skill_invocations si
    where si.user_id = auth.uid();
end;
$$;

revoke execute on function public.skill_hours(text) from public, anon;
grant execute on function public.skill_hours(text) to authenticated;

comment on function public.skill_hours(text) is
  'Total and current-week skill time for the CALLING user, across every scope, in '
  'seconds — plus the date of their first MEASURED run, the date of their LAST run of '
  'any kind, and the name of the agent that last run belonged to. Sums '
  '(ended_at - occurred_at) over closed runs only, so the durations are a floor: an '
  'abandoned run has no duration and one run contributes at most four hours. Concurrent '
  'runs are summed, not unioned. last_run_at counts open runs too, since "when did I '
  'last use this" is about starting a skill rather than finishing one, and may therefore '
  'be more recent than the measured period. last_run_agent is NULL when that run had no '
  'agent, when the agent has since been deleted, or when the caller cannot read it; '
  'archived agents still answer. p_tz is an IANA zone name and sets where the '
  'Monday-to-Sunday week begins; an unknown name falls back to UTC.';
