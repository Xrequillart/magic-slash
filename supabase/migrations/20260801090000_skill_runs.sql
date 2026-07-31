-- Skill invocations become skill RUNS: a start and an end, on one row.
--
-- WHAT WAS WRONG
-- ---------------------------------------------------------------------------
-- The row was written by a PreToolUse hook, which fires BEFORE the skill body runs.
-- It therefore counted intentions, not work: a skill the user interrupted, one whose
-- permission prompt was declined, one Claude opened and immediately abandoned, all
-- landed as a completed run. And because the row was written once and never touched
-- again, there was no duration, no outcome, and no way to tell a five-second misfire
-- from a forty-minute /magic:resolve.
--
-- WHY NOT SIMPLY RECORD AT THE END INSTEAD
-- ---------------------------------------------------------------------------
-- Because there is no "skill finished" hook to record from. PostToolUse on the Skill
-- tool fires when the skill's INSTRUCTIONS are loaded, not when its workflow
-- completes; the only thing that knows a skill is done is the skill itself, reporting
-- voluntarily. Moving the whole record onto that signal would mean every interrupted
-- run vanished from the data — trading a known over-count for a silent under-count,
-- and losing the abandonment rate, which is the more interesting of the two numbers.
--
-- So the guaranteed signal opens the row and the voluntary one closes it. A run that
-- is never closed is not lost, it is CLASSIFIED.
--
-- THE THREE STATES, which the read functions must agree on:
--   completed  ended_at is not null
--   abandoned  ended_at is null and occurred_at < now() - interval '4 hours'
--   running    otherwise
-- No sweeper job promotes the second to a stored state: a cron that had not run yet
-- would make the same row read differently in two places, and the rule is one line of
-- SQL wherever it is needed.

alter table public.skill_invocations
  add column if not exists ended_at timestamptz,
  add column if not exists outcome  text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skill_invocations_outcome_check'
  ) then
    alter table public.skill_invocations
      add constraint skill_invocations_outcome_check
      check (outcome is null or outcome in ('success', 'failed', 'cancelled'));
  end if;
end $$;

-- Serves the lookup in close_skill_run, which is the only hot path over these columns.
create index if not exists idx_skill_invocations_open
  on public.skill_invocations (user_id, occurred_at desc)
  where ended_at is null;

comment on column public.skill_invocations.ended_at is
  'When the skill reported it had finished. NULL means it never did: still running if '
  'recent, abandoned once older than 4 hours. Duration is ended_at - occurred_at; it is '
  'deliberately not stored, because a stored copy can disagree with its own inputs.';
comment on column public.skill_invocations.outcome is
  'How the run ended, as the skill reported it. NULL while open.';

-- ---------------------------------------------------------------------------
-- close_skill_run
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER with an explicit auth.uid() guard, rather than granting UPDATE on
-- the table. skill_invocations is append-only by design (grant select, insert) and
-- staying that way matters: this is the ONE mutation anyone may perform on it, it can
-- only ever set an end on a row that has none, and it cannot touch another user's
-- rows. A grant plus an UPDATE policy would open the whole row to rewriting to
-- achieve the same thing.
--
-- WHICH ROW IT CLOSES
-- ---------------------------------------------------------------------------
-- The most recent still-open run of the same skill for the same user and agent. The
-- caller cannot name the row: the id lives in the database, while the closing signal
-- comes from a shell line inside a SKILL.md that never saw it.
--
-- p_occurred_at is when the skill actually FINISHED, and it does two jobs. It becomes
-- ended_at, so a close that was queued offline for an hour does not inflate the
-- duration by an hour. And it bounds the search: a run that started AFTER the skill
-- ended cannot be the one that ended, which is what stops a replayed close from
-- attaching itself to a later run of the same skill.
--
-- The lower bound is the abandonment threshold. A run already old enough to read as
-- abandoned everywhere else must not be resurrected here, or the same row would be
-- abandoned in one query and completed in the next.
--
-- The skill name is folded (regexp_replace) on BOTH sides: the hook records whatever
-- Claude Code reports, which is 'magic-slash:magic-pr' for a plugin install, while a
-- SKILL.md closes under its own bare name. Comparing them raw would leave every
-- plugin user's runs permanently open.
--
-- Returns false rather than raising when nothing matches. A skill that ran before this
-- version, or whose start was never recorded, still ends cleanly — the close is
-- telemetry, and telemetry may not fail a user's workflow.

create or replace function public.close_skill_run(
  p_agent_id    uuid,
  p_skill       text,
  p_outcome     text,
  p_occurred_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'close_skill_run requires an authenticated user';
  end if;

  if p_outcome not in ('success', 'failed', 'cancelled') then
    raise exception 'close_skill_run: unknown outcome %', p_outcome;
  end if;

  select id into v_id
  from public.skill_invocations
  where user_id = auth.uid()
    and ended_at is null
    -- `is not distinct from` so an agentless close matches an agentless start:
    -- agent_id = null would be NULL and match nothing.
    and agent_id is not distinct from p_agent_id
    and regexp_replace(skill, '^.*:', '') = regexp_replace(p_skill, '^.*:', '')
    and occurred_at <= p_occurred_at
    and occurred_at > p_occurred_at - interval '4 hours'
  order by occurred_at desc
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.skill_invocations
  set ended_at = p_occurred_at,
      outcome  = p_outcome
  where id = v_id;

  return true;
end;
$$;

revoke execute on function public.close_skill_run(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.close_skill_run(uuid, text, text, timestamptz) to authenticated;

comment on function public.close_skill_run(uuid, text, text, timestamptz) is
  'Close the most recent open run of one skill for the calling user, recording when it '
  'ended and how. SECURITY DEFINER because skill_invocations grants no UPDATE: this is '
  'the only permitted mutation, guarded on auth.uid(). Returns false when there is no '
  'matching open run, which is not an error.';
