-- Migration: user_settings.agent_context_enabled
--
-- The right sidebar opens every agent with a session card: the context gauge,
-- the model, the cost and the elapsed time. It is rendered unconditionally, and
-- for someone who does not want a running cost in their peripheral vision all
-- day there was no way to turn it off.
--
-- It joins `usage_card_enabled` — its counterpart in the LEFT sidebar, which the
-- Appearance tab now shows next to it — rather than staying on the machine, for
-- the same reason theme and language are here: it is a decision about how the
-- person wants to read the app, not about the screen in front of them, and it
-- would be strange for one of two adjacent switches to follow you to a second
-- machine while the other did not.
--
-- NULL keeps its established meaning: the user never chose, and the app applies
-- its own default. That default is ON — it is what every existing install shows
-- today, and a migration must not silently take a panel away.

alter table public.user_settings
  add column if not exists agent_context_enabled boolean;

comment on column public.user_settings.agent_context_enabled is
  'Show the agent session/context card in the right sidebar. NULL = never chosen; the app defaults to on.';
