-- Migration: admin_list_orgs — every organization on the platform (issue #153)
--
-- WHY a seventh function
-- -----------------------------------------------------------------------------
-- 20260728090000 shipped six read-only RPCs, and every org-shaped one among them
-- is scoped to a single user: `admin_list_user_orgs(p_user_id)` answers "which
-- orgs does THIS person belong to". Nothing answers "which organizations exist",
-- which is the question the back-office's Organizations tab is. Composing it out
-- of the existing surface would mean calling admin_list_users(), then one
-- admin_list_user_orgs() per user, and unioning the results client-side — N+1
-- round trips for a list the database can produce in one, and still wrong: an org
-- with no members would appear in nobody's list and vanish from the platform view.
--
-- Same shape and same constraints as its six siblings: `SECURITY DEFINER`, locked
-- search_path, `is_platform_admin()` gate, an explicit column allowlist in the
-- `returns table`, and no existing policy touched. Still `select`-shaped — writes,
-- an audit log, analytics and impersonation remain out of scope.

-- ---------------------------------------------------------------------------
-- admin_list_orgs: the tenant list, with the rollups shown next to each row
-- ---------------------------------------------------------------------------
-- The driving relation is `public.organizations`, for the same reason
-- admin_list_users drives off `auth.users`: an org with no memberships, no repo
-- and no agent is a real row that a query driven off any of those would silently
-- drop. A freshly created org is exactly that for as long as it takes to send the
-- first invitation, and "the list is missing the org you just made" is the kind of
-- bug that gets diagnosed as a permissions problem.
--
-- Every aggregate is a `left join lateral` rather than a group-by over a five-way
-- join: memberships, repositories, agents and invitations are independent
-- one-to-many relations, so a single join would multiply each count by the
-- cardinality of the others. `coalesce(..., 0)` because a LEFT JOIN over zero rows
-- yields NULL, and "0 members" is the truth while NULL reads as "unknown".
--
-- ARCHIVED ORGS ARE INCLUDED, matching admin_list_user_orgs and
-- admin_list_user_agents. Archiving is a soft delete
-- (20260723120000_org_member_management.sql) and "they archived it last month" is
-- an answer; `archived_at` is returned so the caller can say which. The MEMBER
-- counts, by contrast, are taken as they stand — archiving an org does not remove
-- its memberships, so the counts describe what would come back if it were
-- restored.
--
-- Columns are an allowlist, as everywhere in this feature. `created_by_email` is
-- resolved through `auth.users` because a uuid does not identify a human in a
-- support conversation; admin_list_users already returns emails, so this exposes
-- no category of data the back-office could not already see. The invitation
-- TOKENS are not returned and must never be: a token is a bearer credential that
-- grants org membership to whoever holds it, so a back-office that displayed one
-- would be handing out tenant access rather than reporting on it. Only the count
-- of pending invitations is exposed.
create or replace function public.admin_list_orgs()
returns table (
  org_id                   uuid,
  name                     text,
  created_by               uuid,
  created_by_email         text,
  archived_at              timestamptz,
  created_at               timestamptz,
  member_count             bigint,
  admin_count              bigint,
  repo_count               bigint,
  agent_count              bigint,
  pending_invitation_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'admin_list_orgs requires an authenticated user';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not a platform admin';
  end if;

  return query
    select
      o.id,
      o.name,
      o.created_by,
      -- LEFT JOIN, not an inner one: created_by is nullable and its FK to
      -- auth.users has no ON DELETE CASCADE, so an org outlives the account that
      -- created it. Inner-joining here would drop precisely the orphaned orgs an
      -- operator most needs to find.
      creator.email::text,
      o.archived_at,
      o.created_at,
      coalesce(m.total, 0),
      coalesce(m.admins, 0),
      coalesce(r.total, 0),
      coalesce(a.total, 0),
      coalesce(i.total, 0)
    from public.organizations o
    left join auth.users creator on creator.id = o.created_by
    left join lateral (
      select count(*) as total,
             count(*) filter (where ms.role = 'admin') as admins
      from public.memberships ms
      where ms.org_id = o.id
    ) m on true
    left join lateral (
      select count(*) as total
      from public.repositories rp
      where rp.org_id = o.id
    ) r on true
    left join lateral (
      -- agents.org_id is DERIVED from the agent's repositories (20260727160000),
      -- so this counts the agents whose WORK belongs to the org, which is the
      -- question asked. Archived agents are included, consistently with
      -- admin_list_user_agents.
      select count(*) as total
      from public.agents ag
      where ag.org_id = o.id
    ) a on true
    left join lateral (
      select count(*) as total
      from public.invitations inv
      where inv.org_id = o.id
        and inv.status = 'pending'
    ) i on true
    order by o.created_at asc;
end;
$$;

-- Revoked from `anon` as well as PUBLIC: Supabase's default privileges grant
-- execute on new public functions to `anon` explicitly, and revoking from PUBLIC
-- does not remove an explicit grant. Same reasoning as the six functions in
-- 20260728090000.
revoke execute on function public.admin_list_orgs() from public, anon;
grant execute on function public.admin_list_orgs() to authenticated;

comment on function public.admin_list_orgs() is
  'Platform back-office: every organization with member/repo/agent/pending-invite '
  'counts. Archived orgs included (archived_at says which). Gated on '
  'is_platform_admin(); read-only; invitation tokens are never returned.';
