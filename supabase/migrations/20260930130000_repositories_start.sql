-- Migration: per-repository settings for /magic:start
--
-- The workflow editor's Start step now carries the skill's own settings: which of its
-- phases run (exploration, plan, plan review, plan approval, simplify), who implements
-- (auto, solo, multi-agent), and how hard its critic is to satisfy (iterations, minimum
-- score). Stored like every sibling option block (`commit`, `resolve`, `review`…): an
-- unvalidated jsonb the desktop validates on write, '{}' meaning nothing chosen, which the
-- client fills from its shipped defaults, today's behaviour. Not part of org shared config.
--
-- Deploy before the clients: the desktop selects this column by name, and PostgREST fails
-- the whole repositories query on a database that does not have it.

alter table public.repositories
  add column if not exists start jsonb not null default '{}'::jsonb;

comment on column public.repositories.start is
  'Per-repository settings for /magic:start (exploration, plan, planReview, planApproval, execution, simplify, criticIterations, criticMinScore). Same contract as the sibling option-block columns: unvalidated jsonb, ''{}'' means nothing chosen and the client fills from its shipped defaults. Not part of org shared config.';
