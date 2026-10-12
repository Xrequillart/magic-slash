-- Migration: the encrypted relay between a Mac and its paired iPhones (#352)
--
-- The iPhone companion shows each agent's RUNTIME state (working, waiting, done, error) and
-- its usage. Neither is cloud data: both live in the desktop's memory, and they stay out of
-- `agents` on purpose — org members can read that table, and a `runtime_state` column would
-- sit there in clear (the #169 approach, rejected for that reason).
--
-- So Supabase is only a RELAY. A Mac with remote mode on joins one private channel per
-- account, `relay:<user uuid>`, and broadcasts there an envelope per paired iPhone, sealed
-- with a key only that Mac and that phone share (ECDH + HKDF + AES-GCM; the format is
-- `desktop/src/main/remote/PROTOCOL.md`). Nothing below reads, stores or could decrypt a
-- payload: this migration only decides WHO may join the channel.
--
-- ONE RULE: the topic names the caller. Unlike `plan:<uuid>` (20260929110000), whose answer
-- is "whoever may read the plan" and therefore reaches org colleagues, a relay topic is the
-- account's alone. No table is consulted, so no RLS on another table can ever widen it.
--
-- Nothing is published and no table is created: Broadcast and Presence are not replayed and
-- never written to `realtime.messages` beyond the authorization check.

-- ---------------------------------------------------------------------------
-- relay_topic_owned: is this `relay:<uuid>` topic the caller's own?
-- ---------------------------------------------------------------------------
-- THE SHAPE IS CHECKED BEFORE ANY CAST, in plpgsql, for the reason `plan_topic_readable`
-- gives: a malformed topic must answer false, not raise, and a SQL function would be inlined
-- where the planner may fold the cast before the guard. The comparison is on uuids, not on
-- text, so the case of the topic does not decide anything (clients send it lower-case).
create or replace function public.relay_topic_owned(p_topic text)
returns boolean
language plpgsql
security invoker
stable
set search_path = public, pg_temp
as $$
begin
  if p_topic is null
    or p_topic !~* '^relay:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return auth.uid() is not null and substr(p_topic, 7)::uuid = auth.uid();
end;
$$;

comment on function public.relay_topic_owned(text) is
  'True when the topic is relay:<uuid> and that uuid is the current user. '
  'False for any other topic, never an error.';

revoke execute on function public.relay_topic_owned(text) from public;
grant execute on function public.relay_topic_owned(text) to authenticated;

-- ---------------------------------------------------------------------------
-- realtime.messages: the `relay:` channels are private and owner-only
-- ---------------------------------------------------------------------------
-- SELECT receives the presence state and the broadcasts; INSERT tracks a presence and
-- broadcasts. Both are limited to those two extensions, and evaluated at JOIN.
--
-- What owner-only does NOT cover, by design: another device signed in to the same account
-- may join and read the envelopes. It cannot open them — that is the end-to-end encryption's
-- job, and the reason a revoked phone with a valid session receives nothing it can read.
--
-- Permissive and named after the prefix they govern, like the `plan:` pair: they answer for
-- `relay:<uuid>` only and widen nothing elsewhere.
drop policy if exists relay_topic_select on realtime.messages;
create policy relay_topic_select on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('presence', 'broadcast')
    and public.relay_topic_owned(realtime.topic())
  );

drop policy if exists relay_topic_insert on realtime.messages;
create policy relay_topic_insert on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('presence', 'broadcast')
    and public.relay_topic_owned(realtime.topic())
  );
