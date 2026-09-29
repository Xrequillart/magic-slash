# Multi-repo worktrees

Detailed procedure for the multi-repo case of `/magic:pr`: Steps 0.2 to 0.4, the partial-failure
rules, and how the watch phase (Step 7.4) is ordered once every PR exists (Step 8). Read it only
when you are in a worktree and `$TICKET_ID` is set.

## Step 0.2: Search for associated worktrees

Using the config already loaded in the Configuration step, retrieve the list of configured repos with their paths.

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For example, if TICKET-ID = `PROJ-123` and the repos are `/projects/api` and `/projects/web`, search for:

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collect all found worktrees.

## Step 0.3: Check unpushed commits in each worktree

For each found worktree, check if there are commits to push:

```bash
git -C {WORKTREE_PATH} log origin/$(git -C {WORKTREE_PATH} branch --show-current)..HEAD --oneline 2>/dev/null
```

Keep only the worktrees that have unpushed commits.

## Step 0.4: Summary and confirmation

If multiple worktrees have commits to push, display **`MSG_MULTI_REPO_SUMMARY`**, substituting `{TICKET-ID}` and the worktree list with commit counts.

If multi-repo detected, execute **Steps 1 to 7** for EACH worktree that has commits.
Change directory before each cycle:

```bash
cd {WORKTREE_PATH}
```

At the end of each PR, display a confirmation before moving to the next worktree.
The Jira/GitHub ticket (Step 7) must be updated **ONLY ONCE** at the end, with links to ALL created PRs.

## Multi-repo partial failure handling

If a worktree fails during its PR cycle (push error, API failure, etc.):

1. **Do not stop the entire process** — log the failure for this worktree
2. **Continue to the next worktree** after displaying **`MSG_MULTI_REPO_FAILURE`**, substituting `{worktree-name}` and `{error reason}`
3. **Include failed worktrees in the Step 8 summary** with their error status

## Step 8: Multi-repo and the watch phase

In multi-repo mode, Step 7.4 does **not** run inside each worktree cycle — waiting 30 minutes on the first PR before creating the second one would leave the user with a half-finished set of PRs.

Instead:

1. Create every PR first (Steps 1–7 per worktree), announcing each one via Step 6.5
2. Update the ticket once (Step 7)
3. Display this multi-repo summary
4. **Then** run Step 7.4 once per created PR, sequentially, `cd`-ing into the matching worktree before each watch so that fixes land in the right repo

Skip the watch for any worktree whose PR cycle failed.
