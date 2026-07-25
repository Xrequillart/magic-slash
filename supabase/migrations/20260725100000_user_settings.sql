-- Migration: user_settings + app_installations
-- Two per-USER tables (org-independent, like public.profiles).
--
-- WHY user_settings exists
-- -----------------------------------------------------------------------------
-- Every application-level preference (the Settings → Features tab, plus Launch
-- Mode and the Atlassian integration flag) already reached the database, but only
-- as opaque keys inside public.configs.data — a blob keyed (org_id, user_id).
-- That had three defects:
--   1. The settings were ORG-scoped. A user in two orgs kept two divergent sets
--      of toggles that silently swapped when they switched org, and a user with
--      no membership at all had their writes dropped on the floor (the desktop
--      store resolves an org before writing the blob).
--   2. Nothing was queryable: "how many users opted into the daily digest?"
--      meant digging through jsonb.
--   3. No column-level typing or validation — a bad launch_mode was just a
--      string in a blob.
-- user_settings fixes all three: one row per auth.users id, one typed column per
-- option, CHECK constraints on the enum-like ones.
--
-- Every column is NULLABLE ON PURPOSE. The desktop Config treats an ABSENT key
-- as a distinct third state from false — e.g. `historyEnabled !== false` means
-- history is on when unset, and `autoStartAtLogin !== undefined` gates whether
-- the app touches the macOS login item at all (touching it spams a system
-- notification). NULL therefore means "the user never chose", and defaults stay
-- where they already live: in the app's withDefaults().
--
-- WHY app_installations exists
-- -----------------------------------------------------------------------------
-- Which app version a user actually runs was only ever mirrored into
-- configs.data.version — same blob, same problems, and impossible to answer
-- "what is the version distribution in the field?". app_installations records
-- one row per (user, device), upserted on every launch once auth is established,
-- so the data is refreshed at each start and after every auto-update.
-- app_version_updated_at is maintained by a trigger so a device's upgrade moment
-- is visible without keeping full history.
--
-- Account deletion needs no changes: both tables reference auth.users with
-- ON DELETE CASCADE, so public.delete_account() removes them with the user row.

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Features → History
  history_enabled boolean,
  -- Features → Usage card (sidebar)
  usage_card_enabled boolean,
  usage_card_minimized boolean,
  -- Features → Usage logs (GDPR opt-in, off unless explicitly true)
  usage_logs_enabled boolean,
  -- Features → Daily digest (opt-in, off unless explicitly true)
  daily_digest_enabled boolean,
  -- Features → Split view (split_active is the transient current view mode)
  split_enabled boolean,
  split_active boolean,
  -- Features → PR Review Watcher
  pr_reviews_enabled boolean,
  pr_reviews_poll_interval_ms integer,
  pr_reviews_auto_launch_skills boolean,
  -- Features → Spotlight / Quick Launch global shortcut
  spotlight_enabled boolean,
  spotlight_shortcut text,
  -- Features → Background app
  auto_start_at_login boolean,
  -- Launch Mode tab
  launch_mode text,
  -- Atlassian MCP integration flag (detection/display only — never a token)
  atlassian_integration_enabled boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mirror the app's validators so an invalid enum can never be stored. NULL is
  -- always allowed (= the user never chose; the app applies its own default).
  constraint user_settings_launch_mode_check check (
    launch_mode is null
    or launch_mode in ('plan', 'default', 'acceptEdits', 'auto', 'bypassPermissions')
  ),
  constraint user_settings_spotlight_shortcut_check check (
    spotlight_shortcut is null
    or spotlight_shortcut in (
      'Control+Space', 'Control+Shift+Space', 'Alt+Space', 'Alt+Shift+Space',
      'Control+M', 'Control+Shift+M', 'Alt+M', 'Alt+Shift+M'
    )
  ),
  constraint user_settings_poll_interval_check check (
    pr_reviews_poll_interval_ms is null or pr_reviews_poll_interval_ms > 0
  )
);

drop trigger if exists set_updated_at on public.user_settings;
create trigger set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_installations
-- ---------------------------------------------------------------------------
create table if not exists public.app_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Stable per-machine identifier derived by the app from hostname|platform|arch
  -- (hashed). Derived rather than stored so it survives having no local state:
  -- the database is the single source of truth and the app persists nothing on
  -- disk to key this row by.
  device_id text not null,
  -- Human-readable machine name (hostname). Own-rows-only RLS keeps it private
  -- to its user — it is never exposed to other org members.
  device_name text,
  app_version text not null,
  platform text,
  arch text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set by trigger whenever app_version actually changes, so "when did this
  -- device take the update?" is answerable without storing every launch.
  app_version_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per machine per user; the launch-time write is an upsert on this.
  unique (user_id, device_id)
);

create index if not exists idx_app_installations_user_id on public.app_installations (user_id);
-- Serves the fleet-wide "who runs which version" rollups (service-role queries).
create index if not exists idx_app_installations_app_version on public.app_installations (app_version);

drop trigger if exists set_updated_at on public.app_installations;
create trigger set_updated_at
  before update on public.app_installations
  for each row execute function public.set_updated_at();

-- Stamp app_version_updated_at only on a genuine version change, so the column
-- survives the every-launch upsert of last_seen_at untouched.
create or replace function public.set_app_version_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.app_version is distinct from old.app_version then
    new.app_version_updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_app_version_updated_at on public.app_installations;
create trigger set_app_version_updated_at
  before update on public.app_installations
  for each row execute function public.set_app_version_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — strictly own-rows, identical in spirit to profiles.
-- A user's preferences and the machines they run the app on are private to them;
-- org admins get no read path here (fleet reporting uses the service role).
-- ---------------------------------------------------------------------------
alter table public.user_settings enable row level security;
alter table public.app_installations enable row level security;

grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.app_installations to authenticated;

create policy user_settings_select on public.user_settings
  for select to authenticated
  using (user_id = auth.uid());

create policy user_settings_insert on public.user_settings
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_settings_update on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_settings_delete on public.user_settings
  for delete to authenticated
  using (user_id = auth.uid());

create policy app_installations_select on public.app_installations
  for select to authenticated
  using (user_id = auth.uid());

create policy app_installations_insert on public.app_installations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy app_installations_update on public.app_installations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy app_installations_delete on public.app_installations
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Backfill from the legacy configs blob
-- ---------------------------------------------------------------------------
-- Lift each user's existing settings out of configs.data into their own row. A
-- user may hold several configs rows (one per org) with divergent values; take
-- the most recently updated one as the winner, since that is the set they last
-- actually interacted with. Keys absent from the blob stay NULL.
--
-- Values are read defensively: jsonb_typeof guards mean a malformed legacy blob
-- backfills as NULL instead of aborting the migration on a cast or a CHECK.
-- app_version is deliberately NOT backfilled into app_installations — no legacy
-- row can tell us which DEVICE it came from, and the app rewrites it on the very
-- next launch anyway.
with latest as (
  select distinct on (c.user_id) c.user_id, c.data
  from public.configs c
  where c.data is not null and jsonb_typeof(c.data) = 'object'
  order by c.user_id, c.updated_at desc
),
mapped as (
  select
    l.user_id,
    case when jsonb_typeof(l.data -> 'historyEnabled') = 'boolean'
      then (l.data -> 'historyEnabled')::boolean end as history_enabled,
    case when jsonb_typeof(l.data -> 'usageCardEnabled') = 'boolean'
      then (l.data -> 'usageCardEnabled')::boolean end as usage_card_enabled,
    case when jsonb_typeof(l.data -> 'usageCardMinimized') = 'boolean'
      then (l.data -> 'usageCardMinimized')::boolean end as usage_card_minimized,
    case when jsonb_typeof(l.data -> 'usageLogsEnabled') = 'boolean'
      then (l.data -> 'usageLogsEnabled')::boolean end as usage_logs_enabled,
    case when jsonb_typeof(l.data #> '{dailyDigest,enabled}') = 'boolean'
      then (l.data #> '{dailyDigest,enabled}')::boolean end as daily_digest_enabled,
    case when jsonb_typeof(l.data -> 'splitEnabled') = 'boolean'
      then (l.data -> 'splitEnabled')::boolean end as split_enabled,
    case when jsonb_typeof(l.data -> 'splitActive') = 'boolean'
      then (l.data -> 'splitActive')::boolean end as split_active,
    case when jsonb_typeof(l.data #> '{prReviews,enabled}') = 'boolean'
      then (l.data #> '{prReviews,enabled}')::boolean end as pr_reviews_enabled,
    case when jsonb_typeof(l.data #> '{prReviews,pollIntervalMs}') = 'number'
      and (l.data #>> '{prReviews,pollIntervalMs}')::numeric > 0
      then (l.data #>> '{prReviews,pollIntervalMs}')::numeric::integer end as pr_reviews_poll_interval_ms,
    case when jsonb_typeof(l.data #> '{prReviews,autoLaunchSkills}') = 'boolean'
      then (l.data #> '{prReviews,autoLaunchSkills}')::boolean end as pr_reviews_auto_launch_skills,
    case when jsonb_typeof(l.data #> '{spotlight,enabled}') = 'boolean'
      then (l.data #> '{spotlight,enabled}')::boolean end as spotlight_enabled,
    case when l.data #>> '{spotlight,shortcut}' in (
      'Control+Space', 'Control+Shift+Space', 'Alt+Space', 'Alt+Shift+Space',
      'Control+M', 'Control+Shift+M', 'Alt+M', 'Alt+Shift+M'
    ) then l.data #>> '{spotlight,shortcut}' end as spotlight_shortcut,
    case when jsonb_typeof(l.data -> 'autoStartAtLogin') = 'boolean'
      then (l.data -> 'autoStartAtLogin')::boolean end as auto_start_at_login,
    case when l.data #>> '{launchMode}' in ('plan', 'default', 'acceptEdits', 'auto', 'bypassPermissions')
      then l.data #>> '{launchMode}' end as launch_mode,
    case when jsonb_typeof(l.data #> '{integrations,atlassian}') = 'boolean'
      then (l.data #> '{integrations,atlassian}')::boolean end as atlassian_integration_enabled
  from latest l
)
insert into public.user_settings (
  user_id, history_enabled, usage_card_enabled, usage_card_minimized,
  usage_logs_enabled, daily_digest_enabled, split_enabled, split_active,
  pr_reviews_enabled, pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills,
  spotlight_enabled, spotlight_shortcut, auto_start_at_login, launch_mode,
  atlassian_integration_enabled
)
select
  user_id, history_enabled, usage_card_enabled, usage_card_minimized,
  usage_logs_enabled, daily_digest_enabled, split_enabled, split_active,
  pr_reviews_enabled, pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills,
  spotlight_enabled, spotlight_shortcut, auto_start_at_login, launch_mode,
  atlassian_integration_enabled
from mapped
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Documentation
-- ---------------------------------------------------------------------------
comment on table public.user_settings is
  'Per-user application preferences (Settings → Features, Launch Mode, Atlassian '
  'integration flag), one row per auth.users id and independent of any org. '
  'Replaces the org-scoped configs.data keys. Every column is nullable: NULL '
  'means the user never chose, which the app distinguishes from false.';

comment on table public.app_installations is
  'One row per (user, device) recording the app version that device runs, '
  'upserted by the desktop app on every launch once authenticated. '
  'app_version_updated_at is trigger-maintained and marks when that device last '
  'changed version. Private to its user (own-rows RLS); fleet-wide version '
  'reporting goes through the service role.';

comment on column public.app_installations.device_id is
  'Stable machine fingerprint derived by the app from hostname|platform|arch '
  '(hashed) — derived, not stored locally, because the app keeps no local state.';
