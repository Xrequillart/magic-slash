-- Migration: repositories.remote_url — the clone address, shared with the org
--
-- An invitee inherits everything about a team repo except the one thing that is
-- machine-local: `path`. Until now that meant they had to already have a clone on
-- disk and go find it in a folder picker. The repository's remote URL is the
-- missing piece: with it the app can `git clone` the repo for them and bind the
-- resulting path in one click.
--
-- remote_url is SHARED IDENTITY, not a secret. It is the normalised
-- `https://github.com/owner/repo` address — exactly what `git remote get-url
-- origin` reports and what anyone with access to the repository already knows.
-- No token, no credential and no private URL belongs in this column: the clone
-- runs on the member's own machine with their own gh/ssh credentials, and
-- nothing about those ever reaches the database. Treat it like `name`.
--
-- The column is nullable and stays null for every repo created before this
-- migration, and for any repo whose origin is not a GitHub remote. Null simply
-- means "nothing to clone from" — the UI falls back to the folder picker it
-- already has.

alter table public.repositories
  add column if not exists remote_url text;

comment on column public.repositories.remote_url is
  'Normalised clone address of the repo (https://github.com/owner/repo). SHARED IDENTITY, never a secret: it holds no credential, and the clone runs locally with the member''s own gh/ssh login. NULL = no known remote, the app falls back to picking a folder.';

-- ---------------------------------------------------------------------------
-- set_repository_remote_url: let a plain member fill the blank
-- ---------------------------------------------------------------------------
-- The remote is captured opportunistically, by whoever first binds a local path
-- to the repo — and for a team repo that is precisely the ordinary member the
-- clone feature exists for. `repositories_update` is admin-or-owner only since
-- 20260726090000, so their write would be rejected, loudly (the desktop app
-- surfaces every failed repo write as a toast and re-hydrates).
--
-- This function is the narrow exception: SECURITY DEFINER, one column, and only
-- when that column is still NULL. A member can therefore CONTRIBUTE the address
-- their own clone reports, but can never redirect an existing one — an admin
-- keeps sole control over a remote that is already set, and `repositories_update`
-- remains the only way to change one.
create or replace function public.set_repository_remote_url(p_repo_id uuid, p_url text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_org uuid;
  v_current text;
begin
  select owner_id, org_id, remote_url
    into v_owner, v_org, v_current
    from public.repositories
   where id = p_repo_id;

  -- No such repo, or the caller may not touch it: owner, or member of the org it
  -- is shared to — the same audience `repositories_select` already shows it to.
  if not found then
    return false;
  end if;
  if v_owner is distinct from auth.uid()
     and not (v_org is not null and public.is_org_member(v_org)) then
    return false;
  end if;

  -- Fill-only. An address that is already there is an admin's to change.
  if v_current is not null then
    return false;
  end if;
  if p_url is null or btrim(p_url) = '' then
    return false;
  end if;

  update public.repositories
     set remote_url = p_url
   where id = p_repo_id
     and remote_url is null;

  return true;
end;
$$;

revoke execute on function public.set_repository_remote_url(uuid, text) from public;
grant execute on function public.set_repository_remote_url(uuid, text) to authenticated;
