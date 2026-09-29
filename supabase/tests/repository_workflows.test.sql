-- pgTAP: a repository's workflow is visible to whoever can see the repository, and to
-- nobody else, and no client can write one (read-only in v1, see
-- 20260929120000_repository_workflows.sql).
--
-- Harness (same as repositories.test.sql): pgTAP runs as the DB OWNER, which BYPASSES
-- RLS. To exercise the policies we impersonate an authenticated user:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- auth.uid() reads "sub". `reset role;` returns to the owner to seed/read.

begin;
select plan(7);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed). u1 = admin of Org A, u2 = admin of
-- Org B (a stranger to Org A), u3 = plain 'user' member of Org A.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '22222222-2222-2222-2222-222222222222');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'user');

-- A personal repo of u1 and a team repo in Org A, each with a flow.
insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, 'perso1'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a');

insert into public.repository_workflows (repo_id, definition)
values
  ('d0000000-0000-0000-0000-000000000001', '{"id":"perso","entry":[],"nodes":[],"links":[]}'),
  ('d0000000-0000-0000-0000-000000000002', '{"id":"team","entry":[],"nodes":[],"links":[]}');

-- 1. RLS is on.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.repository_workflows'::regclass),
  'RLS is enabled on repository_workflows'
);

-- ---------------------------------------------------------------------------
-- Context: u1 (owner of both repos)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 2. The owner sees the flow of both its repos.
select is(
  (select count(*) from public.repository_workflows),
  2::bigint,
  'the owner sees the flows of its personal and its team repository'
);

-- ---------------------------------------------------------------------------
-- Context: u3 (plain member of Org A)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 3. A member sees the team repo's flow, never the owner's personal one.
select results_eq(
  $sql$ select definition->>'id' from public.repository_workflows $sql$,
  $sql$ values ('team'::text) $sql$,
  'a member sees the flow of a team repository but not of another user''s personal one'
);

-- 4. And cannot write one: SELECT is the only grant.
select throws_ok(
  $sql$ update public.repository_workflows set definition = '{}' where repo_id = 'd0000000-0000-0000-0000-000000000002' $sql$,
  '42501',
  NULL,
  'a member cannot edit a repository''s flow'
);

-- ---------------------------------------------------------------------------
-- Context: u2 (admin of Org B, a stranger to Org A and to u1)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 5. A stranger sees no flow at all.
select is(
  (select count(*) from public.repository_workflows),
  0::bigint,
  'a stranger to the repository sees none of its flow'
);

-- ---------------------------------------------------------------------------
-- Context: u1 again — even the owner cannot write in v1
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 6. Insert is refused outright (no grant), not filtered.
select throws_ok(
  $sql$ insert into public.repository_workflows (repo_id, definition) values ('d0000000-0000-0000-0000-000000000001', '{}') $sql$,
  '42501',
  NULL,
  'authenticated cannot insert a flow, not even for its own repository'
);

-- 7. Deleting the repository deletes its flow.
reset role;
delete from public.repositories where id = 'd0000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.repository_workflows where repo_id = 'd0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a repository''s flow goes with the repository'
);

select * from finish();
rollback;
