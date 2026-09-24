-- Migration: invite people onto a plan whose repository is personal
--
-- 20260924090000 left a plan on a personal repository (a null `org_id`) its author's alone,
-- whatever its policy: "it has nobody to widen it to". It has now: the people its author
-- shares an organization with. Such a plan may be opened to a hand-picked list, exactly
-- the way a team plan is under `invited`, and to nobody else — there is no organization to
-- open it to, and no admin to hand the pen to.
--
-- WHAT CHANGES, AND ONLY THERE: a null-org plan under `invited` is READABLE and EDITABLE by
-- the people in its `plan_collaborators`. Under every other policy it stays the author's
-- alone, as before; `org` and `admins` mean nothing without an organization, and grant
-- nothing. Its tickets, comments, links and history follow the plan, as they do everywhere.
--
-- WHO MAY BE INVITED onto one: someone who shares at least one organization with the
-- author, today. Only the author invites (there is no admin), and an invitation lasts as
-- long as that shared organization does: the membership trigger below drops it the moment
-- the author and the invitee no longer have one in common.
--
-- WHY THE CHILD TABLES ARE RESTATED this time, where 20260924090000 could leave them. That
-- migration only ever NARROWED visibility, and a narrower `plan_sessions_select` is inherited
-- by every sub-select onto it. This one WIDENS it, and each child policy carries its own
-- inline clause (owner, or an org member) which is ANDed onto the sub-select: an invitee on a
-- null-org plan would find the session and fail the clause. So the one visibility test now
-- lives in a function, `plan_readable`, and every policy that stated it inline asks it.

-- ---------------------------------------------------------------------------
-- plan_is_collaborator: is the caller invited onto this plan?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER for `plan_may_edit`'s reason: a policy on `plan_sessions` reading
-- `plan_collaborators` under the caller's RLS would have that table's policies read
-- `plan_sessions` in turn (42P17). It answers only about `auth.uid()`.
create or replace function public.plan_is_collaborator(p_session_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.plan_collaborators c
    where c.session_id = p_session_id
      and c.user_id = auth.uid()
  );
$$;

comment on function public.plan_is_collaborator(uuid) is
  'True when the current user is invited onto this plan session (plan_collaborators).';

revoke execute on function public.plan_is_collaborator(uuid) from public;
grant execute on function public.plan_is_collaborator(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- shares_org_with: does the caller share an organization with this user?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER, as `is_org_member_of`: it reads memberships the caller may not. It
-- answers yes or no about one pair that includes the caller, which is what the caller's own
-- rosters already tell them.
create or replace function public.shares_org_with(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.memberships mine
      join public.memberships theirs on theirs.org_id = mine.org_id
     where mine.user_id = auth.uid()
       and theirs.user_id = p_user
  );
$$;

comment on function public.shares_org_with(uuid) is
  'True when the current user and this user are members of at least one common organization.';

revoke execute on function public.shares_org_with(uuid) from public;
grant execute on function public.shares_org_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- plan_readable: may the caller read a plan with these values?
-- ---------------------------------------------------------------------------
-- THE ONE STATEMENT OF WHO SEES A PLAN, which every policy below asks. Values rather than a
-- row id, for `plan_may_edit`'s reason. Invoker: the two helpers it calls do the privileged
-- lookups, and it answers only about the caller.
create or replace function public.plan_readable(
  p_session_id uuid,
  p_owner_id uuid,
  p_org_id uuid,
  p_policy text
)
returns boolean
language sql
security invoker
stable
set search_path = public, pg_temp
as $$
  select
    p_owner_id = auth.uid()
    or (p_org_id is not null and p_policy <> 'personal' and public.is_org_member(p_org_id))
    -- A plan on a personal repository: its invitees, under `invited` only.
    or (p_org_id is null and p_policy = 'invited' and public.plan_is_collaborator(p_session_id));
$$;

comment on function public.plan_readable(uuid, uuid, uuid, text) is
  'True when the current user may read a plan session with this owner, organization and '
  'edit_policy: the author; on a team plan every member unless personal; on a plan of a '
  'personal repository the invited people under invited.';

revoke execute on function public.plan_readable(uuid, uuid, uuid, text) from public;
grant execute on function public.plan_readable(uuid, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- plan_may_edit: the invitees of a personal-repository plan hold the pen
-- ---------------------------------------------------------------------------
-- 20260924090000's function with its null-org arm opened: `invited` names the invitees
-- there too. There is no admin to add to them.
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
      p_org_id is null
      and p_policy = 'invited'
      and exists (
        select 1 from public.plan_collaborators c
        where c.session_id = p_session_id
          and c.user_id = auth.uid()
      )
    )
    or (
      p_org_id is not null
      and case p_policy
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
        else false
      end
    );
$$;

comment on function public.plan_may_edit(uuid, uuid, uuid, text) is
  'True when the current user may edit a plan session with this owner, organization and '
  'edit_policy: the author always; on a team plan the members the policy names (nobody '
  'under personal); on a plan of a personal repository the invited people under invited. '
  'Takes the values rather than an id so a WITH CHECK can judge the row being written.';

-- ---------------------------------------------------------------------------
-- plan_sessions: read and update through plan_readable
-- ---------------------------------------------------------------------------
drop policy if exists plan_sessions_select on public.plan_sessions;
create policy plan_sessions_select on public.plan_sessions
  for select to authenticated
  using (public.plan_readable(id, owner_id, org_id, edit_policy));

comment on policy plan_sessions_select on public.plan_sessions is
  'plan_readable: the author, the members of its organization unless the plan is personal, '
  'and on a personal repository the invited people under invited.';

-- WITH CHECK's repository clause gains one arm: an invitee of a personal-repository plan
-- cannot see that repository (it is the author's), and would otherwise be refused every
-- edit. The arm is safe for the reason the clause exists: repo_id is what org_id derives
-- from, and a non-author cannot change it — `guard_member_edit` (BEFORE, so before this
-- check) raises on any column off its list, repo_id included. The repo_id judged is the
-- author's own. `org_id is null` on the NEW row keeps the arm to plans that are still
-- personal-repository ones.
drop policy if exists plan_sessions_update on public.plan_sessions;
create policy plan_sessions_update on public.plan_sessions
  for update to authenticated
  using (public.plan_readable(id, owner_id, org_id, edit_policy))
  with check (
    public.plan_may_edit(id, owner_id, org_id, edit_policy)
    and (
      repo_id is null
      or exists (
        select 1 from public.repositories r
        where r.id = repo_id
          and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
      )
      or (owner_id <> auth.uid() and org_id is null and public.plan_is_collaborator(id))
    )
  );

comment on policy plan_sessions_update on public.plan_sessions is
  'Whoever can read the plan reaches the row; whoever its edit_policy names may write it '
  '(plan_may_edit), else 42501. What a non-author may change is narrowed to the content '
  'columns by the guard_member_edit trigger. repo_id must stay a repository the writer can '
  'see, except for the invitees of a personal-repository plan, who cannot change it.';

-- ---------------------------------------------------------------------------
-- plan_collaborators: who may be invited onto a personal-repository plan
-- ---------------------------------------------------------------------------
drop policy if exists plan_collaborators_select on public.plan_collaborators;
create policy plan_collaborators_select on public.plan_collaborators
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

-- The team arm is 20260924090000's, unchanged. The personal-repository arm: the author
-- alone invites (no admin exists), never themselves, and only someone they share an
-- organization with — the roster the app offers, and nobody the author could not already
-- name.
drop policy if exists plan_collaborators_insert on public.plan_collaborators;
create policy plan_collaborators_insert on public.plan_collaborators
  for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and s.edit_policy <> 'personal'
        and (
          (
            s.org_id is not null
            and (s.owner_id = auth.uid() or public.is_org_admin(s.org_id))
            and public.is_org_member_of(user_id, s.org_id)
          )
          or (
            s.org_id is null
            and s.owner_id = auth.uid()
            and user_id <> s.owner_id
            and public.shares_org_with(user_id)
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Leaving an organization: the personal-repository invitations it carried
-- ---------------------------------------------------------------------------
-- 20260924090000's function plus a second delete. An invitation onto a personal-repository
-- plan stands on the author and the invitee sharing an organization; when a membership
-- goes — the invitee's or the author's — every such invitation between the two that no
-- remaining organization supports goes with it, for the first delete's reason: kept, it
-- would hand the plan back the day they happen to share one again.
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

  delete from public.plan_collaborators c
   using public.plan_sessions s
   where c.session_id = s.id
     and s.org_id is null
     and old.user_id in (c.user_id, s.owner_id)
     and not exists (
       select 1
         from public.memberships author_m
         join public.memberships invitee_m on invitee_m.org_id = author_m.org_id
        where author_m.user_id = s.owner_id
          and invitee_m.user_id = c.user_id
     );
  return null;
end;
$$;

comment on function public.memberships_drop_plan_collaborators() is
  'Delete a departing member''s plan_collaborators rows on that organization''s plans, and '
  'the invitations onto personal-repository plans that no shared organization supports any '
  'more, so nobody is silently re-granted access on rejoining. Trigger-only.';

-- ---------------------------------------------------------------------------
-- The child tables: through plan_readable
-- ---------------------------------------------------------------------------
-- Each recreated whole, every clause but the visibility one as it stood.

drop policy if exists plan_tickets_select on public.plan_tickets;
create policy plan_tickets_select on public.plan_tickets
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

drop policy if exists plan_comments_select on public.plan_comments;
create policy plan_comments_select on public.plan_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

drop policy if exists plan_comments_insert on public.plan_comments;
create policy plan_comments_insert on public.plan_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
    and (parent_id is null or public.plan_comment_session(parent_id) = session_id)
  );

drop policy if exists plan_comments_update on public.plan_comments;
create policy plan_comments_update on public.plan_comments
  for update to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and s.org_id is not null and public.is_org_admin(s.org_id)
    )
  )
  with check (
    (
      author_id = auth.uid()
      or exists (
        select 1 from public.plan_sessions s
        where s.id = session_id
          and s.org_id is not null and public.is_org_admin(s.org_id)
      )
    )
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
    and (parent_id is null or public.plan_comment_session(parent_id) = session_id)
  );

drop policy if exists plan_links_select on public.plan_links;
create policy plan_links_select on public.plan_links
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

drop policy if exists plan_links_insert on public.plan_links;
create policy plan_links_insert on public.plan_links
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

drop policy if exists plan_link_events_select on public.plan_link_events;
create policy plan_link_events_select on public.plan_link_events
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

drop policy if exists plan_revisions_select on public.plan_revisions;
create policy plan_revisions_select on public.plan_revisions
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

drop policy if exists plan_status_events_select on public.plan_status_events;
create policy plan_status_events_select on public.plan_status_events
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy)
    )
  );

-- ---------------------------------------------------------------------------
-- plan_comment_session: the same test, written out for a SECURITY DEFINER read
-- ---------------------------------------------------------------------------
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
     and public.plan_readable(s.id, s.owner_id, s.org_id, s.edit_policy);
$$;
