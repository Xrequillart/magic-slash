-- Migration: agents.type — what KIND of agent this is, declared rather than guessed
--
-- The desktop app has two kinds of agent. A `coder` runs the implementation cycle
-- (/magic:start → commit → pr → resolve → done); a `planner` runs /magic:plan, which
-- produces a spec and a ticket and never a branch or a PR. The two want different
-- sidebars, different status lists and different terminal states.
--
-- Until now the kind was INFERRED from `status`: `planning`/`planned` meant a planner,
-- anything else meant a coder. Three things were wrong with that. An agent that has
-- not announced a status yet has no kind at all, so a freshly created agent could not
-- be laid out. Renaming either status value silently changed the layout, with nothing
-- to catch it. And the fact was unqueryable: "how many planning sessions ran this
-- week" needed a scan over a status enum that was never meant to answer it.
--
-- So the kind is declared: the skills send it over the desktop's local /metadata route
-- (see skills/*/references/api.md), and the app sets it at agent creation.
--
-- A COLUMN rather than a jsonb field, unlike specPath and the rest of TerminalMetadata.
-- The rule this table already follows is that a fact other readers query, group or join
-- on earns a column — which is why ticket_id, description, branch_name, base_branch and
-- status have one while the remaining metadata does not (see CloudStore.toAgentRow).
-- The Team page and the back-office will both want to count agents by kind, and
-- admin_list_user_agents returns an explicit column allowlist, so a jsonb field would be
-- invisible to exactly the readers that need it.
--
-- Nullable, per this table's convention: NULL means "never declared", which is every
-- row written before today and every row an older desktop build writes from now on.
-- The app resolves an absent type to `coder` at read time and does NOT write that guess
-- back — a row that never chose must stay distinguishable from one that chose `coder`.
--
-- No RLS change: agents_update (20260725110000_agents_owner_scope.sql) already lets an
-- owner update their own row, and its WITH CHECK only concerns owner_id.

alter table public.agents add column if not exists type text;

comment on column public.agents.type is
  'What kind of agent this is: ''coder'' (implementation cycle) or ''planner'' '
  '(/magic:plan). NULL means the type was never declared — readers resolve that to '
  '''coder'', which is what every agent was before planning existed. Set by the skills '
  'via the desktop /metadata route and by the app at creation.';

-- Constrained, following repositories.remote_url (20260816090000) rather than
-- repositories.plan (20260819090000): this is a small closed enum stored as text, and a
-- typo'd value would silently lay an agent out as the wrong kind rather than fail. NULL
-- stays legal — it is the "never declared" case above, not a violation.
alter table public.agents drop constraint if exists agents_type_check;
alter table public.agents add constraint agents_type_check
  check (type is null or type in ('coder', 'planner'));

-- Backfill from the inference this column replaces, so history keeps its meaning: the
-- agents that ran /magic:plan before today are the ones whose status stopped at
-- `planning` or `planned`.
--
-- Only those. Everything else is deliberately left NULL rather than stamped `coder`:
-- reading NULL as `coder` is already the app's rule, and writing it in would destroy
-- the distinction between "was a coder" and "never said", which is the one thing this
-- backfill cannot know. Archived rows are included — the History page still resolves
-- them, and their kind is as true as any other row's.
update public.agents
   set type = 'planner'
 where type is null
   and status in ('planning', 'planned');
