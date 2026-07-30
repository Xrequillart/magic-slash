-- ---------------------------------------------------------------------------
-- admin_list_user_repositories: say whether the user bound a local path
-- ---------------------------------------------------------------------------
-- A repository row is configuration; a `repository_paths` row is what makes it
-- USABLE on a machine. Without one, the repo exists in the account, appears in the
-- app, and does nothing — which is the shape of a support report that reads "my repo
-- doesn't work" and has no other symptom. The console could not answer it.
--
-- PRESENCE ONLY. The original function deliberately did not join
-- `repository_paths` (20260728090000_platform_admins.sql), on the grounds that
-- "knowing where on someone's disk a checkout lives answers no product question".
-- That still holds and the path is still not returned: `/Users/<their name>/...`
-- carries their OS account name and answers nothing an operator needs. Whether a
-- binding EXISTS is a different fact, and the only one added here.
--
-- Per user, not per repo: the table is unique on (repo_id, user_id), so a team repo
-- bound by three colleagues and not by this one is `false` in this list — correctly,
-- since the question is what THIS account can run.
--
-- `exists`, not a join: a join to a table unique on (repo_id, user_id) would not
-- duplicate rows today, but it would make the row count depend on that constraint
-- holding. `exists` cannot fan out whatever the schema does later.
--
-- Replaced rather than altered, and the drop is mandatory: `create or replace`
-- cannot change a function's return type, and adding a column to a `returns table`
-- is exactly that. The drop takes the grants with it, so both are re-applied below.
drop function if exists public.admin_list_user_repositories(uuid);

create or replace function public.admin_list_user_repositories(p_user_id uuid)
returns table (
  id         uuid,
  name       text,
  org_id     uuid,
  org_name   text,
  keywords   text[],
  has_path   boolean,
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
    select
      r.id,
      r.name,
      r.org_id,
      o.name,
      r.keywords,
      exists (
        select 1
        from public.repository_paths rp
        where rp.repo_id = r.id
          and rp.user_id = p_user_id
      ),
      r.created_at
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

-- Re-applied after the drop, which took the old grants with it. Revoked from `anon`
-- as well as PUBLIC: Supabase's default privileges grant execute on new functions in
-- `public` to anon explicitly, and revoking from PUBLIC does not remove an explicit
-- grant.
revoke execute on function public.admin_list_user_repositories(uuid) from public, anon;
grant execute on function public.admin_list_user_repositories(uuid) to authenticated;
