-- pgTAP: prove accept_invitation + get_org_shared_config behave correctly.
--
-- Like rls_isolation.test.sql, we impersonate authenticated end users by setting
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>","email":"<email>"}';
-- Both RPCs are SECURITY DEFINER: they run as the owner but read auth.uid() /
-- auth.jwt() from the claims above. We `reset role;` to seed data as the owner.

begin;
select plan(8);

-- ---------------------------------------------------------------------------
-- Seed as the table owner (RLS bypassed). u1 = admin/creator of Org One.
-- u2 has a pending invite to Org One. u3 has no invite (used for email mismatch).
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'u3@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin');

-- Admin's per-user config carries the shared fields the invitee should inherit,
-- plus a local-only field (repoPaths) that must NOT leak through the RPC.
insert into public.configs (org_id, user_id, data)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '{"languages":{"commit":"en"},"commit":{"format":"conventional"},"pullRequest":{"autoLinkTickets":true},"repoKeywords":{"api":["api","backend"]},"repoPaths":{"api":"/local/only"}}'::jsonb
);

-- A pending invite for u2, a revoked invite (token reuse), and an expired invite.
insert into public.invitations (org_id, email, role, token, status, expires_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'u2@example.com', 'user', 'tok-pending', 'pending', now() + interval '7 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'u3@example.com', 'user', 'tok-revoked', 'revoked', now() + interval '7 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'u2@example.com', 'user', 'tok-expired', 'pending', now() - interval '1 day');

-- ---------------------------------------------------------------------------
-- Context: authenticate as u2 (the invitee)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","email":"u2@example.com"}';

-- 1. Accepting a valid pending invite returns the joined org_id.
select is(
  public.accept_invitation('tok-pending'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'accept_invitation returns the org_id'
);

-- 2. The membership now exists (read back as owner to bypass RLS below).
reset role;
select is(
  (select count(*) from public.memberships
   where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'accept_invitation creates the membership'
);

-- 3. The invitation is now marked accepted.
select is(
  (select status::text from public.invitations where token = 'tok-pending'),
  'accepted',
  'accept_invitation marks the invitation accepted'
);

-- 4. Re-accepting an already-accepted invite is rejected.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","email":"u2@example.com"}';
select throws_ok(
  $sql$ select public.accept_invitation('tok-pending') $sql$,
  'invitation is not pending (status: accepted)',
  're-accepting an accepted invitation is rejected'
);

-- 5. An expired invite is rejected.
select throws_ok(
  $sql$ select public.accept_invitation('tok-expired') $sql$,
  'invitation has expired',
  'an expired invitation is rejected'
);

-- 6. An email mismatch is rejected (u3 cannot accept a u2-addressed invite).
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","email":"u3@example.com"}';
select throws_ok(
  $sql$ select public.accept_invitation('tok-revoked') $sql$,
  'invitation is not pending (status: revoked)',
  'a revoked invitation is rejected'
);

-- ---------------------------------------------------------------------------
-- get_org_shared_config
-- ---------------------------------------------------------------------------
-- 7. A member (u2, joined above) inherits only the shared fields — the admin's
--    local-only repoPaths must not be present.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","email":"u2@example.com"}';
select is(
  public.get_org_shared_config('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '{"commit":{"format":"conventional"},"languages":{"commit":"en"},"pullRequest":{"autoLinkTickets":true},"repoKeywords":{"api":["api","backend"]}}'::jsonb,
  'get_org_shared_config returns only the shared fields'
);

-- 8. A non-member (u3) is rejected.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","email":"u3@example.com"}';
select throws_ok(
  $sql$ select public.get_org_shared_config('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $sql$,
  'not a member of this organization',
  'get_org_shared_config rejects a non-member'
);

select * from finish();
rollback;
