-- Migration: plan_sessions — any member of the organization may edit a plan's text
--
-- 20260821090000 made a planning session OWNER-WRITABLE ONLY: "a teammate reading your
-- spec must not be able to overwrite it". That was the right default for a table whose
-- only writer was the author's own desktop app, mirroring a file on the author's disk.
-- It stops being right the moment a plan is something a team works on together: the
-- reviewer who spots a wrong assumption in a colleague's spec has, today, no way to fix
-- it other than asking the author to — which is a comment (20260922100000), not an edit.
--
-- So the UPDATE policy widens to the plan's READERS within its organization: anyone who
-- can see a session on a team repository may now rewrite its text. The rest of the model
-- is unchanged, and that is the part of this migration worth reading slowly:
--
--   * STILL NOTHING FOR A PERSONAL SESSION. `org_id` is null on a session whose
--     repository is personal (or gone), and a null org is owner-only — for writes exactly
--     as for reads. The `org_id is not null and` guard is spelled out for the reason the
--     select policy gives.
--   * CONTENT ONLY. A member may change `spec`, `title` and `idea` — the text of the plan —
--     and nothing about WHAT the row is: not whose it is (`owner_id`), not which
--     repository and therefore which organization it belongs to (`repo_id`), not the
--     identity the author's app upserts on (`spec_key`), not the author's sync bookkeeping
--     (`spec_synced_at`, `spec_oversize`), not the agent or the status. A policy cannot say
--     that — RLS is row-level, it has no column list — so a trigger does, below.
--   * NO INSERT, NO DELETE for members. Creating a session is the author's app announcing
--     a spec path; deleting one stays with the author and the org's admins.
--
-- CONCURRENCY IS THE CLIENT'S, deliberately. Two people editing one plan is last write
-- wins, with the desktop app sending the `updated_at` it read back as a filter
-- (`.eq('updated_at', …)`): a row changed in between matches nothing and the editor is
-- told, instead of overwriting. That needs no schema — `set_updated_at` already bumps the
-- column on every write — so nothing here implements it; it is mentioned because it is the
-- reason `updated_at` is on the list of columns a member's write may carry.

-- ---------------------------------------------------------------------------
-- The UPDATE policy: owner, or a member of the session's organization
-- ---------------------------------------------------------------------------
-- Dropped and recreated rather than altered: `alter policy` can replace both clauses, but
-- a drop/create reads as the whole policy in one place, which is what a reader of the
-- next migration will be looking for.
drop policy if exists plan_sessions_update on public.plan_sessions;

-- USING: which rows the write may target. The select policy's own visibility test —
-- editing is exactly as wide as reading within an org, and never wider. The
-- `org_id is not null and` guard is load-bearing here for the reason it is on select:
-- `org_id` is DERIVED and is null precisely for a personal repository, and a policy
-- "simplified" into `is_org_member(org_id)` alone is one refactor away from reading a
-- null org as "no tenant, therefore everyone".
--
-- WITH CHECK: what the row may look like afterwards. The same visibility test, so a write
-- cannot land a row somewhere its writer could no longer see it — plus the repository
-- clause of 20260821090000, copied verbatim and NOT to be simplified away. THE REASON IS
-- THE DERIVATION: org_id comes from repo_id, so an unguarded repo_id is an unguarded
-- org_id. Without it, an owner could insert a session with a null repo_id and then PATCH
-- repo_id to a foreign team's repository, having the trigger stamp that organization onto
-- the row. (A member cannot touch repo_id at all — the guard trigger below refuses it —
-- but the policy does not lean on the trigger for that: each holds on its own.)
create policy plan_sessions_update on public.plan_sessions
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_member(org_id))
  )
  with check (
    (owner_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)))
    and (repo_id is null or exists (
      select 1 from public.repositories r
      where r.id = repo_id
        and (r.owner_id = auth.uid() or (r.org_id is not null and public.is_org_member(r.org_id)))
    ))
  );

comment on policy plan_sessions_update on public.plan_sessions is
  'The author, or any member of the session''s organization (never on a personal '
  'session: a null org_id is owner-only). What a MEMBER may change is narrowed to the '
  'content columns by the guard_member_edit trigger. repo_id must stay a repository the '
  'writer can see, because org_id is derived from it.';

comment on table public.plan_sessions is
  'One /magic:plan session: the idea, the spec markdown, and the tickets it '
  'produced (plan_tickets). Readable by the org of its repository. Written by the '
  'desktop app, never by the skill: the author''s app writes the whole row, and any '
  'member of the org may edit its content columns (spec, title, idea) from the app.';

-- ---------------------------------------------------------------------------
-- The column guard: a member edits the text, never the row's identity
-- ---------------------------------------------------------------------------
-- WHY A TRIGGER. RLS decides which ROWS a statement may touch, never which columns, and a
-- column-level GRANT would bind the author too (grants are per role, and the author and
-- their colleague are both `authenticated`). What is needed is "a member may change these
-- three columns of somebody else's row, and the author may change anything of their own",
-- which only a row-level test with both OLD and NEW in hand can say.
--
-- AN ALLOW-LIST, compared as a whole. The row minus the columns a member may write must be
-- identical before and after. A deny-list (`if new.owner_id <> old.owner_id …`) would be
-- silently widened by the next column anybody adds to the table; this one is narrowed by
-- it, which is the safe direction to fail in. The list also carries the three columns that
-- OTHER triggers own, so a member's write is not refused for something the member did not
-- do:
--
--   * `org_id`     — rewritten by `derive_org`, which fires BEFORE this one;
--   * `number`     — kept or re-minted by `set_plan_number`, which fires AFTER;
--   * `updated_at` — stamped by `set_updated_at`, which fires AFTER, and which the client
--                    may harmlessly send.
--
-- Postgres fires same-timing row triggers in ALPHABETICAL order — derive_org <
-- guard_member_edit < set_plan_number < set_updated_at — which is the order above. None of
-- the three can be steered by a member anyway: org_id follows repo_id (guarded here), and
-- the other two are overwritten after this has run.
--
-- `current_user = 'authenticated'` FIRST, and it is what keeps the system's own writes
-- working. Two paths update OTHER users' sessions without being a member's edit:
--
--   * `repositories_derive_plan_session_orgs` (20260821090000) re-derives org_id on every
--     session of a repository whose org changed. It is SECURITY DEFINER, so inside it
--     `current_user` is the function's owner, not `authenticated` — even though
--     `auth.uid()` still names whoever moved the repository.
--   * the referential actions `on delete set null` on repo_id and agent_id. Postgres runs
--     them as the owner of the referencing table, and they change a column a member may
--     not — so without this test, deleting a repository would fail for every session on it
--     written by someone other than the deleter.
--
-- Neither passes through here as `authenticated`, so neither is judged. Testing
-- `auth.uid()` alone could not tell them apart from a member's PATCH.
--
-- SECURITY INVOKER (the default), stated out loud: the point is to read `current_user` as
-- the caller's role. A definer function would always see its owner and pass everything.
create or replace function public.plan_sessions_guard_member_edit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  -- What a member may write, plus what other triggers own. See above.
  content_columns constant text[] := array['spec', 'title', 'idea', 'updated_at', 'org_id', 'number'];
begin
  if current_user = 'authenticated' and old.owner_id is distinct from auth.uid() then
    if (to_jsonb(new) - content_columns) is distinct from (to_jsonb(old) - content_columns) then
      -- 42501, insufficient_privilege: the same code an RLS refusal raises, so a client
      -- that already treats that as "not allowed" needs no second branch for this one.
      raise exception 'only the author of a plan session may change anything but its spec, title and idea'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.plan_sessions_guard_member_edit() is
  'Refuse a write by an org member (not the author) that changes anything on a plan '
  'session other than spec, title and idea. System paths (SECURITY DEFINER derivations, '
  'referential actions) do not run as authenticated and are not judged. Trigger-only.';

revoke execute on function public.plan_sessions_guard_member_edit() from public;

-- No column list, for `derive_org`'s reason: `before update of spec, title` would let a
-- PATCH that touches owner_id alone skip the guard entirely.
drop trigger if exists guard_member_edit on public.plan_sessions;
create trigger guard_member_edit
  before update on public.plan_sessions
  for each row execute function public.plan_sessions_guard_member_edit();
