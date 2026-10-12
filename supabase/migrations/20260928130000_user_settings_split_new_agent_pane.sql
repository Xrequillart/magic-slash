-- Migration: user_settings.split_new_agent_pane — which pane of the split view a new
-- agent opens in, for Settings → Split view.
--
-- 'focused' is the pane with the keyboard, which is what the split always did; 'left'
-- and 'right' pin it to a side. NULL = never chosen; the app resolves it to 'focused', so
-- an untouched account sees no change.

alter table public.user_settings
  add column if not exists split_new_agent_pane text;

comment on column public.user_settings.split_new_agent_pane is
  'Split view pane a new agent opens in: ''focused'', ''left'' or ''right''. NULL = never '
  'chosen; the app defaults to ''focused''.';

-- Constrained like code_syntax: a typo'd value would silently open every agent in the
-- fallback on every machine the account signs into.
alter table public.user_settings drop constraint if exists user_settings_split_new_agent_pane_check;
alter table public.user_settings add constraint user_settings_split_new_agent_pane_check
  check (split_new_agent_pane is null or split_new_agent_pane in ('focused', 'left', 'right'));

-- admin_get_user learns the column, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260928120000.

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
