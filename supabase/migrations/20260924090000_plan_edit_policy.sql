-- Migration: plan_sessions.edit_policy — the author decides who may see and edit a plan (#305)
--
-- 20260923100000 opened a team plan's text to every member of its organization. What this
-- adds is the author's say over it: a plan may be kept to its author alone, left open to the
-- whole organization, kept to the organization's admins, or opened to a hand-picked list of
-- members. Four words, in a new column:
--
--   * `personal` — THE AUTHOR ALONE, like a plan on a personal repository. The organization
--                  does not see it at all: not in its lists, not its tickets, comments,
--                  links, revisions, history or collaborators. Admins included. The DEFAULT
--                  FOR EVERY NEW PLAN: a plan is a draft of its author's until they share it.
--   * `org`      — every member of the plan's organization. The value every EXISTING row
--                  takes, so no plan that is shared today stops being shared.
--   * `admins`   — the organization's admins only.
--   * `invited`  — the organization's admins, and the members the author (or an admin) has
--                  invited, one row each in `plan_collaborators` below.
--
-- TWO DEFAULTS, ON PURPOSE, and in this order below: the column is added with `default 'org'`
-- so the rows already there are backfilled to `org` by the ADD COLUMN itself, and only then
-- is the default moved to `personal`, which every insert from here on takes. The desktop
-- app's upload never sends the column (CloudStore.planSessionRow), so the default is what a
-- new plan gets, and a later upsert of the same plan never overwrites the author's choice.
--
-- The author may always read and edit their own plan, whatever the policy says: the policy
-- is about everyone else. And a plan on a personal repository (a null `org_id`) stays the
-- author's alone, exactly as before, whatever its policy; it has nobody to widen it to. Its
-- `personal` is what it will keep if that repository is ever shared with an organization.
--
-- READING. Under `org`, `admins` and `invited`, whoever could read a plan still reads it, its
-- tickets, its links, its comments and its history: those three narrow only who may EDIT.
-- `plan_comments` and `plan_links` stay open to every reader: a member who may not rewrite
-- the spec may still comment on it and pin a mock-up to it, which is precisely what someone
-- without the pen needs. `personal` is the one policy that governs VISIBILITY too, and it
-- does so in one place: `plan_sessions_select`, below.
--
-- WHY ONE PLACE IS ENOUGH FOR THE CHILD TABLES. Every policy on `plan_tickets`,
-- `plan_comments`, `plan_links`, `plan_revisions`, `plan_link_events` and
-- `plan_status_events` asks `exists (select 1 from public.plan_sessions s where ...)`. That
-- sub-select runs as the caller and so under `plan_sessions`' own RLS: a session the caller
-- may not select is not there to be found, whatever the inline clause after it says. Those
-- inline clauses were written before `personal` and read as if an org member passed them;
-- they do not, for a personal plan, because the row is filtered before they are asked.
-- `supabase/tests/plan_edit_policy.test.sql` proves it table by table. The policies of this
-- migration's own table, `plan_collaborators`, name `personal` explicitly anyway.
--
-- What RLS does NOT cover is SECURITY DEFINER code, which reads without it. Every such
-- function touching plans was audited: the triggers (derive_org, assign_number,
-- record_revision, log_status, hold_status, links_log_event, repositories' re-derivation)
-- only write, and answer nobody; `plan_comment_session` answers a caller directly and is
-- re-stated below to answer only about a comment the caller could read; `plan_may_edit` and
-- the two computed columns name `personal` themselves.
--
-- Inviting someone from outside the organization is out of scope: an invitation is to a
-- MEMBER, and `plan_collaborators_insert` refuses anyone else. Inviting anyone at all to a
-- `personal` plan is refused too.
--
-- WHO SETS THE POLICY: the author, or an admin of the plan's organization — the two who can
-- already delete the plan (`plan_sessions_delete`). A member who could change it could hand
-- themselves the pen it was keeping from them. And `personal` is the AUTHOR's alone, both
-- ways: an admin may not hide a colleague's plan from the organization, nor publish one its
-- author has kept to themselves (they cannot even see it). The guard trigger says so, below.

alter table public.plan_sessions
  add column if not exists edit_policy text not null default 'org';

-- Every row above now holds 'org'. Every row inserted from here on is personal.
alter table public.plan_sessions
  alter column edit_policy set default 'personal';

alter table public.plan_sessions
  drop constraint if exists plan_sessions_edit_policy;
alter table public.plan_sessions
  add constraint plan_sessions_edit_policy check (edit_policy in ('personal', 'org', 'admins', 'invited'));

comment on column public.plan_sessions.edit_policy is
  'Who besides the author may see and edit this plan. ''personal'' (the default for new '
  'plans): nobody, the organization does not even see it, admins included. Otherwise every '
  'member of its organization reads it, and the policy names who may edit: ''org'' (every '
  'member; what every plan older than the column holds), ''admins'' (the organization''s '
  'admins), ''invited'' (the admins and the members listed in plan_collaborators). Set by '
  'the author or an org admin; only the author may set or leave ''personal''.';

-- ---------------------------------------------------------------------------
-- plan_sessions_select: a personal plan is its author's alone
-- ---------------------------------------------------------------------------
-- 20260821090000's policy, with one more condition on the organization's arm. Dropped and
-- recreated whole, for 20260923100000's reason: one policy, read in one place, and never a
-- second permissive SELECT policy beside it (they are OR-ed, and would widen it).
--
-- THE ONE STATEMENT OF WHO SEES A PLAN, which every child table's policy inherits through
-- its sub-select (see the header). The `org_id is not null and` guard is still load-bearing,
-- for the reason 20260821090000 gives.
drop policy if exists plan_sessions_select on public.plan_sessions;
create policy plan_sessions_select on public.plan_sessions
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and edit_policy <> 'personal' and public.is_org_member(org_id))
  );

comment on policy plan_sessions_select on public.plan_sessions is
  'The author, and the members of its organization unless the plan is personal. Every '
  'plan_* table''s policy sub-selects this table and so inherits this test.';

-- ---------------------------------------------------------------------------
-- plan_sessions_delete: an admin may not delete what they may not see
-- ---------------------------------------------------------------------------
-- RLS would already filter it — a DELETE with a WHERE reads the row, and SELECT's policy
-- applies — but a policy that says "an admin may delete" beside one that says "an admin may
-- not see" is a pair a reader has to reconcile. Said here, in the policy itself.
drop policy if exists plan_sessions_delete on public.plan_sessions;
create policy plan_sessions_delete on public.plan_sessions
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and edit_policy <> 'personal' and public.is_org_admin(org_id))
  );

-- ---------------------------------------------------------------------------
-- plan_collaborators: the members invited to edit one plan
-- ---------------------------------------------------------------------------
-- One row per (plan, member). No id of its own: the pair IS the row, and inviting someone
-- twice is the same invitation.
--
-- A ROW ONLY MEANS SOMETHING UNDER `invited`. Under `org` everyone already holds the pen,
-- under `admins` an invitation is not enough, and under `personal` nobody but the author
-- even sees the plan; the rows are kept all the same, inert, so an author who switches away
-- from `invited` and back finds the list they left.
create table if not exists public.plan_collaborators (
  -- on delete cascade: an invitation has no meaning without the plan it is to.
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- on delete cascade: an account being deleted takes its invitations with it.
  user_id uuid not null references auth.users (id) on delete cascade,
  -- on delete set null, as `plan_status_events.actor_id`: the invitation stands, whoever
  -- made it left. `cascade` here would let one deleted account quietly revoke every
  -- invitation it ever made; `restrict` would make `delete_account` fail for anyone who
  -- ever invited somebody.
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

comment on table public.plan_collaborators is
  'The members invited to edit one /magic:plan session, read when its edit_policy is '
  '''invited''. Readable by whoever can read the session; added by its author or an org '
  'admin, for a member of the plan''s organization only; removed by the same two, or by the '
  'collaborator themselves. A member leaving the organization loses their rows.';

-- The primary key serves "who is on this plan"; this one serves "is this user on it" from
-- the membership trigger below, which starts from the user.
create index if not exists idx_plan_collaborators_user_id on public.plan_collaborators (user_id);

alter table public.plan_collaborators enable row level security;

-- No UPDATE: an invitation is a pair of ids, and changing either is removing one invitation
-- and adding another. Without the grant, a PATCH is refused before any policy is asked.
revoke all on public.plan_collaborators from authenticated, anon;
grant select, insert, delete on public.plan_collaborators to authenticated;

-- Read: whoever can read the plan — the select policy's own test, `personal` included, so
-- the list of who holds the pen is exactly as visible as the plan itself. The sub-select
-- would inherit it from `plan_sessions_select` anyway; it is spelled out because this
-- policy is new. The `org_id is not null and` guard is load-bearing for the reason
-- 20260821090000 gives on `plan_sessions_select`.
create policy plan_collaborators_select on public.plan_collaborators
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (
          s.owner_id = auth.uid()
          or (s.org_id is not null and s.edit_policy <> 'personal' and public.is_org_member(s.org_id))
        )
    )
  );

-- Add: under the inviter's own name, on a TEAM plan, by its author or an admin of its
-- organization, and only ever for a member of that same organization.
--
--   * `invited_by = auth.uid()`, as `plan_links.author_id`: nobody records an invitation in
--     somebody else's name.
--   * `s.org_id is not null`: a plan on a personal repository has nobody to invite, and a
--     row on one would be a grant waiting for the day its repository is shared.
--   * `s.edit_policy <> 'personal'`: nor does a personal plan on a team repository. Its
--     author has kept it from the organization; inviting a member would be a row naming
--     someone who cannot see what they were invited to. Rows made before the author
--     switched to `personal` stay, inert, for the day they switch back.
--   * `is_org_member_of(user_id, s.org_id)`: no outsiders. An invitation does not make
--     anybody a reader; the plan must already be theirs to read.
--
-- A collaborator may NOT invite: being handed the pen is not being handed the guest list.
create policy plan_collaborators_insert on public.plan_collaborators
  for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and s.org_id is not null
        and s.edit_policy <> 'personal'
        and (s.owner_id = auth.uid() or public.is_org_admin(s.org_id))
        and public.is_org_member_of(user_id, s.org_id)
    )
  );

-- Remove: the author, an admin of a plan they can see, and the collaborator themselves —
-- someone handed a pen they did not ask for may put it down without asking the author. On a
-- personal plan the admin's arm is closed (they do not see the plan); the collaborator's own
-- stays open, since a row about oneself is no window onto the plan.
create policy plan_collaborators_delete on public.plan_collaborators
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (
          s.owner_id = auth.uid()
          or (s.org_id is not null and s.edit_policy <> 'personal' and public.is_org_admin(s.org_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Leaving the organization takes the invitations with it
-- ---------------------------------------------------------------------------
-- A member removed from the organization (or leaving it) can no longer read the plan, so
-- `plan_may_edit`'s `is_org_member` test already stops them. The rows are deleted anyway,
-- and that is a DECISION, not tidiness: kept, they would hand the pen straight back the day
-- the same person rejoins, on plans whose authors may have long forgotten inviting them. A
-- member who comes back is invited again, by someone who means it.
--
-- SECURITY DEFINER because the deleter is rarely the one who may delete these rows: an admin
-- removing a member is not the author of the member's invitations, and a member leaving is
-- not an admin. The trigger runs on a membership row that is already gone, so it acts for
-- the system, and it touches only that one user's rows on that one organization's plans.
create or replace function public.memberships_drop_plan_collaborators()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.plan_collaborators c
   using public.plan_sessions s
   where c.session_id = s.id
     and c.user_id = old.user_id
     and s.org_id = old.org_id;
  return null;
end;
$$;

comment on function public.memberships_drop_plan_collaborators() is
  'Delete a departing member''s plan_collaborators rows on that organization''s plans, so a '
  'member who rejoins is not silently re-granted edit rights. Trigger-only.';

revoke execute on function public.memberships_drop_plan_collaborators() from public;

drop trigger if exists drop_plan_collaborators on public.memberships;
create trigger drop_plan_collaborators
  after delete on public.memberships
  for each row execute function public.memberships_drop_plan_collaborators();

-- ---------------------------------------------------------------------------
-- plan_may_edit: may the caller edit a plan with these values?
-- ---------------------------------------------------------------------------
-- THE ONE STATEMENT OF THE RULE, read by the UPDATE policy and by the two computed columns
-- the app draws from, so the page cannot offer what the database would refuse.
--
-- IT TAKES ARGUMENTS, NOT A ROW ID TO LOOK UP, ON PURPOSE. A WITH CHECK judges the row as
-- it would be written — NEW — and a function that re-read the session by id would be judging
-- whatever the table held before the statement. The caller hands over the values it is
-- judging. `p_session_id` is only used to find the invitations, which live in another table.
--
-- SECURITY DEFINER for the invitation lookup, the way `is_org_member` is for memberships: a
-- policy on `plan_sessions` that read `plan_collaborators` under the caller's RLS would have
-- that table's policies read `plan_sessions` in turn. Search path pinned; EXECUTE granted to
-- `authenticated` only, and it answers only about `auth.uid()`, so it tells nobody anything
-- about anyone else.
create or replace function public.plan_may_edit(
  p_session_id uuid,
  p_owner_id uuid,
  p_org_id uuid,
  p_policy text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p_owner_id = auth.uid()
    or (
      -- A null org is a personal plan: the author's alone, whatever the policy says.
      p_org_id is not null
      and case p_policy
        -- The author alone, and the author was answered above. Admins included in the no.
        when 'personal' then false
        when 'org' then public.is_org_member(p_org_id)
        when 'admins' then public.is_org_admin(p_org_id)
        when 'invited' then
          public.is_org_admin(p_org_id)
          or (
            public.is_org_member(p_org_id)
            and exists (
              select 1 from public.plan_collaborators c
              where c.session_id = p_session_id
                and c.user_id = auth.uid()
            )
          )
        -- A word the CHECK does not know cannot be stored; if one ever is, it grants nothing.
        else false
      end
    );
$$;

comment on function public.plan_may_edit(uuid, uuid, uuid, text) is
  'True when the current user may edit a plan session with this owner, organization and '
  'edit_policy: the author always, and on a team plan the members the policy names (nobody '
  'under personal). Takes '
  'the values rather than an id so a WITH CHECK can judge the row being written.';

revoke execute on function public.plan_may_edit(uuid, uuid, uuid, text) from public;
grant execute on function public.plan_may_edit(uuid, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The two answers the app draws from, as PostgREST computed columns
-- ---------------------------------------------------------------------------
-- A function taking the table's row type is a column PostgREST will select by name —
-- `select=…,viewer_can_edit,viewer_can_manage` — so the detail read brings back whether the
-- READER may edit and may manage the plan in the same round trip as the plan itself. The
-- page asks the database rather than working the rule out again from the roster: a second
-- copy of it in TypeScript is one that drifts.
--
-- SECURITY INVOKER (stated, as the guard trigger states it): these only ever run on a row
-- the caller could already select, and they answer about the caller. `plan_may_edit` and
-- `is_org_admin` do their own privileged lookups.
create or replace function public.viewer_can_edit(s public.plan_sessions)
returns boolean
language sql
security invoker
stable
set search_path = public, pg_temp
as $$
  select public.plan_may_edit(s.id, s.owner_id, s.org_id, s.edit_policy);
$$;

comment on function public.viewer_can_edit(public.plan_sessions) is
  'Computed column: whether the current user may edit this plan session. See plan_may_edit.';

-- Who may set the policy and the invitations: the author, or an admin of the plan's
-- organization — the pair `plan_sessions_delete` and the guard trigger below name. Not an
-- admin of a personal plan, which is not theirs to see; the row never reaches them anyway,
-- and the answer says the same.
create or replace function public.viewer_can_manage(s public.plan_sessions)
returns boolean
language sql
security invoker
stable
set search_path = public, pg_temp
as $$
  select s.owner_id = auth.uid()
    or (s.org_id is not null and s.edit_policy <> 'personal' and public.is_org_admin(s.org_id));
$$;

comment on function public.viewer_can_manage(public.plan_sessions) is
  'Computed column: whether the current user may change who edits this plan session (its '
  'author, or an admin of its organization).';

revoke execute on function public.viewer_can_edit(public.plan_sessions) from public;
revoke execute on function public.viewer_can_manage(public.plan_sessions) from public;
grant execute on function public.viewer_can_edit(public.plan_sessions) to authenticated;
grant execute on function public.viewer_can_manage(public.plan_sessions) to authenticated;

-- ---------------------------------------------------------------------------
-- The UPDATE policy: whoever the plan's policy names
-- ---------------------------------------------------------------------------
-- Dropped and recreated, for 20260923100000's reason: one policy, read whole in one place.
-- Never a second UPDATE policy beside it — permissive policies are OR-ed, and a stacked
-- one would widen the first instead of narrowing it.
drop policy if exists plan_sessions_update on public.plan_sessions;

-- USING stays the select policy's visibility test (`personal` included, so a personal plan
-- is not there to be updated: zero rows, as for any row RLS hides), and deliberately NOT
-- the edit rule. A
-- USING that refused filters silently: the reader's write would match no row and come back
-- empty, indistinguishable from the conflict guard's "the row changed". Leaving the edit
-- rule to WITH CHECK makes a refusal RAISE (42501, "new row violates row-level security"),
-- which the app reads as `denied` and says so.
--
-- WITH CHECK: `plan_may_edit` on the row as it would be written, and the repository clause
-- of 20260821090000, copied verbatim and NOT to be simplified away — org_id is derived from
-- repo_id, so an unguarded repo_id is an unguarded org_id. See 20260923100000.
--
-- The row judged is NEW, so its `edit_policy` is the one being written. That is safe only
-- because a writer who may not manage the plan cannot change `edit_policy` at all: the guard
-- trigger refuses it before this check runs. A member under `admins` sending
-- `edit_policy: 'org'` along with their edit is refused there, not waved through here.
create policy plan_sessions_update on public.plan_sessions
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and edit_policy <> 'personal' and public.is_org_member(org_id))
  )
  with check (
    public.plan_may_edit(id, owner_id, org_id, edit_policy)
    and (repo_id is null or exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
    ))
  );

comment on policy plan_sessions_update on public.plan_sessions is
  'The author, or on a team plan whoever its edit_policy names (nobody, every member, the '
  'admins, or the admins and the invited members). A personal plan is invisible to the '
  'others and so matches no row. Visible-but-not-editable raises 42501 rather '
  'than matching no row. What a non-author may change is narrowed to the content columns '
  'by the guard_member_edit trigger. repo_id must stay a repository the writer can see.';

comment on table public.plan_sessions is
  'One /magic:plan session: the idea, the spec markdown, and the tickets it '
  'produced (plan_tickets). Readable by the org of its repository unless its edit_policy '
  'is personal (the default for new plans). Written by the '
  'desktop app, never by the skill: the author''s app writes the whole row, and the '
  'members its edit_policy names may edit its content columns (spec, title, idea, status) '
  'from the app.';

-- ---------------------------------------------------------------------------
-- The column guard, with `edit_policy` on the list and kept to the plan's managers
-- ---------------------------------------------------------------------------
-- 20260923150000's function but for two things. `edit_policy` joins the allow-list, so an
-- admin who is not the author may change it; and a change of it by anyone who is neither
-- the author nor an admin of the plan's organization is refused, inside the same
-- `current_user = 'authenticated'` gate and for the same reason — the system's own paths
-- (SECURITY DEFINER derivations, referential actions) are not a member's edit.
--
-- The admin test reads OLD's organization: the one the plan belongs to when the write
-- arrives. A member cannot move it anyway (repo_id is off the list).
--
-- AND `personal` IS THE AUTHOR'S ALONE, both ways. An admin who may switch a colleague's
-- plan between `org`, `admins` and `invited` may not make it personal (hiding the author's
-- work from the organization it was shared with), nor take it out of `personal` (they
-- cannot see such a plan to begin with, so USING already stops them; this says it again
-- where the rule lives).
create or replace function public.plan_sessions_guard_member_edit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  content_columns constant text[] := array['spec', 'title', 'idea', 'status', 'status_by_hand', 'edit_policy', 'updated_at', 'org_id', 'number'];
begin
  if current_user = 'authenticated' and old.owner_id is distinct from auth.uid() then
    if (to_jsonb(new) - content_columns) is distinct from (to_jsonb(old) - content_columns) then
      raise exception 'only the author of a plan session may change anything but its spec, title, idea, status and edit policy'
        using errcode = '42501';
    end if;
    if new.edit_policy is distinct from old.edit_policy
       and 'personal' in (new.edit_policy, old.edit_policy) then
      raise exception 'only the author of a plan session may make it personal or share it'
        using errcode = '42501';
    end if;
    if new.edit_policy is distinct from old.edit_policy
       and not (old.org_id is not null and public.is_org_admin(old.org_id)) then
      raise exception 'only the author of a plan session or an admin of its organization may change who can edit it'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.plan_sessions_guard_member_edit() is
  'Refuse a write by anyone but the author that changes anything on a plan session other '
  'than spec, title, idea, status and edit_policy, a change of edit_policy by anyone but '
  'the author or an org admin, and a change to or from personal by anyone but the author. '
  'System paths (SECURITY DEFINER derivations, referential '
  'actions) do not run as authenticated and are not judged. Trigger-only.';

-- ---------------------------------------------------------------------------
-- plan_comment_session: answers only about a comment the caller could read
-- ---------------------------------------------------------------------------
-- 20260922200000's function, which reads `plan_comments` WITHOUT RLS so that comments' own
-- write policies can ask about a parent. It is also an RPC anyone signed in may call, and
-- until now it answered any comment id, on any plan. That was one uuid for another; with
-- `personal`, it would be a way to learn that a hidden plan exists and has comments. So it
-- now answers null unless the comment's plan is one the caller can see, by the test of
-- `plan_sessions_select` — written out, because inside a SECURITY DEFINER function that
-- policy is not applied. The policies that call it are unaffected: they have already
-- required the new row's session to be visible to the writer, and a parent in that same
-- session is therefore answered as before.
create or replace function public.plan_comment_session(comment_id uuid)
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select c.session_id
    from public.plan_comments c
    join public.plan_sessions s on s.id = c.session_id
   where c.id = comment_id
     and (
       s.owner_id = auth.uid()
       or (s.org_id is not null and s.edit_policy <> 'personal' and public.is_org_member(s.org_id))
     );
$$;

comment on function public.plan_comment_session(uuid) is
  'The plan a comment belongs to, read WITHOUT row level security so that '
  'plan_comments'' own write policies can ask about a parent comment (a policy that '
  'sub-selects its own table is rejected as recursive, 42P17). Null unless the comment''s '
  'plan is visible to the caller by plan_sessions_select''s test, personal plans included.';

revoke execute on function public.plan_comment_session(uuid) from public;
grant execute on function public.plan_comment_session(uuid) to authenticated;
