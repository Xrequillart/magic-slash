-- Migration: user_settings.default_agent_type — what a NEW agent is, by default
--
-- The previous migration gives an agent a `type` (coder or planner). This is the
-- preference that decides which one a freshly created agent gets, before any skill
-- has said anything: the app reads it in terminal:launchClaude and writes the answer
-- into the agent's metadata at creation.
--
-- A per-USER setting rather than a per-repo one. Which kind of work you tend to start
-- is a property of the person — the same repository is planned against by one teammate
-- and implemented in by another — so it belongs here beside launch_mode and theme,
-- and follows the account onto another machine.
--
-- NULL keeps its meaning across this table: never chosen. The app resolves that to
-- 'coder', which is what every agent was before planning existed, so an untouched
-- account behaves exactly as it does today.

alter table public.user_settings
  add column if not exists default_agent_type text;

comment on column public.user_settings.default_agent_type is
  'Kind given to a newly created agent: ''coder'' or ''planner''. NULL = never chosen; '
  'the app defaults to ''coder''.';

-- Constrained like agents.type in the previous migration, and for the same reason: a
-- typo'd value here would silently create every new agent as the wrong kind.
alter table public.user_settings drop constraint if exists user_settings_default_agent_type_check;
alter table public.user_settings add constraint user_settings_default_agent_type_check
  check (default_agent_type is null or default_agent_type in ('coder', 'planner'));

-- admin_get_user learns the column, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects — and "all my new agents come up as
-- planners" is exactly the support call that needs it.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260821090100.

drop function if exists public.admin_get_user(uuid);

create function public.admin_get_user(p_user_id uuid)
returns table (
  user_id                           uuid,
  email                             text,
  created_at                        timestamptz,
  last_sign_in_at                   timestamptz,
  name                              text,
  role                              text,
  usage_card_enabled                boolean,
  usage_card_minimized              boolean,
  agent_context_enabled             boolean,
  agent_context_minimized           boolean,
  usage_logs_enabled                boolean,
  daily_digest_enabled              boolean,
  notifications_enabled             boolean,
  notification_agent_waiting        boolean,
  notification_agent_completed      boolean,
  notification_pr_review            boolean,
  notification_pr_changes_requested boolean,
  split_enabled                     boolean,
  split_active                      boolean,
  pr_reviews_enabled                boolean,
  pr_reviews_poll_interval_ms       integer,
  pr_reviews_auto_launch_skills     boolean,
  plan_sync_enabled                 boolean,
  spotlight_enabled                 boolean,
  spotlight_shortcut                text,
  auto_start_at_login               boolean,
  launch_mode                       text,
  atlassian_integration_enabled     boolean,
  theme                             text,
  language                          text,
  sync_claude_theme                 boolean,
  default_agent_type                text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_get_user requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      p.name,
      p.role,
      s.usage_card_enabled,
      s.usage_card_minimized,
      s.agent_context_enabled,
      s.agent_context_minimized,
      s.usage_logs_enabled,
      s.daily_digest_enabled,
      s.notifications_enabled,
      s.notification_agent_waiting,
      s.notification_agent_completed,
      s.notification_pr_review,
      s.notification_pr_changes_requested,
      s.split_enabled,
      s.split_active,
      s.pr_reviews_enabled,
      s.pr_reviews_poll_interval_ms,
      s.pr_reviews_auto_launch_skills,
      s.plan_sync_enabled,
      s.spotlight_enabled,
      s.spotlight_shortcut,
      s.auto_start_at_login,
      s.launch_mode,
      s.atlassian_integration_enabled,
      s.theme,
      s.language,
      s.sync_claude_theme,
      s.default_agent_type
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user_id
      and u.deleted_at is null;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;
