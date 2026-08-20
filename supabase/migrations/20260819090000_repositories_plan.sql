-- Migration: repositories.plan — settings for /magic:plan
--
-- Every per-repository option block already has its own jsonb column here
-- (`languages`, `commit`, `pull_request`, `resolve`, `issues`, `branches`). One
-- block per skill is the shape the table has, and `plan` is the block for the
-- skill that turns an idea into an epic and its stories, so it gets a column like
-- the rest. The alternative — folding it into an existing block — would put
-- settings for one skill under another skill's name, and every reader would have
-- to know about the exception.
--
-- Holds: tracker, jiraProject, issueTypes.{epic,story}, useRepoTemplates,
-- splitting, acceptanceCriteria, defaultLabels, assignToMe, duplicateCheck.
-- Nothing is validated at this level, deliberately, exactly as for the sibling
-- blocks: the desktop write path (updateRepositoryPlanSettings in
-- desktop/src/main/config/config.ts) owns the per-key whitelist, and the client
-- fills missing keys from DEFAULT_REPOSITORY_FIELDS on read. A jsonb column that
-- tried to enforce the schema would have to be migrated for every new option.
--
-- Defaults to '{}' rather than to the documented option defaults, again like its
-- siblings: an empty block means "nothing chosen here", and the client resolves
-- that to the defaults it ships. Writing the values into the database instead
-- would freeze today's defaults into every existing row and make changing one an
-- unmigratable decision.
--
-- Note this column is NOT covered by org shared config: OrgSharedConfig
-- (desktop/src/types.ts) carries languages, commit and pullRequest only, so
-- `plan` stays per-repository and an invitee does not inherit it. That is
-- intentional — the tracker and Jira project a repo files into are a property of
-- the repo, not of the team's house style.
--
-- `languages.ticket`, added in the same change, needs no migration: it lives
-- inside the existing `languages` jsonb.

alter table public.repositories
  add column if not exists plan jsonb not null default '{}'::jsonb;

comment on column public.repositories.plan is
  'Per-repository settings for /magic:plan (tracker, jiraProject, issueTypes, useRepoTemplates, splitting, acceptanceCriteria, defaultLabels, assignToMe, duplicateCheck). Same contract as the sibling option-block columns: unvalidated jsonb, ''{}'' means nothing chosen and the client fills from its shipped defaults. Not part of org shared config.';
