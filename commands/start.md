---
description: Démarre une tâche depuis un ticket Jira ou une issue GitHub
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), mcp__atlassian__*, mcp__github__*
---

# Magic Slash - /start

Tu es un assistant qui aide à démarrer une tâche de développement depuis un ticket Jira ou une issue GitHub.

## Étape 1 : Détecter le type de ticket

Analyse l'argument fourni : `$ARGUMENTS`

- **Format Jira** : Contient un préfixe alphabétique suivi d'un tiret et de chiffres (ex: `PROJ-123`, `ABC-456`)
  - Regex : `^[A-Z]+-\d+$`
  - → Va à l'**Étape 2A** (Jira)

- **Format GitHub** : Un simple numéro, avec ou sans `#` (ex: `123`, `#456`)
  - Regex : `^#?\d+$`
  - → Va à l'**Étape 2B** (GitHub)

Si le format n'est pas reconnu, demande à l'utilisateur de préciser.

## Étape 2A : Récupérer le ticket Jira

Utilise l'outil MCP Atlassian `mcp__atlassian__getJiraIssue` pour récupérer les détails du ticket.

Note : Si tu ne connais pas le `cloudId`, utilise d'abord `mcp__atlassian__getAccessibleAtlassianResources` pour l'obtenir.

→ Continue à l'**Étape 3**.

## Étape 2B : Récupérer l'issue GitHub

### 2B.1 : Lire la configuration des repos

```bash
cat ~/.config/magic-slash/config.json
```

Récupère les chemins des repos (backend et frontend).

### 2B.2 : Identifier les repos GitHub

Pour chaque repo configuré, récupère le owner et le nom du repo :

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse l'URL pour extraire `owner/repo` (formats possibles : `git@github.com:owner/repo.git` ou `https://github.com/owner/repo.git`).

### 2B.3 : Chercher l'issue dans chaque repo

Pour chaque repo identifié, utilise `mcp__github__get_issue` pour vérifier si l'issue existe :

- `owner` : Le propriétaire du repo
- `repo` : Le nom du repo
- `issue_number` : Le numéro de l'issue (sans le `#`)

Collecte toutes les issues trouvées.

### 2B.4 : Résolution

- **Aucune issue trouvée** : Informe l'utilisateur qu'aucune issue avec ce numéro n'existe dans les repos configurés.

- **Une seule issue trouvée** : Utilise cette issue et continue.

- **Plusieurs issues trouvées** : Affiche les options et demande à l'utilisateur de choisir :

  ```text
  Plusieurs issues #123 trouvées :

  1. owner1/repo-backend : "Titre de l'issue backend"
  2. owner2/repo-frontend : "Titre de l'issue frontend"

  Laquelle voulez-vous utiliser ?
  ```

→ Continue à l'**Étape 3**.

## Étape 3 : Analyser le scope du ticket

Détermine le scope du ticket (BACK, FRONT, ou BOTH) en analysant :

**Pour Jira :**

- **Labels** : "backend", "frontend", "fullstack", "api", "ui"...
- **Composants Jira** : si définis dans le projet

**Pour GitHub :**

- **Labels** : "backend", "frontend", "fullstack", "api", "ui"...
- **Assignees** et **Milestone** peuvent donner des indices

**Pour les deux :**

- **Mots-clés dans le titre/description** :
  - BACK : API, endpoint, database, migration, service, controller, model, query
  - FRONT : component, UI, style, CSS, page, form, button, view, screen

Si aucun indice clair, demande à l'utilisateur : "Ce ticket concerne le BACKEND, FRONTEND, ou les DEUX ?"

**Cas particulier GitHub** : Si l'issue a été trouvée dans un seul repo lors de l'étape 2B,
le scope est automatiquement déterminé par ce repo (BACK si backend, FRONT si frontend).

## Étape 4 : Lire la configuration

Si ce n'est pas déjà fait à l'étape 2B, lis le fichier de configuration pour obtenir les chemins des repos :

```bash
cat ~/.config/magic-slash/config.json
```

## Étape 5 : Créer les worktrees

Pour chaque repo concerné (selon l'analyse à l'étape 3) :

1. Va dans le répertoire du repo
2. Récupère le nom du dossier du repo
3. Fetch les dernières modifications
4. Crée le worktree AU MÊME NIVEAU que le repo principal

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
git fetch origin
git worktree add -b feature/$TICKET_ID ../${REPO_NAME}-$TICKET_ID origin/main
```

**Note sur le nom de branche** :

- Pour Jira : utilise l'ID tel quel (ex: `feature/PROJ-1234`)
- Pour GitHub : préfixe avec le nom du repo pour éviter les conflits (ex: `feature/repo-name-123`)

Exemple : Si le repo est `/projects/my-api`, le worktree sera
`/projects/my-api-PROJ-1234` (Jira) ou `/projects/my-api-123` (GitHub)

## Étape 6 : Résumé et contexte agent

Une fois les worktrees créés, affiche un résumé :

- Source : Jira ou GitHub (owner/repo)
- Ticket : [ID] - [Titre]
- Type : [Bug/Feature/Task...] (Jira) ou Labels (GitHub)
- Scope : [BACK/FRONT/BOTH]
- Worktree(s) créé(s) : [chemins]

Puis génère un prompt contextuel pour commencer à travailler sur la tâche, basé sur :

- La description du ticket/issue
- Les acceptance criteria (si présents)
- Le type de modification attendue
