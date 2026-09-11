-- Migration: plan_sessions.spec_oversize — why this session's spec is empty
--
-- `spec` has always had exactly one empty state and one meaning for it: the row is
-- created at the skill's first metadata write, minutes before the file exists, so a null
-- spec means "not uploaded yet" and the page says so. That sentence is a promise the
-- content is on its way.
--
-- It was not always true. The uploader refuses a spec larger than MAX_SPEC_BYTES (1 MiB,
-- see desktop/src/main/store/spec-file.ts) rather than storing a truncated half that
-- would read as complete — and, until now, refused it SILENTLY: the whole upsert was
-- abandoned, so the session either never appeared or sat forever at an empty spec worded
-- as pending. A reader opening a colleague's plan got a blank panel and no way to learn
-- that the document exists on a machine they cannot reach.
--
-- So the refusal becomes a fact of the row. The session is upserted as it always was;
-- only the content is withheld, and this column says that is deliberate. It is the ONLY
-- new state — everything else about the row (title, idea, status, tickets) is resolved
-- from the agent and the path, never from the spec's bytes, so an oversize session is a
-- perfectly ordinary session with one field it will not receive.
--
-- WRITTEN ON EVERY CONTENT READ, in both directions: the desktop sends `false` whenever
-- a spec is read successfully, so a document trimmed back under the ceiling clears the
-- flag on its next ping rather than staying marked for the life of the session. A write
-- that consulted no file at all (a ticket upload, an offline replay's session creation)
-- omits the column entirely, which is the omit-rather-than-null rule the whole upsert is
-- built on: PostgREST's DO UPDATE SET lists only the columns it was given, so an absent
-- one keeps what the row already holds.
--
-- No policy and no RPC follow this. The RLS policies of 20260821090000 are row-level —
-- they say WHICH sessions a reader may select, never which columns — and nothing selects
-- `*`, so the column is reachable exactly where it is named.

alter table public.plan_sessions
  add column if not exists spec_oversize boolean not null default false;

comment on column public.plan_sessions.spec_oversize is
  'True when the spec file exceeded the uploader''s MAX_SPEC_BYTES ceiling and its '
  'content was therefore never uploaded. Distinguishes "too large to sync" from the '
  'ordinary "not written yet" that a null spec otherwise means.';
