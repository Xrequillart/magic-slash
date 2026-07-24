-- Migration: set_org_shared_config
-- The admin WRITE counterpart to get_org_shared_config (migration
-- 20260723100000). Lets an org admin persist the shared config fields that new
-- invitees inherit — languages, commit/PR format, and shared repo keywords.
--
-- Mirrors the established RPC pattern (get_org_shared_config, remove_member,
-- ...): SECURITY DEFINER with a locked search_path, an auth.uid() guard, and a
-- defense-in-depth is_org_admin() check on top of RLS (which SECURITY DEFINER
-- bypasses). Grants are revoked from PUBLIC and granted to authenticated only.
--
-- Why it writes into the ORG CREATOR's config row
-- ---------------------------------------------------------------------------
-- configs is per-user (unique (org_id, user_id)); there is no org-level config
-- row. get_org_shared_config sources the "org shared config" from the org
-- creator/admin's row — it reads organizations.created_by into admin_uid and
-- returns the shared fields from configs where (org_id, user_id) = (org,
-- admin_uid). To stay consistent, the write MUST target that same row, so a
-- subsequent get_org_shared_config reads back exactly what was written. We
-- therefore upsert into (org_id = p_org_id, user_id = created_by), regardless of
-- which admin performs the call.
--
-- Only the shared fields are persisted: p_shared is projected down to
-- languages/commit/pullRequest/repoKeywords (unknown/extra keys ignored, nulls
-- dropped) exactly as get_org_shared_config projects on read, then merged into
-- the creator's existing data jsonb so any other (local/per-user) keys already
-- there are preserved.
create or replace function public.set_org_shared_config(p_org_id uuid, p_shared jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  creator_uid uuid;
  shared_subset jsonb;
begin
  if auth.uid() is null then
    raise exception 'set_org_shared_config requires an authenticated user';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not an admin of this organization';
  end if;

  select created_by into creator_uid
  from public.organizations
  where id = p_org_id;

  if creator_uid is null then
    raise exception 'organization has no creator to store shared config';
  end if;

  -- Project p_shared down to just the shared fields (ignore unknown/extra keys),
  -- stripping nulls so absent keys are simply omitted — mirroring how
  -- get_org_shared_config projects on read.
  shared_subset := jsonb_strip_nulls(jsonb_build_object(
    'languages',    p_shared -> 'languages',
    'commit',       p_shared -> 'commit',
    'pullRequest',  p_shared -> 'pullRequest',
    'repoKeywords', p_shared -> 'repoKeywords'
  ));

  -- Upsert into the creator's config row. On insert the shared subset is the
  -- whole data blob; on conflict we merge (data || subset) so any pre-existing
  -- non-shared keys in the creator's data are preserved.
  insert into public.configs (org_id, user_id, data)
  values (p_org_id, creator_uid, shared_subset)
  on conflict (org_id, user_id)
  do update set data = public.configs.data || excluded.data;
end;
$$;

revoke execute on function public.set_org_shared_config(uuid, jsonb) from public;
grant execute on function public.set_org_shared_config(uuid, jsonb) to authenticated;
