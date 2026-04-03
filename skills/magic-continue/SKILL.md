---
name: magic:continue
description: This skill should be used when the user mentions a ticket ID like "PROJ-123", "#456", says "continue", "reprendre", "resume work on", "je reprends", "switch to", "basculer sur", or indicates they want to resume working on an existing task.
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, mcp__atlassian__*, mcp__github__*
---

# magic-slash v0.32.2 - /continue

You are an assistant that helps resume work on a Jira ticket or GitHub issue that was already started (by you, a colleague, or in a previous session).

Follow each step in order. Each step builds on the previous one.

## References

- `references/messages.md` — All bilingual messages (MSG_*). Read relevant sections as needed (not the whole file at once).
- `references/node-setup.md` — Node.js version manager detection. Read before installing dependencies (Step 6.2).
- `references/glossary.md` — EN/FR terminology for git concepts. When communicating in French, use the FR terms from this glossary for consistency.
- `references/api.md` — Magic Slash Desktop API reference (endpoints `/metadata` and `/repositories`).

## Step 0: Configuration

### 0.1: Check config file exists

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
[ ! -f "$CONFIG_FILE" ] && echo "MISSING" || echo "OK"
```

If missing, display `MSG_CONFIG_ERROR` and stop.

### 0.2: Determine language

Once the repo is identified (Step 5), read `.repositories.<name>.languages.discussion` from config. Default: `"en"`. Until the repo is identified, use English for all messages.

### 0.3: Determine development branch (execute after repo is identified in Step 5)

Read `.repositories.<name>.branches.development` from config.

- **If configured**: Display `MSG_BRANCH_CONFIRM` with the configured value. User can press Enter to accept, type "yes/ok" to accept, or type a branch name to override.
- **If not configured**: Display `MSG_BRANCH_ASK`.

**Handling the user's response:**
- **Empty response** (user just pressed Enter without typing): Use the configured default branch
- **Short confirmation** ("oui", "yes", "ok", "go"): Use the configured default branch
- **Another branch name** (e.g., "develop", "staging"): Use that branch instead

Store the result as `$DEV_BRANCH`.

## Step 1: Detect ticket type

Analyze `$ARGUMENTS`:

- **Jira**: Alphabetic prefix + hyphen + digits (regex: `^[A-Za-z]+-\d+$`, normalize to uppercase) → Step 2A
- **GitHub**: Number with optional `#` (regex: `^#?\d+$`) → Step 2B
- **Unrecognized**: Display `MSG_FORMAT_UNRECOGNIZED`.

## Step 2A: Retrieve the Jira ticket

Use `mcp__atlassian__getJiraIssue` to retrieve ticket details. If you don't know the `cloudId`, use `mcp__atlassian__getAccessibleAtlassianResources` first.

If the MCP call fails (timeout, auth error), retry once. If it fails again, ask the user to provide the ticket title and description manually so the workflow can continue.

→ Continue to Step 2.5, then Step 2.6.

## Step 2B: Retrieve the GitHub issue

### 2B.1: Read repos configuration

Read `~/.config/magic-slash/config.json` to get the list of configured repos.

### 2B.2: Identify GitHub repos

For each configured repo, get owner/repo from the remote URL:

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse `owner/repo` from either `git@github.com:owner/repo.git` or `https://github.com/owner/repo.git`.

### 2B.3: Search for the issue

Use `mcp__github__get_issue` for each repo — launch all calls in parallel for speed. Collect all found issues. If an MCP call fails, retry once; if still failing, skip that repo and continue with the others.

### 2B.4: Resolution

- **No issue found**: Display `MSG_NO_ISSUE_FOUND`.
- **Single issue**: Use it. Scope = that repo.
- **Multiple issues**: Display `MSG_GITHUB_MULTI_ISSUE` and ask user to choose.

→ Continue to Step 2.5, then Step 2.6.

## Step 2.5: Update Magic Slash Desktop metadata

This step updates the Desktop sidebar so the user sees their task context. Without it, the UI shows a blank entry.

### 2.5.1: Generate ticket description

Generate a concise description (2-3 sentences max) in the configured language, based on the ticket title, description, and acceptance criteria.

### 2.5.2: Send metadata

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n '{TICKET_ID}: {TICKET_TITLE}' | jq -sRr @uri)&ticketId={TICKET_ID}&description=$(echo -n '{DESCRIPTION}' | jq -sRr @uri)&status=in%20progress&baseBranch={DEV_BRANCH}" > /dev/null 2>&1 || true
```

Replace `{TICKET_ID}`, `{TICKET_TITLE}` (max 30 chars), `{DESCRIPTION}`, `{DEV_BRANCH}`.

## Step 2.6: Update ticket status to "In Progress"

Updating ticket status keeps the board accurate for teammates. This step never blocks the process — on failure, display a warning and continue.

### 2.6A: Jira ticket

1. Retrieve transitions with `mcp__atlassian__getTransitionsForJiraIssue`
2. Look for: "In Progress", "En cours", "In Development", "Started", "In Work"
3. Apply with `mcp__atlassian__transitionJiraIssue`
4. On failure: Display `MSG_TRANSITION_FAILED`

### 2.6B: GitHub issue

1. Check if a progress label exists: "in-progress", "wip", "in progress", "working"
2. If found: Add via `mcp__github__update_issue` (keep existing labels)
3. If not found: Continue without modification (do not create a label)
4. On failure: Display `MSG_LABEL_FAILED`

→ Continue to Step 3.

## Step 3: Search for existing worktrees

Searching worktrees first avoids creating duplicates if work already started.

For **each configured repo** in config.json:

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
WORKTREE_PATH="../${REPO_NAME}-$TICKET_ID"

# Check if a worktree exists with the magic-slash naming convention
if [ -d "$WORKTREE_PATH" ]; then
  echo "WORKTREE_FOUND: $(cd "$WORKTREE_PATH" && pwd)"
fi

# Also check via git worktree list (handles worktrees at other locations)
git worktree list | grep -i "$TICKET_ID"
```

Collect all found worktrees with their absolute paths.

- **If worktree(s) found** → Go to Step 5 (Resolution)
- **If no worktree found** → Go to Step 4 (Search branches)

## Step 4: Search for existing branches (if no worktree found)

Searching branches preserves commit history from previous sessions.

For **each configured repo**:

```bash
cd {REPO_PATH}
# Local branches
git branch --list "*${TICKET_ID}*"
# Remote branches (fetch first)
git fetch origin
git branch -r --list "*${TICKET_ID}*"
```

If `git fetch` fails, display `MSG_FETCH_FAILED` and continue with local state only.

If multiple branches match the ticket ID in the **same repo**, list them and ask the user to choose.

Collect all found branches (local and remote) with their associated repo.

- **If branch(es) found** → Go to Step 5 (Resolution)
- **If nothing found** → Go to Step 5, Case 3

## Step 5: Resolution and action

The rest of the skill operates from inside the worktree — all subsequent commands must target the right directory.

### Case 1 — Worktree(s) found

- **Single worktree**: `cd` into it directly.

- **Multiple worktrees (multi-repo)**: Display `MSG_MULTI_WORKTREE` with the list. For "all" → multi-repo flow (Step 6.5).

### Case 2 — Branch(es) found but no worktree

Display `MSG_BRANCH_FOUND_NO_WORKTREE` with branch details.

Create the worktree from the branch:

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
git fetch origin
# If local branch exists
git worktree add ../${REPO_NAME}-$TICKET_ID {BRANCH_NAME}
# If remote branch only
git worktree add ../${REPO_NAME}-$TICKET_ID origin/{BRANCH_NAME}
cd ../${REPO_NAME}-$TICKET_ID
```

If `git fetch` fails, display `MSG_FETCH_FAILED` and continue with local state.

If multiple branches in different repos → propose creating worktrees for each (multi-repo).

### Case 3 — Nothing found

Display `MSG_NOTHING_FOUND`. → Stop the skill.

## Step 6: Attach repo to the agent

This tells the Desktop sidebar which project this terminal belongs to, so the user sees it grouped correctly.

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["'$(pwd)'"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

## Step 6.1: Copy worktree files (only if worktree was newly created in Case 2)

If the worktree already existed (Case 1), skip this step.

Check if the repository has `worktreeFiles` configured (`.repositories.<name>.worktreeFiles`).

### Case A: `worktreeFiles` is non-empty

Copy each file from the **main repo** to the **worktree**:

```bash
MAIN_REPO="{REPO_PATH}"
for FILE in {WORKTREE_FILES_LIST}; do
  if [ -f "$MAIN_REPO/$FILE" ]; then
    cp "$MAIN_REPO/$FILE" "./$FILE"
  fi
done
```

Only copy files that exist; silently skip missing ones. Display `MSG_WORKTREE_FILES_COPIED`.

### Case B: Not configured — auto-detect

Scan the **main repo** for common untracked files:

```bash
MAIN_REPO="{REPO_PATH}"
CANDIDATES=(.env .env.local .env.development .env.development.local .env.test .env.test.local .env.production.local .npmrc .yarnrc .yarnrc.yml)
DETECTED=()
for f in "${CANDIDATES[@]}"; do
  if [ -f "$MAIN_REPO/$f" ]; then
    if ! git -C "$MAIN_REPO" ls-files --error-unmatch "$f" > /dev/null 2>&1; then
      DETECTED+=("$f")
    fi
  fi
done
```

If files detected: Display `MSG_WORKTREE_FILES_DETECTED`. If user says yes, save to config via `jq`:

```bash
jq --arg repo "{REPO_NAME}" --argjson files '["file1", "file2"]' \
  '.repositories[$repo].worktreeFiles = $files' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
```

Then copy files either way. If no files detected, skip silently.

## Step 6.2: Install dependencies (only if worktree was newly created in Case 2)

Read `references/node-setup.md` to detect the Node.js version manager and set `$NODE_PREFIX`.

**Detect package manager** — check lock files, first match wins:

| Lock file | Package manager | Install command |
|-----------|----------------|-----------------|
| `bun.lockb` or `bun.lock` | bun | `bun install` |
| `yarn.lock` | yarn | `yarn install` |
| `pnpm-lock.yaml` | pnpm | `pnpm install` |
| `package-lock.json` | npm | `npm install` |

If no lock file but `package.json` exists, default to `npm install`. If no `package.json`, skip.

For Node.js projects, prepend `$NODE_PREFIX` to the install command.

Display `MSG_INSTALLING_DEPS`. On failure, display `MSG_INSTALL_FAILED` and continue.

## Step 6.5: Report context and attach repos (multi-repo only)

Linking worktrees in the Desktop UI lets the user see them as one task.

If multiple worktrees:

1. Send full-stack metadata:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&fullStackTaskId={TICKET_ID}&relatedWorktrees=$(echo -n '["{WORKTREE_PATH_1}","{WORKTREE_PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

2. Attach all worktrees:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["{WORKTREE_PATH_1}","{WORKTREE_PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

3. Create `CLAUDE.local.md` in each worktree (if missing) using `MSG_MULTI_REPO_CONTEXT`. Adapt language to `.languages.discussion`.

4. `cd` into the **first** worktree to begin work.

## Step 7: Check for existing Pull Request

Detecting an existing PR lets the summary show its status and updates the Desktop UI with a clickable link.

For each worktree/repo:

### 7.1: Get branch and repo info

```bash
BRANCH=$(git branch --show-current)
REMOTE_URL=$(git remote get-url origin)
# Parse owner/repo from REMOTE_URL
```

### 7.2: Search for an open PR

Use `mcp__github__list_pull_requests`:
- `owner`: repo owner
- `repo`: repo name
- `head`: `"owner:branch-name"`
- `state`: `"open"`

If the MCP call fails, retry once. If still failing, skip PR detection and continue.

### 7.3: If PR found

Update Desktop metadata with PR info:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&prUrl=$(echo -n '{PR_URL}' | jq -sRr @uri)&prRepo=$(echo -n "$PWD" | jq -sRr @uri)" > /dev/null 2>&1 || true
```

### 7.4: If no PR found

Continue without PR info.

## Step 8: Quick status summary

Display a summary of the current state:

```bash
# Commits on the branch (compared to dev branch)
git log --oneline origin/$DEV_BRANCH..HEAD

# Uncommitted modified files
git status --short

# Current diff summary
git diff --stat
```

Display `MSG_RESUME_SUMMARY` (or `MSG_RESUME_SUMMARY_FULLSTACK` for multi-repo). No planning/exploration step — just display git state + PR status. The user can ask for a deeper analysis if needed.

---

For the Magic Slash Desktop API reference (endpoints `/metadata` and `/repositories`), see `references/api.md`.
