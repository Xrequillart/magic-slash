-- Migration: plan_sync_enabled — the switch for uploading /magic:plan sessions
--
-- The previous migration is the first time the content of a FILE on the user's
-- machine leaves it. That deserves a switch, and one that is genuinely a switch:
-- turning it off stops the upload entirely and changes nothing about the local
-- spec file, which /magic:plan keeps writing exactly as before. Off is not a
-- degraded mode, it is the pre-cloud behaviour.
--
-- NULL keeps its established meaning across this table: never chosen. It defaults
-- to ON, because absent must describe the behaviour the feature ships with — and
-- because a plan session is already only visible to the author and, for a team
-- repo, to that team.

alter table public.user_settings
  add column if not exists plan_sync_enabled boolean;

comment on column public.user_settings.plan_sync_enabled is
  'Upload /magic:plan sessions (idea, spec, tickets) to the cloud. NULL = never chosen; the app defaults to on. Off leaves the local spec file untouched.';

-- admin_get_user learns the column. An RPC's `returns table` is an allowlist, so
-- a column absent from it is a column no back-office query can reach, whatever
-- the caller selects — and this one is editable in the product, which is exactly
-- the shape of a support call nobody can answer ("my plans aren't syncing")
-- unless the console can check it.
--
-- Dropped before being recreated: `create or replace` cannot change a function's
-- return type, and adding an OUT column changes it. Everything else is
-- byte-for-byte the definition in 20260817090000.

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
  sync_claude_theme                 boolean
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
