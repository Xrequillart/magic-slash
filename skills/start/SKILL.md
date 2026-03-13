---
name: start
description: This skill should be used when the user mentions a ticket ID like "PROJ-123", "#456", says "start", "commencer", "travailler sur", "je vais bosser sur", "begin work on", "work on ticket", "work on issue", "démarre", "démarrer", or indicates they want to start working on a specific task.
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, mcp__atlassian__*, mcp__github__*
---

# magic-slash v0.12.3 - /start

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **CRITICAL STEPS THAT MUST NEVER BE SKIPPED**:
> - **Step 2.5**: Send metadata to Magic Slash Desktop (curl) - MANDATORY
> - **Step 2.6**: Update ticket status - MANDATORY
> - **Step 4**: After creating the worktree, `cd` into the worktree - MANDATORY
> - **Step 4.1**: Attach the repo to the agent (curl /repositories) - MANDATORY
> - **Step 4.5**: Report multi-repo context (curl /metadata + /repositories) - MANDATORY if multi-repo

You are an assistant that helps start a development task from a Jira ticket or a GitHub issue.

## Step 0.0: Check configuration

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

1. Once the repo is identified (step 3), read `.repositories.<name>.languages.discussion`
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

If the format is not recognized, ask the user to clarify.

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

- **No issue found**: Inform the user that no issue with this number exists in the configured repos.

- **Single issue found**: Use this issue and continue. The scope is automatically the repo where the issue was found.

- **Multiple issues found**: Display the options and ask the user to choose:

  ```text
  Multiple issues #123 found:

  1. owner1/repo-api: "API issue title"
  2. owner2/repo-web: "Web issue title"

  Which one do you want to use? (or 'all')
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

Before continuing, update the ticket status to indicate that work has started.

**IMPORTANT**: This step must never block the process. In case of failure, display a warning and continue.

### 2.6A: For a Jira ticket (if coming from step 2A)

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`

2. **Look for a transition to "In Progress"** among the available transitions:
   - Look first for: "In Progress"
   - If not found, try: "En cours", "In Development", "Started", "In Work"

3. **Apply the transition** with `mcp__atlassian__transitionJiraIssue`

4. **In case of failure**: Display a warning but continue the process

   ```text
   ⚠️ Unable to move the ticket to "In Progress" (transition not available or insufficient permissions)
   ```

### 2.6B: For a GitHub issue (if coming from step 2B)

1. **Retrieve the issue labels** (already available from step 2B)

2. **Check if a progress label exists** in the current repo labels:
   - Look for an existing label among: "in-progress", "wip", "in progress", "working"

3. **If an appropriate label exists**: Add it to the issue via `mcp__github__update_issue` while keeping existing labels

4. **If no appropriate label exists**: Continue without modification (do not create a label automatically)

5. **In case of failure**: Display a warning but continue the process

   ```text
   ⚠️ Unable to add the "in-progress" label (label not found or insufficient permissions)
   ```

→ Continue to **Step 3**.

## Step 3: Analyze ticket scope (Smart repo selection)

### 3.1: Read the configuration

If not already done, read the configuration file:

```bash
cat ~/.config/magic-slash/config.json
```

### 3.2: Extract ticket information

**For Jira**, collect:

- The ticket **labels**
- The Jira **components** (if defined)
- The **title** and **description**

**For GitHub**, collect:

- The issue **labels**
- The **title** and **description**

### 3.3: Calculate a relevance score for each repo

For each configured repo, calculate a score based on the defined keywords:

| Match source                              | Points |
| ----------------------------------------- | ------ |
| Jira label/component matching a keyword   | +10    |
| GitHub label matching a keyword            | +10    |
| Keyword found in title                     | +5     |
| Keyword found in description               | +2     |

**Calculation example**:

```text
Ticket: "Add an API endpoint for users"
Labels: ["backend"]

Configured repos:
- api: keywords=["backend", "api", "server"] → score = 10 (label) + 5 (title "API") = 15
- web: keywords=["frontend", "ui", "react"] → score = 0
- mobile: keywords=["mobile", "ios", "android"] → score = 0
```

### 3.4: Scope resolution

- **Single repo with score > 0**: Use this repo directly

- **Multiple repos with scores > 0**: Display options with scores and ask the user:

  ```text
  This ticket seems to involve multiple repositories:

  1. api (score: 15) - matched keywords: "backend", "api"
  2. web (score: 5) - matched keywords: "frontend"

  Which one do you want to use? (1, 2, or 'all')
  ```

- **No match (all scores = 0)**: List all repos and ask the user:

  ```text
  Unable to automatically determine the relevant repo.

  Available repositories:
  1. api (/path/to/api)
  2. web (/path/to/web)
  3. mobile (/path/to/mobile)

  Which one do you want to use? (1, 2, 3, or 'all')
  ```

**Special case for GitHub**: If the issue was found in a single repo during step 2B,
the scope is automatically that repo (no scoring needed).

## Step 4: Create worktrees

> ⚠️ **MANDATORY**: After creating the worktree, you MUST `cd` into the created worktree before continuing.

### 4.0: Check if the worktree already exists

Before creating a worktree, check if it already exists:

```bash
WORKTREE_PATH="../${REPO_NAME}-$TICKET_ID"
if [ -d "$WORKTREE_PATH" ]; then
  # Worktree already exists
fi
```

#### If the worktree exists - In English
```text
⚠️ Worktree already exists: /path/to/repo-TICKET-ID

Options:
1. Use existing worktree (recommended)
2. Delete and recreate
3. Abort

Choose (1/2/3):
```

#### If the worktree exists - In French
```text
⚠️ Le worktree existe déjà : /path/to/repo-TICKET-ID

Options :
1. Utiliser le worktree existant (recommandé)
2. Supprimer et recréer
3. Abandonner

Choix (1/2/3) :
```

**Behaviors**:
- Option 1: `cd` into the existing worktree, continue to step 4.5
- Option 2: `git worktree remove --force {path}` then recreate
- Option 3: Stop the skill

### 4.1: Create the worktree

For each selected repo:

1. Navigate to the repo directory
2. Get the repo folder name
3. Fetch the latest changes
4. Create the worktree AT THE SAME LEVEL as the main repo
5. **Keep track of the absolute path of the created worktree** for the next step
6. **⚠️ CRITICAL: Change directory to the created worktree**
7. **⚠️ MANDATORY: Attach the worktree to the agent** so it stays displayed in the correct project

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
git fetch origin
git worktree add -b feature/$TICKET_ID ../${REPO_NAME}-$TICKET_ID origin/main
# IMPORTANT: Immediately change to the created worktree
cd ../${REPO_NAME}-$TICKET_ID
```

> ⚠️ **MANDATORY - DO NOT SKIP**: Attach this repo to the agent for grouping in the Magic Slash Desktop sidebar.

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["'$(pwd)'"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

**Note on branch naming**:

- For Jira: use the ID as-is (e.g.: `feature/PROJ-1234`)
- For GitHub: prefix with the repo name to avoid conflicts (e.g.: `feature/repo-name-123`)

Example: If the repo is `/projects/my-api`, the worktree will be `/projects/my-api-PROJ-1234` (Jira)
or `/projects/my-api-123` (GitHub)

**⚠️ REMINDER**: You MUST be in the worktree (not in the main repo) before moving to the next step.

## Step 4.5: Report context and attach repos (if multiple repos)

> ⚠️ **MANDATORY IF MULTI-REPO**: This step is CRITICAL for the proper functioning of Magic Slash Desktop in full-stack mode. You MUST execute it if multiple worktrees were created.

**If multiple worktrees were created** (full-stack task):

1. Collect all absolute paths of the created worktrees

2. **MANDATORY** - Send full-stack metadata to Magic Slash Desktop:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&fullStackTaskId={TICKET_ID}&relatedWorktrees=$(echo -n '["{WORKTREE_PATH_1}","{WORKTREE_PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

3. **MANDATORY** - Attach all worktrees to the agent so it stays displayed in all relevant projects:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["{WORKTREE_PATH_1}","{WORKTREE_PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Replace:
- `{TICKET_ID}`: The ticket ID (e.g.: `PROJ-123`)
- `{WORKTREE_PATH_1}`, `{WORKTREE_PATH_2}`: The absolute paths of the created worktrees

**Important note**: The `/repositories` endpoint allows the agent to stay attached to its projects even when Claude temporarily navigates elsewhere. The UI will use this list for grouping in the sidebar.

## Step 4.6: Create the full-stack context file (if multiple repos)

**If multiple worktrees were created**, create a `CLAUDE.local.md` file in **each** worktree so that Claude keeps context even when resuming a conversation:

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

## Step 5: Planning and implementation

> **IMPORTANT**: This step is divided into 5 sub-steps. You must execute them in order and **NEVER** start implementation (5.4) without explicit user approval (5.3).

Once the worktrees are created, display a brief summary:

### Summary for a single repo:
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : Jira / GitHub (owner/repo)
🎫 Ticket    : [ID] - [Title]
📋 Type      : [Bug/Feature/Task...] or Labels
📁 Worktree  : /path/to/repo-TICKET-ID

🔍 Exploring codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Summary for a full-stack task (multiple repos):
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : Jira / GitHub
🎫 Ticket    : [ID] - [Title]
📋 Type      : [Bug/Feature/Task...] or Labels
🔀 Full-Stack Task:
   📁 Backend  : /path/to/api-TICKET-ID
   📁 Frontend : /path/to/web-TICKET-ID

🔍 Exploring codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 5.1: Codebase exploration

Explore the codebase to understand the architecture and identify impacted files.

**Actions to perform:**

1. **Project structure**: Use `ls` and `Glob` to understand the organization
2. **Configuration files**: Read config files (`package.json`, `tsconfig.json`, etc.)
3. **Existing patterns**: Use `Grep` to find similar implementations
4. **Impacted files**: Identify files that will need to be modified or created

**For a full-stack task**:
- Explore each worktree separately
- Identify interactions between repos (API endpoints, shared types, etc.)

---

### 5.2: Create the implementation plan

Create a detailed implementation plan using the following template based on `.languages.discussion`:

#### Template in English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 IMPLEMENTATION PLAN - [TICKET-ID]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary
[2-3 sentences describing what needs to be done]

## Technical Analysis

### Files to modify
- `path/to/file1.ts` - [reason]
- `path/to/file2.ts` - [reason]

### Files to create
- `path/to/new-file.ts` - [purpose]

### Reference patterns
- Similar implementation found in: `path/to/reference.ts`
- Pattern to follow: [description]

## Implementation Steps

### Step 1: [Short title]
- [ ] [Detailed action]
- [ ] [Detailed action]

### Step 2: [Short title]
- [ ] [Detailed action]
- [ ] [Detailed action]

### Step 3: [Short title]
- [ ] [Detailed action]

[Add more steps as needed]

## Risks and Considerations
- ⚠️ [Risk or important point]
- ⚠️ [Risk or important point]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Template in French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PLAN D'IMPLÉMENTATION - [TICKET-ID]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Résumé
[2-3 phrases décrivant ce qui doit être fait]

## Analyse technique

### Fichiers à modifier
- `path/to/file1.ts` - [raison]
- `path/to/file2.ts` - [raison]

### Fichiers à créer
- `path/to/new-file.ts` - [objectif]

### Patterns de référence
- Implémentation similaire trouvée dans : `path/to/reference.ts`
- Pattern à suivre : [description]

## Étapes d'implémentation

### Étape 1 : [Titre court]
- [ ] [Action détaillée]
- [ ] [Action détaillée]

### Étape 2 : [Titre court]
- [ ] [Action détaillée]
- [ ] [Action détaillée]

### Étape 3 : [Titre court]
- [ ] [Action détaillée]

[Ajouter d'autres étapes si nécessaire]

## Risques et points d'attention
- ⚠️ [Risque ou point important]
- ⚠️ [Risque ou point important]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Full-stack template in English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 IMPLEMENTATION PLAN - [TICKET-ID] (Full-Stack)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary
[2-3 sentences describing what needs to be done]

## Technical Analysis

### Backend ([backend worktree path])

#### Files to modify
- `path/to/file1.ts` - [reason]

#### Files to create
- `path/to/new-file.ts` - [purpose]

### Frontend ([frontend worktree path])

#### Files to modify
- `path/to/component.tsx` - [reason]

#### Files to create
- `path/to/new-component.tsx` - [purpose]

### Reference patterns
- Backend pattern: `path/to/reference.ts`
- Frontend pattern: `path/to/reference.tsx`

## Implementation Steps

### Backend Steps

#### Step B1: [Short title]
- [ ] [Detailed action]
- [ ] [Detailed action]

#### Step B2: [Short title]
- [ ] [Detailed action]

### Frontend Steps

#### Step F1: [Short title]
- [ ] [Detailed action]
- [ ] [Detailed action]

#### Step F2: [Short title]
- [ ] [Detailed action]

## Risks and Considerations
- ⚠️ [Risk or important point]
- ⚠️ [Risk or important point]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Full-stack template in French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PLAN D'IMPLÉMENTATION - [TICKET-ID] (Full-Stack)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Résumé
[2-3 phrases décrivant ce qui doit être fait]

## Analyse technique

### Backend ([chemin worktree backend])

#### Fichiers à modifier
- `path/to/file1.ts` - [raison]

#### Fichiers à créer
- `path/to/new-file.ts` - [objectif]

### Frontend ([chemin worktree frontend])

#### Fichiers à modifier
- `path/to/component.tsx` - [raison]

#### Fichiers à créer
- `path/to/new-component.tsx` - [objectif]

### Patterns de référence
- Pattern backend : `path/to/reference.ts`
- Pattern frontend : `path/to/reference.tsx`

## Étapes d'implémentation

### Étapes Backend

#### Étape B1 : [Titre court]
- [ ] [Action détaillée]
- [ ] [Action détaillée]

#### Étape B2 : [Titre court]
- [ ] [Action détaillée]

### Étapes Frontend

#### Étape F1 : [Titre court]
- [ ] [Action détaillée]
- [ ] [Action détaillée]

#### Étape F2 : [Titre court]
- [ ] [Action détaillée]

## Risques et points d'attention
- ⚠️ [Risque ou point important]
- ⚠️ [Risque ou point important]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 5.2.5: Dispatcher (execution strategy)

After creating the plan, analyze it to determine the best execution strategy: **Solo** (single agent, sequential) or **Multi-agent** (parallel subagents orchestrated by the main agent).

#### Evaluation criteria

Evaluate the plan using these criteria:

| Criterion | Weight | Subagent threshold |
|-----------|--------|--------------------|
| Number of repos involved | Strong | > 1 repo → strong indication |
| Number of steps in the plan | Medium | > 4 independent steps |
| Number of files to modify/create | Medium | > 8 files |
| Independence of steps | Strong | Steps parallelizable without dependencies |

#### Decision rules

- **Solo**: The task is simple, steps are tightly coupled, or few files are involved. The agent executes everything sequentially (current behavior).
- **Multi-agent**: Steps are independent and the workload is significant (e.g. backend + frontend, multiple modules with no dependencies between them). The main agent orchestrates subagents in parallel.

#### Strategy display

Display the chosen strategy as part of the plan output (before approval), based on `.languages.discussion`:

##### In English (discussion: "en" or absent)

**Multi-agent:**
```text
🎯 Execution strategy: Multi-agent ({N} subagents)

  Agent 1 ({Domain1}): Steps {list}
  Agent 2 ({Domain2}): Steps {list}

  Orchestrator: Main agent (sync + final summary)
```

**Solo:**
```text
🎯 Execution strategy: Solo

  The entire plan will be executed sequentially.
```

##### In French (discussion: "fr")

**Multi-agent:**
```text
🎯 Strategie d'execution : Multi-agent ({N} subagents)

  Agent 1 ({Domaine1}) : Etapes {liste}
  Agent 2 ({Domaine2}) : Etapes {liste}

  Orchestrateur : Agent principal (sync + resume final)
```

**Solo:**
```text
🎯 Strategie d'execution : Solo

  L'ensemble du plan sera execute sequentiellement.
```

---

### 5.3: Request approval

> **⚠️ MANDATORY**: You must **NEVER** start implementation without receiving explicit approval from the user.

After presenting the plan and the execution strategy (from step 5.2.5), request approval for both. The user validates the plan **and** the strategy at the same time.

Display based on `.languages.discussion`:

#### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Does this plan and execution strategy look good to you?

• Type "yes", "ok", "go", or "let's go" to start implementation
• Type "no" or ask questions if you want to discuss changes
• You can also suggest modifications to the plan or the strategy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Ce plan et cette strategie d'execution te conviennent-ils ?

• Tape "oui", "ok", "go", ou "c'est parti" pour lancer l'implementation
• Tape "non" ou pose des questions si tu veux discuter de modifications
• Tu peux aussi suggerer des modifications au plan ou a la strategie

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Expected behavior:**

- **Positive response** (oui, yes, ok, go, let's go, c'est parti, allons-y) → Go to step 5.4
- **Negative response or questions** → Answer questions, adjust the plan if necessary, then request approval again
- **Modifications requested** → Update the plan and present it again for approval

---

### 5.4: Implementation (adaptive)

> **Prerequisite**: The user has approved the plan and strategy in step 5.3.

The implementation adapts based on the strategy chosen by the dispatcher (step 5.2.5).

#### 5.4A: Solo mode

If the dispatcher chose **Solo**, implement the solution by following the plan step by step (standard behavior).

**Progress display based on `.languages.discussion`:**

##### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION IN PROGRESS (Solo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Step [X]/[N]: [Step title]

[Description of what you're doing]
```

##### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION EN COURS (Solo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Etape [X]/[N] : [Titre de l'etape]

[Description de ce que tu fais]
```

**Solo implementation instructions:**

1. **Follow the plan**: Implement each step in the defined order
2. **Display progress**: Indicate which step you're working on (X/N)
3. **Use the right tools**: `Edit` to modify, `Write` to create
4. **Verify the code**: Make sure the code compiles/works
5. **DO NOT commit**: The user will use `/commit` afterwards

**For a full-stack task in solo mode:**
- Use `cd [path]` to navigate between worktrees
- Implement the backend first, then the frontend (or according to the plan)
- Make sure changes are consistent across repos

#### 5.4B: Multi-agent mode

If the dispatcher chose **Multi-agent**, the main agent orchestrates parallel subagents.

**Subagent launch display based on `.languages.discussion`:**

##### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION IN PROGRESS (Multi-agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Launching {N} subagents in parallel...

  Agent 1 ({Domain1}): Steps {list}
  Agent 2 ({Domain2}): Steps {list}

⏳ Waiting for all agents to complete...
```

##### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION EN COURS (Multi-agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Lancement de {N} subagents en parallele...

  Agent 1 ({Domaine1}) : Etapes {liste}
  Agent 2 ({Domaine2}) : Etapes {liste}

⏳ En attente de la completion de tous les agents...
```

**Multi-agent orchestration steps:**

1. **Prepare subagent prompts**: For each subagent, the main agent prepares a detailed prompt containing:
   - The ticket context (ID, title, description, acceptance criteria)
   - The assigned steps from the plan
   - The worktree path to work in
   - Constraints: do NOT commit, follow project patterns and conventions, use `Edit` to modify and `Write` to create files

2. **Launch subagents in parallel**: Use the `Agent` tool to launch all subagents simultaneously. Each `Agent` call includes:
   - `prompt`: The detailed prompt prepared above
   - If working in different repos: use worktree isolation

3. **Wait and collect results**: The main agent waits for all subagents to complete and collects their results.

4. **Verify consistency**: After all subagents finish, the main agent:
   - Reviews the changes made by each subagent
   - Checks for conflicts or inconsistencies between the work of different agents
   - Fixes any integration issues if needed

5. **Proceed to step 5.5**: Produce the final summary combining all subagent results

---

### 5.5: Final summary

Once implementation is complete, display a full summary based on `.languages.discussion`:

#### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implementation completed for [TICKET-ID]

## Files modified
- `path/to/file1.ts` - [brief description]
- `path/to/file2.ts` - [brief description]

## Files created
- `path/to/new-file.ts` - [brief description]

## Summary of changes
[2-3 sentences summarizing the main changes]

## Decisions made
- [Technical decision if any]
- [Technical decision if any]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes
   • Run /commit to create a commit
   • Run /done to finalize (PR + ticket update)
```

#### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implémentation terminée pour [TICKET-ID]

## Fichiers modifiés
- `path/to/file1.ts` - [brève description]
- `path/to/file2.ts` - [brève description]

## Fichiers créés
- `path/to/new-file.ts` - [brève description]

## Résumé des changements
[2-3 phrases résumant les changements principaux]

## Décisions prises
- [Décision technique si applicable]
- [Décision technique si applicable]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements
   • Lance /commit pour créer un commit
   • Lance /done pour finaliser (PR + mise à jour du ticket)
```

#### Full-stack summary in English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implementation completed for [TICKET-ID] (Full-Stack)

## Backend ([backend worktree path])

### Files modified
- `path/to/file1.ts` - [brief description]

### Files created
- `path/to/new-file.ts` - [brief description]

## Frontend ([frontend worktree path])

### Files modified
- `path/to/component.tsx` - [brief description]

### Files created
- `path/to/new-component.tsx` - [brief description]

## Summary of changes
[2-3 sentences summarizing the main changes]

## How the repos interact
[Description of the integration between backend and frontend]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes in both repos
   • Run /commit in each worktree to create commits
   • Run /done to finalize (PR + ticket update)
```

#### Full-stack summary in French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implémentation terminée pour [TICKET-ID] (Full-Stack)

## Backend ([chemin worktree backend])

### Fichiers modifiés
- `path/to/file1.ts` - [brève description]

### Fichiers créés
- `path/to/new-file.ts` - [brève description]

## Frontend ([chemin worktree frontend])

### Fichiers modifiés
- `path/to/component.tsx` - [brève description]

### Fichiers créés
- `path/to/new-component.tsx` - [brève description]

## Résumé des changements
[2-3 phrases résumant les changements principaux]

## Interaction entre les repos
[Description de l'intégration entre backend et frontend]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements dans les deux repos
   • Lance /commit dans chaque worktree pour créer les commits
   • Lance /done pour finaliser (PR + mise à jour du ticket)
```

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
