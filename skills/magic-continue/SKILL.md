---
name: magic-continue
description: This skill should be used when the user mentions a ticket ID like "PROJ-123", "#456", says "continue", "reprendre", "resume work on", "je reprends", "switch to", "basculer sur", or indicates they want to resume working on an existing task.
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, mcp__atlassian__*, mcp__github__*
---

# magic-slash v0.14.0 - /continue

> **IMPORTANT**: You MUST follow EACH step in order. Do not skip any step.
>
> **CRITICAL STEPS THAT MUST NEVER BE SKIPPED**:
> - **Step 2.5**: Send metadata to Magic Slash Desktop (curl) - MANDATORY
> - **Step 2.6**: Update ticket status - MANDATORY
> - **Step 5**: After finding/creating the worktree, `cd` into it - MANDATORY
> - **Step 6**: Attach the repo to the agent (curl /repositories) - MANDATORY
> - **Step 6.5**: Report multi-repo context (curl /metadata + /repositories) - MANDATORY if multi-repo
> - **Step 7**: Check for existing PR and update metadata with PR link - MANDATORY

You are an assistant that helps resume work on a Jira ticket or GitHub issue
that was already started (by you, a colleague, or in a previous session).

## Step 0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display error based on system language
fi
```

### If the config does not exist

#### In English
```text
❌ Magic Slash configuration not found

Please create the config file at:
  ~/.config/magic-slash/config.json

See documentation: https://github.com/magic-slash/config
```

#### In French
```text
❌ Configuration Magic Slash introuvable

Veuillez créer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

## Language configuration

Read `~/.config/magic-slash/config.json` and determine the language based on the selected repo:

1. Once the repo is identified (step 5), read `.repositories.<name>.languages.discussion`
2. If no value is defined: English by default

- `discussion`: Language for your responses and the agent prompt (`"en"` or `"fr"`)

## Step 1: Detect ticket type

Analyze the provided argument: `$ARGUMENTS`

- **Jira format**: Contains an alphabetic prefix followed by a hyphen and digits (e.g.: `PROJ-123`, `ABC-456`)
  - Regex: `^[A-Z]+-\d+$`
  - → Go to **Step 2A** (Jira)

- **GitHub format**: A simple number, with or without `#` (e.g.: `123`, `#456`)
  - Regex: `^#?\d+$`
  - → Go to **Step 2B** (GitHub)

If the format is not recognized, ask the user to clarify based on `.languages.discussion`:

#### In English (discussion: "en" or absent)
```text
Unable to detect the ticket format. Please provide a valid ID:
  • Jira: PROJ-123
  • GitHub: #456 or 456
```

#### In French (discussion: "fr")
```text
Impossible de détecter le format du ticket. Veuillez fournir un ID valide :
  • Jira : PROJ-123
  • GitHub : #456 ou 456
```

## Step 2A: Retrieve the Jira ticket

Use the MCP Atlassian tool `mcp__atlassian__getJiraIssue` to retrieve the ticket details.

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

→ Continue to **Step 2.5** (metadata) then **Step 2.6** (status).

## Step 2B: Retrieve the GitHub issue

### 2B.1: Read the repos configuration

```bash
cat ~/.config/magic-slash/config.json
```

Retrieve the paths of all configured repos:

```json
{
  "repositories": {
    "api": {"path": "/path/to/api", "keywords": ["backend", "api"]},
    "web": {"path": "/path/to/web", "keywords": ["frontend", "ui"]}
  }
}
```

### 2B.2: Identify GitHub repos

For each configured repo, retrieve the owner and repo name:

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse the URL to extract `owner/repo` (possible formats: `git@github.com:owner/repo.git` or `https://github.com/owner/repo.git`).

### 2B.3: Search for the issue in each repo

For each identified repo, use `mcp__github__get_issue` to check if the issue exists:

- `owner`: The repo owner
- `repo`: The repo name
- `issue_number`: The issue number (without the `#`)

Collect all found issues.

### 2B.4: Resolution

- **No issue found**: Inform the user based on `.languages.discussion`:

  #### In English (discussion: "en" or absent)
  ```text
  No issue #{NUMBER} found in the configured repositories.
  ```

  #### In French (discussion: "fr")
  ```text
  Aucune issue #{NUMBER} trouvée dans les repositories configurés.
  ```

- **Single issue found**: Use this issue and continue. The scope is automatically the repo where the issue was found.

- **Multiple issues found**: Display the options and ask the user to choose:

  #### In English (discussion: "en" or absent)
  ```text
  Multiple issues #123 found:

  1. owner1/repo-api: "API issue title"
  2. owner2/repo-web: "Web issue title"

  Which one do you want to use? (or 'all')
  ```

  #### In French (discussion: "fr")
  ```text
  Plusieurs issues #123 trouvées :

  1. owner1/repo-api : "Titre de l'issue API"
  2. owner2/repo-web : "Titre de l'issue Web"

  Laquelle souhaitez-vous utiliser ? (ou 'all')
  ```

→ Continue to **Step 2.5** (metadata) then **Step 2.6** (status).

## Step 2.5: Update Magic Slash metadata

> ⚠️ **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop. You MUST execute it before continuing, even if the curl command seems trivial.

### 2.5.1: Generate a clear ticket description

Generate a concise and clear description of the ticket (2-3 sentences maximum) based on:
- The ticket title
- The ticket description/content
- The acceptance criteria (if present)

**The description must be in the configured language** (`.languages.discussion`):
- If `discussion: "fr"`: Generate the description in French
- If `discussion: "en"` or absent: Generate the description in English

**Example in English**:
```
Implement JWT token refresh mechanism. Add automatic token renewal before expiration and handle refresh failures gracefully.
```

**Example in French**:
```
Implémenter le mécanisme de rafraîchissement des tokens JWT. Ajouter le renouvellement automatique avant expiration et gérer les échecs de rafraîchissement.
```

### 2.5.2: Send metadata

Execute this command to update the title, ticket ID, description and agent status:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n '{TICKET_ID}: {TICKET_TITLE}' | jq -sRr @uri)&ticketId={TICKET_ID}&description=$(echo -n '{DESCRIPTION}' | jq -sRr @uri)&status=in%20progress" > /dev/null 2>&1 || true
```

Replace:
- `{TICKET_ID}`: The ticket ID (e.g.: `PROJ-123` or `#456`)
- `{TICKET_TITLE}`: The ticket title (short version, max 30 characters)
- `{DESCRIPTION}`: The description generated in step 2.5.1

Note: We use `jq -sRr @uri` to properly encode special characters in the URL.

This command is silent and never blocks the process.

**⚠️ REMINDER**: You MUST execute this curl command NOW before moving to the next step. Do not skip this step.

## Step 2.6: Update ticket status to "In Progress"

> ⚠️ **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for keeping the ticket status in sync. You MUST execute it before continuing.

Before continuing, update the ticket status to indicate that work has resumed.

**IMPORTANT**: This step must never block the process. In case of failure, display a warning and continue.

### 2.6A: For a Jira ticket (if coming from step 2A)

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`

2. **Look for a transition to "In Progress"** among the available transitions:
   - Look first for: "In Progress"
   - If not found, try: "En cours", "In Development", "Started", "In Work"

3. **Apply the transition** with `mcp__atlassian__transitionJiraIssue`

4. **In case of failure**: Display a warning but continue the process

   #### In English
   ```text
   ⚠️ Unable to move the ticket to "In Progress" (transition not available or insufficient permissions)
   ```

   #### In French
   ```text
   ⚠️ Impossible de déplacer le ticket vers "En cours" (transition non disponible ou permissions insuffisantes)
   ```

### 2.6B: For a GitHub issue (if coming from step 2B)

1. **Retrieve the issue labels** (already available from step 2B)

2. **Check if a progress label exists** in the current repo labels:
   - Look for an existing label among: "in-progress", "wip", "in progress", "working"

3. **If an appropriate label exists**: Add it to the issue via `mcp__github__update_issue` while keeping existing labels

4. **If no appropriate label exists**: Continue without modification (do not create a label automatically)

5. **In case of failure**: Display a warning but continue the process

   #### In English
   ```text
   ⚠️ Unable to add the "in-progress" label (label not found or insufficient permissions)
   ```

   #### In French
   ```text
   ⚠️ Impossible d'ajouter le label "in-progress" (label introuvable ou permissions insuffisantes)
   ```

**⚠️ REMINDER**: You MUST execute this status update NOW before moving to the next step. Do not skip this step.

→ Continue to **Step 3**.

## Step 3: Search for existing worktrees

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

- **If worktree(s) found** → Go to **Step 5** (Resolution)
- **If no worktree found** → Go to **Step 4** (Search branches)

## Step 4: Search for existing branches (if no worktree found)

For **each configured repo**:

```bash
cd {REPO_PATH}
# Local branches
git branch --list "*${TICKET_ID}*"
# Remote branches (fetch first)
git fetch origin
git branch -r --list "*${TICKET_ID}*"
```

Collect all found branches (local and remote) with their associated repo.

- **If branch(es) found** → Go to **Step 5** (Resolution)
- **If nothing found** → Go to **Step 5**, Case 3

## Step 5: Resolution and action

> ⚠️ **MANDATORY**: After resolving, you MUST `cd` into the worktree before continuing.

### Case 1 — Worktree(s) found

- **Single worktree**: `cd` into it directly

- **Multiple worktrees (multi-repo)**: Display the list, ask which one or "all"

  #### In English (discussion: "en" or absent)
  ```text
  Multiple worktrees found for {TICKET_ID}:

  1. /path/to/api-TICKET-ID (backend)
  2. /path/to/web-TICKET-ID (frontend)

  Which one do you want to use? (1, 2, or 'all')
  ```

  #### In French (discussion: "fr")
  ```text
  Plusieurs worktrees trouvés pour {TICKET_ID} :

  1. /path/to/api-TICKET-ID (backend)
  2. /path/to/web-TICKET-ID (frontend)

  Lequel souhaitez-vous utiliser ? (1, 2, ou 'all')
  ```

  - For "all" → multi-repo flow (Step 6.5)

### Case 2 — Branch(es) found but no worktree

Display found branches (local and remote) with their repo and propose creating a worktree.

#### In English (discussion: "en" or absent)
```text
Branch found for {TICKET_ID} but no worktree:

  • {BRANCH_NAME} (in {REPO_NAME}, {local/remote})

Creating a worktree from this branch...
```

#### In French (discussion: "fr")
```text
Branche trouvée pour {TICKET_ID} mais pas de worktree :

  • {BRANCH_NAME} (dans {REPO_NAME}, {locale/distante})

Création d'un worktree à partir de cette branche...
```

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

If multiple branches in different repos → propose creating worktrees for each (multi-repo).

### Case 3 — Nothing found

#### In English
```text
No branch or worktree found for {TICKET_ID}

Suggestion: Use /start {TICKET_ID} to begin working on this ticket.
```

#### In French
```text
Aucune branche ou worktree trouvé pour {TICKET_ID}

Suggestion : Utilisez /start {TICKET_ID} pour commencer à travailler sur ce ticket.
```

→ Stop the skill.

**⚠️ REMINDER**: You MUST be in the worktree (not in the main repo) before moving to the next step.

## Step 6: Attach repo(s) to the agent

> ⚠️ **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop. You MUST execute it after entering the worktree, even if the curl command seems trivial.

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["'$(pwd)'"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

This command is silent and never blocks the process.

**⚠️ REMINDER**: You MUST execute this curl command NOW before moving to the next step. Do not skip this step.

## Step 6.5: Report context and attach repos (if multiple repos)

> ⚠️ **MANDATORY IF MULTI-REPO - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop in full-stack mode. You MUST execute it if multiple worktrees were found/created, even if the curl commands seem trivial.

**If multiple worktrees** (full-stack task):

1. Collect all absolute paths of the worktrees

2. **⚠️ MANDATORY** - Send full-stack metadata to Magic Slash Desktop:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&fullStackTaskId={TICKET_ID}&relatedWorktrees=$(echo -n '["{WORKTREE_PATH_1}","{WORKTREE_PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

3. **⚠️ MANDATORY** - Attach all worktrees to the agent so it stays displayed in all relevant projects:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["{WORKTREE_PATH_1}","{WORKTREE_PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Replace:
- `{TICKET_ID}`: The ticket ID (e.g.: `PROJ-123`)
- `{WORKTREE_PATH_1}`, `{WORKTREE_PATH_2}`: The absolute paths of the worktrees

These commands are silent and never block the process.

**⚠️ REMINDER**: You MUST execute BOTH curl commands above NOW before moving to the next sub-step. Do not skip them.

4. **Check if `CLAUDE.local.md` already exists** in each worktree. If missing, create it:

```bash
cat > {WORKTREE_PATH}/CLAUDE.local.md << 'EOF'
# Full-Stack Context

You are working on ticket **{TICKET_ID}** which spans multiple repos.

## Worktrees for this task
{WORKTREE_LIST}

## Instructions
- Use `cd` to navigate to the appropriate worktree
- You can work on both repos in a single session
- Make sure changes are consistent across repos
EOF
```

Example of `{WORKTREE_LIST}`:
```
- **Backend**: /projects/api-PROJ-123
- **Frontend**: /projects/web-PROJ-123
```

**Note**: Adapt the file language according to `.languages.discussion`.

After creating the context files, `cd` into the **first** worktree to begin work.

## Step 7: Check for existing Pull Request

> ⚠️ **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop. You MUST execute it to detect existing PRs and update metadata accordingly.

For each worktree/repo, check if a PR already exists for the current branch:

### 7.1: Get branch and repo info

```bash
BRANCH=$(git branch --show-current)
REMOTE_URL=$(git remote get-url origin)
# Parse owner/repo from REMOTE_URL
```

### 7.2: Search for an open PR

Use `mcp__github__list_pull_requests` to search for an open PR on this branch:
- `owner`: repo owner
- `repo`: repo name
- `head`: `"owner:branch-name"` (e.g., `"myorg:feature/PROJ-123"`)
- `state`: `"open"`

### 7.3: If PR found

Extract PR number and URL, then **MANDATORY** - update Desktop metadata with PR info:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&prUrl=$(echo -n '{PR_URL}' | jq -sRr @uri)&prRepo=$(echo -n "$PWD" | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Replace:
- `{PR_URL}`: The full PR URL (e.g.: `https://github.com/org/repo/pull/42`)

This command is silent and never blocks the process.

**⚠️ REMINDER**: You MUST execute this curl command NOW if a PR was found. Do not skip this step.

Include PR info in the summary (Step 8).

### 7.4: If no PR found

Continue without PR info (nothing to report).

## Step 8: Quick status summary

Display a summary to get context on the current state:

```bash
# Commits on the branch (compared to main/origin)
git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline origin/develop..HEAD 2>/dev/null

# Uncommitted modified files
git status --short

# Current diff summary
git diff --stat
```

### Summary template (single repo, with PR) — English

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resuming work on {TICKET_ID}: "{TICKET_TITLE}"

  Source    : Jira / GitHub (owner/repo)
  Ticket    : [ID] - [Title]
  Worktree  : /path/to/repo-TICKET-ID
  Branch    : feature/PROJ-123
  PR        : #42 (open) - https://github.com/org/repo/pull/42

  Current state:
    3 commits ahead of main
    2 modified files (not staged)
    1 file staged

  Recent commits:
    abc1234 feat(auth): add token validation
    def5678 feat(auth): add login endpoint

Ready to continue. What would you like to do?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Summary template (single repo, with PR) — French

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reprise du travail sur {TICKET_ID} : "{TICKET_TITLE}"

  Source    : Jira / GitHub (owner/repo)
  Ticket    : [ID] - [Title]
  Worktree  : /path/to/repo-TICKET-ID
  Branche   : feature/PROJ-123
  PR        : #42 (ouverte) - https://github.com/org/repo/pull/42

  État actuel :
    3 commits en avance sur main
    2 fichiers modifiés (non stagés)
    1 fichier stagé

  Commits récents :
    abc1234 feat(auth): add token validation
    def5678 feat(auth): add login endpoint

Prêt à continuer. Que souhaitez-vous faire ?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Summary template (single repo, no PR)

Same as above but without the `PR` line.

### Summary template (multi-repo)

Similar but with a section per worktree showing each repo's state and PR status:

#### In English

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resuming work on {TICKET_ID}: "{TICKET_TITLE}" (Full-Stack)

  Source    : Jira / GitHub
  Ticket    : [ID] - [Title]

  📁 Backend: /path/to/api-TICKET-ID
    Branch  : feature/PROJ-123
    PR      : #42 (open) - https://github.com/org/api/pull/42
    State   : 3 commits ahead, 2 modified files

  📁 Frontend: /path/to/web-TICKET-ID
    Branch  : feature/PROJ-123
    PR      : #43 (open) - https://github.com/org/web/pull/43
    State   : 1 commit ahead, no pending changes

Ready to continue. What would you like to do?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### In French

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reprise du travail sur {TICKET_ID} : "{TICKET_TITLE}" (Full-Stack)

  Source    : Jira / GitHub
  Ticket    : [ID] - [Title]

  📁 Backend : /path/to/api-TICKET-ID
    Branche : feature/PROJ-123
    PR      : #42 (ouverte) - https://github.com/org/api/pull/42
    État    : 3 commits en avance, 2 fichiers modifiés

  📁 Frontend : /path/to/web-TICKET-ID
    Branche : feature/PROJ-123
    PR      : #43 (ouverte) - https://github.com/org/web/pull/43
    État    : 1 commit en avance, aucune modification en attente

Prêt à continuer. Que souhaitez-vous faire ?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**No planning/exploration step** — just display git state + PR status. The user can ask for a deeper analysis if needed.

---

## API Reference - Magic Slash Desktop

### Endpoint `/metadata`

Updates the agent metadata in the UI.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Terminal ID (from `$MAGIC_SLASH_TERMINAL_ID`) |
| `title` | string | No | Title displayed in the sidebar (URL-encoded) |
| `ticketId` | string | No | Ticket ID (e.g.: `PROJ-123`, `#456`) |
| `description` | string | No | Short ticket description (URL-encoded) |
| `status` | string | No | Status: `"in progress"`, `"committed"`, `"PR created"` |
| `fullStackTaskId` | string | No | Full-stack task ID (to link multiple worktrees) |
| `relatedWorktrees` | JSON array | No | Absolute paths of related worktrees (URL-encoded) |
| `prUrl` | string | No | URL of the created PR |
| `prRepo` | string | No | Path of the PR repo |

**Example**:
```bash
curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=PROJ-123%3A%20Add%20login&status=in%20progress"
```

### Endpoint `/repositories`

Attaches repositories to the agent for grouping in the sidebar.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Terminal ID (from `$MAGIC_SLASH_TERMINAL_ID`) |
| `repos` | JSON array | Yes | List of absolute repo paths (URL-encoded) |

**Example**:
```bash
curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=%5B%22%2Fpath%2Fto%2Frepo%22%5D"
```

**Note**: These endpoints are silent (`|| true`) and must never block the workflow. They are only available if the environment variables `$MAGIC_SLASH_PORT` and `$MAGIC_SLASH_TERMINAL_ID` are defined.

---

## Glossary

| EN Term | FR Term | Description |
|---------|---------|-------------|
| Worktree | Espace de travail | Separate Git working copy |
| Stage / Staged | Indexer / Indexé | Prepare files for a commit |
| Unstage | Désindexer | Remove files from the index |
| Split | Diviser | Separate into multiple commits |
| Hook | Hook | Script executed before/after a Git action |
| Remote | Dépôt distant | Git server (GitHub, GitLab) |
| Push | Pousser | Send commits to the remote |
| Pull Request (PR) | Demande de fusion | Merge proposal |
| Base branch | Branche cible | Branch where changes will be merged |
| Head branch | Branche source | Branch containing the changes |
