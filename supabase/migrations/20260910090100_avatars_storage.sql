-- Migration: avatars storage bucket + own-folder RLS
--
-- The private bucket that actually holds the images `profiles.avatar_url` points at,
-- one object per user at `<uid>/avatar.webp`. The path is not a convention the client
-- is trusted to honour: it is the whole security model. Every policy below keys on
-- `(storage.foldername(name))[1] = auth.uid()::text`, so the first path segment IS
-- the owner, and a user can only ever touch objects inside their own folder. A fixed
-- basename per user also means an avatar change overwrites rather than accumulates,
-- so a bucket can never grow a tail of a user's previous faces.
--
-- `file_size_limit` and `allowed_mime_types` bound what can ever LAND in this bucket:
-- 5242880 bytes (5 MiB) and PNG/JPEG/WebP only. Worth being precise about what that
-- is and is not, because it is easy to read as the server-side half of acceptance
-- criterion 4 ("a file too large or not an image is refused") and it is not:
--
--   * The user-facing refusal is decided by `validateAvatarFile` in
--     desktop/src/avatar.ts, called from the MAIN process
--     (desktop/src/main/ipc/profile-handlers.ts) — the only place the ORIGINAL
--     file's size exists at all. That is where a 20 MB TIFF is turned away with a
--     readable message, and it is authoritative for that job.
--   * These columns see something else entirely: the ENCODED upload, always a
--     256x256 WebP of a few tens of kilobytes. They can never refuse the TIFF, and
--     a bypassed client could upload a 4.9 MB WebP without objection.
--
-- So the two are not the same check twice; they bound different artifacts. The limit
-- is still stated here, and still tracks AVATAR_MAX_BYTES in desktop/src/avatar.ts,
-- because it is the invariant that holds whatever client is talking to us: nothing
-- but a small image ever lands in this bucket.
--
-- FIRST bucket in this repo: no migration before this one touches `storage.*` at all.
-- Two consequences worth knowing before running it. (1) The role executing
-- `supabase db push` must OWN `storage.objects` — `create policy` on a table you do
-- not own fails, and on a hosted project the migration runner is the owner, but a
-- self-hosted or hand-rolled connection may not be. (2) The bucket row is inserted
-- with `on conflict (id) do nothing`, so re-running against a project where the bucket
-- was created by hand in the dashboard is a no-op rather than an error — note that in
-- that case the hand-made bucket's limits stand, and they are worth checking.
--
-- Deliberately NOT done here: `admin_get_user` is not recreated to expose
-- `avatar_url`. An RPC's `returns table` is an allowlist, so the back-office cannot
-- see the column — and it has no use for one. Widening it would mean a
-- `drop function` plus a full verbatim rewrite of a 35-column signature (see
-- 20260826090000 for what that costs) to hand a support engineer a photo they never
-- asked for. The column stays out of the admin surface.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS — strictly own-folder, mirroring the four `profiles_*` policies of
-- 20260724130000: an avatar is as private as the profile row pointing at it.
-- Same using/with check split, for the same reasons: `using` filters the rows a
-- verb may touch, `with check` validates the row it leaves behind, and `update`
-- needs BOTH (you may only overwrite your own object, and only into your own
-- folder).
--
-- The `update` policy is not defensive padding: the app uploads with
-- `upload(..., { upsert: true })`, which resolves to an UPDATE on the second and
-- every later save. Without it, setting an avatar would work exactly once per
-- user and then start failing with a policy violation.
--
-- Each policy is dropped first. `create policy` has no `if not exists` form, and
-- unlike `public.profiles` this migration does not create the table it policies —
-- `storage.objects` is shared with every future bucket and may already carry a
-- hand-made `avatars_*` from the dashboard. Dropping makes this file the definition
-- of record rather than a conflict.
--
-- No `grant` here, unlike the `profiles` migration: Supabase already grants
-- select/insert/update/delete on `storage.objects` to `anon` and `authenticated` when
-- it creates the schema. RLS is therefore the ONLY thing standing between a signed-in
-- user and every object of every bucket, which is why these four policies are written
-- as an allowlist keyed on the folder rather than as exceptions to a wider rule.
-- ---------------------------------------------------------------------------

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
