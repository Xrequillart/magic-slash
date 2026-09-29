-- Migration: see who is on a plan, live (#306)
--
-- REVERSES TWO DECISIONS, on purpose and in the open. `20260821090000_plan_sessions.sql`
-- ends on "Realtime: deliberately NOT published" — nothing watched a planning session live,
-- and "the desktop app is the only writer — it already knows what it wrote".
-- `20260922100000_plan_comments.sql` ends on the same heading, and names the live comment
-- stream as a different feature, to be added "when #298 lands". Neither premise holds any
-- more:
--
--   • The desktop is NOT the only writer. Since #302 a colleague edits a shared spec from
--     their own app, and the agent keeps uploading it; a reader with the plan open saw
--     neither until they reopened it, and learned about the first through a conflict banner.
--   • The live view exists now. An open plan joins a channel of its own (desktop main
--     process, `cloud/plan-live.ts`), shows who else has it open, and re-reads its spec and
--     its comments when one of these tables says they moved.
--
-- The cost the first note was worried about is bounded by that same design: an event
-- reaches ONLY a socket that subscribed to this plan (a filter on the plan's id), and only
-- if the reader could SELECT the row anyway (Realtime applies the tables' RLS to the stream).
-- Nobody streams whole specs for a page they are not looking at.
--
-- THREE PIECES, below: the publication, a helper that says whether a `plan:<uuid>` topic
-- names a plan the caller may read, and the two policies on `realtime.messages` that make
-- the presence channel PRIVATE.

-- ---------------------------------------------------------------------------
-- Publication
-- ---------------------------------------------------------------------------
-- WITHOUT `replica identity full`, unlike `agents`. The desktop's subscription is
-- payload-blind — an event only says "re-read" — so it never needs the previous values, and
-- `plan_sessions` rows carry the whole spec: a full old image would double every event's
-- weight for nothing. The filters the desktop sets (`plan_sessions.id`, and
-- `plan_comments.session_id` on INSERT and UPDATE) are evaluated against the NEW row, which
-- carries every column either way.
--
-- A comment DELETE is the one event no filter can reach: its old image is the primary key
-- alone. The desktop takes those unfiltered and re-reads only when the id is one of the
-- comments it is showing. Realtime does not run RLS on a DELETE, so what such an event
-- discloses to a subscriber is a comment's uuid and nothing else.
alter publication supabase_realtime add table public.plan_sessions;
alter publication supabase_realtime add table public.plan_comments;

-- ---------------------------------------------------------------------------
-- plan_topic_readable: may the caller join the presence channel of this topic?
-- ---------------------------------------------------------------------------
-- The channel is `plan:<session uuid>`, and the answer is the plan's own: whoever may read
-- the session may be on its channel, and nobody else. SECURITY INVOKER on purpose — the
-- `exists` below runs under the caller's RLS on `plan_sessions`, whose select policy is
-- `plan_readable` (20260925090000), so this states no rule of its own that could drift from
-- the one every plan read obeys.
--
-- THE SHAPE IS CHECKED BEFORE ANY CAST, and in plpgsql rather than SQL for that reason. A
-- malformed topic must answer false, not raise: an error in a policy is a failed JOIN with a
-- cast error in the log, and a SQL function is inlined into its caller, where the planner
-- may fold `substr(<literal>, 6)::uuid` before the guard ever runs.
create or replace function public.plan_topic_readable(p_topic text)
returns boolean
language plpgsql
security invoker
stable
set search_path = public, pg_temp
as $$
begin
  if p_topic is null
    or p_topic !~* '^plan:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.plan_sessions s
    where s.id = substr(p_topic, 6)::uuid
  );
end;
$$;

comment on function public.plan_topic_readable(text) is
  'True when the topic is plan:<uuid> and the current user may read that plan session '
  '(through plan_sessions RLS, i.e. plan_readable). False for any other topic, never an error.';

revoke execute on function public.plan_topic_readable(text) from public;
grant execute on function public.plan_topic_readable(text) to authenticated;

-- ---------------------------------------------------------------------------
-- realtime.messages: the `plan:` presence channels are private
-- ---------------------------------------------------------------------------
-- A PUBLIC `plan:<uuid>` channel would hand the address of everyone on a plan to any socket
-- that knows (or guesses from a shared link) its id. Private channels are authorized by
-- these policies, which Realtime evaluates as the joining user when they JOIN — not per
-- message, so a reader removed from a plan keeps their seat until they leave or reconnect.
--
-- SELECT lets a reader receive the channel's presence state and diffs; INSERT lets them
-- `track` themselves on it. Both are limited to the `presence` extension: nothing in the app
-- broadcasts on a plan channel, and a policy that does not need to allow it should not.
--
-- Named after the topic prefix they govern. Permissive, so they widen nothing on any other
-- private topic: a policy here only ever answers for `plan:<uuid>`.
drop policy if exists plan_topic_presence_select on realtime.messages;
create policy plan_topic_presence_select on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'presence'
    and public.plan_topic_readable(realtime.topic())
  );

drop policy if exists plan_topic_presence_insert on realtime.messages;
create policy plan_topic_presence_insert on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.plan_topic_readable(realtime.topic())
  );
