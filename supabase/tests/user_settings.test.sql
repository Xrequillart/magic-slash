-- pgTAP: user_settings and app_installations are strictly private per user, the
-- enum-like columns are constrained, and app_version_updated_at only moves on a
-- real version change.

begin;
select plan(14);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

-- Seed one settings row + one device per user (as owner, RLS bypassed).
insert into public.user_settings (user_id, history_enabled, launch_mode)
values
  ('11111111-1111-1111-1111-111111111111', false, 'plan'),
  ('22222222-2222-2222-2222-222222222222', true, 'default');

insert into public.app_installations (user_id, device_id, device_name, app_version, platform, arch)
values
  ('11111111-1111-1111-1111-111111111111', 'device-u1', 'u1-laptop', '0.52.1', 'darwin', 'arm64'),
  ('22222222-2222-2222-2222-222222222222', 'device-u2', 'u2-laptop', '0.51.0', 'darwin', 'x64');

-- ---------------------------------------------------------------------------
-- user_settings — own rows only
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- 1. u1 sees only its own settings.
select is((select count(*) from public.user_settings), 1::bigint, 'u1 sees only its own settings row');
select is((select launch_mode from public.user_settings), 'plan', 'u1 reads its own settings');

-- 2. u1 can update its own settings.
update public.user_settings set launch_mode = 'acceptEdits' where user_id = '11111111-1111-1111-1111-111111111111';
reset role;
select is(
  (select launch_mode from public.user_settings where user_id = '11111111-1111-1111-1111-111111111111'),
  'acceptEdits',
  'u1 can update its own settings'
);

-- 3. u1 cannot forge a settings row for someone else (WITH CHECK user_id = auth.uid()).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $sql$ insert into public.user_settings (user_id, history_enabled) values ('22222222-2222-2222-2222-222222222222', true) $sql$,
  '42501',
  'new row violates row-level security policy for table "user_settings"',
  'a user cannot create settings for someone else'
);

-- 4. u2's settings are invisible to u1.
select is(
  (select count(*) from public.user_settings where user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'a user cannot see another user settings'
);

-- ---------------------------------------------------------------------------
-- user_settings — CHECK constraints mirror the app's validators
-- ---------------------------------------------------------------------------
select throws_ok(
  $sql$ update public.user_settings set launch_mode = 'notAMode' where user_id = '11111111-1111-1111-1111-111111111111' $sql$,
  '23514',
  null,
  'an unknown launch_mode is rejected'
);

select throws_ok(
  $sql$ update public.user_settings set spotlight_shortcut = 'Control+Q' where user_id = '11111111-1111-1111-1111-111111111111' $sql$,
  '23514',
  null,
  'an unsupported spotlight shortcut is rejected'
);

select throws_ok(
  $sql$ update public.user_settings set pr_reviews_poll_interval_ms = 0 where user_id = '11111111-1111-1111-1111-111111111111' $sql$,
  '23514',
  null,
  'a non-positive poll interval is rejected'
);

-- NULL stays legal on every column: it encodes "the user never chose", which the
-- app distinguishes from false.
select lives_ok(
  $sql$ update public.user_settings set launch_mode = null, spotlight_shortcut = null, pr_reviews_poll_interval_ms = null where user_id = '11111111-1111-1111-1111-111111111111' $sql$,
  'NULL is accepted on the constrained columns'
);

-- ---------------------------------------------------------------------------
-- app_installations — own rows only
-- ---------------------------------------------------------------------------
select is((select count(*) from public.app_installations), 1::bigint, 'u1 sees only its own devices');

-- u1 cannot attribute a device to another user.
select throws_ok(
  $sql$ insert into public.app_installations (user_id, device_id, app_version) values ('22222222-2222-2222-2222-222222222222', 'forged', '9.9.9') $sql$,
  '42501',
  'new row violates row-level security policy for table "app_installations"',
  'a user cannot record a device for someone else'
);

-- ---------------------------------------------------------------------------
-- app_installations — app_version_updated_at moves only on a real change
-- ---------------------------------------------------------------------------
reset role;

-- Backdate the stamp so a same-version touch is provably a no-op.
update public.app_installations
set app_version_updated_at = now() - interval '10 days'
where device_id = 'device-u1';

-- Re-launch on the SAME version: only last_seen_at moves.
update public.app_installations set last_seen_at = now() where device_id = 'device-u1';
select ok(
  (select app_version_updated_at < now() - interval '1 day' from public.app_installations where device_id = 'device-u1'),
  'a same-version launch leaves app_version_updated_at untouched'
);

-- Launch after an update: the stamp is refreshed.
update public.app_installations set app_version = '0.53.0' where device_id = 'device-u1';
select ok(
  (select app_version_updated_at > now() - interval '1 minute' from public.app_installations where device_id = 'device-u1'),
  'a version change refreshes app_version_updated_at'
);

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
-- The desktop app hydrates its config cache once per session, so a preference
-- changed on the web app reaches a RUNNING app only through the Realtime stream.
-- Dropping this table from the publication would break that silently — nothing
-- errors, settings just quietly stop syncing until the next launch.
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_settings'
  ),
  'user_settings is published to supabase_realtime'
);

select * from finish();
rollback;
