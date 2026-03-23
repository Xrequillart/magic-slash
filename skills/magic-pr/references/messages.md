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

## MSG_NODE_NO_MANAGER

### en

```text
⚠️ Node.js version file detected (.nvmrc/.node-version) but no version manager (nvm/fnm) found.
Commands will use the system Node.js version.
```

### fr

```text
⚠️ Fichier de version Node.js détecté (.nvmrc/.node-version) mais aucun gestionnaire de version (nvm/fnm) trouvé.
Les commandes utiliseront la version Node.js du système.
```

## MSG_BRANCH_CONFIRM

### en

```text
The configured base branch is **{branch}**. Use it, or specify another? (press Enter to confirm)
```

### fr

```text
La branche de base configurée est **{branch}**. L'utiliser, ou en spécifier une autre ? (appuie sur Entrée pour confirmer)
```

## MSG_BRANCH_ASK

### en

```text
No development branch configured for this repository.
Which branch should I use as the base? (e.g., main, develop, staging)
```

### fr

```text
Aucune branche de développement configurée pour ce repository.
Quelle branche dois-je utiliser comme base ? (ex : main, develop, staging)
```

## MSG_ON_MAIN_BRANCH

### en

```text
❌ You are on the main/master branch.
Please switch to a feature branch before creating a PR.
```

### fr

```text
❌ Vous êtes sur la branche main/master.
Veuillez basculer sur une branche de feature avant de créer une PR.
```

## MSG_PR_EXISTS

### en

```text
⚠️ An open PR already exists for this branch: PR #{number}
{url}

Options:
1. Stop here (PR already exists)
2. Continue (push new commits to the existing PR)

Choose (1/2):
```

### fr

```text
⚠️ Une PR ouverte existe déjà pour cette branche : PR #{number}
{url}

Options :
1. S'arrêter ici (la PR existe déjà)
2. Continuer (pousser les nouveaux commits vers la PR existante)

Choix (1/2) :
```

## MSG_PRE_PUSH_VALIDATION

### en

```text
⚠️ Pre-push validation found issues:

{error output}

Options:
1. Fix the issues and re-validate
2. Proceed anyway (issues may be caught by push hooks)
3. Abort

Choose (1/2/3):
```

### fr

```text
⚠️ La validation pré-push a trouvé des problèmes :

{sortie d'erreur}

Options :
1. Corriger les problèmes et re-valider
2. Continuer quand même (les hooks de push peuvent les attraper)
3. Abandonner

Choix (1/2/3) :
```

## MSG_PUSH_ERROR_MANUAL

### en

```text
❌ Cannot auto-fix this push error:

{error message}

Options:
1. Fix manually and retry
2. Skip this check (--no-verify) ⚠️
3. Abort push

Choose (1/2/3):
```

### fr

```text
❌ Impossible de corriger automatiquement cette erreur de push :

{error message}

Options :
1. Corriger manuellement et réessayer
2. Ignorer cette vérification (--no-verify) ⚠️
3. Abandonner le push

Choix (1/2/3) :
```

## MSG_PUSH_AUTO_FIX

### en

```text
❌ Push failed - {error_type} errors detected ({hook_name})

Automatic correction in progress...
  • {file}:{line} - {error_description} → Fixed

🔄 Re-committing and retrying push...

✅ Push successful after correction
```

### fr

```text
❌ Push échoué - {error_type} errors détectées ({hook_name})

Correction automatique en cours...
  • {file}:{line} - {error_description} → Corrigé

🔄 Re-commit et nouvelle tentative de push...

✅ Push réussi après correction
```

## MSG_CONFLICTS_DETECTED

### en

```text
⚠️ Merge conflicts detected with {base_branch}.
The PR can still be created, but conflicts will need to be resolved before merging.

Options:
1. Create the PR anyway (resolve conflicts later)
2. Abort and resolve conflicts first

Choose (1/2):
```

### fr

```text
⚠️ Conflits de merge détectés avec {base_branch}.
La PR peut quand même être créée, mais les conflits devront être résolus avant le merge.

Options :
1. Créer la PR quand même (résoudre les conflits plus tard)
2. Abandonner et résoudre les conflits d'abord

Choix (1/2) :
```

## MSG_PR_PREVIEW

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 PR Preview

Title: {title}
Base:  {base_branch} ← {head_branch}

Description:
{description_preview}
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create this PR? (Y/n/edit)
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Aperçu de la PR

Titre : {title}
Base :  {base_branch} ← {head_branch}

Description :
{description_preview}
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Créer cette PR ? (O/n/edit)
```

## MSG_PR_TEMPLATE_EN

> Used only if no project template exists. Language: `pullRequest: "en"` or absent.

```markdown
## Summary

[Concise summary of changes in 2-3 sentences]

## Changes

[List of commits with their messages]

## How to test

[Based on the diff from Step 4.1, write concrete step-by-step testing instructions:
- Identify the features/fixes changed in the diff
- For each change, describe how to verify it works
- Include expected results
Do NOT use generic placeholders - every step must be specific to the actual changes]
```

## MSG_PR_TEMPLATE_FR

> Used only if no project template exists. Language: `pullRequest: "fr"`.

```markdown
## Résumé

[Résumé concis des changements en 2-3 phrases]

## Changements

[Liste des commits avec leurs messages]

## Comment tester

[À partir du diff récupéré au Step 4.1, rédiger des instructions de test concrètes étape par étape :
- Identifier les fonctionnalités/corrections modifiées dans le diff
- Pour chaque changement, décrire comment vérifier qu'il fonctionne
- Inclure les résultats attendus
Ne PAS utiliser de placeholders génériques - chaque étape doit être spécifique aux changements réels]
```

## MSG_JIRA_COMMENT

### en

```text
🔗 Pull Request created: [PR_URL]

Ready for code review.
```

### fr

```text
🔗 Pull Request créée : [PR_URL]

Prêt pour la revue de code.
```

## MSG_GITHUB_ISSUE_COMMENT

### en

```text
🔗 Pull Request created: [PR_URL]

Ready for code review.
```

### fr

```text
🔗 Pull Request créée : [PR_URL]

Prêt pour la revue de code.
```

## MSG_MULTI_REPO_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Multi-repo PR detected for {TICKET-ID}

Worktrees with commits to push:
  • {worktree-path} ({count} commits)

A PR will be created for each repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 PR multi-repo détectée pour {TICKET-ID}

Worktrees avec des commits à pusher :
  • {worktree-path} ({count} commits)

Une PR sera créée pour chaque repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_MULTI_REPO_FAILURE

### en

```text
❌ Failed to create PR for {worktree-name}: {error reason}
Continuing to next repository...
```

### fr

```text
❌ Échec de la création de PR pour {worktree-name} : {raison de l'erreur}
Passage au repository suivant...
```

## MSG_SUMMARY

### en

```text
✅ PR created!

📌 Branch   : {branch}
🔗 PR       : {PR_URL}
🎫 Ticket   : {TICKET_ID} → {ticket_status}

Next steps:
1. Run /magic:review to perform a code review
2. Wait for approval and CI checks
3. Merge the PR once approved
4. Run /magic:done to finalize the task
```

### fr

```text
✅ PR créée !

📌 Branche  : {branch}
🔗 PR       : {PR_URL}
🎫 Ticket   : {TICKET_ID} → {ticket_status}

Prochaines étapes :
1. Lance /magic:review pour faire une revue de code
2. Attend l'approbation et les checks CI
3. Merge la PR une fois approuvée
4. Lance /magic:done pour finaliser la tâche
```

## MSG_MULTI_REPO_FINAL

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PRs created for {TICKET-ID} (Full-Stack)

PRs created:
  • {worktree-name}: {PR_URL}

{IF_FAILED}
Failed:
  • {worktree-name}: {error reason}
{/IF_FAILED}

🎫 Ticket updated with all PR links

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PRs créées pour {TICKET-ID} (Full-Stack)

PRs créées :
  • {worktree-name} : {PR_URL}

{IF_FAILED}
Échoués :
  • {worktree-name} : {raison de l'erreur}
{/IF_FAILED}

🎫 Ticket mis à jour avec tous les liens de PR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
