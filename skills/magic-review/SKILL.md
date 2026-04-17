---
name: magic:review
description: This skill should be used when the user says "review", "revue de code", "code review", "review the PR", "regarde la PR", "review my PR", "self-review", "auto-review", "check my PR", "vérifie ma PR", or indicates they want to perform a code review on a pull request.
argument-hint: <TICKET-ID> (optional)
allowed-tools: Bash(*), Read, Glob, Grep, AskUserQuestion, mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.39.3 - /review

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **NOTE**: This skill does NOT modify any files. It only reads code and submits a review on GitHub.

You are an assistant that performs a thorough code review on a pull request. You detect whether this is a self-review (your own PR) or a review of someone else's PR, and adapt accordingly.

## References

- `references/messages.md` — All bilingual message templates (EN/FR). Read relevant sections as needed (not the whole file at once).

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------ |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"` |

## Step 0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display error and stop
fi
```

If the config does not exist, display `MSG_CONFIG_ERROR` and stop.

## Step 1: Detect the ticket

If an argument is provided (e.g., `/magic:review PROJ-123`), use it as the ticket ID.

Otherwise, extract the ticket ID from the current worktree:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ticket ID is found, ask the user which PR to review.

## Step 2: Find the associated PR

Use `mcp__github__list_pull_requests` to find the PR associated with this ticket. If the MCP call fails (timeout, auth error), retry once. If it fails again, ask the user for the PR number.

Search strategy:
1. Get the current branch name: `git branch --show-current`
2. Search for open PRs matching the current branch (head parameter)
3. If no match, search for PRs whose title contains the ticket ID
4. If still no match, ask the user for the PR number

Store the PR number and repository info.

## Step 3: Detect self-review vs external review

Compare the current branch with the PR's head branch:

```bash
CURRENT_BRANCH=$(git branch --show-current)
```

- **Self-review**: The current branch matches the PR's head branch (you are the author)
- **External review**: The current branch does NOT match (you are reviewing someone else's code)

This affects the tone and focus of the review:
- **Self-review**: Quality gate before requesting human review. Focus on catching issues you might have missed. Friendly, constructive tone.
- **External review**: Formal code review. Thorough analysis with clear actionable feedback.

## Step 4: Update Magic Slash metadata

Update the status to "in review":

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=in%20review" > /dev/null 2>&1 || true
```

## Step 5: Retrieve PR details

Gather all necessary information about the PR. For each MCP call below, if it fails (timeout, auth error), retry once. If `get_pull_request` or `get_pull_request_files` fails after retry, ask the user for the PR URL. If `get_pull_request_comments` or `get_pull_request_reviews` fails after retry, continue without that data — the review can proceed with partial information.

1. **PR details**: Use `mcp__github__get_pull_request` to get the PR description, title, base branch, head branch
2. **Changed files**: Use `mcp__github__get_pull_request_files` to get the list of modified files
3. **Existing comments**: Use `mcp__github__get_pull_request_comments` to see any existing review comments
4. **Existing reviews**: Use `mcp__github__get_pull_request_reviews` to see previous reviews

## Step 6: Read the source code

For each modified file from Step 5:

1. Use `Read` to read the full file (not just the diff) to understand the complete context
2. Use `Grep` and `Glob` to find related files (tests, interfaces, types, imports) for additional context
3. Pay attention to:
   - How the modified code integrates with the rest of the codebase
   - Whether tests exist for the modified code
   - Whether the changes follow existing patterns and conventions

## Step 7: Analyze the code

Perform a thorough analysis covering these categories:

### Analysis categories

1. **Correctness**: Logic errors, edge cases, null/undefined handling, race conditions
2. **Security**: Input validation, injection risks, authentication/authorization, sensitive data exposure
3. **Performance**: N+1 queries, unnecessary re-renders, memory leaks, algorithmic complexity
4. **Code quality**: Naming, readability, DRY principle, SOLID principles, consistent patterns
5. **Tests**: Coverage of new code, edge cases tested, test quality
6. **Breaking changes**: API changes, schema changes, backwards compatibility

### Categorize each finding

- **🚫 Blocking**: Must be fixed before merging (bugs, security issues, breaking changes)
- **💡 Suggestion**: Improvement that would be nice but not required
- **👍 Praise**: Well-done code worth highlighting (good patterns, clever solutions, thorough tests)

## Step 8: Submit the review on GitHub

Use `mcp__github__create_pull_request_review` to submit the review.

### Determine the review event

Based on the findings from Step 7:

- **APPROVE**: No blocking issues found. Code is ready to merge.
- **REQUEST_CHANGES**: One or more blocking issues found. Must be fixed before merging.
- **COMMENT**: Only suggestions and praise. No blocking issues, but worth discussing.

### Review body format

Write a clear, structured review summary. Include:

1. Overall assessment (1-2 sentences)
2. List of blocking issues (if any)
3. List of suggestions (if any)
4. Praise for well-done code (if any)

For inline comments, use the `comments` parameter with file path, line number, and comment body.

## Step 9: Update Magic Slash metadata

Based on the review result, update the status:

- **APPROVE**: Status remains `PR created` (awaiting merge)
  ```bash
  [ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=PR%20created" > /dev/null 2>&1 || true
  ```
- **REQUEST_CHANGES**: Status changes to `changes requested`
  ```bash
  [ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=changes%20requested" > /dev/null 2>&1 || true
  ```

## Step 10: Summary

Display `MSG_REVIEW_SUMMARY` based on `.languages.discussion`.

Include the conditional "Next steps" block based on the review result (APPROVE, REQUEST_CHANGES, or COMMENT) as defined in the message template.

## Step 11: Multi-repo support (if applicable)

If the ticket ID is associated with multiple worktrees (full-stack task), repeat Steps 2-10 for each worktree that has an open PR.

To detect multi-repo:

1. Read the config to get all configured repos
2. For each repo, check if a worktree with the same TICKET-ID exists:
   ```bash
   ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
   ```
3. For each found worktree, find and review the associated PR

Display `MSG_REVIEW_SUMMARY_FULLSTACK` as a combined summary at the end, listing each worktree with its PR number and review result.

## Step 12: (Optional) Comment on Jira

### 12.0: Check Atlassian integration

Read `integrations.atlassian` from `~/.config/magic-slash/config.json`. Default: `true`.

If `integrations.atlassian` is `false`, skip this step entirely.

### 12.1: Add comment

If the ticket is a Jira ticket and `commentOnPR` is not `false`, add a comment on the Jira ticket using `MSG_JIRA_REVIEW_COMMENT`.
