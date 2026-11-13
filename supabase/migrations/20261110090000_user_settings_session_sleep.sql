-- Migration: after how many minutes alone an agent's Claude Code is put to sleep to free
-- its memory (Settings → Sessions → List), as one user_settings column:
--
--   session_sleep_minutes  0 | 5 | 15 | 30 | 60 | 120   (0 = never)
--
-- NULL = never chosen; the app reads it as 15 (DEFAULT_SESSION_SLEEP_MINUTES in
-- desktop/src/types.ts), the delay the sleep shipped with.

alter table public.user_settings
  add column if not exists session_sleep_minutes smallint;

comment on column public.user_settings.session_sleep_minutes is
  'Minutes alone before an agent''s Claude Code is put to sleep: 0 (never), 5, 15, 30, 60 or 120. NULL = never chosen; the app defaults to 15.';

-- Constrained like max_sessions, for the same reason.
alter table public.user_settings drop constraint if exists user_settings_session_sleep_minutes_check;
alter table public.user_settings add constraint user_settings_session_sleep_minutes_check
  check (session_sleep_minutes is null or session_sleep_minutes in (0, 5, 15, 30, 60, 120));
