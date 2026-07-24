-- Migration: get_invitation_preview
-- Supports the web invitation funnel (app.magic-slash.io/invite/<token>). The
-- invitations table is admin-only for SELECT (see rls_policies), so an
-- UNAUTHENTICATED invitee cannot read their own invite to see which org invited
-- them before signing up. This SECURITY DEFINER function exposes a minimal, safe
-- preview keyed by the (secret, 128-bit) token: the org name, the invited email,
-- the role, and an effective status. Knowing the token already implies holding
-- the invite, so revealing these fields to the token-bearer leaks nothing new.
--
-- It is callable by anon (the invitee is logged out on the landing page) AND
-- authenticated. It never exposes ids, invited_by, or any other org data, and it
-- returns no rows for an unknown token (so it can't confirm/deny arbitrary orgs).
--
-- Effective status mirrors accept_invitation / cloud/org.ts: a pending invite
-- past its expires_at is reported as 'expired' (the stored status stays
-- 'pending'; expiry is derived at read time).
create or replace function public.get_invitation_preview(invitation_token text)
returns table (
  org_name text,
  email text,
  role public.membership_role,
  status text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    o.name as org_name,
    i.email,
    i.role,
    case
      when i.status = 'pending' and i.expires_at is not null and i.expires_at < now()
        then 'expired'
      else i.status::text
    end as status,
    i.expires_at
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  where i.token = invitation_token;
$$;

-- Callable while logged out (invitee on the landing page) and logged in.
revoke execute on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;
