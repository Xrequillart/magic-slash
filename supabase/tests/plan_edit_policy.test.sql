-- pgTAP: who may see and edit a plan once its author has said who may (#305).
--
-- Covers 20260924090000_plan_edit_policy.sql. Every write below is a RAW statement as the
-- user whose app would send it, never the app's own path: what is pinned is that the
-- database refuses what the page merely stops offering.
--
-- Two things worth reading slowly:
--   * A refused edit RAISES here (42501), where 20260923100000's refusals filtered: the
--     UPDATE policy's USING is still visibility, and the edit rule is its WITH CHECK. A
--     reader who can no longer SEE the plan (#23) is filtered as before — the write matches
--     no row — so that one is read back rather than expected to throw.
--   * Reading and commenting are untouched (#24-25) under `org`, `admins` and `invited`:
--     those narrow the pen, never the plan.
--   * `personal` (#31 on) narrows the plan itself: the organization, admins included, sees
--     neither it nor anything hanging off it. The child tables' policies are not restated
--     for it; they sub-select `plan_sessions` and inherit its RLS, which #33 and #35 prove
--     table by table. A write onto a plan the writer cannot see is FILTERED (zero rows, as
--     any RLS-hidden row), not raised: #36-38 read that back with `is_empty`.
--
-- Harness: see plan_comments.test.sql.

begin;
select plan(49);

-- 1: the author, a plain member. 2 (B) and 5 (A): members. 3 and 6: admins.
-- 4: an admin of another organization, the outsider.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'u5@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'u6@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '44444444-4444-4444-4444-444444444444');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'admin');

insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null,                                   'perso');

-- The team plan is seeded `org`: it stands for a plan written before the migration, which
-- the ADD COLUMN backfilled to `org` (its first default) before the default moved to
-- `personal`. The plan on the personal repository takes the new default.
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title, spec, status, edit_policy)
values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'team-feature',  'team-key',  'Team feature', 'v0', 'planning', 'org');
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title, spec, status)
values
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000002', 'perso-feature', 'perso-key', 'Personal feature', 'p0', 'planning');

-- 1. The column's default, once the migration has run, is `personal`: what a new plan takes.
select col_default_is(
  'public', 'plan_sessions', 'edit_policy', 'personal'::text,
  'a new plan is personal unless its author shares it'
);

-- 2. ...and under it a member edits, as 20260923100000 allowed.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'v1 by B' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'under the default a member edits a colleague''s plan'
);

-- 3. *** A member cannot change who may edit. ***
select throws_ok(
  $sql$ update public.plan_sessions set edit_policy = 'admins' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a member cannot change a plan''s edit policy'
);

-- 4. The author can.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $sql$ update public.plan_sessions set edit_policy = 'admins' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'the author keeps a plan to the admins'
);

-- 5-6. *** Under `admins`, a member's raw writes are refused. *** The text and the status.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok(
  $sql$ update public.plan_sessions set spec = 'v2 by B' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'under admins, a member cannot rewrite the spec'
);
select throws_ok(
  $sql$ update public.plan_sessions set status = 'done' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'under admins, a member cannot change the status'
);

-- 7. A member cannot take the pen back by sending the policy along with the edit: the
-- policy judges the new row, the guard trigger refuses the change of policy first.
select throws_ok(
  $sql$ update public.plan_sessions set spec = 'v2 by B', edit_policy = 'org' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a member cannot reopen a plan by rewriting its policy in the same write'
);

-- 8. An admin edits under `admins`.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'v2 by admin' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'under admins, an admin edits'
);

-- 9. The author edits under `admins`, without being one.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'v3 by author' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'under admins, the author still edits their own plan'
);

-- 10. An admin who is not the author may change the policy.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select lives_ok(
  $sql$ update public.plan_sessions set edit_policy = 'invited' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'an admin opens the plan to invited members'
);

-- 11. Under `invited`, a member nobody invited is refused.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok(
  $sql$ update public.plan_sessions set spec = 'v4 by B' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'under invited, a member who was not invited cannot edit'
);

-- 12. ...and cannot invite themselves.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222') $sql$,
  '42501',
  NULL,
  'a member cannot invite anyone, themselves included'
);

-- 13-14. *** The author invites B, and B edits. ***
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222') $sql$,
  'the author invites a member'
);
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'v4 by B' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'an invited member edits'
);

-- 15. A, never invited, is still refused.
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select throws_ok(
  $sql$ update public.plan_sessions set spec = 'v5 by A' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'under invited, another member is still refused'
);

-- 16. A collaborator holds the pen, not the guest list.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555') $sql$,
  '42501',
  NULL,
  'a collaborator cannot invite'
);

-- 17. No outsiders: someone outside the plan's organization cannot be invited.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444') $sql$,
  '42501',
  NULL,
  'a member of another organization cannot be invited'
);

-- 18. Nobody records an invitation in somebody else's name.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id, invited_by) values ('e0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333') $sql$,
  '42501',
  NULL,
  'an invitation cannot be signed with another user''s id'
);

-- 19. There is no update on an invitation: it is removed and made again.
select throws_ok(
  $sql$ update public.plan_collaborators set user_id = '55555555-5555-5555-5555-555555555555' where session_id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'an invitation cannot be updated'
);

-- 20. A personal plan has nobody to invite.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222') $sql$,
  '42501',
  NULL,
  'a personal plan cannot have collaborators'
);

-- 21. *** Removing B takes the pen away. ***
delete from public.plan_collaborators
 where session_id = 'e0000000-0000-0000-0000-000000000001' and user_id = '22222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok(
  $sql$ update public.plan_sessions set spec = 'v6 by B' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a member whose invitation was removed can no longer edit'
);

-- 22. Re-invited by an admin, B puts the pen down on their own.
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666"}';
insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
delete from public.plan_collaborators
 where session_id = 'e0000000-0000-0000-0000-000000000001' and user_id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select count(*) from public.plan_collaborators where user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'a collaborator may leave a plan on their own'
);

-- 23. *** Leaving the organization takes the invitation with it. *** B is invited again,
-- then removed from the org: the row goes, so rejoining would not re-grant anything — and B,
-- who can no longer see the plan, writes nothing to it.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
reset role;
delete from public.memberships
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '22222222-2222-2222-2222-222222222222';
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.plan_sessions set spec = 'v7 by B' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$
    select (select count(*) from public.plan_collaborators where user_id = '22222222-2222-2222-2222-222222222222'),
           (select spec from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001')
  $sql$,
  $sql$ values (0::bigint, 'v4 by B'::text) $sql$,
  'a member leaving the org loses their invitation, and their write lands nowhere'
);

-- 24-25. *** Without the pen, A still reads the plan and comments on it. ***
set local role authenticated;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select is(
  (select spec from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  'v4 by B',
  'a member who may not edit still reads the plan'
);
select lives_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, body, quote) values ('e0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'can I help?', 'v4') $sql$,
  'a member who may not edit still comments'
);

-- 26-28. What the app draws from: the computed columns agree with the policy.
select results_eq(
  $sql$
    select s.viewer_can_edit, s.viewer_can_manage
      from public.plan_sessions s where s.id = 'e0000000-0000-0000-0000-000000000001'
  $sql$,
  $sql$ values (false, false) $sql$,
  'a member neither invited nor admin can neither edit nor manage'
);
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select results_eq(
  $sql$
    select s.viewer_can_edit, s.viewer_can_manage
      from public.plan_sessions s where s.id = 'e0000000-0000-0000-0000-000000000001'
  $sql$,
  $sql$ values (true, true) $sql$,
  'the author can edit and manage'
);
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select results_eq(
  $sql$
    select s.viewer_can_edit, s.viewer_can_manage
      from public.plan_sessions s where s.id = 'e0000000-0000-0000-0000-000000000001'
  $sql$,
  $sql$ values (true, true) $sql$,
  'an admin can edit and manage'
);

-- 29. Under `invited`, the invited member's computed column says so.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555');
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select results_eq(
  $sql$
    select s.viewer_can_edit, s.viewer_can_manage
      from public.plan_sessions s where s.id = 'e0000000-0000-0000-0000-000000000001'
  $sql$,
  $sql$ values (true, false) $sql$,
  'an invited member can edit but not manage'
);

-- 30. An inviter's account deleted leaves the invitation standing, with no name on it:
-- `delete_account` must not be blocked by, nor revoke, the invitations it made.
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666"}';
reset role;
update public.plan_collaborators set invited_by = '66666666-6666-6666-6666-666666666666'
 where user_id = '55555555-5555-5555-5555-555555555555';
delete from auth.users where id = '66666666-6666-6666-6666-666666666666';
select results_eq(
  $sql$ select user_id, invited_by from public.plan_collaborators $sql$,
  $sql$ values ('55555555-5555-5555-5555-555555555555'::uuid, null::uuid) $sql$,
  'deleting the inviter keeps the invitation and clears its author'
);

-- ---------------------------------------------------------------------------
-- personal: the author's alone, and invisible to everyone else
-- ---------------------------------------------------------------------------
-- A plan inserted with no edit_policy — how the desktop app inserts every plan — on the
-- TEAM repository, with something hanging off every child table. The invitation of A is a
-- row made before the plan was personal (seeded here as the system), which must stay inert.
-- The claims still name #30's deleted admin; the seed runs as the author, whose revision the
-- record_revision trigger then stamps.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title, spec, status)
values ('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001',
        'secret-feature', 'secret-key', 'Secret feature', 'secret v0', 'planning');
insert into public.plan_tickets (session_id, key, url, kind)
values ('e0000000-0000-0000-0000-000000000003', 'PER-1', 'https://example.atlassian.net/browse/PER-1', 'epic');
insert into public.plan_comments (id, session_id, author_id, body, quote)
values ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'note to self', 'secret');
insert into public.plan_links (session_id, author_id, url, kind)
values ('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'https://www.figma.com/file/secret', 'figma');
insert into public.plan_collaborators (session_id, user_id, invited_by)
values ('e0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111');

-- 31. The default applied.
select is(
  (select edit_policy from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000003'),
  'personal',
  'a plan inserted without an edit policy is personal'
);

-- The author changes its status from the app, which records a status event (only a signed-in
-- writer's change is recorded) — so every child table below has a row to hide.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set status = 'planned' where id = 'e0000000-0000-0000-0000-000000000003';

-- The one query every visibility assertion below runs: the plan, then each child table.
create function pg_temp.secret_counts() returns table (
  sessions bigint, tickets bigint, comments bigint, links bigint, revisions bigint,
  link_events bigint, status_events bigint, collaborators bigint
) language sql as $$
  select
    (select count(*) from public.plan_sessions      where id         = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_tickets       where session_id = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_comments      where session_id = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_links         where session_id = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_revisions     where session_id = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_link_events   where session_id = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_status_events where session_id = 'e0000000-0000-0000-0000-000000000003'),
    (select count(*) from public.plan_collaborators where session_id = 'e0000000-0000-0000-0000-000000000003');
$$;
grant execute on function pg_temp.secret_counts() to authenticated;

-- 32. The author sees the plan and everything on it — so the zeros below are hiding rows
-- that are there, not counting rows that never were.
select results_eq(
  $sql$ select * from pg_temp.secret_counts() $sql$,
  $sql$ values (1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint) $sql$,
  'the author sees a personal plan and everything on it'
);

-- 33. *** A member sees none of it *** — A, who even holds an (inert) invitation to it.
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select results_eq(
  $sql$ select * from pg_temp.secret_counts() $sql$,
  $sql$ values (0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint) $sql$,
  'a member sees neither a personal plan nor its tickets, comments, links, history or collaborators'
);

-- 34. ...nor learns, through the SECURITY DEFINER helper, which plan a comment is on.
select is(
  public.plan_comment_session('c0000000-0000-0000-0000-000000000003'),
  null,
  'plan_comment_session answers nothing about a comment on a plan the caller cannot see'
);

-- 35. *** Nor does an admin of the organization. ***
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select results_eq(
  $sql$ select * from pg_temp.secret_counts() $sql$,
  $sql$ values (0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint) $sql$,
  'an admin sees neither a personal plan nor anything on it'
);

-- 36-38. Writes onto it land nowhere: filtered (zero rows), since the plan is not there to
-- be matched. The member with the inert invitation, then an admin editing and deleting.
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select is_empty(
  $sql$ update public.plan_sessions set spec = 'by A' where id = 'e0000000-0000-0000-0000-000000000003' returning id $sql$,
  'a member, even one with an old invitation, cannot edit a personal plan (zero rows)'
);
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select is_empty(
  $sql$ update public.plan_sessions set spec = 'by admin' where id = 'e0000000-0000-0000-0000-000000000003' returning id $sql$,
  'an admin cannot edit a personal plan (zero rows)'
);
select is_empty(
  $sql$ delete from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000003' returning id $sql$,
  'an admin cannot delete a personal plan (zero rows)'
);

-- 39. The rule itself, asked directly as an RPC: `personal` grants an admin nothing.
select is(
  public.plan_may_edit('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'personal'),
  false,
  'plan_may_edit refuses an admin a personal plan'
);

-- 40-41. A member can neither comment on it nor pin a link to it.
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select throws_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, body, quote) values ('e0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'peek', '') $sql$,
  '42501',
  NULL,
  'a member cannot comment on a personal plan'
);
select throws_ok(
  $sql$ insert into public.plan_links (session_id, author_id, url, kind) values ('e0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'https://example.com/x', 'other') $sql$,
  '42501',
  NULL,
  'a member cannot pin a link to a personal plan'
);

-- 42. The author edits it, and the page is told they may edit and manage it.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set spec = 'secret v1' where id = 'e0000000-0000-0000-0000-000000000003';
select results_eq(
  $sql$
    select s.spec, s.viewer_can_edit, s.viewer_can_manage
      from public.plan_sessions s where s.id = 'e0000000-0000-0000-0000-000000000003'
  $sql$,
  $sql$ values ('secret v1'::text, true, true) $sql$,
  'the author edits a personal plan and may manage it'
);

-- 43. Nobody can be invited to a personal plan, not even by its author.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333') $sql$,
  '42501',
  NULL,
  'a personal plan on a team repository cannot have collaborators either'
);

-- 44. *** An admin cannot make a colleague's shared plan personal. *** (e1 is `invited` by
-- now, which an admin may otherwise change.) Visible, so refused out loud.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select throws_ok(
  $sql$ update public.plan_sessions set edit_policy = 'personal' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'an admin cannot make a colleague''s plan personal'
);

-- 45. A member cannot either (they cannot change the policy at all).
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select throws_ok(
  $sql$ update public.plan_sessions set edit_policy = 'personal' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a member cannot make a plan personal'
);

-- 46-47. *** The author shares it, and the organization sees it. ***
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $sql$ update public.plan_sessions set edit_policy = 'org' where id = 'e0000000-0000-0000-0000-000000000003' $sql$,
  'the author shares a personal plan with the organization'
);
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select results_eq(
  $sql$ select sessions, comments, links, collaborators, (select spec from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000003') from pg_temp.secret_counts() $sql$,
  $sql$ values (1::bigint, 1::bigint, 1::bigint, 1::bigint, 'secret v1'::text) $sql$,
  'once shared, a member sees the plan and what hangs off it'
);

-- 48. The author takes it back to personal, and the organization loses sight of it again.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set edit_policy = 'personal' where id = 'e0000000-0000-0000-0000-000000000003';
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select is(
  (select sessions from pg_temp.secret_counts()),
  0::bigint,
  'made personal again, the plan disappears from the organization'
);

-- 49. An admin cannot bring it back out: they do not see it, so the write matches nothing.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
update public.plan_sessions set edit_policy = 'org' where id = 'e0000000-0000-0000-0000-000000000003';
reset role;
select is(
  (select edit_policy from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000003'),
  'personal',
  'an admin cannot share a plan its author has kept personal'
);

select * from finish();
rollback;
