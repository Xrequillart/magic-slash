# Worktree creation details

Read by `SKILL.md` Step 4, at the sub-step each section names.

## 4.0: Worktree already exists

If it exists, use `AskUserQuestion` with `MSG_WORKTREE_EXISTS` options:
- Option 1: `cd` into existing worktree, continue to step 4.2
- Option 2: `git worktree remove --force {path}` then recreate
- Option 3: Stop

## 4.1: Branch already exists

If this fails because the branch already exists, use `AskUserQuestion` with `MSG_BRANCH_ALREADY_EXISTS` options:
- Option 1: `git worktree add ../${REPO_NAME}-$TICKET_ID $BRANCH_NAME` (use existing branch)
- Option 2: `git branch -D $BRANCH_NAME` then retry creation
- Option 3: Stop

## 4.1: Branch naming

**Branch naming**:
- Jira: `feature/PROJ-1234-implement-stripe-refunds` (`$BRANCH_ID` = `$TICKET_ID`)
- GitHub: `feature/repo-name-123-add-user-profile` (`$BRANCH_ID` = `{repo}-{number}`, to avoid conflicts)
- If the slug is empty, falls back to `feature/$BRANCH_ID` (no trailing hyphen)
- The worktree directory keeps `../${REPO_NAME}-$TICKET_ID` in both cases — that is the pattern
  `/magic:pr` and `/magic:commit` read the id back out of

## 4.1: Report the branch

**Report the branch** — a second metadata call rather than a parameter on the one in step 2.5, because that one runs before the branch exists: the slug is only generated in step 2.7 and `$BRANCH_NAME` only composed above. Without this the agent's `branch_name` stays null for its whole life, and every reader (the Desktop sidebar, the back-office agent list) has to fall back to the ticket id.

Read from `git branch --show-current` rather than echoing `$BRANCH_NAME` back: that reports what git actually checked out, so it stays correct on the "branch already exists" path where the user chose to reuse it.

`baseBranch` rides along to **overwrite** the value Step 2.5.2 already sent. That earlier call reports `$DEV_BRANCH` because it runs before the 🟡 question is answered; on the 🟡 path the real base is the blocker's branch, and only this call knows it. Sending it unconditionally keeps the two paths identical: on a nominal start the value is `$DEV_BRANCH` either way.

In a multi-repo start this runs once per worktree and the agent keeps the last one, since `branch_name` is a single column. For Jira that is the same name in every repo; for GitHub, where the name is prefixed per repo, the last repo processed wins.

## 4.2: Case B, auto-detect worktree files

Only when the repo has no `worktreeFiles` configured.

Scan for common untracked files in the main repo:

```bash
MAIN_REPO="{REPO_PATH}"
CANDIDATES=(.env .env.local .env.development .env.development.local .env.test .env.test.local .env.production.local .npmrc .yarnrc .yarnrc.yml .python-version .tool-versions)
for f in "${CANDIDATES[@]}"; do
  [ -f "$MAIN_REPO/$f" ] && ! git -C "$MAIN_REPO" ls-files --error-unmatch "$f" > /dev/null 2>&1 && echo "$f"
done
```

If files detected: Use `AskUserQuestion` with `MSG_WORKTREE_FILES_DETECTED` (y/n). If user says yes, persist the choice to the cloud:

```bash
# The app owns the write: it is the only process holding the cloud session. Silent and
# non-blocking, as every write endpoint is. Its own shell, so resolve the port again.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
curl -s "http://127.0.0.1:$MS_PORT/config/worktree-files?path=$(echo -n "$PWD" | jq -sRr @uri)&files=$(echo -n '["file1","file2"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Then copy the files either way. If no files detected, skip silently.

## 4.3: Detect the package manager

After `references/node-setup.md` has set `$NODE_PREFIX`.

**Detect package manager** — check lock files in worktree root, **first match wins** (stop at first detected):

| Priority | Lock file | Package manager | Install command |
|----------|-----------|----------------|-----------------|
| 1 | `bun.lockb` or `bun.lock` | bun | `bun install` |
| 2 | `yarn.lock` | yarn | `yarn install` |
| 3 | `pnpm-lock.yaml` | pnpm | `pnpm install` |
| 4 | `package-lock.json` | npm | `npm install` |
| 5 | `requirements.txt` | pip | `pip install -r requirements.txt` |
| 6 | `pyproject.toml` + `poetry.lock` | poetry | `poetry install` |
| 7 | `Cargo.toml` | cargo | `cargo build` |
| 8 | `go.mod` | go | `go mod download` |
| 9 | `Gemfile.lock` | bundler | `bundle install` |
| 10 | `composer.lock` | composer | `composer install` |

If no lock file but `package.json` exists, default to `npm install`.
If no recognizable project file exists, skip this step.

**Monorepo note**: If the project uses a monorepo structure (e.g. `pnpm-workspace.yaml`, `"workspaces"` in `package.json`, or `lerna.json`), install from the worktree root — the package manager will handle workspace packages automatically.

## 4.5: Multi-repo metadata calls

Only when multiple worktrees were created.

1. Send full-stack metadata — links all worktrees together in the Desktop UI so the user sees them as one task:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&fullStackTaskId={TICKET_ID}&relatedWorktrees=$(echo -n '["{PATH_1}","{PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

2. Attach all worktrees:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["{PATH_1}","{PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```
