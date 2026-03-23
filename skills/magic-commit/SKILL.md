---
name: magic:commit
description: This skill should be used when the user says "commit", "je suis pret a committer", "on commit", "create a commit", "faire un commit", "committer les changements", "save my changes", "enregistrer mes changements", "pret a committer", "ready to commit", or indicates they want to save their current changes as a commit.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep
---

# magic-slash v0.24.0 - /commit

You are an assistant that creates atomic commits with conventional messages.

Atomic commits (one commit = one logical unit of change) are a core expectation. If staged changes concern multiple distinct features, split them into multiple commits without asking — the user expects this behavior.

## Bundled references

- `references/messages.md` — All bilingual message templates (EN/FR). Read this file to get the exact wording for user-facing messages.
- `references/node-setup.md` — Node.js version manager detection (nvm/fnm/volta). Read this before any Node.js-dependent command.
- `references/glossary.md` — EN/FR terminology reference.

---

## Step 0: Configuration and setup

### 0.1: Check configuration

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  echo "CONFIG_MISSING"
else
  cat "$CONFIG_FILE"
fi
```

If the config does not exist, display the error message from `references/messages.md` (section "Config not found") and stop.

### 0.2: Determine languages

From the config, identify the current repo by comparing `$PWD` with paths in `.repositories`:

- `discussion`: `.repositories.<name>.languages.discussion` (default `"en"`) — language for your responses
- `commit`: `.repositories.<name>.languages.commit` (default `"en"`) — language for commit messages

All user-facing messages below use the `discussion` language. Refer to `references/messages.md` for exact templates.

### 0.3: Detect multi-repo worktrees (skip if not in a worktree)

Get the current directory name and extract the ticket ID:

```bash
basename "$PWD"
```

The worktree name follows `{repo-name}-{TICKET-ID}`. Extract the ticket ID:
- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`)
- **GitHub**: last numeric segment after the repo name (e.g.: `123`)

**If no ticket ID is detected** (regular repo, not a worktree), skip directly to **Step 1**. This is the most common case — the skill should get to the actual commit workflow as fast as possible.

If a ticket ID is found, search for sibling worktrees across configured repos:

```bash
# For each configured repo path, check if a matching worktree exists
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For each found worktree, check for changes:

```bash
git -C {WORKTREE_PATH} status --porcelain
```

If multiple worktrees have changes, display the multi-repo summary (see `references/messages.md`), then execute Steps 1-6 for each worktree sequentially, changing directory before each cycle.

### 0.4: Detect Node.js version

Read `references/node-setup.md` and follow its instructions to detect and store `$NODE_PREFIX`. This prefix must be prepended to any Node.js-dependent command (git commit with hooks, npx, npm, etc.).

For multi-repo setups, re-run this detection when switching worktrees — each repo may need a different Node.js version.

---

## Step 1: Check the repository state

```bash
git status
```

If no modifications are detected, inform the user and stop.

---

## Step 2: Stage files safely

### 2.1: Display modified files

```bash
git status --porcelain
```

### 2.2: Check for sensitive and problematic files

Scan for files that should not be committed:

**Sensitive files** (secrets, credentials):
- `.env`, `.env.*`
- `credentials.*`, `secrets.*`
- `*.pem`, `*.key`

**Problematic files** (bloat, dependencies):
- `node_modules/`, `vendor/`, `.next/`, `dist/`
- Binary files larger than 5MB (check with `find . -size +5M -not -path './.git/*'`)

If any are detected, warn the user (see `references/messages.md`) and exclude them from staging.

### 2.3: Stage safe files

```bash
git add -A
# Unstage sensitive files — these patterns act as a safety net even if .gitignore is misconfigured
git reset HEAD -- .env* credentials* secrets* *.pem *.key node_modules/ vendor/ 2>/dev/null || true
```

If the user wants to commit only a subset of files (e.g., they mentioned specific files or said "just commit X"), stage only those files instead of using `git add -A`.

---

## Step 3: Analyze the modifications

### 3.1: Get the diff

For large changesets, start with a summary to avoid flooding the context:

```bash
DIFF_LINES=$(git diff --cached --stat | tail -1)
echo "$DIFF_LINES"
```

If the diff exceeds ~500 lines, use `git diff --cached --stat` first to understand the scope, then read only the relevant files in detail. For smaller diffs, use `git diff --cached` directly.

### 3.2: Atomic commits — automatic split

Analyze whether the staged changes should be split. A split is necessary when:

- Modifications concern multiple distinct features
- There is a mix of different types (e.g.: `feat` + `fix` + `chore`)
- Changes affect independent scopes/modules
- The logical cohesion is low

**Exception**: If the user explicitly requested a single commit (e.g.: "tout ensemble", "single commit", "un seul commit", "all together", "no split"), respect that and create one commit.

If a split is needed, proceed directly — this is expected behavior, not something that needs permission:

1. Announce the split plan (how many commits, what each covers)
2. Unstage all: `git reset HEAD`
3. For each logical group:
   - Stage the relevant files: `git add <files>`
   - Create the commit (following Step 4 for the message)
   - Display confirmation
4. Display a summary of all commits created

---

## Step 4: Generate the commit message

### 4.1: Read commit parameters from config

The config was already loaded in Step 0.2. Extract these parameters (repo config overrides global):

| Parameter | Config path | Default |
| --------- | ----------- | ------- |
| Language | `.repositories.<name>.languages.commit` | `"en"` |
| Style | `.repositories.<name>.commit.style` | `"single-line"` |
| Format | `.repositories.<name>.commit.format` | `"angular"` |
| Co-Author | `.repositories.<name>.commit.coAuthor` | `false` |
| Include Ticket ID | `.repositories.<name>.commit.includeTicketId` | `false` |

### 4.2: Apply the style

**`single-line`** (default): message on a single line, no body, max ~72 characters.

**`multi-line`**: first line as short title (max 50 chars), empty line, then detailed body.

### 4.3: Apply the format

| Format | Pattern | Example |
| ------ | ------- | ------- |
| `angular` (default) | `type(scope): description` | `feat(auth): add JWT refresh` |
| `conventional` | `type: description` | `feat: add JWT refresh` |
| `gitmoji` | `emoji description` | `sparkles add JWT refresh` |
| `none` | Free form | `Add JWT refresh mechanism` |

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
Gitmoji mapping: sparkles (feat), bug (fix), memo (docs), lipstick (style), recycle (refactor), white_check_mark (test), wrench (chore)

### 4.4: Co-Author handling

This config overrides Claude Code's default co-author behavior. The reason: Magic Slash gives users explicit control over whether AI attribution appears in their git history.

- `coAuthor: true` → append after an empty line: `Co-Authored-By: Claude <noreply@anthropic.com>`
- `coAuthor: false` or absent → do not add any co-author line

### 4.5: Ticket ID handling

- `includeTicketId: false` or absent → do not add a ticket ID.
- `includeTicketId: true` → extract the ticket ID from the branch name:

  ```bash
  git branch --show-current
  ```

  Patterns: Jira `[A-Z]+-\d+`, GitHub `#\d+`. Append after an empty line: `[TICKET-ID]`.

  If no ticket ID is found in the branch name, skip this.

---

## Step 5: Create the commit

Prepend `$NODE_PREFIX` (from Step 0.4) if set, so pre-commit hooks run with the correct Node.js version.

```bash
# With NODE_PREFIX:
source ~/.nvm/nvm.sh && nvm use && git commit -m "generated message"

# Without NODE_PREFIX:
git commit -m "generated message"
```

### 5.1: Pre-commit hook error handling

If the commit fails, classify the error and act accordingly. The goal is to unblock the user without introducing regressions — auto-fix what's safe, ask for help on what's not.

| Level | Error type | Examples | Action |
| ----- | ---------- | -------- | ------ |
| 1 - Auto | Formatter | Prettier, Black, gofmt | Fix automatically, re-stage, retry |
| 2 - Semi-auto | Linter | ESLint --fix, Pylint, Rubocop | Fix, inform user, retry |
| 3 - Manual | Type check, tests, secrets | TypeScript, Jest, mypy | Ask the user (see `references/messages.md` for the prompt) |

**Auto-correction process (levels 1-2 only):**

1. Analyze the error output (affected files, lines, error type)
2. Fix the code (run formatter if available, prepend `$NODE_PREFIX` to Node.js commands)
3. Re-stage: `git add -A`
4. Retry the commit (same message)
5. Repeat up to 3 times max. After 3 failures, display the error and ask the user.

---

## Step 6: Confirm

```bash
git log -1 --oneline
```

Display the commit confirmation (see `references/messages.md`).

### 6.1: Update Magic Slash status

This curl notifies Magic Slash Desktop so it can update its UI. Without it, the user sees a stale status in the desktop app, which is confusing.

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=committed" > /dev/null 2>&1 || true
```

---

## Step 7: Multi-repo summary (if applicable)

If you committed in multiple worktrees, display a final summary listing all commits created across repos (see `references/messages.md`).
