# Multi-repo worktrees

Detail of Steps 0.3 to 0.5 of `/magic:resolve`. Read it only when Step 0.2 found a ticket ID (you are in a worktree).

## 0.3: Read the repos configuration

```bash
# Every bash block runs in its own shell: $MS_PORT does not survive from Step 0,
# so resolve it again here. One line, and it costs nothing to repeat.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config"
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

## 0.4: Search for associated worktrees

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For example, if TICKET-ID = `PROJ-123` and the repos are `/projects/api` and `/projects/web`, search for:

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collect all found worktrees.

## 0.5: Check PRs with review comments in each worktree

For each found worktree, check if there is a PR with unresolved review comments:

1. Get the branch name: `git -C {WORKTREE_PATH} branch --show-current`
2. Use `mcp__github__list_pull_requests` to find open PRs matching the branch
3. Use `mcp__github__pull_request_read` with `method: "get_review_comments"` to check for unresolved comments

Keep only the worktrees that have a PR with unresolved review comments.

## Multi-repo partial failure handling

If a worktree fails during its resolve cycle (push error, API failure, etc.):

1. **Do not stop the entire process** — log the failure for this worktree
2. **Continue to the next worktree** after displaying **`MSG_MULTI_REPO_FAILURE`**, substituting `{worktree-name}` and `{error reason}`
3. **Include failed worktrees in the Step 10 summary** with their error status
