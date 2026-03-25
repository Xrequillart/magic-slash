---
name: magic:resolve
description: This skill should be used when the user says "resolve", "résoudre", "fix review comments", "corriger les commentaires", "address feedback", "traiter les retours", "fix the review", "corriger la review", "apply review changes", "appliquer les corrections", or indicates they want to address code review feedback on a pull request.
argument-hint: <TICKET-ID> (optional)
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.28.3 - /resolve

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **NOTE**: This skill modifies files to address review comments, then creates a new commit and pushes the changes.

You are an assistant that addresses code review feedback by fixing the requested changes and pushing a new commit.

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------ |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"` |

### Resolve parameters

| Parameter         | Repo path                                      | Default   |
| ----------------- | ---------------------------------------------- | --------- |
| Commit mode       | `.repositories.<name>.resolve.commitMode`      | `"new"`   |
| Format            | `.repositories.<name>.resolve.format`          | *(from commit config)* |
| Style             | `.repositories.<name>.resolve.style`           | *(from commit config)* |
| Use commit config | `.repositories.<name>.resolve.useCommitConfig` | `true`    |
| Reply to comments | `.repositories.<name>.resolve.replyToComments` | `true`    |
| Re-request review | `.repositories.<name>.resolve.autoReRequestReview` | `true`  |

**Logic:**
- `commitMode: "new"` (default) → create new commit + `git push`
- `commitMode: "amend"` → `git commit --amend --no-edit` + `git push --force-with-lease`
- `useCommitConfig: true` (default) → format/style are read from `.repositories.<name>.commit.*`
- `useCommitConfig: false` → format/style are read from `.repositories.<name>.resolve.*`
- When `commitMode: "amend"`, format/style are irrelevant (no new message)
- `replyToComments: true` (default) → reply in-thread on each resolved comment (Step 7)
- `replyToComments: false` → skip Step 7 entirely
- `autoReRequestReview: true` (default) → automatically re-request review from original reviewers (Step 7.5)
- `autoReRequestReview: false` → skip Step 7.5, suggest manual re-request in summary

## Step 0: Check configuration, detect Node.js version and multi-repo worktrees

### 0.0: Check configuration and prerequisites

Before starting, verify that the Magic Slash configuration exists and that required CLI tools are available.

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display error based on system language
fi
```

If the config does not exist, display **`MSG_CONFIG_ERROR`** and stop.

#### Check `gh` CLI availability

Step 7 (reply to comments) and Step 7.5 (re-request review) rely on the GitHub CLI (`gh`) to post threaded replies and re-request reviews — these operations are not supported by any MCP tool. Detecting `gh` early avoids discovering this limitation late in the workflow when all fixes are already applied.

```bash
command -v gh > /dev/null 2>&1 && echo "GH_AVAILABLE" || echo "GH_UNAVAILABLE"
```

Store the result as `$GH_AVAILABLE` (`true` or `false`). If `gh` is not available, display a warning that threaded replies (Step 7) will fall back to a single consolidated comment, and re-request review (Step 7.5) will need to be done manually.

### 0.1: Detect and activate Node.js version

Before executing any command that depends on Node.js (git push with pre-push hooks), detect if the current worktree requires a specific Node.js version.

**For multi-repo**: Re-execute this step each time you switch to a different worktree, as each repo may require a different Node.js version.

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

Store the activation prefix as `$NODE_PREFIX`:

| Result | `$NODE_PREFIX` |
| ------ | -------------- |
| `NVM` | `source ~/.nvm/nvm.sh && nvm use &&` |
| `FNM` | `eval "$(fnm env)" && fnm use &&` |
| `VOLTA` | *(empty)* |
| `NONE` | *(empty)* |
| `NO_MANAGER` | *(empty)* + display warning |

### 0.2: Extract the ticket ID from the current worktree

Get the current directory name and extract the ticket ID:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ID is detected (you are in a regular repo, not a worktree), skip directly to **Step 1**.

### 0.3: Read the repos configuration

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

### 0.4: Search for associated worktrees

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For example, if TICKET-ID = `PROJ-123` and the repos are `/projects/api` and `/projects/web`, search for:

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collect all found worktrees.

### 0.5: Check PRs with review comments in each worktree

For each found worktree, check if there is a PR with unresolved review comments:

1. Get the branch name: `git -C {WORKTREE_PATH} branch --show-current`
2. Use `mcp__github__list_pull_requests` to find open PRs matching the branch
3. Use `mcp__github__get_pull_request_comments` to check for unresolved comments

Keep only the worktrees that have a PR with unresolved review comments.

### 0.6: Multi-repo summary and confirmation

If multiple worktrees have PRs with review comments, display **`MSG_MULTI_REPO_SUMMARY`**, substituting `{TICKET-ID}` and the worktree list with comment counts.

If multi-repo detected, execute **Steps 1 to 9** (including Steps 2.5, 5.5, 5.9, and 7.5) for EACH worktree that has review comments.
Change directory before each cycle:

```bash
cd {WORKTREE_PATH}
```

At the end of each resolve cycle, display a confirmation before moving to the next worktree.

### Multi-repo partial failure handling

If a worktree fails during its resolve cycle (push error, API failure, etc.):

1. **Do not stop the entire process** — log the failure for this worktree
2. **Continue to the next worktree** after displaying **`MSG_MULTI_REPO_FAILURE`**, substituting `{worktree-name}` and `{error reason}`
3. **Include failed worktrees in the Step 10 summary** with their error status

## Step 1: Detect the ticket and worktree

If an argument is provided (e.g., `/magic:resolve PROJ-123`), use it as the ticket ID.

Otherwise, use the ticket ID already extracted in **Step 0.2**. If Step 0.2 was skipped (not in a worktree) and no argument was provided, ask the user which PR to resolve.

## Step 2: Find the associated PR

Use `mcp__github__list_pull_requests` to find the PR associated with this ticket.

Search strategy:
1. Get the current branch name: `git branch --show-current`
2. Search for open PRs matching the current branch using the `head` parameter (format: `{owner}:{branch}`)
3. If no match, search for PRs whose title contains the ticket ID
4. If still no match, ask the user for the PR number

### Validate PR state

Once the PR is found, check its state before proceeding:

- **If the PR is merged**: Display **`MSG_PR_STATE`** (merged variant) and stop.
- **If the PR is closed**: Display **`MSG_PR_STATE`** (closed variant) and stop.
- **If the PR is in draft state**: Display **`MSG_PR_STATE`** (draft variant) and ask the user to confirm.

## Step 2.5: Check branch freshness

Applying fixes on a branch that is behind its base risks creating merge conflicts when the PR is eventually merged. Checking freshness here — before any code changes — gives the user the opportunity to rebase cleanly while the working tree is still clean.

Before retrieving comments, check if the current branch is behind the PR's base branch:

```bash
git fetch origin {base_branch} --quiet
git log HEAD..origin/{base_branch} --oneline | head -5
```

Where `{base_branch}` is the base branch of the PR found in Step 2.

If the branch is behind, display **`MSG_BRANCH_STALE`**, substituting `{count}` and `{base_branch}`.

Handle the user's choice:
- Option 1: Continue to Step 3
- Option 2: Perform the rebase (`git pull --rebase origin {base_branch}`). If the rebase has conflicts, ask the user to resolve them manually before proceeding.
- Option 3: Abort

If the branch is up to date, proceed directly to Step 3.

## Step 3: Retrieve review comments

This step builds the complete picture of what needs to be fixed. Reading thread context (not just the root comment) is essential because reviewers often withdraw or clarify their requests in follow-up replies — acting on stale or withdrawn feedback would waste effort and potentially introduce unwanted changes.

Gather all unresolved review comments:

1. Use `mcp__github__get_pull_request_reviews` to get all reviews
   - Keep only reviews with `state: "CHANGES_REQUESTED"` or `state: "COMMENTED"`
   - Ignore reviews with `state: "APPROVED"` or `state: "DISMISSED"`
   - **Store the reviewer usernames** (login) from `CHANGES_REQUESTED` reviews — these will be needed in Step 7.5 for re-requesting review
2. Use `mcp__github__get_pull_request_comments` to get inline review comments
   - Each comment has: `id`, `path` (file), `line` or `original_line`, `body`, `original_commit_id`, `in_reply_to_id`
   - Identify root comments (those without `in_reply_to_id`) — these are the actionable review items
   - A comment with `position: null` means the code has been changed since the comment — it may be outdated (checked further in Step 4.1)
3. **Read thread context for each root comment**: For each root comment, collect its reply chain (comments where `in_reply_to_id` matches the root comment's `id`). Read the full thread to detect:
   - **Withdrawn requests**: If the reviewer later says "never mind", "ignore this", "not needed", "actually this is fine", or similar — mark the comment as "withdrawn" and skip it in Step 5
   - **Clarifications**: If the reviewer clarified or refined their request in a follow-up reply, use the latest clarification as the actual request
   - **Author acknowledgements**: If the PR author already replied with a fix description, check if the fix was actually applied before re-applying
4. Filter to keep only unresolved/pending comments that request changes (excluding withdrawn comments)

> **Important**: Store the `id`, `path`, `line`, `original_commit_id`, `body`, and `fix_summary` (a short description of what was changed) fields of each comment. These will be needed in Steps 4.1, 5, 5.5, and 7. The `original_commit_id` is particularly important because it allows detecting whether a file has changed since the comment was posted (stale comment detection in Step 4.1).

### If no unresolved comments are found

Display **`MSG_NO_COMMENTS`**, substituting `{number}` (PR number), and stop.

If in multi-repo mode, skip to the next worktree instead of stopping entirely.

## Step 4: Display summary and ask for confirmation

Display **`MSG_COMMENT_SUMMARY`**, substituting `{TICKET-ID}` and the list of comments (each with `{index}`, `{file}`, `{line}`, `{comment summary}`).

## Step 4.1: Detect stale comments

A comment is "stale" when the code it references has been modified since the comment was posted — meaning someone may have already addressed it. Re-applying a fix that was already made could revert intentional changes or create duplicate logic. This check prevents wasted effort and accidental regressions.

For each review comment, check if the file has been modified since the comment was made:

```bash
git log {original_commit_id}..HEAD -- {file}
```

Where `{original_commit_id}` is the `original_commit_id` field from the review comment (the commit the comment was made on).

If the command returns commits, the file has changed since the comment was posted — the comment may be **stale** (already addressed or outdated).

### Mark stale comments

For each stale comment, add a warning indicator in the summary display.

### Propose options

If stale comments are detected, display **`MSG_STALE_COMMENTS`**, substituting `{count}` and the stale comment list (each with `{index}`, `{file}`, `{line}`, `{comment summary}`).

Handle the user's choice:
- Option 1: Resolve all (including stale)
- Option 2: Skip stale comments
- Option 3: Select specific comments to resolve

If no stale comments are detected, proceed directly to Step 5.

## Step 5: Apply fixes for each comment

For each selected comment:

1. **Read the file** using `Read` to understand the current code and surrounding context
2. **Understand the feedback**: Analyze what the reviewer is asking for
3. **Apply the correction** using `Edit` to make the necessary changes
4. **Verify the fix** by reading the file again to ensure correctness

### Error handling during fixes

- **File not found**: If the file referenced by a comment no longer exists (renamed or deleted), skip the comment and add it to the "skipped" list with reason "file not found"
- **Line out of bounds**: If the `line` from the comment no longer matches (code has shifted), use the surrounding code context from the comment's `diff_hunk` to locate the correct position. If still unable to find the relevant code, skip the comment with reason "code context not found"
- **Unclear or ambiguous comment**: If the reviewer's intent cannot be determined with confidence, skip the comment with reason "ambiguous — requires human review"

All skipped comments (with their reasons) are tracked and displayed in the Step 9 summary.

## Step 5.5: Preview changes before commit

Automated code changes can introduce subtle issues that are hard to catch after the fact. Showing a diff preview before committing gives the user a chance to catch misinterpretations, unintended side effects, or overly aggressive fixes — and to abort cleanly if needed.

After all fixes are applied, display a diff preview so the user can review the automated changes before committing.

```bash
git diff
```

Display **`MSG_CHANGES_PREVIEW`**, substituting `{TICKET-ID}`, the list of modified files (each with `{file}`, `{fix_summary}`, `{reviewer}`), `{count}`, `{additions}`, and `{deletions}`.

- If the user answers **Y/O**: proceed to Step 5.9
- If the user answers **n**: abort the resolve, discard changes with `git checkout -- .` and stop
- If the user answers **diff**: display the full `git diff` output and ask again

## Step 5.9: Post-fix validation

Automated fixes can introduce syntax errors, type mismatches, or lint violations that weren't in the original code. Catching these before commit (rather than at push time via hooks) allows for faster iteration — the user can fix issues while the context is still fresh, rather than debugging cryptic hook failures later.

Before committing, run a quick validation to catch issues introduced by the automated fixes.

### Detect the project's verification command

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

### Run validation on modified files only

Run the detected command scoped to the modified files when possible:

```bash
# Example for ESLint (scope to changed files):
$NODE_PREFIX npx eslint {modified-files}

# Example for TypeScript (full check, cannot scope):
$NODE_PREFIX npx tsc --noEmit
```

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.1, prepend it to any validation command.

### Handle validation results

- **All checks pass**: Proceed to Step 6
- **Checks fail**: Display **`MSG_POST_FIX_VALIDATION`**, substituting `{error output}`.

Handle the user's choice:
- Option 1: Fix the issues and re-validate (using the same approach as Step 6.4 level 1-2 auto-fix). Repeat up to 3 times.
- Option 2: Proceed anyway (issues may be caught by push hooks)
- Option 3: Abort and discard changes

## Step 6: Commit and push

After all fixes are applied:

### 6.0: Check for actual changes

Before staging, verify that fixes produced actual code changes:

```bash
git status --porcelain
```

If no files were modified (all comments were skipped or already addressed), skip Steps 6.1–6.4 and Step 7, and go directly to Step 8. Display **`MSG_NO_CHANGES`**.

### 6.1: Stage the modified files

```bash
git add <modified-files>
```

### 6.2: Commit

Read the `commitMode` from the resolve config (default: `"new"`).

#### When `commitMode` is `"new"` (default)

Create a commit with a message that clearly indicates it addresses PR review feedback. Use the format/style from the resolve config (or inherit from commit config if `useCommitConfig` is `true`):

```bash
git commit -m "fix(pr): address review feedback for {TICKET-ID}"
```

Where `{TICKET-ID}` is the ticket ID detected in Step 1.

#### When `commitMode` is `"amend"`

Amend the last commit without changing the message:

```bash
git commit --amend --no-edit
```

#### After the commit

Capture the SHA for use in Step 7:

```bash
COMMIT_SHA=$(git rev-parse HEAD)
```

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.1, prepend it to the commit command.

### 6.3: Push

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.1, prepend it to the push command.

#### When `commitMode` is `"new"` (default)

```bash
git push
```

#### When `commitMode` is `"amend"`

```bash
git push --force-with-lease
```

> **Warning**: When using `commitMode: "amend"`, the commit SHA changes. This invalidates the position of old review comments on GitHub (they will appear as "outdated"). This is expected behavior — the reply in Step 7 will reference the new SHA.

### 6.4: Push hook error handling

If the push fails (non-zero exit code), analyze the error:

**Error classification by level**:

| Level | Error type | Examples | Action |
| ----- | ---------- | -------- | ------ |
| 1 - Auto | **Formatter** | Prettier, Black, gofmt | Fix automatically |
| 2 - Semi-auto | **Linter** | ESLint --fix, Pylint, Flake8, Rubocop | Fix and inform |
| 3 - Manual | **Type check** | TypeScript, mypy | **Ask the user** |
| 3 - Manual | **Tests** | Jest, pytest (if in pre-push) | **Ask the user** |
| 3 - Manual | **Other** | Secrets detected, files too large | **Ask the user** |

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
   - **Remember to prepend `$NODE_PREFIX`** (from Step 0.1) to any Node.js command (npx, npm, yarn, pnpm)

3. **Re-stage the corrected files**:

   ```bash
   git add <corrected-files>
   ```

4. **Re-commit** (to include the hook fixes):

   ```bash
   git commit --amend --no-edit
   ```

5. **Update COMMIT_SHA** after the re-commit:

   ```bash
   COMMIT_SHA=$(git rev-parse HEAD)
   ```

6. **Retry the push** (remember to prepend `$NODE_PREFIX` if set):

   ```bash
   git push
   ```

7. **Repeat up to 3 times maximum**. If the push still fails after 3 attempts, display a detailed error message and ask the user to intervene.

Display **`MSG_PUSH_AUTO_FIX`** during the correction process, substituting the error details and fix results.

## Step 7: Reply to resolved comments on GitHub

> **Condition**: Only execute this step if `replyToComments` is `true` (default). If `replyToComments` is `false`, skip this step entirely.
>
> **Prerequisite**: If `$GH_AVAILABLE` is `false` (detected in Step 0.0), skip the `gh api` approach and go directly to the MCP fallback.

Replying in-thread on each resolved comment creates a clear audit trail for reviewers — they can see exactly which commit addressed their feedback without having to dig through diffs. This significantly speeds up re-reviews.

For each resolved comment, reply in-thread on GitHub to indicate the fix has been applied.

### Why `gh api`

No MCP GitHub tool currently supports replying in-thread to a pull request review comment. The `mcp__github__add_issue_comment` tool only creates top-level issue comments, not threaded replies on specific review comments. Therefore, `gh api` (invoked via the Bash tool, which is allowed by `Bash(*)`) is the primary method for this step.

### Primary: `gh api` (with retry)

Use the comment ID (stored in Step 3) and the commit SHA (from Step 6.2):

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies -f body="{message}"
```

For each `gh api` call, if it fails with a transient error (HTTP 5xx, network timeout, rate limit 429):
- **Retry up to 2 times** with a 2-second pause between attempts
- If all retries fail for a specific comment, log the failure and continue with the next comment
- At the end, if any replies failed, fall back to the consolidated MCP comment (see below)

#### Message template

Use **`MSG_REPLY_TEMPLATE`** for the reply body, substituting `{COMMIT_SHA}` (short SHA, first 7 characters from `git rev-parse --short HEAD`) and `{fix_summary}` (concise one-line description of the fix applied).

### Fallback: `mcp__github__add_issue_comment`

If the `gh` CLI is not available or all `gh api` calls fail, fall back to creating a single consolidated top-level comment using `mcp__github__add_issue_comment`.

Use **`MSG_REPLY_FALLBACK`** for the fallback comment body, substituting `{COMMIT_SHA}` and the list of resolved comments (each with `{file}`, `{line}`, `{fix_summary}`).

> **Note**: If both `gh api` and the MCP fallback fail, log a warning but do not block the workflow.

## Step 7.5: Re-request review

> **Condition**: Only execute this step if `autoReRequestReview` is `true` (default). If `autoReRequestReview` is `false`, skip this step entirely.
>
> **Prerequisite**: If `$GH_AVAILABLE` is `false` (detected in Step 0.0), skip this step and add "Request re-review manually" to the Step 9 next steps.

Without an explicit re-request, reviewers may not notice that their feedback has been addressed — GitHub doesn't automatically notify them when new commits are pushed. Re-requesting ensures the PR stays visible in their review queue.

Automatically re-request a review from the original reviewers who requested changes.

### Identify reviewers

Use the reviewer usernames stored in Step 3 (from `CHANGES_REQUESTED` reviews). These are the reviewers who need to re-review the fixes.

### Re-request via `gh api`

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers -f "reviewers[]={reviewer_login}" -X POST
```

If multiple reviewers requested changes, include all of them in a single API call:

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers --input - <<EOF
{"reviewers": ["{reviewer1}", "{reviewer2}"]}
EOF
```

### Retry and fallback

For each `gh api` call, if it fails with a transient error (HTTP 5xx, network timeout, rate limit 429):
- **Retry up to 2 times** with a 2-second pause between attempts
- If all retries fail, log a warning and add "manual re-request needed" to the Step 9 summary

### Confirmation

Display **`MSG_RE_REQUEST_REVIEW`**, substituting `{reviewer1}`, `{reviewer2}`, etc.

> **Note**: If `gh` CLI is not available, skip this step and add "Request re-review manually" to the Step 9 next steps.

## Step 8: Update Magic Slash metadata

Update the status to indicate fixes have been pushed:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=Review%20addressed" > /dev/null 2>&1 || true
```

Status is set to `Review addressed` (fixes pushed, awaiting re-review).

## Step 9: Summary

Display **`MSG_SUMMARY`**, substituting `{TICKET-ID}`, `{count}` (resolved/skipped), `{branch-name}`, `{COMMIT_SHA}`, re-review status, and skipped details if any.

Use the conditional blocks `{IF_SKIPPED}...{/IF_SKIPPED}`, `{IF_RE_REQUEST_OK}...{/IF_RE_REQUEST_OK}`, and `{IF_RE_REQUEST_FAIL}...{/IF_RE_REQUEST_FAIL}` as documented in the message template.

## Step 10: Multi-repo summary (if applicable)

If you resolved comments in multiple worktrees, display **`MSG_MULTI_REPO_FINAL`**, substituting `{TICKET-ID}` and the per-worktree results (each with `{worktree-name}`, `{count}`, `{SHA}`, and any `{error reason}` for failed worktrees).

---

## Messages Reference

All message templates (bilingual EN/FR) are in `references/messages.md`. Read that file to get the exact template for each `MSG_*` referenced throughout this skill. Select the variant matching `languages.discussion` config value (default: `en`).
