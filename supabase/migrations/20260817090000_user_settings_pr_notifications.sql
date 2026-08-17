-- Migration: per-kind opt-outs for the two PR notifications
--
-- 20260813120000 gave the two agent notifications a switch each and left the PR
-- ones under the master alone, on the argument that they were rare. They are not:
-- the watcher notified on the FIRST read of every PR (an unknown previous status
-- compared unequal to whatever GitHub reported), so turning the watcher on, and
-- every app restart after it, fired one notification per open PR. The app fix is
-- to require a known previous status; these two columns are the part the user
-- asked for — being able to say "not this kind" without silencing everything.
--
-- Two columns rather than one because these are two senders, and silencing one is
-- not the same intent as silencing the other:
--
--   * notification_pr_review — the LOCAL watcher, reporting that the review status
--     of a PR open in the app moved. This is the poller you switched on yourself.
--   * notification_pr_changes_requested — the TEAM realtime stream, reporting that
--     a reviewer asked for changes on one of yours. Arrives even for a PR no agent
--     on this machine is watching.
--
-- NULL keeps its established meaning: never chosen. Both default to ON — absent
-- must describe the behaviour every existing install already has.

alter table public.user_settings
  add column if not exists notification_pr_review boolean,
  add column if not exists notification_pr_changes_requested boolean;

comment on column public.user_settings.notification_pr_review is
  'Notify when the PR watcher sees a review status change. NULL = never chosen; the app defaults to on.';
comment on column public.user_settings.notification_pr_changes_requested is
  'Notify when a reviewer requests changes on one of your PRs. NULL = never chosen; the app defaults to on.';

-- admin_get_user learns the two columns. An RPC's `returns table` is an allowlist,
-- so a column absent from it is a column no back-office query can reach, whatever
-- the caller selects — and these two are editable in the product, which is exactly
-- the shape of a support call nobody can answer ("PR notifications are off and I
-- never turned them off") unless the console can check them.
--
-- Dropped before being recreated: `create or replace` cannot change a function's
-- return type, and adding OUT columns changes it. Everything else is byte-for-byte
-- the definition in 20260814100000.

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
