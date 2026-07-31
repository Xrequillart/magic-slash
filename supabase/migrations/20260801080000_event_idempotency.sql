-- Idempotence keys for the three append-only event tables.
--
-- WHY
-- ---------------------------------------------------------------------------
-- Until now a failed event insert was logged to the console and dropped. Every
-- ordinary reason a desktop app cannot reach its backend — a closed lid, a tunnel, a
-- captive portal, a token refreshed a second late — silently deleted a row that a
-- team later read as "nobody used the product that day". The loss was not noise: it
-- correlates with being offline, which correlates with working, so the numbers were
-- biased downward exactly where activity was highest.
--
-- The desktop now queues a failed event on disk and replays it (main/store/outbox.ts).
-- A retry queue only trades lost rows for duplicated ones, though, unless the replay
-- is idempotent: an insert whose COMMIT succeeded but whose response never came back
-- is indistinguishable from one that failed. `client_event_id` is minted ONCE when the
-- event happens and carried through the first attempt and every replay, so the second
-- write collides with the row the first one already committed.
--
-- The client treats the resulting 23505 as success (CloudStore.isAlreadyRecorded), so
-- the constraint is the whole mechanism — not a safety net behind one.
--
-- NULLABLE, AND UNIQUE ANYWAY
-- ---------------------------------------------------------------------------
-- Every row written before this migration has no key, and rows written by anything
-- other than the desktop writers may not either. Postgres compares NULLs as DISTINCT
-- in a unique index by default, so unlimited keyless rows coexist while every keyed
-- one is unique. A NOT NULL default would have meant back-filling history with
-- meaningless ids that claim an idempotence they never had.
--
-- A plain index rather than a partial `where client_event_id is not null`: the partial
-- form is not inferable by `on conflict (client_event_id)`, which would force every
-- writer into an upsert to get the same behaviour.

alter table public.activity_events   add column if not exists client_event_id uuid;
alter table public.usage_events      add column if not exists client_event_id uuid;
alter table public.skill_invocations add column if not exists client_event_id uuid;

create unique index if not exists uq_activity_events_client_event_id
  on public.activity_events (client_event_id);
create unique index if not exists uq_usage_events_client_event_id
  on public.usage_events (client_event_id);
create unique index if not exists uq_skill_invocations_client_event_id
  on public.skill_invocations (client_event_id);

comment on column public.activity_events.client_event_id is
  'Client-minted idempotence key, unique when present. Lets the desktop outbox replay '
  'a queued event without double-counting it. Null for rows written before the queue '
  'existed, and for any writer that does not mint one.';
comment on column public.usage_events.client_event_id is
  'Client-minted idempotence key, unique when present. See activity_events.client_event_id.';
comment on column public.skill_invocations.client_event_id is
  'Client-minted idempotence key, unique when present. See activity_events.client_event_id.';
