---
name: done
description: This skill should be used when the user says "done", "terminé", "on peut créer la PR", "push and create PR", "finaliser la tâche", "pousser les changements", "create the pull request", "finish the task", "c'est fini", "j'ai fini", "I'm done", "finalize", "push my changes", or indicates they have finished coding and want to create a pull request.
allowed-tools: Bash(*), mcp__github__*, mcp__atlassian__*
---

# Magic Slash - /done

Tu es un assistant qui finalise une tâche en pushant les commits, créant une PR et mettant à jour le ticket Jira.

## Configuration

Lis `~/.config/magic-slash/config.json` et détermine les paramètres en fonction du repo actuel :

1. Identifie le repo actuel en comparant `$PWD` avec les chemins dans `.repositories`
2. Pour chaque paramètre, vérifie d'abord si le repo a une valeur custom
3. Sinon, utilise la valeur globale (si elle existe)
4. Sinon, utilise la valeur par défaut

### Paramètres de langue

| Paramètre         | Chemin repo                                  | Chemin global            | Défaut |
| ----------------- | -------------------------------------------- | ------------------------ | ------ |
| Langue PR         | `.repositories.<name>.languages.pullRequest` | `.languages.pullRequest` | `"en"` |
| Langue Jira       | `.repositories.<name>.languages.jiraComment` | `.languages.jiraComment` | `"en"` |
| Langue discussion | `.repositories.<name>.languages.discussion`  | `.languages.discussion`  | `"en"` |

### Paramètres Pull Request

| Paramètre         | Chemin repo                                        | Défaut | Description                                |
| ----------------- | -------------------------------------------------- | ------ | ------------------------------------------ |
| Auto-link tickets | `.repositories.<name>.pullRequest.autoLinkTickets` | `true` | Ajouter les liens Jira/GitHub dans la PR   |

### Paramètres Issues

| Paramètre     | Chemin repo                               | Défaut | Description                                    |
| ------------- | ----------------------------------------- | ------ | ---------------------------------------------- |
| Comment on PR | `.repositories.<name>.issues.commentOnPR` | `true` | Ajouter un commentaire avec le lien de la PR   |

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

## Étape 4 : Récupérer le template de PR du projet

Cherche si un template de PR existe dans le projet :

```bash
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null || cat .github/pull_request_template.md 2>/dev/null || cat docs/pull_request_template.md 2>/dev/null || echo ""
```

Si un template existe, tu dois **impérativement le respecter** et remplir ses sections.

## Étape 5 : Créer la Pull Request via MCP GitHub

Utilise l'outil MCP GitHub `mcp__github__create_pull_request` pour créer la PR :

- **Titre** : Basé sur le nom de la branche ou le premier commit
  - Si la branche contient un ticket ID (ex: `feature/PROJ-123`), utilise le format : `[PROJ-123] Description`
- **Description** :
  - **Si un template de PR existe** : Utilise-le et remplis toutes ses sections
  - **Sinon** : Utilise le template par défaut correspondant à `.languages.pullRequest`
  - **Ajoute une section "Linked Issues"** avec le lien vers le ticket (sauf si `autoLinkTickets` est `false`)

### Section Linked Issues (par défaut, sauf si autoLinkTickets: false)

Ajoute cette section à la fin de la description de la PR :

**En anglais :**

```markdown
## Linked Issues

- Jira: [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)
```

**En français :**

```markdown
## Tickets liés

- Jira : [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)
```

Note : Adapte l'URL Jira en fonction du domaine de l'utilisateur (récupéré via `mcp__atlassian__getAccessibleAtlassianResources`).

### Template PR en anglais (pullRequest: "en" ou absent) - utilisé uniquement si aucun template projet

```markdown
## Summary

[Concise summary of changes in 2-3 sentences]

## Changes

[List of commits with their messages]

## How to test

[Step-by-step instructions to test the changes:
1. Step 1
2. Step 2
3. Expected result]
```

### Template PR en français (pullRequest: "fr") - utilisé uniquement si aucun template projet

```markdown
## Résumé

[Résumé concis des changements en 2-3 phrases]

## Changements

[Liste des commits avec leurs messages]

## Comment tester

[Instructions étape par étape pour tester les changements :
1. Étape 1
2. Étape 2
3. Résultat attendu]
```

- **Base** : `main` (ou `master` selon le repo)
- **Head** : La branche actuelle

## Étape 6 : Extraire le ticket ID

Analyse le nom de la branche pour extraire l'ID du ticket Jira :

- Pattern : `feature/PROJ-123`, `fix/PROJ-456`, `PROJ-789-description`
- Regex : `[A-Z]+-\d+`

Si aucun ticket ID n'est trouvé, demande à l'utilisateur s'il veut quand même mettre à jour un ticket Jira.

## Étape 7 : Mettre à jour le ticket Jira

Si un ticket ID est trouvé, utilise les outils MCP Atlassian :

Note : Si tu ne connais pas le `cloudId`, utilise d'abord `mcp__atlassian__getAccessibleAtlassianResources` pour l'obtenir.

1. **Récupérer les transitions disponibles** avec `mcp__atlassian__getTransitionsForJiraIssue`
2. **Changer le statut** vers "To be reviewed" (ou équivalent) avec `mcp__atlassian__transitionJiraIssue`
3. **Ajouter un commentaire** avec le lien vers la PR via `mcp__atlassian__addCommentToJiraIssue`
   (sauf si `commentOnPR` est `false`)

### Format du commentaire Jira selon `.languages.jiraComment`

**En anglais (jiraComment: "en" ou absent) :**

```text
🔗 Pull Request created: [PR_URL]

Ready for code review.
```

**En français (jiraComment: "fr") :**

```text
🔗 Pull Request créée : [PR_URL]

Prêt pour la revue de code.
```

Si le statut "To be reviewed" n'existe pas, essaie :

- "In Review"
- "Code Review"
- "Review"

## Étape 8 : Résumé final

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
