-- Migration: user_settings.theme
--
-- The desktop app can now be light or dark. The choice joins the other
-- application-level preferences in user_settings so it follows the user from
-- machine to machine rather than being a property of one install. NULL keeps its
-- established meaning here: the user never chose, and the app applies its own
-- default (dark).
--
-- The CHECK is a shape, not a list. Mirroring the enum the way launch_mode does
-- would mean a migration for every theme ever added, and a client running an
-- older build already has to cope with a value it doesn't recognise (it
-- re-validates on read and falls back to its default). So the constraint only
-- keeps the column from becoming a dumping ground.

alter table public.user_settings
  add column if not exists theme text;

alter table public.user_settings
  drop constraint if exists user_settings_theme_check;

alter table public.user_settings
  add constraint user_settings_theme_check check (
    theme is null or theme ~ '^[a-z0-9-]{1,32}$'
  );

comment on column public.user_settings.theme is
  'Chosen appearance (e.g. dark, light). NULL = never chosen; the app defaults.';
