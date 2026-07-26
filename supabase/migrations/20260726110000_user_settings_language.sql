-- Migration: user_settings.language
--
-- The desktop app's interface can now be English or French. The choice joins the
-- other application-level preferences in user_settings so it follows the user
-- from machine to machine rather than being a property of one install. NULL keeps
-- its established meaning here: the user never chose, and the app applies its own
-- default (en).
--
-- Note this is the INTERFACE language only. The per-repository `languages`
-- settings (which language Claude writes a commit message or a PR in) live on
-- the repositories table and are unrelated.
--
-- The CHECK is a shape, not a list — same reasoning as theme above it. Mirroring
-- the enum the way launch_mode does would mean a migration for every language
-- ever added, and a client running an older build already has to cope with a
-- value it doesn't recognise (it re-validates on read and falls back to English).

alter table public.user_settings
  add column if not exists language text;

alter table public.user_settings
  drop constraint if exists user_settings_language_check;

alter table public.user_settings
  add constraint user_settings_language_check check (
    language is null or language ~ '^[a-z]{2}$'
  );

comment on column public.user_settings.language is
  'Chosen interface language (e.g. en, fr). NULL = never chosen; the app defaults.';
