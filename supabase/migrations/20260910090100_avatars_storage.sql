-- Migration: avatars storage bucket + own-folder RLS
--
-- The private bucket that actually holds the images `profiles.avatar_url` points at,
-- one object per user at `<uid>/avatar.webp`. The path is not a convention the client
-- is trusted to honour: it is the whole security model. Every policy below keys on
-- `(storage.foldername(name))[1] = auth.uid()::text`, so the first path segment IS
-- the owner, and a user can only ever touch objects inside their own folder. The two
-- WRITE policies go one step further and pin the whole key to
-- `auth.uid()::text || '/avatar.webp'`, so the fixed basename is enforced by the
-- database and not merely by the uploader: an avatar change overwrites rather than
-- accumulates, and a bucket can never grow a tail of a user's previous faces. Read
-- and delete deliberately stay on the folder test — see the asymmetry note below.
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
-- Note also what a per-object size limit does NOT bound: the total. 5 MiB each says
-- nothing about how many objects a user may own, and Storage has no per-user quota to
-- lean on. What keeps the bucket finite is the single blessed key per user, enforced
-- by the write policies below — one row per user, overwritten in place.
--
-- FIRST bucket in this repo: no migration before this one touches `storage.*` at all.
-- Two consequences worth knowing before running it. (1) The role executing
-- `supabase db push` must OWN `storage.objects` — `create policy` on a table you do
-- not own fails, and on a hosted project the migration runner is the owner, but a
-- self-hosted or hand-rolled connection may not be. (2) The bucket row is inserted
-- with `on conflict (id) do update`, so re-running against a project where the bucket
-- was created by hand in the dashboard is not an error — and, unlike a `do nothing`,
-- not a silent no-op either: the conflict branch CORRECTS the pre-existing row
-- instead of preserving it. That distinction is the whole point. A dashboard-created
-- `avatars` bucket defaults to PUBLIC, and a public bucket serves every object by
-- unauthenticated URL — every user's photo readable by anyone who can guess or
-- forward a link, which is exactly what a private bucket plus the RLS below exists to
-- prevent. Weaker `file_size_limit` / `allowed_mime_types` on such a row would
-- likewise quietly widen what may land here. So the branch forces `public = false`
-- and re-applies both limits from `excluded`; the statement stays idempotent, since
-- running it against a row that already matches writes the same values back.
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
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
-- WRITES are pinned to the exact key, READS and DELETES are not. The asymmetry is
-- deliberate:
--
--   * `avatars_insert` / `avatars_update` require `name` to be exactly
--     `<uid>/avatar.webp`. A folder-only test would let an authenticated client talk
--     to Storage directly and create `<uid>/1.webp`, `<uid>/2.webp`, ... — each one
--     inside its own folder, each under 5 MiB, each perfectly legal, and nothing
--     anywhere capping the count. One blessed name per user is what makes the bucket
--     bounded: a new upload can only ever land on the row the previous one left.
--   * `avatars_select` / `avatars_delete` stay on the folder-prefix test, because an
--     object may exist under some other name — written before this tightening, or by
--     any route that is not the app. Such a stray must remain readable and, above
--     all, DELETABLE: pinning reads and deletes to the single blessed name would
--     strand exactly the garbage this change stops the app from creating, leaving it
--     unremovable by its own owner and by `delete_account()` (20260910090200, which
--     clears the caller's objects by folder for precisely this reason).
--
-- Within `avatars_update` the same split applies, and it is why only `with check`
-- carries the exact-name test. `using` picks which EXISTING rows may be targeted, so
-- keeping it on the folder leaves a stray addressable; `with check` validates the row
-- the statement leaves behind, so whatever is targeted can only ever come out as
-- `<uid>/avatar.webp`. An update therefore folds a stray into the blessed key and can
-- never produce a second name.
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
    and name = auth.uid()::text || '/avatar.webp'
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
    and name = auth.uid()::text || '/avatar.webp'
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
