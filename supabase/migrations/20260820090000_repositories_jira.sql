-- Migration: repositories.jira — where this repo's Jira lives, for every skill
--
-- The Jira coordinates of a repository were split across two columns that each
-- held half of an address nobody can use alone:
--
--   issues.jiraUrl    -- 'https://acme.atlassian.net/browse/' — display only
--   plan.jiraProject  -- 'PROJ' — the key a write needs
--
-- That split is not a naming detail, it is a modelling error with two costs. The
-- first is that the halves live under the names of the things that happened to
-- need them first: the browse URL under `issues` (the /magic:pr and /magic:done
-- block), the project key under `plan` (the skill that files tickets). But every
-- skill that touches a ticket needs both — /magic:start resolves an id, /magic:pr
-- links one, /magic:plan creates them — so each reader had to know which foreign
-- block to reach into. The second is that the settings UI had to show them in two
-- different sections, which is exactly how a user ends up with a project key and
-- no site URL, or the reverse.
--
-- `jira` is that address in one place: the site, and the project key inside it.
--
-- WHY ITS OWN COLUMN
-- ---------------------------------------------------------------------------
-- Same reason 20260819090000 gave `plan` one: this table is one jsonb column per
-- option block, and folding a block into a neighbour puts settings under another
-- name and forces every reader to learn the exception. The difference is what the
-- block is ABOUT — `commit`, `resolve`, `pull_request` and `plan` are each one
-- skill's behaviour, while `jira` is a property of the REPOSITORY that all of them
-- read. It is closer to `remote_url` than to a skill block: identity, not taste.
--
-- `plan.tracker` deliberately stays in `plan`. Which tracker receives the tickets
-- an idea is broken into is a decision of the planning skill, and it can be
-- `github` on a repo that still has a Jira site set for its links.
--
-- NOT A SECRET, like remote_url: a Jira site URL and a project key are what every
-- member of the project already reads in their browser's address bar. No token and
-- no credential belongs here — the MCP calls run with the user's own Atlassian
-- login, and nothing about it ever reaches this table.

alter table public.repositories
  add column if not exists jira jsonb not null default '{}'::jsonb;

comment on column public.repositories.jira is
  'Where this repository''s Jira lives: {siteUrl, projectKey}. A property of the repo, read by every skill that touches a ticket — not one skill''s settings. Same contract as the sibling option-block columns: unvalidated jsonb, ''{}'' means nothing chosen and the client fills from its shipped defaults. Never a credential: the site URL and project key are public to the project, and the Atlassian calls use the member''s own login. Not part of org shared config.';

-- ---------------------------------------------------------------------------
-- Backfill — the two halves, joined
-- ---------------------------------------------------------------------------
-- Runs unconditionally over every row whose `jira` is still untouched, because a
-- repo that had either half configured must keep working the moment the clients
-- ship: the skills read `jira` first from then on, and an empty block would look
-- exactly like "this repo has no Jira" — the failure mode being that /magic:plan
-- refuses a run it used to accept (trackers.md §1.2), or files into GitHub what
-- belonged in a Jira backlog.
--
-- `nullif(..., '')` before `jsonb_strip_nulls` is what keeps an empty string out:
-- '' is the value the settings form writes when a field is cleared, and both
-- halves are read with `||` fallbacks on the client, where '' is falsy and simply
-- falls through. Storing it here would instead make `jira.siteUrl = ''` an
-- explicit answer that shadows the legacy key it was copied from.
--
-- `jira = '{}'` guards re-runs: `supabase db push` compares versions, not
-- content, so this file executes once — but a manual replay must not overwrite a
-- key someone has since set through the new UI.
update public.repositories
   set jira = jsonb_strip_nulls(jsonb_build_object(
         'siteUrl', nullif(issues->>'jiraUrl', ''),
         'projectKey', nullif(plan->>'jiraProject', '')
       ))
 where jira = '{}'::jsonb
   and (nullif(issues->>'jiraUrl', '') is not null
        or nullif(plan->>'jiraProject', '') is not null);

-- ---------------------------------------------------------------------------
-- The legacy keys are LEFT IN PLACE, on purpose
-- ---------------------------------------------------------------------------
-- `issues.jiraUrl` and `plan.jiraProject` are not deleted here, and no later
-- migration should drop them until the release that stops reading them has been
-- out long enough that nobody runs an older build.
--
-- The reason is that these columns are read by clients this migration cannot
-- update: a desktop app one version behind knows nothing about `jira`, and it
-- reads its Jira URL from `issues`. Deleting the key would blank that user's
-- settings from under them on a machine that never asked to be migrated. Leaving
-- it costs two dead strings per row and buys a rollback that loses nothing.
--
-- What the new clients do NOT do is keep writing them. Two writable copies of one
-- address is how they drift, and a drifted copy is worse than a stale one: the
-- read chain (`jira.siteUrl` || `issues.jiraUrl`) is only unambiguous while
-- exactly one end of it is ever written. So the legacy keys are frozen at
-- whatever they hold today — readable, never updated — and an older build shows
-- the value as it was when this migration ran.
