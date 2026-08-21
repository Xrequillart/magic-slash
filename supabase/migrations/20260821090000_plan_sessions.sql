-- Migration: plan_sessions / plan_tickets — /magic:plan sessions in the cloud
--
-- A /magic:plan run currently leaves two artefacts on ONE machine: a spec file
-- under `.magic/` and, at the end, a handful of tickets in the tracker. Neither
-- is readable from the webapp, and neither survives the laptop. These two tables
-- make a planning session a first-class cloud object:
--
--   * plan_sessions — one row per spec file, holding the idea, the spec markdown
--     and the session's status;
--   * plan_tickets  — the epic and stories that session produced, so a reader
--     can go from "here is the reasoning" to "here are the tickets" without
--     leaving the page.
--
-- This is the first time FILE CONTENT leaves the user's machine, so the model is
-- deliberately conservative:
--
--   * a session is owner-writable ONLY. Org members read, they never write.
--   * `org_id` is DERIVED from the session's repository, exactly as an agent's
--     org is derived from its repositories (20260727160000). A session on a
--     PERSONAL repo (repositories.org_id null) has a null org_id, and a null
--     org_id means owner-only — never "no org, therefore public".
--   * anon gets no grant at all.
--
-- Shape note vs 20260727160000: `agents` needed an AFTER trigger plus a helper
-- function because its source rows live in another table (agent_repositories).
-- Here `repo_id` is a column of the very row being written, so a BEFORE trigger
-- assigning `new.org_id` is both correct and cheaper — no second UPDATE.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.plan_sessions (
  id uuid primary key default gen_random_uuid(),
  -- The planner. on delete cascade: a planning session is personal work product,
  -- it has no meaning without its author (unlike a team repository, which the
  -- rest of the org keeps using).
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- The repository the session is about. on delete set null so deleting a repo
  -- does not destroy the reasoning that went into it; the session simply falls
  -- back to owner-only visibility (the derivation below re-runs).
  repo_id uuid references public.repositories (id) on delete set null,
  -- DERIVED from repo_id — see the triggers below. Never written by the client.
  org_id uuid references public.organizations (id) on delete set null,
  -- The agent that ran the planning session, when it is still around.
  -- on delete set null: archiving an agent must not take its session with it.
  agent_id uuid references public.agents (id) on delete set null,
  slug text not null,
  spec_key text not null,
  title text,
  idea text,
  spec text,
  status text not null default 'planning',
  spec_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_tickets (
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- The tracker's own key ('PER-5030', '456'). Natural key within the session,
  -- so a re-run of the same session upserts instead of duplicating.
  key text not null,
  url text not null,
  title text,
  kind text not null,
  -- The epic this story hangs off, by `key`. Not a foreign key: the epic row and
  -- its stories arrive in one payload and the tracker's own keys are the only
  -- identity either side has.
  parent_key text,
  created_at timestamptz not null default now(),
  primary key (session_id, key)
);

comment on table public.plan_sessions is
  'One /magic:plan session: the idea, the spec markdown, and the tickets it '
  'produced (plan_tickets). Owner-writable, readable by the org of its '
  'repository. Written by the desktop app, never by the skill.';

comment on table public.plan_tickets is
  'The epic and stories one planning session filed. Keyed by the tracker''s own '
  'key within the session.';

comment on column public.plan_sessions.spec_key is
  'sha256 of the agent''s absolute specPath — the stable identity an upsert '
  'arbitrates on. A HASH, not the raw path, because this row is readable by the '
  'whole org and the path carries the user''s home directory (and therefore, '
  'usually, their name).';

comment on column public.plan_sessions.slug is
  'Display only: the spec file''s basename minus the ''spec-'' prefix and the '
  '''.md'' suffix. Never an identity — two repos can hold the same slug.';

comment on column public.plan_sessions.org_id is
  'DERIVED from repo_id (the organization of the session''s repository) — never '
  'set by the client. Null when the session is on a personal repository, on no '
  'repository, or on one that was deleted; null means OWNER-ONLY.';

comment on column public.plan_sessions.spec_synced_at is
  'When the sync path last wrote `spec`. The reconcile comparator, and '
  'deliberately NOT `updated_at`: the org-derivation trigger below bumps '
  'updated_at whenever a repository is shared, moved between orgs or deleted, '
  'which would push updated_at past the local file''s mtime and make reconcile '
  'skip a spec that really is newer.';

comment on column public.plan_sessions.status is
  'The agent''s status at the time of the last write (''planning'', ''done'', …). '
  'A free-text mirror of agent.metadata.status, not an enum: the app owns the '
  'vocabulary and a check constraint would need a migration per new value.';

comment on column public.plan_tickets.parent_key is
  'The `key` of the epic this story belongs to, or null for the epic itself.';

-- ---------------------------------------------------------------------------
-- Uniqueness
-- ---------------------------------------------------------------------------
-- Per OWNER, not per organization: a session belongs to its author, and its org
-- is derived from its repository — it can be null and it can change under the
-- session's feet, so it is not part of who the session is.
--
-- TOTAL, never partial, for the same reason as uq_agents_owner_app_agent_id
-- (20260814090000): PostgREST infers the arbiter of
-- `on_conflict=owner_id,spec_key` from the column list ALONE and cannot carry a
-- `where`, so a partial index would simply not be found and every upsert would
-- turn into a duplicate insert. Both columns are `not null` here, so there is no
-- row outside the invariant to exclude anyway.
create unique index if not exists uq_plan_sessions_owner_spec_key
  on public.plan_sessions (owner_id, spec_key);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- The list view filters by repository ("show me the plans for this repo"), which
-- the unique index above cannot serve.
create index if not exists idx_plan_sessions_repo_id on public.plan_sessions (repo_id);
create index if not exists idx_plan_sessions_org_id on public.plan_sessions (org_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.plan_sessions;
create trigger set_updated_at
  before update on public.plan_sessions
  for each row execute function public.set_updated_at();

-- plan_tickets has no updated_at: a ticket row is inserted or replaced, never
-- edited in place.

-- ---------------------------------------------------------------------------
-- The derivation: org_id follows the session's repository
-- ---------------------------------------------------------------------------
-- A session's organization is its repository's organization. Null repo_id, or a
-- personal repo, yields null — which the policies below read as owner-only.
--
-- SECURITY DEFINER: `repositories` is readable by the caller in the normal write
-- path, but this same function also runs from the repositories trigger below,
-- under whoever moved the repo — who may not own the sessions being re-derived.
-- Reachable only as a trigger.
create or replace function public.plan_sessions_derive_org()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.org_id := (
    select r.org_id from public.repositories r where r.id = new.repo_id
  );
  return new;
end;
$$;

comment on function public.plan_sessions_derive_org() is
  'Set plan_sessions.org_id from the session''s repository. Trigger-only.';

revoke execute on function public.plan_sessions_derive_org() from public;

-- No column list on purpose. `before update of repo_id` would let a client PATCH
-- `org_id` alone — the trigger would not fire and the row would keep a value the
-- client chose, so the "never written by the client" invariant would hold only
-- for clients that happen to touch repo_id at the same time. Firing on every
-- write costs one indexed lookup and makes the invariant unconditional.
drop trigger if exists derive_org on public.plan_sessions;
create trigger derive_org
  before insert or update on public.plan_sessions
  for each row execute function public.plan_sessions_derive_org();

-- Sharing a repository with an org (or moving it between orgs, or an org being
-- deleted and the repo reverting to personal) re-derives every session on it.
--
-- SECURITY DEFINER for the same reason as repositories_derive_agent_orgs
-- (20260727160000): the rows being updated belong to OTHER users — an admin
-- sharing a repo has no RLS write access to a teammate's sessions.
--
-- Note what this UPDATE deliberately does NOT touch: `spec_synced_at`. It does
-- bump `updated_at` (via the set_updated_at trigger above), which is exactly why
-- spec_synced_at exists as a separate column — reconcile compares the local
-- file's mtime against it, and a re-derivation must not look like a fresh sync.
create or replace function public.repositories_derive_plan_session_orgs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.plan_sessions
     set org_id = new.org_id
   where repo_id = new.id
     -- No-op write guard: skip rows already carrying the right org so they do
     -- not get their updated_at bumped for nothing.
     and org_id is distinct from new.org_id;
  return null;
end;
$$;

comment on function public.repositories_derive_plan_session_orgs() is
  'Re-derive plan_sessions.org_id for every session on a repository whose '
  'organization changed. Trigger-only.';

revoke execute on function public.repositories_derive_plan_session_orgs() from public;

drop trigger if exists derive_plan_session_orgs on public.repositories;
create trigger derive_plan_session_orgs
  after update of org_id on public.repositories
  for each row when (old.org_id is distinct from new.org_id)
  execute function public.repositories_derive_plan_session_orgs();

-- Deleting the repository needs no trigger: repo_id is ON DELETE SET NULL, and
-- that referential UPDATE fires the BEFORE trigger above, which re-derives
-- org_id to null. Visibility narrows to the owner; it never widens.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.plan_sessions enable row level security;
alter table public.plan_tickets enable row level security;

grant select, insert, update, delete on public.plan_sessions to authenticated;
grant select, insert, update, delete on public.plan_tickets to authenticated;
-- anon gets nothing: there is no unauthenticated reader of a planning session.

-- plan_sessions ------------------------------------------------------------
-- Readable by its author, and by the org of its repository.
--
-- `org_id is not null and` is load-bearing, not defensive noise: is_org_member
-- (20260723090100) is an EXISTS over memberships, so is_org_member(null) is
-- FALSE and the guard looks redundant — until you remember `org_id` here is a
-- DERIVED column that is null precisely for a PERSONAL repo. Writing the guard
-- explicitly is what stops the next reader of this policy from "simplifying" it
-- into a form where a null org reads as "no tenant, therefore everyone".
create policy plan_sessions_select on public.plan_sessions
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_member(org_id))
  );

-- Only ever your own sessions. No org clause on the write verbs at all: a
-- planning session is authored work, not a shared document — a teammate reading
-- your spec must not be able to overwrite it. `org_id` is absent from both
-- checks because the trigger owns it; whatever the client sends is discarded
-- before the row is stored.
--
-- `repo_id` must nonetheless point at a repository you can already see (your own,
-- or one shared with an org you belong to) — do not simplify this clause away.
-- THE REASON IS THE DERIVATION: org_id comes from repo_id, so an unguarded
-- repo_id is an unguarded org_id. Without it, anyone holding the uuid of a team
-- repository could insert a session against it, have the trigger stamp that
-- organization onto the row, and land their document in the plans list of an org
-- they are not a member of. Same guard, same reason, as repositories_insert
-- (20260724110000) and agent_repositories_insert (20260727150000).
--
-- Null repo_id is allowed: a session is created the moment the desktop app hears
-- about a spec path, which can be before any repository is resolved. A null
-- repo_id derives a null org_id, which is owner-only.
create policy plan_sessions_insert on public.plan_sessions
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (repo_id is null or exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
    ))
  );

-- The same clause on UPDATE, and not for symmetry's sake: without it the hole
-- above reopens one PATCH later — insert with a null repo_id, which passes, then
-- update repo_id to the foreign team repository.
create policy plan_sessions_update on public.plan_sessions
  for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (repo_id is null or exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
    ))
  );

-- Delete additionally allows an org admin: a session on a team repo is part of
-- that team's record, and an admin must be able to remove it (offboarding, a
-- spec that should never have been uploaded) without the author's help.
create policy plan_sessions_delete on public.plan_sessions
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_admin(org_id))
  );

-- plan_tickets -------------------------------------------------------------
-- Visible exactly when its session is. Expressed against plan_sessions rather
-- than duplicating the org logic, so the two can never drift apart.
--
-- This EXISTS stays indexable, unlike the three-table EXISTS rejected in
-- 20260727160000 (lines 18-22): one table, hit on its indexed primary key, and
-- the handful of rows of a session are always fetched by session_id in the first
-- place.
create policy plan_tickets_select on public.plan_tickets
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

-- Writes are OWNER-ONLY, and that is a narrower test than the select above on
-- purpose: reusing the visibility condition would let any member of the org read
-- a teammate's session id and then insert, edit or delete ticket rows on it —
-- forging the tickets a colleague's plan claims to have produced. Visibility is
-- not authorship.
create policy plan_tickets_insert on public.plan_tickets
  for insert to authenticated
  with check (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id and s.owner_id = auth.uid()
    )
  );

create policy plan_tickets_update on public.plan_tickets
  for update to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id and s.owner_id = auth.uid()
    )
  );

create policy plan_tickets_delete on public.plan_tickets
  for delete to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: deliberately NOT published
-- ---------------------------------------------------------------------------
-- Unlike agents or repositories, nothing watches a planning session live. The
-- webapp reads the list and the detail page on navigation, and the desktop app
-- is the only writer — it already knows what it wrote. Publishing these tables
-- would stream whole spec documents to every member of the org on every debounced
-- save, for a page nobody is looking at. If a live plans view is ever wanted,
-- adding the publication is a one-line migration.
