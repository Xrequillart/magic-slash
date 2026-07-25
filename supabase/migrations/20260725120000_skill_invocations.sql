-- Migration: log every skill invocation
--
-- activity_events records status TRANSITIONS, not runs: terminal-handlers only
-- writes when newStatus !== oldStatus, so running /magic:commit three times in a
-- row logs once. It also collapses distinct skills onto shared actions (start and
-- continue both emit 'started'; review and resolve both emit 'review'), drops the
-- 'changes requested' transition entirely (no entry in its status→action map), and
-- never sees skills that don't self-report at all.
--
-- This table answers a different question — which skills actually ran, and how
-- often — and is fed by a PreToolUse hook rather than by the skills themselves,
-- so it also captures natural-language triggers and third-party skills.
--
-- Deliberately NOT stored: the skill's `args`. They are free text that routinely
-- carries product context, and the SELECT policy below is org-wide.

create table if not exists public.skill_invocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  agent_id uuid,
  -- Composite FK: referenced agent must share this row's org_id (see usage_events).
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete set null (agent_id),
  -- Free text: third-party and plugin skills ("plugin:skill") have names we cannot enumerate.
  skill text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_skill_invocations_org_id on public.skill_invocations (org_id);
create index if not exists idx_skill_invocations_skill on public.skill_invocations (skill);

-- No updated_at column and no trigger: the table is append-only.

alter table public.skill_invocations enable row level security;

-- Append-only, mirroring usage_events / activity_events: no update, no delete.
grant select, insert on public.skill_invocations to authenticated;

create policy skill_invocations_select on public.skill_invocations
  for select to authenticated
  using (public.is_org_member(org_id));

create policy skill_invocations_insert on public.skill_invocations
  for insert to authenticated
  -- Actor must be the caller: prevents attributing a run to someone else.
  with check (public.is_org_member(org_id) and user_id = auth.uid());

comment on table public.skill_invocations is
  'Append-only log of skill runs (one row per invocation), fed by the desktop PreToolUse hook. Complements activity_events, which records status transitions instead.';
comment on column public.skill_invocations.skill is
  'Skill name as Claude Code reports it, e.g. "magic-commit" or "plugin:skill". Free text on purpose.';
