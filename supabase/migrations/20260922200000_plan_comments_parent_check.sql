-- plan_comments: take the self-reference out of the policies that guard its writes.
--
-- ── WHAT WAS WRONG ──────────────────────────────────────────────────────────────────
--
-- `plan_comments_insert` and `plan_comments_update` (20260922100000) each ended in a
-- clause that sub-selected from the very table they protect:
--
--   and (parent_id is null or exists (
--     select 1 from public.plan_comments p
--     where p.id = parent_id and p.session_id = plan_comments.session_id
--   ))
--
-- Postgres refuses that outright: evaluating a policy on `plan_comments` requires querying
-- `plan_comments`, which requires evaluating its policies, and the planner reports
--
--   42P17: infinite recursion detected in policy for relation "plan_comments"
--
-- AT PLAN TIME, which is the part that made this total rather than occasional. `parent_id
-- is null or …` looks like it short-circuits for a thread head, and it does not: the plan
-- is built before any row is evaluated, so EVERY insert failed, head comments included.
-- Nobody could leave a comment on a plan at all.
--
-- It reached the app as `false` from `createPlanComment` and, on screen, as "This comment
-- could not be saved" with nothing to say why — the Postgres error was discarded by a
-- `return !error`. It is logged now (desktop/src/main/cloud/planComments.ts), which is how
-- this was finally read.
--
-- `supabase/tests/plan_comments.test.sql` catches it from its second assertion onwards. It
-- shipped with the table and had never been run against it.
--
-- ── WHAT THIS DOES INSTEAD ──────────────────────────────────────────────────────────
--
-- The same question, asked through a `security definer` function, which is how every other
-- policy in this schema reaches a table it must not recurse into (`is_org_member`,
-- `is_org_admin`). The function runs as its owner, so the read of the parent row applies no
-- policy and there is nothing to recurse through.
--
-- ── AND WHY THAT IS NOT A HOLE ──────────────────────────────────────────────────────
--
-- The clause it replaces was doing two things, and only one of them was deliberate.
--
-- DELIBERATE: a reply must land in the SAME session as its parent, so a thread cannot
-- straddle two plans — and therefore two organizations. That is preserved exactly: the
-- parent's `session_id` is compared to the new row's, a parent that does not exist answers
-- null and fails the comparison, and a parent in another plan fails it too.
--
-- INCIDENTAL: the old sub-select also ran under the caller's own RLS, so a parent the
-- caller could not SEE failed the test. Nothing is lost by dropping that, because the
-- clause above it already requires the new row's session to be visible to the writer, and
-- `plan_comments_select` makes a comment visible exactly when its session is. A parent that
-- passes the comparison is therefore in a session the writer can read, which makes it a
-- comment the writer can read. The two guards together say what the three used to.
--
-- The function is not a general-purpose reader: it answers ONE uuid with ONE uuid, for a
-- comment id the caller must already hold, and says nothing about who wrote it or what it
-- says.

create or replace function public.plan_comment_session(comment_id uuid)
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select session_id from public.plan_comments where id = comment_id;
$$;

comment on function public.plan_comment_session(uuid) is
  'The plan a comment belongs to, read WITHOUT row level security so that '
  'plan_comments'' own write policies can ask about a parent comment. A policy on a table '
  'that sub-selects from that table is rejected as recursive (42P17), which is what this '
  'exists to avoid. Safe to run as definer: the policies that call it have already '
  'required the session of the row being written to be visible to the writer, and a '
  'comment is visible exactly when its session is.';

revoke execute on function public.plan_comment_session(uuid) from public;
grant execute on function public.plan_comment_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The two policies, re-stated
-- ---------------------------------------------------------------------------
-- Recreated whole rather than patched, because a policy cannot be altered clause by
-- clause. Everything but the parent test is character for character what 20260922100000
-- wrote, and the reasoning for each of the other clauses lives there.

drop policy if exists plan_comments_insert on public.plan_comments;
create policy plan_comments_insert on public.plan_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
    and (parent_id is null or public.plan_comment_session(parent_id) = session_id)
  );

drop policy if exists plan_comments_update on public.plan_comments;
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
    and (parent_id is null or public.plan_comment_session(parent_id) = session_id)
  );
