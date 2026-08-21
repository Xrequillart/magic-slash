-- pgTAP: prove the visibility model of /magic:plan sessions.
--
-- Covers 20260821090000_plan_sessions.sql. This is the first table in the schema
-- that carries the CONTENT OF A FILE off the user's machine, so the assertions
-- below are the deliverable, not a formality. The one that matters most is #6:
-- a session on a PERSONAL repository must stay invisible to the author's
-- teammates. A naive `is_org_member(org_id)` policy passes every other test in
-- this file and fails only that one — silently, because org_id is null there and
-- a null org must never read as "no tenant, therefore everyone".
--
-- The last two assertions come at it from the WRITE side, which is the same hole
-- reached from the other end: org_id is derived from repo_id, so an unguarded
-- repo_id would let a stranger stamp their session onto an org they do not
-- belong to.
--
-- Harness (same as repositories.test.sql): pgTAP runs as the DB OWNER, which
-- BYPASSES RLS. To exercise the policies we impersonate an authenticated user:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- auth.uid() reads "sub". `reset role;` returns to the owner to seed/read.

begin;
select plan(18);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed). u1 = admin of Org A and the author of
-- every session here; u2 = plain 'user' member of Org A, i.e. the teammate whose
-- reach we are pinning down — and admin of Org B, which u1 has nothing to do
-- with, so u1 can play the stranger in the write-side assertions at the end.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '22222222-2222-2222-2222-222222222222');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin');

-- Two repos owned by u1: one shared with Org A, one strictly personal. Plus one
-- owned by u2 inside Org B, which u1 is not a member of — the repo u1 must not be
-- able to attach a session to.
insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null,                                   'perso'),
  ('d0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'team-b');

-- ---------------------------------------------------------------------------
-- The derivation, on insert. Written as u1 through RLS, the way the app does.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- The team session sends no org at all — the trigger must supply it.
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title)
values (
  'e0000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000001',
  'team-feature', 'team-key', 'Team feature'
);

-- The personal session LIES: it claims Org A. The trigger must discard it.
-- updated_at and spec_synced_at are seeded in the past so the re-derivation
-- assertions further down can tell a real bump from the insert's own value
-- (now() is frozen for the whole transaction, so they could not otherwise).
insert into public.plan_sessions (id, owner_id, repo_id, org_id, slug, spec_key, title, updated_at, spec_synced_at)
values (
  'e0000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'perso-feature', 'perso-key', 'Personal feature',
  '2026-08-20 10:00:00+00', '2026-08-20 10:00:00+00'
);

reset role;

-- 1. A session on a team repo inherits that repo's organization.
select is(
  (select org_id from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'a session on a team repository derives its repository''s organization'
);

-- 2. A session on a personal repo has NO organization — even though the client
--    explicitly sent one. The derivation wins, not the client.
select is(
  (select org_id from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002'),
  null::uuid,
  'org_id sent by the client on insert is discarded and re-derived from the repository'
);

-- 3. The same holds for an UPDATE that touches org_id ALONE — the trigger has no
--    column list precisely so this cannot slip through as a PATCH.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions
   set org_id = null
 where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select org_id from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'a client cannot clear org_id with an update either — the trigger fires on every write'
);

-- 4. One session per (owner, spec_key): the upsert key must actually be unique,
--    or every debounced save would append a new row.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.plan_sessions (owner_id, repo_id, slug, spec_key) values ('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'dup', 'team-key') $sql$,
  '23505',
  NULL,
  'a second session with the same spec_key for the same owner is rejected'
);

-- The tickets each session filed.
insert into public.plan_tickets (session_id, key, url, title, kind, parent_key)
values
  ('e0000000-0000-0000-0000-000000000001', 'PER-100', 'https://example.test/PER-100', 'Epic',  'epic',  null),
  ('e0000000-0000-0000-0000-000000000001', 'PER-101', 'https://example.test/PER-101', 'Story', 'story', 'PER-100'),
  ('e0000000-0000-0000-0000-000000000002', 'PER-200', 'https://example.test/PER-200', 'Epic',  'epic',  null);

-- ---------------------------------------------------------------------------
-- Visibility from the teammate's seat
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 5. The team session is shared work: a member of Org A reads it.
select is(
  (select count(*) from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a member of the org sees a colleague''s session on a team repository'
);

-- 6. *** THE TEST. *** The personal session must not leak. org_id is null here,
--    and null means owner-only — never "no org, therefore visible".
select is(
  (select count(*) from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a session on a PERSONAL repository is invisible to a member of the author''s org'
);

-- 7. Tickets are visible exactly when their session is.
select is(
  (select count(*) from public.plan_tickets where session_id = 'e0000000-0000-0000-0000-000000000001'),
  2::bigint,
  'the tickets of a visible session are visible'
);

-- 8. …and invisible when it is not.
select is(
  (select count(*) from public.plan_tickets where session_id = 'e0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'the tickets of an invisible session are invisible too'
);

-- 9. Reading is not writing: a member who can SEE the team session still cannot
--    forge tickets onto it. This is the hardened WITH CHECK — the write policies
--    test owner_id, not visibility.
select throws_ok(
  $sql$ insert into public.plan_tickets (session_id, key, url, kind) values ('e0000000-0000-0000-0000-000000000001', 'PER-666', 'https://evil.test/PER-666', 'story') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_tickets"',
  'a member of the org cannot insert a ticket onto a colleague''s session'
);

-- ---------------------------------------------------------------------------
-- Sharing a personal repo to an org: past sessions become visible. Deliberate,
-- documented consequence of deriving from the repository rather than freezing a
-- visibility at insert time.
-- ---------------------------------------------------------------------------
reset role;
update public.repositories
   set org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
 where id = 'd0000000-0000-0000-0000-000000000002';

-- 10. The re-derivation reached the already-existing session.
select is(
  (select org_id from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'sharing a personal repository with an org re-derives the org of its past sessions'
);

-- 11. …and so the teammate now sees it.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(
  (select count(*) from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002'),
  1::bigint,
  'a member sees a session that was personal until its repository was shared'
);
reset role;

-- 12. The re-derivation did NOT touch spec_synced_at. This is the whole reason
--     the column exists: reconcile compares the local file's mtime against it,
--     and sharing a repository is not a spec sync.
select is(
  (select spec_synced_at from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002'),
  '2026-08-20 10:00:00+00'::timestamptz,
  're-deriving the org leaves spec_synced_at alone'
);

-- 13. …while it DID bump updated_at, which is why updated_at cannot be the
--     reconcile comparator.
select ok(
  (select updated_at > '2026-08-20 10:00:00+00'::timestamptz
     from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002'),
  're-deriving the org bumps updated_at, so updated_at cannot be the reconcile comparator'
);

-- ---------------------------------------------------------------------------
-- Deleting the repository narrows visibility; it never widens it.
-- ---------------------------------------------------------------------------
delete from public.repositories where id = 'd0000000-0000-0000-0000-000000000001';

-- 14. repo_id is ON DELETE SET NULL, and that referential update fires the
--     BEFORE trigger, so org_id falls back to null.
select is(
  (select org_id from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  null::uuid,
  'deleting the repository clears the derived org_id'
);

-- 15. The session itself survives — the reasoning outlives the repo entity.
select is(
  (select count(*) from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'deleting the repository leaves the session row intact'
);

-- 16. And the org that used to see it no longer does: a null org is owner-only,
--     not everyone.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(
  (select count(*) from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'deleting the repository does not widen visibility — the org loses the session'
);

-- ---------------------------------------------------------------------------
-- The write side of the same hole: repo_id is unguarded org_id
-- ---------------------------------------------------------------------------
-- u1 is not a member of Org B. If the write policies checked only owner_id, u1
-- could point a session at Org B's repository and let the derivation trigger
-- stamp Org B onto it — publishing their document into a team they have no part
-- in. Both verbs have to refuse, or the guard is only a speed bump.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 17. Straight at it: insert against a repository of an org u1 does not belong to.
select throws_ok(
  $sql$ insert into public.plan_sessions (owner_id, repo_id, slug, spec_key) values ('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000003', 'sneaky', 'sneaky-key') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_sessions"',
  'a user cannot create a session against a repository of an org they are not a member of'
);

-- 18. …and not in two steps either. A session with no repository is legitimate
--     (the app creates one the moment it hears a spec path), so the insert below
--     must succeed; it is the UPDATE that moves it into Org B that has to fail.
insert into public.plan_sessions (id, owner_id, slug, spec_key)
values ('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'orphan', 'orphan-key');

select throws_ok(
  $sql$ update public.plan_sessions set repo_id = 'd0000000-0000-0000-0000-000000000003' where id = 'e0000000-0000-0000-0000-000000000003' $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_sessions"',
  'a user cannot reach a foreign org''s repository by updating repo_id after the fact'
);

reset role;
select * from finish();
rollback;
