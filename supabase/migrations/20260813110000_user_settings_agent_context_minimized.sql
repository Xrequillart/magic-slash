-- Migration: user_settings.agent_context_minimized
--
-- The right sidebar's session card can be collapsed to its context gauge with the
-- − button in its corner, exactly like the left sidebar's usage card. Unlike that
-- one, the state was a React useState: it did not survive switching agent, let
-- alone a restart, so anyone who wanted the compact form had to ask for it again
-- every few minutes.
--
-- This column is that state, and it is what the Appearance tab's format select
-- writes. It joins `usage_card_minimized`, which has always been persisted this
-- way, so the two cards of the two sidebars now behave identically: the ± button
-- and the select are two ways of setting the same thing.
--
-- NULL keeps its established meaning: never chosen, and the app defaults to the
-- expanded form.

alter table public.user_settings
  add column if not exists agent_context_minimized boolean;

comment on column public.user_settings.agent_context_minimized is
  'Collapse the right sidebar agent card to its context gauge. NULL = never chosen; the app defaults to expanded.';
