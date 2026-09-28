-- Migration: user_settings.code_syntax and code_font_size — the palette code is
-- highlighted in, and the size it is set in.
--
-- code_theme (20260824090000) was an APPEARANCE: follow the theme, always light, always
-- dark, with GitHub's pair behind it. It is replaced by a palette FAMILY — GitHub,
-- Catppuccin, Rosé Pine… — whose light or dark variant the interface theme picks, so the
-- reader chooses the colours and can no longer end up with light code on a dark window.
-- The desktop stops reading code_theme with this release; the column is left in place
-- rather than dropped, since an older build still reads it and nothing is gained by
-- breaking that build's preference.
--
-- Per-USER settings, beside theme and code_theme and for their reason: reading
-- preferences follow the account onto another machine.
--
-- NULL keeps its meaning across this table: never chosen. code_syntax NULL resolves to
-- 'auto' (each theme's paired family, GitHub on the two neutral ones, i.e. what the
-- preview already painted), code_font_size NULL to 12, the size the preview always used.

alter table public.user_settings
  add column if not exists code_syntax text,
  add column if not exists code_font_size integer;

comment on column public.user_settings.code_syntax is
  'Palette family code is highlighted in (''auto'' or a family id, see CODE_SYNTAX_FAMILIES '
  'in desktop/src/types.ts); the interface theme picks its light or dark variant. NULL = '
  'never chosen; the app defaults to ''auto''.';

comment on column public.user_settings.code_font_size is
  'Size code is set in, in pixels (11 to 16). NULL = never chosen; the app defaults to 12.';

-- Constrained like code_theme and for the same reason: a typo'd value would silently
-- paint every preview in the fallback on every machine the account signs into. The list
-- is CODE_SYNTAX_FAMILIES' keys; adding a family is a migration widening it.
alter table public.user_settings drop constraint if exists user_settings_code_syntax_check;
alter table public.user_settings add constraint user_settings_code_syntax_check
  check (code_syntax is null or code_syntax in (
    'auto', 'github', 'github-high-contrast', 'one', 'vscode', 'catppuccin', 'rose-pine',
    'night-owl', 'solarized', 'gruvbox', 'everforest', 'kanagawa', 'vitesse', 'ayu',
    'material', 'min'
  ));

alter table public.user_settings drop constraint if exists user_settings_code_font_size_check;
alter table public.user_settings add constraint user_settings_code_font_size_check
  check (code_font_size is null or code_font_size between 11 and 16);

-- admin_get_user learns both columns, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260922090000.

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
  info_sidebar_on_create            boolean,
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
  code_syntax                       text,
  code_font_size                    integer,
  default_agent_type                text,
  agent_sort                        text,
  tasks_repo                        text,
  plans_repo                        text
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
      s.info_sidebar_on_create,
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
      s.code_syntax,
      s.code_font_size,
      s.default_agent_type,
      s.agent_sort,
      s.tasks_repo,
      s.plans_repo
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user_id
      and u.deleted_at is null;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;
