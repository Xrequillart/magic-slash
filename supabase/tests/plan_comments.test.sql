-- pgTAP: prove who may write on somebody else's plan, and who may not.
--
-- Covers 20260922100000_plan_comments.sql. The table deliberately parts company with
-- `plan_tickets`, whose writes are owner-only: a comment that only the plan's author could
-- leave would make the feature pointless, so INSERT is open to anyone who can READ the
-- session. Everything below is about the line that opening draws.
--
-- The assertion that matters most is #14, the same hole `plan_sessions.test.sql` pins at
-- its #6 reached one table further on: a comment on a session whose repository is PERSONAL
-- must stay invisible to the author's own teammates. `plan_sessions.org_id` is null there,
-- and a policy that read a null org as "no tenant, therefore everyone" would pass every
-- other test in this file.
--
-- The second thing being pinned is quieter: a USING clause that filters is NOT an error.
-- A colleague's UPDATE on somebody else's comment does not throw — it matches no row and
-- reports success — so the assertions for those read the row back instead of expecting a
-- rejection. Testing them with `throws_ok` would pass against a table with NO update
-- policy at all.
--
-- Harness (same as plan_sessions.test.sql): pgTAP runs as the DB OWNER, which BYPASSES
-- RLS. To exercise the policies we impersonate an authenticated user:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- auth.uid() reads "sub". `reset role;` returns to the owner to seed/read.

begin;
select plan(19);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed).
--
--   u1 — plain member of Org A. Owns both plans, and writes the comment everybody else
--        below tries to get at. Deliberately NOT an admin, so the admin assertions
--        cannot pass by accident of the author also being one.
--   u2 — plain member of Org A. The colleague: sees u1's team plan, and must be able to
--        comment on it and to do nothing else to u1's writing.
--   u3 — ADMIN of Org A. The moderator.
--   u4 — member of Org B and nothing else. The stranger.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '44444444-4444-4444-4444-444444444444');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'admin');

-- One repo shared with Org A, one strictly personal. Both owned by u1.
insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null,                                   'perso');

-- The two plans. `org_id` is not sent: the derivation trigger on plan_sessions supplies
-- it, which is the very thing that makes the personal one null.
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title)
values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'team-feature',  'team-key',  'Team feature'),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000002', 'perso-feature', 'perso-key', 'Personal feature');

-- u1's own comment on their team plan, and one on their personal plan. Seeded past-dated
-- so the updated_at assertion can tell a real bump from the insert's own value (now() is
-- frozen for the whole transaction).
insert into public.plan_comments (id, session_id, author_id, body, quote, created_at, updated_at)
values
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'mine', 'the passage', '2026-09-20 10:00:00+00', '2026-09-20 10:00:00+00'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'private note', 'a private passage', '2026-09-20 10:00:00+00', '2026-09-20 10:00:00+00');

-- ---------------------------------------------------------------------------
-- The colleague. Sees the team plan; may comment on it; may not touch u1's comment.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 1. Visibility follows the session, exactly as plan_tickets' does.
select is(
  (select count(*) from public.plan_comments where session_id = 'e0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a member of the org sees the comments on a colleague''s team plan'
);

-- 2. *** THE POINT OF THE TABLE. *** Reading is not writing on plan_tickets, and here it
--    deliberately is: a plan nobody but its author may annotate is not reviewable.
select lives_ok(
  $sql$ insert into public.plan_comments (id, session_id, author_id, body, quote) values ('c0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'from a colleague', 'the passage') $sql$,
  'a member of the org can comment on a colleague''s plan'
);

-- 3. …under their own name and no other. Without this, the address and photo the page
--    draws beside a comment would corroborate a forgery.
select throws_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, body, quote) values ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'signed as someone else', 'the passage') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'a member cannot sign a comment with a colleague''s name'
);

-- 4. A reply into the same thread is an ordinary insert.
select lives_ok(
  $sql$ insert into public.plan_comments (id, session_id, author_id, parent_id, body, quote) values ('c0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000001', 'replying', '') $sql$,
  'a member can reply in the thread of a colleague''s comment'
);

-- 5. A reply whose parent belongs to ANOTHER session is refused. Without the guard the
--    sub-select would be satisfied by any comment id in the deployment, and a thread would
--    straddle two plans — readable through whichever of them the reader can see.
select throws_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, parent_id, body, quote) values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000002', 'cross-thread', '') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'a reply cannot hang off a comment of a different session'
);

-- 6. AC4, the edit half. A filtered UPDATE does NOT throw — it matches no row and reports
--    success — so the row itself is the assertion.
update public.plan_comments set body = 'rewritten by a colleague'
 where id = 'c0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select body from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001'),
  'mine',
  'a member cannot rewrite a colleague''s comment — the policy refuses it, not the interface'
);

-- 7. AC4, the delete half. Same shape, same reason.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
delete from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select count(*) from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a member cannot delete a colleague''s comment'
);

-- ---------------------------------------------------------------------------
-- The author. Owns their writing, and cannot hand it to somebody else.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

update public.plan_comments set body = 'edited by its author'
 where id = 'c0000000-0000-0000-0000-000000000001';
reset role;

-- 8. The other half of AC4: your own comment is yours to rewrite.
select is(
  (select body from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001'),
  'edited by its author',
  'an author can rewrite their own comment'
);

-- 9. …and the edit moved updated_at, which is why the trigger is on this table and not on
--    plan_tickets: a ticket row is replaced, a comment is edited in place.
select ok(
  (select updated_at > '2026-09-20 10:00:00+00'::timestamptz
     from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001'),
  'editing a comment bumps updated_at'
);

-- 10. The WITH CHECK, from the one angle the USING clause cannot cover: an author may not
--     re-sign their comment as somebody else. The row after the write has to pass too.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ update public.plan_comments set author_id = '22222222-2222-2222-2222-222222222222' where id = 'c0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'an author cannot re-sign their comment with a colleague''s name'
);

-- ---------------------------------------------------------------------------
-- The admin. Moderation, which is the one widening past authorship.
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

update public.plan_comments set body = 'moderated'
 where id = 'c0000000-0000-0000-0000-000000000001';
reset role;

-- 11. An admin of the plan's organization can edit a member's comment.
select is(
  (select body from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001'),
  'moderated',
  'an admin of the plan''s org can edit a member''s comment'
);

-- 12. …and can delete one. The comment removed here is the COLLEAGUE'S, so the row the
--     rest of the file is about survives for the assertions below.
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
delete from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000010';
reset role;
select is(
  (select count(*) from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000010'),
  0::bigint,
  'an admin of the plan''s org can delete a member''s comment'
);

-- ---------------------------------------------------------------------------
-- The stranger. A member of another organization entirely.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';

-- 13. Nothing of this plan is readable, comments included.
select is(
  (select count(*) from public.plan_comments where session_id = 'e0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a non-member sees none of a plan''s comments'
);

-- 14. …and cannot write one either. The insert policy tests VISIBILITY, so an id leaked
--     from anywhere is not a way in.
select throws_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, body, quote) values ('e0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'from nowhere', '') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'a non-member cannot comment on a plan they cannot see'
);

-- ---------------------------------------------------------------------------
-- *** THE TEST. *** A PERSONAL repository's plan, from a teammate's seat.
-- ---------------------------------------------------------------------------
-- `plan_sessions.org_id` is null here, because the repository is personal, and null means
-- OWNER-ONLY — never "no org, therefore everyone". A policy that got this wrong would pass
-- assertions 1 through 14 and leak a private note to the whole organization.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 15. Invisible.
select is(
  (select count(*) from public.plan_comments where session_id = 'e0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a comment on a plan whose repository is PERSONAL is invisible to the author''s teammates'
);

-- 16. And unwritable, which is the same guard read from the write side.
select throws_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, body, quote) values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'peeking', '') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'a teammate cannot comment on a plan whose repository is personal'
);

-- ---------------------------------------------------------------------------
-- The reply that must not disappear with its parent — AC5, at the schema level.
-- ---------------------------------------------------------------------------
reset role;
delete from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000001';

-- 17. `on delete set null`, not cascade: deleting your own comment must not silently
--     destroy the replies your colleagues wrote under it. The renderer promotes the
--     orphaned reply to a thread of its own.
select results_eq(
  $sql$ select count(*)::bigint, bool_and(parent_id is null) from public.plan_comments where id = 'c0000000-0000-0000-0000-000000000011' $sql$,
  $sql$ values (1::bigint, true) $sql$,
  'deleting a comment keeps its replies and clears their parent, rather than cascading'
);

-- ---------------------------------------------------------------------------
-- The author again, on the half of the WITH CHECK the USING clause cannot express.
-- ---------------------------------------------------------------------------
-- #10 pins the row's BYLINE; these two pin its ADDRESS. The USING clause decides whose
-- rows may be touched and is blind to where the update leaves them, so unless the insert's
-- other two guards are repeated in the WITH CHECK an author may walk their own comment
-- into a plan they cannot read, or hang it under a thread of another tenant's — the exact
-- two things #14 and #5 forbid on the way in.
--
-- These THROW, unlike #6 and #7: a USING clause FILTERS, but a WITH CHECK violation is an
-- error (42501). The row under test is u2's reply, orphaned by #17 and still on the team
-- plan, which u2 authored and may therefore legitimately edit.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 18. The session the comment sits on is not the author's to choose: e…0002 is on a
--     PERSONAL repository and invisible to u2, so moving the row there is refused even
--     though u2 owns the row being moved.
select throws_ok(
  $sql$ update public.plan_comments set session_id = 'e0000000-0000-0000-0000-000000000002' where id = 'c0000000-0000-0000-0000-000000000011' $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'an author cannot move their own comment into a plan they cannot see'
);

-- 19. …and neither is its thread. Same parent as #5 uses, reached by UPDATE instead of
--     INSERT: a reparenting that crosses sessions would leave a thread readable through
--     whichever of the two plans the reader can see.
select throws_ok(
  $sql$ update public.plan_comments set parent_id = 'c0000000-0000-0000-0000-000000000002' where id = 'c0000000-0000-0000-0000-000000000011' $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_comments"',
  'an author cannot reparent their own comment onto a comment of another session'
);

reset role;

select * from finish();
rollback;
