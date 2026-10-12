# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.
> For Jira comments, use `languages.jiraComment` instead.

## MSG_APP_NOT_RUNNING

### en

```text
❌ Magic Slash Desktop is not running

Your configuration lives in the cloud and only the app can read it, so there is
nothing reliable to work from until it is open.

Launch Magic Slash, then run this command again.
```

### fr

```text
❌ Magic Slash Desktop n'est pas lancé

Ta configuration est dans le cloud et seule l'app peut la lire : sans elle, il n'y a
rien de fiable sur quoi travailler.

Lance Magic Slash, puis relance cette commande.
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

`{next_steps}` (both summaries) is empty for the default flow, which has nothing after `done`: the
closing line follows the ticket or cleanup lines exactly as it always has. When the workflow
returns lines (SKILL.md Step 6), `{next_steps}` is `💡 Next step:` (fr: `💡 Prochaine étape :`),
the `text` of each line (`references/workflow.md` §2), and a blank line. When it returns a `chain`,
the closing line is dropped: this agent is not done yet, and the chain's `text` is shown when it
is followed, after the run is recorded.

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task finalized for {TICKET-ID}

🔗 PR       : #{PR_NUMBER} (merged)
🎫 Ticket   : {TICKET_STATUS}
🧹 Cleanup  : {CLEANUP_STATUS}

{next_steps}You can close this agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tâche finalisée pour {TICKET-ID}

🔗 PR       : #{PR_NUMBER} (mergée)
🎫 Ticket   : {TICKET_STATUS}
🧹 Nettoyage : {CLEANUP_STATUS}

{next_steps}Tu peux fermer cet agent (⌘W).

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

{next_steps}You can close this agent (⌘W).

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

{next_steps}Tu peux fermer cet agent (⌘W).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
