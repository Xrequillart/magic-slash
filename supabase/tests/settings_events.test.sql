-- pgTAP: settings changes are audited, one row per column that actually changed.
--
-- IMPORTANT: `supabase test db` runs as the database OWNER, which BYPASSES RLS.
-- Assertions that depend on scoping impersonate an end user via
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<user-uuid>"}';
-- and `reset role;` returns to the owner. auth.uid() is null under the owner role,
-- so the writes that need an actor recorded are made as the user too.

begin;
select plan(14);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'u1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'u2@example.com', now(), now());

insert into public.organizations (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', '11111111-1111-1111-1111-111111111111');

insert into public.memberships (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'user');

-- ---------------------------------------------------------------------------
-- The reason this is a trigger: an all-columns upsert must not read as an
-- all-columns change
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

insert into public.user_settings (user_id, theme, language, usage_card_enabled)
values ('11111111-1111-1111-1111-111111111111', 'dark', 'fr', true);

reset role;

select is(
  (select count(*) from public.settings_events where scope = 'user_settings' and action = 'created'),
  1::bigint,
  'creating a settings row is ONE event, not one per column'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

-- Exactly what the desktop does on a single toggle: rewrite every column, with only
-- one of them different.
update public.user_settings
set theme = 'light', language = 'fr', usage_card_enabled = true, updated_at = now()
where user_id = '11111111-1111-1111-1111-111111111111';

reset role;

select is(
  (select count(*) from public.settings_events where scope = 'user_settings' and action = 'updated'),
  1::bigint,
  'an upsert of every column logs only the column that actually changed'
);

select is(
  (select setting from public.settings_events where scope = 'user_settings' and action = 'updated'),
  'theme',
  'names the setting that changed'
);

select is(
  (select old_value::text || '->' || new_value::text from public.settings_events where scope = 'user_settings' and action = 'updated'),
  '"dark"->"light"',
  'keeps the value it had, which was previously unrecoverable'
);

select is(
  (select user_id from public.settings_events where scope = 'user_settings' and action = 'updated'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'records who made the change'
);

-- `updated_at` moved on that write and must not be reported as a setting.
select is(
  (select count(*) from public.settings_events where setting in ('updated_at', 'created_at', 'id')),
  0::bigint,
  'ignores bookkeeping columns'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.user_settings set updated_at = now() where user_id = '11111111-1111-1111-1111-111111111111';
reset role;

select is(
  (select count(*) from public.settings_events where scope = 'user_settings' and action = 'updated'),
  1::bigint,
  'a write that changes nothing logs nothing'
);

-- Clearing a setting is a change: `is distinct from`, not `<>`.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.user_settings set language = null where user_id = '11111111-1111-1111-1111-111111111111';
reset role;

-- JSON null, not SQL NULL — and the difference carries meaning here. A jsonb `null`
-- is "the setting was cleared"; a SQL NULL in this column means "not a per-column
-- event at all" (a create or a delete). Collapsing the two would make a cleared
-- setting indistinguishable from a whole row appearing.
select is(
  (select count(*) from public.settings_events where setting = 'language' and new_value = 'null'::jsonb),
  1::bigint,
  'clearing a setting is recorded as a change, as JSON null'
);

select is(
  (select count(*) from public.settings_events where setting is not null and new_value is null),
  0::bigint,
  'a per-column event never leaves new_value as SQL NULL'
);

-- ---------------------------------------------------------------------------
-- Repositories: shared config, so the org sees it
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

insert into public.repositories (id, owner_id, org_id, name)
values ('dd000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'api');

update public.repositories set commit = '{"style":"conventional"}'::jsonb
where id = 'dd000000-0000-0000-0000-000000000001'::uuid;

reset role;

select is(
  (select org_id from public.settings_events where scope = 'repositories' and setting = 'commit'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'a team repository change carries its org, because the config is shared'
);

select is(
  (select target_id from public.settings_events where scope = 'repositories' and setting = 'commit'),
  'dd000000-0000-0000-0000-000000000001'::uuid,
  'names the repository the change is about'
);

-- A repo LEAVING a team must stay visible to the team it left.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.repositories set org_id = null where id = 'dd000000-0000-0000-0000-000000000001'::uuid;
reset role;

select is(
  (select org_id from public.settings_events where scope = 'repositories' and setting = 'org_id'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'un-sharing a repository is attributed to the org it left, not to nobody'
);

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

-- A colleague's theme, notification choices and local paths are none of the team's
-- business. This is the line that keeps an audit log from becoming surveillance.
select is(
  (select count(*) from public.settings_events where scope = 'user_settings'),
  0::bigint,
  'another member cannot read your personal settings history'
);

select ok(
  (select count(*) from public.settings_events where scope = 'repositories') > 0,
  'a member CAN read the history of their org''s shared repository config'
);

reset role;

select * from finish();
rollback;
