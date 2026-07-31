-- "Abandoned" now requires evidence that the client could have reported an ending.
--
-- THE BUG THIS FIXES
-- ---------------------------------------------------------------------------
-- 20260801090000 defined an abandoned run as one still open after four hours. Applied
-- literally, that is true of EVERY row written before end-reporting existed: they have
-- no `ended_at` because nothing could set one, not because anybody gave up. The
-- moment the outcome columns shipped, the entire history reclassified itself as
-- abandoned work.
--
-- The same holds going forward for anyone who has not updated. The closing signal
-- comes from the last step of each SKILL.md, so a user on an older copy of the skills
-- — or on a Claude Code with no magic-slash skills installed at all — emits starts and
-- never ends. Judging them by a rule their client cannot satisfy would report the
-- people slowest to update as the people who never finish anything, which is both
-- wrong and exactly the kind of number that gets quoted at somebody.
--
-- WHY EVIDENCE RATHER THAN A CUTOFF DATE
-- ---------------------------------------------------------------------------
-- A hardcoded "tracking started on" timestamp was the obvious fix and is the wrong
-- one: there is no single date. Migrations reach the database the day they are
-- pushed, while the SKILL.md that closes a run reaches each user whenever they next
-- update, which is a different day for every person and never for some.
--
-- So the rule asks the data instead. If a user has EVER closed a run, their client
-- can report endings, and one of their runs left open is a real abandonment. If they
-- never have, the state of their runs is unknown and this says so by counting none of
-- them. It needs no configuration, it is right on the day it ships, and it corrects
-- itself per user the moment they update.
--
-- The cost is a deliberate one-off under-count: the first user's genuinely abandoned
-- runs stay uncounted until they complete one. Under-reporting an accusation is the
-- right direction to err, and it is the same reasoning as the org attribution in
-- CloudStore.eventOrgId — invented activity is invisible, missing activity is not.
--
-- `bool_or(...) over (partition by user_id)` rather than a correlated EXISTS: one
-- pass, and the window is evaluated over the whole row set the caller may read, so
-- evidence from a user's personal runs still counts when the caller is looking at one
-- org's. Whether that client reports endings is a property of the client, not of the
-- organisation being viewed.

create or replace view public.skill_run_facets
with (security_invoker = true) as
select
  si.org_id,
  si.user_id,
  si.agent_id,
  regexp_replace(si.skill, '^.*:', '') as skill,
  si.occurred_at,
  si.ended_at is not null as is_completed,
  si.ended_at is null
    and si.occurred_at < now() - interval '4 hours'
    and bool_or(si.ended_at is not null) over (partition by si.user_id) as is_abandoned,
  case
    when si.ended_at is not null
    then (extract(epoch from (si.ended_at - si.occurred_at)) * 1000)::bigint
  end as duration_ms
from public.skill_invocations si;

comment on view public.skill_run_facets is
  'One row per skill run with its plugin prefix folded and its state resolved '
  '(completed / abandoned / unknown) plus its duration. A run counts as abandoned '
  'only if its author has closed a run at some point, which is the evidence their '
  'client can report endings at all — otherwise the outcome is unknown, not given up. '
  'SECURITY INVOKER: it grants nothing, each caller sees only what skill_invocations '
  'RLS allows them.';
