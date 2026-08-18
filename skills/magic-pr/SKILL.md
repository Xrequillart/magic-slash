---
name: magic:pr
description: Pushes code, creates a GitHub Pull Request, and updates the linked Jira/GitHub ticket. Use this skill when the user indicates their coding work is done and they want to create or finalize a PR — even if they don't explicitly say "PR". Triggers on phrases like: "done", "terminé", "j'ai fini", "create PR", "créer la PR", "ready for PR", "prêt pour la PR", "ship it", "envoie la sauce", "let's get this merged", "push my changes", "pousse tout ça", "wrap it up", "c'est bon pour moi", or any completion signal in English or French.
argument-hint: <base-branch> (optional, e.g., develop, staging)
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Agent, Skill, mcp__github__*, mcp__atlassian__*, AskUserQuestion
---

# magic-slash v0.73.0 - /pr

> Follow each step in order. Skipping steps leads to broken PRs, stale Jira tickets, or a desynchronized Desktop UI.
>
> **Key steps**:
> - **Step 2**: Pre-push validation — catches lint/type errors before they block the push
> - **Step 3**: Push to remote — the PR needs code on the remote
> - **Step 6**: Create the Pull Request — the core deliverable of this skill
> - **Step 6.1.1**: Resolve the test accounts — the reviewer cannot test what they cannot log into (skipped entirely by default)
> - **Step 6.4**: Update Magic Slash metadata — keeps the Desktop app UI in sync
> - **Step 6.5**: Announce the PR to the user — they need the link before anything long-running starts
> - **Step 7**: Update the Jira/GitHub ticket — closes the feedback loop with the team
> - **Step 7.4**: Watch the CI and review feedback — turns the PR from "created" into "actually green"

You are an assistant that finalizes a task by pushing commits, creating a PR, updating the Jira/GitHub ticket, and then watching the PR until its checks are green and its review feedback is handled.

## Configuration

Read the live config in Step 0 **once** and keep it in memory for the entire workflow. Shell variables do not survive between bash blocks, so a later block must re-fetch it rather than reuse `$CONFIG_FILE`.

Determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------- |
| PR language         | `.repositories.<name>.languages.pullRequest` | `"en"`  |
| Jira language       | `.repositories.<name>.languages.jiraComment` | `"en"`  |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"`  |

## Branch configuration

Read the live config fetched in Step 0 (kept in memory — `$CONFIG_FILE` does not survive into later bash blocks) to determine the development branch:

1. Once the repo is identified, read `.repositories.<name>.branches.development`
2. If an argument is provided (e.g., `/magic:pr develop`), use it directly as `$DEV_BRANCH` and skip confirmation.
3. Otherwise, **always confirm with the user** using `AskUserQuestion`:

#### If a default is configured (e.g., `"develop"`)

Use `AskUserQuestion` with the text from **`MSG_BRANCH_CONFIRM`** (substituting `{branch}`).

- **Empty / short confirmation** ("oui", "yes", "ok", "go"): Use the configured default branch
- **Another branch name** (e.g., "develop", "staging"): Use that branch instead

#### If no default is configured

Use `AskUserQuestion` with the text from **`MSG_BRANCH_ASK`**.

4. Store the result as `$DEV_BRANCH`.

### Pull Request parameters

| Parameter            | Repo path                                             | Default | Description                                       |
| -------------------- | ----------------------------------------------------- | ------- | ------------------------------------------------- |
| Auto-link tickets    | `.repositories.<name>.pullRequest.autoLinkTickets`    | `true`  | Add Jira/GitHub links in the PR                   |
| Watch CI             | `.repositories.<name>.pullRequest.watchCI`            | `true`  | Watch checks and review feedback after Step 7     |
| Test accounts        | `.repositories.<name>.pullRequest.testAccounts`       | `'off'` | Test-account mode: `off` / `reference` / `inline` |
| Test accounts source | `.repositories.<name>.pullRequest.testAccountsSource` | `''`    | Explicit source file path or project-skill name   |

### Issues parameters

| Parameter     | Repo path                                 | Default | Description                    |
| ------------- | ----------------------------------------- | ------- | ------------------------------ |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true`  | Add a comment with the PR link |

## Step 0: Check configuration and detect multi-repo worktrees

### 0.0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
# Magic Slash Desktop is the single source of truth (Supabase). The port comes from the
# environment inside an app terminal, and from the file the app publishes anywhere else —
# so a Claude started from a plain terminal reaches the same live config.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
CONFIG_FILE=""
if [ -n "$MS_PORT" ]; then
  MS_TMP_CONFIG="$(mktemp)"
  trap 'rm -f "$MS_TMP_CONFIG"' EXIT
  # A published port may name a server that has since died: -sf turns that into a failure.
  if curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config" -o "$MS_TMP_CONFIG" 2>/dev/null \
     && [ "$(jq '.repositories | length' "$MS_TMP_CONFIG" 2>/dev/null || echo 0)" -gt 0 ]; then
    CONFIG_FILE="$MS_TMP_CONFIG"
  fi
fi
if [ -z "$CONFIG_FILE" ]; then
  # Display MSG_APP_NOT_RUNNING and stop
fi
```

If the config could not be read, the app is not running: display **`MSG_APP_NOT_RUNNING`** and stop. Never proceed on a guessed config.

### 0.1: Extract the ticket ID from the current worktree

Get the current directory name and extract the ticket ID:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extract the TICKET-ID using the pattern and store it as `$TICKET_ID`:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ID is detected from the worktree name, try extracting from the **current branch name** (e.g., `feature/PROJ-123-description` → `PROJ-123`). If still no ID is found, `$TICKET_ID` remains empty — the user will be asked later (Step 8) if they want to link a ticket.

Skip worktree detection (Steps 0.2–0.4) if you are in a regular repo, not a worktree, and proceed to **Step 1**.

### 0.2: Search for associated worktrees

Using the config already loaded in the Configuration step, retrieve the list of configured repos with their paths.

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For example, if TICKET-ID = `PROJ-123` and the repos are `/projects/api` and `/projects/web`, search for:

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collect all found worktrees.

### 0.3: Check unpushed commits in each worktree

For each found worktree, check if there are commits to push:

```bash
git -C {WORKTREE_PATH} log origin/$(git -C {WORKTREE_PATH} branch --show-current)..HEAD --oneline 2>/dev/null
```

Keep only the worktrees that have unpushed commits.

### 0.4: Summary and confirmation

If multiple worktrees have commits to push, display **`MSG_MULTI_REPO_SUMMARY`**, substituting `{TICKET-ID}` and the worktree list with commit counts.

If multi-repo detected, execute **Steps 1 to 7** for EACH worktree that has commits.
Change directory before each cycle:

```bash
cd {WORKTREE_PATH}
```

At the end of each PR, display a confirmation before moving to the next worktree.
The Jira/GitHub ticket (Step 7) must be updated **ONLY ONCE** at the end, with links to ALL created PRs.

### Multi-repo partial failure handling

If a worktree fails during its PR cycle (push error, API failure, etc.):

1. **Do not stop the entire process** — log the failure for this worktree
2. **Continue to the next worktree** after displaying **`MSG_MULTI_REPO_FAILURE`**, substituting `{worktree-name}` and `{error reason}`
3. **Include failed worktrees in the Step 8 summary** with their error status

## Step 0.6: Detect and activate Node.js version

Read `references/node-setup.md` to detect the Node.js version manager and set `$NODE_PREFIX`.

**For multi-repo**: Re-execute this step each time you switch to a different worktree, as each repo may require a different Node.js version.

---

## Step 1: Get the current branch

```bash
git branch --show-current
```

Verify that you are not on `main` or `master`.
If so, display **`MSG_ON_MAIN_BRANCH`** and stop.

## Step 1.1: Check for existing PR

Before pushing and creating a new PR, check if a PR already exists for this branch:

Use `mcp__github__list_pull_requests` with the `head` parameter (format: `{owner}:{branch}`) to search for open PRs matching the current branch.

- **If an open PR exists**: Use `AskUserQuestion` with the text from **`MSG_PR_EXISTS`** (substituting `{number}` and `{url}`). Options:
  1. Stop here (PR already exists)
  2. Continue (push new commits to the existing PR)
- **If no PR exists**: Proceed to Step 2.

## Step 2: Pre-push validation

Before pushing, run a quick validation to catch issues that would cause push hooks to fail.

### 2.1: Detect the project's verification command

Detect the appropriate validation command for the project:

1. Check `package.json` scripts for common verification commands:
   - `"lint"` → `npm run lint` (or yarn/pnpm equivalent)
   - `"typecheck"` or `"type-check"` → `npm run typecheck`
   - `"check"` → `npm run check`
2. For non-Node.js projects, detect common tools:
   - Python: `mypy`, `ruff check`, `flake8`
   - Go: `go vet ./...`
   - Rust: `cargo check`
3. If no verification command is found, skip this step

### 2.2: Run validation

Run the detected command:

```bash
# Example for Node.js projects:
$NODE_PREFIX npm run lint
```

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.6, prepend it to any validation command.

### 2.3: Handle validation results

- **All checks pass**: Proceed to Step 3
- **Checks fail**: Use `AskUserQuestion` with the text from **`MSG_PRE_PUSH_VALIDATION`** (substituting `{error output}`). Options:
  1. Fix the issues and re-validate (repeat up to 3 times)
  2. Proceed anyway (issues may be caught by push hooks)
  3. Abort

## Step 3: Push to remote

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.6, prepend it to the `git push` command so that pre-push hooks run with the correct Node.js version.

```bash
# If $NODE_PREFIX is set (e.g. nvm):
source ~/.nvm/nvm.sh && nvm use && git push -u origin <branch-name>

# If $NODE_PREFIX is empty:
git push -u origin <branch-name>
```

### 3.1: Push hook error handling

If the push fails (non-zero exit code), analyze the error:

**Error classification by level**:

| Level          | Error type    | Examples                               | Action              |
| -------------- | ------------- | -------------------------------------- | ------------------- |
| 1 - Auto       | **Formatter** | Prettier, Black, gofmt                 | Fix automatically   |
| 2 - Semi-auto  | **Linter**    | ESLint --fix, Pylint, Flake8, Rubocop  | Fix and inform      |
| 3 - Manual     | **Type check**| TypeScript, mypy                       | **Ask the user**    |
| 3 - Manual     | **Tests**     | Jest, pytest (if in pre-push)          | **Ask the user**    |
| 3 - Manual     | **Other**     | Secrets detected, files too large      | **Ask the user**    |

#### For level 3 errors (manual)

These errors require human intervention because automatic fixes could introduce regressions.

Use `AskUserQuestion` with the text from **`MSG_PUSH_ERROR_MANUAL`** (substituting `{error message}`). Options:
1. Fix manually and retry
2. Skip this check (`--no-verify`) — warn the user if they choose this
3. Abort push

#### Automatic correction process (levels 1 and 2 only)

1. **Analyze the error output** to identify:
   - The affected files
   - The problematic lines
   - The error type (lint, format, type, etc.)

2. **Fix the code**:
   - Read the files with errors
   - Apply the necessary corrections
   - For formatting, run the formatter if available: `npx prettier --write`, `black`, etc.
   - **Remember to prepend `$NODE_PREFIX`** (from Step 0.6) to any Node.js command (npx, npm, yarn, pnpm)

3. **Re-stage and commit the corrected files**:

   ```bash
   git add <corrected-files>
   git commit --amend --no-edit
   ```

4. **Retry the push** (remember to prepend `$NODE_PREFIX` if set):

   ```bash
   git push -u origin <branch-name>
   ```

5. **Repeat up to 3 times maximum**. If the push still fails after 3 attempts,
   display a detailed error message and ask the user to intervene.

Display **`MSG_PUSH_AUTO_FIX`** during the correction process, substituting the error details and fix results.

## Step 4: List commits for the PR

```bash
git log origin/$DEV_BRANCH..HEAD --oneline
```

Retrieve the list of commits that will be included in the PR.

## Step 4.1: Understand the changes for the PR description

Always start with the overview to avoid loading a massive diff into context:

```bash
git diff origin/$DEV_BRANCH..HEAD --stat
```

Then selectively read the **key files** (business logic, API routes, components) to understand the actual changes:

1. From the `--stat` output, identify key files vs secondary files (tests, config, types, lock files)
2. Read key modified files individually using `Read` to understand the changes in context
3. While reading, note the user-visible surfaces touched (routes/pages, UI components, API endpoints, CLI commands), the test environment needed (env vars, seed data, a service to run) and — when a touched surface is behind a login — which test account a reviewer would need (which role/persona, not the credential itself: that is resolved in Step 6.1.1) — this is the raw material for the manual test scenarios in Step 6
4. Use this understanding to write a meaningful summary and concrete testing instructions in Step 6

Only use `git diff origin/$DEV_BRANCH..HEAD` for small changes (< 10 files, < 200 lines total). For anything larger, the selective approach above produces better PR descriptions while consuming far less context.

## Step 5: Retrieve the project's PR template

Check if a PR template exists in the project:

```bash
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null || cat .github/pull_request_template.md 2>/dev/null || cat docs/pull_request_template.md 2>/dev/null || echo ""
```

If a template exists, you must **strictly follow it** and fill in its sections. For any section related to testing (e.g., "Testing", "How to test", "Test Steps", "Comment tester", "Vérification"), you must **analyze the diff from Step 4.1** to fill it with concrete, specific testing steps based on the actual code changes. Do NOT use generic placeholders. The same rules as the default template apply: write numbered manual scenarios from the user's point of view (each pairing an action with its observable expected result), never "run the automated tests" as the sole content, and — if the PR has no manually testable surface (docs-only, CI, pure refactor) — state that plainly instead of inventing a scenario.

**Record the exact heading of the testing section you filled** (e.g. `## Testing`, `### Test Steps`, `## Vérification`, `## QA`). Step 6.1.1 needs it: a project template replaces `MSG_PR_TEMPLATE_EN`/`MSG_PR_TEMPLATE_FR` entirely, so that heading is the only place the test-account line can be injected. If the template has no testing section at all, note that too — Step 6.1.1 then has nowhere to inject and emits nothing.

## Step 5.1: Check for conflicts with base branch

Before creating the PR, check if there are merge conflicts with the base branch:

```bash
git fetch origin $DEV_BRANCH --quiet
git merge-tree $(git merge-base HEAD origin/$DEV_BRANCH) HEAD origin/$DEV_BRANCH | grep -c "^<<<<<<<" 2>/dev/null || echo "0"
```

If conflicts are detected, use `AskUserQuestion` with the text from **`MSG_CONFLICTS_DETECTED`** (substituting `{base_branch}`). Options:
1. Create the PR anyway (resolve conflicts later)
2. Abort and resolve conflicts first

If no conflicts, proceed directly to Step 6.

## Step 6: Create the Pull Request via MCP GitHub

> This is the core deliverable — without the PR, the entire workflow has no output.

### 6.0: Resolve the base branch

Use `$DEV_BRANCH` (resolved from the branch configuration above) as the base branch for the PR.

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

### 6.1: Generate PR title and description

Prepare the PR content:

- **Title**: Based on the branch name or the first commit
  - If the branch contains a ticket ID (e.g.: `feature/PROJ-123`), use the format: `[PROJ-123] Description`
- **Description**:
  - **If a PR template exists**: Use it and fill in all its sections
  - **Otherwise**: Use the default template matching `.languages.pullRequest` (see **`MSG_PR_TEMPLATE_EN`** / **`MSG_PR_TEMPLATE_FR`**)
  - **Add a "Linked Issues" section** with the ticket link (unless `autoLinkTickets` is `false`)

> **CRITICAL — Markdown formatting**: The `body` parameter MUST contain actual line break characters, NOT the two-character literal sequence `\n`. This is verified automatically in Step 6.2.1.

### 6.1.1: Resolve the test accounts for the testing section

Read `pullRequest.testAccounts` from the config already loaded in the Configuration step. Default: `'off'`. Read `pullRequest.testAccountsSource` the same way. Default: `''`.

**If `testAccounts` is `off`** (the default), or is any value other than `reference` / `inline`: **skip this sub-step entirely**. Do not run the cascade, do not call `gh`, do not add a line, and do not mention test accounts anywhere — not in the PR body, not in the chat. A PR built with `off` must be byte-for-byte what it would have been without this sub-step.

**Otherwise**, read `references/test-accounts.md` and follow it: it holds the mode definitions, the four-tier discovery cascade, the source guardrails (`.env*` / `secrets/` / keychain / git-ignored blacklist and the `git check-ignore` check), the public-repo guard, and the exact shape of the line to emit. Do not improvise the resolution — in particular, never read a git-ignored file and never invent an account.

If `references/test-accounts.md` is missing on disk, treat the mode as `off`, say so in one line, and continue. `/magic:start` degrades identically, so the two skills never disagree about the same repo.

**Where the line goes** — the injection target is *whichever testing section the PR body actually has*, using the same "either header" logic as self-check item 5:

1. Locate the testing section under EITHER the default headers (`## How to test` / `## Comment tester`) when `MSG_PR_TEMPLATE_EN`/`MSG_PR_TEMPLATE_FR` was used, OR the project-template heading recorded in Step 5 (any testing-related heading such as `## Testing`, `### Test Steps`, `## Vérification`, `## QA`) when a project template was used.
2. Fold the resolved account into that section's prerequisites line — the single setup line that already carries env vars, seed data and services. Create that line if the section has none.
3. **If the cascade resolved nothing** (tier 4), the section still gets exactly one line stating that — `No test account documented for this project` in EN, `Aucun compte de test documenté pour ce projet` in FR, written in `languages.pullRequest`. This is what the ticket requires: the reviewer must be told that no account exists rather than left guessing whether one was omitted. Display **`MSG_TEST_ACCOUNTS_NOT_FOUND`** in the chat as well, and never add a credential — an empty section is not an acceptable substitute, and neither is an invented account.
4. If neither header form is present (a project template with no testing section at all), emit nothing into the body and say so in one line. Never add a heading the template does not have.

This step **must not** be implemented by editing the two default templates only: a repo with its own `.github/PULL_REQUEST_TEMPLATE.md` never renders `MSG_PR_TEMPLATE_EN`/`MSG_PR_TEMPLATE_FR` at all (Step 6.1), so template-only injection would make `reference` and `inline` silently no-ops on exactly the repos most likely to use them.

**For multi-repo**: re-execute this sub-step in each worktree cycle. `testAccounts` is per-repo config and two repos rarely share a login — see the multi-repo section of `references/test-accounts.md`.

### Linked Issues section (by default, unless autoLinkTickets: false)

Add this section at the end of the PR description.

For **Jira** tickets: only if `integrations.atlassian` is `true`. If `false`, skip the Jira link — use the ticket ID as plain text without a URL.

For **Jira** tickets (when Atlassian is enabled), adapt the Jira URL based on the user's domain (retrieved via `mcp__atlassian__getAccessibleAtlassianResources`):

```markdown
## Linked Issues

- Jira: [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)
```

For **GitHub** issues, use the `closes` keyword for automatic linking:

```markdown
## Linked Issues

- Closes #123
```

### 6.2: Preview and confirm before creation

Use `AskUserQuestion` with the text from **`MSG_PR_PREVIEW`** (substituting `{title}`, `{base_branch}`, `{head_branch}`, and `{description_preview}` — first 10 lines of the description). Options:
- **Y/O** or Enter: Proceed with creation
- **n**: Abort
- **edit**: Let the user modify the title or description before creation

### 6.2.1: Verify and fix formatting before creation

After the user confirms, verify the PR body before passing it to the MCP tool. If any check fails, **reconstruct the body from scratch** and re-verify (max 2 retries).

**Checks to perform on the `body` string:**

1. **No literal escape sequences**: the body must not contain the two-character sequences `\n`, `\t`, or `\r`. These must be actual line break characters. This is the most common failure — it causes GitHub to render the entire PR as a single unreadable paragraph.
2. **No unfilled template placeholders**: the body must not contain instruction text inside square brackets (e.g., `[Concise summary of changes]`, `[List of commits]`). Every `[instruction]` from the template must have been replaced with actual content.
3. **Required section headers present**: the body must contain at least `## Summary` and `## Changes` as distinct lines (or their FR equivalents `## Résumé` and `## Changements` if `languages.pullRequest` is `"fr"`).
4. **Non-empty sections**: each section heading must be followed by at least one non-blank line of actual content before the next heading or end of body.
5. **Testing section is a real manual scenario**: locate the testing section under EITHER the default headers (`## How to test` / `## Comment tester`) OR any testing-related project-template heading (e.g. `## Testing`, `### Test Steps`, `## Vérification`, `## QA`) — whichever is present. The section PASSES if it meets EITHER of these conditions:
   - **Manual scenario**: contains at least one numbered step (a line starting with `1.`) and does NOT consist solely of a test command (e.g. only "run npm test" / "lancer npm test"). A single automated-test line is acceptable only as an optional last line after the manual steps.
   - **No-surface declaration**: explicitly states there is no manual test surface (docs-only/CI/pure refactor), e.g. "No manual test surface — docs-only change; verify rendering / links". In this case a numbered step is NOT required.

   **Test accounts** — every check below is scoped to the **located testing section only**, never to the whole body. A PR whose own subject is test accounts (this feature, a login page, a seed script) legitimately names accounts and credentials in its Summary or Changes sections, and must not fail its own self-check for doing so.
   - **(a)** If `pullRequest.testAccounts` is not `off`, that section MUST carry the outcome of Step 6.1.1 — either the resolved account line, or the "No test account documented for this project" / "Aucun compte de test documenté pour ce projet" line when the cascade found nothing. Both are valid outcomes; a section that says nothing about accounts at all means the injection failed and this check fails. (Exception: a project template with no testing section, where Step 6.1.1 has nowhere to inject.)
   - **(b)** If `pullRequest.testAccounts` IS `off`, that section must carry **no test-account output of this feature** — no resolved account line, no "no test account documented" note, no "log in with…" placeholder. What it must NOT do is fail a PR whose own subject is test accounts: a manual step like "set `testAccounts` to `reference` and check the body points at `TESTING.md`" is a legitimate test instruction, not a leak. Fail only when the section carries the *output* of Step 6.1.1, which at `off` never ran.
   - **(c)** No invented or placeholder credential ever ships, in any mode: that section must not contain a credential the resolved source did not actually document. Reject on sight anything of the form `test@example.com`, `user@test.com`, `admin/admin`, `password123`, `changeme`, `<your-password>`, or a made-up token — even when it "looks plausible". If Step 6.1.1 found nothing, the correct section carries the "no test account documented" line and no credential at all.
   - **(d)** In `reference` mode (including a `reference` reached by the public-repo downgrade), that section must contain no password, token or API key — only a pointer plus the role to use.

**If any check fails:**
- Log which check(s) failed
- Reconstruct the body from the commits and diff (re-read if needed)
- Re-verify the reconstructed body
- After 2 failed retries, show the body to the user with `AskUserQuestion` and ask them to fix it manually

### 6.3: Create the PR

Use `mcp__github__create_pull_request`:

- **Base**: The branch resolved in step 6.0
- **Head**: The current branch

If the PR creation fails, retry once. If it fails again, display **`MSG_PR_CREATION_FAILED`** and ask the user if they want to: (1) Retry, (2) Create the PR manually on GitHub. Display the branch name and base branch to help with manual creation.

## Step 6.4: Update Magic Slash metadata

> This updates the Magic Slash Desktop UI with the PR link, status, and title. Without it, the user sees stale data in the app. Always run this after creating the PR.

After creating the PR, update the title, status and PR link of the agent:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n '✅ PR #{PR_NUMBER} - {TICKET_ID}' | jq -sRr @uri)&status=PR%20created&prUrl=$(echo -n '{PR_URL}' | jq -sRr @uri)&prRepo=$(echo -n "$PWD" | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Replace:
- `{PR_NUMBER}`: The created PR number (e.g.: `42`)
- `{TICKET_ID}`: The ticket ID (e.g.: `PROJ-123`)
- `{PR_URL}`: The full PR URL (e.g.: `https://github.com/org/repo/pull/42`)

This command is silent and never blocks the process.

## Step 6.5: Announce the created PR

> Announce **immediately** after creation, before the ticket update and before the watch phase. Everything that follows can take tens of minutes; the user must have the link in hand before that starts, not after.

Display **`MSG_PR_CREATED`**, substituting:

- `{PR_NUMBER}`: the PR number returned by Step 6.3 (e.g. `42`)
- `{PR_TITLE}`: the PR title as created
- `{PR_URL}`: the full PR URL
- `{base_branch}` / `{head_branch}`: the branches resolved in Steps 6.0 and 1

The number and title must appear together on one line in the `#{PR_NUMBER} — {PR_TITLE}` form, and the URL must be printed bare (no markdown link wrapper) so the terminal makes it clickable.

Do not merge this announcement into the Step 7.3 summary. They serve different moments: this one confirms the PR exists, the other closes the whole workflow.

## Step 7: Update the Jira/GitHub ticket

Use `$TICKET_ID` (extracted in Step 0.1). If `$TICKET_ID` is empty, use `AskUserQuestion` to ask the user if they want to link a ticket manually (and which one). If they decline, skip to Step 7.3.

### 7.0: Check Atlassian integration

Read `integrations.atlassian` from the live config fetched in Step 0. Default: `true`.

If `integrations.atlassian` is `false`, skip Step 7.1 entirely (Jira ticket update). Only execute Step 7.2 (GitHub issues).

### 7.1: Jira tickets (pattern `[A-Z]+-\d+`)

If a Jira ticket ID is found, use the MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Change the status** to "To be reviewed" (or equivalent) with `mcp__atlassian__transitionJiraIssue`
   - If the "To be reviewed" status doesn't exist, try: "In Review", "Code Review", "Review"
3. **Add a comment** with the PR link via `mcp__atlassian__addCommentToJiraIssue`
   (unless `commentOnPR` is `false`)
   - Use **`MSG_JIRA_COMMENT`** for the comment body

### 7.2: GitHub issues (numeric pattern `#\d+`)

If a GitHub issue ID is found:

1. **Add a comment** on the issue with the PR link via `mcp__github__add_issue_comment`
   (unless `commentOnPR` is `false`)
   - Use **`MSG_GITHUB_ISSUE_COMMENT`** for the comment body
2. **Update labels** (optional): If the issue has a "todo" or "in progress" label, update it to "in review" if that label exists via `mcp__github__update_issue`

> Note: The `closes #123` keyword in the PR description (from Step 6.1) will automatically close the issue when the PR is merged. No need to close it manually here.

## Step 7.3: Final summary

Display **`MSG_SUMMARY`**, substituting `{branch}`, `{PR_URL}`, `{PR_NUMBER}`, `{TICKET_ID}`, and `{ticket_status}`.

`MSG_SUMMARY` has two variants — pick based on `pullRequest.watchCI` (from the config loaded in the Configuration step, default `true`), taking into account the skip conditions listed in Step 7.4.0:

- **`watchCI` is `true`**: use the **watch** variant, whose next-steps announce that the watch phase is starting. Then continue to Step 7.4.
- **`watchCI` is `false`**: use the **manual** variant (the classic "wait for CI, then run /magic:review" list) and stop here — skip Step 7.4 entirely.

## Step 7.4: Watch the CI and handle review feedback

> This is what turns "the PR is created" into "the PR is actually mergeable". Without it, the user has to come back later to discover a red pipeline or an unread Greptile review.

Read `references/ci-watch.md` before executing this step — it holds the watcher contract, the exact `gh` commands, the time budget, and the report schema. Do not improvise the polling logic.

### 7.4.0: Check whether watching is enabled

Read `pullRequest.watchCI` from the config already loaded in the Configuration step. Default: `true`.

If `watchCI` is `false`, skip the whole of Step 7.4.

Also skip (and say so in one line) when any of these hold — watching would just burn 30 minutes for nothing:

- `gh` is not available or not authenticated (`gh auth status` fails)
- The PR was created as a draft
- Step 1.1 found an existing PR and the user chose to stop

### 7.4.1: Resolve the watcher inputs

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
git rev-parse HEAD
```

Combined with `$PR_NUMBER` (Step 6.3) and the head branch (Step 1), these are the four values the watcher needs.

### 7.4.2: Launch the watcher sub-agent

Launch an `Agent` (subagent_type=`general-purpose`) with `run_in_background: false`.

The prompt must contain, and nothing more:

1. The four inputs from Step 7.4.1 (PR number, repo slug, head branch, head SHA)
2. An instruction to read `~/.claude/skills/magic-pr/references/ci-watch.md` and follow it exactly
3. The reminder that it is a **read-only observer**: it must not edit files, commit, push, or comment on the PR
4. The requirement to return the JSON report from that document as its entire final message

Keeping the watcher in a sub-agent is deliberate: 30 minutes of polling output stays out of the main context, and only the compact report comes back.

If the sub-agent returns something that is not parseable as the report schema, do not retry the whole watch — fall back to a single direct snapshot (`gh pr checks "$PR_NUMBER" --json bucket,name,state,link,workflow`) and treat that as the report.

### 7.4.3: All green, no feedback — finish here

When `checks.state` is `all_passed` (or `no_checks`) **and** `review.actionable_count` is `0`:

1. Display **`MSG_CI_ALL_GREEN`**, substituting `{PR_NUMBER}`, `{PR_URL}`, `{passed}`/`{total}`, `{waited}` (minutes), and `{reviewers}` (the bots that reported nothing actionable, or `—`)
2. Update the metadata status:

   ```bash
   [ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=CI%20green" > /dev/null 2>&1 || true
   ```

3. **Stop.** The work is done — do not chain into `/magic:review` or `/magic:resolve`, and do not ask the user for anything else.

### 7.4.4: Checks failed — auto-fix loop

Handle CI failures **before** review comments: a fix push re-triggers both the checks and the review bots, which invalidates any comment list gathered earlier.

Display **`MSG_CI_FAILED`**, substituting `{PR_NUMBER}`, `{failed}`/`{total}`, and the failure list (each with `{name}`, `{error_class}`, `{diagnosis}`, `{link}`).

Then run up to **3** fix rounds. For each round:

1. **Fix**: for each failure, read the files named in `suspected_files`, reproduce locally when the failing command is available in the project (`npm run lint`, `npm test`, `tsc --noEmit`…), and apply the correction with `Edit`. Prepend `$NODE_PREFIX` (Step 0.6) to any Node.js command.
2. **Validate**: re-run the detected verification command from Step 2.1 locally before pushing. A fix that does not pass locally will not pass in CI either.
3. **Commit**: one commit per round, scoped to the CI fix:

   ```bash
   git add <fixed-files>
   git commit -m "fix(ci): <what was broken>"
   ```

   Follow the repo's commit `format`/`style` config, as `/magic:commit` does.
4. **Push**: `git push` (with `$NODE_PREFIX` if set).
5. **Re-launch the watcher** (Step 7.4.2) against the new head SHA and re-evaluate from Step 7.4.3.

Display **`MSG_CI_AUTO_FIX`** at each round, substituting `{attempt}`, `{fixes}` (what was changed), and `{COMMIT_SHA}`.

**Failures that must not be auto-fixed** — report them and stop the loop immediately:

- Secrets or credentials detected by a scanner
- Failures in code untouched by this PR (pre-existing breakage or a flaky test)
- Deploy, infrastructure, or external-service failures
- Any failure whose fix would change intended behaviour rather than correct a defect

For these, and after 3 unsuccessful rounds, display **`MSG_CI_FIX_EXHAUSTED`** — substituting `{attempts}`, the remaining failures, and `{PR_URL}` — then stop. Do not push a fourth speculative fix.

### 7.4.5: Review feedback — chain into /magic:resolve

When the checks are settled (green, or failures explicitly handed back to the user) **and** `review.actionable_count` is greater than `0`:

1. Display **`MSG_REVIEW_COMMENTS_FOUND`**, substituting `{count}`, `{reviewers}`, and the comment list (each with `{source}`, `{path}`, `{line}`, `{severity}`, `{request}`)
2. Chain into the resolve workflow **without asking the user first** — the review feedback is handled automatically:
   - Invoke the `magic-resolve` skill via the `Skill` tool
   - If that is unavailable, read `~/.claude/skills/magic-resolve/SKILL.md` and execute its **Steps 3 to 7.5** (retrieve comments → apply fixes → preview → validate → commit → push → reply → re-request review), reusing the PR number and ticket ID already resolved here instead of re-detecting them
3. Pass along the watcher's `actionable` list as context so resolve does not re-classify the informational and stale comments the watcher already filtered out
4. After resolve pushes its fixes, re-launch the watcher once (Step 7.4.2) to confirm the new commit is green and that no new feedback landed. Re-evaluate from Step 7.4.3, but do **not** start another resolve cycle from this skill — if a second round of comments arrives, report it and let the user decide.

### 7.4.6: Timeout or watcher error

- `checks.state` is `timed_out`: display **`MSG_CI_WATCH_TIMEOUT`**, substituting `{waited}` (minutes), the still-pending check names, and `{PR_URL}`. Report only what was observed — never claim checks passed when they never completed.
- `checks.state` is `error`: report the error message from `notes` and tell the user to check the PR manually.

In both cases, still handle any actionable review feedback already collected (Step 7.4.5) before finishing.

## Step 8: Multi-repo summary (if applicable)

If you created PRs in multiple worktrees, display **`MSG_MULTI_REPO_FINAL`**, substituting `{TICKET-ID}` and the per-worktree results (each with `{worktree-name}`, `{PR_URL}`, and any `{error reason}` for failed worktrees).

### Multi-repo and the watch phase

In multi-repo mode, Step 7.4 does **not** run inside each worktree cycle — waiting 30 minutes on the first PR before creating the second one would leave the user with a half-finished set of PRs.

Instead:

1. Create every PR first (Steps 1–7 per worktree), announcing each one via Step 6.5
2. Update the ticket once (Step 7)
3. Display this multi-repo summary
4. **Then** run Step 7.4 once per created PR, sequentially, `cd`-ing into the matching worktree before each watch so that fixes land in the right repo

Skip the watch for any worktree whose PR cycle failed.

---

## Step 9: Record the run

**Always run this, as the very last thing you do — including when the workflow stopped early.**

Magic Slash opened a run record when this skill started. This closes it. Without it the run stays open and is counted as *abandoned*, so finished work disappears from the usage statistics.

Set `outcome` to `success` when the workflow completed, or `failed` when it stopped on an error you could not resolve.

This writes to a file instead of calling the desktop app, so it works whether or not the app is running.

```bash
MS_DIR="$HOME/.config/magic-slash"; mkdir -p "$MS_DIR" 2>/dev/null
printf '{"type":"end","skill":"magic-pr","agentId":"%s","outcome":"success","occurredAt":%s000}\n' \
  "$MAGIC_SLASH_TERMINAL_ID" "$(date +%s)" >> "$MS_DIR/pending-skills.ndjson" 2>/dev/null || true
```

## References

- `references/messages.md` — All bilingual message templates (EN/FR). Read relevant sections as needed (not the whole file at once).
- `references/node-setup.md` — Node.js version manager detection. Read before any Node.js-dependent command (Step 0.6).
- `references/ci-watch.md` — Watcher contract, `gh` commands, time budget, and report schema. Read before Step 7.4.
- `references/test-accounts.md` — Test-account modes, discovery cascade, and the credential guardrails. Read before Step 6.1.1, only when `pullRequest.testAccounts` is not `off`.
