-- Migration: profiles.avatar_url — where a user's photo lives
--
-- The identity card in the desktop app's Account tab has never shown a face at all:
-- an email address and a hint line, nothing more. (The initials disc that does exist
-- is a different surface — the settings tab rail's footer — and this work does not
-- touch it.) A face is what makes a shared team view legible at a glance, and it is
-- the one piece of "who the human is" that the profile table could not hold: an
-- image is not a text column. This adds the pointer to it.
--
-- What this column is NOT: a public URL. The `avatars` bucket created by the next
-- migration is private, so an `https://…` link would be dead the moment it left the
-- session that minted it. Storing a signed URL instead would be worse: it embeds an
-- expiry, so the row would rot on a schedule and every reader would have to guess
-- whether a 400 meant "no photo" or "stale link". What is stored is the Storage
-- object path — `<uid>/avatar.webp` — which is stable forever; clients turn it into
-- something displayable at read time (a signed URL or a direct download) and are
-- free to change how they do that without a migration.
--
-- NULL means no photo: either never set, or removed. The app falls back to a generic
-- person icon on the same coloured disc — never an initial, which would read as
-- information about an account already named in full beside it.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Storage object path of the user avatar in the private ''avatars'' bucket, '
  'always ''<uid>/avatar.webp''. NOT an https:// URL and NOT a signed URL: the '
  'bucket is private, so clients sign or download the path at read time. '
  'NULL = no photo (never set, or removed).';
