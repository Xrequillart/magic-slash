-- Migration: user_settings.agent_sort — how the left sidebar orders its agents
--
-- The agent list has only ever been newest-first, which is the right default and a
-- poor fit for two real sessions: a dozen agents spread over four repositories, and a
-- list where the only ones that matter are the ones waiting on an answer. The sidebar
-- now carries a sort control beside its "new agent" button, and this is where the
-- answer lives.
--
-- A per-USER setting, beside launch_mode, theme and default_agent_type: how you like
-- to read your own list of work is a property of the person, not of the machine, so it
-- follows the account onto another laptop rather than staying with the window.
--
-- NULL keeps its meaning across this table: never chosen. The app resolves that to
-- 'recent' — newest first, the order every existing install already has — so an
-- untouched account behaves exactly as it does today.

alter table public.user_settings
  add column if not exists agent_sort text;

comment on column public.user_settings.agent_sort is
  'How the desktop left sidebar orders agents: ''recent'' (newest first), ''status'' '
  'or ''repository''. NULL = never chosen; the app defaults to ''recent''.';

-- Constrained like code_theme and default_agent_type, and for the same reason: a
-- typo'd value here reaches the renderer as a mode it has no branch for, i.e. a list
-- in no order at all, on every machine the account signs into.
alter table public.user_settings drop constraint if exists user_settings_agent_sort_check;
alter table public.user_settings add constraint user_settings_agent_sort_check
  check (agent_sort is null or agent_sort in ('recent', 'status', 'repository'));

-- admin_get_user learns the column, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects — and "my agents are in a weird order" is
-- exactly the support call that needs to see it.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260824090000.

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
  code_theme                        text,
  default_agent_type                text,
  agent_sort                        text
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
      s.code_theme,
      s.default_agent_type,
      s.agent_sort
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user_id
      and u.deleted_at is null;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;
