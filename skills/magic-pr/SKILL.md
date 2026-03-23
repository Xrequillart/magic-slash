---
name: magic:pr
description: This skill should be used when the user says "done", "terminé", "I'm done", "c'est fini", "j'ai fini", "finalize", "create PR", "créer la PR", "push and create PR", "on peut créer la PR", "pousser les changements", "push my changes", "create the pull request", "ready for PR", "prêt pour la PR", "open a PR", "ouvrir une PR", or indicates they have finished coding and want to push their code and create a pull request. Also trigger when the user signals completion with phrases like "everything looks good", "let's ship it", "can you push this?", "les changements sont prêts", "j'ai fini de coder", "on peut pousser", "let's get this merged", "ready to submit", "ship it", "envoie la sauce", "go for PR", "wrap it up", "c'est bon pour moi", "I think we're good", "on est bon", "time to push", "pousse tout ça", or any indication that coding is complete and they want to move to the review phase. Use this skill even if the user doesn't explicitly mention "PR" — if they indicate their work is done and want to share it, this is the right skill.
argument-hint: <base-branch> (optional, e.g., develop, staging)
allowed-tools: Bash(*), mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.26.0 - /pr

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **CRITICAL STEPS THAT MUST NEVER BE SKIPPED**:
> - **Step 2**: Pre-push validation - MANDATORY
> - **Step 3**: Push to remote - MANDATORY
> - **Step 6**: Create the Pull Request - MANDATORY
> - **Step 6.1**: Update Magic Slash metadata (curl) - MANDATORY
> - **Step 8**: Update the Jira/GitHub ticket - RECOMMENDED

You are an assistant that finalizes a task by pushing commits, creating a PR and updating the Jira/GitHub ticket.

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

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

Read `~/.config/magic-slash/config.json` to determine the development branch:

1. Once the repo is identified, read `.repositories.<name>.branches.development`
2. If an argument is provided (e.g., `/magic:pr develop`), use it directly as `$DEV_BRANCH` and skip confirmation.
3. Otherwise, **always ask the user for confirmation**, showing the configured default if available:

#### If a default is configured (e.g., `"develop"`)

Display **`MSG_BRANCH_CONFIRM`**, substituting `{branch}`.

**Handling the user's response:**
- **Empty response** (user just pressed Enter without typing): Use the configured default branch
- **Short confirmation** ("oui", "yes", "ok", "go"): Use the configured default branch
- **Another branch name** (e.g., "develop", "staging"): Use that branch instead

#### If no default is configured

Display **`MSG_BRANCH_ASK`**.

4. Store the result as `$DEV_BRANCH`.

### Pull Request parameters

| Parameter         | Repo path                                          | Default | Description                     |
| ----------------- | -------------------------------------------------- | ------- | ------------------------------- |
| Auto-link tickets | `.repositories.<name>.pullRequest.autoLinkTickets` | `true`  | Add Jira/GitHub links in the PR |

### Issues parameters

| Parameter     | Repo path                                 | Default | Description                    |
| ------------- | ----------------------------------------- | ------- | ------------------------------ |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true`  | Add a comment with the PR link |

## Step 0: Check configuration and detect multi-repo worktrees

### 0.0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display MSG_CONFIG_ERROR and stop
fi
```

If the config does not exist, display **`MSG_CONFIG_ERROR`** and stop.

### 0.1: Extract the ticket ID from the current worktree

Get the current directory name and extract the ticket ID:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ID is detected (you are in a regular repo, not a worktree), skip directly to **Step 1**.

### 0.2: Read the repos configuration

```bash
cat ~/.config/magic-slash/config.json
```

Retrieve the list of configured repos with their paths:

```json
{
  "repositories": {
    "api": {"path": "/path/to/api", "keywords": [...]},
    "web": {"path": "/path/to/web", "keywords": [...]}
  }
}
```

### 0.3: Search for associated worktrees

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For example, if TICKET-ID = `PROJ-123` and the repos are `/projects/api` and `/projects/web`, search for:

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collect all found worktrees.

### 0.4: Check unpushed commits in each worktree

For each found worktree, check if there are commits to push:

```bash
git -C {WORKTREE_PATH} log origin/$(git -C {WORKTREE_PATH} branch --show-current)..HEAD --oneline 2>/dev/null
```

Keep only the worktrees that have unpushed commits.

### 0.5: Summary and confirmation

If multiple worktrees have commits to push, display **`MSG_MULTI_REPO_SUMMARY`**, substituting `{TICKET-ID}` and the worktree list with commit counts.

If multi-repo detected, execute **Steps 1 to 8** for EACH worktree that has commits.
Change directory before each cycle:

```bash
cd {WORKTREE_PATH}
```

At the end of each PR, display a confirmation before moving to the next worktree.
The Jira/GitHub ticket (Step 8) must be updated **ONLY ONCE** at the end, with links to ALL created PRs.

### Multi-repo partial failure handling

If a worktree fails during its PR cycle (push error, API failure, etc.):

1. **Do not stop the entire process** — log the failure for this worktree
2. **Continue to the next worktree** after displaying **`MSG_MULTI_REPO_FAILURE`**, substituting `{worktree-name}` and `{error reason}`
3. **Include failed worktrees in the Step 9 summary** with their error status

## Step 0.6: Detect and activate Node.js version

Before executing any command that depends on Node.js (git push with pre-push hooks, npm/yarn/pnpm commands), detect if the current worktree requires a specific Node.js version.

**For multi-repo**: Re-execute this step each time you switch to a different worktree, as each repo may require a different Node.js version.

### 0.6.1: Detect the version file and version manager

```bash
if [ -f ".nvmrc" ] || [ -f ".node-version" ]; then
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    echo "NVM"
  elif [ -d "$HOME/.local/share/fnm" ] || [ -d "$HOME/.fnm" ]; then
    echo "FNM"
  else
    echo "NO_MANAGER"
  fi
elif [ -f "package.json" ] && grep -q '"volta"' package.json 2>/dev/null; then
  echo "VOLTA"
else
  echo "NONE"
fi
```

### 0.6.2: Store the activation prefix

Based on the detection result, store the activation prefix as `$NODE_PREFIX`:

| Result       | `$NODE_PREFIX`                               | Notes                                                         |
| ------------ | -------------------------------------------- | ------------------------------------------------------------- |
| `NVM`        | `source ~/.nvm/nvm.sh && nvm use &&`         | Activates nvm and switches to the version in `.nvmrc`         |
| `FNM`        | `eval "$(fnm env)" && fnm use &&`            | Activates fnm and switches to the version in `.node-version`  |
| `VOLTA`      | *(empty)*                                    | Volta uses shims, no activation needed                        |
| `NONE`       | *(empty)*                                    | No version file found, use system Node                        |
| `NO_MANAGER` | *(empty)*                                    | Display **`MSG_NODE_NO_MANAGER`**                             |

### Usage

For all subsequent bash commands that depend on Node.js, **prepend `$NODE_PREFIX`**:

```bash
# Instead of:
git push -u origin branch-name

# Use (if $NODE_PREFIX is set):
source ~/.nvm/nvm.sh && nvm use && git push -u origin branch-name
```

If `$NODE_PREFIX` is empty, run commands normally without any prefix.

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

- **If an open PR exists**: Display **`MSG_PR_EXISTS`**, substituting `{number}` and `{url}`. Ask the user whether to:
  1. Open the existing PR (stop the process)
  2. Continue anyway (e.g., if they just want to push new commits)
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
- **Checks fail**: Display **`MSG_PRE_PUSH_VALIDATION`**, substituting `{error output}`.

Handle the user's choice:
- Option 1: Fix the issues and re-validate (repeat up to 3 times)
- Option 2: Proceed anyway (issues may be caught by push hooks)
- Option 3: Abort

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

Display **`MSG_PUSH_ERROR_MANUAL`**, substituting `{error message}`.

Handle the user's choice:
- Option 1: Fix manually and retry
- Option 2: Skip this check (`--no-verify`) — display a warning if the user chooses this option
- Option 3: Abort push

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

## Step 4.1: Retrieve the full diff for testing instructions

```bash
git diff origin/$DEV_BRANCH..HEAD
```

This diff will be used in Step 6 to generate concrete testing instructions in the PR description.

### Large diff strategy

If the diff is too large (>500 lines):

1. Run `git diff origin/$DEV_BRANCH..HEAD --stat` to get an overview of changed files
2. Identify the **key files** (business logic, API routes, components) vs **secondary files** (tests, config, types)
3. Read key modified files individually using `Read` to understand the changes in context
4. Use the stat overview + key file understanding to write testing instructions

## Step 5: Retrieve the project's PR template

Check if a PR template exists in the project:

```bash
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null || cat .github/pull_request_template.md 2>/dev/null || cat docs/pull_request_template.md 2>/dev/null || echo ""
```

If a template exists, you must **strictly follow it** and fill in its sections. For any section related to testing (e.g., "Testing", "How to test", "Test Steps", "Comment tester", "Vérification"), you must **analyze the diff from Step 4.1** to fill it with concrete, specific testing steps based on the actual code changes. Do NOT use generic placeholders.

## Step 5.1: Check for conflicts with base branch

Before creating the PR, check if there are merge conflicts with the base branch:

```bash
git fetch origin $DEV_BRANCH --quiet
git merge-tree $(git merge-base HEAD origin/$DEV_BRANCH) HEAD origin/$DEV_BRANCH | grep -c "^<<<<<<<" 2>/dev/null || echo "0"
```

If conflicts are detected, display **`MSG_CONFLICTS_DETECTED`**, substituting `{base_branch}`.

Handle the user's choice:
- Option 1: Create the PR anyway (conflicts can be resolved later)
- Option 2: Abort and resolve conflicts first

If no conflicts, proceed directly to Step 6.

## Step 6: Create the Pull Request via MCP GitHub

> **MANDATORY**: This step is critical. You MUST create the PR.

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

### Linked Issues section (by default, unless autoLinkTickets: false)

Add this section at the end of the PR description.

For **Jira** tickets, adapt the Jira URL based on the user's domain (retrieved via `mcp__atlassian__getAccessibleAtlassianResources`):

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

Display **`MSG_PR_PREVIEW`**, substituting `{title}`, `{base_branch}`, `{head_branch}`, and `{description_preview}` (first 10 lines of the description).

Handle the user's choice:
- **Y/O** or Enter: Proceed with creation
- **n**: Abort
- **edit**: Let the user modify the title or description before creation

### 6.3: Create the PR

Use `mcp__github__create_pull_request`:

- **Base**: The branch resolved in step 6.0
- **Head**: The current branch

## Step 6.4: Update Magic Slash metadata

> **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop. You MUST execute it after creating the PR.

After creating the PR, update the title, status and PR link of the agent:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n '✅ PR #{PR_NUMBER} - {TICKET_ID}' | jq -sRr @uri)&status=PR%20created&prUrl=$(echo -n '{PR_URL}' | jq -sRr @uri)&prRepo=$(echo -n "$PWD" | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Replace:
- `{PR_NUMBER}`: The created PR number (e.g.: `42`)
- `{TICKET_ID}`: The ticket ID (e.g.: `PROJ-123`)
- `{PR_URL}`: The full PR URL (e.g.: `https://github.com/org/repo/pull/42`)

This command is silent and never blocks the process.

## Step 7: Extract the ticket ID

Analyze the branch name to extract the ticket ID:

- **Jira pattern**: `feature/PROJ-123`, `fix/PROJ-456`, `PROJ-789-description` → Regex: `[A-Z]+-\d+`
- **GitHub pattern**: `feature/123-description`, `fix/456` → Regex: last numeric segment `\d+`

If no ticket ID is found, ask the user if they still want to update a ticket.

## Step 8: Update the Jira/GitHub ticket

### 8.1: Jira tickets (pattern `[A-Z]+-\d+`)

If a Jira ticket ID is found, use the MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Change the status** to "To be reviewed" (or equivalent) with `mcp__atlassian__transitionJiraIssue`
   - If the "To be reviewed" status doesn't exist, try: "In Review", "Code Review", "Review"
3. **Add a comment** with the PR link via `mcp__atlassian__addCommentToJiraIssue`
   (unless `commentOnPR` is `false`)
   - Use **`MSG_JIRA_COMMENT`** for the comment body

### 8.2: GitHub issues (numeric pattern `#\d+`)

If a GitHub issue ID is found:

1. **Add a comment** on the issue with the PR link via `mcp__github__add_issue_comment`
   (unless `commentOnPR` is `false`)
   - Use **`MSG_GITHUB_ISSUE_COMMENT`** for the comment body
2. **Update labels** (optional): If the issue has a "todo" or "in progress" label, update it to "in review" if that label exists via `mcp__github__update_issue`

> Note: The `closes #123` keyword in the PR description (from Step 6.1) will automatically close the issue when the PR is merged. No need to close it manually here.

## Step 8.3: Final summary

Display **`MSG_SUMMARY`**, substituting `{branch}`, `{PR_URL}`, `{PR_NUMBER}`, `{TICKET_ID}`, and `{ticket_status}`.

## Step 9: Multi-repo summary (if applicable)

If you created PRs in multiple worktrees, display **`MSG_MULTI_REPO_FINAL`**, substituting `{TICKET-ID}` and the per-worktree results (each with `{worktree-name}`, `{PR_URL}`, and any `{error reason}` for failed worktrees).

---

## Messages Reference

All bilingual message templates (EN/FR) are in `references/messages.md`. Read that file when you need the exact wording for any `MSG_*` message. Each message has an `en` and `fr` variant — select based on `languages.discussion` config value (default: `en`).
