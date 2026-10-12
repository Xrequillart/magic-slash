-- Migration: repositories.review — settings for /magic:review
--
-- One jsonb block per skill is the shape this table has (see 20260819090000 for why
-- `plan` got its own column rather than a corner of another block), and `review` is the
-- block for the skill that reviews a pull request.
--
-- Holds: confidenceScore (show a score out of 10 in the draft and the review body) and
-- mode ('ask' = show the draft and let the human pick what is posted, 'post' = post the
-- comments straight away). Unvalidated, like its siblings: the desktop write path
-- (updateRepositoryReviewSettings in desktop/src/main/config/config.ts) owns the per-key
-- whitelist, and '{}' means "nothing chosen", which the client resolves to its shipped
-- defaults.
--
-- Not part of org shared config, like `resolve` and `plan`.
--
-- DEPLOY BEFORE THE CLIENTS: the desktop select names `review` explicitly, and against a
-- database without it PostgREST fails the whole query (42703) and every repository
-- disappears from the app.

alter table public.repositories
  add column if not exists review jsonb not null default '{}'::jsonb;

comment on column public.repositories.review is
  'Per-repository settings for /magic:review (confidenceScore, mode). Same contract as the sibling option-block columns: unvalidated jsonb, ''{}'' means nothing chosen and the client fills from its shipped defaults. Not part of org shared config.';
