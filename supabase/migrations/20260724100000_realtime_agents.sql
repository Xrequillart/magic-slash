-- ---------------------------------------------------------------------------
-- Realtime for org agents
-- ---------------------------------------------------------------------------
-- Add public.agents to the supabase_realtime publication so INSERT/UPDATE/DELETE
-- events stream to subscribed clients. Access is still governed entirely by the
-- existing org-scoped RLS on the table (agents_select = is_org_member(org_id)):
-- Realtime enforces the SAME row-level policies on the socket, so a member of
-- org A never receives change events for org B's agents.
--
-- REPLICA IDENTITY FULL makes the previous row values (`old`) available on
-- UPDATE/DELETE events — required so DELETE payloads carry the row id (and RLS
-- can be evaluated against the deleted row) rather than only the primary key.
alter publication supabase_realtime add table public.agents;
alter table public.agents replica identity full;
