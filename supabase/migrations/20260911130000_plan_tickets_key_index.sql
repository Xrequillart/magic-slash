-- Migration: an index on plan_tickets.key — the reverse lookup a ticket's page makes
--
-- `plan_tickets` has been read one way only since 20260821090000: give me a
-- session, give me its tickets. Its primary key (session_id, key) serves that
-- perfectly, and nothing else was ever asked of it.
--
-- The desktop's ticket page now asks the opposite question — "was this ticket
-- planned, and by which session?" — which is `where key in ('#412', '412')` with
-- no session in hand. On the primary key that is a sequential scan, once per
-- ticket a reader opens.
--
-- The table is small today, so this is not a repair: it is the index the new
-- access path needs before the table is big enough for its absence to show. `key`
-- alone rather than (key, session_id): the session id is the second column of the
-- primary key already, and the planner reaches the row from this index anyway.
--
-- No RLS change. The policies on this table are unchanged and an index grants
-- nothing — the reverse read returns exactly the rows a reader could already
-- reach through their sessions.

create index if not exists plan_tickets_key_idx on public.plan_tickets (key);

comment on index public.plan_tickets_key_idx is
  'Supports the reverse lookup ticket key -> planning session, made by the '
  'desktop ticket page (plans:forTicket). The primary key (session_id, key) '
  'cannot serve it: no session id is known at that point.';
