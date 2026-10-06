-- Migration: two more pages for the sidebar's menu, Settings and Account, and
-- user_settings.sidebar_shown for them.
--
-- Unlike the other four, they are OPT-IN: the title bar's account menu already opens both,
-- so the menu leaves them out until the reader puts them on it. Their visibility cannot
-- live in sidebar_hidden, where absence means shown; sidebar_shown is its mirror, the
-- opt-in pages the reader put on the menu. NULL or empty = none of them
-- (SIDEBAR_OPT_IN_PAGES and isSidebarPageShown in desktop/src/types.ts).
--
-- Older builds clean the two ids out of what they read and never write sidebar_shown, so
-- an account on one of them simply goes on without the two rows.

alter table public.user_settings
  add column if not exists sidebar_shown text[];

comment on column public.user_settings.sidebar_shown is
  'The opt-in sidebar pages (settings, account) the user put on the menu. NULL or empty = none.';

-- The catalogue grows by two, for every list of its ids (see 20260929090000).
alter table public.user_settings drop constraint if exists user_settings_sidebar_order_check;
alter table public.user_settings add constraint user_settings_sidebar_order_check
  check (sidebar_order is null or sidebar_order <@ array[
    'plans', 'tasks', 'skills', 'repositories', 'settings', 'account'
  ]::text[]);

alter table public.user_settings drop constraint if exists user_settings_sidebar_hidden_check;
alter table public.user_settings add constraint user_settings_sidebar_hidden_check
  check (sidebar_hidden is null or sidebar_hidden <@ array[
    'plans', 'tasks', 'skills', 'repositories', 'settings', 'account'
  ]::text[]);

alter table public.user_settings drop constraint if exists user_settings_sidebar_shown_check;
alter table public.user_settings add constraint user_settings_sidebar_shown_check
  check (sidebar_shown is null or sidebar_shown <@ array[
    'plans', 'tasks', 'skills', 'repositories', 'settings', 'account'
  ]::text[]);

-- admin_get_user learns the column, for the reason 20260821090100 gives. Dropped before
-- being recreated: `create or replace` cannot change a return type. Everything else is
-- byte-for-byte the definition in 20261005160000.

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
  split_new_agent_pane              text,
  pr_reviews_enabled                boolean,
  pr_reviews_poll_interval_ms       integer,
  pr_reviews_auto_launch_skills     boolean,
  plan_sync_enabled                 boolean,
  spotlight_enabled                 boolean,
  spotlight_shortcut                text,
  quick_launch_repo                 text,
  quick_launch_background           boolean,
  quick_launch_launch_mode          text,
  quick_settings_enabled            boolean,
  quick_settings_items              text[],
  sidebar_order                     text[],
  sidebar_hidden                    text[],
  sidebar_shown                     text[],
  sidebar_compact                   boolean,
  auto_start_at_login               boolean,
  launch_mode                       text,
  atlassian_integration_enabled     boolean,
  theme                             text,
  language                          text,
  sync_claude_theme                 boolean,
  code_theme                        text,
  code_syntax                       text,
  code_font_size                    integer,
  default_model                     text,
  confirm_agent_archive             boolean,
  default_agent_type                text,
  agent_sort                        text,
  tasks_repo                        text,
  plans_repo                        text,
  workflow_confirm_chain            text,
  workflow_chain_limit              integer,
  workflow_missing_skill            text,
  workflow_run_actions              boolean,
  default_display_mode              text,
  chat_sticky_prompt                boolean
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
      s.split_new_agent_pane,
      s.pr_reviews_enabled,
      s.pr_reviews_poll_interval_ms,
      s.pr_reviews_auto_launch_skills,
      s.plan_sync_enabled,
      s.spotlight_enabled,
      s.spotlight_shortcut,
      s.quick_launch_repo,
      s.quick_launch_background,
      s.quick_launch_launch_mode,
      s.quick_settings_enabled,
      s.quick_settings_items,
      s.sidebar_order,
      s.sidebar_hidden,
      s.sidebar_shown,
      s.sidebar_compact,
      s.auto_start_at_login,
      s.launch_mode,
      s.atlassian_integration_enabled,
      s.theme,
      s.language,
      s.sync_claude_theme,
      s.code_theme,
      s.code_syntax,
      s.code_font_size,
      s.default_model,
      s.confirm_agent_archive,
      s.default_agent_type,
      s.agent_sort,
      s.tasks_repo,
      s.plans_repo,
      s.workflow_confirm_chain,
      s.workflow_chain_limit,
      s.workflow_missing_skill,
      s.workflow_run_actions,
      s.default_display_mode,
      s.chat_sticky_prompt
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user_id
      and u.deleted_at is null;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;

grant execute on function public.admin_get_user(uuid) to authenticated;

alter table public.user_settings
  drop column if exists chat_compact_composer;
