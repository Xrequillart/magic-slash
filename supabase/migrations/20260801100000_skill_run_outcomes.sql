-- The three skill rollups gain outcome columns.
--
-- `total` keeps its exact meaning — every run STARTED — and keeps its position, so
-- nothing that reads it today changes. The webapp selects `skill` and `total` by name
-- and is unaffected by the additions.
--
-- WHAT THE NEW COLUMNS ARE FOR
-- ---------------------------------------------------------------------------
-- Until now a run was a tally mark. It could not say whether the skill finished, and
-- since the counter fires BEFORE the skill body runs, an interrupted /magic:pr and a
-- completed one were the same row. `completed` and `abandoned` split that apart, and
-- their difference is the number worth reading: a skill people start and do not
-- finish is a broken skill, and it used to look like a popular one.
--
-- The three functions MUST agree on these definitions, for the reason the existing
-- comments already give about the folded plugin prefix: the same team is shown these
-- numbers in the app and read by support in the back-office, and a disagreement
-- between the two surfaces gets reported as data loss. The definitions therefore live
-- in one place, `skill_run_facets`, which all three select from.

-- ---------------------------------------------------------------------------
-- skill_run_facets — the shared definition of the three states
-- ---------------------------------------------------------------------------
-- A VIEW rather than three copies of the same CASE expressions. `security_invoker`
-- so it carries no privilege of its own: each caller still reads exactly the rows its
-- own RLS policy allows, which is what keeps org_skill_counts (member-scoped) and
-- admin_org_skill_counts (platform-admin-scoped) honest while sharing this.
--
-- The 4-hour threshold is the abandonment rule from 20260801090000. It is the same
-- bound close_skill_run refuses to reach past, so a run can never be closed after it
-- has started reading as abandoned.
create or replace view public.skill_run_facets
with (security_invoker = true) as
select
  si.org_id,
  si.user_id,
  si.agent_id,
  regexp_replace(si.skill, '^.*:', '') as skill,
  si.occurred_at,
  si.ended_at is not null as is_completed,
  si.ended_at is null and si.occurred_at < now() - interval '4 hours' as is_abandoned,
  case
    when si.ended_at is not null
    then (extract(epoch from (si.ended_at - si.occurred_at)) * 1000)::bigint
  end as duration_ms
from public.skill_invocations si;

comment on view public.skill_run_facets is
  'One row per skill run with its plugin prefix folded and its state resolved '
  '(completed / abandoned / still running) plus its duration. SECURITY INVOKER: it '
  'grants nothing, each caller sees only what skill_invocations RLS allows them. '
  'Exists so the three rollups cannot drift on what "abandoned" means.';

grant select on public.skill_run_facets to authenticated;

-- ---------------------------------------------------------------------------
-- The three rollups
-- ---------------------------------------------------------------------------
-- `drop` first: adding OUT parameters changes the return type, which create or
-- replace cannot do.

drop function if exists public.org_skill_counts(uuid);

create function public.org_skill_counts(p_org_id uuid)
returns table (
  skill              text,
  total              bigint,
  completed          bigint,
  abandoned          bigint,
  median_duration_ms bigint
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'org_skill_counts requires an authenticated user';
  end if;

  -- No membership check. RLS on skill_invocations is the check (inherited through
  -- the security-invoker view), and duplicating it here would be a second copy of
  -- the rule that could drift from the policy.
  --
  -- Aliased inside the CTE and selected out: plpgsql resolves a bare `skill` or
  -- `total` in an ORDER BY against this function's OUT PARAMETERS before it looks at
  -- the query's own columns, which is an ambiguity error rather than a wrong answer —
  -- but only at run time.
  return query
    with counted as (
      select
        f.skill as name,
        count(*) as runs,
        count(*) filter (where f.is_completed) as done,
        count(*) filter (where f.is_abandoned) as dropped,
        (percentile_cont(0.5) within group (order by f.duration_ms))::bigint as median_ms
      from public.skill_run_facets f
      where f.org_id = p_org_id
      group by 1
    )
    select c.name, c.runs, c.done, c.dropped, c.median_ms
    from counted c
    order by c.runs desc, c.name asc;
end;
$$;

revoke execute on function public.org_skill_counts(uuid) from public, anon;
grant execute on function public.org_skill_counts(uuid) to authenticated;

comment on function public.org_skill_counts(uuid) is
  'All-time runs per skill for one organization, for its own members: how many were '
  'started, how many finished, how many were abandoned, and the median duration of '
  'those that finished. SECURITY INVOKER: scoping is the skill_invocations SELECT '
  'policy, so a non-member gets an empty result rather than an error.';

drop function if exists public.personal_skill_counts();

create function public.personal_skill_counts()
returns table (
  skill              text,
  total              bigint,
  completed          bigint,
  abandoned          bigint,
  median_duration_ms bigint
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'personal_skill_counts requires an authenticated user';
  end if;

  return query
    with counted as (
      select
        f.skill as name,
        count(*) as runs,
        count(*) filter (where f.is_completed) as done,
        count(*) filter (where f.is_abandoned) as dropped,
        (percentile_cont(0.5) within group (order by f.duration_ms))::bigint as median_ms
      from public.skill_run_facets f
      where f.org_id is null
        and f.user_id = auth.uid()
      group by 1
    )
    select c.name, c.runs, c.done, c.dropped, c.median_ms
    from counted c
    order by c.runs desc, c.name asc;
end;
$$;

revoke execute on function public.personal_skill_counts() from public, anon;
grant execute on function public.personal_skill_counts() to authenticated;

comment on function public.personal_skill_counts() is
  'All-time runs per skill for the CALLER''s own work outside any organization '
  '(null org_id), with the same completed / abandoned / median breakdown as '
  'org_skill_counts. One person''s counts, not a team''s.';

drop function if exists public.admin_org_skill_counts(uuid);

create function public.admin_org_skill_counts(p_org_id uuid)
returns table (
  skill              text,
  total              bigint,
  completed          bigint,
  abandoned          bigint,
  median_duration_ms bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_org_skill_counts requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  -- SECURITY DEFINER, so the security-invoker view resolves against the OWNER and
  -- returns every org's rows. The is_platform_admin() gate above is what scopes this,
  -- which is the arrangement the original function already relied on.
  return query
    with counted as (
      select
        f.skill as name,
        count(*) as runs,
        count(*) filter (where f.is_completed) as done,
        count(*) filter (where f.is_abandoned) as dropped,
        (percentile_cont(0.5) within group (order by f.duration_ms))::bigint as median_ms
      from public.skill_run_facets f
      where f.org_id = p_org_id
      group by 1
    )
    select c.name, c.runs, c.done, c.dropped, c.median_ms
    from counted c
    order by c.runs desc, c.name asc;
end;
$$;

revoke execute on function public.admin_org_skill_counts(uuid) from public, anon;
grant execute on function public.admin_org_skill_counts(uuid) to authenticated;

comment on function public.admin_org_skill_counts(uuid) is
  'Platform back-office: all-time runs per skill for one organization, with the same '
  'completed / abandoned / median breakdown members see through org_skill_counts. '
  'Gated on is_platform_admin(); read-only.';
