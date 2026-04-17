---
name: magic:done
description: This skill should be used when the user says "the PR is merged", "la PR est mergée", "close the ticket", "fermer le ticket", "finalize the task", "finaliser la tâche", "task is done", "tâche terminée", "mark as done", "marquer comme terminé", or indicates the PR has already been merged and they want to close out the task. Do NOT use this skill if the user just finished coding and wants to create a PR — use /magic:pr instead.
allowed-tools: Bash(*), AskUserQuestion, mcp__github__*, mcp__atlassian__*
---

## References

- `references/messages.md` — All user-facing message templates (EN/FR)

# magic-slash v0.39.4 - /done

> The steps below must be executed in order because each one depends on the previous result — for example, cleanup must only happen after confirming the merge, and the Jira transition must happen before the summary so it can reflect the actual state.

You are an assistant that finalizes a task after the PR has been merged. The goal is to close the loop cleanly: confirm nothing is left dangling (unmerged PRs, open tickets, stale branches). This matters because abandoned worktrees and forgotten Jira tickets accumulate quickly and create confusion for the whole team.

The flow is: **verify merge → update tracker → update desktop → clean up → report**. Each step feeds into the next — the merge check determines whether to proceed at all, the tracker update captures the PR links, the cleanup removes local artifacts, and the summary reflects what actually happened.

> **Fire-and-forget commands**: Every bash command in this skill is fire-and-forget. Run the command, read its output, and move to the next step immediately. Never re-run a command to verify a previous command succeeded. Never run `git worktree list` to confirm a worktree was removed — the command's exit code and output are sufficient.
>
> **No improvised commands**: Execute only the exact bash commands specified in each step. Do not substitute alternative commands (e.g., do not replace `ls -d` with `git worktree list`). Do not add diagnostic or verification commands between steps.
>
> **When in doubt, ask**: If a command produces unexpected output or fails in an unclear way, use AskUserQuestion to ask the user how to proceed. Never loop or retry silently — asking is always better than guessing.

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------ |
| Jira language       | `.repositories.<name>.languages.jiraComment` | `"en"` |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"` |

### Issues parameters

| Parameter     | Repo path                                 | Default | Description                                  |
| ------------- | ----------------------------------------- | ------- | -------------------------------------------- |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true`  | Add a comment on the ticket                  |

## Step 0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display error based on system language
fi
```

#### If the config does not exist

Display **MSG_CONFIG_ERROR** (see `references/messages.md`).

## Step 1: Extract the ticket ID

Determine whether you are inside a worktree or the main repo, then extract the ticket ID accordingly.

### Case A: Inside a worktree

Get the current directory name:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: Extract the **last** `[A-Z]+-\d+` match from the directory name. This avoids false positives when the repo name itself contains uppercase segments (e.g.: `my-API-PROJ-123` → `PROJ-123`, not `API-PROJ`). You can also cross-reference with the repo name from `config.json` to strip it and isolate the ticket ID.
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

### Case B: Inside the main repo (not a worktree)

If the current directory matches a repo path from `config.json` directly (no ticket ID in the directory name), extract the ticket ID from the branch name:

```bash
git branch --show-current
```

Branch patterns: `feature/PROJ-123`, `feature/my-api-123`, `PROJ-123-some-description`, etc.

### Fallback

If still no ticket ID found from either case, ask the user.

## Step 2: Find the associated PR(s)

Read the config to identify all configured repos and search for associated worktrees (multi-repo support):

```bash
cat ~/.config/magic-slash/config.json
```

For each configured repo, build the expected worktree path and check if it exists. The worktree is always a sibling of the repo directory, named `{repo-dir-name}-{TICKET-ID}`:

```bash
REPO_PARENT=$(dirname {REPO_PATH})
REPO_DIR=$(basename {REPO_PATH})
WORKTREE_PATH="$REPO_PARENT/${REPO_DIR}-{TICKET_ID}"
[ -d "$WORKTREE_PATH" ] && echo "$WORKTREE_PATH"
```

> Use only `[ -d ]` for worktree detection — do not use `git worktree list`. The naming convention is sufficient and avoids confusion with stale git worktree metadata.

If the current directory is itself a worktree for this ticket (Case A from Step 1), include it in the list.

### No worktrees found (Case B from Step 1)

If no worktrees exist for this ticket, the user is working directly in the main repo on a feature branch. Find the PR from the current branch:

1. Get the branch name: `git branch --show-current`
2. Use `mcp__github__list_pull_requests` to find the PR (search by head branch, state: all)
3. If no match, search by title containing the ticket ID
4. If no PR is found, ask the user for the PR number or URL

Then skip directly to Step 3 (there are no worktrees to clean up later — Step 5.5 will be skipped).

### With worktrees found

For each found worktree, find the associated PR:

1. Get the branch name: `git -C {WORKTREE_PATH} branch --show-current`
2. Use `mcp__github__list_pull_requests` to find the PR (search by head branch, state: all)
3. If no match by branch, search by title containing the ticket ID
4. If still no match, search by recent commit messages containing the ticket ID
5. If no PR is found after all attempts, ask the user for the PR number or URL

## Step 3: Verify PR is merged

For each found PR, use `mcp__github__get_pull_request` and check the `merged` field.

### If the PR is NOT merged

Display **MSG_PR_NOT_MERGED** (see `references/messages.md`) and stop.

### If the PR IS merged

Continue to the next steps.

### Multi-repo: partial merge

If some PRs are merged and others are not, display a warning listing which PRs are still open, and **only proceed with the merged ones**. Do not transition Jira to "Done" unless ALL associated PRs are merged — the ticket should stay in its current state until the full work is complete. Continue with cleanup only for the merged worktrees.

## Step 4: Update the Jira/GitHub ticket

### Check Atlassian integration

Read `integrations.atlassian` from `~/.config/magic-slash/config.json`. Default: `true`.

If `integrations.atlassian` is `false`, skip the entire "For Jira tickets" section below. Only execute "For GitHub issues".

### For Jira tickets

If a Jira ticket ID is found, use the MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Transition to "Done"**: Find the transition matching "Done" / "Terminé" / "Closed" / "Fermé" and apply it with `mcp__atlassian__transitionJiraIssue`
3. **Add a final comment** with `mcp__atlassian__addCommentToJiraIssue` (unless `commentOnPR` is `false`)

#### Jira comment format based on `.languages.jiraComment`

Use **MSG_JIRA_DONE_COMMENT** (see `references/messages.md`).

If the "Done" transition doesn't exist, try:

- "Closed"
- "Fermé"
- "Resolved"
- "Terminé"
- "Complete"

### Edge cases

- **Ticket already in "Done"/"Closed"**: Skip the transition silently — just add the comment (if enabled). Do not treat this as an error.
- **Transition fails (permissions, custom workflow)**: Display a warning with the error, add the comment anyway, and continue to cleanup. The user can manually transition the ticket later.
- **No Jira/GitHub issue found**: Skip this step entirely and continue to cleanup. Warn the user that no ticket was updated.

### For GitHub issues

If the ticket is a GitHub issue, add a comment using **MSG_GITHUB_DONE_COMMENT** (see `references/messages.md`). Do NOT close the issue — let the PR auto-close handle it.

## Step 5: Update Magic Slash metadata (desktop app only)

This step only applies when the Magic Slash desktop app is running (the environment variables `MAGIC_SLASH_PORT` and `MAGIC_SLASH_TERMINAL_ID` are set). If they are not set, skip this step silently.

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n 'Done - {TICKET_ID}' | jq -sRr @uri)&status=PR%20merged" > /dev/null 2>&1 || true
```

Replace `{TICKET_ID}` with the actual ticket ID.

## Step 5.5: Clean up worktrees and branches

If no worktrees were found at Step 2 (Case B — working directly in the main repo), skip this entire step and go to Step 6.

Before proceeding, check each worktree for uncommitted changes:

```bash
git -C {WORKTREE_PATH} status --porcelain
```

If there are uncommitted changes, warn the user and **ask for confirmation** before removing that worktree. List the dirty files so the user can decide. If the user declines, skip cleanup for that worktree and continue with the others.

For each worktree found at Step 2 (that the user confirmed or that is clean), perform the following cleanup. If any sub-step fails, display a warning and continue — never block the skill.

Track the cleanup outcome for each worktree (success / skipped / failed) — this will be used in the summary.

**Execute steps 5.5.1 through 5.5.5 as a single linear pass.** Run each command once and move to the next — do not verify the result of any sub-step before proceeding. If a command fails (non-zero exit code), capture the error, record the worktree as "failed", and skip to the next worktree. Do not re-run `git worktree remove`, do not run `git worktree list`, and do not add any verification commands between sub-steps.

### 5.5.1: Navigate to the main repo

You must leave the worktree directory before removing it:

```bash
cd {REPO_PATH}
```

### 5.5.2: Remove the worktree

```bash
git worktree remove --force {WORKTREE_PATH}
```

(`--force` because untracked files like `.env`, `node_modules`, etc. may remain)

### 5.5.3: Delete the local branch

```bash
git branch -D {BRANCH_NAME} 2>/dev/null || true
```

### 5.5.4: Delete the remote branch (best-effort)

```bash
git push origin --delete {BRANCH_NAME} 2>/dev/null || true
```

(Silent if already deleted by GitHub auto-delete)

### 5.5.5: Prune stale worktree references

```bash
git worktree prune
```

Alternatively, you may run all cleanup commands for one worktree as a single block:

```bash
cd {REPO_PATH} && \
  git worktree remove --force {WORKTREE_PATH}; \
  git branch -D {BRANCH_NAME} 2>/dev/null || true; \
  git push origin --delete {BRANCH_NAME} 2>/dev/null || true; \
  git worktree prune
```

Either way, do not insert any verification commands (such as `git worktree list`) between them.

### Error handling

If the `git worktree remove` fails, display **MSG_WORKTREE_REMOVE_FAILED** (see `references/messages.md`) based on `.languages.discussion` and continue.

After displaying the warning, immediately proceed to the next worktree (or to Step 6 if this was the last one). Do not retry the failed command or run diagnostic commands. If the failure is unclear or unexpected, use AskUserQuestion to let the user decide how to proceed.

### Multi-repo

Repeat steps 5.5.1→5.5.5 for each worktree, navigating (`cd`) to the corresponding main repo each time. After completing cleanup for all worktrees, move directly to Step 6. Do not run any global verification command (such as `git worktree list`) between worktrees or after the final cleanup.

## Step 6: Summary

Display a summary based on `.languages.discussion`. The summary must reflect what **actually happened** — adapt each line based on the real outcome of the previous steps.

### Dynamic fields

| Field | Success | Skipped / Partial | Failed |
|-------|---------|-------------------|--------|
| Ticket | `{TICKET-ID} → Done` | `{TICKET-ID} → already Done` or `{TICKET-ID} → ⚠️ transition skipped` | `{TICKET-ID} → ⚠️ transition failed` |
| Cleanup | `Worktree removed, branch deleted` | `⚠️ Skipped (uncommitted changes)` or `N/A (no worktree)` | `⚠️ Failed (see warning above)` |

Display **MSG_DONE_SUMMARY** (see `references/messages.md`) based on `.languages.discussion`, replacing the dynamic fields from the table above.

## Step 7: Multi-repo summary (if applicable)

If multiple PRs were found across worktrees, display a combined summary based on `.languages.discussion`:

Adapt the cleanup and ticket lines using the same dynamic fields from Step 6.

Display **MSG_DONE_SUMMARY_FULLSTACK** (see `references/messages.md`) based on `.languages.discussion`, replacing the dynamic fields accordingly.
