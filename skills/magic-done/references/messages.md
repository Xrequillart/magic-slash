# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.
> For Jira comments, use `languages.jiraComment` instead.

## MSG_CONFIG_ERROR

### en

```text
❌ Magic Slash configuration not found

Please create the config file at:
  ~/.config/magic-slash/config.json

See documentation: https://github.com/magic-slash/config
```

### fr

```text
❌ Configuration Magic Slash introuvable

Veuillez créer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

## MSG_PR_NOT_MERGED

### en

```text
⚠️ The PR #{PR_NUMBER} is not yet merged.

Please merge the PR on GitHub first, then run /magic:done again.

🔗 PR: {PR_URL}
```

### fr

```text
⚠️ La PR #{PR_NUMBER} n'est pas encore mergée.

Merci de merger la PR sur GitHub d'abord, puis relance /magic:done.

🔗 PR : {PR_URL}
```

## MSG_JIRA_DONE_COMMENT

### en

```text
✅ Task completed — PR merged.

{For each PR:}
🔗 PR: {PR_URL} (merged)
```

### fr

```text
✅ Tâche terminée — PR mergée.

{Pour chaque PR :}
🔗 PR : {PR_URL} (mergée)
```

## MSG_GITHUB_DONE_COMMENT

### en

```text
✅ Task completed — PR #{PR_NUMBER} merged.
```

## MSG_WORKTREE_REMOVE_FAILED

### en

```text
⚠️ Could not remove worktree {WORKTREE_PATH} automatically.
Manual cleanup: git worktree remove --force {WORKTREE_PATH}
```

### fr

```text
⚠️ Impossible de supprimer le worktree {WORKTREE_PATH} automatiquement.
Nettoyage manuel : git worktree remove --force {WORKTREE_PATH}
```

## MSG_DONE_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task finalized for {TICKET-ID}

🔗 PR       : #{PR_NUMBER} (merged)
🎫 Ticket   : {TICKET_STATUS}
🧹 Cleanup  : {CLEANUP_STATUS}

You can close this agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tâche finalisée pour {TICKET-ID}

🔗 PR       : #{PR_NUMBER} (mergée)
🎫 Ticket   : {TICKET_STATUS}
🧹 Nettoyage : {CLEANUP_STATUS}

Tu peux fermer cet agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_DONE_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task finalized for {TICKET-ID} (Full-Stack)

PRs:
  • api-PROJ-123: #{PR_NUMBER_1} (merged)
  • web-PROJ-123: #{PR_NUMBER_2} (merged)

Cleanup:
  • api-PROJ-123: {CLEANUP_STATUS}
  • web-PROJ-123: {CLEANUP_STATUS}

🎫 Ticket: {TICKET_STATUS}

You can close this agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tâche finalisée pour {TICKET-ID} (Full-Stack)

PRs :
  • api-PROJ-123 : #{PR_NUMBER_1} (mergée)
  • web-PROJ-123 : #{PR_NUMBER_2} (mergée)

Nettoyage :
  • api-PROJ-123 : {CLEANUP_STATUS}
  • web-PROJ-123 : {CLEANUP_STATUS}

🎫 Ticket : {TICKET_STATUS}

Tu peux fermer cet agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
