-- Migration: admin org management — the back-office's first write surface
--
-- WHY this migration exists
-- -----------------------------------------------------------------------------
-- 20260728090000 and 20260728100000 shipped seven `admin_*` RPCs, and every one
-- of them is `select`-shaped: the back-office could describe the platform but not
-- act on it. Operating a tenant meant asking the org's own admin to do it from
-- the desktop app, which is the one thing a platform operator cannot do when the
-- tenant is precisely what is broken — an org whose last admin left, an
-- invitation sent to a typo'd address, a tenant archived by mistake.
--
-- Two reads and three writes, all scoped to organizations and their members,
-- because that is the surface the back-office's Users and Organizations sections
-- present. Agents, repositories and the device fleet stay read-only: nothing in
-- the operator's job today requires mutating them, and a write path that exists
-- "just in case" is a way to lose data by accident.
--
-- Same constraints as their seven siblings: SECURITY DEFINER, locked search_path,
-- an auth.uid() guard, an is_platform_admin() gate, an explicit column allowlist
-- on the reads, execute revoked from PUBLIC and anon. No existing policy, trigger
-- or function is modified.
--
-- ERROR SEMANTICS, stated once for the three writes
-- -----------------------------------------------------------------------------
-- A write raises when its target does not exist — that is a stale back-office or
-- a wrong id, and silently succeeding would report a change that never happened.
-- A write is a no-op when the target is already in the requested state, so a
-- double click costs nothing. The one deliberate exception is documented on
-- admin_revoke_invitation.

-- ---------------------------------------------------------------------------
-- admin_list_org_members: who belongs to one org, with their emails
-- ---------------------------------------------------------------------------
-- `list_org_members` already answers this shape, but only for a caller who is a
-- MEMBER of the org — which a platform operator generally is not, and must not
-- have to become. Joining memberships to auth.users from the client is not an
-- option either: `auth.users` is not readable by the `authenticated` role, which
-- is the whole reason that function is SECURITY DEFINER.
--
-- `profiles` is LEFT joined: a membership can precede a profile (an invitee who
-- accepted but never opened the desktop app), and dropping those rows would hide
-- exactly the members an operator is looking for. The profile name is returned
-- because a uuid does not identify a human in a support conversation and an email
-- alone often does not either — two accounts at the same company differ by name.
create or replace function public.admin_list_org_members(p_org_id uuid)
returns table (
  user_id    uuid,
  email      text,
  name       text,
  role       public.membership_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_org_members requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select
      ms.user_id,
      u.email::text,
      p.name,
      ms.role,
      ms.created_at
    from public.memberships ms
    -- LEFT, not inner, on BOTH: memberships.user_id cascades on account
    -- deletion so a missing auth.users row should be impossible, but an inner
    -- join here would turn any future gap into a silently short list rather
    -- than a visible row with a null email.
    left join auth.users u on u.id = ms.user_id
    left join public.profiles p on p.user_id = ms.user_id
    where ms.org_id = p_org_id
    -- Admins first, then oldest membership: the people who can act on the org
    -- are what an operator opens this list to find. Sorted on the PREDICATE
    -- rather than on `role desc`, which would happen to work only because the
    -- enum is declared ('user', 'admin') — a reordering of that type, or a third
    -- role, would silently invert this list.
    order by (ms.role = 'admin') desc, ms.created_at asc;
end;
$$;

revoke execute on function public.admin_list_org_members(uuid) from public, anon;
grant execute on function public.admin_list_org_members(uuid) to authenticated;

comment on function public.admin_list_org_members(uuid) is
  'Platform back-office: members of one organization with email, profile name and '
  'role. Gated on is_platform_admin(); read-only.';

-- ---------------------------------------------------------------------------
-- admin_list_org_invitations: the invitations of one org, tokens excluded
-- ---------------------------------------------------------------------------
-- admin_list_orgs returns only a COUNT of pending invitations, which is enough to
-- flag an org and useless for acting on it: revoking the invite sent to a typo'd
-- address needs the address and the id.
--
-- THE TOKEN IS NOT RETURNED AND MUST NEVER BE. An invitation token is a bearer
-- credential — whoever holds it joins the org (see accept_invitation) — so a
-- back-office that displayed one would be handing out tenant access rather than
-- reporting on it. This repeats the constraint stated in 20260728100000 because
-- the temptation is local: this function is the one place where returning it
-- would be one word of SQL.
--
-- `status` is returned RAW. A pending invitation past its expires_at reads as
-- expired, but that is derived at read time by the client (see effectiveStatus in
-- webapp/lib/invitations.ts and desktop/src/main/cloud/org.ts) precisely because
-- accept_invitation cannot persist the flip — its RAISE would roll the write
-- back. Deriving it here as well would put the same rule in a third place.
create or replace function public.admin_list_org_invitations(p_org_id uuid)
returns table (
  id          uuid,
  email       text,
  role        public.membership_role,
  status      public.invitation_status,
  invited_by_email text,
  expires_at  timestamptz,
  accepted_at timestamptz,
  created_at  timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_org_invitations requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select
      inv.id,
      inv.email,
      inv.role,
      inv.status,
      -- invited_by has no ON DELETE CASCADE, so an invitation outlives the
      -- account that sent it. LEFT join keeps those rows, with a null inviter.
      inviter.email::text,
      inv.expires_at,
      inv.accepted_at,
      inv.created_at
    from public.invitations inv
    left join auth.users inviter on inviter.id = inv.invited_by
    where inv.org_id = p_org_id
    order by inv.created_at desc;
end;
$$;

revoke execute on function public.admin_list_org_invitations(uuid) from public, anon;
grant execute on function public.admin_list_org_invitations(uuid) to authenticated;

comment on function public.admin_list_org_invitations(uuid) is
  'Platform back-office: invitations of one organization (id, email, role, status, '
  'inviter email, dates). Tokens are never returned. Gated on is_platform_admin().';

-- ---------------------------------------------------------------------------
-- admin_set_membership_role: change a member's role in any org
-- ---------------------------------------------------------------------------
-- The platform-admin counterpart of update_member_role, which requires
-- is_org_admin(p_org_id) and therefore cannot fix the case it is most needed for:
-- an org left with zero admins (a deleted account leaves an owner-less
-- membership, and admin_list_orgs flags it as `no admin`). Nobody inside such an
-- org can promote anybody, so without this the tenant is unrecoverable.
--
-- THE LAST-ADMIN TRIGGER IS DELIBERATELY NOT RE-IMPLEMENTED HERE.
-- prevent_last_admin_removal() fires BEFORE UPDATE on memberships for every
-- caller, so a demotion that would leave an org member-bearing and adminless
-- raises 'cannot remove or demote the last admin while other members remain'
-- from the trigger. Duplicating that check in this function would put the
-- invariant in two places that could disagree; letting the trigger speak keeps it
-- in one. The back-office surfaces the message as-is.
create or replace function public.admin_set_membership_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_set_membership_role requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  update public.memberships
  set role = p_role
  where org_id = p_org_id
    and user_id = p_user_id;

  -- No row means the membership is gone (the member left, or the account was
  -- deleted) while the back-office still listed it. Raising is what stops the UI
  -- from reporting a role change that landed nowhere.
  if not found then
    raise exception 'no such membership in this organization';
  end if;
end;
$$;

revoke execute on function public.admin_set_membership_role(uuid, uuid, public.membership_role) from public, anon;
grant execute on function public.admin_set_membership_role(uuid, uuid, public.membership_role) to authenticated;

comment on function public.admin_set_membership_role(uuid, uuid, public.membership_role) is
  'Platform back-office: set a member''s role in any organization, including one '
  'left with no admin. The last-admin trigger still blocks demoting the sole admin '
  'while other members remain. Gated on is_platform_admin().';

-- ---------------------------------------------------------------------------
-- admin_set_org_archived: archive OR restore a tenant
-- ---------------------------------------------------------------------------
-- 20260723120000 shipped archive_organization and stated, in its own words, that
-- there is "deliberately no unarchive path in scope". THIS FUNCTION ADDS ONE, and
-- only for platform admins — which is why it is a new function rather than a
-- change to that one. The asymmetry is the point: archiving is a decision an org
-- admin may take for their own tenant, while undoing it is a support action on
-- someone else's data, so it belongs to the operator and not to the org.
--
-- Restoring is safe because archiving destroys nothing: it sets archived_at, and
-- is_org_member / is_org_admin filter on it, so the org drops out of every read
-- path while its memberships, repos and agents stay exactly as they were.
-- Clearing the column makes those helpers return true again and the tenant
-- reappears for its members, in the state they left it.
--
-- Idempotent in both directions: `archived_at is null` / `is not null` in the
-- WHERE means re-archiving an archived org and restoring a live one both touch
-- zero rows, which is why existence is checked separately below rather than
-- inferred from `found`.
create or replace function public.admin_set_org_archived(p_org_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_set_org_archived requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  -- Existence first, and separately from the UPDATE: the update is a no-op when
  -- the org is already in the requested state, so `not found` afterwards cannot
  -- tell "no such org" from "nothing to change".
  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'no such organization';
  end if;

  if p_archived then
    update public.organizations
    set archived_at = now()
    where id = p_org_id
      and archived_at is null;
  else
    update public.organizations
    set archived_at = null
    where id = p_org_id
      and archived_at is not null;
  end if;
end;
$$;

revoke execute on function public.admin_set_org_archived(uuid, boolean) from public, anon;
grant execute on function public.admin_set_org_archived(uuid, boolean) to authenticated;

comment on function public.admin_set_org_archived(uuid, boolean) is
  'Platform back-office: archive (soft-delete) or restore any organization. The '
  'restore direction exists only here — org admins can archive their own tenant '
  'but not unarchive it. Idempotent. Gated on is_platform_admin().';

-- ---------------------------------------------------------------------------
-- admin_revoke_invitation: kill a pending invite
-- ---------------------------------------------------------------------------
-- The desktop app revokes by DELETING the row (org.ts), which RLS allows to the
-- org's own admins. This sets `status = 'revoked'` instead, for two reasons: the
-- enum already carries the value and nothing was writing it, and an operator
-- acting on someone else's tenant should leave a trace of what they did rather
-- than remove the evidence. The row keeps its email, inviter and dates.
--
-- Revoking drops the invite out of `pending_invitation_count` (admin_list_orgs
-- counts status = 'pending') and out of accept_invitation's path, which also
-- requires 'pending' — so the token in the invitee's mailbox stops working the
-- moment this runs. That is the actual point of the action.
--
-- DELIBERATE EXCEPTION to the no-op rule stated at the top of this file: a
-- non-pending invitation raises rather than passing quietly. 'accepted' means the
-- person is already a member — revoking is not what the operator wants, they want
-- to remove the member — and answering "done" to that request would be a lie.
create or replace function public.admin_revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.invitation_status;
begin
  if auth.uid() is null then
    raise exception 'admin_revoke_invitation requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  select status into v_status
  from public.invitations
  where id = p_invitation_id;

  if v_status is null then
    raise exception 'no such invitation';
  end if;

  if v_status <> 'pending' then
    raise exception 'only a pending invitation can be revoked (this one is %)', v_status;
  end if;

  update public.invitations
  set status = 'revoked'
  where id = p_invitation_id;
end;
$$;

revoke execute on function public.admin_revoke_invitation(uuid) from public, anon;
grant execute on function public.admin_revoke_invitation(uuid) to authenticated;

comment on function public.admin_revoke_invitation(uuid) is
  'Platform back-office: mark a pending invitation as revoked, which invalidates '
  'its token immediately. Keeps the row (unlike the desktop app''s delete) so the '
  'action leaves a trace. Raises on a non-pending invitation. Gated on '
  'is_platform_admin().';
