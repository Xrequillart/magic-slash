-- Migration: plan_sessions.status — `in_progress`, for a plan being implemented
--
-- 20260923150000 held a status set by hand to the four the app drew: planning, planned,
-- done, abandoned. Between "the tickets are filed" and "it is done" there was no word for
-- the weeks the plan is actually being built, so the app now draws a fifth, `in_progress`,
-- and a hand may set it. `plan_sessions_hold_status` is 20260923150000's function verbatim
-- but for the list.

create or replace function public.plan_sessions_hold_status()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.status_by_hand := old.status_by_hand;
  if new.status is not distinct from old.status or auth.uid() is null or current_user <> 'authenticated' then
    return new;
  end if;

  if public.plan_request_is_agent(old.owner_id) then
    if old.status_by_hand then
      new.status := old.status;
    end if;
    return new;
  end if;

  if new.status not in ('planning', 'planned', 'in_progress', 'done', 'abandoned') then
    -- 22023, invalid_parameter_value.
    raise exception 'unknown plan status: %', new.status using errcode = '22023';
  end if;
  new.status_by_hand := true;
  return new;
end;
$$;

comment on function public.plan_sessions_hold_status() is
  'Keep a status set by hand against the planner agent''s uploads, mark a hand-set status '
  'as such, and hold a hand to the five statuses the app draws. Trigger-only.';

revoke execute on function public.plan_sessions_hold_status() from public;
