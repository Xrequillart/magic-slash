-- pgTAP: a plan's status set by hand — who may, what the agent's uploads do to it, and what
-- the history records.
--
-- Covers 20260923150000_plan_status_by_hand.sql. As in plan_revisions.test.sql, every
-- event below is the side effect of an ordinary write to `plan_sessions`, made as the user
-- whose app would make it, with the source header simulated as PostgREST sets it.
--
-- Harness: see plan_comments.test.sql.

begin;
select plan(15);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'u4@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', '44444444-4444-4444-4444-444444444444');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'admin');

insert into public.agents (id, org_id, owner_id, name)
values ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'U1 Planner');

insert into public.repositories (id, owner_id, org_id, name)
values ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a');

insert into public.plan_sessions (id, owner_id, repo_id, agent_id, slug, spec_key, title, spec, status)
values ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001', 'team-feature', 'team-key', 'Team feature', 'v0', 'planning');

-- 1-2. The agent moves its own plan along: the status changes, recorded as the agent's.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
set local request.headers = '{"x-magic-plan-source":"agent"}';
update public.plan_sessions set status = 'planned' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select from_status, to_status, source, actor_id from public.plan_status_events $sql$,
  $sql$ values ('planning'::text, 'planned'::text, 'agent'::text, '11111111-1111-1111-1111-111111111111'::uuid) $sql$,
  'the agent''s status change is recorded as the agent''s'
);
select is(
  (select status_by_hand from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  false,
  'a status set by the agent is not a status set by hand'
);

-- 3-5. *** A member closes a colleague's plan. *** Allowed, marked by hand, recorded.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
set local request.headers = '{}';
select lives_ok(
  $sql$ update public.plan_sessions set status = 'done' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'a member of the org may change the status of a colleague''s plan'
);
reset role;
select results_eq(
  $sql$ select status, status_by_hand from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  $sql$ values ('done'::text, true) $sql$,
  'a status set from the app is marked as set by hand'
);
select results_eq(
  $sql$ select from_status, to_status, source, actor_id from public.plan_status_events where to_status = 'done' $sql$,
  $sql$ values ('planned'::text, 'done'::text, 'human'::text, '22222222-2222-2222-2222-222222222222'::uuid) $sql$,
  'the hand change is recorded, by the member, by hand'
);

-- 6-7. *** The hand wins. *** The author's next agent upload leaves the status alone and
-- records nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
set local request.headers = '{"x-magic-plan-source":"agent"}';
update public.plan_sessions set status = 'planned', spec = 'v1' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select status, spec from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  $sql$ values ('done'::text, 'v1'::text) $sql$,
  'the agent''s upload keeps a status set by hand, and still writes the spec'
);
select is(
  (select count(*) from public.plan_status_events),
  2::bigint,
  'a held agent write records no status change'
);

-- 8. A hand may only say the four words the app draws.
set local role authenticated;
set local request.headers = '{}';
select throws_ok(
  $sql$ update public.plan_sessions set status = 'shipped' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '22023',
  NULL,
  'a status set by hand outside the four the app draws is refused'
);

-- 9. `status_by_hand` is the trigger's: a client cannot clear it to let the agent back in.
update public.plan_sessions set status_by_hand = false where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select status_by_hand from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001'),
  true,
  'a client''s value for status_by_hand is ignored'
);

-- 10. The member still may not touch what the row IS.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok(
  $sql$ update public.plan_sessions set agent_id = null where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a member still cannot change anything but the text and the status'
);

-- 11. The author reopens their plan by hand: recorded as the author's hand.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set status = 'abandoned' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select source from public.plan_status_events where to_status = 'abandoned'),
  'human',
  'the author''s change without the agent header is by hand'
);

-- 12. A write with no user records nothing.
set local request.jwt.claims = '';
update public.plan_sessions set status = 'planning' where id = 'e0000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.plan_status_events where to_status = 'planning'),
  0::bigint,
  'a status changed with no authenticated user records nothing'
);

-- 13-14. The history follows the session: a member reads it, a stranger does not.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(
  (select count(*) from public.plan_status_events),
  3::bigint,
  'a member of the org reads the status history of a team plan'
);
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select is(
  (select count(*) from public.plan_status_events),
  0::bigint,
  'a member of another org reads none of it'
);

-- 15. Nobody writes the table directly.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.plan_status_events (session_id, to_status, source) values ('e0000000-0000-0000-0000-000000000001', 'done', 'human') $sql$,
  '42501',
  NULL,
  'a client cannot insert a status event directly'
);

select * from finish();
rollback;
