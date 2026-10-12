-- Migration: the chat view's own settings (Settings → Sessions → Chat view), as four
-- user_settings columns:
--
--   chat_send_key     'enter' | 'mod-enter'             which key sends a prompt
--   chat_tool_detail  'all' | 'changes' | 'grouped'    which tool calls get a line
--   chat_diffs        'preview' | 'full' | 'collapsed' how a diff card opens
--   chat_timestamps   'never' | 'hover' | 'always'     when a message shows its time
--
-- NULL = never chosen; the app reads each as the first value of its list, which is how
-- the chat behaved before it could be set (CHAT_SEND_KEYS and siblings in
-- desktop/src/types.ts).

alter table public.user_settings
  add column if not exists chat_send_key text,
  add column if not exists chat_tool_detail text,
  add column if not exists chat_diffs text,
  add column if not exists chat_timestamps text;

comment on column public.user_settings.chat_send_key is
  'Which key sends a chat prompt: ''enter'' or ''mod-enter''. NULL = never chosen; the app defaults to ''enter''.';
comment on column public.user_settings.chat_tool_detail is
  'Which tool calls the chat draws: ''all'', ''changes'' or ''grouped''. NULL = never chosen; the app defaults to ''all''.';
comment on column public.user_settings.chat_diffs is
  'How a chat diff card opens: ''preview'', ''full'' or ''collapsed''. NULL = never chosen; the app defaults to ''preview''.';
comment on column public.user_settings.chat_timestamps is
  'When a chat message shows its time: ''never'', ''hover'' or ''always''. NULL = never chosen; the app defaults to ''never''.';

-- Constrained like default_display_mode, for the same reason.
alter table public.user_settings drop constraint if exists user_settings_chat_send_key_check;
alter table public.user_settings add constraint user_settings_chat_send_key_check
  check (chat_send_key is null or chat_send_key in ('enter', 'mod-enter'));
alter table public.user_settings drop constraint if exists user_settings_chat_tool_detail_check;
alter table public.user_settings add constraint user_settings_chat_tool_detail_check
  check (chat_tool_detail is null or chat_tool_detail in ('all', 'changes', 'grouped'));
alter table public.user_settings drop constraint if exists user_settings_chat_diffs_check;
alter table public.user_settings add constraint user_settings_chat_diffs_check
  check (chat_diffs is null or chat_diffs in ('preview', 'full', 'collapsed'));
alter table public.user_settings drop constraint if exists user_settings_chat_timestamps_check;
alter table public.user_settings add constraint user_settings_chat_timestamps_check
  check (chat_timestamps is null or chat_timestamps in ('never', 'hover', 'always'));

-- admin_get_user learns the four columns, for the reason 20260821090100 gives. Dropped
-- before being recreated: `create or replace` cannot change a return type. Everything
-- else is byte-for-byte the definition in 20261006090000.

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
  chat_sticky_prompt                boolean,
  chat_send_key                     text,
  chat_tool_detail                  text,
  chat_diffs                        text,
  chat_timestamps                   text
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
      s.chat_sticky_prompt,
      s.chat_send_key,
      s.chat_tool_detail,
      s.chat_diffs,
      s.chat_timestamps
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
