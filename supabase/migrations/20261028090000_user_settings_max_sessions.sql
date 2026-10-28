-- Migration: how many Claude Code sessions may run at once (Settings → Sessions → List),
-- as one user_settings column:
--
--   max_sessions  5 | 10 | 15 | 20 | 25 | 30
--
-- NULL = never chosen; the app reads it as 15 (DEFAULT_MAX_SESSIONS in desktop/src/types.ts),
-- the first step at or above the 12 it was capped at before this could be set.

alter table public.user_settings
  add column if not exists max_sessions smallint;

comment on column public.user_settings.max_sessions is
  'How many Claude Code sessions may run at once: 5 to 30, in steps of 5. NULL = never chosen; the app defaults to 15.';

-- Constrained like the chat view's columns, for the same reason.
alter table public.user_settings drop constraint if exists user_settings_max_sessions_check;
alter table public.user_settings add constraint user_settings_max_sessions_check
  check (max_sessions is null or max_sessions in (5, 10, 15, 20, 25, 30));
