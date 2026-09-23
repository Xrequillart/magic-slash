-- pgTAP: who may pin a link to somebody else's plan, and who may take it off.
--
-- Covers 20260923110000_plan_links.sql, whose policies are `plan_comments`' reached one
-- table further on, and from #12 the history 20260923130000 keeps of it — including the two
-- cascades (a plan deleted, an account deleted) its trigger must not break.
-- The two things worth pinning are the same two that file pins: a link on
-- a PERSONAL plan stays invisible to the owner's teammates (a null org read as "everyone"
-- would pass every other assertion here), and a filtered DELETE does not throw — it matches
-- no row — so the row is read back rather than a rejection expected.
--
-- Harness: see plan_comments.test.sql.

begin;
select plan(22);

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

insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null,                                   'perso');

insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title)
values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'team-feature',  'team-key',  'Team feature'),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000002', 'perso-feature', 'perso-key', 'Personal feature');

insert into public.plan_links (id, session_id, author_id, url, kind)
values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'https://www.figma.com/design/abc', 'figma'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'https://www.notion.so/private', 'notion');

-- The colleague.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 1. Visibility follows the session.
select is(
  (select count(*) from public.plan_links where session_id = 'e0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a member of the org sees the links on a colleague''s team plan'
);

-- 2. *** The hole. *** A personal plan's links stay the owner's.
select is(
  (select count(*) from public.plan_links where session_id = 'e0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a teammate does not see the links on the owner''s personal plan'
);

-- 3. A colleague may pin a link to the team plan…
select lives_ok(
  $sql$ insert into public.plan_links (id, session_id, author_id, url, kind) values ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'https://www.figma.com/board/xyz', 'figjam') $sql$,
  'a member of the org can add a link to a colleague''s plan'
);

-- 4. …under their own name only.
select throws_ok(
  $sql$ insert into public.plan_links (session_id, author_id, url) values ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'https://example.com') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_links"',
  'a member cannot add a link in a colleague''s name'
);

-- 5. …and not to a plan they cannot read.
select throws_ok(
  $sql$ insert into public.plan_links (session_id, author_id, url) values ('e0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'https://example.com') $sql$,
  '42501',
  'new row violates row-level security policy for table "plan_links"',
  'a member cannot add a link to a plan they cannot see'
);

-- 6. The table refuses what is not an http(s) address, whoever writes it.
select throws_ok(
  $sql$ insert into public.plan_links (session_id, author_id, url) values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'javascript:alert(1)') $sql$,
  '23514',
  NULL,
  'a link that is not http(s) is refused by the table itself'
);

-- 7. A colleague cannot remove the owner's link. A filtered DELETE matches nothing and
--    reports success, so the row is the assertion.
delete from public.plan_links where id = 'f0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select count(*) from public.plan_links where id = 'f0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a member cannot remove a link somebody else added'
);

-- 8. They can remove their own.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
delete from public.plan_links where id = 'f0000000-0000-0000-0000-000000000010';
reset role;
select is(
  (select count(*) from public.plan_links where id = 'f0000000-0000-0000-0000-000000000010'),
  0::bigint,
  'a member can remove the link they added'
);

-- 9. The plan's owner can remove a colleague's link on their plan.
insert into public.plan_links (id, session_id, author_id, url) values ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'https://example.com/a');
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
delete from public.plan_links where id = 'f0000000-0000-0000-0000-000000000011';
reset role;
select is(
  (select count(*) from public.plan_links where id = 'f0000000-0000-0000-0000-000000000011'),
  0::bigint,
  'the plan''s owner can remove a colleague''s link from their plan'
);

-- 10. An admin of the org can too.
insert into public.plan_links (id, session_id, author_id, url) values ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'https://example.com/b');
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
delete from public.plan_links where id = 'f0000000-0000-0000-0000-000000000012';
reset role;
select is(
  (select count(*) from public.plan_links where id = 'f0000000-0000-0000-0000-000000000012'),
  0::bigint,
  'an admin of the org can remove any link on the org''s plans'
);

-- 11. A stranger sees nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select is(
  (select count(*) from public.plan_links),
  0::bigint,
  'a member of another org sees no link of this one'
);

-- ---------------------------------------------------------------------------
-- The history: plan_link_events (20260923130000), written by a trigger on this table.
-- ---------------------------------------------------------------------------

-- 12. A stranger sees none of its history either.
select is(
  (select count(*) from public.plan_link_events),
  0::bigint,
  'a member of another org sees no link event of this one'
);
reset role;

-- 13. Pinning a link records who pinned it.
select results_eq(
  $sql$ select action, actor_id, url, kind from public.plan_link_events where link_id = 'f0000000-0000-0000-0000-000000000010' and action = 'added' $sql$,
  $sql$ values ('added'::text, '22222222-2222-2222-2222-222222222222'::uuid, 'https://www.figma.com/board/xyz'::text, 'figjam'::text) $sql$,
  'adding a link records an event naming whoever added it'
);

-- 14. *** A removed link stays in the history, address and kind included. ***
select results_eq(
  $sql$ select actor_id, url, kind from public.plan_link_events where link_id = 'f0000000-0000-0000-0000-000000000010' and action = 'removed' $sql$,
  $sql$ values ('22222222-2222-2222-2222-222222222222'::uuid, 'https://www.figma.com/board/xyz'::text, 'figjam'::text) $sql$,
  'removing a link records an event that keeps its address and kind'
);

-- 15. The actor is whoever removed it, not whoever added it.
select is(
  (select actor_id from public.plan_link_events where link_id = 'f0000000-0000-0000-0000-000000000011' and action = 'removed'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'a link removed by the plan''s owner is recorded under the owner'
);

-- 16. A member reads the history of the team plan, and 17. not of the personal one.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select ok(
  (select count(*) from public.plan_link_events where session_id = 'e0000000-0000-0000-0000-000000000001') > 0,
  'a member of the org reads the link history of a colleague''s team plan'
);
select is(
  (select count(*) from public.plan_link_events where session_id = 'e0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a teammate does not read the link history of the owner''s personal plan'
);

-- 18. Nobody forges an event.
select throws_ok(
  $sql$ insert into public.plan_link_events (session_id, link_id, action, url, kind) values ('e0000000-0000-0000-0000-000000000001', gen_random_uuid(), 'added', 'https://example.com', 'other') $sql$,
  '42501',
  NULL,
  'a client cannot insert a link event directly'
);

-- 19. *** The account delete. *** A link author deleting their account takes their links
-- with them, through a referential action — and an event naming them as its actor would
-- point at the user being deleted and fail `delete_account()`.
reset role;
insert into public.plan_links (id, session_id, author_id, url, kind, title) values ('f0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'https://www.notion.so/leaving', 'notion', 'Leaving notes');
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select lives_ok(
  $sql$ select public.delete_account() $sql$,
  'a link author can still delete their account'
);
reset role;

-- 20. …and the plan, which survives, keeps the removal in its history, under no name.
select results_eq(
  $sql$ select actor_id, url, kind, title from public.plan_link_events where link_id = 'f0000000-0000-0000-0000-000000000020' and action = 'removed' $sql$,
  $sql$ values (null::uuid, 'https://www.notion.so/leaving'::text, 'notion'::text, 'Leaving notes'::text) $sql$,
  'a link that leaves with its author''s account stays in the history, unattributed'
);

-- 21. *** The plan delete. *** The links cascade, and so does their history.
select lives_ok(
  $sql$ delete from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'a plan with links can still be deleted'
);

-- 22. …and its history goes with it.
select is(
  (select count(*) from public.plan_link_events where session_id = 'e0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'deleting a plan deletes its link history'
);

select * from finish();
rollback;
