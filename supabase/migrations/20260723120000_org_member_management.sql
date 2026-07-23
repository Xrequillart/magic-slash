-- Migration: org member management + multi-org support (issue #137)
-- Builds on the invite/accept feature (PR2) and the RLS foundation (PR1). Adds
-- the server-side pieces the desktop app needs to fully manage org membership:
--   * organizations.archived_at — soft-delete (archiving), NEVER a hard delete.
--   * a last-admin lockout guard so an org can never be left member-bearing but
--     adminless (covers remove, leave and demote in one BEFORE trigger).
--   * SECURITY DEFINER RPCs: remove_member, leave_organization,
--     update_member_role, archive_organization, list_org_members.
--
-- Every function mirrors the established pattern (get_org_shared_config /
-- create_organization): SECURITY DEFINER, locked search_path, an auth.uid()
-- guard, and a defense-in-depth membership/admin check on top of RLS. Grants are
-- revoked from PUBLIC and granted to authenticated only.

-- ---------------------------------------------------------------------------
-- Archiving: soft-delete column. Archived orgs are filtered out of every read
-- path by the is_org_member / is_org_admin helpers below (which back the
-- organizations/memberships SELECT policies), so nothing that lists orgs, their
-- members, agents, etc. can ever surface an archived org. There is deliberately
-- no unarchive path in scope: once archived, the helpers stop returning true for
-- the org, so it disappears for everyone (its data is retained, not destroyed).
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- Read-path filtering: exclude archived orgs from the membership/admin helpers.
-- These back the organizations_select / memberships_select (and every
-- is_org_member-gated) policy, so archiving an org removes it from all reads in
-- one place. Preserves the PR1 SECURITY DEFINER + locked search_path style.
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.org_id
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and o.archived_at is null
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.org_id
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and o.archived_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Last-admin lockout guard
-- ---------------------------------------------------------------------------
-- A single BEFORE DELETE OR UPDATE trigger on memberships enforces the
-- invariant "an org that still has members always has at least one admin". It
-- fires for every removal path (remove_member, leave_organization, direct admin
-- DELETE) and for demotions (update_member_role, direct admin UPDATE), so the
-- rule lives in exactly one place regardless of who performs the operation.
--
-- It blocks ONLY when the operation would leave zero admins AND other members
-- remain (a genuine lockout). Removing the last admin of an org that has no
-- other members is allowed — nobody is locked out, and this is the path
-- delete_account and org cleanup rely on. SECURITY DEFINER so the admin/member
-- counts are computed independent of the caller's RLS visibility.
create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  remaining_admins  integer;
  remaining_members integer;
begin
  -- Only an admin leaving/being demoted can cause a lockout; everything else
  -- passes straight through.
  if tg_op = 'DELETE' then
    if old.role <> 'admin' then
      return old;
    end if;
  elsif tg_op = 'UPDATE' then
    -- Only a demotion (admin -> non-admin) is relevant. Promotions and any other
    -- column change are always safe.
    if not (old.role = 'admin' and new.role <> 'admin') then
      return new;
    end if;
  end if;

  -- Admins that would remain in the org, excluding this membership.
  select count(*) into remaining_admins
  from public.memberships m
  where m.org_id = old.org_id
    and m.role = 'admin'
    and m.user_id <> old.user_id;

  -- Members that would remain after the operation. On DELETE the row is gone; on
  -- a demotion the row stays (as a plain member), so it still counts.
  if tg_op = 'DELETE' then
    select count(*) into remaining_members
    from public.memberships m
    where m.org_id = old.org_id
      and m.user_id <> old.user_id;
  else
    select count(*) into remaining_members
    from public.memberships m
    where m.org_id = old.org_id;
  end if;

  if remaining_admins = 0 and remaining_members > 0 then
    raise exception 'cannot remove or demote the last admin while other members remain';
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists prevent_last_admin_removal on public.memberships;
create trigger prevent_last_admin_removal
  before delete or update on public.memberships
  for each row execute function public.prevent_last_admin_removal();

-- ---------------------------------------------------------------------------
-- remove_member: an admin removes another member from the org
-- ---------------------------------------------------------------------------
-- Caller must be an admin of the org (defense-in-depth on top of the
-- memberships_delete RLS policy). The last-admin trigger blocks removing the
-- sole admin while other members remain.
create or replace function public.remove_member(p_org_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'remove_member requires an authenticated user';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not an admin of this organization';
  end if;

  delete from public.memberships
  where org_id = p_org_id
    and user_id = p_user_id;
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- leave_organization: a member removes their own membership
-- ---------------------------------------------------------------------------
-- Any member may leave; the last-admin trigger stops a sole admin from leaving
-- an org that still has other members (they must archive it or promote someone
-- first). SECURITY DEFINER because PR1 has no self-serve DELETE policy on
-- memberships (deletes are admin-gated); leaving must run as the table owner.
create or replace function public.leave_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'leave_organization requires an authenticated user';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organization';
  end if;

  delete from public.memberships
  where org_id = p_org_id
    and user_id = auth.uid();
end;
$$;

revoke execute on function public.leave_organization(uuid) from public;
grant execute on function public.leave_organization(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- update_member_role: an admin changes a member's role
-- ---------------------------------------------------------------------------
-- Caller must be an admin. The last-admin trigger blocks demoting the sole admin
-- while other members remain.
create or replace function public.update_member_role(p_org_id uuid, p_user_id uuid, p_role public.membership_role)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'update_member_role requires an authenticated user';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not an admin of this organization';
  end if;

  update public.memberships
  set role = p_role
  where org_id = p_org_id
    and user_id = p_user_id;
end;
$$;

revoke execute on function public.update_member_role(uuid, uuid, public.membership_role) from public;
grant execute on function public.update_member_role(uuid, uuid, public.membership_role) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_organization: soft-delete an org (admin only)
-- ---------------------------------------------------------------------------
-- Sets archived_at = now(). The is_org_member / is_org_admin helpers then stop
-- returning true for the org, so it drops out of every read path for everyone.
-- No hard delete: the org's data is retained. Idempotent (a re-archive is a
-- no-op). The admin check runs while the org is still un-archived.
create or replace function public.archive_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'archive_organization requires an authenticated user';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not an admin of this organization';
  end if;

  update public.organizations
  set archived_at = now()
  where id = p_org_id
    and archived_at is null;
end;
$$;

revoke execute on function public.archive_organization(uuid) from public;
grant execute on function public.archive_organization(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_org_members: members + their emails, for any member of the org
-- ---------------------------------------------------------------------------
-- RLS on memberships exposes user_id + role but NOT emails (auth.users is not
-- readable by the authenticated role). This SECURITY DEFINER function joins
-- auth.users to surface each member's email, but ONLY to a caller who is a
-- member of the org — so emails never leak across tenants. auth.users is
-- schema-qualified because `auth` is intentionally off the search_path.
create or replace function public.list_org_members(p_org_id uuid)
returns table (
  user_id    uuid,
  email      text,
  role       public.membership_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_org_members requires an authenticated user';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organization';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.org_id = p_org_id
    order by m.created_at asc;
end;
$$;

revoke execute on function public.list_org_members(uuid) from public;
grant execute on function public.list_org_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_account: keep it compatible with the new last-admin guard
-- ---------------------------------------------------------------------------
-- The prior version (migration 20260723110000) reassigned created_by of shared
-- orgs the caller created but did NOT ensure an admin remained. With the
-- last-admin trigger now in place, deleting the caller's membership from any org
-- where they are the SOLE admin and other members remain would be blocked,
-- breaking account deletion. So before removing the caller's memberships we
-- promote a replacement admin (the oldest remaining member) in exactly those
-- orgs — preserving the no-lockout invariant everywhere. Everything else is
-- unchanged from the original.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_uid uuid := auth.uid();
begin
  if current_uid is null then
    raise exception 'delete_account requires an authenticated user';
  end if;

  -- 1. Hand off orgs the caller created that still have OTHER members: reassign
  --    created_by to another member (preferring an admin) so the org and every
  --    other member's data survive.
  update public.organizations o
  set created_by = (
    select m.user_id
    from public.memberships m
    where m.org_id = o.id and m.user_id <> current_uid
    order by (m.role = 'admin') desc, m.created_at asc
    limit 1
  )
  where o.created_by = current_uid
    and exists (
      select 1 from public.memberships m
      where m.org_id = o.id and m.user_id <> current_uid
    );

  -- 2. Delete only the orgs the caller created that have NO other members (their
  --    personal/solo orgs). Cascades all of that org's data.
  delete from public.organizations o
  where o.created_by = current_uid
    and not exists (
      select 1 from public.memberships m
      where m.org_id = o.id and m.user_id <> current_uid
    );

  -- 3. Clear references to the caller that would otherwise block the users delete.
  update public.invitations set invited_by = null where invited_by = current_uid;

  -- 3b. Promote a replacement admin (the oldest remaining member) in every org
  --     where the caller is the SOLE admin and other members remain, so removing
  --     the caller's membership below does not trip the last-admin guard and
  --     leave a member-bearing org adminless.
  update public.memberships target
  set role = 'admin'
  where target.id in (
    select distinct on (o.id) other.id
    from public.organizations o
    join public.memberships caller
      on caller.org_id = o.id and caller.user_id = current_uid and caller.role = 'admin'
    join public.memberships other
      on other.org_id = o.id and other.user_id <> current_uid
    where not exists (
      select 1 from public.memberships a
      where a.org_id = o.id and a.role = 'admin' and a.user_id <> current_uid
    )
    order by o.id, other.created_at asc
  );

  -- 4. Remove the caller's remaining memberships (in handed-off or other orgs).
  delete from public.memberships where user_id = current_uid;

  -- 5. Delete the account itself. Cascades the caller's configs; nulls the
  --    append-only usage/activity actor and skills.created_by.
  delete from auth.users where id = current_uid;
end;
$$;

revoke execute on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
