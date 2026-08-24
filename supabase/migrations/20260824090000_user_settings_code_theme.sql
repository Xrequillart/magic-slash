-- Migration: user_settings.code_theme — how the file preview paints code
--
-- The preview's syntax highlighting was highlighted with a fixed dark palette, whatever
-- theme the app was in: pick a light theme and the file drawer still opened on a black
-- slab of code. It now follows `theme`, and this column is the escape hatch for the
-- people that is wrong for — reading code is not reading UI, and someone on a light
-- interface may well want their code dark.
--
-- A per-USER setting, beside theme, language and sync_claude_theme: it is a reading
-- preference, so it follows the account onto another machine rather than staying with
-- the screen (which is what the interface scale does, and why the scale is not here).
--
-- NULL keeps its meaning across this table: never chosen. The app resolves that to
-- 'auto', i.e. take the theme's own appearance, so an untouched account gets the fixed
-- behaviour without ever visiting Settings.

alter table public.user_settings
  add column if not exists code_theme text;

comment on column public.user_settings.code_theme is
  'Appearance the file preview highlights code in: ''auto'' (follow the theme), '
  '''light'' or ''dark''. NULL = never chosen; the app defaults to ''auto''.';

-- Constrained like default_agent_type and for the same reason: a typo'd value here
-- would silently paint every preview in the wrong appearance on every machine the
-- account signs into.
alter table public.user_settings drop constraint if exists user_settings_code_theme_check;
alter table public.user_settings add constraint user_settings_code_theme_check
  check (code_theme is null or code_theme in ('auto', 'light', 'dark'));

-- admin_get_user learns the column, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects — and "the file preview is unreadable" is
-- exactly the support call that needs to see it.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260822090100.

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
      s.code_theme,
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
