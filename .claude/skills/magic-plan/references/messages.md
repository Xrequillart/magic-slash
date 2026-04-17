# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.

## MSG_CONFIG_ERROR

### en

```text
Configuration Magic Slash not found.

Please create the config file at:
  ~/.config/magic-slash/config.json

See documentation: https://github.com/magic-slash/config
```

### fr

```text
Configuration Magic Slash introuvable.

Veuillez créer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

## MSG_DESCRIBE_IDEA

### en

```text
What's on your mind? Describe the feature, bug, or idea you'd like me to analyze.

I'll explore the codebase, assess feasibility, and propose an action plan.
```

### fr

```text
Qu'est-ce que tu as en tête ? Décris la feature, le bug ou l'idée que tu voudrais que j'analyse.

Je vais explorer la codebase, évaluer la faisabilité et proposer un plan d'action.
```

## MSG_ANALYSIS_REPORT

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 ANALYSIS REPORT

📝 Summary     : {summary}
📋 Type        : {request_type}
⭐ Score       : {score}/10 — {score_justification}

{related_issues_section}

## Impact analysis

| Aspect     | Assessment              |
|------------|-------------------------|
| Files      | {files_affected}        |
| Complexity | {complexity}            |
| Risk       | {risk_level}            |
| Breaking   | {breaking_changes}      |

## Risks & concerns

{risks_list}

## Architecture alignment

{architecture_notes}

## Action plan

{action_plan_or_alternatives}

## Acceptance criteria

{acceptance_criteria}

## Suggestions

🏷️  Labels : {suggested_labels}
🌿 Branch : {suggested_branch}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 RAPPORT D'ANALYSE

📝 Résumé      : {summary}
📋 Type        : {request_type}
⭐ Note        : {score}/10 — {score_justification}

{related_issues_section}

## Analyse d'impact

| Aspect       | Évaluation              |
|--------------|-------------------------|
| Fichiers     | {files_affected}        |
| Complexité   | {complexity}            |
| Risque       | {risk_level}            |
| Breaking     | {breaking_changes}      |

## Risques & préoccupations

{risks_list}

## Alignement architectural

{architecture_notes}

## Plan d'action

{action_plan_or_alternatives}

## Critères d'acceptation

{acceptance_criteria}

## Suggestions

🏷️  Labels  : {suggested_labels}
🌿 Branche : {suggested_branch}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_RELATED_ISSUES

### en

```text
🔗 Related issues:
{issue_list}
```

### fr

```text
🔗 Issues liées :
{issue_list}
```

> Format each issue as: `  - #{number}: {title} ({state})` with a link.

## MSG_NO_RELATED_ISSUES

### en

```text
🔗 Related issues: None found
```

### fr

```text
🔗 Issues liées : Aucune trouvée
```

## MSG_NEXT_STEPS

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What would you like to do?

  1. 📝 Create a GitHub issue — I'll turn this plan into a tracked issue
  2. 🔄 Refine the plan — Let's keep discussing and adjust
  3. ❌ Abandon — Not worth pursuing right now

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qu'est-ce que tu veux faire ?

  1. 📝 Créer une issue GitHub — Je transforme ce plan en issue trackée
  2. 🔄 Affiner le plan — On continue la discussion et on ajuste
  3. ❌ Abandonner — Pas pertinent pour le moment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_ISSUE_CREATED

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Issue created!

  🔗 {issue_url}
  📌 #{issue_number}: {issue_title}

💡 Next step: run /start #{issue_number} to begin working on it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Issue créée !

  🔗 {issue_url}
  📌 #{issue_number}: {issue_title}

💡 Prochaine étape : lance /start #{issue_number} pour commencer à bosser dessus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_ABANDONED

### en

```text
👍 No worries — shelved for now. You can always come back to it later.
```

### fr

```text
👍 Pas de souci — on met ça de côté. Tu peux toujours y revenir plus tard.
```

## MSG_REFINE_ASK

### en

```text
What would you like to change or explore further?

You can adjust the scope, ask about specific risks, or suggest a different approach.
```

### fr

```text
Qu'est-ce que tu voudrais changer ou explorer davantage ?

Tu peux ajuster le périmètre, poser des questions sur des risques spécifiques, ou proposer une approche différente.
```

## MSG_EXPLORING

### en

```text
🔍 Exploring the codebase to understand the impact of this idea...
```

### fr

```text
🔍 Exploration de la codebase pour comprendre l'impact de cette idée...
```

## MSG_GITHUB_ERROR

### en

```text
⚠️ GitHub API error. Continuing without issue tracking.

You can create the issue manually using the plan above.
```

### fr

```text
⚠️ Erreur API GitHub. Continuation sans le suivi d'issues.

Tu peux créer l'issue manuellement en utilisant le plan ci-dessus.
```
