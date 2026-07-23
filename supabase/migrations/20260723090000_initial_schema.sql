-- Migration: initial schema
-- Multi-tenant cloud foundations for magic-slash (Cloud PR 1 of epic #121).
-- Creates enum types, an updated_at trigger helper, and the 8 core tables.
-- RLS policies live in a separate migration (20260723090100_rls_policies.sql).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- gen_random_uuid() is in the Postgres core; gen_random_bytes() comes from
-- pgcrypto. On Supabase, extensions live in the dedicated `extensions` schema
-- (not on the migration search_path), so pgcrypto functions must be schema-
-- qualified as extensions.<fn> below.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enum types (guarded so the migration is safe to re-run)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'membership_role'
  ) then
    create type public.membership_role as enum ('user', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'invitation_status'
  ) then
    create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Trigger helper: keep updated_at fresh on every UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Organizations: the tenant boundary. Every other org-scoped table references
-- this via org_id.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Memberships: which users belong to which org, and their role.
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Invitations: pending invites to join an org.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.membership_role not null default 'user',
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  status public.invitation_status not null default 'pending',
  invited_by uuid references auth.users (id),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Agents: a unit of work (ticket/branch) shared across an org.
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- owner_id references a MEMBERSHIP (org_id, user_id), not auth.users directly:
  -- this makes "owner must be a current member of this org" a schema invariant,
  -- and on delete set null (owner_id) clears the owner when that membership is
  -- removed — so ownership can never outlive membership. The membership itself
  -- references auth.users, so user existence is still guaranteed transitively.
  owner_id uuid,
  name text not null,
  ticket_id text,
  description text,
  branch_name text,
  base_branch text,
  status text,
  repositories jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Enables tenant-aware composite foreign keys from event tables: any row that
  -- references an agent must reference one belonging to the SAME org_id.
  unique (org_id, id),
  -- Owner must be a member of the SAME org; clearing the membership clears the
  -- owner (prevents ownership outliving membership). memberships has a matching
  -- unique (org_id, user_id). agent delete on org removal is handled by org_id
  -- above; this FK only governs the owner_id column.
  foreign key (org_id, owner_id) references public.memberships (org_id, user_id) on delete set null (owner_id)
);

-- Skills: org-level custom skills (name unique within an org).
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  content text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

-- Configs: per-user configuration blob within an org.
create table if not exists public.configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Usage events: append-only billing/usage telemetry.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  agent_id uuid,
  -- Composite FK guarantees the referenced agent shares this row's org_id
  -- (no cross-tenant references). agent_id nullable → FK skipped when null
  -- (MATCH SIMPLE); on agent delete only agent_id is nulled (org_id stays).
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete set null (agent_id),
  model text,
  cost_usd numeric(12, 6),
  tokens bigint,
  lines_added integer,
  lines_removed integer,
  duration_ms bigint,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Activity events: append-only audit/activity feed.
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  agent_id uuid,
  -- Composite FK: referenced agent must share this row's org_id (see usage_events).
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete set null (agent_id),
  action text not null,
  ticket_id text,
  description text,
  repositories jsonb not null default '[]'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- org_id index on org-scoped tables. memberships, skills and configs are
-- intentionally omitted: their unique constraints already index org_id as the
-- leading column (unique (org_id, user_id) / unique (org_id, name)), which
-- fully serves org_id lookups, so a standalone org_id index would be redundant.
create index if not exists idx_invitations_org_id on public.invitations (org_id);
create index if not exists idx_agents_org_id on public.agents (org_id);
create index if not exists idx_usage_events_org_id on public.usage_events (org_id);
create index if not exists idx_activity_events_org_id on public.activity_events (org_id);

-- Supporting lookup indexes.
create index if not exists idx_memberships_user_id on public.memberships (user_id);
create index if not exists idx_agents_owner_id on public.agents (owner_id);
create index if not exists idx_configs_user_id on public.configs (user_id);
create index if not exists idx_usage_events_agent_id on public.usage_events (agent_id);
create index if not exists idx_activity_events_agent_id on public.activity_events (agent_id);
create index if not exists idx_invitations_email on public.invitations (email);

-- ---------------------------------------------------------------------------
-- updated_at triggers (only tables that carry an updated_at column)
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.agents;
create trigger set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.skills;
create trigger set_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.configs;
create trigger set_updated_at
  before update on public.configs
  for each row execute function public.set_updated_at();
