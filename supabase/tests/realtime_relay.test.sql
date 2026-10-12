-- pgTAP: who may join the encrypted relay channel of an account.
--
-- Covers 20261012090000_realtime_relay.sql. The channel is `relay:<user uuid>`, private,
-- and authorized by two policies on `realtime.messages` that both ask
-- `relay_topic_owned(realtime.topic())`. Each case sets `realtime.topic` and the caller the
-- way Realtime does for the JOIN it authorizes, and reads the helper back through
-- `realtime.topic()` exactly as the policies do.
--
-- The assertion that matters most is #5: an org colleague is refused. That is what keeps the
-- relay off the `plan:` model, where org membership opens the channel.
--
-- Harness: see plan_comments.test.sql. Not run by CI (no pgTAP there): replay by hand
-- before touching these policies.

begin;
select plan(10);

-- u1 and u2 share Org A; u1 owns the relay under test.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user');

-- 1. The two policies that make the channel private are there.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'realtime' and tablename = 'messages'
      and policyname in ('relay_topic_select', 'relay_topic_insert')),
  2,
  'realtime.messages carries the select and insert policies of the relay: topics'
);

-- 2. No table joined the publication: the relay is broadcast and presence only.
select is(
  (select count(*)::int from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename like 'relay%'),
  0,
  'the relay publishes no table'
);

set local role authenticated;

-- 3. The owner joins their own relay.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select set_config('realtime.topic', 'relay:11111111-1111-1111-1111-111111111111', true);
select is(public.relay_topic_owned(realtime.topic()), true, 'the owner may join their relay channel');

-- 4. The case of the topic decides nothing: the comparison is on uuids.
select set_config('realtime.topic', 'relay:AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', true);
select is(public.relay_topic_owned(realtime.topic()), false, 'an upper-case topic of another uuid is still refused');

-- 5. *** An org colleague may not join it. ***
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select set_config('realtime.topic', 'relay:11111111-1111-1111-1111-111111111111', true);
select is(public.relay_topic_owned(realtime.topic()), false, 'a colleague of the same org may not join another user''s relay');

-- 6. ...while the colleague may join their own.
select set_config('realtime.topic', 'relay:22222222-2222-2222-2222-222222222222', true);
select is(public.relay_topic_owned(realtime.topic()), true, 'a colleague may join their own relay');

-- 7-8. *** A malformed topic answers false, and does NOT raise. ***
select set_config('realtime.topic', 'relay:not-a-uuid', true);
select lives_ok(
  $sql$ select public.relay_topic_owned(realtime.topic()) $sql$,
  'a malformed relay topic does not raise'
);
select is(public.relay_topic_owned(realtime.topic()), false, 'a malformed relay topic is refused');

-- 9. Another prefix is not this helper's to grant, even with the caller's own uuid.
select set_config('realtime.topic', 'plan:22222222-2222-2222-2222-222222222222', true);
select is(public.relay_topic_owned(realtime.topic()), false, 'a topic of another prefix is refused');

-- 10. No topic at all.
select is(public.relay_topic_owned(null), false, 'a null topic is refused');

reset role;

select * from finish();
rollback;
