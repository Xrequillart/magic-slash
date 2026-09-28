-- Migration: a waitlist for the public site
--
-- Nobody can sign up to the app yet, and that is deliberate. The marketing site's download
-- buttons become a "join the waitlist" form instead, and this is where the addresses land.
--
-- ONE WAY IN, A FUNCTION. The table grants nothing to `anon` or `authenticated`: the form
-- calls `join_waitlist`, which is SECURITY DEFINER and does exactly one thing, an insert
-- that ignores a duplicate. A direct insert grant would have done the same job, but a
-- second submit of the same address would then surface as a unique-violation error to the
-- visitor, and whether an address is already on the list is not the page's to tell anyone.
-- The function answers the same way either way.
--
-- NOBODY READS IT FROM A CLIENT. No select policy, no grant: the list is read from the
-- Supabase dashboard (or with the service role), never from the browser.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- The page the form was sent from ("home", "workflow", ...) and the site's language at
  -- the time, so a later announcement can be written in the reader's language.
  source text,
  locale text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_shape check (
    char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint waitlist_source_length check (source is null or char_length(source) <= 32),
  constraint waitlist_locale_length check (locale is null or char_length(locale) <= 8)
);

-- One row per address, whatever its case: `Jane@Example.com` and `jane@example.com` are
-- the same inbox as far as a launch email is concerned.
create unique index waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

revoke all on public.waitlist from anon, authenticated;

-- ---------------------------------------------------------------------------
-- join_waitlist: add an address, silently ignoring one already there
-- ---------------------------------------------------------------------------
create or replace function public.join_waitlist(
  p_email text,
  p_source text default null,
  p_locale text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.waitlist (email, source, locale)
  values (lower(trim(p_email)), nullif(trim(p_source), ''), nullif(trim(p_locale), ''))
  on conflict ((lower(email))) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;

comment on function public.join_waitlist(text, text, text) is
  'Adds an address to the public waitlist; a duplicate is ignored and reported the same way as a new one.';
