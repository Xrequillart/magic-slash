-- Migration: user_settings.sync_claude_theme
--
-- Claude Code running inside a terminal pane paints itself from a theme chosen
-- once at install time, unrelated to the app hosting it. In a light app theme
-- with Claude Code still on a dark one, parts of the transcript go white on
-- white. The app can now generate a Claude Code theme from the active app theme
-- and hand it to the terminals it spawns; this column is the opt-out.
--
-- It joins theme and language in user_settings rather than staying on the
-- machine, because it is a property of how the person wants to read their
-- terminal, not of the screen in front of them — the same reasoning that put the
-- theme here, and the opposite of the one that keeps the zoom local.
--
-- NULL keeps its established meaning: the user never chose, and the app applies
-- its own default. That default is ON, unlike most opt-ins here — an unreadable
-- transcript reads as a bug rather than as a feature nobody switched on, and the
-- app never touches the user's own Claude Code config to achieve it (the theme
-- is passed per-launch on the command line, so Claude Code started from a normal
-- terminal is unaffected either way).

alter table public.user_settings
  add column if not exists sync_claude_theme boolean;

comment on column public.user_settings.sync_claude_theme is
  'Repaint Claude Code in the terminal panes to match the app theme. NULL = never chosen; the app defaults to on.';
