-- Migration: agent_repositories — a real link between an agent and its repos
--
-- Until now an agent referenced its repositories only as `agents.repositories`,
-- a jsonb array of ABSOLUTE FILESYSTEM PATHS on its owner's machine. Two
-- consequences the app has been paying for:
--
--   * a teammate's paths never match ours, so the team views have to guess the
--     repository from the last path segment (desktop/src/repoMatch.ts);
--   * /magic:start moves the agent into a worktree at `../<repo>-<TICKET>`, a
--     SIBLING directory, and REPLACES the agent's paths with it — so after
--     starting a ticket an agent no longer references its repository at all.
--
-- This table makes the link explicit, by uuid. It is what lets the next
-- migration derive an agent's organization from its repositories instead of
-- stamping it from a client-chosen "active org".
--
-- The paths stay where they are: they are still what relaunches an agent in the
-- right directory and what keys metadata.repositoryMetadata. The link is an
-- added identity, not a replacement.

create table if not exists public.agent_repositories (
  agent_id uuid not null references public.agents (id) on delete cascade,
  repo_id  uuid not null references public.repositories (id) on delete cascade,
  -- Attachment order decides which organization an agent lands in when it spans
  -- several (see the derive trigger in the next migration), so it is data, not
  -- bookkeeping.
  created_at timestamptz not null default now(),
  primary key (agent_id, repo_id)
);

comment on table public.agent_repositories is
  'Which repositories an agent works on. An agent''s organization is derived '
  'from these rows; it is never chosen by the client.';

-- The PK already indexes (agent_id, …). This serves the reverse lookup: every
-- agent working on a repo, which is what the team views read.
create index if not exists idx_agent_repositories_repo_id
  on public.agent_repositories (repo_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — mirrors the agents table it hangs off
-- ---------------------------------------------------------------------------
alter table public.agent_repositories enable row level security;

grant select, insert, delete on public.agent_repositories to authenticated;
-- No UPDATE grant: a link is created or removed, never edited. Both columns are
-- the primary key, so an update would be a delete + insert anyway.

-- Visible whenever the agent it belongs to is visible. Deliberately expressed
-- against `agents` rather than duplicating the org logic here, so the two can
-- never drift apart.
create policy agent_repositories_select on public.agent_repositories
  for select to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_id
        and (a.owner_id = auth.uid() or (a.org_id is not null and public.is_org_member(a.org_id)))
    )
  );

-- Only the agent's owner links or unlinks a repository, and only to a repo they
-- can already see (their own, or one shared with an org they belong to).
create policy agent_repositories_insert on public.agent_repositories
  for insert to authenticated
  with check (
    exists (select 1 from public.agents a where a.id = agent_id and a.owner_id = auth.uid())
    and exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
    )
  );

create policy agent_repositories_delete on public.agent_repositories
  for delete to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_id and a.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- A teammate attaching a repo changes who sees their agent, so the link has to
-- stream like the agents themselves. RLS is enforced identically on the socket.
alter publication supabase_realtime add table public.agent_repositories;
alter table public.agent_repositories replica identity full;

-- ---------------------------------------------------------------------------
-- Backfill from the existing paths
-- ---------------------------------------------------------------------------
-- Three passes, narrowest first, matching each path in agents.repositories
-- against the OWNER's own repository_paths rows (a path binding is per-user, so
-- only the agent owner's bindings can explain their agent's paths):
--
--   1. exact path equality
--   2. same folder name          → the repo was cloned elsewhere / path drifted
--   3. folder name `<repo>-<TICKET>` → a /magic:start worktree
--
-- Pass 3 is the one that recovers the common case. The ticket shape is
-- deliberately narrow (`PER-5030` or `456`) so a repo `magic` cannot swallow a
-- folder `magic-slash-ui`; it mirrors TICKET_SUFFIX in desktop/src/repoMatch.ts.
--
-- Agents whose paths match nothing keep no row: an unconfigured repo or a
-- deleted worktree cannot be invented. They are counted and reported rather
-- than hidden — with no link they will derive no organization, which is a real
-- visibility change for old agents.
do $$
declare
  linked   bigint;
  orphans  bigint;
begin
  with agent_paths as (
    select a.id as agent_id,
           a.owner_id,
           trim(trailing '/' from p.value) as path,
           regexp_replace(trim(trailing '/' from p.value), '^.*/', '') as folder
      from public.agents a
      cross join lateral jsonb_array_elements_text(
        case when jsonb_typeof(a.repositories) = 'array' then a.repositories else '[]'::jsonb end
      ) as p(value)
     where a.owner_id is not null
  ),
  owner_repos as (
    select rp.user_id,
           rp.repo_id,
           trim(trailing '/' from rp.path) as path,
           regexp_replace(trim(trailing '/' from rp.path), '^.*/', '') as folder
      from public.repository_paths rp
  ),
  matched as (
    select distinct ap.agent_id, orp.repo_id
      from agent_paths ap
      join owner_repos orp
        on orp.user_id = ap.owner_id
       and (
            orp.path = ap.path
         or orp.folder = ap.folder
         or ap.folder ~ ('^' || regexp_replace(orp.folder, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g')
                             || '-([A-Za-z][A-Za-z0-9]*-)?[0-9]+$')
       )
     where orp.folder <> ''
  ),
  inserted as (
    insert into public.agent_repositories (agent_id, repo_id)
    select agent_id, repo_id from matched
    on conflict do nothing
    returning 1
  )
  select count(*) into linked from inserted;

  select count(*) into orphans
    from public.agents a
   where not exists (select 1 from public.agent_repositories ar where ar.agent_id = a.id);

  raise notice 'agent_repositories backfill: % link(s) created, % agent(s) left without any repository', linked, orphans;
end;
$$;
