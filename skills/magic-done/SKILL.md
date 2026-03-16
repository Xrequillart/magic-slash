---
name: magic-done
description: This skill should be used when the user says "the PR is merged", "la PR est mergée", "close the ticket", "fermer le ticket", "finalize the task", "finaliser la tâche", "task is done", "tâche terminée", "mark as done", "marquer comme terminé", or indicates the PR has already been merged and they want to close out the task. Do NOT use this skill if the user just finished coding and wants to create a PR — use /magic-pr instead.
allowed-tools: Bash(*), mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.18.3 - /done

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **NOTE**: This is a post-merge finalization skill. It does NOT modify any files. It verifies the PR is merged, updates the Jira ticket to "Done", and updates the desktop metadata.

You are an assistant that finalizes a task after the PR has been merged: verifying the merge, transitioning the Jira ticket to "Done", and updating the desktop agent status.

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------ |
| Jira language       | `.repositories.<name>.languages.jiraComment` | `"en"` |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"` |

### Issues parameters

| Parameter     | Repo path                                 | Default | Description                                  |
| ------------- | ----------------------------------------- | ------- | -------------------------------------------- |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true`  | Add a comment on the ticket                  |

## Step 0: Check configuration

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

## Step 1: Extract the ticket ID from the current worktree

Get the current directory name and extract the ticket ID:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ID is detected (you are in a regular repo, not a worktree), extract it from the branch name:

```bash
git branch --show-current
```

If still no ticket ID found, ask the user.

## Step 2: Find the associated PR(s)

Read the config to identify all configured repos and search for associated worktrees (multi-repo support):

```bash
cat ~/.config/magic-slash/config.json
```

For each configured repo, check if a worktree with the same TICKET-ID exists:

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

For each found worktree, find the associated PR:

1. Get the branch name: `git -C {WORKTREE_PATH} branch --show-current`
2. Use `mcp__github__list_pull_requests` to find the PR (search by head branch, state: all)
3. If no match by branch, search by title containing the ticket ID

## Step 3: Verify PR is merged

For each found PR, use `mcp__github__get_pull_request` and check the `merged` field.

### If the PR is NOT merged

Display a message and stop:

#### In English
```text
⚠️ The PR #{PR_NUMBER} is not yet merged.

Please merge the PR on GitHub first, then run /magic-done again.

🔗 PR: {PR_URL}
```

#### In French
```text
⚠️ La PR #{PR_NUMBER} n'est pas encore mergée.

Merci de merger la PR sur GitHub d'abord, puis relance /magic-done.

🔗 PR : {PR_URL}
```

### If the PR IS merged

Continue to the next steps.

## Step 4: Update the Jira/GitHub ticket

### For Jira tickets

If a Jira ticket ID is found, use the MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Transition to "Done"**: Find the transition matching "Done" / "Terminé" / "Closed" / "Fermé" and apply it with `mcp__atlassian__transitionJiraIssue`
3. **Add a final comment** with `mcp__atlassian__addCommentToJiraIssue` (unless `commentOnPR` is `false`)

#### Jira comment format based on `.languages.jiraComment`

**In English (jiraComment: "en" or absent):**

```text
✅ Task completed — PR merged.

{For each PR:}
🔗 PR: {PR_URL} (merged)
```

**In French (jiraComment: "fr"):**

```text
✅ Tâche terminée — PR mergée.

{Pour chaque PR :}
🔗 PR : {PR_URL} (mergée)
```

If the "Done" transition doesn't exist, try:

- "Closed"
- "Fermé"
- "Resolved"
- "Terminé"
- "Complete"

### For GitHub issues

If the ticket is a GitHub issue, add a comment (do NOT close the issue — let the PR auto-close handle it):

```text
✅ Task completed — PR #{PR_NUMBER} merged.
```

## Step 5: Update Magic Slash metadata

Update the desktop agent status to "PR merged" and update the title:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n 'Done - {TICKET_ID}' | jq -sRr @uri)&status=PR%20merged" > /dev/null 2>&1 || true
```

Replace `{TICKET_ID}` with the actual ticket ID.

## Step 6: Summary

Display a summary based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task finalized for {TICKET-ID}

🔗 PR       : #{PR_NUMBER} (merged)
🎫 Ticket   : {TICKET-ID} → Done

You can close this agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tâche finalisée pour {TICKET-ID}

🔗 PR       : #{PR_NUMBER} (mergée)
🎫 Ticket   : {TICKET-ID} → Done

Tu peux fermer cet agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 7: Multi-repo summary (if applicable)

If multiple PRs were found across worktrees, display a combined summary based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task finalized for {TICKET-ID} (Full-Stack)

PRs merged:
  • api-PROJ-123: #{PR_NUMBER_1} (merged)
  • web-PROJ-123: #{PR_NUMBER_2} (merged)

🎫 Ticket: {TICKET-ID} → Done

You can close this agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tâche finalisée pour {TICKET-ID} (Full-Stack)

PRs mergées :
  • api-PROJ-123 : #{PR_NUMBER_1} (mergée)
  • web-PROJ-123 : #{PR_NUMBER_2} (mergée)

🎫 Ticket : {TICKET-ID} → Done

Tu peux fermer cet agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
