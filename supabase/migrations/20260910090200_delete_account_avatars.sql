-- Migration: delete_account also removes the caller's avatar object
--
-- Acceptance criterion 6 of the avatar work (#288): deleting your account deletes
-- your photo too, with no orphaned file left in the bucket. Until now nothing in the
-- cascade knew `storage.objects` existed — it is a table in another schema with no FK
-- to `auth.users`, so the account delete walked straight past it and left the image
-- behind, keyed on the uid of a user who no longer exists. That is exactly the residue
-- a GDPR deletion is supposed not to leave.
--
-- WHY a new migration rather than an edit to 20260723110000_delete_account.sql: that
-- file is already applied everywhere. `supabase db push` compares migration VERSIONS
-- against `supabase_migrations.schema_migrations`, not file contents, so editing an
-- applied file changes nothing on any existing database and does so silently — the
-- push reports success, the function keeps its old body, and the difference only
-- surfaces the next time someone runs `db reset` from scratch. A new version is the
-- only edit Postgres will actually see.
--
-- The whole function is restated below, not just the new step. `create or replace
-- function` replaces the entire body: a partial rewrite would silently drop the org
-- hand-off, the solo-org delete and the reference cleanup, i.e. turn a careful GDPR
-- cascade into a data-loss bug that no test of the new step would catch. Steps 1-4
-- and the final users delete are behaviour-for-behaviour what 20260723110000 shipped.
--
-- Data retention / what gets removed, and why (unchanged from 20260723110000, plus
-- the avatar):
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
--   * NEW: the caller's objects in the `avatars` bucket (`<uid>/avatar.webp`) are
--     deleted. Honest caveat: this deletes the ROW in `storage.objects`, which is
--     Postgres' index of the bucket — it does not itself unlink the blob in the
--     object backend, because Postgres has no reach into S3. The row going away is
--     what makes the file unreachable and unlisted, and it is the strongest
--     guarantee available from SQL. Actually reclaiming the bytes is the storage
--     API's job, which is why the desktop app calls `storage.remove()` on the path
--     BEFORE invoking this RPC: the API deletes blob and row together on the happy
--     path, and this step is the backstop for the cases the app cannot cover (a
--     crash mid-deletion, an older client, a deletion triggered from elsewhere).
--     Belt and braces on purpose — the RPC must not depend on a client having done
--     its half.
--   * Finally the auth.users row is deleted. This cascades the caller's configs
--     (ON DELETE CASCADE) and nulls usage_events/activity_events.user_id
--     (ON DELETE SET NULL), preserving append-only org telemetry without PII.
--
-- SECURITY DEFINER so the function can delete from auth.users (the caller has no
-- direct privilege there). Locked search_path; auth.users and storage.objects are
-- schema-qualified since neither `auth` nor `storage` is on the search_path — and
-- note that the avatar step is safe under either privilege outcome: if RLS applies
-- to the definer role, `avatars_delete` still resolves `auth.uid()` from the
-- caller's claims and permits exactly the caller's own folder. Idempotent via
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
  --    at the row we delete in step 6.
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

  -- 5. Remove the caller's avatar object. `storage.objects` has no FK to
  --    auth.users, so nothing below cascades it — without this the image row
  --    outlives the account. Keyed on the owning folder, exactly like the
  --    avatars_* policies, so it can only ever match the caller's own path.
  --
  --    The set_config is required, not decoration: recent storage-api versions put
  --    a BEFORE DELETE trigger (storage.protect_delete) on this table that raises
  --    42501 — 'Direct deletion from storage tables is not allowed' — unless
  --    `storage.allow_delete_query` is 'true'. Its point is to stop a careless
  --    `delete from storage.objects` orphaning blobs, and here the opt-in is the
  --    deliberate answer to it: the app has already asked the Storage API to remove
  --    the blob, and this statement is the row-level backstop. `is_local => true`
  --    scopes the setting to this transaction, so it never leaks to whatever else
  --    the session goes on to do. Harmless where the trigger does not exist: it is
  --    just an unread custom GUC.
  perform set_config('storage.allow_delete_query', 'true', true);

  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = current_uid::text;

  -- 6. Delete the account itself. Cascades the caller's configs; nulls the
  --    append-only usage/activity actor and skills.created_by.
  delete from auth.users where id = current_uid;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default; lock it down to authenticated
-- sessions only (never anon). Restated because `create or replace` above does not
-- reset grants, but a fresh `db reset` runs this file as the definition of record.
revoke execute on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

comment on function public.delete_account() is
  'GDPR account deletion for the authenticated caller: hands off orgs they created '
  'that still have other members (reassigning created_by, preferring an admin), '
  'deletes their solo orgs (cascading all contained data), removes their '
  'memberships, anonymizes invited_by references, deletes their objects in the '
  '''avatars'' bucket, and deletes their auth.users row (cascading configs, nulling '
  'append-only usage/activity actors). Callable only by authenticated.';
