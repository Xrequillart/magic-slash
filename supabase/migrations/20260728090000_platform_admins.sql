-- Migration: platform admins + read-only back-office RPCs (issue #153)
--
-- WHY a second kind of admin
-- -----------------------------------------------------------------------------
-- `membership_role = 'admin'` is an ORG role: it says "this person administers
-- this tenant". Nothing in the schema until now describes the people who operate
-- the PRODUCT itself and need to answer questions no tenant can — "which app
-- version is the fleet on?", "did this user's device ever take the update?",
-- "what does their settings row actually contain?". Support work has been done
-- with the service_role key against the dashboard, which is unreviewable and
-- all-powerful.
--
-- This migration introduces that identity as data (`platform_admins`) and gives
-- it a NARROW, read-only surface: six `SECURITY DEFINER` functions, each with an
-- explicit column allowlist in its `returns table`.
--
-- WHY NOT widen RLS
-- -----------------------------------------------------------------------------
-- The obvious shortcut — appending `or public.is_platform_admin()` to the
-- `profiles` / `user_settings` / `app_installations` SELECT policies — is
-- deliberately NOT taken. It would:
--   * turn "own-rows-only" into a claim that is no longer true anywhere in the
--     codebase, so every future reader of those policies has to re-derive who can
--     actually see a row;
--   * expose EVERY column of those tables forever, including `profiles.free_text`
--     (free-form prose the user wrote about themselves) and anything added later,
--     with no review step;
--   * apply to writes the moment someone copies the pattern to a write policy.
-- An RPC's `returns table` is the allowlist, and it is visible in the diff. Not a
-- single existing policy is modified here. `profiles.free_text`,
-- `technical_level`, `communication_style` and `languages` are returned by NO
-- function below.
--
-- OUT OF SCOPE, on purpose: writes, an audit log of admin reads, product
-- analytics, and impersonation. Everything here is `select`-shaped.

-- ---------------------------------------------------------------------------
-- platform_admins: who operates the product
-- ---------------------------------------------------------------------------
-- One row per platform admin. Membership in this table is the whole identity —
-- there is no role column, because a second tier would need its own allowlist and
-- there is exactly one tier today.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- No index: the primary key already serves the only lookup this table ever gets
-- (`user_id = auth.uid()`, in is_platform_admin below).

alter table public.platform_admins enable row level security;

-- DENY-ALL, in two independent layers, and the revoke is the load-bearing one.
-- Supabase's default privileges grant `all` on every new table in `public` to
-- `anon` and `authenticated`, so a table with RLS enabled and no policy would
-- still be a table the roles hold INSERT on — and "no policy" is a state a future
-- migration could accidentally end. Revoking the privileges outright means the
-- answer to "can authenticated grant itself platform admin?" is no at the GRANT
-- layer, which is checked before RLS and cannot be re-opened by adding a policy.
--
-- Consequence, accepted rather than worked around: the FIRST platform admin
-- cannot be created from within the application. There is no bootstrap RPC and no
-- self-service path — a human inserts the row from the Supabase dashboard (which
-- runs as the table owner and bypasses both layers). A bootstrap path is exactly
-- the kind of "first caller wins" hole this table exists to avoid.
revoke all on public.platform_admins from anon, authenticated;

-- ---------------------------------------------------------------------------
-- is_platform_admin: the single gate every admin_* function calls
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because `authenticated` holds no privilege on
-- `platform_admins` (see the revoke above) and must not: the role can ask the
-- question without being able to read, let alone write, the answer. Same shape as
-- is_org_member / is_org_admin — `language sql`, stable, locked search_path — so
-- it is inlinable and cheap enough to call per statement.
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

-- Every function below revokes from `public, anon` rather than from `public`
-- alone, which is one word more than the rest of this repo does. The reason:
-- Supabase ships `alter default privileges in schema public grant all on
-- functions to anon, authenticated, …`, so a new function in `public` arrives
-- with an EXPLICIT execute grant to `anon` — and revoking from PUBLIC does not
-- remove an explicit grant. The auth.uid() guard inside each function already
-- refuses an anonymous caller, so this is defense in depth rather than a fix for
-- a hole; on the crown-jewel function of this feature it is worth the word.
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_users: every user, with the app version resolved per user
-- ---------------------------------------------------------------------------
-- The fleet list. The driving relation is `auth.users` — NOT profiles, NOT
-- user_settings, NOT app_installations. Driving off any of those would silently
-- omit every user who never wrote that row: someone who signed up and never
-- opened the profile wizard has no `profiles` row, someone who never touched a
-- toggle has no `user_settings` row, and someone who never launched the desktop
-- app has no `app_installations` row. A back-office that shows "most" users is
-- worse than none, because nothing on screen says which ones are missing. Hence
-- `auth.users` plus LEFT JOINs, and `coalesce(..., 0)` on every count.
--
-- The per-user aggregates are `left join lateral` rather than a group-by over a
-- five-way join, so no count is inflated by another join's fan-out.
--
-- Soft-deleted users (`auth.users.deleted_at`) are excluded: they are gone from
-- the product's point of view, and their rows cascade away on a real delete.
--
-- Columns are an allowlist. `profiles.name` and `profiles.role` are here because
-- they identify the human in a support conversation; `free_text`,
-- `technical_level`, `communication_style` and `languages` are not, and are not
-- returned.
create or replace function public.admin_list_users()
returns table (
  user_id             uuid,
  email               text,
  created_at          timestamptz,
  last_sign_in_at     timestamptz,
  name                text,
  role                text,
  device_count        bigint,
  latest_app_version  text,
  latest_last_seen_at timestamptz,
  org_count           bigint,
  agent_count         bigint,
  active_agent_count  bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_users requires an authenticated user';
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
      coalesce(dev.n_devices, 0),
      latest.app_version,
      latest.last_seen_at,
      coalesce(orgs.n_orgs, 0),
      coalesce(ag.n_agents, 0),
      coalesce(ag.n_active_agents, 0)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join lateral (
      select count(*) as n_devices
      from public.app_installations i
      where i.user_id = u.id
    ) dev on true
    -- The version a user "runs" is the one on the device they used most
    -- recently. A user with two machines on two versions is a real state, which
    -- admin_list_installations reports per device; this column is the headline.
    left join lateral (
      select i.app_version, i.last_seen_at
      from public.app_installations i
      where i.user_id = u.id
      order by i.last_seen_at desc
      limit 1
    ) latest on true
    -- Counts every membership, archived orgs included: the back-office reports
    -- what exists, not what the user can currently see. admin_list_user_orgs
    -- returns archived_at so the drill-down can tell the two apart.
    left join lateral (
      select count(*) as n_orgs
      from public.memberships m
      where m.user_id = u.id
    ) orgs on true
    left join lateral (
      select count(*) as n_agents,
             count(*) filter (where a.archived_at is null) as n_active_agents
      from public.agents a
      where a.owner_id = u.id
    ) ag on true
    where u.deleted_at is null
    order by u.created_at asc;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_installations: one row per DEVICE, whole fleet or one user
-- ---------------------------------------------------------------------------
-- `app_installations` is keyed (user, device), and every question the back-office
-- asks about versions is a question about devices, not users: the version
-- histogram, "who is still on an old build", the platform/arch breakdown, and
-- "which machines have gone quiet" (`last_seen_at`) are all rollups of THIS
-- result set, computed in the client from one round trip.
--
-- `p_user_id` null means the whole fleet; set, it scopes to one user and serves
-- the drill-down's device list. One function rather than two because the row
-- shape is identical — a second function would be the same allowlist maintained
-- twice.
--
-- `device_name` is the machine's hostname, which own-rows RLS otherwise keeps
-- private to its user. It is in the allowlist because "which of their three Macs
-- is on the old version" is unanswerable without it.
create or replace function public.admin_list_installations(p_user_id uuid default null)
returns table (
  user_id                uuid,
  email                  text,
  device_id              text,
  device_name            text,
  app_version            text,
  platform               text,
  arch                   text,
  last_seen_at           timestamptz,
  app_version_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_installations requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select
      i.user_id,
      u.email::text,
      i.device_id,
      i.device_name,
      i.app_version,
      i.platform,
      i.arch,
      i.last_seen_at,
      i.app_version_updated_at
    from public.app_installations i
    join auth.users u on u.id = i.user_id
    where u.deleted_at is null
      and (p_user_id is null or i.user_id = p_user_id)
    order by i.last_seen_at desc;
end;
$$;

revoke execute on function public.admin_list_installations(uuid) from public, anon;
grant execute on function public.admin_list_installations(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_user: one user's identity + their full settings row
-- ---------------------------------------------------------------------------
-- The drill-down header. Returns at most one row, and none at all for an unknown
-- or soft-deleted id — the caller renders "not found" rather than an empty shell.
--
-- The 17 `user_settings` columns are listed one by one, which is the point: the
-- allowlist is the signature. When a column is added to `user_settings`, showing
-- it in the back-office is a deliberate edit here, not an automatic consequence.
-- `history_enabled` is absent because 20260727170000 dropped it.
--
-- From `profiles`, ONLY `name` and `role`. Excluded, each on purpose:
--   * `free_text`            — free-form prose the user wrote about themselves.
--   * `technical_level`      — outside the ticket's allowlist.
--   * `communication_style`  — outside the ticket's allowlist.
--   * `languages`            — outside the ticket's allowlist too. It is the
--     tamest of the four and would have been easy to wave through, which is
--     exactly why it is named here: the allowlist is the ticket's, not the
--     author's judgement of what seems harmless.
-- Nothing here reads `configs.data`: it is an opaque per-org blob whose keys are
-- not enumerable, so it cannot be allowlisted.
create or replace function public.admin_get_user(p_user_id uuid)
returns table (
  user_id                       uuid,
  email                         text,
  created_at                    timestamptz,
  last_sign_in_at               timestamptz,
  name                          text,
  role                          text,
  usage_card_enabled            boolean,
  usage_card_minimized          boolean,
  usage_logs_enabled            boolean,
  daily_digest_enabled          boolean,
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
      s.usage_logs_enabled,
      s.daily_digest_enabled,
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

-- ---------------------------------------------------------------------------
-- admin_list_user_orgs: which tenants a user belongs to, and as what
-- ---------------------------------------------------------------------------
-- Archived orgs are INCLUDED, with `archived_at` exposed so the drill-down can
-- render them as such. The is_org_member helper filters archived orgs out of
-- every tenant read path (20260723120000), which is right for members and wrong
-- here: "their org was archived last month" is precisely the answer a support
-- question needs, and hiding it would make the org count in admin_list_users
-- disagree with this list.
create or replace function public.admin_list_user_orgs(p_user_id uuid)
returns table (
  org_id      uuid,
  name        text,
  role        public.membership_role,
  archived_at timestamptz,
  created_at  timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_user_orgs requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select m.org_id, o.name, m.role, o.archived_at, m.created_at
    from public.memberships m
    join public.organizations o on o.id = m.org_id
    where m.user_id = p_user_id
    order by m.created_at asc;
end;
$$;

revoke execute on function public.admin_list_user_orgs(uuid) from public, anon;
grant execute on function public.admin_list_user_orgs(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_user_agents: the user's agents, archived ones included
-- ---------------------------------------------------------------------------
-- Filtered on `owner_id`, not on org: an agent belongs to its owner, and its
-- `org_id` is DERIVED from the repositories it works on (20260727160000), so it
-- is null for an agent on personal repos only. Filtering by org would drop those.
--
-- Archived agents are included — closing an agent soft-deletes it
-- (20260727140000) and "they closed it three weeks ago" is an answer, not noise.
-- `repo_names` is aggregated from agent_repositories rather than read from
-- `agents.repositories`, which holds absolute filesystem PATHS on the owner's
-- machine and is meaningless to anyone else. The paths themselves are not
-- returned: they are local layout, not product state.
create or replace function public.admin_list_user_agents(p_user_id uuid)
returns table (
  id          uuid,
  name        text,
  ticket_id   text,
  status      text,
  branch_name text,
  base_branch text,
  org_id      uuid,
  shared      boolean,
  archived_at timestamptz,
  created_at  timestamptz,
  repo_names  text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_user_agents requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select
      a.id,
      a.name,
      a.ticket_id,
      a.status,
      a.branch_name,
      a.base_branch,
      a.org_id,
      a.shared,
      a.archived_at,
      a.created_at,
      coalesce(linked.repo_names, '{}'::text[])
    from public.agents a
    left join lateral (
      select array_agg(r.name order by r.name) as repo_names
      from public.agent_repositories ar
      join public.repositories r on r.id = ar.repo_id
      where ar.agent_id = a.id
    ) linked on true
    where a.owner_id = p_user_id
    order by a.created_at desc;
end;
$$;

revoke execute on function public.admin_list_user_agents(uuid) from public, anon;
grant execute on function public.admin_list_user_agents(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_user_repositories: the repos a user can reach, personal and team
-- ---------------------------------------------------------------------------
-- Two sources in one list, because "which repositories does this person work
-- with" has one answer and the split is an implementation detail of ownership:
--   * personal repos they own (`owner_id = p_user_id`, `org_id` null), and
--   * team repos of every org they are a member of — which they did not create
--     but do see.
-- This is deliberately NOT identical to what the repositories SELECT policy
-- grants them: that policy gates on `is_org_member(org_id)`, which excludes
-- archived orgs, whereas this RPC reads `memberships` raw and so also returns
-- repos of orgs since archived. Consistent with the archived-included choice on
-- `admin_list_user_agents` — a back-office that hid archived history would be
-- lying about what the account has.
-- `org_name` is joined in so the two are distinguishable on screen without a
-- second lookup; a null org_id renders as personal.
--
-- `repository_paths` is NOT joined: a path is a per-machine local binding, and
-- knowing where on someone's disk a checkout lives answers no product question.
-- `keywords` is included because it is what routes an agent to a repo, so an
-- empty list explains a support report of "it never picks the right repo".
create or replace function public.admin_list_user_repositories(p_user_id uuid)
returns table (
  id         uuid,
  name       text,
  org_id     uuid,
  org_name   text,
  keywords   text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_user_repositories requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select r.id, r.name, r.org_id, o.name, r.keywords, r.created_at
    from public.repositories r
    left join public.organizations o on o.id = r.org_id
    -- The membership set is a property of the USER, not of the row being tested, so
    -- it is stated once as an uncorrelated `in` rather than as an `exists` re-run
    -- per repository. A null `r.org_id` never matches it, which is the personal-repo
    -- case already covered by the owner_id branch.
    where r.owner_id = p_user_id
       or r.org_id in (
         select m.org_id
         from public.memberships m
         where m.user_id = p_user_id
       )
    order by o.name asc nulls first, r.name asc;
end;
$$;

revoke execute on function public.admin_list_user_repositories(uuid) from public, anon;
grant execute on function public.admin_list_user_repositories(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Documentation
-- ---------------------------------------------------------------------------
comment on table public.platform_admins is
  'Who operates the product, as opposed to a tenant (that is memberships.role). '
  'DENY-ALL by design: RLS is enabled with NO policy AND every privilege is '
  'revoked from anon and authenticated, so the table is unreachable from the API '
  'in either direction. The first row is inserted BY HAND from the Supabase '
  'dashboard — there is deliberately no bootstrap path in the application, since '
  'a self-service one would be a "first caller becomes admin" hole. The only way '
  'to use this identity is the read-only public.admin_* functions.';

comment on column public.platform_admins.user_id is
  'The admin. Membership in this table IS the whole grant — there is no role '
  'column, because a second tier would need its own column allowlist.';

-- Correct the catalog comment set by 20260725100000: fleet-wide reporting no
-- longer requires the service role. (The plain `--` comments in that migration
-- are not catalog objects and cannot be amended from here; supabase/README.md
-- carries the correction for those.)
comment on table public.app_installations is
  'One row per (user, device) recording the app version that device runs, '
  'upserted by the desktop app on every launch once authenticated. '
  'app_version_updated_at is trigger-maintained and marks when that device last '
  'changed version. Private to its user (own-rows RLS); fleet-wide version '
  'reporting goes through public.admin_list_installations(uuid), which is gated '
  'on public.is_platform_admin() and returns an explicit column allowlist — no '
  'service-role key, and no widening of this table''s policies.';
