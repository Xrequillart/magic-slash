---
description: Push commits, create PR and update Jira ticket
allowed-tools: Bash(*), mcp__github__*, mcp__atlassian__*
---

# Magic Slash - /done

Tu es un assistant qui finalise une tâche en pushant les commits, créant une PR et mettant à jour le ticket Jira.

## Étape 1 : Récupérer la branche actuelle

```bash
git branch --show-current
```

Vérifie que tu n'es pas sur `main` ou `master`.
Si c'est le cas, informe l'utilisateur qu'il doit être sur une branche de feature.

## Étape 2 : Push vers le remote

```bash
git push -u origin <nom-de-branche>
```

Si le push échoue, affiche l'erreur et arrête le processus.

## Étape 3 : Lister les commits pour la PR

```bash
git log origin/main..HEAD --oneline
```

Récupère la liste des commits qui seront inclus dans la PR.

## Étape 4 : Créer la Pull Request via MCP GitHub

Utilise l'outil MCP GitHub `mcp__github__create_pull_request` pour créer la PR :

- **Titre** : Basé sur le nom de la branche ou le premier commit
  - Si la branche contient un ticket ID (ex: `feature/PROJ-123`), utilise le format : `[PROJ-123] Description`
- **Description** : Générée à partir des commits
  - Liste les commits avec leurs messages
  - Ajoute une section "Changes" résumant les modifications
- **Base** : `main` (ou `master` selon le repo)
- **Head** : La branche actuelle

## Étape 5 : Extraire le ticket ID

Analyse le nom de la branche pour extraire l'ID du ticket Jira :

- Pattern : `feature/PROJ-123`, `fix/PROJ-456`, `PROJ-789-description`
- Regex : `[A-Z]+-\d+`

Si aucun ticket ID n'est trouvé, demande à l'utilisateur s'il veut quand même mettre à jour un ticket Jira.

## Étape 6 : Mettre à jour le ticket Jira

Si un ticket ID est trouvé, utilise les outils MCP Atlassian :

Note : Si tu ne connais pas le `cloudId`, utilise d'abord `mcp__atlassian__getAccessibleAtlassianResources` pour l'obtenir.

1. **Récupérer les transitions disponibles** avec `mcp__atlassian__getTransitionsForJiraIssue`
2. **Changer le statut** vers "To be reviewed" (ou équivalent) avec `mcp__atlassian__transitionJiraIssue`
3. **Ajouter un commentaire** avec le lien vers la PR via `mcp__atlassian__addCommentToJiraIssue`

Si le statut "To be reviewed" n'existe pas, essaie :

- "In Review"
- "Code Review"
- "Review"

## Étape 7 : Résumé final

Affiche un résumé de ce qui a été fait :

```text
✅ Tâche terminée !

📌 Branche  : feature/PROJ-123
🔗 PR       : https://github.com/org/repo/pull/42
🎫 Ticket   : PROJ-123 → To be reviewed

Prochaines étapes :
1. Demande une review à tes collègues
2. Attend l'approbation et les checks CI
3. Merge la PR une fois approuvée
```
