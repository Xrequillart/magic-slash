-- pgTAP: list_account_sessions() and revoke_account_session() see and delete the CALLER's
-- sessions only, flag the one the caller's JWT belongs to, and refuse to revoke it.
--
-- Impersonation as in delete_account.test.sql; the `session_id` claim is what GoTrue puts
-- in a real access token.

begin;
select plan(9);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

-- u1: this desktop (current), a browser, and an expired session. u2: one browser.
insert into auth.sessions (id, user_id, created_at, updated_at, refreshed_at, user_agent, ip, not_after)
values
  ('a1a1a1a1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now() - interval '3 days', now() - interval '1 hour', (now() - interval '5 minutes') at time zone 'utc', 'MagicSlash/0.101.0 (macOS; Studio)', '10.0.0.1', null),
  ('a1a1a1a1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', now() - interval '2 days', now() - interval '2 days', null, 'Mozilla/5.0 (Macintosh) Chrome/140.0', '10.0.0.2', null),
  ('a1a1a1a1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', now() - interval '9 days', now() - interval '9 days', null, 'Mozilla/5.0 Firefox/130.0', '10.0.0.3', now() - interval '1 day'),
  ('b2b2b2b2-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now(), now(), null, 'Mozilla/5.0 Safari/605.1', '10.0.0.9', null);

insert into auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
values ('00000000-0000-0000-0000-000000000000', 'rt-u1-browser', '11111111-1111-1111-1111-111111111111', false, now(), now(), 'a1a1a1a1-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"u1@example.com","session_id":"a1a1a1a1-0000-0000-0000-000000000001"}';

-- 1. Only u1's live sessions: the expired one and u2's are left out.
select is(
  (select count(*) from public.list_account_sessions()),
  2::bigint,
  'lists the caller''s live sessions only'
);

-- 2. The current one is flagged, and comes first.
select is(
  (select id from public.list_account_sessions() limit 1),
  'a1a1a1a1-0000-0000-0000-000000000001'::uuid,
  'the current session is listed first'
);
select ok(
  (select is_current from public.list_account_sessions() where id = 'a1a1a1a1-0000-0000-0000-000000000001'),
  'the current session is flagged'
);

-- 3. last_used_at reads refreshed_at (UTC, no time zone) back as the right instant.
select ok(
  (select abs(extract(epoch from (last_used_at - (now() - interval '5 minutes')))) < 5
   from public.list_account_sessions() where id = 'a1a1a1a1-0000-0000-0000-000000000001'),
  'last_used_at is refreshed_at in UTC'
);

-- 4. The current session cannot be revoked from here.
select throws_ok(
  $sql$ select public.revoke_account_session('a1a1a1a1-0000-0000-0000-000000000001') $sql$,
  'P0001',
  'cannot revoke the current session; sign out instead',
  'refuses to revoke the current session'
);

-- 5. Another user's session is silently untouched.
select lives_ok(
  $sql$ select public.revoke_account_session('b2b2b2b2-0000-0000-0000-000000000001') $sql$,
  'revoking someone else''s session does not raise'
);

-- 6. The caller's other session goes.
select lives_ok(
  $sql$ select public.revoke_account_session('a1a1a1a1-0000-0000-0000-000000000002') $sql$,
  'revokes one of the caller''s other sessions'
);

reset role;

select is(
  (select count(*) from auth.sessions where id = 'b2b2b2b2-0000-0000-0000-000000000001'),
  1::bigint,
  'another user''s session survives'
);

select is(
  (select count(*) from auth.refresh_tokens where session_id = 'a1a1a1a1-0000-0000-0000-000000000002'),
  0::bigint,
  'the revoked session''s refresh tokens are gone with it'
);

select * from finish();
rollback;
