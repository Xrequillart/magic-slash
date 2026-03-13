---
name: done
description: This skill should be used when the user says "done", "terminé", "on peut créer la PR", "push and create PR", "finaliser la tâche", "pousser les changements", "create the pull request", "finish the task", "c'est fini", "j'ai fini", "I'm done", "finalize", "push my changes", or indicates they have finished coding and want to create a pull request.
allowed-tools: Bash(*), mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.12.5 - /done

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **CRITICAL STEPS THAT MUST NEVER BE SKIPPED**:
> - **Step 2**: Push to remote - MANDATORY
> - **Step 5**: Create the Pull Request - MANDATORY
> - **Step 5.1**: Update Magic Slash metadata (curl) - MANDATORY
> - **Step 7**: Update the Jira/GitHub ticket - RECOMMENDED

You are an assistant that finalizes a task by pushing commits, creating a PR and updating the Jira ticket.

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter         | Repo path                                    | Default |
| ----------------- | -------------------------------------------- | ------ |
| PR language       | `.repositories.<name>.languages.pullRequest` | `"en"` |
| Jira language     | `.repositories.<name>.languages.jiraComment` | `"en"` |
| Discussion language | `.repositories.<name>.languages.discussion` | `"en"` |

### Pull Request parameters

| Parameter         | Repo path                                          | Default | Description                              |
| ----------------- | -------------------------------------------------- | ------- | ---------------------------------------- |
| Auto-link tickets | `.repositories.<name>.pullRequest.autoLinkTickets` | `true`  | Add Jira/GitHub links in the PR          |

### Issues parameters

| Parameter     | Repo path                                 | Default | Description                                  |
| ------------- | ----------------------------------------- | ------- | -------------------------------------------- |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true`  | Add a comment with the PR link               |

## Step 0: Check configuration and detect multi-repo worktrees

### 0.0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display error based on system language
fi
```

#### If the config does not exist

##### In English
```text
❌ Magic Slash configuration not found

Please create the config file at:
  ~/.config/magic-slash/config.json

See documentation: https://github.com/magic-slash/config
```

##### In French
```text
❌ Configuration Magic Slash introuvable

Veuillez créer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

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

### 0.4: Check unpushed commits in each worktree

For each found worktree, check if there are commits to push:

```bash
git -C {WORKTREE_PATH} log origin/$(git -C {WORKTREE_PATH} branch --show-current)..HEAD --oneline 2>/dev/null
```

Keep only the worktrees that have unpushed commits.

### 0.5: Summary and confirmation

If multiple worktrees have commits to push, display a summary based on `.languages.discussion`:

#### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Multi-repo PR detected for {TICKET-ID}

Worktrees with commits to push:
  • /projects/api-PROJ-123 (2 commits)
  • /projects/web-PROJ-123 (3 commits)

A PR will be created for each repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 PR multi-repo détectée pour {TICKET-ID}

Worktrees avec des commits à pusher :
  • /projects/api-PROJ-123 (2 commits)
  • /projects/web-PROJ-123 (3 commits)

Une PR sera créée pour chaque repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If multi-repo detected, execute **Steps 1 to 7** for EACH worktree that has commits.
Change directory before each cycle:

```bash
cd {WORKTREE_PATH}
```

At the end of each PR, display a confirmation before moving to the next worktree.
The Jira/GitHub ticket (Step 7) must be updated **ONLY ONCE** at the end, with links to ALL created PRs.

---

## Step 1: Get the current branch

```bash
git branch --show-current
```

Verify that you are not on `main` or `master`.
If so, inform the user that they need to be on a feature branch.

## Step 2: Push to remote

```bash
git push -u origin <branch-name>
```

If the push fails, display the error and stop the process.

## Step 3: List commits for the PR

```bash
git log origin/main..HEAD --oneline
```

Retrieve the list of commits that will be included in the PR.

## Step 3.1: Retrieve the full diff for testing instructions

```bash
git diff origin/main..HEAD
```

This diff will be used in Step 5 to generate concrete testing instructions in the PR description.

If the diff is too large (>500 lines), also run `git diff origin/main..HEAD --stat` to get an overview, then read the key modified files individually to understand the changes.

## Step 4: Retrieve the project's PR template

Check if a PR template exists in the project:

```bash
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null || cat .github/pull_request_template.md 2>/dev/null || cat docs/pull_request_template.md 2>/dev/null || echo ""
```

If a template exists, you must **strictly follow it** and fill in its sections. For any section related to testing (e.g., "Testing", "How to test", "Test Steps", "Comment tester", "Vérification"), you must **analyze the diff from Step 3.1** to fill it with concrete, specific testing steps based on the actual code changes. Do NOT use generic placeholders.

## Step 5: Create the Pull Request via MCP GitHub

> ⚠️ **MANDATORY**: This step is critical. You MUST create the PR.

### 5.0: Detect the main branch

Automatically determine the repo's main branch:

```bash
BASE_BRANCH=$(git remote show origin | grep 'HEAD branch' | cut -d: -f2 | xargs)
```

If the command fails, use `main` by default. If `main` doesn't exist, try `master`.

```bash
if ! git rev-parse --verify origin/$BASE_BRANCH >/dev/null 2>&1; then
  BASE_BRANCH="main"
fi
if ! git rev-parse --verify origin/$BASE_BRANCH >/dev/null 2>&1; then
  BASE_BRANCH="master"
fi
```

Use the MCP GitHub tool `mcp__github__create_pull_request` to create the PR:

- **Title**: Based on the branch name or the first commit
  - If the branch contains a ticket ID (e.g.: `feature/PROJ-123`), use the format: `[PROJ-123] Description`
- **Description**:
  - **If a PR template exists**: Use it and fill in all its sections
  - **Otherwise**: Use the default template matching `.languages.pullRequest`
  - **Add a "Linked Issues" section** with the ticket link (unless `autoLinkTickets` is `false`)

### Linked Issues section (by default, unless autoLinkTickets: false)

Add this section at the end of the PR description:

**In English:**

```markdown
## Linked Issues

- Jira: [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)
```

**In French:**

```markdown
## Tickets liés

- Jira : [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)
```

Note: Adapt the Jira URL based on the user's domain (retrieved via `mcp__atlassian__getAccessibleAtlassianResources`).

### PR template in English (pullRequest: "en" or absent) - used only if no project template exists

```markdown
## Summary

[Concise summary of changes in 2-3 sentences]

## Changes

[List of commits with their messages]

## How to test

[Based on the diff from Step 3.1, write concrete step-by-step testing instructions:
- Identify the features/fixes changed in the diff
- For each change, describe how to verify it works
- Include expected results
Do NOT use generic placeholders - every step must be specific to the actual changes]
```

### PR template in French (pullRequest: "fr") - used only if no project template exists

```markdown
## Résumé

[Résumé concis des changements en 2-3 phrases]

## Changements

[Liste des commits avec leurs messages]

## Comment tester

[À partir du diff récupéré au Step 3.1, rédiger des instructions de test concrètes étape par étape :
- Identifier les fonctionnalités/corrections modifiées dans le diff
- Pour chaque changement, décrire comment vérifier qu'il fonctionne
- Inclure les résultats attendus
Ne PAS utiliser de placeholders génériques - chaque étape doit être spécifique aux changements réels]
```

- **Base**: The branch detected in step 5.0 (usually `main` or `master`)
- **Head**: The current branch

## Step 5.1: Update Magic Slash metadata

> ⚠️ **MANDATORY - DO NOT SKIP THIS STEP**: This step is CRITICAL for the proper functioning of Magic Slash Desktop. You MUST execute it after creating the PR.

After creating the PR, update the title, status and PR link of the agent:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n '✅ PR #{PR_NUMBER} - {TICKET_ID}' | jq -sRr @uri)&status=PR%20created&prUrl=$(echo -n '{PR_URL}' | jq -sRr @uri)&prRepo=$(echo -n "$PWD" | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Replace:
- `{PR_NUMBER}`: The created PR number (e.g.: `42`)
- `{TICKET_ID}`: The ticket ID (e.g.: `PROJ-123`)
- `{PR_URL}`: The full PR URL (e.g.: `https://github.com/org/repo/pull/42`)

This command is silent and never blocks the process.

## Step 6: Extract the ticket ID

Analyze the branch name to extract the Jira ticket ID:

- Pattern: `feature/PROJ-123`, `fix/PROJ-456`, `PROJ-789-description`
- Regex: `[A-Z]+-\d+`

If no ticket ID is found, ask the user if they still want to update a Jira ticket.

## Step 7: Update the Jira ticket

If a ticket ID is found, use the MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Change the status** to "To be reviewed" (or equivalent) with `mcp__atlassian__transitionJiraIssue`
3. **Add a comment** with the PR link via `mcp__atlassian__addCommentToJiraIssue`
   (unless `commentOnPR` is `false`)

### Jira comment format based on `.languages.jiraComment`

**In English (jiraComment: "en" or absent):**

```text
🔗 Pull Request created: [PR_URL]

Ready for code review.
```

**In French (jiraComment: "fr"):**

```text
🔗 Pull Request créée : [PR_URL]

Prêt pour la revue de code.
```

If the "To be reviewed" status doesn't exist, try:

- "In Review"
- "Code Review"
- "Review"

## Step 8: Final summary

Display a summary of what was done based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
✅ Task completed!

📌 Branch   : feature/PROJ-123
🔗 PR       : https://github.com/org/repo/pull/42
🎫 Ticket   : PROJ-123 → To be reviewed

Next steps:
1. Request a review from your colleagues
2. Wait for approval and CI checks
3. Merge the PR once approved
```

### In French (discussion: "fr")

```text
✅ Tâche terminée !

📌 Branche  : feature/PROJ-123
🔗 PR       : https://github.com/org/repo/pull/42
🎫 Ticket   : PROJ-123 → To be reviewed

Prochaines étapes :
1. Demande une review à tes collègues
2. Attend l'approbation et les checks CI
3. Merge la PR une fois approuvée
```

## Step 9: Multi-repo summary (if applicable)

If you created PRs in multiple worktrees, display a final summary based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task completed for {TICKET-ID} (Full-Stack)

PRs created:
  • api-PROJ-123: https://github.com/org/api/pull/42
  • web-PROJ-123: https://github.com/org/web/pull/43

🎫 Ticket updated with all PR links

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tâche terminée pour {TICKET-ID} (Full-Stack)

PRs créées :
  • api-PROJ-123 : https://github.com/org/api/pull/42
  • web-PROJ-123 : https://github.com/org/web/pull/43

🎫 Ticket mis à jour avec tous les liens de PR

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
