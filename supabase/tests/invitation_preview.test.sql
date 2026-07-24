-- pgTAP: get_invitation_preview exposes a safe, anon-readable preview of an
-- invitation keyed by its token, with an effective (expiry-aware) status.
--
-- Harness (same as the other suites): pgTAP runs as the DB OWNER (RLS bypassed);
-- we impersonate the anon role to prove the invitee can preview while logged out.

begin;
select plan(8);

-- Seed as owner. One user/org, and three invitations in different states.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corp', '11111111-1111-1111-1111-111111111111');

insert into public.invitations (org_id, email, role, token, status, invited_by, expires_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'invitee@example.com', 'user',  'tok-pending',  'pending',  '11111111-1111-1111-1111-111111111111', now() + interval '7 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'late@example.com',    'admin', 'tok-expired',  'pending',  '11111111-1111-1111-1111-111111111111', now() - interval '1 day'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done@example.com',    'user',  'tok-accepted', 'accepted', '11111111-1111-1111-1111-111111111111', now() + interval '7 days');

-- ---------------------------------------------------------------------------
-- As anon (logged-out invitee on the landing page)
-- ---------------------------------------------------------------------------
set local role anon;

-- 1-3. A pending invite: org name, invited email, and effective status.
select is((select org_name from public.get_invitation_preview('tok-pending')), 'Acme Corp', 'anon sees the org name for a pending invite');
select is((select email from public.get_invitation_preview('tok-pending')), 'invitee@example.com', 'anon sees the invited email');
select is((select status from public.get_invitation_preview('tok-pending')), 'pending', 'a valid pending invite reports pending');

-- 4. Role is exposed.
select is((select role::text from public.get_invitation_preview('tok-pending')), 'user', 'the invited role is exposed');

-- 5. A pending-but-past-due invite reports 'expired' (derived at read time).
select is((select status from public.get_invitation_preview('tok-expired')), 'expired', 'a past-due pending invite reports expired');

-- 6. An already-accepted invite reports 'accepted'.
select is((select status from public.get_invitation_preview('tok-accepted')), 'accepted', 'an accepted invite reports accepted');

-- 7. An unknown token returns no rows (cannot confirm/deny arbitrary orgs).
select is((select count(*) from public.get_invitation_preview('does-not-exist')), 0::bigint, 'unknown token yields no preview');

-- 8. It never leaks more than one row per token.
select is((select count(*) from public.get_invitation_preview('tok-pending')), 1::bigint, 'exactly one preview row per token');

select * from finish();
rollback;
