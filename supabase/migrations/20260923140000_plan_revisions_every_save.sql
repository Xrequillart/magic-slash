-- Migration: plan_revisions — one revision per save, and the text a history starts from
--
-- 20260923120000 got two things wrong, and both showed on the first plan edited by hand:
--
--   * RUNS HID EDITS. A save by the same author within ten minutes of the last revision's
--     LATEST write was folded into it. The window slid with every autosave, so a person
--     going back to the spec every few minutes never produced a second revision: their
--     later edits vanished into the first one, and the history said nothing had happened
--     since. Folding is gone. Every save that changes the spec is a revision of its own,
--     which is what a reader of the history expects to find there.
--   * A LATE START READ AS A REWRITE. A plan written before the history existed has no
--     revision before its first save, so that save was diffed against an empty document:
--     five words added showed as the whole spec added. The first revision of a session now
--     keeps the spec it replaced, in `base_content`, and the app diffs it against that.
--     This is not the baseline row 20260923120000 declined: a row would have to name an
--     author and a source for a text nobody recorded, where a column on the revision says
--     only what the plan held before it, which the trigger reads off OLD.
--
-- Plans whose first revision has already absorbed later edits keep that revision as it is:
-- the text before it was never stored, so there is nothing to put back.
--
-- COST. Without folding, an autosave every few seconds while somebody types is a full copy
-- each time. The 8 MiB cap per session stays, and now counts `base_content` too: a 30 KiB
-- spec keeps its last ~270 revisions, and the app reads at most 200 of them.
--
-- The unchanged-spec rule is kept exactly: the app's re-uploads of the text it just saved
-- still record nothing.

alter table public.plan_revisions add column if not exists base_content text;

comment on column public.plan_revisions.base_content is
  'On a session''s first revision only: the spec it replaced, when the session held one '
  'before its history began. What that revision''s diff starts from. Null everywhere else, '
  'and on a revision that created its session.';

comment on table public.plan_revisions is
  'The revisions of a /magic:plan session''s spec: who, when, by hand or with a Claude '
  'agent, and the full text after each. Readable by whoever can read the session; written '
  'only by the record_revision trigger on plan_sessions, which copies the new spec as it is '
  'written, one revision per save, skips an unchanged spec and caps a session at 8 MiB.';

create or replace function public.plan_sessions_record_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_source text := 'human';
  v_agent_id uuid;
  v_agent_name text;
  v_headers text;
  v_base text;
begin
  if v_uid is null or new.spec is null or new.spec_oversize is true then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.spec is not distinct from new.spec then
    return null;
  end if;

  -- The source, as the request states it — unchanged from 20260923120000.
  if new.owner_id = v_uid then
    v_headers := nullif(current_setting('request.headers', true), '');
    if v_headers is not null then
      begin
        if (v_headers::json ->> 'x-magic-plan-source') = 'agent' then
          v_source := 'agent';
        end if;
      exception when others then
        v_source := 'human';
      end;
    end if;
  end if;

  if v_source = 'agent' then
    v_agent_id := new.agent_id;
    select left(a.name, 200) into v_agent_name from public.agents a where a.id = v_agent_id;
  end if;

  -- The session's first revision starts from what it replaces. Only on an UPDATE: an
  -- INSERT replaces nothing.
  if tg_op = 'UPDATE' and old.spec is not null
     and not exists (select 1 from public.plan_revisions r where r.session_id = new.id) then
    v_base := old.spec;
  end if;

  insert into public.plan_revisions (session_id, author_id, source, agent_id, agent_name, content, base_content)
  values (new.id, v_uid, v_source, v_agent_id, v_agent_name, new.spec, v_base);

  -- Retention, as before, with the base counted in the total.
  delete from public.plan_revisions
   where id in (
     select ranked.id
       from (
         select r.id,
                row_number() over w as rn,
                sum(octet_length(r.content) + coalesce(octet_length(r.base_content), 0)) over w as running
           from public.plan_revisions r
          where r.session_id = new.id
         window w as (order by r.updated_at desc, r.created_at desc, r.id desc
                      rows between unbounded preceding and current row)
       ) ranked
      where ranked.rn > 1 and ranked.running > 8 * 1048576
   );

  return null;
end;
$$;

comment on function public.plan_sessions_record_revision() is
  'Record a plan session''s new spec as a revision by auth.uid(): ''agent'' when the owner''s '
  'request carries x-magic-plan-source: agent (with the session''s agent), ''human'' '
  'otherwise. One revision per save; the first keeps the spec it replaced in base_content. '
  'Skips a write with no user, an unchanged, null or oversize spec; prunes past 8 MiB per '
  'session. Trigger-only.';

revoke execute on function public.plan_sessions_record_revision() from public;
