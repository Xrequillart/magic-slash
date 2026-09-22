-- Migration: plan_comments — commenting on a colleague's plan, anchored in the text
--
-- `plan_sessions` (20260821090000) made a planning session readable by the org of its
-- repository, and the desktop app can now open a teammate's spec. What it could not do
-- is SAY ANYTHING BACK: the comment layer over the rendered markdown
-- (renderer/components/file-preview/MarkdownCommentLayer.tsx) has kept its comments in
-- the renderer's own zustand store since it was written — never persisted, never seen by
-- anybody else, and carrying no author at all. This table is the other half.
--
-- ── WHAT ANCHORS A COMMENT ────────────────────────────────────────────────────────────
--
-- THE QUOTE. Not a line number, and not a character offset. The prose react-markdown
-- paints carries no mapping back to the file's lines, so a comment on a rendered spec
-- stores the passage it was left on and `locateQuote` looks for that passage in whatever
-- the document currently renders as (renderer/utils/quoteAnchors.ts). Which is also what
-- makes a comment survive the agent rewriting the spec around it — the anchor is the text,
-- and text moves with itself.
--
-- A quote that can no longer be found makes the comment ORPHANED, which is a state the
-- page DRAWS. It is never a reason to delete a row: losing the sentence a comment was
-- about is not losing the comment, and a note that vanished when somebody else edited the
-- document would be the worst possible behaviour for a review tool.
--
-- ── WHAT THE POLICIES ARE BUILT ON ────────────────────────────────────────────────────
--
-- `plan_tickets`' four policies, with one deliberate widening. Tickets are OWNER-ONLY on
-- write, because visibility is not authorship and a teammate must not forge the tickets
-- your plan claims to have filed. A comment is the opposite object: the whole point is
-- that somebody else writes it. So INSERT is opened to anyone who can SEE the session,
-- pinned to `author_id = auth.uid()` so it can only ever be signed with the writer's own
-- name — while UPDATE and DELETE stay on the author (plus the org's admins, for the
-- moderation case `plan_sessions_delete` already allows).
--
-- The `org_id is not null and` guard inside every session lookup below is LOAD-BEARING and
-- is not defensive noise. `plan_sessions.org_id` is a DERIVED column that is null exactly
-- when the session is on a PERSONAL repository, and a null org must never read as "no
-- tenant, therefore everyone". See the long note on `plan_sessions_select`.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.plan_comments (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: a comment has no meaning without the plan it is about, and a plan
  -- being deleted is the author of that plan removing their own document.
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- on delete cascade: an account being deleted takes what it wrote with it, the same
  -- shape `plan_sessions.owner_id` has.
  author_id uuid not null references auth.users (id) on delete cascade,
  -- ON DELETE SET NULL, and this is the one foreign key here that had a real choice.
  -- See the column comment below: a cascade would make deleting your own comment delete
  -- a colleague's replies, silently.
  parent_id uuid references public.plan_comments (id) on delete set null,
  body text not null,
  anchor jsonb,
  quote text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plan_comments is
  'Comments on a /magic:plan session''s spec, anchored to a quoted passage of the '
  'rendered markdown. Readable by whoever can read the session; writable by anyone who '
  'can read it, under their own name only.';

comment on column public.plan_comments.quote is
  'The passage the comment was left on — THE ANCHOR ITSELF, not context beside one. '
  'Relocated on every render by locateQuote() against the document as it currently '
  'stands, which is what makes a comment survive the spec being rewritten around it. A '
  'quote that can no longer be found makes the comment ORPHANED, which the page draws; it '
  'is never a reason to drop the row. Empty for a comment on the document as a whole.';

comment on column public.plan_comments.anchor is
  'Line numbers, as {"side","startLine","endLine"} — the jsonb mirror of the renderer''s '
  'LineRange. NULL for every comment written today: the rendered prose has no mapping '
  'back to the file''s lines, so the quote above is the whole of the anchor. The column '
  'exists because a diff-anchored plan comment is the obvious next thing to want, and '
  'adding it later would mean migrating a table that already holds rows.';

comment on column public.plan_comments.parent_id is
  'The comment this one replies to, NULL for the head of a thread. ON DELETE SET NULL '
  'AND DELIBERATELY NOT CASCADE: a cascade would mean that deleting your own comment '
  'silently deletes every reply your colleagues wrote under it — somebody else''s writing, '
  'destroyed by an action that never mentioned it. Orphaned replies are promoted to '
  'threads of their own by the renderer (utils/planComments.ts) and stay on screen.';

comment on column public.plan_comments.resolved_at is
  'When the thread was marked as dealt with. NOTHING WRITES IT YET — thread resolution is '
  'out of scope for the story that created this table (#301). The column ships now because '
  'it is one nullable timestamp on an empty table today and a migration over a populated '
  'one later; no policy, index or read depends on it.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Every read is "the comments of ONE plan" — the detail page opening, and the refetch
-- after each write. Without this the policies' own session lookup would be preceded by a
-- sequential scan of every comment in the deployment.
create index if not exists idx_plan_comments_session_id on public.plan_comments (session_id);

-- The threading is resolved in the renderer, not by a recursive query, so this index is
-- not there for a read: it is what keeps the `on delete set null` above from scanning the
-- whole table for children every time a comment is deleted.
create index if not exists idx_plan_comments_parent_id on public.plan_comments (parent_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
-- Unlike plan_tickets, a comment IS edited in place — that is half of AC4 — so the stamp
-- has to move with it. `set_updated_at()` is the schema's own trigger function
-- (20260723090000).
drop trigger if exists set_updated_at on public.plan_comments;
create trigger set_updated_at
  before update on public.plan_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.plan_comments enable row level security;

grant select, insert, update, delete on public.plan_comments to authenticated;
-- anon gets nothing, exactly as on plan_sessions: there is no unauthenticated reader of a
-- planning session, and therefore none of a comment on one.

-- SELECT — visible exactly when its session is.
--
-- Expressed against `plan_sessions` rather than by duplicating the org logic, the way
-- `plan_tickets_select` is: the two can then never drift apart, and the EXISTS stays
-- indexable — one table, hit on its primary key.
create policy plan_comments_select on public.plan_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

-- INSERT — anyone who can read the plan, under their own name, into a thread of this plan.
--
-- THIS IS WHERE THIS TABLE PARTS COMPANY WITH `plan_tickets`, whose insert is owner-only.
-- The reason the ticket policy is narrow is that a ticket row is a CLAIM ABOUT WHAT THE
-- AUTHOR FILED, and a teammate forging one would put words in the plan's mouth. A comment
-- is the reverse: it is signed, it is addressed to the author, and a plan nobody but its
-- writer may annotate is not a plan anybody can review.
--
-- Three conditions, and none of them is redundant:
--
--  * `author_id = auth.uid()` — a comment can only be signed with the writer's own name.
--    Without it, a member of the org could post under a colleague's identity, and the
--    avatar and address the page draws beside it would corroborate the forgery.
--  * the session is VISIBLE — the same clause as the select above, so nobody can comment
--    into a plan they cannot read. Notably this leaves a session on a PERSONAL repository
--    commentable by its owner alone, which is what a null org_id means everywhere else.
--  * the parent, WHEN THERE IS ONE, belongs to THIS session. The sub-select would
--    otherwise be satisfied by any comment id in the deployment, and a reply hung off a
--    comment of another organization's plan would be a row whose thread crosses a tenant
--    boundary — readable through whichever of the two sessions the reader can see. It is
--    written against `plan_comments` directly rather than through the select policy,
--    because a WITH CHECK sub-select is evaluated with the caller's own RLS applied: a
--    parent the caller cannot see fails the test, which is the intended answer as well.
create policy plan_comments_insert on public.plan_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
    and (parent_id is null or exists (
      select 1 from public.plan_comments p
      where p.id = parent_id and p.session_id = plan_comments.session_id
    ))
  );

-- UPDATE — the author, or an admin of the organization the plan belongs to.
--
-- THE AUTHOR AND NOT THE PLAN'S OWNER: my comment on your plan is my writing, and the
-- fact that it sits on your document does not make it yours to rewrite. That is AC4, and
-- it is enforced HERE rather than by the interface — the renderer hides the Edit button,
-- which stops an accident and nothing else.
--
-- The admin arm mirrors `plan_sessions_delete`: a comment on a team plan is part of that
-- team's record, and an admin must be able to deal with one (offboarding, something that
-- should never have been written) without the author's help. `org_id is not null and`
-- again, for the reason at the top of this file.
--
-- USING AND WITH CHECK BOTH, and THEY ARE NOT THE SAME EXPRESSION. The USING clause asks
-- WHOSE ROWS may be touched — the author's, or an org admin's members' — and that is all
-- it can ask, because it only ever sees the row as it stands today. The WITH CHECK asks
-- what the row is ALLOWED TO BECOME, and an update rewrites `session_id` and `parent_id`
-- as readily as it rewrites `body`. So it repeats all three of the insert's guards:
--
--  * the author-or-admin disjunction, PARENTHESISED AS A WHOLE before the `and`s below.
--    It is what stops an author from re-signing their own comment: flip `author_id` to a
--    colleague and neither arm holds for the resulting row, so the update is refused. An
--    admin CAN still change it — the admin arm does not test authorship — and that is the
--    moderation power being granted, not an oversight: an admin who can delete the row
--    outright is not meaningfully restrained by being unable to edit its byline.
--  * the session is VISIBLE TO THE WRITER, as on insert. Without it an author could set
--    `session_id` to a plan they cannot read and post into it by the back door, which is
--    precisely the move the insert policy exists to refuse — an UPDATE that lands a row in
--    a session is an insert into that session by any other name.
--  * the parent, when set, belongs to THIS session. Without it an author could reparent
--    their comment onto a comment of another organization's plan, and the thread would
--    straddle a tenant boundary just as surely as if it had been written there.
--
-- The two added guards make the WITH CHECK stricter than the USING clause, which is the
-- right way round: an admin moderating a comment on their own org's plan satisfies the
-- visibility guard by being a member of that org, so nothing they could do before is lost.
create policy plan_comments_update on public.plan_comments
  for update to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and s.org_id is not null and public.is_org_admin(s.org_id)
    )
  )
  with check (
    (
      author_id = auth.uid()
      or exists (
        select 1 from public.plan_sessions s
        where s.id = session_id
          and s.org_id is not null and public.is_org_admin(s.org_id)
      )
    )
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
    and (parent_id is null or exists (
      select 1 from public.plan_comments p
      where p.id = parent_id and p.session_id = plan_comments.session_id
    ))
  );

-- DELETE — the same two, for the same two reasons.
create policy plan_comments_delete on public.plan_comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and s.org_id is not null and public.is_org_admin(s.org_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: deliberately NOT published
-- ---------------------------------------------------------------------------
-- Same decision as `plan_sessions` itself, and for a sharper reason here. A live comment
-- stream onto an open plan is a real feature and it is a DIFFERENT one (issue #298): it
-- needs a subscription lifecycle, a reconciliation against the local optimistic state, and
-- an answer to what happens to the card a reader is typing in when the passage under it
-- moves. This story refetches after its own writes and on opening the page, which is the
-- whole of what it promises. Adding the publication when #298 lands is a one-line
-- migration.
