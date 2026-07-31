-- Migration: personal_skill_counts — the caller's OWN runs, outside any organization
--
-- WHY a third function rather than a nullable p_org_id
-- -----------------------------------------------------------------------------
-- 20260731100000 gave members `org_skill_counts(p_org_id)` and said, in as many
-- words, that `p_org_id` is not nullable because "my personal runs" is a different
-- question from "what this team has done". This migration is that other question, so
-- it gets its own function rather than turning the org one's argument nullable:
--
--   * the SCOPE differs in kind. An org rollup is EVERY member's work on that org's
--     repositories. This one is ONE person's work — the caller's own, and nobody
--     else's, because a personal repository has no other reader. A single function
--     whose meaning flips between "the team" and "just me" depending on whether an
--     argument is null is a function whose numbers cannot be compared to themselves.
--   * `null` is what a caller passes by ACCIDENT. A bug that loses the org id would
--     silently switch a team's dashboard to one person's counts, which is a wrong
--     answer that looks entirely plausible. With two functions that same bug is an
--     error, and no argument at all can be dropped from this one.
--
-- SECURITY INVOKER, for the same reason as its sibling: the RLS policy on
-- skill_invocations (20260727160000) is
--
--     user_id = auth.uid() or (org_id is not null and is_org_member(org_id))
--
-- whose FIRST arm is exactly this function's scope. A NULL-org row is therefore
-- visible to its author and to nobody else — not to their org's admins, not to a
-- teammate. RLS already guarantees that; the `user_id = auth.uid()` in the query
-- below is not load-bearing but is kept, because a reader has to be able to see the
-- scope in the query rather than infer it from a policy in another file.
--
-- WHAT "PERSONAL" ACTUALLY MEANS HERE, and where it is imperfect
-- -----------------------------------------------------------------------------
-- `org_id` is derived from the agent's repositories, so a run counted here is one
-- whose agent works only on personal repos (or on none yet). One case leaks the
-- other way and cannot be fixed from this end: a skill run in a Claude Code the
-- desktop app did not spawn has NO agent, so the trigger has nothing to derive from
-- and the client's own organization is kept (see 20260727180000). For a user who
-- belongs to an org, that genuinely-personal run is attributed to the org instead
-- and will not appear here. The desktop is where that would have to be fixed, and
-- until then these counts are a floor rather than a total.

create or replace function public.personal_skill_counts()
returns table (
  skill text,
  total bigint
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'personal_skill_counts requires an authenticated user';
  end if;

  -- Aliased `name`/`runs` inside the CTE, then selected out: plpgsql resolves a bare
  -- `skill` or `total` in an ORDER BY against this function's OUT PARAMETERS before
  -- it looks at the query's own columns, which is an ambiguity error rather than a
  -- wrong answer — but only at run time.
  --
  -- The plugin prefix is folded exactly as the other two functions fold it. All three
  -- MUST agree: the same person is shown these numbers on the personal tab, their
  -- team's on the org tab, and support reads the org's in the back-office. A
  -- disagreement between any two would be reported as data loss.
  return query
    with counted as (
      select
        regexp_replace(si.skill, '^.*:', '') as name,
        count(*) as runs
      from public.skill_invocations si
      where si.org_id is null
        and si.user_id = auth.uid()
      group by 1
    )
    select c.name, c.runs
    from counted c
    order by c.runs desc, c.name asc;
end;
$$;

revoke execute on function public.personal_skill_counts() from public, anon;
grant execute on function public.personal_skill_counts() to authenticated;

comment on function public.personal_skill_counts() is
  'All-time run count per skill for the CALLER''s own work outside any '
  'organization (skill_invocations with a null org_id). One person''s counts, not '
  'a team''s — see org_skill_counts for that. SECURITY INVOKER; a plugin prefix '
  '("plugin:skill") is folded away, matching the other two rollups.';
