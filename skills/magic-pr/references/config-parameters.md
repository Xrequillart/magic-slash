# Configuration parameters

Parameter tables for `/magic:pr`, moved out of `SKILL.md` (Configuration). Every value is read from
the live config fetched in Step 0 and kept in memory. For each parameter, check the repo config; if
no value is defined, use the default value.

## Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------- |
| PR language         | `.repositories.<name>.languages.pullRequest` | `"en"`  |
| Jira language       | `.repositories.<name>.languages.jiraComment` | `"en"`  |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"`  |

## Pull Request parameters

| Parameter            | Repo path                                             | Default | Description                                       |
| -------------------- | ----------------------------------------------------- | ------- | ------------------------------------------------- |
| Auto-link tickets    | `.repositories.<name>.pullRequest.autoLinkTickets`    | `true`  | Add Jira/GitHub links in the PR                   |
| Watch CI             | `.repositories.<name>.pullRequest.watchCI`            | `true`  | Watch checks and review feedback after Step 7, and keep the preview URL in the test scenarios current (off: local-only) |
| Test accounts        | `.repositories.<name>.pullRequest.testAccounts`       | `'off'` | Test-account mode: `off` / `reference` / `inline` |
| Test accounts source | `.repositories.<name>.pullRequest.testAccountsSource` | `''`    | Explicit source file path or project-skill name   |
| Template checkboxes  | `.repositories.<name>.pullRequest.templateCheckboxes` | `'never'` | Which boxes of a project PR template may be ticked: `never` / `type` / `all` (Step 6.1) |
| Body verbosity       | `.repositories.<name>.pullRequest.bodyVerbosity`      | `'concise'` | How long the PR body may be: `concise` / `normal` / `detailed` (Step 6.1) |

## Issues parameters

| Parameter     | Repo path                                 | Default | Description                    |
| ------------- | ----------------------------------------- | ------- | ------------------------------ |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true`  | Add a comment with the PR link |

## Branch confirmation

Moved from `SKILL.md` (Branch configuration, item 3). Always confirm the development branch with
the user using `AskUserQuestion`, unless an argument was provided.

### If a default is configured (e.g., `"develop"`)

Use `AskUserQuestion` with the text from **`MSG_BRANCH_CONFIRM`** (substituting `{branch}`).

- **Empty / short confirmation** ("oui", "yes", "ok", "go"): Use the configured default branch
- **Another branch name** (e.g., "develop", "staging"): Use that branch instead

### If no default is configured

Use `AskUserQuestion` with the text from **`MSG_BRANCH_ASK`**.

## Ticket ID from the branch name (Step 0.1)

If no ID is detected from the worktree name, try extracting from the **current branch name**: Jira
`feature/PROJ-123-description` → `PROJ-123`; GitHub `feature/magic-slash-268-rebuild-the-landing-page`
→ `268`. A branch carries the repo name to keep two repos' issue numbers apart — the ticket id never
does, so strip that prefix down to the bare number rather than passing `magic-slash-268` on.

## Base branch fallback (Step 6.0)

If `$DEV_BRANCH` was not resolved earlier (e.g., the branch configuration section was skipped), fall back to dynamic detection:

```bash
BASE_BRANCH=$(git remote show origin | grep 'HEAD branch' | cut -d: -f2 | xargs)
if ! git rev-parse --verify origin/$BASE_BRANCH >/dev/null 2>&1; then
  BASE_BRANCH="main"
fi
if ! git rev-parse --verify origin/$BASE_BRANCH >/dev/null 2>&1; then
  BASE_BRANCH="master"
fi
```

Otherwise, set `BASE_BRANCH=$DEV_BRANCH`.
