-- Migration: profiles
-- A per-user profile ("who the human is" — name, role, technical level,
-- communication style, languages, free text). Used by the /magic:* skills to
-- adapt tone/depth. Previously local-only (~/.config/magic-slash/profile.md);
-- this makes the cloud the source of truth so it can be edited from both the
-- desktop app and the web app. One row per user, independent of any org.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role text,
  technical_level text,
  communication_style text,
  languages text[] not null default '{}',
  free_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — strictly own-rows. A profile is private to its user; only they read or
-- write it. (Team-wide read could be added later without touching writes.)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (user_id = auth.uid());
