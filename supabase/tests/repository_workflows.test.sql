-- pgTAP: a repository's workflow is visible to whoever can see the repository, and to
-- nobody else, and writable by its owner or an admin of its org, and by nobody else
-- (20260929120000_repository_workflows.sql, then 20260930090000_repository_workflow_writes.sql).
--
-- Harness (same as repositories.test.sql): pgTAP runs as the DB OWNER, which BYPASSES
-- RLS. To exercise the policies we impersonate an authenticated user:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- auth.uid() reads "sub". `reset role;` returns to the owner to seed/read.
--
-- HOW A REFUSAL SHOWS. The three verbs are granted, so RLS is what refuses, and it does
-- not refuse them the same way: an INSERT that fails its WITH CHECK raises 42501, while an
-- UPDATE or a DELETE whose USING hides the row just affects 0 rows, without an error. An
-- UPDATE whose USING lets the row through but whose NEW row fails the WITH CHECK (moving
-- repo_id onto a repository the writer does not administer) raises 42501 like an INSERT. The
-- write assertions below therefore count the rows a statement returned, via
-- `with w as (<write> returning 1) select count(*)::int from w`.
--
-- Not run by CI (no pgTAP there): replay by hand before touching these policies.

begin;
select plan(31);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed). u1 = admin of Org A and owner of every
-- repository, u2 = admin of Org B (a stranger to Org A), u3 = plain 'user' member of
-- Org A, u4 = a second admin of Org A who owns none of the repositories.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '22222222-2222-2222-2222-222222222222');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'admin');

-- A personal repo of u1 and a team repo in Org A, each with a flow; two more team repos
-- in Org A that follow the default flow (no row). Org B's team repo and u2's personal
-- repo have no flow either: they are the targets a flow is moved ONTO (repo_id is the
-- primary key, so a move onto a repo that already has a flow would fail 23505 first,
-- before RLS had its say).
insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, 'perso1'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a-default'),
  ('d0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a-second'),
  ('d0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'team-b'),
  ('d0000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', null, 'perso2');

-- Overlays, as the app stores them. `before` names a built-in node; the tests only need
-- the envelope to pass the shape check, and tell the two rows apart by their skill.
insert into public.repository_workflows (repo_id, definition)
values
  ('d0000000-0000-0000-0000-000000000001', '{"version":1,"steps":[{"skill":"perso","mode":"advisory","before":null}],"kinds":{}}'),
  ('d0000000-0000-0000-0000-000000000002', '{"version":1,"steps":[{"skill":"team","mode":"advisory","before":null}],"kinds":{}}');

-- 1. RLS is on.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.repository_workflows'::regclass),
  'RLS is enabled on repository_workflows'
);

-- 2. The table streams. Dropping it from the publication breaks the live view in silence:
--    a colleague's app just stops following an admin's edits.
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'repository_workflows'),
  'repository_workflows is published to supabase_realtime'
);

-- ---------------------------------------------------------------------------
-- Context: u1 (owner of every repo)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 3. The owner sees the flow of both its repos.
select is(
  (select count(*) from public.repository_workflows),
  2::bigint,
  'the owner sees the flows of its personal and its team repository'
);

-- 4-6. The owner of a personal repository deletes, re-creates and edits its flow.
select results_eq(
  $sql$ with w as (delete from public.repository_workflows where repo_id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from w $sql$,
  $sql$ values (1) $sql$,
  'the owner can delete its personal repository''s flow (back to the default)'
);
select lives_ok(
  $sql$ insert into public.repository_workflows (repo_id, definition) values ('d0000000-0000-0000-0000-000000000001', '{"version":1,"steps":[],"kinds":{}}') $sql$,
  'the owner can create its personal repository''s flow'
);
select results_eq(
  $sql$ with w as (update public.repository_workflows set definition = '{"version":1,"steps":[{"skill":"perso","mode":"blocking","before":null}],"kinds":{}}' where repo_id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from w $sql$,
  $sql$ values (1) $sql$,
  'the owner can edit its personal repository''s flow'
);

-- 7-8. *** The shape check refuses what is not an overlay, even from the owner. ***
select throws_ok(
  $sql$ update public.repository_workflows set definition = '{"id":"perso","entry":[],"nodes":[],"links":[]}' where repo_id = 'd0000000-0000-0000-0000-000000000001' $sql$,
  '23514',
  NULL,
  'a full Workflow (the v1 shape) is refused: only an overlay is stored'
);
select throws_ok(
  $sql$ update public.repository_workflows set definition = '{"version":"1","steps":[],"kinds":{}}' where repo_id = 'd0000000-0000-0000-0000-000000000001' $sql$,
  '23514',
  NULL,
  'the version is the number 1, not the string "1"'
);

-- 8b-8c. *** Version 2, the graph the canvas draws, is stored; half a v2 is not. ***
select results_eq(
  $sql$ with w as (update public.repository_workflows set definition = '{"version":2,"steps":[{"skill":"perso","mode":"advisory"}],"links":[{"from":"commit","to":"custom:perso","kind":"suggest"}],"kinds":{},"positions":{"custom:perso":{"x":0,"y":0}}}' where repo_id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from w $sql$,
  $sql$ values (1) $sql$,
  'a v2 overlay (steps, links, kinds, positions) is stored'
);
select throws_ok(
  $sql$ update public.repository_workflows set definition = '{"version":2,"steps":[],"kinds":{}}' where repo_id = 'd0000000-0000-0000-0000-000000000001' $sql$,
  '23514',
  NULL,
  'a v2 overlay without its links and positions is refused'
);

-- ---------------------------------------------------------------------------
-- Context: u3 (plain member of Org A)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 9. A member sees the team repo's flow, never the owner's personal one.
select results_eq(
  $sql$ select definition->'steps'->0->>'skill' from public.repository_workflows $sql$,
  $sql$ values ('team'::text) $sql$,
  'a member sees the flow of a team repository but not of another user''s personal one'
);

-- 10-12. *** A plain member reads the team's flow but writes none of it. ***
select results_eq(
  $sql$ with w as (update public.repository_workflows set definition = '{"version":1,"steps":[],"kinds":{}}' where repo_id = 'd0000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from w $sql$,
  $sql$ values (0) $sql$,
  'a plain member cannot edit a team repository''s flow (0 rows)'
);
select results_eq(
  $sql$ with w as (delete from public.repository_workflows where repo_id = 'd0000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from w $sql$,
  $sql$ values (0) $sql$,
  'a plain member cannot delete a team repository''s flow (0 rows)'
);
select throws_ok(
  $sql$ insert into public.repository_workflows (repo_id, definition) values ('d0000000-0000-0000-0000-000000000003', '{"version":1,"steps":[],"kinds":{}}') $sql$,
  '42501',
  NULL,
  'a plain member cannot create a team repository''s flow'
);

-- ---------------------------------------------------------------------------
-- Context: u2 (admin of Org B, a stranger to Org A and to u1)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 13. A stranger sees no flow at all.
select is(
  (select count(*) from public.repository_workflows),
  0::bigint,
  'a stranger to the repository sees none of its flow'
);

-- 14-15. Being an admin of ANOTHER org grants nothing here.
select results_eq(
  $sql$ with w as (update public.repository_workflows set definition = '{"version":1,"steps":[],"kinds":{}}' returning 1) select count(*)::int from w $sql$,
  $sql$ values (0) $sql$,
  'a stranger cannot edit any flow (0 rows)'
);
select throws_ok(
  $sql$ insert into public.repository_workflows (repo_id, definition) values ('d0000000-0000-0000-0000-000000000003', '{"version":1,"steps":[],"kinds":{}}') $sql$,
  '42501',
  NULL,
  'a stranger cannot create a flow on a repository of another org'
);

-- ---------------------------------------------------------------------------
-- Context: u4 (admin of Org A, owner of nothing)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';

-- 16-17. *** An org admin writes the team's flow without owning the repository. ***
select results_eq(
  $sql$ with w as (update public.repository_workflows set definition = '{"version":1,"steps":[{"skill":"team","mode":"blocking","before":null}],"kinds":{}}' where repo_id = 'd0000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from w $sql$,
  $sql$ values (1) $sql$,
  'an org admin can edit a team repository''s flow'
);
select lives_ok(
  $sql$ insert into public.repository_workflows (repo_id, definition) values ('d0000000-0000-0000-0000-000000000003', '{"version":1,"steps":[],"kinds":{}}') $sql$,
  'an org admin can create a team repository''s flow'
);

-- 18. ...but still not the owner's personal one, which it cannot even see.
select results_eq(
  $sql$ with w as (update public.repository_workflows set definition = '{"version":1,"steps":[],"kinds":{}}' where repo_id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from w $sql$,
  $sql$ values (0) $sql$,
  'an org admin cannot edit another user''s personal repository''s flow (0 rows)'
);

-- ---------------------------------------------------------------------------
-- Moving a flow onto another repository (UPDATE of repo_id): WITH CHECK
-- ---------------------------------------------------------------------------
-- USING passes (the writer administers the flow's current repository), so what refuses
-- is the WITH CHECK on the row left behind. Still u4: admin of Org A, not even a member
-- of Org B.

-- 19-20. *** An Org A admin cannot move a team-A flow onto Org B's repository. ***
select throws_ok(
  $sql$ update public.repository_workflows set repo_id = 'd0000000-0000-0000-0000-000000000005' where repo_id = 'd0000000-0000-0000-0000-000000000002' $sql$,
  '42501',
  NULL,
  'an org admin cannot move a team flow onto a repository of an org it does not administer'
);
reset role;
select results_eq(
  $sql$ select repo_id from public.repository_workflows where definition->'steps'->0->>'skill' = 'team' $sql$,
  $sql$ values ('d0000000-0000-0000-0000-000000000002'::uuid) $sql$,
  'the refused move left the team flow on its repository'
);

-- 21. The same move by u1, admin of Org A AND owner of the flow's repository: owning
--        the source does not open the target either.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ update public.repository_workflows set repo_id = 'd0000000-0000-0000-0000-000000000005' where repo_id = 'd0000000-0000-0000-0000-000000000002' $sql$,
  '42501',
  NULL,
  'the owner of a team repository cannot move its flow onto another org''s repository'
);

-- 22-23. *** A personal repository's owner cannot move its flow onto another user's
--        personal repository. ***
select throws_ok(
  $sql$ update public.repository_workflows set repo_id = 'd0000000-0000-0000-0000-000000000006' where repo_id = 'd0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a personal repository''s owner cannot move its flow onto another user''s personal repository'
);
reset role;
select results_eq(
  $sql$ select repo_id from public.repository_workflows where definition->'steps'->0->>'skill' in ('team', 'perso') order by definition->'steps'->0->>'skill' $sql$,
  $sql$ values ('d0000000-0000-0000-0000-000000000001'::uuid), ('d0000000-0000-0000-0000-000000000002'::uuid) $sql$,
  'the refused moves left both flows on their repositories'
);

-- 24-25. An Org A admin CAN move a team-A flow onto another team-A repository with no
--        flow: it administers both, so USING and WITH CHECK both pass.
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select results_eq(
  $sql$ with w as (update public.repository_workflows set repo_id = 'd0000000-0000-0000-0000-000000000004' where repo_id = 'd0000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from w $sql$,
  $sql$ values (1) $sql$,
  'an org admin can move a team flow onto another repository of the same org'
);
reset role;
select results_eq(
  $sql$ select repo_id from public.repository_workflows where definition->'steps'->0->>'skill' = 'team' $sql$,
  $sql$ values ('d0000000-0000-0000-0000-000000000004'::uuid) $sql$,
  'the allowed move put the team flow on the other team repository'
);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
reset role;

-- 26. *** The admin's edit is the team's event: its org, its repository, its author. ***
select results_eq(
  $sql$ select org_id, target_id, setting, user_id from public.settings_events
        where scope = 'repository_workflows' and action = 'updated'
          and target_id = 'd0000000-0000-0000-0000-000000000002' $sql$,
  $sql$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, 'definition'::text, '44444444-4444-4444-4444-444444444444'::uuid) $sql$,
  'an update of a team flow logs one event, with the team''s org and the repository as target'
);

-- ---------------------------------------------------------------------------
-- Deleting the repository deletes its flow
-- ---------------------------------------------------------------------------

-- 27. The cascade goes through the audit trigger without error, although the repository
--     the trigger would read the org from is already gone.
select lives_ok(
  $sql$ delete from public.repositories where id = 'd0000000-0000-0000-0000-000000000003' $sql$,
  'deleting a repository cascades to its flow without error'
);

-- 28. The flow went with it.
select is(
  (select count(*) from public.repository_workflows where repo_id = 'd0000000-0000-0000-0000-000000000003'),
  0::bigint,
  'a repository''s flow goes with the repository'
);

-- 29. And the cascade is not logged twice: the repository's own delete says it all.
select is(
  (select count(*) from public.settings_events
    where scope = 'repository_workflows' and action = 'deleted'
      and target_id = 'd0000000-0000-0000-0000-000000000003'),
  0::bigint,
  'a flow deleted by its repository''s cascade logs no event of its own'
);

select * from finish();
rollback;
