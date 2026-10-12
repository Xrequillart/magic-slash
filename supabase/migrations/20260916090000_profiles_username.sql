-- Migration: profiles.username — the handle a person picks for themselves
--
-- The account card has always named its owner by their EMAIL ADDRESS, because that is
-- the only name the account ever had. An email is an identifier, not a name: it is the
-- one field a person cannot choose the look of, it carries their employer in the domain,
-- and it is the piece of the row you would least like on a shared screen. So the card
-- gets a handle to show instead, and falls back to the email only while there is none.
--
-- UNIQUE, and that is the whole of why this is a migration rather than one more nullable
-- text column on a table that already has six. A handle that two people can hold is not
-- a handle — it is a display name with extra steps. The uniqueness lives in an INDEX
-- below and not in the availability function: a check the client ran is a statement about
-- a moment that has already passed, and two people typing the same handle at the same
-- time is exactly the case a pre-flight read cannot decide. The index is what decides it;
-- the function only tells a user, before they press anything, what the index is going to
-- say. Clients therefore have to handle 23505 on write, and the desktop app does.
--
-- CASE-INSENSITIVELY unique, but stored AS TYPED. `Xavier` and `xavier` addressing two
-- different people is a phishing primitive rather than a feature, so the index is on
-- `lower(username)`. The column keeps the capitalisation its owner chose, because that is
-- what gets drawn.
--
-- NULL means no handle, and it is the state every existing row starts in. That is why
-- there is no default and no backfill: deriving one from the local part of an email would
-- hand every user a public handle they never chose, taken from the address this feature
-- exists to stop displaying.

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'The handle the user picked, stored as typed. Unique case-insensitively (see '
  'profiles_username_lower_key). NULL = none chosen, and the UI falls back to the '
  'email address. 3-30 chars from [A-Za-z0-9._-], starting with a letter or digit.';

-- ---------------------------------------------------------------------------
-- The shape of a handle
-- ---------------------------------------------------------------------------
-- Enforced in the database and not only in the two clients, for the ordinary reason: a
-- constraint is what makes the rule true of the DATA, while a form validation is what
-- makes it true of one path to the data.
--
-- What the character class buys is legibility of the thing once it is drawn — no spaces
-- to collapse, no punctuation that reads as syntax in a URL or a mention, nothing from
-- outside ASCII that renders as a box on someone else's machine. The leading character
-- is constrained too, so a handle cannot open with the separators and cannot be mistaken
-- for a flag or a hidden file.
--
-- 30 characters because the card truncates, and a limit that the column does not state
-- is a limit the UI discovers at draw time.
--
-- NOT VALID is deliberately absent: the column was just added, so every existing row
-- holds NULL and NULL passes a check constraint without being tested.
alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$');

-- ---------------------------------------------------------------------------
-- The uniqueness itself
-- ---------------------------------------------------------------------------
-- A UNIQUE INDEX on an expression rather than a unique CONSTRAINT, because a constraint
-- cannot be declared on `lower(username)` — only on the bare column, which would let
-- `Xavier` and `xavier` coexist.
--
-- NULLs do not collide: a unique index treats them as distinct, so every user who has not
-- picked a handle stays in the index without contending for the empty slot. That is the
-- behaviour wanted here and it is worth stating, since `nulls not distinct` (PG 15) would
-- silently allow exactly one user in the whole table to have no handle at all.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- username_available: can I have this one?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because `profiles_select` (20260724130000) is `user_id = auth.uid()`
-- — own rows only — so a caller cannot see a single row belonging to anyone else and
-- therefore cannot discover that a handle is taken. Widening that policy is not the
-- alternative: it guards `name`, `role`, `technical_level`, `communication_style`,
-- `languages` and `free_text`, the whole of what a person wrote about themselves for the
-- /magic:* skills to read. This is the same shape as `list_org_members` — a narrow window
-- through which one fact leaves the table, rather than a policy opened wide enough to
-- carry it.
--
-- The fact that leaves is a BOOLEAN and nothing else: no user id, no email, no
-- capitalisation of the row that matched. That a handle is taken is inherent to any
-- system where handles are unique — the user finds out the moment they press save, and a
-- check that refused to say so before the press would only move the disclosure, not
-- remove it. Nothing here identifies WHO holds it.
--
-- OWN HANDLE COUNTS AS AVAILABLE. Re-saving the handle you already hold, or changing only
-- its capitalisation, must not be reported as a collision — the index will not raise on
-- it either, since the row that would conflict is the row being updated.
--
-- `stable` so the planner may call it once per scan; `set search_path` locked, as every
-- definer function in this schema is, so the `public.profiles` it reads cannot be
-- shadowed by a temp table the caller created.
create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select not exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(trim(candidate))
      and p.user_id <> auth.uid()
  );
$$;

comment on function public.username_available(text) is
  'True when `candidate` is free for the calling user to take (their own current '
  'handle counts as free). Advisory only — profiles_username_lower_key is what '
  'decides, so callers must still handle 23505 on write.';

revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;
