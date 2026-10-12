-- Migration: user_settings.sidebar_order and sidebar_hidden: the pages of the sidebar's
-- menu (Plans, Tasks, Skills, Repositories), in the order the reader arranged them, and the
-- ones they took off it.
--
-- NULL keeps its meaning across this table: never chosen. sidebar_order NULL is the order
-- the menu always had (SIDEBAR_PAGE_IDS in desktop/src/types.ts); a list that leaves a page
-- out does NOT hide it, the app puts it back in its default place (sidebarPageOrder), so a
-- page a later release adds reaches every account. Hiding is sidebar_hidden's alone: NULL
-- or empty shows every page.

alter table public.user_settings
  add column if not exists sidebar_order text[],
  add column if not exists sidebar_hidden text[];

comment on column public.user_settings.sidebar_order is
  'The sidebar menu''s pages, in order (SIDEBAR_PAGE_IDS in desktop/src/types.ts). '
  'NULL = the default order; a page missing from the list keeps its default place.';
comment on column public.user_settings.sidebar_hidden is
  'The sidebar menu''s pages the user took off it. NULL or empty = every page shown.';

-- Constrained like quick_settings_items: every element one of SIDEBAR_PAGE_IDS. Adding a
-- page is an entry there AND a migration widening both lists.
alter table public.user_settings drop constraint if exists user_settings_sidebar_order_check;
alter table public.user_settings add constraint user_settings_sidebar_order_check
  check (sidebar_order is null or sidebar_order <@ array[
    'plans', 'tasks', 'skills', 'repositories'
  ]::text[]);

alter table public.user_settings drop constraint if exists user_settings_sidebar_hidden_check;
alter table public.user_settings add constraint user_settings_sidebar_hidden_check
  check (sidebar_hidden is null or sidebar_hidden <@ array[
    'plans', 'tasks', 'skills', 'repositories'
  ]::text[]);

-- admin_get_user learns both columns, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260928150000.

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
