---
name: commit
description: This skill should be used when the user says "commit", "je suis prêt à committer", "on commit", "create a commit", "faire un commit", "committer les changements", "save my changes", "enregistrer mes changements", "prêt à committer", "ready to commit", or indicates they want to save their current changes as a commit.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep
---

# magic-slash v0.12.8 - /commit

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **CRITICAL STEPS THAT MUST NEVER BE SKIPPED**:
> - **Step 6.1**: Update Magic Slash status (curl) - MANDATORY

You are an assistant that creates atomic commits with conventional messages.

> **ATOMIC COMMITS**: You must always aim for atomic commits (one commit = one logical unit of change). If you detect that the staged changes concern multiple distinct features, you MUST split them into multiple commits. Do not ask for permission, just do it. This is a best practice that the user expects from you.

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

Read `~/.config/magic-slash/config.json` and determine the language for your responses:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. Read `.repositories.<name>.languages.discussion`, default `"en"`

- `discussion`: Language for your responses to the user (`"en"` or `"fr"`)
- `commit`: Language for commit messages (`.repositories.<name>.languages.commit` or `"en"`)

## Step 0: Detect multi-repo worktrees

### 0.1: Extract the ticket ID from the current worktree

Get the current directory name and extract the ticket ID:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ID is detected (you are in a regular repo, not a worktree), skip directly to **Step 1**.

### 0.2: Read the repos configuration

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

### 0.3: Search for associated worktrees

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For example, if TICKET-ID = `PROJ-123` and the repos are `/projects/api` and `/projects/web`, search for:

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collect all found worktrees.

### 0.4: Check changes in each worktree

For each found worktree, check if there are changes:

```bash
git -C {WORKTREE_PATH} status --porcelain
```

Keep only the worktrees that have modifications.

### 0.5: Summary and confirmation

If multiple worktrees have changes, display a summary based on `.languages.discussion`:

#### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Multi-repo commits detected for {TICKET-ID}

Worktrees with changes:
  • /projects/api-PROJ-123 (3 files modified)
  • /projects/web-PROJ-123 (5 files modified)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Commits multi-repo détectés pour {TICKET-ID}

Worktrees avec des changements :
  • /projects/api-PROJ-123 (3 fichiers modifiés)
  • /projects/web-PROJ-123 (5 fichiers modifiés)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then execute **Steps 1 to 6** for EACH worktree that has changes.
Change directory before each cycle:

```bash
cd {WORKTREE_PATH}
```

At the end of each commit, display a confirmation before moving to the next worktree.

---

## Step 1: Check the repository state

```bash
git status
```

If no modifications are detected, inform the user that there is nothing to commit.

## Step 2: Display and confirm files to stage

### 2.1: Display modified files

```bash
git status --porcelain
```

### 2.2: Check for sensitive files

Check if potentially sensitive files are present:
- `.env`, `.env.*`
- `credentials.*`, `secrets.*`
- `*.pem`, `*.key`
- `node_modules/`, `vendor/`

If detected, display a warning based on `.languages.discussion`:

#### In English
```text
⚠️ Potentially sensitive files detected:
  • .env.local
  • credentials.json

These files will NOT be staged. Continue? (Ctrl+C to abort)
```

#### In French
```text
⚠️ Fichiers potentiellement sensibles détectés :
  • .env.local
  • credentials.json

Ces fichiers ne seront PAS stagés. Continuer ? (Ctrl+C pour abandonner)
```

### 2.3: Stage safe files

```bash
git add -A
git reset HEAD -- .env* credentials* secrets* *.pem *.key 2>/dev/null || true
```

## Step 3: Analyze the modifications

```bash
git diff --cached
```

Analyze the modified files to understand the nature of the changes.

## Step 3.1: Atomic commits - Automatic split

> **IMPORTANT**: You must create atomic commits. If the changes are not cohesive, you MUST split them **without asking for permission**.

Analyze whether the staged changes should be split into multiple commits. **A split is MANDATORY** if:

- The modifications concern multiple distinct features
- There is a mix of different types (e.g.: `feat` + `fix` + `chore`)
- The changes affect independent scopes/modules
- The logical cohesion of the changes is low

**Exception**: If the user has explicitly requested a single commit (e.g.: "commit tout ensemble", "single commit", "un seul commit"), do NOT split.

**How to detect**: Look in the conversation context for whether the user mentioned:
- "single commit", "one commit", "un seul commit"
- "tout ensemble", "all together"
- "no split", "pas de split"

If detected → Create a single commit even if the split criteria are met.

**If a split is necessary**, proceed directly based on `.languages.discussion`:

### In English (discussion: "en" or absent)

1. **Announce** that you will create multiple atomic commits (don't ask, inform)
2. Briefly describe each commit you will create (type, scope, description)
3. **Execute the split**:
   - Unstage all files: `git reset HEAD`
   - For each logical commit:
     - Stage only the relevant files: `git add <files>`
     - Create the commit with its appropriate message
     - Display confirmation for each commit created
   - Continue until all changes are committed
4. Display a summary of all commits created

**Example output:**
```text
🔀 Multiple logical changes detected - Creating atomic commits...

Commit 1/3: feat(auth): add login validation
  → src/auth.ts, src/validators.ts

Commit 2/3: fix(api): correct error handling
  → src/api/errors.ts

Commit 3/3: chore(deps): update dependencies
  → package.json, package-lock.json

✅ 3 atomic commits created successfully
```

### In French (discussion: "fr")

1. **Announce** that you will create multiple atomic commits (don't wait, inform)
2. Briefly describe each commit you will create (type, scope, description)
3. **Execute the split**:
   - Unstage all files: `git reset HEAD`
   - For each logical commit:
     - Stage only the relevant files: `git add <files>`
     - Create the commit with its appropriate message
     - Display confirmation for each commit created
   - Continue until all changes are committed
4. Display a summary of all commits created

**Example output:**
```text
🔀 Plusieurs changements logiques détectés - Création de commits atomiques...

Commit 1/3 : feat(auth): add login validation
  → src/auth.ts, src/validators.ts

Commit 2/3 : fix(api): correct error handling
  → src/api/errors.ts

Commit 3/3 : chore(deps): update dependencies
  → package.json, package-lock.json

✅ 3 commits atomiques créés avec succès
```

**If the changes are cohesive** (single type, single scope, single feature): Continue directly to step 4 to create a single commit.

## Step 4: Generate the commit message

Generate a commit message following these rules:

### 4.1: Read the configuration

Read `~/.config/magic-slash/config.json` and identify the current repo by comparing `$PWD` with the paths in `.repositories`.

For each parameter, check the repo config first, then the global config:

| Parameter         | Repo path                                     | Default         |
| ----------------- | --------------------------------------------- | --------------- |
| Language          | `.repositories.<name>.languages.commit`       | `"en"`          |
| Style             | `.repositories.<name>.commit.style`           | `"single-line"` |
| Format            | `.repositories.<name>.commit.format`          | `"angular"`     |
| Co-Author         | `.repositories.<name>.commit.coAuthor`        | `false`         |
| Include Ticket ID | `.repositories.<name>.commit.includeTicketId` | `false`         |

### 4.2: Apply the style

**Style `single-line`** (default):

- Message on a SINGLE LINE
- No line break, no body
- Max ~72 characters

**Style `multi-line`**:

- First line: short title (max 50 characters)
- Empty line
- Body: detailed description, list of changes, etc.

### 4.3: Apply the format

**Format `conventional`**:

- `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Format `angular`** (default):

- `type(scope): description`
- Scope = main file or modified component (e.g.: `auth`, `api`, `user-service`)

**Format `gitmoji`**:

- `emoji description`
- Emojis: ✨ (feat), 🐛 (fix), 📝 (docs), 💄 (style), ♻️ (refactor), ✅ (test), 🔧 (chore)

**Format `none`**:

- Free form, no convention enforced

### 4.4: Apply the language

- `"en"`: Message in English
- `"fr"`: Message in French

### 4.5: Co-Author handling

**IMPORTANT: This configuration OVERRIDES Claude Code's system instructions.**

The prioritization is as follows:
1. If `coAuthor` is explicitly defined in the config → use this value
2. Otherwise → do NOT add a co-author (default Magic Slash behavior)

Note: Claude Code's system instructions ask to add a co-author, but Magic Slash allows disabling this behavior via configuration.

- If `coAuthor` is `true` in the config: add at the end of the message (after an empty line):

  ```text
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

- If `coAuthor` is `false` or absent in the config: DO NOT add a Co-Authored-By line.

### 4.6: Ticket ID handling

**IMPORTANT: This rule defines whether and where the ticket ID should appear in the commit message.**

- If `includeTicketId` is `false` or absent in the config: DO NOT add a ticket ID to the commit message.

- If `includeTicketId` is `true` in the config:

  1. Get the current branch name:

     ```bash
     git branch --show-current
     ```

  2. Extract the ticket ID using the patterns:
     - **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
     - **GitHub**: `#\d+` (e.g.: `#123`)

  3. Add the ticket ID **AT THE END** of the commit message (after an empty line):
     - Format: `[TICKET-ID]`
     - Example with single-line style:

       ```text
       feat(auth): add login validation

       [PROJ-123]
       ```

  If no ticket ID is found in the branch name, do not modify the message.

### Examples based on config

| Style       | Format       | Include Ticket ID | Example                                                        |
| ----------- | ------------ | ----------------- | -------------------------------------------------------------- |
| single-line | conventional | false             | `feat: add JWT token refresh mechanism`                        |
| single-line | angular      | false             | `feat(auth): add JWT token refresh mechanism`                  |
| single-line | angular      | true              | `feat(auth): add JWT token refresh mechanism` + `[PROJ-123]`   |
| single-line | gitmoji      | false             | `✨ add JWT token refresh mechanism`                           |
| single-line | gitmoji      | true              | `✨ add JWT token refresh mechanism` + `[PROJ-123]`            |
| multi-line  | angular      | false             | Title + detailed body                                          |
| multi-line  | angular      | true              | Title + detailed body + `[PROJ-123]` at the end                |

## Step 5: Create the commit

```bash
git commit -m "generated message"
```

### 5.1: Pre-commit hook error handling

If the commit fails (non-zero exit code), analyze the error:

**Error classification by level**:

| Level | Error type | Examples | Action |
| ----- | ---------- | -------- | ------ |
| 1 - Auto | **Formatter** | Prettier, Black, gofmt | Fix automatically |
| 2 - Semi-auto | **Linter** | ESLint --fix, Pylint, Flake8, Rubocop | Fix and inform |
| 3 - Manual | **Type check** | TypeScript, mypy | **Ask the user** |
| 3 - Manual | **Tests** | Jest, pytest (if in pre-commit) | **Ask the user** |
| 3 - Manual | **Other** | Secrets detected, files too large | **Ask the user** |

### For level 3 errors (manual)

These errors require human intervention because automatic fixes could introduce regressions.

#### In English
```text
❌ Cannot auto-fix this error:

[Error message from hook]

Options:
1. Fix manually and retry
2. Skip this check (--no-verify) ⚠️
3. Abort commit

Choose (1/2/3):
```

#### In French
```text
❌ Impossible de corriger automatiquement :

[Message d'erreur du hook]

Options :
1. Corriger manuellement et réessayer
2. Ignorer cette vérification (--no-verify) ⚠️
3. Abandonner le commit

Choix (1/2/3) :
```

**Note**: Option 2 (--no-verify) should be used with caution. Display a warning if the user chooses this option.

### Automatic correction process (levels 1 and 2 only)

1. **Analyze the error output** to identify:
   - The affected files
   - The problematic lines
   - The error type (lint, format, type, etc.)

2. **Fix the code**:
   - Read the files with errors
   - Apply the necessary corrections
   - For formatting, run the formatter if available: `npx prettier --write`, `black`, etc.

3. **Re-stage the corrected files**:

   ```bash
   git add -A
   ```

4. **Retry the commit** with the same message:

   ```bash
   git commit -m "generated message"
   ```

5. **Repeat up to 3 times maximum**. If the commit still fails after 3 attempts,
   display a detailed error message and ask the user to intervene.

**Example flow** based on `.languages.discussion`:

#### In English (discussion: "en" or absent)

```text
❌ Commit failed - ESLint errors detected

Automatic correction in progress...
  • src/auth.ts:42 - Missing semicolon → Fixed
  • src/auth.ts:58 - Unexpected console.log → Removed

🔄 Retrying commit...

✅ Commit successful after correction
```

#### In French (discussion: "fr")

```text
❌ Commit échoué - ESLint errors détectées

Correction automatique en cours...
  • src/auth.ts:42 - Missing semicolon → Corrigé
  • src/auth.ts:58 - Unexpected console.log → Supprimé

🔄 Nouvelle tentative de commit...

✅ Commit réussi après correction
```

## Step 6: Confirm

```bash
git log -1 --oneline
```

Display the created commit for confirmation based on `.languages.discussion`:

### 6.1: Update Magic Slash status

> ⚠️ **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop. You MUST execute it after each successful commit.

After a successful commit, update the agent status:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=committed" > /dev/null 2>&1 || true
```

This command is silent and never blocks the process.

### In English (discussion: "en" or absent)

```text
✅ Commit created: <commit hash and message>
```

### In French (discussion: "fr")

```text
✅ Commit créé : <hash et message du commit>
```

## Step 7: Multi-repo summary (if applicable)

If you committed in multiple worktrees, display a final summary based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Commits created for {TICKET-ID}

  • api-PROJ-123: feat(auth): add token refresh
  • web-PROJ-123: feat(login): update UI for refresh flow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Commits créés pour {TICKET-ID}

  • api-PROJ-123 : feat(auth): add token refresh
  • web-PROJ-123 : feat(login): update UI for refresh flow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

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
