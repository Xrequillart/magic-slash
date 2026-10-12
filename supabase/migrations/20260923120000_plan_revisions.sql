-- Migration: plan_revisions — who changed a plan's spec, when, and with which hands
--
-- Since 20260923100000 a plan's text has more than one writer: the author's agent uploads
-- it from the spec file, and the author or any member of the organization edits it from the
-- app. `plan_sessions.spec` holds only the last word, so a reader who finds a section
-- rewritten has no way to tell whether a colleague did it by hand, the planner's agent did
-- it, or it has always said that. This table is the answer: one row per revision of the
-- spec, with its author, its SOURCE (`human` or `agent`), and the agent's name when there
-- was one.
--
-- WRITTEN BY A TRIGGER ON `plan_sessions`, NEVER BY A CLIENT. `authenticated` holds SELECT
-- only, the way `settings_events` (20260801110000) does it: a history the clients it records
-- could write into is a history nobody can trust. The revision is written by the very
-- statement that changes the spec, in the same transaction, and everything about it is read
-- off that statement rather than taken from the caller:
--
--   * THE CONTENT IS THE ROW'S NEW SPEC. A revision cannot claim a text the plan never held,
--     and it cannot claim somebody else's either. A function the app would call after each
--     save was considered and left out: it could only copy whatever the row held WHEN it
--     was called, so an agent upload landing between a person's save and that person's
--     call would be recorded under the person's name, as `human`, and the agent's own call
--     would then find nothing new to record. It would also take the source on the caller's
--     word. In the trigger there is no "between", and no word to take.
--   * THE AUTHOR IS `auth.uid()`, the user the write ran as — the owner or a member, as the
--     policies and `guard_member_edit` (20260923100000) already decided.
--   * THE SOURCE IS `human` UNLESS PROVEN OTHERWISE. It is `agent` only when the request
--     says so — the author's app sends `x-magic-plan-source: agent` on the spec file's
--     upload (CloudStore.upsertPlanSession), and PostgREST hands every request header to
--     the transaction as `request.headers` — AND the writer is the plan's owner. Only the
--     owner's app runs the planner; a member sending the header is recorded as `human`,
--     not refused, because the save itself was legitimate and only the label was not. The
--     owner could still label a hand edit of their own as the agent's: harmless next to
--     the threat this closes, which is a colleague passing their edit off as the planner's.
--   * THE AGENT IS THE SESSION'S OWN (`plan_sessions.agent_id`), never one the caller
--     names, and its name is copied off `agents` at that moment.
--   * AN UNCHANGED SPEC RECORDS NOTHING, natively: the trigger fires on `spec` and records
--     only when the new value differs from the old. This is load-bearing, not a nicety: the
--     author's app re-uploads the spec file on every launch reconcile, after an offline
--     replay, and right after an in-app save rewrites the file — each of those arrives on
--     the AGENT path, and without the comparison every one of them would be recorded as the
--     agent rewriting what a person just wrote.
--   * A WRITE WITH NO USER RECORDS NOTHING. A migration, the SQL console, the service role:
--     none carries a `sub`, so there is no author to name and no app whose word the source
--     could rest on. Recording such a write would open the history on an anonymous revision
--     it cannot explain; leaving it out means the next real save shows it as a diff.
--   * EDITS IN A RUN ARE ONE REVISION. The app autosaves every few seconds while somebody
--     types; recording each save would bury one paragraph under forty rows. A save by the
--     same author, from the same source (and the same agent), within ten minutes of the
--     last revision's latest write is folded into it — its content and `updated_at` move,
--     `created_at` stays where the run began.
--   * BOUNDED. The spec is up to 1 MiB (MAX_SPEC_BYTES, desktop/src/main/store/spec-file.ts)
--     and every revision is a full copy, so a long-lived plan could otherwise grow without
--     end. The oldest revisions are pruned while a session's revisions exceed 8 MiB in
--     total; the newest one is always kept.
--
-- NO STORED SUMMARY. A "what changed" line was considered and left out on purpose: with
-- coalescing, a summary computed by the client at save time would describe the delta
-- against the revision it is folded into, i.e. against itself. What changed is computed
-- when it is asked for, as a diff between two revisions (the app's `plans:history:diff`).
--
-- FULL COPIES, NOT DELTAS. A delta chain is smaller and makes every read a replay; the diff
-- view needs any two revisions side by side, and the retention cap above keeps the copies
-- affordable.
--
-- DELETING A PLAN DELETES ITS HISTORY (`on delete cascade`). Deleting an ACCOUNT does not
-- delete the revisions it wrote on a plan that survives: `author_id` is set null, and the
-- history keeps saying that the text changed, without a name.
--
-- NO BACKFILL. A plan written before this migration starts its history at its next save, so
-- that first revision shows in full rather than as a diff. Seeding a baseline was considered
-- and left out: nothing recorded who wrote the text since 20260923100000, and a baseline
-- would have to pick `human` or `agent` for it. A history that starts late is honest; one
-- that opens on a guess is not.

create table if not exists public.plan_revisions (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: a revision has no meaning without the plan it is a revision of.
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- on delete set null: see the header — the change happened, whoever made it left.
  author_id uuid references auth.users (id) on delete set null,
  -- Typed by hand in the app, or written by the planner's agent. An enum in all but name:
  -- unlike `plan_links.kind` there is no third answer a newer build could invent.
  source text not null,
  -- The agent, while it exists. on delete set null: an agent is archived and deleted long
  -- before the plan it wrote stops mattering.
  agent_id uuid references public.agents (id) on delete set null,
  -- The agent's name AT THE TIME, copied rather than joined: the agent may be archived,
  -- deleted, or simply not readable by the teammate looking at the history.
  agent_name text,
  -- The whole spec after this revision. See "FULL COPIES" above.
  content text not null,
  created_at timestamptz not null default now(),
  -- Moves when a later save is coalesced into this revision. The history is ordered by it.
  updated_at timestamptz not null default now(),
  constraint plan_revisions_source check (source in ('human', 'agent')),
  -- A hand edit names no agent. Held by the table so a bug in the trigger cannot make one
  -- revision read as both.
  constraint plan_revisions_human_no_agent check (source = 'agent' or (agent_id is null and agent_name is null)),
  constraint plan_revisions_agent_name_length check (agent_name is null or char_length(agent_name) <= 200)
);

comment on table public.plan_revisions is
  'The revisions of a /magic:plan session''s spec: who, when, by hand or with a Claude '
  'agent, and the full text after each. Readable by whoever can read the session; written '
  'only by the record_revision trigger on plan_sessions, which copies the new spec as it is '
  'written, skips an unchanged spec, coalesces one author''s run of saves and caps a '
  'session at 8 MiB.';

comment on column public.plan_revisions.agent_name is
  'The agent''s name when the revision was recorded — a snapshot, because the agent may be '
  'archived, deleted, or unreadable to the teammate reading the history. Null for a hand '
  'edit, and for an agent revision on a session whose agent is gone.';

-- The history is read per plan, newest first; the trigger reads the newest one per save.
create index if not exists idx_plan_revisions_session_updated
  on public.plan_revisions (session_id, updated_at desc);

alter table public.plan_revisions enable row level security;

-- SELECT only. See the header: no client inserts, updates or deletes a revision.
revoke all on public.plan_revisions from authenticated, anon;
grant select on public.plan_revisions to authenticated;

-- The session's own visibility test, verbatim from `plan_comments` and `plan_links`: the
-- `org_id is not null and` guard is what keeps a personal plan's history its owner's.
create policy plan_revisions_select on public.plan_revisions
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

-- ---------------------------------------------------------------------------
-- record_revision: the only writer
-- ---------------------------------------------------------------------------
-- AFTER, so it records what was actually written: `derive_org`, `guard_member_edit`,
-- `set_plan_number` and `set_updated_at` (all BEFORE) have run, the policies have passed,
-- and a write any of them refused never reaches here. It writes `plan_revisions` alone and
-- never `plan_sessions`, so it cannot fire itself, and it cannot move the
-- `plan_sessions.updated_at` the editor's conflict guard compares against.
--
-- `update of spec`: a write that does not name the column (a title edit, the tickets'
-- metadata upsert, a re-derived org) does not even call it. A write that names it with the
-- same value — the app's re-uploads — calls it and records nothing (see the header).
--
-- SECURITY DEFINER because `authenticated` has no INSERT here (see above). `auth.uid()` and
-- `request.headers` are settings of the transaction, not of the role, so the definer still
-- reads the caller's. Locked search_path, execute revoked from public: trigger-only.
--
-- NO SEPARATE LOCK. On an UPDATE the triggering statement already holds the session row's
-- lock until it commits, so two saves on one plan are serialised by the save itself — the
-- second one's trigger runs after the first has committed and sees its revision (each
-- statement below takes a fresh snapshot under READ COMMITTED). On an INSERT the session is
-- new, so there is no earlier revision to race for.
--
-- ERRORS PROPAGATE, and the save fails with them: a history that silently misses writes
-- would read as a plan nobody touched. The ordinary paths cannot raise — the one input the
-- caller controls, the header, is parsed under its own guard and a malformed one reads as
-- no header at all.
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
  v_last record;
begin
  if v_uid is null or new.spec is null or new.spec_oversize is true then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.spec is not distinct from new.spec then
    return null;
  end if;

  -- The source, as the request states it. `request.headers` is unset outside PostgREST and
  -- may read as '' once a session has defined it; a value that is not JSON (nothing
  -- PostgREST sends, but a caller of plain SQL could set it) is treated as no header rather
  -- than failing a legitimate save.
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
    -- Null when the session's agent is gone (archived, then released): the revision is
    -- still the agent's, only unnamed.
    select left(a.name, 200) into v_agent_name from public.agents a where a.id = v_agent_id;
  end if;

  select r.id, r.author_id, r.source, r.agent_id, r.updated_at
    into v_last
    from public.plan_revisions r
   where r.session_id = new.id
   order by r.updated_at desc, r.created_at desc, r.id desc
   limit 1;

  if found
     and v_last.author_id is not distinct from v_uid
     and v_last.source = v_source
     and v_last.agent_id is not distinct from v_agent_id
     and v_last.updated_at > now() - interval '10 minutes' then
    update public.plan_revisions
       set content = new.spec,
           updated_at = now(),
           agent_name = coalesce(v_agent_name, agent_name)
     where id = v_last.id;
  else
    insert into public.plan_revisions (session_id, author_id, source, agent_id, agent_name, content)
    values (new.id, v_uid, v_source, v_agent_id, v_agent_name, new.spec);
  end if;

  -- Retention: walking newest first, drop every revision past the one that takes the
  -- running total over 8 MiB. `rn > 1` keeps the newest whatever its size.
  delete from public.plan_revisions
   where id in (
     select ranked.id
       from (
         select r.id,
                row_number() over w as rn,
                sum(octet_length(r.content)) over w as running
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
  'otherwise. Skips a write with no user, an unchanged, null or oversize spec; folds a run of '
  'saves by the same author into one revision; prunes past 8 MiB per session. Trigger-only.';

revoke execute on function public.plan_sessions_record_revision() from public;

drop trigger if exists record_revision on public.plan_sessions;
create trigger record_revision
  after insert or update of spec on public.plan_sessions
  for each row execute function public.plan_sessions_record_revision();
