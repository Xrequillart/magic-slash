-- pgTAP: prove the RLS model for personal vs team repositories and the
-- privacy of per-user local path bindings.
--
-- Harness (same as rls_isolation.test.sql): pgTAP runs as the DB OWNER, which
-- BYPASSES RLS. To exercise the policies we impersonate an authenticated user:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- auth.uid() reads "sub". `reset role;` returns to the owner to seed/read.

begin;
select plan(12);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed). u1 = admin of Org A, u2 = admin of
-- Org B, u3 = plain 'user' member of Org A.
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

-- A personal repo owned by u1 (org_id NULL) and two team repos in Org A: one
-- owned by u1 (the admin), one owned by u3 (a plain member) so the creator
-- exception can be told apart from the admin right.
insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, 'perso1'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a-u3');

-- u1's local path binding for the team repo (private to u1).
insert into public.repository_paths (repo_id, user_id, path)
values
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '/Users/u1/team-a');

-- ---------------------------------------------------------------------------
-- Context: u1 (owner of both repos, admin of Org A)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 1. u1 sees its own two repos plus the team repo u3 shared to Org A.
select is(
  (select count(*) from public.repositories),
  3::bigint,
  'u1 sees its personal repo and every repo of its org'
);

-- 2. u1 sees its own path binding.
select is(
  (select count(*) from public.repository_paths),
  1::bigint,
  'u1 sees its own local path binding'
);

-- ---------------------------------------------------------------------------
-- Context: u2 (admin of Org B, no relation to Org A or u1)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- 3. u2 sees none of u1's repos (not owner, not a member of Org A).
select is(
  (select count(*) from public.repositories),
  0::bigint,
  'u2 sees neither the personal nor the team repo of another org'
);

-- ---------------------------------------------------------------------------
-- Context: u3 (plain 'user' member of Org A)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 4. u3 sees ONLY the team repos (via org membership), never u1's personal repo.
select results_eq(
  $sql$ select name from public.repositories order by name $sql$,
  $sql$ values ('team-a'::text), ('team-a-u3'::text) $sql$,
  'a member sees the team repos but not another user''s personal repo'
);

-- 5. Path bindings are private: u3 cannot see u1's path row.
select is(
  (select count(*) from public.repository_paths),
  0::bigint,
  'a member cannot see another user''s local path binding'
);

-- 6. A team repo is admin-writable only: u3 (plain member, not the owner)
--    cannot edit it. RLS filters the row out, so the UPDATE is a silent no-op.
update public.repositories
  set color = 'red'
  where id = 'd0000000-0000-0000-0000-000000000002';
reset role;  -- read back as owner (bypass RLS) to confirm nothing landed
select is(
  (select color from public.repositories where id = 'd0000000-0000-0000-0000-000000000002'),
  NULL,
  'a plain member cannot edit a team repo they do not own'
);

-- 6b. The creator exception: u3 is a plain member, but it owns 'team-a-u3'.
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
update public.repositories
  set color = 'blue'
  where id = 'd0000000-0000-0000-0000-000000000003';
reset role;
select is(
  (select color from public.repositories where id = 'd0000000-0000-0000-0000-000000000003'),
  'blue',
  'the creator of a team repo still edits it as a plain member'
);

-- 6c. An admin edits a team repo it does not own.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.repositories
  set color = 'green'
  where id = 'd0000000-0000-0000-0000-000000000003';
reset role;
select is(
  (select color from public.repositories where id = 'd0000000-0000-0000-0000-000000000003'),
  'green',
  'an org admin edits a team repo owned by someone else'
);

-- 7. Delete is owner/admin only: u3 (plain member) cannot delete the team repo.
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
delete from public.repositories where id = 'd0000000-0000-0000-0000-000000000002';
reset role;
select is(
  (select count(*) from public.repositories where id = 'd0000000-0000-0000-0000-000000000002'),
  1::bigint,
  'a plain member cannot delete a team repo (owner/admin only)'
);

-- 8. u1 cannot share a repo into an org it does not belong to (Org B).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.repositories (owner_id, org_id, name) values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sneaky') $sql$,
  '42501',
  'new row violates row-level security policy for table "repositories"',
  'a user cannot create/share a repo into an org they are not a member of'
);

-- 9. Team repo names are unique within an org: u3 cannot create a second
--    'team-a' in Org A (partial unique index → unique_violation).
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select throws_ok(
  $sql$ insert into public.repositories (owner_id, org_id, name) values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a') $sql$,
  '23505',
  NULL,
  'a team repo name is unique within its org'
);

-- 10. Path actor integrity: u3 cannot bind a path row attributed to another user.
select throws_ok(
  $sql$ insert into public.repository_paths (repo_id, user_id, path) values ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '/tmp/x') $sql$,
  '42501',
  'new row violates row-level security policy for table "repository_paths"',
  'a user cannot forge another user as the owner of a path binding'
);

select * from finish();
rollback;
