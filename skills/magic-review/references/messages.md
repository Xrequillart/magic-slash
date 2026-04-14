# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.

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

## MSG_REVIEW_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code review completed for {TICKET-ID}

📋 PR       : #{PR_NUMBER} - {PR_TITLE}
📊 Result   : {APPROVE / REQUEST_CHANGES / COMMENT}
🚫 Blocking : {count} issue(s)
💡 Suggestions : {count}
👍 Praise   : {count}

{If APPROVE}
Next steps:
1. Wait for CI checks to pass
2. Merge the PR once approved
3. Run /magic:done to finalize the task

{If REQUEST_CHANGES}
Next steps:
1. Run /magic:resolve to address the review comments
2. Request a re-review after fixing

{If COMMENT}
Next steps:
1. Consider the suggestions and discuss if needed
2. Wait for CI checks to pass
3. Merge the PR once approved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Revue de code terminée pour {TICKET-ID}

📋 PR       : #{PR_NUMBER} - {PR_TITLE}
📊 Résultat : {APPROVE / REQUEST_CHANGES / COMMENT}
🚫 Bloquant : {count} problème(s)
💡 Suggestions : {count}
👍 Points positifs : {count}

{Si APPROVE}
Prochaines étapes :
1. Attend que les checks CI passent
2. Merge la PR une fois approuvée
3. Lance /magic:done pour finaliser la tâche

{Si REQUEST_CHANGES}
Prochaines étapes :
1. Lance /magic:resolve pour corriger les commentaires de review
2. Demande une re-review après correction

{Si COMMENT}
Prochaines étapes :
1. Considère les suggestions et discute si besoin
2. Attend que les checks CI passent
3. Merge la PR une fois approuvée

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_REVIEW_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code review completed for {TICKET-ID} (Full-Stack)

  • api-PROJ-123: PR #{PR_NUMBER_1} → {APPROVE / REQUEST_CHANGES / COMMENT}
  • web-PROJ-123: PR #{PR_NUMBER_2} → {APPROVE / REQUEST_CHANGES / COMMENT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Revue de code terminée pour {TICKET-ID} (Full-Stack)

  • api-PROJ-123 : PR #{PR_NUMBER_1} → {APPROVE / REQUEST_CHANGES / COMMENT}
  • web-PROJ-123 : PR #{PR_NUMBER_2} → {APPROVE / REQUEST_CHANGES / COMMENT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_JIRA_REVIEW_COMMENT

### en

```text
🔍 Code review completed for PR #{PR_NUMBER}

Result: {APPROVE / REQUEST_CHANGES / COMMENT}
- {count} blocking issue(s)
- {count} suggestion(s)
```

### fr

```text
🔍 Revue de code terminée pour la PR #{PR_NUMBER}

Résultat : {APPROVE / REQUEST_CHANGES / COMMENT}
- {count} problème(s) bloquant(s)
- {count} suggestion(s)
```
