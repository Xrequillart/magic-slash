-- Migration: delete_account (GDPR account deletion)
-- Cloud account-lifecycle work (ticket #135). Adds the RPC the desktop app calls
-- when a user asks to permanently delete their account and personal data.
--
-- Data retention / what gets removed, and why:
--   * Organizations the caller created that STILL HAVE OTHER MEMBERS are handed
--     off, NOT deleted: created_by is reassigned to another member (preferring an
--     existing admin). Deleting a shared org just because the creator leaves would
--     destroy every other member's memberships, configs, skills and activity — so
--     we keep the org and only detach the departing user. (created_by is a NO
--     ACTION FK, so it must be repointed before the users delete below.)
--   * Organizations the caller created with NO other members (their personal org
--     from sign-up, whose name embeds the user's email local-part / PII, plus any
--     other solo org) are deleted outright. This cascades that org's memberships,
--     invitations, configs, agents, skills, usage and activity events (all FK
--     org_id ON DELETE CASCADE).
--   * The caller's memberships in surviving orgs are removed (they also cascade
--     from the auth.users delete below, but we delete them explicitly for clarity).
--   * invitations.invited_by and skills.created_by referencing the caller are set
--     to NULL where those rows survive in orgs that are kept (invited_by is ON NO
--     ACTION so it must be cleared before the users delete; skills.created_by is
--     already ON DELETE SET NULL and needs no help).
--   * Finally the auth.users row is deleted. This cascades the caller's configs
--     (ON DELETE CASCADE) and nulls usage_events/activity_events.user_id
--     (ON DELETE SET NULL), preserving append-only org telemetry without PII.
--
-- SECURITY DEFINER so the function can delete from auth.users (the caller has no
-- direct privilege there). Locked search_path; auth.users is schema-qualified
-- since `auth` is intentionally not on the search_path. Idempotent via
-- create or replace. Guarded to require an authenticated caller.

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
  --    other member's data survive. created_by is NO ACTION, so it must not point
  --    at the row we delete in step 5.
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
  --    personal/solo orgs — the name embeds the caller's email PII). Cascades all
  --    of that org's data.
  delete from public.organizations o
  where o.created_by = current_uid
    and not exists (
      select 1 from public.memberships m
      where m.org_id = o.id and m.user_id <> current_uid
    );

  -- 3. Clear references to the caller that would otherwise block the users delete
  --    or leave a dangling actor in orgs that survive.
  update public.invitations set invited_by = null where invited_by = current_uid;

  -- 4. Remove the caller's remaining memberships (in handed-off or other orgs).
  --    The auth.users delete would cascade these too; explicit for clarity.
  delete from public.memberships where user_id = current_uid;

  -- 5. Delete the account itself. Cascades the caller's configs; nulls the
  --    append-only usage/activity actor and skills.created_by.
  delete from auth.users where id = current_uid;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default; lock it down to authenticated
-- sessions only (never anon).
revoke execute on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

comment on function public.delete_account() is
  'GDPR account deletion for the authenticated caller: hands off orgs they created '
  'that still have other members (reassigning created_by, preferring an admin), '
  'deletes their solo orgs (cascading all contained data), removes their '
  'memberships, anonymizes invited_by references, and deletes their auth.users row '
  '(cascading configs, nulling append-only usage/activity actors). Callable only by '
  'authenticated.';
