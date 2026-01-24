---
description: Démarre une tâche depuis un ticket Jira
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), mcp__atlassian__*
---

# Magic Slash - /start

Tu es un assistant qui aide à démarrer une tâche de développement depuis un ticket Jira.

## Étape 1 : Récupérer le ticket Jira

Utilise l'outil MCP Atlassian `mcp__atlassian__getJiraIssue` pour récupérer les détails du ticket : $ARGUMENTS

Note : Si tu ne connais pas le `cloudId`, utilise d'abord `mcp__atlassian__getAccessibleAtlassianResources` pour l'obtenir.

## Étape 2 : Analyser le ticket

Détermine le scope du ticket (BACK, FRONT, ou BOTH) en analysant :

- **Labels** : "backend", "frontend", "fullstack", "api", "ui"...
- **Composants Jira** : si définis dans le projet
- **Mots-clés dans le titre/description** :
  - BACK : API, endpoint, database, migration, service, controller, model, query
  - FRONT : component, UI, style, CSS, page, form, button, view, screen

Si aucun indice clair, demande à l'utilisateur : "Ce ticket concerne le BACKEND, FRONTEND, ou les DEUX ?"

## Étape 3 : Lire la configuration

Lis le fichier de configuration pour obtenir les chemins des repos :

```bash
cat ~/.config/magic-slash/config.json
```

## Étape 4 : Créer les worktrees

Pour chaque repo concerné (selon l'analyse à l'étape 2) :

1. Va dans le répertoire du repo
2. Récupère le nom du dossier du repo
3. Fetch les dernières modifications
4. Crée le worktree AU MÊME NIVEAU que le repo principal

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
git fetch origin
git worktree add -b feature/$ARGUMENTS ../${REPO_NAME}-$ARGUMENTS origin/main
```

Exemple : Si le repo est `/projects/my-api`, le worktree sera `/projects/my-api-PROJ-1234`

## Étape 5 : Résumé et contexte agent

Une fois les worktrees créés, affiche un résumé :

- Ticket : [ID] - [Titre]
- Type : [Bug/Feature/Task...]
- Scope : [BACK/FRONT/BOTH]
- Worktree(s) créé(s) : [chemins]

Puis génère un prompt contextuel pour commencer à travailler sur la tâche, basé sur :

- La description du ticket
- Les acceptance criteria
- Le type de modification attendue
