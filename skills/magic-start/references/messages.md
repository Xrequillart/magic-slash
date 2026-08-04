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

## MSG_JIRA_CUSTOM_FIELDS_FOUND

### en

```text
📄 {ticket_id} has no usable spec in its description — content found in custom fields: {field_names}

Treated as part of the ticket description: plan, scope and acceptance criteria are built on it too.
```

### fr

```text
📄 {ticket_id} n'a pas de spec dans sa description — contenu trouvé dans des champs personnalisés : {field_names}

Traité comme faisant partie de la description : le plan, le périmètre et les critères d'acceptation s'appuient dessus aussi.
```

> `{field_names}`: display names of the fields kept, comma-separated (the raw-id fallback of `references/jira-custom-fields.md` §3 applies).

## MSG_JIRA_TICKET_EMPTY

### en

```text
⚠️ {ticket_id} is nearly empty: no usable description, and no custom field carrying content either.

Working from the title alone means inventing the acceptance criteria, then implementing the wrong thing.

Options:
1. Describe what has to be done (free text)
2. Continue with the title alone, at your own risk
3. Stop

Choose (1/2/3):
```

### fr

```text
⚠️ {ticket_id} est quasi vide : pas de description exploitable, et aucun champ personnalisé ne porte de contenu.

Partir du seul titre revient à inventer les critères d'acceptation, puis à implémenter autre chose.

Options :
1. Décrire ce qu'il faut faire (texte libre)
2. Continuer avec le seul titre, à tes risques
3. Arrêter

Choix (1/2/3) :
```

## MSG_BLOCKER_CLEAR

### en

```text
🟢 Dependency checked: {blocker_id} — {evidence}. Nothing holds {ticket_id}.
```

### fr

```text
🟢 Dépendance vérifiée : {blocker_id} — {evidence}. Rien ne retient {ticket_id}.
```

> `{evidence}`: what made the verdict green, in a few words — `PR #91 merged`, `ticket done`
> (`PR #91 mergée`, `ticket terminé`). Never a status name alone: the verdict comes from
> `status.statusCategory.key`, per `references/dependencies.md` §3.2.

## MSG_BLOCKER_STALE_TICKET

### en

```text
🟢 Dependency checked: {blocker_id} has landed (PR #{pr_number} merged), but its ticket is still {blocker_status} — the tracker is behind, the code is not.
```

### fr

```text
🟢 Dépendance vérifiée : {blocker_id} est livré (PR #{pr_number} mergée), mais son ticket est encore {blocker_status} — c'est le tracker qui est en retard, pas le code.
```

## MSG_BLOCKER_IN_FLIGHT

### en

```text
⏳ {ticket_id} depends on {blocker_id} (in flight)

  PR #{pr_number}  "{pr_title}"  {pr_state}
  branch  {blocker_branch}

  Base the new worktree on:
  > {blocker_branch}
    {dev_branch}  (default)

A force-push or a rebase on that PR propagates straight into your worktree.
```

### fr

```text
⏳ {ticket_id} dépend de {blocker_id} (en cours)

  PR #{pr_number}  "{pr_title}"  {pr_state}
  branche  {blocker_branch}

  Baser le nouveau worktree sur :
  > {blocker_branch}
    {dev_branch}  (défaut)

Un force-push ou un rebase sur cette PR se propage directement dans ton worktree.
```

> `{dev_branch}`: the repo's dev branch, resolved in Step 0.4 — which is why Step 4.1 asks this, not Step 2.4.

## MSG_BLOCKER_HARD

### en

```text
⚠ {ticket_id} is blocked by {blocker_id}

  {blocker_id}  "{blocker_title}"
  status    {blocker_status}
  PR        none found

  > Start {ticket_id} anyway
    Start {blocker_id} instead
    Stop here
```

### fr

```text
⚠ {ticket_id} est bloqué par {blocker_id}

  {blocker_id}  "{blocker_title}"
  statut    {blocker_status}
  PR        aucune trouvée

  > Démarrer {ticket_id} quand même
    Démarrer {blocker_id} à la place
    Arrêter ici
```

## MSG_BLOCKER_ABANDONED_PR

### en

```text
⚠ {ticket_id} depends on {blocker_id}, whose work looks abandoned

  {blocker_id}  "{blocker_title}"
  status    {blocker_status}
  PR        #{pr_number} closed, never merged — {pr_url}

  A closed unmerged PR is not the same as no PR: someone started this and stopped.

  > Start {ticket_id} anyway
    Start {blocker_id} instead
    Stop here
```

### fr

```text
⚠ {ticket_id} dépend de {blocker_id}, dont le travail semble abandonné

  {blocker_id}  "{blocker_title}"
  statut    {blocker_status}
  PR        #{pr_number} fermée, jamais mergée — {pr_url}

  Une PR fermée sans merge n'est pas une absence de PR : quelqu'un a commencé, puis arrêté.

  > Démarrer {ticket_id} quand même
    Démarrer {blocker_id} à la place
    Arrêter ici
```

## MSG_BLOCKER_CHECK_UNAVAILABLE

### en

```text
⚪ {ticket_id} declares a dependency on {blocker_id}, but it could not be checked: {reason}. No verdict is assumed — carried forward as an attention point.
```

### fr

```text
⚪ {ticket_id} déclare une dépendance sur {blocker_id}, mais elle n'a pas pu être vérifiée : {reason}. Aucun verdict n'est supposé — repris en point d'attention.
```

> `{reason}`: `gh` missing, `gh` not authenticated, Atlassian integration disabled, the blocker
> could not be resolved (`references/dependencies.md` §6), or — on Step 4.1's 🟢 → 🟡 downgrade — the
> blocker's base ref could not be fetched. Never leave it vague.
>
> This message **reports**, it does not ask: it states that no verdict was assumed and the workflow
> continues. On the one path that must not continue (Step 4.1's downgrade, where falling back to
> `$DEV_BRANCH` would undo the finding), display this line for the reason and then ask separately with
> `MSG_BLOCKER_HARD`'s three options. Do not reword this text into a question.

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
⚠️ Branch {BRANCH_NAME} already exists.

Options:
1. Use the existing branch (checkout into worktree)
2. Delete and recreate from {DEV_BRANCH}
3. Abort

Choose (1/2/3):
```

### fr

```text
⚠️ La branche {BRANCH_NAME} existe déjà.

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
{blocker_line}

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
{blocker_line}

🔍 Exploration du codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> `{blocker_line}`: the single line produced by the Step 2.4 dependency gate — `MSG_BLOCKER_CLEAR`,
> `MSG_BLOCKER_STALE_TICKET` or `MSG_BLOCKER_CHECK_UNAVAILABLE`. Those three are the only one-line keys;
> `MSG_BLOCKER_IN_FLIGHT`, `MSG_BLOCKER_HARD` and `MSG_BLOCKER_ABANDONED_PR` are multi-line question blocks
> shown at their own moment and **never** folded in here — on those paths `{blocker_line}` is empty and the
> blocker reaches the user through `{attention_points}` instead. When no dependency was declared it is likewise
> **empty and the line is omitted entirely**, so the box renders exactly as it did before the gate existed. The
> same placeholder and rule apply to `MSG_TASK_SUMMARY_FULLSTACK` below.

## MSG_TASK_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
🔀 Full-Stack Task:
{worktree_list}
{blocker_line}

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
{blocker_line}

🔍 Exploration du codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_DESIGN_REFS_FOUND

### en

```text
🔍 Design references detected, strongest source of truth first:
{ref_list}

Written to .magic/design-brief.md — the implementation reuses it instead of inventing a layout.
```

### fr

```text
🔍 Références de design détectées, source de vérité la plus forte en premier :
{ref_list}

Écrites dans .magic/design-brief.md — l'implémentation la réutilise au lieu d'inventer un layout.
```

> One line per reference: `{rank}. {type} — {reference} — ✅ read` / `⚠️ unresolved ({reason})`,
> in French `✅ lu` / `⚠️ non résolu ({reason})`. Display only — the brief keeps the English statuses
> (`design-context.md` §4.2).

## MSG_DESIGN_REF_UNRESOLVED

### en

```text
⚠️ Design reference unreadable: {reference} ({reason}) — a definitive limit, not a transient error.
Recorded as unresolved in .magic/design-brief.md; the implementation will flag the gap, not guess.
```

### fr

```text
⚠️ Référence de design illisible : {reference} ({reason}) — limite définitive, inutile de réessayer.
Notée comme non résolue dans .magic/design-brief.md ; l'implémentation signalera le manque sans deviner.
```

## MSG_DESIGN_NO_REF

### en

```text
🔍 {ticket_id} looks like a UI task, but no design reference was found.
Nothing usable in the description, the comments, the attachments, the remote links or the repo.

Without a mockup I will invent the layout, and design fidelity becomes unverifiable.

Options:
1. Provide a reference
2. Continue without a mockup
3. Stop

Choose (1/2/3):
```

### fr

```text
🔍 {ticket_id} ressemble à une tâche UI, mais aucune référence de design n'a été trouvée.
Rien d'exploitable dans la description, les commentaires, les pièces jointes, les liens ni le repo.

Sans maquette, j'inventerai le layout et la fidélité au design sera invérifiable.

Options :
1. Fournir une référence
2. Continuer sans maquette
3. Arrêter

Choix (1/2/3) :
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

## MSG_TEST_ACCOUNTS_NOT_FOUND

### en

```text
ℹ️ No test account found for this repo — checked `testAccountsSource`, `.claude/skills/`, `TESTING.md`, `docs/test*account*`, `CONTRIBUTING.md`.
The "How to test" section will say so in one line instead of naming one. Nothing was invented.
```

### fr

```text
ℹ️ Aucun compte de test trouvé pour ce repo — vérifiés : `testAccountsSource`, `.claude/skills/`, `TESTING.md`, `docs/test*account*`, `CONTRIBUTING.md`.
La section « Comment tester » le dira en une ligne au lieu d'en nommer un. Rien n'a été inventé.
```

## MSG_TEST_ACCOUNTS_PUBLIC_REPO_GUARD

### en

```text
⚠️ Test accounts: `inline` mode refused — this repository is public, or its visibility could not be determined.
The credential would end up in a world-readable PR body later, so it will not be written down.
Falling back to `reference` mode: the summary will point at the documented source instead.
```

### fr

```text
⚠️ Comptes de test : mode `inline` refusé — ce repository est public, ou sa visibilité n'a pas pu être déterminée.
L'identifiant finirait dans une PR lisible par tous, il ne sera donc pas écrit.
Repli en mode `reference` : le résumé pointera vers la source documentée à la place.
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
