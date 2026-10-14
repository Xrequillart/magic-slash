-- Migration: push_devices, where an iPhone tells the server how to wake it (#355)
--
-- The iPhone companion (#352) only learns an agent is waiting or done while it is open: the
-- relay is a live channel, and a closed app is not on it. #355 adds push notifications, and
-- an APNs push needs a device token that only the phone knows. This table is where the phone
-- leaves it.
--
-- ONE ROW PER PAIRED COUPLE (phone, Mac), not one per phone. The Mac is the sender: it calls
-- `/api/push` with `{ phoneId, macId, kind, box }`, and the route answers 404 `not_paired`
-- for a couple that has no row. That is the filter a Notification Service Extension cannot
-- provide — it may rewrite a notification, never drop it — so a phone that forgot a Mac,
-- signed out or was revoked must lose its row, not merely its key. The phone inserts the
-- row at pairing/unlock and deletes it on forget, sign-out and invalidation; the Mac deletes
-- its own on revocation. Both are the same account, so owner-only RLS covers both.
--
-- WHAT THE SERVER LEARNS, AND NOTHING MORE: who, which couple, which kind, and when. The
-- notification text travels as `box`, sealed with a key the phone handed to the Mac over the
-- relay (`desktop/src/main/remote/PROTOCOL.md`). Nothing here stores a box, and nothing here
-- could open one. The APNs token is not a secret in that sense — Apple only delivers to it
-- with our provider key — but it stays owner-only like every per-device table.
--
-- `notify_waiting` / `notify_completed` are the phone's two toggles, and THIS is their single
-- source of truth: the route reads them before sending, so a toggled-off kind costs a request
-- and never reaches APNs. They are per couple because the row is; the phone writes the same
-- values to each of its rows.
--
-- `environment` is which APNs gateway the token belongs to: a DEBUG build registers with the
-- sandbox, a TestFlight/App Store build with production, and a token sent to the wrong one
-- answers BadDeviceToken — which the route treats as dead and deletes. Storing it beside the
-- token is what keeps a developer's phone from deleting its own row on every push.
--
-- The ids are uuids: `macId` is `crypto.randomUUID()` on the desktop
-- (`desktop/src/main/remote/identity-store.ts`) and `phoneId` a `UUID()` on the phone, both
-- sent lower-case. A uuid column compares them by value, so case decides nothing.
--
-- Account deletion needs nothing: `user_id` cascades from auth.users.

create table if not exists public.push_devices (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  phone_id uuid not null,
  mac_id uuid not null,
  -- The raw APNs token, hex as the phone formats it. 32 bytes today; Apple says not to rely
  -- on that, hence a range rather than an exact length. The check is a sanity bound on what
  -- the route will paste into a URL path, not a validation of the token itself.
  apns_token text not null,
  environment text not null,
  notify_waiting boolean not null default true,
  notify_completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, phone_id, mac_id),

  constraint push_devices_apns_token_check check (apns_token ~ '^[0-9a-fA-F]{32,200}$'),
  constraint push_devices_environment_check check (environment in ('sandbox', 'production'))
);

comment on table public.push_devices is
  'One row per paired (iPhone, Mac) couple of a user: the APNs token /api/push sends to, '
  'and the two notification toggles. Owner-only. Never holds notification content.';

drop trigger if exists set_updated_at on public.push_devices;
create trigger set_updated_at
  before update on public.push_devices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — strictly own rows, like user_settings.
-- ---------------------------------------------------------------------------
-- No org path and no service-role shortcut in the route: `/api/push` reads and deletes these
-- rows with the CALLER's JWT, so the policies below are the whole authorization of a push.
-- An org colleague who knows a phone_id and a mac_id gets the same 404 as a stranger.
alter table public.push_devices enable row level security;

grant select, insert, update, delete on public.push_devices to authenticated;

create policy push_devices_select on public.push_devices
  for select to authenticated
  using (user_id = auth.uid());

create policy push_devices_insert on public.push_devices
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_devices_update on public.push_devices
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_devices_delete on public.push_devices
  for delete to authenticated
  using (user_id = auth.uid());
