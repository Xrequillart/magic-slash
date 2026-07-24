-- Migration: repositories (personal + team repos)
-- Cloud PR — introduces first-class repository entities so a repo can be either
-- PERSONAL (owned by a user, attached to no org) or TEAM (shared to one org, so
-- every member sees it). Repos previously lived only inside each user's config
-- blob (configs.data.repositories) and were never shared.
--
-- Two tables:
--   * repositories       — the shared repo IDENTITY (name, keywords, format,
--                          branches, …) WITHOUT any local filesystem path.
--                          org_id NULL = personal (owner-only); org_id set =
--                          shared to that org (visible to all its members).
--   * repository_paths   — the per-user LOCAL PATH binding for a repo. A path is
--                          machine/user specific and is NEVER shared with other
--                          members (own-rows-only RLS). A repo with no path row
--                          for the current user renders in a "no local folder"
--                          warning state in the app.
--
-- Follows the established conventions: SECURITY DEFINER helper functions
-- (is_org_member / is_org_admin) for membership checks, WITH CHECK on every
-- write policy to prevent cross-tenant rows, updated_at triggers, explicit
-- grants to authenticated (anon gets nothing), and realtime publication with
-- REPLICA IDENTITY FULL so DELETE payloads carry the full row for RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- repositories: shared identity of a repo, no local path.
create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  -- The creator. references auth.users (not memberships) because a personal repo
  -- (org_id NULL) has no org to tie ownership to. on delete set null: a deleted
  -- account leaves team repos intact for the rest of the org; personal orphans
  -- (owner null + org null) simply become invisible.
  owner_id uuid references auth.users (id) on delete set null,
  -- NULL = personal; set = shared to this org. on delete set null so deleting an
  -- org reverts its repos to personal (owned by their owner) rather than losing
  -- them.
  org_id uuid references public.organizations (id) on delete set null,
  name text not null,
  keywords text[] not null default '{}',
  color text,
  languages jsonb not null default '{}'::jsonb,
  commit jsonb not null default '{}'::jsonb,
  pull_request jsonb not null default '{}'::jsonb,
  resolve jsonb not null default '{}'::jsonb,
  issues jsonb not null default '{}'::jsonb,
  branches jsonb not null default '{}'::jsonb,
  worktree_files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- repository_paths: per-user local path binding for a repo.
create table if not exists public.repository_paths (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repositories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repo_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Uniqueness (partial indexes, split by scope)
-- ---------------------------------------------------------------------------
-- Team repos: one name per org, regardless of which member created it.
create unique index if not exists uq_repositories_org_name
  on public.repositories (org_id, name)
  where org_id is not null;
-- Personal repos: one name per owner.
create unique index if not exists uq_repositories_owner_name
  on public.repositories (owner_id, name)
  where org_id is null;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_repositories_org_id on public.repositories (org_id);
create index if not exists idx_repositories_owner_id on public.repositories (owner_id);
create index if not exists idx_repository_paths_user_id on public.repository_paths (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.repositories;
create trigger set_updated_at
  before update on public.repositories
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.repository_paths;
create trigger set_updated_at
  before update on public.repository_paths
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.repositories enable row level security;
alter table public.repository_paths enable row level security;

grant select, insert, update, delete on public.repositories to authenticated;
grant select, insert, update, delete on public.repository_paths to authenticated;

-- repositories -------------------------------------------------------------
-- Visible if you own it (personal) or you're a member of the org it's shared to.
create policy repositories_select on public.repositories
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_member(org_id))
  );

-- Create your own repo. When sharing to an org (org_id set) you must be a member
-- of that org — no creating repos inside an org you don't belong to.
create policy repositories_insert on public.repositories
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (org_id is null or public.is_org_member(org_id))
  );

-- Edit is open to the owner and to any member of the org the repo belongs to
-- (team repos are collaboratively editable). WITH CHECK additionally forbids
-- moving a repo into an org you're not a member of, so sharing/re-sharing always
-- targets one of your own orgs.
create policy repositories_update on public.repositories
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_member(org_id))
  )
  with check (
    (owner_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)))
    and (org_id is null or public.is_org_member(org_id))
  );

-- Delete: the owner, or an admin of the org the repo is shared to.
create policy repositories_delete on public.repositories
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_admin(org_id))
  );

-- repository_paths ---------------------------------------------------------
-- A path binding is strictly private to its user: own-rows-only for every verb.
-- Other members never see where you cloned a shared repo locally.
create policy repository_paths_select on public.repository_paths
  for select to authenticated
  using (user_id = auth.uid());

create policy repository_paths_insert on public.repository_paths
  for insert to authenticated
  with check (user_id = auth.uid());

create policy repository_paths_update on public.repository_paths
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy repository_paths_delete on public.repository_paths
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Stream INSERT/UPDATE/DELETE so a team repo created by one member appears live
-- in every other member's app. RLS is enforced identically on the socket, so a
-- member only ever receives events for repos they can already see (own or in
-- their orgs) and path rows that are their own. REPLICA IDENTITY FULL makes the
-- full previous row available on UPDATE/DELETE (needed for RLS + delete ids).
alter publication supabase_realtime add table public.repositories;
alter table public.repositories replica identity full;

alter publication supabase_realtime add table public.repository_paths;
alter table public.repository_paths replica identity full;
