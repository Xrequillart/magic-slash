-- Migration: user_settings.tasks_repo — the repository the Tasks board opens on
--
-- The Tasks page became a board rather than a list of every repository at once: one
-- repository is picked at the top and its tickets fill four columns. A picker with no
-- memory would mean re-picking the same repository on every launch, which is the one
-- thing a board nobody scrolls past has to get right.
--
-- A per-USER column beside theme, language and agent_sort, for their reason: "which
-- backlog am I working out of" is a decision about the person's work, not about the
-- screen in front of them, so it follows the account onto a second machine. It is
-- also why this is not local state — the app holds no config file (see the User
-- Configuration note in CLAUDE.md), so a preference that must survive the process
-- being killed has nowhere else to live.
--
-- THE VALUE IS A CONFIG KEY, not an enum: it is the key of `Config.repositories`, so
-- the set of legal values is per-account and changes whenever a repository is added
-- or renamed. That rules out the CHECK constraint every other text column here
-- carries — there is nothing fixed to check against. The app validates on READ
-- instead: a key no longer in the config resolves to the first repository on the page
-- rather than to an empty board, which is the same "unknown value reads as unset"
-- rule the enum columns get from re-validation in user-settings-mapper.ts.
--
-- NULL keeps its meaning across this table: never chosen. The app then opens on the
-- first repository it has, so an untouched account gets a board with something on it
-- without ever touching the picker.

alter table public.user_settings
  add column if not exists tasks_repo text;

comment on column public.user_settings.tasks_repo is
  'Key in Config.repositories the Tasks board opens on. NULL = never chosen; the app '
  'falls back to the first repository on the page, and does the same for a key that '
  'no longer exists.';

-- admin_get_user learns the column, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects — and "my tasks board opens empty" is
-- exactly the support call that needs to see which repository it was left on.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260826090000.

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
  agent_sort                        text,
  tasks_repo                        text
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
      s.agent_sort,
      s.tasks_repo
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user_id
      and u.deleted_at is null;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;
