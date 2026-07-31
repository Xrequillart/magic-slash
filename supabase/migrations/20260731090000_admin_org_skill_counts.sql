-- Migration: admin_org_skill_counts — how much one tenant actually RUNS
--
-- WHY
-- -----------------------------------------------------------------------------
-- The org record page could say how big a tenant is (members, repos, agents, all
-- rolled up by admin_list_orgs) and nothing at all about whether it is USED. Those
-- are different questions and the second is the one a support conversation turns
-- on: an org with nine members and four magic-commit runs between them is a failed
-- rollout, and it reads as a healthy tenant from every count we had.
--
-- `skill_invocations` (20260725120000) already holds the answer — one append-only
-- row per skill run, fed by the desktop's PreToolUse hook. It is org-scoped, and
-- indexed on org_id, so the rollup is one grouped scan of one partition.
--
-- Same shape and same constraints as its siblings: SECURITY DEFINER, locked
-- search_path, `is_platform_admin()` gate, an explicit column allowlist in the
-- `returns table`. Read-only.
--
-- WHAT THIS DOES NOT COUNT, and why it cannot
-- -----------------------------------------------------------------------------
-- A run is attributed to an org through its AGENT, whose org_id is itself derived
-- from the repositories attached to it (20260727160000, then 20260727180000 made a
-- trigger stamp it). Two consequences an operator reading this card has to know:
--
--   * a run on a PERSONAL repo lands with org_id NULL and is counted for nobody.
--     That is correct — it is not the org's work — but it means these totals are
--     the tenant's TEAM activity, not the sum of what its members do all day.
--   * a run in a Claude Code the desktop app did not spawn has no agent, so it
--     keeps whichever org the client sent. That path is the client's guess and the
--     only attribution available.
--
-- Neither is fixable here, and both are properties of the data rather than of this
-- function. Stated so the next reader does not go looking for the missing rows.

-- ---------------------------------------------------------------------------
-- admin_org_skill_counts: every skill this org has run, with its run count
-- ---------------------------------------------------------------------------
-- EVERY skill, not the seven the console draws. The caller picks which to show,
-- so adding magic-plan to the card later is a line of JSX and not a migration —
-- and an operator who wonders what else these people run can be shown the tail
-- without a second function. `skill` is free text on purpose (third-party and
-- plugin skills have names we cannot enumerate), and that stays true here.
--
-- A PLUGIN PREFIX IS FOLDED AWAY. Claude Code reports a plugin-provided skill as
-- "plugin:skill", so the same magic-commit reads as `magic-commit` for anyone who
-- installed via install.sh and as `magic-slash:magic-commit` for anyone who
-- installed the plugin. Left alone, one tenant's runs would split across two rows
-- and the card would under-report both. Everything up to the LAST colon is
-- stripped, which is also why the aggregate is over the stripped value rather than
-- over the raw column: grouping first and folding after would leave the caller to
-- re-sum two rows it has no way to know are the same skill.
--
-- ORDERED BY COUNT, descending. The console renders a fixed order of its own, so
-- this is for the other caller — a human running the function by hand, who wants
-- the tail sorted by how much it matters. Name ascending breaks ties, so the
-- output is stable rather than at the planner's discretion.
--
-- No date window, and no `since` parameter. These are all-time totals: "how many
-- magic-starts has this org done" is the question. A windowed view is a different
-- function with a different name, not a nullable argument that silently changes
-- what a caller's numbers mean.
create or replace function public.admin_org_skill_counts(p_org_id uuid)
returns table (
  skill text,
  total bigint
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

  -- Aliased `name`/`runs` inside the CTE, then selected out: plpgsql resolves a
  -- bare `skill` or `total` in an ORDER BY against this function's OUT PARAMETERS
  -- before it looks at the query's own columns, which is an ambiguity error rather
  -- than a wrong answer — but only at run time.
  return query
    with counted as (
      select
        regexp_replace(si.skill, '^.*:', '') as name,
        count(*) as runs
      from public.skill_invocations si
      where si.org_id = p_org_id
      group by 1
    )
    select c.name, c.runs
    from counted c
    order by c.runs desc, c.name asc;
end;
$$;

-- Revoked from `anon` as well as PUBLIC: Supabase's default privileges grant
-- execute on new public functions to `anon` explicitly, and revoking from PUBLIC
-- does not remove an explicit grant.
revoke execute on function public.admin_org_skill_counts(uuid) from public, anon;
grant execute on function public.admin_org_skill_counts(uuid) to authenticated;

comment on function public.admin_org_skill_counts(uuid) is
  'Platform back-office: all-time run count per skill for one organization, from '
  'skill_invocations. Every skill the org has run, commonest first; a plugin '
  'prefix ("plugin:skill") is folded away so one skill is one row. Counts only '
  'runs attributed to the org through their agent, so personal-repo work is '
  'excluded by design. Gated on is_platform_admin(); read-only.';
