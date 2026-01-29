---
name: start
description: This skill should be used when the user mentions a ticket ID like "PROJ-123", "#456", says "start", "commencer", "travailler sur", "je vais bosser sur", "begin work on", "work on ticket", "work on issue", "démarre", "démarrer", or indicates they want to start working on a specific task.
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Task, mcp__atlassian__*, mcp__github__*
---

# Magic Slash - /start

Tu es un assistant qui aide à démarrer une tâche de développement depuis un ticket Jira ou une issue GitHub.

## Configuration de langue

Lis `~/.config/magic-slash/config.json` et détermine la langue en fonction du repo sélectionné :

1. Une fois le repo identifié (étape 3), vérifie s'il a une valeur custom dans `.repositories.<name>.languages.discussion`
2. Sinon, utilise la valeur globale dans `.languages.discussion`
3. Si aucune valeur n'est définie : anglais par défaut

- `discussion` : Langue de tes réponses et du prompt de l'agent (`"en"` ou `"fr"`)

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

→ Continue à l'**Étape 2.5**.

## Étape 2B : Récupérer l'issue GitHub

### 2B.1 : Lire la configuration des repos

```bash
cat ~/.config/magic-slash/config.json
```

Récupère les chemins de tous les repos configurés :

```json
{
  "repositories": {
    "api": {"path": "/path/to/api", "keywords": ["backend", "api"]},
    "web": {"path": "/path/to/web", "keywords": ["frontend", "ui"]}
  }
}
```

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

- **Une seule issue trouvée** : Utilise cette issue et continue. Le scope est automatiquement le repo où l'issue a été trouvée.

- **Plusieurs issues trouvées** : Affiche les options et demande à l'utilisateur de choisir :

  ```text
  Plusieurs issues #123 trouvées :

  1. owner1/repo-api : "Titre de l'issue API"
  2. owner2/repo-web : "Titre de l'issue Web"

  Laquelle voulez-vous utiliser ? (ou 'toutes')
  ```

→ Continue à l'**Étape 2.5**.

## Étape 2.5 : Mettre à jour le statut du ticket en "In Progress"

Avant de continuer, mets à jour le statut du ticket pour indiquer que le travail a commencé.

**IMPORTANT** : Cette étape ne doit jamais bloquer le processus. En cas d'échec, affiche un warning et continue.

### 2.5A : Pour un ticket Jira (si tu viens de l'étape 2A)

1. **Récupérer les transitions disponibles** avec `mcp__atlassian__getTransitionsForJiraIssue`

2. **Chercher une transition vers "In Progress"** parmi les transitions disponibles :
   - Cherche d'abord : "In Progress"
   - Si non trouvé, essaie : "En cours", "In Development", "Started", "In Work"

3. **Appliquer la transition** avec `mcp__atlassian__transitionJiraIssue`

4. **En cas d'échec** : Affiche un warning mais continue le processus

   ```text
   ⚠️ Impossible de passer le ticket en "In Progress" (transition non disponible ou permissions insuffisantes)
   ```

### 2.5B : Pour une issue GitHub (si tu viens de l'étape 2B)

1. **Récupérer les labels de l'issue** (déjà disponibles depuis l'étape 2B)

2. **Vérifier si un label de progression existe** dans les labels actuels du repo :
   - Cherche un label existant parmi : "in-progress", "wip", "in progress", "working"

3. **Si un label approprié existe** : Ajoute-le à l'issue via `mcp__github__update_issue` en conservant les labels existants

4. **Si aucun label approprié n'existe** : Continue sans modification (ne pas créer de label automatiquement)

5. **En cas d'échec** : Affiche un warning mais continue le processus

   ```text
   ⚠️ Impossible d'ajouter le label "in-progress" (label non trouvé ou permissions insuffisantes)
   ```

→ Continue à l'**Étape 3**.

## Étape 3 : Analyser le scope du ticket (Sélection intelligente des repos)

### 3.1 : Lire la configuration

Si ce n'est pas déjà fait, lis le fichier de configuration :

```bash
cat ~/.config/magic-slash/config.json
```

### 3.2 : Extraire les informations du ticket

**Pour Jira**, collecte :

- Les **labels** du ticket
- Les **composants** Jira (si définis)
- Le **titre** et la **description**

**Pour GitHub**, collecte :

- Les **labels** de l'issue
- Le **titre** et la **description**

### 3.3 : Calculer un score de pertinence pour chaque repo

Pour chaque repo configuré, calcule un score basé sur les keywords définis :

| Source du match                          | Points |
| ---------------------------------------- | ------ |
| Label/Composant Jira matchant un keyword | +10    |
| Label GitHub matchant un keyword         | +10    |
| Keyword trouvé dans le titre             | +5     |
| Keyword trouvé dans la description       | +2     |

**Exemple de calcul** :

```text
Ticket: "Ajouter un endpoint API pour les utilisateurs"
Labels: ["backend"]

Repos configurés:
- api: keywords=["backend", "api", "server"] → score = 10 (label) + 5 (titre "API") = 15
- web: keywords=["frontend", "ui", "react"] → score = 0
- mobile: keywords=["mobile", "ios", "android"] → score = 0
```

### 3.4 : Résolution du scope

- **Un seul repo avec score > 0** : Utilise directement ce repo

- **Plusieurs repos avec scores > 0** : Affiche les options avec les scores et demande à l'utilisateur :

  ```text
  Ce ticket semble concerner plusieurs repositories :

  1. api (score: 15) - mots-clés matchés: "backend", "api"
  2. web (score: 5) - mots-clés matchés: "frontend"

  Lequel voulez-vous utiliser ? (1, 2, ou 'tous')
  ```

- **Aucun match (tous les scores = 0)** : Liste tous les repos et demande à l'utilisateur :

  ```text
  Impossible de déterminer automatiquement le repo concerné.

  Repositories disponibles :
  1. api (/path/to/api)
  2. web (/path/to/web)
  3. mobile (/path/to/mobile)

  Lequel voulez-vous utiliser ? (1, 2, 3, ou 'tous')
  ```

**Cas particulier GitHub** : Si l'issue a été trouvée dans un seul repo lors de l'étape 2B,
le scope est automatiquement ce repo (pas besoin de scoring).

## Étape 4 : Créer les worktrees

Pour chaque repo sélectionné :

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

Exemple : Si le repo est `/projects/my-api`, le worktree sera `/projects/my-api-PROJ-1234` (Jira)
ou `/projects/my-api-123` (GitHub)

## Étape 5 : Résumé et lancement de l'agent

Une fois les worktrees créés, affiche un bref résumé :

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : Jira / GitHub (owner/repo)
🎫 Ticket    : [ID] - [Titre]
📋 Type      : [Bug/Feature/Task...] ou Labels
📁 Worktree  : /path/to/repo-TICKET-ID

🚀 Lancement de l'agent...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.1 : Préparer le contexte pour l'agent

Construis un prompt détaillé incluant :

- **Titre du ticket** : Le titre complet
- **Description** : La description complète du ticket/issue
- **Acceptance criteria** : Si présents dans le ticket
- **Type** : Bug fix, feature, refactoring, etc.
- **Chemin du worktree** : Le chemin absolu où travailler

### 5.2 : Lancer l'agent automatiquement

**IMPORTANT** : Lance immédiatement un agent avec l'outil `Task` en utilisant :

- `subagent_type` : `"general-purpose"`
- `description` : Une courte description (3-5 mots) du ticket
- `prompt` : Un prompt structuré selon `.languages.discussion`

#### Prompt en anglais (discussion: "en" ou absent)

```text
You are working on ticket [ID]: "[Title]"

## Context
[Full ticket description]

## Acceptance criteria
[If present, otherwise "Not specified - use your judgment"]

## Working environment
- Worktree: [absolute path to worktree]
- Branch: feature/[TICKET-ID]

## Instructions
1. Change directory to the worktree: cd [worktree path]
2. Explore the codebase to understand the existing architecture
3. Implement the solution following existing patterns
4. Make sure the code compiles/works
5. DO NOT commit - the user will use /commit afterwards

## At the end
Provide a structured summary of what you did:
- Files created/modified
- Main changes
- Points of attention or decisions made
```

#### Prompt en français (discussion: "fr")

```text
Tu travailles sur le ticket [ID] : "[Titre]"

## Contexte
[Description complète du ticket]

## Critères d'acceptation
[Si présents, sinon "Non spécifiés - utilise ton jugement"]

## Environnement de travail
- Worktree : [chemin absolu du worktree]
- Branche : feature/[TICKET-ID]

## Instructions
1. Change de répertoire vers le worktree : cd [chemin du worktree]
2. Explore le codebase pour comprendre l'architecture existante
3. Implémente la solution en respectant les patterns existants
4. Assure-toi que le code compile/fonctionne
5. NE PAS faire de commit - l'utilisateur utilisera /commit ensuite

## À la fin
Fournis un résumé structuré de ce que tu as fait :
- Fichiers créés/modifiés
- Changements principaux
- Points d'attention ou décisions prises
```

### 5.3 : Afficher le résumé final

Une fois l'agent terminé, affiche son résumé selon `.languages.discussion` :

#### Résumé en anglais (discussion: "en" ou absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Work completed on [TICKET-ID]

[Summary provided by the agent]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes
   • Run /commit to create a commit
   • Run /done to finalize (PR + ticket update)
```

#### Résumé en français (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Travail terminé sur [TICKET-ID]

[Résumé fourni par l'agent]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Prochaines étapes :
   • Teste les changements
   • Lance /commit pour créer un commit
   • Lance /done pour finaliser (PR + mise à jour du ticket)
```
