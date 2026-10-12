-- pgTAP: inviting people onto a plan whose repository is personal.
--
-- Covers 20260925090000_plan_personal_repo_invites.sql. As in plan_edit_policy.test.sql,
-- every write is a raw statement as the user whose app would send it.
--
-- Harness: see plan_comments.test.sql.

begin;
select plan(24);

-- 1: the author, member of Org A. 2: member of Org A, the invitee. 5: member of Org A,
-- never invited. 4: member of Org B only, shares nothing with the author. 3: admin of Org A.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'u5@example.com', now(), now());

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
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'admin');

insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null, 'perso'),
  ('d0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', null, 'perso-2');

-- The new default: personal.
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title, spec, status)
values
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000002', 'perso-feature', 'perso-key', 'Personal feature', 'p0', 'planning');

insert into public.plan_tickets (session_id, key, url, title, kind)
values ('e0000000-0000-0000-0000-000000000002', 'PROJ-1', 'https://example.com/PROJ-1', 'Epic', 'epic');

set local role authenticated;

-- 1. Nobody is invited onto a personal plan, repository personal or not.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222') $sql$,
  '42501', NULL,
  'a personal plan cannot have collaborators'
);

-- 2. The author opens it to invited people.
select lives_ok(
  $sql$ update public.plan_sessions set edit_policy = 'invited' where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'the author of a personal-repository plan switches it to invited'
);

-- 3. Before any invitation, a teammate does not see it.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'nobody invited yet: a teammate does not see the plan'
);

-- 4. *** The author invites someone they share an organization with. ***
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222') $sql$,
  'the author invites a member of one of their organizations'
);

-- 5. Not someone they share nothing with.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444') $sql$,
  '42501', NULL,
  'the author cannot invite someone outside all their organizations'
);

-- 6. Not themselves.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111') $sql$,
  '42501', NULL,
  'the author cannot invite themselves'
);

-- 7-8. The invitee sees the plan and its tickets.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select isnt_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'the invitee sees the plan'
);
select isnt_empty(
  $sql$ select 1 from public.plan_tickets where session_id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'the invitee sees its tickets'
);

-- 9. ...and is told they may edit it.
select is(
  (select public.viewer_can_edit(s) from public.plan_sessions s where s.id = 'e0000000-0000-0000-0000-000000000002'),
  true,
  'viewer_can_edit is true for the invitee'
);

-- 10. *** The invitee edits, despite not seeing the author's repository. ***
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'p1 by invitee' where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'the invitee edits the spec'
);

-- 11. The invitee cannot move the plan to another repository.
select throws_ok(
  $sql$ update public.plan_sessions set repo_id = 'd0000000-0000-0000-0000-000000000003' where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  '42501', NULL,
  'the invitee cannot change the plan''s repository'
);

-- 12. Nor change who may see it.
select throws_ok(
  $sql$ update public.plan_sessions set edit_policy = 'org' where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  '42501', NULL,
  'the invitee cannot change the edit policy'
);

-- 13. Nor invite anyone else.
select throws_ok(
  $sql$ insert into public.plan_collaborators (session_id, user_id) values ('e0000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555') $sql$,
  '42501', NULL,
  'the invitee cannot invite'
);

-- 14. The invitee comments.
select lives_ok(
  $sql$ insert into public.plan_comments (session_id, author_id, body, quote) values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'looks good', '') $sql$,
  'the invitee comments on the plan'
);

-- 15. The invitee reads the history of the edit.
select isnt_empty(
  $sql$ select 1 from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'the invitee reads its history'
);

-- 16. A member of the same organization, not invited, sees nothing.
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select is_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'a teammate nobody invited does not see the plan'
);

-- 17. Nor does an admin of that organization: there is no admin on a personal repository.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select is_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'an admin of the author''s organization does not see it either'
);

-- 18. Nor the stranger, their comments included.
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select is_empty(
  $sql$ select 1 from public.plan_comments where session_id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'a stranger sees none of its comments'
);

-- 19-20. `org` means nothing without an organization: the invitee loses sight of it, and
-- regains it back under `invited`, the list kept.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set edit_policy = 'org' where id = 'e0000000-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'under org, a personal-repository plan is its author''s alone'
);
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set edit_policy = 'invited' where id = 'e0000000-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select isnt_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'back under invited, the invitee sees it again'
);

-- 21. The invitee may put the pen down themselves.
select lives_ok(
  $sql$ delete from public.plan_collaborators where session_id = 'e0000000-0000-0000-0000-000000000002' and user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  'the invitee removes their own invitation'
);
select is_empty(
  $sql$ select 1 from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'and no longer sees the plan'
);

-- 23. *** Leaving the only shared organization takes the invitation with it. ***
reset role;
insert into public.plan_collaborators (session_id, user_id, invited_by)
values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
delete from public.memberships
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $sql$ select 1 from public.plan_collaborators where session_id = 'e0000000-0000-0000-0000-000000000002' and user_id = '22222222-2222-2222-2222-222222222222' $sql$,
  'an invitee who no longer shares an organization with the author loses the invitation'
);

-- 24. ...and so does the author leaving it: the invitee is dropped, not the plan.
insert into public.plan_collaborators (session_id, user_id, invited_by)
values ('e0000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111');
delete from public.memberships
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '11111111-1111-1111-1111-111111111111';
select is_empty(
  $sql$ select 1 from public.plan_collaborators where session_id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  'the author leaving the shared organization drops the invitations it supported'
);

select * from finish();
rollback;
