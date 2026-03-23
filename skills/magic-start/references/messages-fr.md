# Référence des messages (FR)

> Messages en français pour le skill /magic-start.

## MSG_CONFIG_ERROR

```text
❌ Configuration Magic Slash introuvable

Veuillez créer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

## MSG_NODE_NO_MANAGER

```text
⚠️ Fichier de version Node.js détecté (.nvmrc/.node-version) mais aucun gestionnaire de version (nvm/fnm) trouvé.
Les commandes utiliseront la version Node.js du système.
```

## MSG_BRANCH_CONFIRM

```text
La branche de base configurée est **{branch}**. L'utiliser, ou en spécifier une autre ? (appuie sur Entrée pour confirmer)
```

## MSG_BRANCH_ASK

```text
Aucune branche de développement configurée pour ce repository.
Quelle branche dois-je utiliser comme base ? (ex : main, develop, staging)
```

## MSG_TRANSITION_FAILED

```text
⚠️ Impossible de déplacer le ticket vers "En cours" (transition non disponible ou permissions insuffisantes)
```

## MSG_LABEL_FAILED

```text
⚠️ Impossible d'ajouter le label "in-progress" (label introuvable ou permissions insuffisantes)
```

## MSG_NO_ISSUE_FOUND

```text
Aucune issue #{number} trouvée dans les repositories configurés.

Vérifie le numéro de l'issue et réessaie, ou précise le repo complet (ex : owner/repo#123).
```

## MSG_GITHUB_MULTI_ISSUE

```text
Plusieurs issues #{number} trouvées :

{issue_list}

Laquelle veux-tu utiliser ? (ou 'all')
```

## MSG_SCOPE_MULTIPLE

```text
Ce ticket semble concerner plusieurs repositories :

{repo_list_with_scores}

Lequel veux-tu utiliser ? (1, 2, ou 'all')
```

## MSG_SCOPE_NONE

```text
Impossible de déterminer automatiquement le repo pertinent.

Repositories disponibles :
{repo_list}

Lequel veux-tu utiliser ? ({numbers}, ou 'all')
```

## MSG_WORKTREE_EXISTS

```text
⚠️ Le worktree existe déjà : {path}

Options :
1. Utiliser le worktree existant (recommandé)
2. Supprimer et recréer
3. Abandonner

Choix (1/2/3) :
```

## MSG_BRANCH_ALREADY_EXISTS

```text
⚠️ La branche feature/{TICKET_ID} existe déjà.

Options :
1. Utiliser la branche existante (checkout dans le worktree)
2. Supprimer et recréer depuis {DEV_BRANCH}
3. Abandonner

Choix (1/2/3) :
```

## MSG_REBASE_CONFLICT

```text
⚠️ Conflit de rebase sur {DEV_BRANCH}. La branche a peut-être divergé.

Options :
1. Abandonner le rebase et utiliser l'état actuel (git rebase --abort)
2. Résoudre les conflits manuellement
3. Abandonner

Choix (1/2/3) :
```

## MSG_FETCH_FAILED

```text
⚠️ git fetch a échoué. Vérifiez la connexion réseau. Continuation avec l'état local...
```

## MSG_WORKTREE_FILES_COPIED

```text
📄 Fichiers copiés dans le worktree :
{file_list}
```

> Utiliser `✓ {file}` pour les fichiers copiés et `⚠ {file} (introuvable dans le repo principal, ignoré)` pour les fichiers manquants.

## MSG_WORKTREE_FILES_DETECTED

```text
🔍 Fichiers non versionnés détectés dans le repo principal, potentiellement utiles dans les worktrees :
{file_list}

Sauvegarder dans la config pour les prochains worktrees ? (o/n)
```

## MSG_INSTALLING_DEPS

```text
📦 Installation des dépendances avec {PACKAGE_MANAGER}...
```

## MSG_INSTALL_FAILED

```text
⚠️ L'installation des dépendances a échoué. Installation manuelle peut-être nécessaire. Continuation...
```

## MSG_TASK_SUMMARY

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

```text
🎯 Stratégie d'exécution : Solo

  L'ensemble du plan sera exécuté séquentiellement.
```

## MSG_STRATEGY_MULTI

```text
🎯 Stratégie d'exécution : Multi-agent ({N} subagents)

  {agent_list}

  Orchestrateur : Agent principal (sync + résumé final)
```

## MSG_APPROVAL

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Ce plan et cette stratégie d'exécution te conviennent-ils ?

• Tape "oui", "ok", "go", ou "c'est parti" pour lancer l'implémentation
• Tape "non" ou pose des questions si tu veux discuter de modifications
• Tu peux aussi suggérer des modifications au plan ou à la stratégie

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_PROGRESS_SOLO

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLÉMENTATION EN COURS (Solo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Étape {X}/{N} : {step_title}

{description}
```

## MSG_PROGRESS_MULTI

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLÉMENTATION EN COURS (Multi-agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Lancement de {N} subagents en parallèle...

  {agent_list}

⏳ En attente de la complétion de tous les agents...
```

## MSG_FINAL_SUMMARY

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements
   • Lance /commit pour créer un commit
   • Lance /pr pour créer une Pull Request
```

## MSG_FINAL_SUMMARY_FULLSTACK

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

## Interaction entre les repos
{interaction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements dans les deux repos
   • Lance /commit dans chaque worktree pour créer les commits
   • Lance /pr pour créer une Pull Request
```

## MSG_SIMPLIFY

```text
🔍 Passe de simplification en cours sur les fichiers modifiés...
```

## MSG_MULTI_REPO_CONTEXT

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
