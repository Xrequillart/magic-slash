-- Migration: user_settings notification preferences
--
-- The app notified and there was no way to ask it not to. Six kinds of OS
-- notification (an agent waiting for input, an agent finishing, a PR review
-- landing, a reviewer requesting changes, a colleague picking up your ticket,
-- the daily digest) all funnelled through one sink, gated only by "is the window
-- focused" and per-kind cooldowns. `daily_digest_enabled` was the single opt-in
-- in the whole set.
--
-- Three columns, matching the new Settings → Notifications tab:
--
--   * notifications_enabled — the master. Checked at the sink, so it covers the
--     kinds that have no switch of their own, and it is deliberately separate
--     from the per-kind flags: turning it off is a "not now" that must not
--     destroy the choices underneath, which is why they are kept and simply
--     hidden while it is off.
--   * notification_agent_waiting / notification_agent_completed — the two kinds
--     tied to your own agents, the ones frequent enough to be worth silencing
--     one at a time.
--
-- They live in user_settings rather than on the machine for the same reason as
-- theme and language: how much this app is allowed to interrupt you is a
-- property of you, not of the desk you are sitting at.
--
-- NULL keeps its established meaning: never chosen. All three default to ON —
-- absent must describe the behaviour every existing install already has.

alter table public.user_settings
  add column if not exists notifications_enabled boolean,
  add column if not exists notification_agent_waiting boolean,
  add column if not exists notification_agent_completed boolean;

comment on column public.user_settings.notifications_enabled is
  'Master switch for OS notifications. NULL = never chosen; the app defaults to on.';
comment on column public.user_settings.notification_agent_waiting is
  'Notify when an agent is waiting for input. NULL = never chosen; the app defaults to on.';
comment on column public.user_settings.notification_agent_completed is
  'Notify when an agent finishes its task. NULL = never chosen; the app defaults to on.';
