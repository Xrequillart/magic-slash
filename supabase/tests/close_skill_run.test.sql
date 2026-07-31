-- pgTAP: close_skill_run closes the right run, and refuses the wrong ones.
--
-- IMPORTANT: `supabase test db` runs as the database OWNER, which BYPASSES RLS.
-- Each assertion impersonates an authenticated end user via
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- and `reset role;` returns to the owner to seed or switch users.

begin;
select plan(15);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin');

insert into public.agents (id, org_id, owner_id, name)
values ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Agent One');

-- ---------------------------------------------------------------------------
-- Closing the run that is actually running
-- ---------------------------------------------------------------------------

insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values ('50000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-commit', now() - interval '5 minutes');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select ok(
  public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-commit', 'success', now()),
  'closes an open run of the same skill for the same agent'
);

select is(
  (select outcome from public.skill_invocations where id = '50000000-0000-0000-0000-000000000001'),
  'success',
  'records the outcome the skill reported'
);

-- The moment the SKILL finished, not the moment the close was processed. A close
-- that sat in the desktop outbox for an hour must not add an hour to the duration.
select ok(
  (select ended_at from public.skill_invocations where id = '50000000-0000-0000-0000-000000000001')
    < now() + interval '1 second',
  'ends the run at the moment reported, not at some later processing time'
);

select ok(
  not public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-commit', 'success', now()),
  'closing again finds nothing open — a replayed close cannot double-close'
);

select ok(
  not public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-done', 'success', now()),
  'returns false, rather than raising, when the skill never opened a run'
);

select throws_ok(
  $sql$ select public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-pr', 'kinda', now()) $sql$,
  'close_skill_run: unknown outcome kinda',
  'refuses an outcome outside the three it knows'
);

reset role;

-- ---------------------------------------------------------------------------
-- It closes the MOST RECENT open run, and only that one
-- ---------------------------------------------------------------------------

insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values
  ('50000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-pr', now() - interval '30 minutes'),
  ('50000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-pr', now() - interval '2 minutes');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select ok(
  public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-pr', 'success', now()),
  'closes when several runs of the same skill are open'
);

select is(
  (select ended_at is not null from public.skill_invocations where id = '50000000-0000-0000-0000-000000000011'),
  true,
  'closes the most recent open run'
);

select is(
  (select ended_at is null from public.skill_invocations where id = '50000000-0000-0000-0000-000000000010'),
  true,
  'leaves the older run open — one close ends one run'
);

reset role;

-- ---------------------------------------------------------------------------
-- The guards
-- ---------------------------------------------------------------------------

-- A run that started AFTER the skill reported finishing cannot be that run. This is
-- what stops a close replayed from the outbox attaching itself to a later run.
insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values ('50000000-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-review', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select ok(
  not public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-review', 'success', now() - interval '10 minutes'),
  'will not close a run that started after the reported end'
);

reset role;

-- A run old enough to read as abandoned everywhere else must not be revived here, or
-- the same row would be abandoned in one query and completed in the next.
insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values ('50000000-0000-0000-0000-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-resolve', now() - interval '5 hours');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select ok(
  not public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-resolve', 'success', now()),
  'will not resurrect a run already old enough to count as abandoned'
);

reset role;

-- The hook records what Claude Code reports, which is "magic-slash:magic-start" for a
-- plugin install, while the SKILL.md closes under its own bare name.
insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values ('50000000-0000-0000-0000-000000000040', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'magic-slash:magic-start', now() - interval '1 minute');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select ok(
  public.close_skill_run('a0000000-0000-0000-0000-000000000001', 'magic-start', 'success', now()),
  'folds the plugin prefix, so a plugin install can close its own runs'
);

reset role;

-- An agentless run — Claude Code the app never spawned — has agent_id null on both
-- halves. `agent_id = null` would be NULL and match nothing.
insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values ('50000000-0000-0000-0000-000000000050', null, '11111111-1111-1111-1111-111111111111', null, 'magic-done', now() - interval '1 minute');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select ok(
  public.close_skill_run(null, 'magic-done', 'success', now()),
  'closes an agentless run with an agentless close'
);

reset role;

-- ---------------------------------------------------------------------------
-- Someone else's run is not yours to close
-- ---------------------------------------------------------------------------

insert into public.skill_invocations (id, org_id, user_id, agent_id, skill, occurred_at)
values ('50000000-0000-0000-0000-000000000060', null, '22222222-2222-2222-2222-222222222222', null, 'magic-commit', now() - interval '1 minute');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- SECURITY DEFINER bypasses RLS, so the auth.uid() guard inside the function is the
-- ONLY thing standing between one user and another's rows. These two are that
-- assertion: the call must not find user 2's open run, and must not touch it.
select ok(
  not public.close_skill_run(null, 'magic-commit', 'success', now()),
  'finds no run of its own to close, and does not reach for another user''s'
);

-- Verified as the OWNER, not as user 1: RLS hides user 2's row from them entirely,
-- so the same subquery run here would return NULL and prove nothing about whether
-- close_skill_run left it alone.
reset role;

select is(
  (select ended_at is null from public.skill_invocations where id = '50000000-0000-0000-0000-000000000060'),
  true,
  'leaves another user''s run untouched, despite SECURITY DEFINER'
);

select * from finish();
rollback;
