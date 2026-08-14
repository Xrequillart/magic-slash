-- Migration: last_run_agent reports the agent's TITLE, not its generated name
--
-- 20260814140000 returned `agents.name`, which is the name the app generates when a
-- terminal is spawned — "claude 4". It identifies the agent to the app and says nothing
-- whatsoever to the person reading the card. What a human recognises is the title the
-- skills write as they go ("184:archiving fails silently"), which lives in
-- `agents.metadata->>'title'`.
--
-- SAME RULE AS EVERYWHERE ELSE IN THE PRODUCT, deliberately. `webapp/lib/team.ts`
-- already names an agent `meta.title || row.name` for the team page, and the desktop
-- shows the same title on the agent card. Picking a different rule here would mean the
-- same agent is called two different things on two screens of the same app.
--
-- `nullif(…, '')` is what makes the `||` of that TypeScript translate faithfully: the
-- app writes an EMPTY STRING for a title nobody has set yet, not a null, so a plain
-- coalesce would print nothing at all and read as a missing name rather than as an
-- untitled agent.
--
-- The fallback to `name` is kept for the same consistency reason: an agent started
-- without a ticket has nothing else to be called, and "claude 4" is at least what the
-- app itself calls it on every other screen.
--
-- CREATE OR REPLACE, no drop this time: the signature and every OUT column are
-- unchanged, only the expression behind one of them moves. That also means the
-- privileges survive, so the revoke/grant pair of the last two migrations is not
-- repeated here — there is nothing to restore.

create or replace function public.skill_hours(p_tz text default 'UTC')
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
        select coalesce(nullif(a.metadata->>'title', ''), a.name)
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

comment on function public.skill_hours(text) is
  'Total and current-week skill time for the CALLING user, across every scope, in '
  'seconds — plus the date of their first MEASURED run, the date of their LAST run of '
  'any kind, and the title of the agent that last run belonged to. Sums '
  '(ended_at - occurred_at) over closed runs only, so the durations are a floor: an '
  'abandoned run has no duration and one run contributes at most four hours. Concurrent '
  'runs are summed, not unioned. last_run_at counts open runs too, since "when did I '
  'last use this" is about starting a skill rather than finishing one, and may therefore '
  'be more recent than the measured period. last_run_agent is metadata->>''title'' '
  'falling back to the generated agents.name, the same rule the team page uses; it is '
  'NULL when that run had no agent, when the agent has since been deleted, or when the '
  'caller cannot read it, and archived agents still answer. p_tz is an IANA zone name '
  'and sets where the Monday-to-Sunday week begins; an unknown name falls back to UTC.';
