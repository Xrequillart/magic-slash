-- Migration: repository_workflows — the flow a repository's skills follow (#328)
--
-- The magic skills close on "what comes next": after /magic:commit, /magic:pr; after a PR
-- with review comments, /magic:resolve. That sequence is a workflow, and it now lives in
-- data rather than in each skill's prose: the desktop serves it over `GET /workflow`, the
-- skills read it at Step 0 and compute their next steps from it.
--
-- ONE ROW PER REPOSITORY, AND MOST HAVE NONE. No row means the repository follows the
-- default flow, which the desktop derives from its shipped skills list
-- (desktop/src/workflow/defaultFlow.ts) and which reproduces today's suggestions. A row
-- holds a custom flow; nothing about the default is stored, so improving it later needs no
-- data migration.
--
-- THE DEFINITION IS JSONB, VALIDATED BY THE APP. Its shape is `{ id, entry, nodes, links }`
-- (desktop/src/workflow/model.ts). A definition the app does not understand, or one that
-- fails its validation (the same skill on two nodes, a link to an unknown node…), is
-- ignored with a warning and the default is served instead: a bad row degrades to today's
-- behaviour, it never breaks a skill. No CHECK constraint duplicates those rules here — two
-- validators drift, and the one that matters is the one the skills are served through.
--
-- READ-ONLY FOR CLIENTS IN V1. Editing a flow is out of scope (no UI, no write path in the
-- app), so `authenticated` holds SELECT only, the way `plan_revisions` (20260923120000)
-- does, and there is no insert, update or delete policy. A row is written by hand, as the
-- table owner, until editing lands with its own migration and its own write policies.
--
-- VISIBLE TO WHOEVER CAN SEE THE REPOSITORY. The select policy repeats `repositories`'
-- own visibility test (owner, or a member of the org it is shared to — 20260724110000),
-- inside the EXISTS rather than leaning on that table's RLS, like `plan_sessions`
-- (20260924090000) does: a policy that reads correctly on its own survives a later change
-- to the other table's policies. A team repository's flow is the team's.
--
-- DELETING THE REPOSITORY DELETES ITS FLOW (`on delete cascade`): a flow has no meaning
-- without the repository it steers.
--
-- Realtime: deliberately NOT published. The app reads the flows when it hydrates the
-- config and again on every config reload; a flow nobody can edit from a client does not
-- need a live stream.

create table if not exists public.repository_workflows (
  repo_id uuid primary key references public.repositories (id) on delete cascade,
  -- `{ id, entry, nodes, links }`. See the header: validated by the app, not here.
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.repository_workflows is
  'The workflow a repository''s magic skills follow: which skill comes after which, '
  'automatically or as a suggestion. No row = the default flow. Readable by whoever can '
  'see the repository; not writable by clients in v1.';

drop trigger if exists set_updated_at on public.repository_workflows;
create trigger set_updated_at
  before update on public.repository_workflows
  for each row execute function public.set_updated_at();

alter table public.repository_workflows enable row level security;

-- SELECT only. See the header: editing is out of scope, so no client writes a flow.
revoke all on public.repository_workflows from authenticated, anon;
grant select on public.repository_workflows to authenticated;

create policy repository_workflows_select on public.repository_workflows
  for select to authenticated
  using (
    exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
    )
  );
