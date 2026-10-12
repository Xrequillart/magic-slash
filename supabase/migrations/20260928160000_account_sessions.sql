-- Migration: list_account_sessions() and revoke_account_session(uuid) — the Security &
-- Access settings page, which lists every device and browser signed in to the caller's
-- account and signs one of them out.
--
-- auth.sessions is not exposed to PostgREST and has no RLS policy, so both go through
-- SECURITY DEFINER and filter on auth.uid() themselves: a caller only ever sees, and only
-- ever deletes, their own rows.
--
-- WHICH ROW IS "THIS DEVICE" comes from the caller's own access token: GoTrue stamps the
-- session id into the JWT as `session_id`.
--
-- REVOKING IS A DELETE. auth.refresh_tokens cascades on session_id, so the refresh token
-- that device holds dies with the row, and its next refresh is answered 400, which is how
-- both clients learn they are signed out. The access token it already has keeps working
-- until it expires (jwt_expiry, an hour): GoTrue does not look sessions up per request.

create or replace function public.list_account_sessions()
returns table (
  id           uuid,
  user_agent   text,
  ip           text,
  created_at   timestamptz,
  last_used_at timestamptz,
  is_current   boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_account_sessions requires an authenticated user';
  end if;

  return query
    select
      s.id,
      s.user_agent,
      host(s.ip),
      s.created_at,
      -- refreshed_at moves on every token refresh (about hourly while a client is open)
      -- and is stored WITHOUT a time zone, in UTC. A session never refreshed yet falls
      -- back to when it was last touched, then to when it was opened.
      coalesce(s.refreshed_at at time zone 'utc', s.updated_at, s.created_at),
      s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
    from auth.sessions s
    where s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
    order by 6 desc, 5 desc nulls last;
end;
$$;

revoke execute on function public.list_account_sessions() from public, anon;
grant execute on function public.list_account_sessions() to authenticated;

-- Refuses the caller's own session: signing THIS device out is the account page's sign-out,
-- which also tears the local state down. Deleting the row from under the client would
-- leave it believing it is signed in for up to an hour.
create or replace function public.revoke_account_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'revoke_account_session requires an authenticated user';
  end if;

  if p_session_id::text = coalesce(auth.jwt() ->> 'session_id', '') then
    raise exception 'cannot revoke the current session; sign out instead';
  end if;

  delete from auth.sessions
  where id = p_session_id
    and user_id = auth.uid();
end;
$$;

revoke execute on function public.revoke_account_session(uuid) from public, anon;
grant execute on function public.revoke_account_session(uuid) to authenticated;
