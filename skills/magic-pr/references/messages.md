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

## MSG_PR_CREATION_FAILED

### en

```text
❌ PR creation failed after retry.

Branch: {head_branch} → {base_branch}

Options:
1. Retry
2. Create the PR manually on GitHub

Choose (1/2):
```

### fr

```text
❌ La création de la PR a échoué après nouvelle tentative.

Branche : {head_branch} → {base_branch}

Options :
1. Réessayer
2. Créer la PR manuellement sur GitHub

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

[Write concrete MANUAL test scenarios from the user's point of view, grounded in the actual diff from Step 4.1 (the user-visible surfaces and test environment identified there):
- If setup is needed, start with a single prerequisites line (env vars, seed data, a service to run).
- Then list 2-5 numbered actions. Each step pairs a concrete action (open a URL/page, click a UI element, run a CLI command, call an endpoint) with its observable expected result — action → expected result.
- Do NOT write "run the automated tests" (npm test, etc.) as the only instruction. A single automated-test line is allowed ONLY as an optional last line AFTER the manual steps.
- If the PR has no manually testable surface (docs-only, CI, pure refactor), do NOT invent a scenario: state it plainly instead, e.g. "No manual test surface — docs-only change; verify rendering / links".
Every step must be specific to the actual changes — no generic placeholders.]
```

## MSG_PR_TEMPLATE_FR

> Used only if no project template exists. Language: `pullRequest: "fr"`.

```markdown
## Résumé

[Résumé concis des changements en 2-3 phrases]

## Changements

[Liste des commits avec leurs messages]

## Comment tester

[Rédiger des scénarios de test MANUELS concrets du point de vue de l'utilisateur, ancrés dans le diff réel du Step 4.1 (les surfaces visibles par l'utilisateur et l'environnement de test identifiés à cette étape) :
- Si une préparation est nécessaire, commencer par une seule ligne de prérequis (variables d'environnement, données de départ, un service à lancer).
- Puis lister 2 à 5 actions numérotées. Chaque étape associe une action concrète (ouvrir une URL/page, cliquer sur un élément d'UI, lancer une commande CLI, appeler un endpoint) à son résultat attendu observable — action → résultat attendu.
- Ne PAS écrire « lancer les tests automatisés » (npm test, etc.) comme seule instruction. Une unique ligne de tests automatisés n'est autorisée QU'EN dernière ligne optionnelle, APRÈS les étapes manuelles.
- Si la PR n'a aucune surface testable manuellement (docs uniquement, CI, refactoring pur), ne PAS inventer de scénario : le dire clairement à la place, ex. « Aucune surface de test manuel — changement docs uniquement ; vérifier le rendu / les liens ».
Chaque étape doit être spécifique aux changements réels — pas de placeholders génériques.]
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

## MSG_PR_CREATED

Displayed in Step 6.5, immediately after the PR is created — before the ticket update and before the watch phase.

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Pull Request created

   #{PR_NUMBER} — {PR_TITLE}

   {PR_URL}

   {head_branch} → {base_branch}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Pull Request créée

   #{PR_NUMBER} — {PR_TITLE}

   {PR_URL}

   {head_branch} → {base_branch}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_SUMMARY

Two variants. Use **watch** when `pullRequest.watchCI` is `true` (Step 7.4 follows), **manual** when it is `false`.

### en — watch

```text
✅ PR created!

📌 Branch   : {branch}
🔗 PR       : {PR_URL}
🎫 Ticket   : {TICKET_ID} → {ticket_status}

Now watching the PR — you can leave this running:
1. Waiting for the CI checks to finish
2. Failing checks get fixed and re-pushed automatically (up to 3 attempts)
3. Review feedback from bots or humans gets addressed automatically
4. Run /magic:done once the PR is merged
```

### en — manual

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

### fr — watch

```text
✅ PR créée !

📌 Branche  : {branch}
🔗 PR       : {PR_URL}
🎫 Ticket   : {TICKET_ID} → {ticket_status}

Je surveille la PR — tu peux laisser tourner :
1. J'attends la fin des checks CI
2. Les checks en échec sont corrigés et repoussés automatiquement (3 tentatives max)
3. Les retours de review (bots ou humains) sont traités automatiquement
4. Lance /magic:done une fois la PR mergée
```

### fr — manual

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

## MSG_CI_ALL_GREEN

Displayed in Step 7.4.3 — the terminal state of a healthy PR.

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PR #{PR_NUMBER} is green

   Checks    : {passed}/{total} passed
   Review    : no actionable feedback ({reviewers})
   Waited    : {waited} min

   {PR_URL}

Nothing left to do here — merge when you're ready,
then run /magic:done to close out the ticket.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ La PR #{PR_NUMBER} est verte

   Checks    : {passed}/{total} passés
   Review    : aucun retour à traiter ({reviewers})
   Attente   : {waited} min

   {PR_URL}

Plus rien à faire ici — merge quand tu veux,
puis lance /magic:done pour clore le ticket.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_CI_FAILED

Displayed in Step 7.4.4 when the checks finished with at least one failure.

### en

```text
❌ CI failed on PR #{PR_NUMBER} — {failed}/{total} checks

  • {name} ({error_class})
    {diagnosis}
    {link}

Fixing automatically...
```

### fr

```text
❌ CI en échec sur la PR #{PR_NUMBER} — {failed}/{total} checks

  • {name} ({error_class})
    {diagnosis}
    {link}

Correction automatique en cours...
```

## MSG_CI_AUTO_FIX

Displayed at each round of the auto-fix loop (Step 7.4.4).

### en

```text
🔧 Fix attempt {attempt}/3

   {fixes}

   Committed : {COMMIT_SHA}
   Pushed — waiting for the CI to run again.
```

### fr

```text
🔧 Tentative de correction {attempt}/3

   {fixes}

   Commit  : {COMMIT_SHA}
   Poussé — j'attends que la CI reparte.
```

## MSG_CI_FIX_EXHAUSTED

Displayed when the auto-fix loop gives up, or when a failure must not be auto-fixed.

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CI still failing after {attempts} attempt(s)

Remaining failures:
  • {name} ({error_class})
    {diagnosis}
    {link}

I'm stopping here rather than pushing another speculative fix.

   {PR_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CI toujours en échec après {attempts} tentative(s)

Échecs restants :
  • {name} ({error_class})
    {diagnosis}
    {link}

Je m'arrête ici plutôt que de pousser une correction au hasard.

   {PR_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_REVIEW_COMMENTS_FOUND

Displayed in Step 7.4.5 before chaining into the resolve workflow.

### en

```text
💬 {count} actionable review comment(s) on the PR — from {reviewers}

  • [{severity}] {source} · {path}:{line}
    {request}

Addressing them now via /magic:resolve...
```

### fr

```text
💬 {count} commentaire(s) de review à traiter sur la PR — de {reviewers}

  • [{severity}] {source} · {path}:{line}
    {request}

Je les traite maintenant via /magic:resolve...
```

## MSG_CI_WATCH_TIMEOUT

Displayed in Step 7.4.6 when the 30 min budget runs out with checks still pending.

### en

```text
⏱️  Stopped watching after {waited} min — some checks are still running

Still pending:
  • {name}

I can't tell you whether the PR is green. Check it directly:
   {PR_URL}

Re-run /magic:pr later, or /magic:resolve if review comments show up.
```

### fr

```text
⏱️  Arrêt de la surveillance après {waited} min — des checks tournent encore

Toujours en attente :
  • {name}

Je ne peux pas te dire si la PR est verte. Vérifie directement :
   {PR_URL}

Relance /magic:pr plus tard, ou /magic:resolve si des commentaires arrivent.
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
