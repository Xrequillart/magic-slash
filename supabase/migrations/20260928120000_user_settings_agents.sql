-- Migration: user_settings.default_model and confirm_agent_archive, for Settings → Agents.
--
-- default_model is the Claude model a new agent is launched on (`claude --model`). NULL =
-- never chosen: no flag is passed and the CLI's own default applies, i.e. whatever
-- `/model` says. The legal values are not a list this repository owns: the desktop asks
-- the reader's installed Claude Code what its `/model` offers, so a new model needs no
-- release and no migration. The CHECK therefore constrains the SHAPE only (a model name,
-- one shell word, 100 characters at most), which mirrors isValidModelName in
-- desktop/src/types.ts: the value reaches a command line.
--
-- confirm_agent_archive is whether archiving an agent asks first. NULL = never chosen;
-- the app keeps asking, which is what it always did.

alter table public.user_settings
  add column if not exists default_model text,
  add column if not exists confirm_agent_archive boolean;

comment on column public.user_settings.default_model is
  'Claude model a new agent is launched on (claude --model), as the installed CLI names it. '
  'NULL = never chosen; no flag, the CLI default applies.';

comment on column public.user_settings.confirm_agent_archive is
  'Whether archiving an agent asks for confirmation. NULL = never chosen; the app defaults to true.';

alter table public.user_settings drop constraint if exists user_settings_default_model_check;
alter table public.user_settings add constraint user_settings_default_model_check
  check (default_model is null or (
    char_length(default_model) between 1 and 100
    and default_model ~ '^[A-Za-z0-9][A-Za-z0-9._:@/\[\]-]*$'
  ));

-- admin_get_user learns both columns, for the reason 20260821090100 gives: an RPC's
-- `returns table` is an allowlist, so a column missing from it is unreachable by the
-- back-office whatever the caller selects.
--
-- Dropped before being recreated: `create or replace` cannot change a return type.
-- Everything else is byte-for-byte the definition in 20260928110000.

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
