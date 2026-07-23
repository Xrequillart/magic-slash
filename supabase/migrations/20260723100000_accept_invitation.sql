-- Migration: accept_invitation + get_org_shared_config
-- Cloud PR 2 of epic #121 (auth & organization). Adds the two RPCs the desktop
-- app needs for invitation-based onboarding:
--   * accept_invitation(token)      — an invitee joins an org from an invite.
--   * get_org_shared_config(org_id) — an invitee inherits the org's shared config.
--
-- Both run SECURITY DEFINER with a locked search_path, mirroring the PR1 helpers
-- (create_organization, is_org_member, ...). PR1 established: memberships has a
-- unique (org_id, user_id) and an admin role gate on INSERT; invitations carry
-- (email, role, token, status, expires_at, accepted_at); the org's admin/creator
-- is organizations.created_by; configs is per-user (unique (org_id, user_id)).

-- ---------------------------------------------------------------------------
-- accept_invitation: an authenticated invitee joins an org from an invite token
-- ---------------------------------------------------------------------------
-- There is deliberately no self-service INSERT policy on memberships (PR1 gates
-- inserts behind is_org_admin). Accepting an invitation must therefore run as
-- the table owner: it validates the invite belongs to the caller (email match),
-- is still pending and unexpired, then atomically creates the membership and
-- marks the invitation accepted. Returns the joined org_id.
create or replace function public.accept_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv           public.invitations%rowtype;
  current_uid   uuid := auth.uid();
  current_email text := auth.jwt() ->> 'email';
begin
  if current_uid is null then
    raise exception 'accept_invitation requires an authenticated user';
  end if;

  select * into inv
  from public.invitations
  where token = invitation_token
  for update;

  if not found then
    raise exception 'invitation not found';
  end if;

  if inv.status <> 'pending' then
    raise exception 'invitation is not pending (status: %)', inv.status;
  end if;

  if inv.expires_at is not null and inv.expires_at < now() then
    -- Reject expired invitations. We deliberately do NOT flip status to 'expired'
    -- here: this function raises, and any UPDATE would roll back with it (same
    -- transaction), so it would look persisted but be a no-op. Expiry is derived
    -- from expires_at at read time instead (see listInvitations in cloud/org.ts,
    -- which reports a past-due pending invite as 'expired').
    raise exception 'invitation has expired';
  end if;

  -- Email match is case-insensitive: the JWT email must equal the invite email.
  if current_email is null or lower(current_email) <> lower(inv.email) then
    raise exception 'invitation email does not match the authenticated user';
  end if;

  -- Create the membership with the role carried by the invitation. If the user
  -- is somehow already a member, treat the invite as accepted rather than error.
  insert into public.memberships (org_id, user_id, role)
  values (inv.org_id, current_uid, inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = inv.id;

  return inv.org_id;
end;
$$;

revoke execute on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_org_shared_config: the shared config fields the invitee inherits
-- ---------------------------------------------------------------------------
-- configs is per-user (there is no org-level config row), so the "org shared
-- config" is sourced from the org creator/admin's config row
-- (organizations.created_by). Only the shared fields are exposed — languages,
-- commit/PR format, and shared repo keywords — never per-user/local bits. The
-- caller must be a member of the org (defense-in-depth on top of RLS, since
-- SECURITY DEFINER bypasses it). Returns jsonb (an empty object when the admin
-- has no config yet).
create or replace function public.get_org_shared_config(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  admin_uid uuid;
  admin_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_org_shared_config requires an authenticated user';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organization';
  end if;

  select created_by into admin_uid
  from public.organizations
  where id = p_org_id;

  if admin_uid is null then
    return '{}'::jsonb;
  end if;

  select data into admin_data
  from public.configs
  where org_id = p_org_id
    and user_id = admin_uid;

  if admin_data is null then
    return '{}'::jsonb;
  end if;

  -- Expose only the shared fields; strip nulls so absent keys are simply omitted.
  return jsonb_strip_nulls(jsonb_build_object(
    'languages',    admin_data -> 'languages',
    'commit',       admin_data -> 'commit',
    'pullRequest',  admin_data -> 'pullRequest',
    'repoKeywords', admin_data -> 'repoKeywords'
  ));
end;
$$;

revoke execute on function public.get_org_shared_config(uuid) from public;
grant execute on function public.get_org_shared_config(uuid) to authenticated;
