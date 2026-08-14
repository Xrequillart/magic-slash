-- Migration: admin_get_user learns the notification and agent-context columns
--
-- Five columns have been added to user_settings since admin_get_user was written
-- (20260813100000, 20260813110000, 20260813120000) and the console has been blind
-- to all five: an RPC's `returns table` is an allowlist, so a column absent from it
-- is a column no back-office query can reach, whatever the caller selects.
--
-- They matter now because the webapp's Application page lets a user EDIT them. A
-- setting that is editable in the product and invisible in the console is the exact
-- shape of a support call nobody can answer — "notifications are off and I never
-- turned them off" has to be checkable.
--
-- The function is dropped before being recreated: `create or replace` cannot change
-- a function's return type, and adding OUT columns changes it.
--
-- Everything else is byte-for-byte the definition in 20260728090000, including the
-- allowlist reasoning that keeps profiles.free_text, technical_level,
-- communication_style and languages out of it. The five additions are all
-- user_settings booleans — application preferences, the same class of data the
-- function already exposes, and nothing a user wrote in prose.

drop function if exists public.admin_get_user(uuid);

create function public.admin_get_user(p_user_id uuid)
returns table (
  user_id                       uuid,
  email                         text,
  created_at                    timestamptz,
  last_sign_in_at               timestamptz,
  name                          text,
  role                          text,
  usage_card_enabled            boolean,
  usage_card_minimized          boolean,
  agent_context_enabled         boolean,
  agent_context_minimized       boolean,
  usage_logs_enabled            boolean,
  daily_digest_enabled          boolean,
  notifications_enabled         boolean,
  notification_agent_waiting    boolean,
  notification_agent_completed  boolean,
  split_enabled                 boolean,
  split_active                  boolean,
  pr_reviews_enabled            boolean,
  pr_reviews_poll_interval_ms   integer,
  pr_reviews_auto_launch_skills boolean,
  spotlight_enabled             boolean,
  spotlight_shortcut            text,
  auto_start_at_login           boolean,
  launch_mode                   text,
  atlassian_integration_enabled boolean,
  theme                         text,
  language                      text,
  sync_claude_theme             boolean
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
      s.split_enabled,
      s.split_active,
      s.pr_reviews_enabled,
      s.pr_reviews_poll_interval_ms,
      s.pr_reviews_auto_launch_skills,
      s.spotlight_enabled,
      s.spotlight_shortcut,
      s.auto_start_at_login,
      s.launch_mode,
      s.atlassian_integration_enabled,
      s.theme,
      s.language,
      s.sync_claude_theme
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user_id
      and u.deleted_at is null;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;
