-- pgTAP: who may join a plan's presence channel, and that its two tables stream.
--
-- Covers 20260929110000_realtime_plans.sql. The channel is `plan:<session uuid>`, private,
-- and authorized by two policies on `realtime.messages` that both ask
-- `plan_topic_readable(realtime.topic())`. Realtime sets `realtime.topic` for the JOIN it is
-- authorizing; each case below does the same with `set_config`, as the user who joins, and
-- reads the helper back through `realtime.topic()` exactly as the policies do.
--
-- The assertion that matters most is #7: a plan whose edit policy is `personal` stays its
-- author's alone on the channel too, although its repository is shared with the org. A
-- topic check that only asked "is this a plan of an org I belong to" would pass every other
-- case in this file.
--
-- Harness: see plan_comments.test.sql. Not run by CI (no pgTAP there): replay by hand
-- before touching these policies.

begin;
select plan(13);

-- u1 — member of Org A, the author of both plans. u2 — member of Org A, the colleague.
-- u4 — member of Org B only, the stranger.
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

insert into public.repositories (id, owner_id, org_id, name)
values ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team-a');

-- Both on the team repository: one shared with the org, one kept personal by its author.
insert into public.plan_sessions (id, owner_id, repo_id, slug, spec_key, title, edit_policy)
values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'team-feature', 'team-key', 'Team feature', 'org'),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'solo-feature', 'solo-key', 'Solo feature', 'personal');

-- 1-2. Both tables stream. Dropping either from the publication breaks the live view in
--      silence: nothing errors, an open plan just stops following its colleagues.
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plan_sessions'),
  'plan_sessions is published to supabase_realtime'
);
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plan_comments'),
  'plan_comments is published to supabase_realtime'
);

-- 3. The two policies that make the channel private are there.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'realtime' and tablename = 'messages'
      and policyname in ('plan_topic_presence_select', 'plan_topic_presence_insert')),
  2,
  'realtime.messages carries the select and insert policies of the plan: topics'
);

set local role authenticated;

-- 4. The author joins their team plan.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select set_config('realtime.topic', 'plan:e0000000-0000-0000-0000-000000000001', true);
select is(public.plan_topic_readable(realtime.topic()), true, 'the author may join their plan''s channel');

-- 5. *** A colleague of the same org joins it too. ***
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(public.plan_topic_readable(realtime.topic()), true, 'a member of the plan''s org may join its channel');

-- 6. *** A member of another org does not. ***
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select is(public.plan_topic_readable(realtime.topic()), false, 'a member of another org may not join the channel');

-- 7. *** A personal plan is its author's alone, on the channel as everywhere. ***
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select set_config('realtime.topic', 'plan:e0000000-0000-0000-0000-000000000002', true);
select is(public.plan_topic_readable(realtime.topic()), false, 'a colleague may not join the channel of a personal plan');

-- 8. ...while its author may.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select is(public.plan_topic_readable(realtime.topic()), true, 'the author may join the channel of their personal plan');

-- 9. An id that names no plan is refused, not an error.
select set_config('realtime.topic', 'plan:e0000000-0000-0000-0000-00000000dead', true);
select is(public.plan_topic_readable(realtime.topic()), false, 'a well-formed id of no plan is refused');

-- 10-11. *** A malformed topic answers false, and does NOT raise. *** An error in a policy is
--        a failed JOIN with a cast error in the log; the helper checks the shape before it
--        casts anything.
select set_config('realtime.topic', 'plan:not-a-uuid', true);
select lives_ok(
  $sql$ select public.plan_topic_readable(realtime.topic()) $sql$,
  'a malformed plan topic does not raise'
);
select is(public.plan_topic_readable(realtime.topic()), false, 'a malformed plan topic is refused');

-- 12. Another prefix is not this helper's to grant, even with a real plan id after it.
select set_config('realtime.topic', 'agents:e0000000-0000-0000-0000-000000000001', true);
select is(public.plan_topic_readable(realtime.topic()), false, 'a topic of another prefix is refused');

-- 13. No topic at all.
select is(public.plan_topic_readable(null), false, 'a null topic is refused');

reset role;

select * from finish();
rollback;
