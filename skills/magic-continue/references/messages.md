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

## MSG_FORMAT_UNRECOGNIZED

### en

```text
Unable to detect the ticket format. Please provide a valid ID:
  • Jira: PROJ-123
  • GitHub: #456 or 456
```

### fr

```text
Impossible de détecter le format du ticket. Veuillez fournir un ID valide :
  • Jira : PROJ-123
  • GitHub : #456 ou 456
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

## MSG_FETCH_FAILED

### en

```text
⚠️ git fetch failed. Check your network connection. Continuing with local state...
```

### fr

```text
⚠️ git fetch a échoué. Vérifiez la connexion réseau. Continuation avec l'état local...
```

## MSG_MULTI_WORKTREE

### en

```text
Multiple worktrees found for {TICKET_ID}:

{worktree_list}

Which one do you want to use? (1, 2, or 'all')
```

### fr

```text
Plusieurs worktrees trouvés pour {TICKET_ID} :

{worktree_list}

Lequel souhaitez-vous utiliser ? (1, 2, ou 'all')
```

> Each entry in `{worktree_list}` is formatted as: `{index}. {path} ({keyword_hint})`, e.g. `1. /path/to/api-PROJ-123 (backend)`.

## MSG_BRANCH_FOUND_NO_WORKTREE

### en

```text
Branch found for {TICKET_ID} but no worktree:

  • {BRANCH_NAME} (in {REPO_NAME}, {local/remote})

Creating a worktree from this branch...
```

### fr

```text
Branche trouvée pour {TICKET_ID} mais pas de worktree :

  • {BRANCH_NAME} (dans {REPO_NAME}, {locale/distante})

Création d'un worktree à partir de cette branche...
```

> If multiple branches match across repos, list them all. If multiple branches match in the **same** repo, list them and ask the user to choose.

## MSG_NOTHING_FOUND

### en

```text
No branch or worktree found for {TICKET_ID}

Suggestion: Use /start {TICKET_ID} to begin working on this ticket.
```

### fr

```text
Aucune branche ou worktree trouvé pour {TICKET_ID}

Suggestion : Utilisez /start {TICKET_ID} pour commencer à travailler sur ce ticket.
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

## MSG_RESUME_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resuming work on {TICKET_ID}: "{TICKET_TITLE}"

  Source    : {source}
  Ticket    : {ticket_id} - {title}
  Worktree  : {worktree_path}
  Branch    : {branch_name}
{IF_PR}  PR        : #{pr_number} ({pr_state}) - {pr_url}{/IF_PR}

  Current state:
    {commits_ahead} commits ahead of {DEV_BRANCH}
    {modified_count} modified files (not staged)
    {staged_count} file(s) staged

  Recent commits:
    {commit_list}

Ready to continue. What would you like to do?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reprise du travail sur {TICKET_ID} : "{TICKET_TITLE}"

  Source    : {source}
  Ticket    : {ticket_id} - {title}
  Worktree  : {worktree_path}
  Branche   : {branch_name}
{IF_PR}  PR        : #{pr_number} ({pr_state}) - {pr_url}{/IF_PR}

  État actuel :
    {commits_ahead} commits en avance sur {DEV_BRANCH}
    {modified_count} fichiers modifiés (non stagés)
    {staged_count} fichier(s) stagé(s)

  Commits récents :
    {commit_list}

Prêt à continuer. Que souhaitez-vous faire ?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> Omit the `{IF_PR}...{/IF_PR}` line if no PR exists.

## MSG_RESUME_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resuming work on {TICKET_ID}: "{TICKET_TITLE}" (Full-Stack)

  Source    : {source}
  Ticket    : {ticket_id} - {title}

{FOR_EACH_REPO}
  📁 {repo_label}: {worktree_path}
    Branch  : {branch_name}
    PR      : #{pr_number} ({pr_state}) - {pr_url}
    State   : {commits_ahead} commits ahead, {modified_summary}
{/FOR_EACH_REPO}

Ready to continue. What would you like to do?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reprise du travail sur {TICKET_ID} : "{TICKET_TITLE}" (Full-Stack)

  Source    : {source}
  Ticket    : {ticket_id} - {title}

{FOR_EACH_REPO}
  📁 {repo_label} : {worktree_path}
    Branche : {branch_name}
    PR      : #{pr_number} ({pr_state}) - {pr_url}
    État    : {commits_ahead} commits en avance, {modified_summary}
{/FOR_EACH_REPO}

Prêt à continuer. Que souhaitez-vous faire ?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> Omit the PR line for repos without a PR. `{repo_label}` is e.g. "Backend" or "Frontend", inferred from repo keywords.
