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

## MSG_TRANSITION_FAILED

### en

```text
⚠️ Unable to move the ticket to "In Progress" (transition not available or insufficient permissions)
```

### fr

```text
⚠️ Impossible de déplacer le ticket vers "En cours" (transition non disponible ou permissions insuffisantes)
```

## MSG_LABEL_FAILED

### en

```text
⚠️ Unable to add the "in-progress" label (label not found or insufficient permissions)
```

### fr

```text
⚠️ Impossible d'ajouter le label "in-progress" (label introuvable ou permissions insuffisantes)
```

## MSG_NO_ISSUE_FOUND

### en

```text
No issue #{number} found in any configured repository.

Please check the issue number and try again, or specify the full repo (e.g. owner/repo#123).
```

### fr

```text
Aucune issue #{number} trouvée dans les repositories configurés.

Vérifie le numéro de l'issue et réessaie, ou précise le repo complet (ex : owner/repo#123).
```

## MSG_GITHUB_MULTI_ISSUE

### en

```text
Multiple issues #{number} found:

{issue_list}

Which one do you want to use? (or 'all')
```

### fr

```text
Plusieurs issues #{number} trouvées :

{issue_list}

Laquelle veux-tu utiliser ? (ou 'all')
```

## MSG_SCOPE_MULTIPLE

### en

```text
This ticket seems to involve multiple repositories:

{repo_list_with_scores}

Which one do you want to use? (1, 2, or 'all')
```

### fr

```text
Ce ticket semble concerner plusieurs repositories :

{repo_list_with_scores}

Lequel veux-tu utiliser ? (1, 2, ou 'all')
```

## MSG_SCOPE_NONE

### en

```text
Unable to automatically determine the relevant repo.

Available repositories:
{repo_list}

Which one do you want to use? ({numbers}, or 'all')
```

### fr

```text
Impossible de déterminer automatiquement le repo pertinent.

Repositories disponibles :
{repo_list}

Lequel veux-tu utiliser ? ({numbers}, ou 'all')
```

## MSG_WORKTREE_EXISTS

### en

```text
⚠️ Worktree already exists: {path}

Options:
1. Use existing worktree (recommended)
2. Delete and recreate
3. Abort

Choose (1/2/3):
```

### fr

```text
⚠️ Le worktree existe déjà : {path}

Options :
1. Utiliser le worktree existant (recommandé)
2. Supprimer et recréer
3. Abandonner

Choix (1/2/3) :
```

## MSG_BRANCH_ALREADY_EXISTS

### en

```text
⚠️ Branch feature/{TICKET_ID} already exists.

Options:
1. Use the existing branch (checkout into worktree)
2. Delete and recreate from {DEV_BRANCH}
3. Abort

Choose (1/2/3):
```

### fr

```text
⚠️ La branche feature/{TICKET_ID} existe déjà.

Options :
1. Utiliser la branche existante (checkout dans le worktree)
2. Supprimer et recréer depuis {DEV_BRANCH}
3. Abandonner

Choix (1/2/3) :
```

## MSG_REBASE_CONFLICT

### en

```text
⚠️ Rebase conflict on {DEV_BRANCH}. The branch may have diverged.

Options:
1. Abort rebase and use current state (git rebase --abort)
2. Resolve conflicts manually
3. Abort

Choose (1/2/3):
```

### fr

```text
⚠️ Conflit de rebase sur {DEV_BRANCH}. La branche a peut-être divergé.

Options :
1. Abandonner le rebase et utiliser l'état actuel (git rebase --abort)
2. Résoudre les conflits manuellement
3. Abandonner

Choix (1/2/3) :
```

## MSG_FETCH_FAILED

### en

```text
⚠️ git fetch failed. Check your network connection. Continuing with local state...
```

### fr

```text
⚠️ git fetch a échoué. Vérifiez la connexion réseau. Continuation avec l'état local...
```

## MSG_WORKTREE_FILES_COPIED

### en

```text
📄 Copied worktree files:
{file_list}
```

### fr

```text
📄 Fichiers copiés dans le worktree :
{file_list}
```

> Use `✓ {file}` for copied files and `⚠ {file} (not found in main repo, skipped)` / `⚠ {file} (introuvable dans le repo principal, ignoré)` for missing files.

## MSG_WORKTREE_FILES_DETECTED

### en

```text
🔍 Detected untracked files in the main repo that might need copying to worktrees:
{file_list}

Save to config for future worktrees? (y/n)
```

### fr

```text
🔍 Fichiers non versionnés détectés dans le repo principal, potentiellement utiles dans les worktrees :
{file_list}

Sauvegarder dans la config pour les prochains worktrees ? (o/n)
```

## MSG_INSTALLING_DEPS

### en

```text
📦 Installing dependencies with {PACKAGE_MANAGER}...
```

### fr

```text
📦 Installation des dépendances avec {PACKAGE_MANAGER}...
```

## MSG_INSTALL_FAILED

### en

```text
⚠️ Dependency installation failed. You may need to install manually. Continuing...
```

### fr

```text
⚠️ L'installation des dépendances a échoué. Installation manuelle peut-être nécessaire. Continuation...
```

## MSG_TASK_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
📁 Worktree  : {worktree_path}

🔍 Exploring codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
📁 Worktree  : {worktree_path}

🔍 Exploration du codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_TASK_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
🔀 Full-Stack Task:
{worktree_list}

🔍 Exploring codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
🔀 Tâche Full-Stack :
{worktree_list}

🔍 Exploration du codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_STRATEGY_SOLO

### en

```text
🎯 Execution strategy: Solo

  The entire plan will be executed sequentially.
```

### fr

```text
🎯 Stratégie d'exécution : Solo

  L'ensemble du plan sera exécuté séquentiellement.
```

## MSG_STRATEGY_MULTI

### en

```text
🎯 Execution strategy: Multi-agent ({N} subagents)

  {agent_list}

  Orchestrator: Main agent (sync + final summary)
```

### fr

```text
🎯 Stratégie d'exécution : Multi-agent ({N} subagents)

  {agent_list}

  Orchestrateur : Agent principal (sync + résumé final)
```

## MSG_APPROVAL

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Does this plan and execution strategy look good to you?

• Type "yes", "ok", "go", or "let's go" to start implementation
• Type "no" or ask questions if you want to discuss changes
• You can also suggest modifications to the plan or the strategy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Ce plan et cette stratégie d'exécution te conviennent-ils ?

• Tape "oui", "ok", "go", ou "c'est parti" pour lancer l'implémentation
• Tape "non" ou pose des questions si tu veux discuter de modifications
• Tu peux aussi suggérer des modifications au plan ou à la stratégie

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_PROGRESS_SOLO

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION IN PROGRESS (Solo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Step {X}/{N}: {step_title}

{description}
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLÉMENTATION EN COURS (Solo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Étape {X}/{N} : {step_title}

{description}
```

## MSG_PROGRESS_MULTI

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION IN PROGRESS (Multi-agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Launching {N} subagents in parallel...

  {agent_list}

⏳ Waiting for all agents to complete...
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLÉMENTATION EN COURS (Multi-agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Lancement de {N} subagents en parallèle...

  {agent_list}

⏳ En attente de la complétion de tous les agents...
```

## MSG_FINAL_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implementation completed for {TICKET-ID}

## Files modified
{modified_files}

## Files created
{created_files}

## Summary of changes
{summary}

## Decisions made
{decisions}

## How to test
{test_steps}

## Confidence assessment
{confidence_score}/10

✅ Positive points:
{positive_points}

⚠️ Attention points:
{attention_points}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes (see "How to test" above)
   • Run /commit to create a commit
   • Run /pr to create a Pull Request
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implémentation terminée pour {TICKET-ID}

## Fichiers modifiés
{modified_files}

## Fichiers créés
{created_files}

## Résumé des changements
{summary}

## Décisions prises
{decisions}

## Comment tester
{test_steps}

## Évaluation de confiance
{confidence_score}/10

✅ Points positifs :
{positive_points}

⚠️ Points d'attention :
{attention_points}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements (voir « Comment tester » ci-dessus)
   • Lance /commit pour créer un commit
   • Lance /pr pour créer une Pull Request
```

## MSG_FINAL_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implementation completed for {TICKET-ID} (Full-Stack)

## Backend ({backend_path})

### Files modified
{backend_modified}

### Files created
{backend_created}

## Frontend ({frontend_path})

### Files modified
{frontend_modified}

### Files created
{frontend_created}

## Summary of changes
{summary}

## Decisions made
{decisions}

## How the repos interact
{interaction}

## How to test
{test_steps}

## Confidence assessment
{confidence_score}/10

✅ Positive points:
{positive_points}

⚠️ Attention points:
{attention_points}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes in both repos (see "How to test" above)
   • Run /commit in each worktree to create commits
   • Run /pr to create a Pull Request
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implémentation terminée pour {TICKET-ID} (Full-Stack)

## Backend ({backend_path})

### Fichiers modifiés
{backend_modified}

### Fichiers créés
{backend_created}

## Frontend ({frontend_path})

### Fichiers modifiés
{frontend_modified}

### Fichiers créés
{frontend_created}

## Résumé des changements
{summary}

## Décisions prises
{decisions}

## Interaction entre les repos
{interaction}

## Comment tester
{test_steps}

## Évaluation de confiance
{confidence_score}/10

✅ Points positifs :
{positive_points}

⚠️ Points d'attention :
{attention_points}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements dans les deux repos (voir « Comment tester » ci-dessus)
   • Lance /commit dans chaque worktree pour créer les commits
   • Lance /pr pour créer une Pull Request
```

## MSG_AUTOFIX

### en

```text
🔧 Confidence: {confidence_score}/10 — fixing: {attention_point}... (iteration {n}/3)
```

### fr

```text
🔧 Confiance : {confidence_score}/10 — correction : {attention_point}... (itération {n}/3)
```

## MSG_SIMPLIFY

### en

```text
🔍 Running simplification pass on modified files...
```

### fr

```text
🔍 Passe de simplification en cours sur les fichiers modifiés...
```

## MSG_MULTI_REPO_CONTEXT

### en

```text
# Full-Stack Context

You are working on ticket **{TICKET_ID}** which spans multiple repos.

## Worktrees for this task
{worktree_list}

## Instructions
- Use `cd` to navigate to the appropriate worktree
- You can work on both repos in a single session
- Make sure changes are consistent across repos
```

### fr

```text
# Contexte Full-Stack

Tu travailles sur le ticket **{TICKET_ID}** qui couvre plusieurs repos.

## Worktrees pour cette tâche
{worktree_list}

## Instructions
- Utilise `cd` pour naviguer vers le worktree approprié
- Tu peux travailler sur les deux repos dans une même session
- Assure-toi que les changements sont cohérents entre les repos
```
