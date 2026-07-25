-- pgTAP: skill_invocations is org-scoped on read, self-attributed on insert,
-- and append-only.
--
-- IMPORTANT: `supabase test db` runs as the database OWNER, which BYPASSES RLS.
-- Each assertion impersonates an authenticated end user via
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- and `reset role;` returns to the owner to seed or switch users.

begin;
select plan(7);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', '22222222-2222-2222-2222-222222222222');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin');

insert into public.agents (id, org_id, owner_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Agent One');

-- One row per org so cross-tenant isolation is provable, and so the
-- append-only assertions run against a non-empty table.
insert into public.skill_invocations (org_id, user_id, agent_id, skill)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-commit'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', null, 'magic-pr');

-- ---------------------------------------------------------------------------
-- Read: org-scoped
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 1. u1 sees Org One's row and not Org Two's.
select is((select count(*) from public.skill_invocations), 1::bigint, 'u1 sees only its own org rows');
select is((select skill from public.skill_invocations), 'magic-commit', 'u1 reads its org row');

-- ---------------------------------------------------------------------------
-- Insert: must be a member, and must attribute the row to yourself
-- ---------------------------------------------------------------------------

-- 2. u1 can log a run in its own org.
insert into public.skill_invocations (org_id, user_id, skill)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-start');
select is((select count(*) from public.skill_invocations), 2::bigint, 'u1 can log a run in its own org');

-- 3. The same skill twice is two rows — the whole point of this table.
insert into public.skill_invocations (org_id, user_id, skill)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'magic-start');
select is(
  (select count(*) from public.skill_invocations where skill = 'magic-start'),
  2::bigint,
  'repeat invocations each get their own row'
);

-- 4. u1 cannot attribute a run to u2.
select throws_ok(
  $$insert into public.skill_invocations (org_id, user_id, skill)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'magic-pr')$$,
  '42501',
  null,
  'u1 cannot attribute an invocation to another user'
);

-- 5. u1 cannot write into an org it does not belong to.
select throws_ok(
  $$insert into public.skill_invocations (org_id, user_id, skill)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'magic-pr')$$,
  '42501',
  null,
  'u1 cannot log a run into another org'
);

-- ---------------------------------------------------------------------------
-- Append-only: no DELETE grant (and no policy)
-- ---------------------------------------------------------------------------

-- 6. Deleting is refused outright — the table is an audit log.
select throws_ok(
  $$delete from public.skill_invocations$$,
  '42501',
  null,
  'skill_invocations cannot be deleted'
);

select * from finish();
rollback;
