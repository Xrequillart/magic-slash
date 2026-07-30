-- ---------------------------------------------------------------------------
-- admin_list_users: add the org NAMES and the repository count
-- ---------------------------------------------------------------------------
-- The Users table in the back-office stopped showing devices, org count and
-- agents, and started showing the signup date, the organisation and how many
-- repositories the account reaches. The date was already returned (`created_at`);
-- the other two were not, and neither could be derived client-side — the org list
-- knows nothing about who is in it from a user's row, and repository rows are not
-- exposed to the console at all.
--
-- REPLACED, NOT ALTERED, and the drop is mandatory: `create or replace function`
-- cannot change a function's return type, and adding a column to a `returns table`
-- is exactly that. Dropping also drops the grants, so both are re-applied below —
-- forgetting them is a silent 403 for every admin, since the RPC would exist and
-- be unexecutable.
--
-- Same constraints as its siblings in 20260728090000_platform_admins.sql:
-- `SECURITY DEFINER`, locked search_path, `is_platform_admin()` gate, an explicit
-- column allowlist, and no policy touched. Every pre-existing column is returned
-- unchanged — `device_count`, `org_count` and the agent counts included, even
-- though the table no longer draws them. They are asserted by
-- supabase/tests/platform_admin.test.sql and read by nothing else, so keeping
-- them costs one column each and keeps this a pure addition.
--
-- WHAT THE TWO NEW COLUMNS MEAN
--
-- `org_names` is an ARRAY, not a name, because a user can hold several
-- memberships and the caller drops the `org_count` column: the array is what lets
-- the table say "Acme +2" without a second lookup. Ordered by membership date,
-- so element 0 is the org they joined FIRST — the one that reads as theirs — with
-- the name as a tiebreak so the order is total and the output stable between
-- calls. Archived orgs are included, matching `org_count` above it and
-- `admin_list_user_orgs`: the console reports what exists and the drill-down says
-- which are archived.
--
-- `repo_count` counts the repositories the account REACHES, not the ones it
-- created: personal repos it owns, plus the team repos of every org it belongs
-- to, whether or not it created them. The predicate is copied from
-- `admin_list_user_repositories` deliberately, so the number in the list column
-- is the number of rows the drill-down then shows — a count that disagreed with
-- the list it summarises would be read as a bug in whichever of the two the
-- operator trusted less. Like that function it reads `memberships` raw rather
-- than calling `is_org_member()`, which means repos of SINCE-ARCHIVED orgs are
-- counted; the divergence from the SELECT policy is intentional and explained
-- there.
drop function if exists public.admin_list_users();

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
  org_names           text[],
  repo_count          bigint,
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
      -- array_agg over zero rows is NULL, and a null array reads as "unknown" in
      -- the client where the truth is "none". Same reasoning as the count
      -- coalesces around it.
      coalesce(orgs.names, '{}'::text[]),
      coalesce(repo.n_repos, 0),
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
    --
    -- The join to organizations cannot drop a membership: org_id is NOT NULL and
    -- FK'd, so the count is the same one this lateral returned before the names
    -- were added to it.
    left join lateral (
      select count(*) as n_orgs,
             array_agg(o.name order by m.created_at asc, o.name asc) as names
      from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = u.id
    ) orgs on true
    -- One count over a disjunction, so a team repo the user also owns is counted
    -- once — which a union of "owned" and "in my orgs" would double.
    -- The membership set is a property of the USER, not of the row being tested,
    -- so it is stated as an uncorrelated `in` rather than an `exists` re-run per
    -- repository. A null `r.org_id` never matches it, which is the personal-repo
    -- case already covered by the owner_id branch.
    left join lateral (
      select count(*) as n_repos
      from public.repositories r
      where r.owner_id = u.id
         or r.org_id in (
           select m.org_id
           from public.memberships m
           where m.user_id = u.id
         )
    ) repo on true
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

-- Re-applied after the drop, which took the old grants with it. Revoked from
-- `anon` as well as PUBLIC: Supabase's default privileges grant execute on new
-- functions in `public` to anon explicitly, and revoking from PUBLIC does not
-- remove an explicit grant.
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
