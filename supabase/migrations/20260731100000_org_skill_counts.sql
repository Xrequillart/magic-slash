-- Migration: org_skill_counts — the per-skill run rollup, for the org's OWN members
--
-- WHY a second function next to admin_org_skill_counts
-- -----------------------------------------------------------------------------
-- 20260731090000 gave the back-office the same rollup, gated on
-- `is_platform_admin()`. That gate is exactly why it cannot be reused here: the
-- Team page in the desktop app and the /organization page in the webapp are read by
-- ORDINARY MEMBERS, and every one of them would be refused. The alternative —
-- loosening the admin function's gate to "platform admin OR org member" — would put
-- two different trust levels behind one entry point, where a mistake in the
-- condition silently turns a back-office read into a public one. Two functions, one
-- gate each.
--
-- SECURITY INVOKER, and that is the whole design
-- -----------------------------------------------------------------------------
-- No `security definer` here, unlike most functions in this schema. It is not
-- needed, so it is not taken:
--
--   * `skill_invocations` already has the right SELECT policy (20260727160000):
--         user_id = auth.uid() or (org_id is not null and is_org_member(org_id))
--     so a member reads their org's rows and a non-member reads none. Running as
--     the CALLER makes that policy the scoping, rather than re-deriving it in a
--     hand-written guard that could disagree with it.
--   * nothing here reads outside that one table. The admin function needs DEFINER
--     because a platform admin is not a member and RLS would show them nothing;
--     a member needs no such help.
--
-- A non-member therefore gets an empty result rather than an exception. That is the
-- honest shape for a function whose answer is "rows you may see": there is no
-- information in the distinction, because a non-member cannot tell an org with no
-- runs from one they cannot read — which is the point.
--
-- WHAT IS NOT COUNTED, same as the admin function: a run is attributed to an org
-- through its agent, whose org_id is derived from the agent's repositories. Work on
-- a PERSONAL repository lands with org_id NULL and belongs to no org, so these are
-- the team's totals and not the sum of what its members do all day. A member CAN
-- read their own NULL-org rows (the first arm of the policy above), but this
-- function does not return them: `p_org_id` is not nullable, and "my personal runs"
-- is a different question than "what this team has done".

create or replace function public.org_skill_counts(p_org_id uuid)
returns table (
  skill text,
  total bigint
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'org_skill_counts requires an authenticated user';
  end if;

  -- No membership check. RLS on skill_invocations is the check, and duplicating it
  -- here would be a second copy of the rule that could drift from the policy.

  -- Aliased `name`/`runs` inside the CTE, then selected out: plpgsql resolves a
  -- bare `skill` or `total` in an ORDER BY against this function's OUT PARAMETERS
  -- before it looks at the query's own columns, which is an ambiguity error rather
  -- than a wrong answer — but only at run time.
  --
  -- The plugin prefix is folded exactly as the admin function folds it: Claude Code
  -- reports a plugin-provided skill as "plugin:skill", so the same magic-commit
  -- reads as `magic-commit` for anyone who installed via install.sh and as
  -- `magic-slash:magic-commit` for anyone who installed the plugin. Left alone, one
  -- team's runs would split across two rows and both would under-report. The two
  -- functions MUST agree on this: the same team is shown these numbers in the app
  -- and read by support in the back-office, and a disagreement between the two
  -- surfaces would be reported as data loss.
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
-- does not remove an explicit grant. `anon` has no auth.uid() and would be refused
-- by the guard anyway — the privilege is removed so that is not the only thing
-- standing in the way.
revoke execute on function public.org_skill_counts(uuid) from public, anon;
grant execute on function public.org_skill_counts(uuid) to authenticated;

comment on function public.org_skill_counts(uuid) is
  'All-time run count per skill for one organization, for its own members. '
  'SECURITY INVOKER: scoping is the skill_invocations SELECT policy, so a '
  'non-member gets no rows. A plugin prefix ("plugin:skill") is folded away, '
  'matching admin_org_skill_counts. Counts only runs attributed to the org '
  'through their agent, so personal-repo work is excluded by design.';
