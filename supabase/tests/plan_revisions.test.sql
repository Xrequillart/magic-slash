-- pgTAP: what a write to a plan's spec records in its history, under whose name, and who
-- may read it.
--
-- Covers 20260923120000_plan_revisions.sql and 20260923140000_plan_revisions_every_save.sql
-- (one revision per save, and `base_content` on a session's first). Nothing here calls a function: every revision
-- below is the side effect of an ordinary write to `plan_sessions`, made as the user whose
-- app would make it, which is the whole point of the trigger. Three things are worth
-- pinning, in order of what breaks if they go:
--
--   * the READ follows the session, and a PERSONAL plan's history stays its owner's
--     (#19-#21) — the hole every plan_* table pins, since a null org read as "everyone"
--     would pass every other assertion here;
--   * the SOURCE is the database's call, not the caller's (#9-#11): a member sending
--     the agent header is recorded by hand, and a person's save followed by the agent's
--     upload is two revisions with the right labels — the race a separate recording call
--     could not close;
--   * an unchanged spec records nothing (#5, #6). The app re-uploads the spec file after
--     every in-app save and at every launch, on the agent path, and this is what keeps
--     each of those from reading as the agent rewriting the plan;
--   * every save is a revision (#7, #15): two hand saves in a row by the same person were
--     once folded into one, and the second vanished from the history.
--
-- The source header is simulated the way PostgREST sets it, as a transaction setting:
--   set local request.headers = '{"x-magic-plan-source":"agent"}';   -- the agent's upload
--   set local request.headers = '{}';                                  -- a hand edit
--
-- One transaction, so `now()` does not move, and two revisions written in a row would tie
-- on every timestamp. The history is therefore AGED by a second (as the owner of the table)
-- after each write that adds a revision, which keeps "the latest revision" and the
-- orderings below deterministic.
--
-- Harness: see plan_comments.test.sql.

begin;
select plan(26);

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

insert into public.agents (id, org_id, owner_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'U1 Planner'),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'U2 Agent');

insert into public.repositories (id, owner_id, org_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a'),
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null,                                   'perso');

-- Seeded as the table owner, with no user in the request: a write the history must ignore.
insert into public.plan_sessions (id, owner_id, repo_id, agent_id, slug, spec_key, title, spec)
values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'team-feature',  'team-key',  'Team feature',     'v0'),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000002', null,                                   'perso-feature', 'perso-key', 'Personal feature', 'p0'),
  ('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', null,                                   'big-feature',   'big-key',   'Big feature',      null);

-- 1. No user, no revision: a migration or the SQL console writing a spec records nothing.
select is(
  (select count(*) from public.plan_revisions),
  0::bigint,
  'a write with no authenticated user records no revision'
);

-- The author's app, uploading its agent's spec.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
set local request.headers = '{"x-magic-plan-source":"agent"}';

-- 2. A session created WITH its text is a revision from the start.
insert into public.plan_sessions (id, owner_id, repo_id, agent_id, slug, spec_key, title, spec)
values ('e0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001', 'new-feature', 'new-key', 'New feature', 'n1');
reset role;
select results_eq(
  $sql$ select author_id, source, agent_id, agent_name, content, base_content from public.plan_revisions
        where session_id = 'e0000000-0000-0000-0000-000000000004' $sql$,
  $sql$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'agent'::text, 'a0000000-0000-0000-0000-000000000001'::uuid, 'U1 Planner'::text, 'n1'::text, null::text) $sql$,
  'the author''s upload that creates a session is its first revision, by the session''s agent, starting from nothing'
);

-- 3. A session created without its text (the tickets arrived first) is not.
set local role authenticated;
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title)
values ('e0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001',
        'empty-feature', 'empty-key', 'Empty feature');
reset role;
select is(
  (select count(*) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000005'),
  0::bigint,
  'a session created with no spec records no revision'
);

-- 4. The agent rewrites the team plan: a revision under the session's agent, by name —
-- and, the plan's first, starting from the text it held before its history began.
set local role authenticated;
update public.plan_sessions set spec = 'v1' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select author_id, source, agent_id, agent_name, content, base_content from public.plan_revisions
        where session_id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  $sql$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'agent'::text, 'a0000000-0000-0000-0000-000000000001'::uuid, 'U1 Planner'::text, 'v1'::text, 'v0'::text) $sql$,
  'the owner''s upload with the agent header is an agent revision, naming the session''s agent, based on the prior spec'
);
update public.plan_revisions set updated_at = updated_at - interval '1 second', created_at = created_at - interval '1 second';

-- 5. *** The dedup. *** The same text uploaded again — a reconcile, a replay — records nothing.
set local role authenticated;
update public.plan_sessions set spec = 'v1', spec_synced_at = now() where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select content, updated_at < now() from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  $sql$ values ('v1'::text, true) $sql$,
  'an unchanged spec re-uploaded records nothing, and leaves the last revision alone'
);

-- 6. A write that leaves the spec alone is not a revision.
set local role authenticated;
update public.plan_sessions set title = 'Team feature, renamed' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select count(*) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a title edit records no revision'
);

-- 7. A second upload a moment later is a revision of its own, and only the first has a base.
set local role authenticated;
update public.plan_sessions set spec = 'v2' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select content, source, agent_name, base_content from public.plan_revisions
        where session_id = 'e0000000-0000-0000-0000-000000000001' order by created_at $sql$,
  $sql$ values ('v1'::text, 'agent'::text, 'U1 Planner'::text, 'v0'::text),
               ('v2'::text, 'agent'::text, 'U1 Planner'::text, null::text) $sql$,
  'a second save by the same author and agent a moment later is a second revision'
);
update public.plan_revisions set updated_at = updated_at - interval '1 second', created_at = created_at - interval '1 second';

-- 8. The author edits by hand from the app: no header, a hand revision of its own.
set local role authenticated;
set local request.headers = '{}';
update public.plan_sessions set spec = 'v3' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select source, agent_id, agent_name, content from public.plan_revisions
        where session_id = 'e0000000-0000-0000-0000-000000000001' order by created_at $sql$,
  $sql$ values ('agent'::text, 'a0000000-0000-0000-0000-000000000001'::uuid, 'U1 Planner'::text, 'v1'::text),
               ('agent'::text, 'a0000000-0000-0000-0000-000000000001'::uuid, 'U1 Planner'::text, 'v2'::text),
               ('human'::text, null::uuid, null::text, 'v3'::text) $sql$,
  'the owner''s write without the header is a hand revision, naming no agent'
);
update public.plan_revisions set updated_at = updated_at - interval '1 second', created_at = created_at - interval '1 second';

-- 9. *** The race. *** The agent's upload lands right after that hand save: it is the
-- agent's revision, and the hand save keeps its own text and label.
set local role authenticated;
set local request.headers = '{"x-magic-plan-source":"agent"}';
update public.plan_sessions set spec = 'v4' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select source, content from public.plan_revisions
        where session_id = 'e0000000-0000-0000-0000-000000000001' order by created_at $sql$,
  $sql$ values ('agent'::text, 'v1'::text), ('agent'::text, 'v2'::text), ('human'::text, 'v3'::text), ('agent'::text, 'v4'::text) $sql$,
  'a hand save then an agent upload are two revisions, each under its own source'
);
update public.plan_revisions set updated_at = updated_at - interval '1 second', created_at = created_at - interval '1 second';

-- 10-11. *** A member cannot pass their edit off as the planner's. *** The header is ignored,
-- and the save itself goes through.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
set local request.headers = '{"x-magic-plan-source":"agent"}';
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'v5' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'a member''s save carrying the agent header is not refused'
);
reset role;
select results_eq(
  $sql$ select author_id, source, agent_id, agent_name, content from public.plan_revisions
        where session_id = 'e0000000-0000-0000-0000-000000000001' order by created_at desc limit 1 $sql$,
  $sql$ values ('22222222-2222-2222-2222-222222222222'::uuid, 'human'::text, null::uuid, null::text, 'v5'::text) $sql$,
  'a member''s save carrying the agent header is recorded as a hand edit by that member'
);
update public.plan_revisions set updated_at = updated_at - interval '1 second', created_at = created_at - interval '1 second';

-- 12-13. A header that is not JSON reads as no header: the owner's save lands, by hand.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
set local request.headers = 'not json';
select lives_ok(
  $sql$ update public.plan_sessions set spec = 'v6' where id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  'a malformed request.headers does not fail the save'
);
reset role;
select is(
  (select source from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001'
    order by created_at desc limit 1),
  'human',
  'a malformed request.headers is recorded as a hand edit'
);
update public.plan_revisions set updated_at = updated_at - interval '1 second', created_at = created_at - interval '1 second';

-- 14. A spec too large to sync is not a revision.
set local role authenticated;
set local request.headers = '{"x-magic-plan-source":"agent"}';
update public.plan_sessions set spec = 'v7', spec_oversize = true where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select count(*) from public.plan_revisions where content = 'v7'),
  0::bigint,
  'an oversize spec records no revision'
);

-- 15. *** The lost edit. *** The owner's hand save right after their last one (v6, by hand)
-- is a revision of its own, not folded into it.
update public.plan_sessions set spec_oversize = false where id = 'e0000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.headers = '{}';
update public.plan_sessions set spec = 'v8' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $sql$ select content from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001'
        and source = 'human' and author_id = '11111111-1111-1111-1111-111111111111' order by created_at $sql$,
  $sql$ values ('v3'::text), ('v6'::text), ('v8'::text) $sql$,
  'two hand saves in a row by the same person are two revisions'
);

-- 16. A write with no user in the request records nothing, even on a changed spec.
set local request.jwt.claims = '';
update public.plan_sessions set spec = 'v9' where id = 'e0000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.plan_revisions where content = 'v9'),
  0::bigint,
  'a spec changed with no authenticated user records no revision'
);

-- 17-18. Retention: nine 1 MiB revisions, then a tenth — the oldest go until 8 MiB remain,
-- and the newest is always among them.
insert into public.plan_revisions (session_id, author_id, source, content, created_at, updated_at)
select 'e0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'human',
       repeat(chr(96 + n), 1048576), now() - make_interval(hours => 20 - n), now() - make_interval(hours => 20 - n)
  from generate_series(1, 9) as n;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.plan_sessions set spec = repeat('z', 1048576) where id = 'e0000000-0000-0000-0000-000000000003';
reset role;
select is(
  (select count(*) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000003'),
  8::bigint,
  'a plan''s history is pruned, oldest first, to 8 MiB'
);
select is(
  (select left(content, 1) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000003'
    order by updated_at desc limit 1),
  'z',
  'the newest revision survives the pruning'
);

-- The owner's own revision on the personal plan, for the reads below.
set local role authenticated;
update public.plan_sessions set spec = 'p1' where id = 'e0000000-0000-0000-0000-000000000002';

-- 19. Visibility follows the session.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(
  (select count(*) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001'),
  7::bigint,
  'a member of the org reads the history of a colleague''s team plan'
);

-- 20. *** The hole. *** A personal plan's history stays the owner's.
select is(
  (select count(*) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a teammate does not read the history of the owner''s personal plan'
);

-- 21. A stranger reads nothing.
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select is(
  (select count(*) from public.plan_revisions),
  0::bigint,
  'a member of another org reads no revision of this one'
);

-- 22. The owner does read their personal plan's history.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select results_eq(
  $sql$ select content, base_content from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000002' $sql$,
  $sql$ values ('p1'::text, 'p0'::text) $sql$,
  'the owner reads the history of their personal plan'
);

-- 23-25. Nobody writes the table directly — the trigger is the only way in.
select throws_ok(
  $sql$ insert into public.plan_revisions (session_id, author_id, source, content) values ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'human', 'forged') $sql$,
  '42501',
  NULL,
  'a client cannot insert a revision directly'
);
select throws_ok(
  $sql$ update public.plan_revisions set source = 'agent' where session_id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a client cannot rewrite a revision'
);
select throws_ok(
  $sql$ delete from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001' $sql$,
  '42501',
  NULL,
  'a client cannot delete a revision'
);

-- 26. Deleting a plan deletes its history.
reset role;
delete from public.plan_sessions where id = 'e0000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.plan_revisions where session_id = 'e0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'deleting a plan deletes its revisions'
);

select * from finish();
rollback;
