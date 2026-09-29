# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.

## MSG_APP_NOT_RUNNING

### en

```text
❌ Magic Slash Desktop is not running

Your configuration lives in the cloud and only the app can read it, so there is
nothing reliable to work from until it is open.

Launch Magic Slash, then run this command again.
```

### fr

```text
❌ Magic Slash Desktop n'est pas lancé

Ta configuration est dans le cloud et seule l'app peut la lire : sans elle, il n'y a
rien de fiable sur quoi travailler.

Lance Magic Slash, puis relance cette commande.
```

## MSG_REVIEW_DRAFT

Shown in Step 8, before anything is posted. `{…}` are filled in; drop a block that has nothing
in it. With `review.confidenceScore` off, drop the score line and the "missing points" line.
No em dash in the copy.

### en

```text
Confidence score: {score} / 10

{Assessment: 3 to 6 sentences. What the PR does well, stated as what you checked and how
("the refactor does not change behaviour: I compared the old closure to the new helper line by
line"). Then what you did NOT verify and what you rely on instead ("I did not run the tests
locally, I rely on what the PR reports, 1658/1658").}

{10 - score} points are missing for {one / two} reason(s): {reason 1}{, and reason 2}.

Comments to post

{n}. {path}:{line} ({and :{other line}}) — {to address / minor (kind) / nit (kind) / question / general comment}

▎ {The comment exactly as it would be posted: what the code does, why it matters, the concrete
▎ way out. Cite other places with path:line.}

{… one block per comment, most important first}
```

### fr

```text
Note de confiance : {score} / 10

{Appréciation : 3 à 6 phrases. Ce que la PR fait bien, dit comme ce que tu as vérifié et
comment (« le refactor ne change pas son comportement : j'ai comparé l'ancienne closure au
nouvel helper ligne à ligne »). Puis ce que tu n'as PAS vérifié et sur quoi tu t'appuies à la
place (« Je n'ai pas relancé les tests en local, je me fie à ce que la PR rapporte (1658/1658) »).}

Il manque {10 - score} point(s) pour {une / deux} raison(s) : {raison 1}{, et raison 2}.

Commentaires à poster

{n}. {path}:{line} ({et :{autre ligne}}) — {à traiter / mineur (type) / nit (type) / question / commentaire général}

▎ {Le commentaire tel qu'il serait posté : ce que fait le code, pourquoi ça compte, la sortie
▎ concrète. Cite les autres endroits avec path:line.}

{… un bloc par commentaire, le plus important d'abord}
```

## MSG_REVIEW_ASK

The `AskUserQuestion` of Step 8.

### en

- Question: `What do I post on PR #{PR_NUMBER}?`
- Header: `Review`
- Options:
  1. `Post all` — `The {count} comments, as a {APPROVE / REQUEST_CHANGES / COMMENT} review.`
  2. `Choose` — `Pick the comments to post in a second question.`
  3. `Edit first` — `Tell me what to change, I show the draft again.`
  4. `Post nothing` — `Keep the review here, nothing goes to GitHub.`
- Second question when `Choose` (multiSelect): `Which comments do I post?`, one option per comment: `{n}. {short title}` — `{path}:{line}, {label}`.

### fr

- Question : `Qu'est-ce que je poste sur la PR #{PR_NUMBER} ?`
- Header : `Review`
- Options :
  1. `Tout poster` — `Les {count} commentaires, en review {APPROVE / REQUEST_CHANGES / COMMENT}.`
  2. `Choisir` — `Choisir les commentaires à poster dans une seconde question.`
  3. `Modifier d'abord` — `Dis-moi quoi changer, je te remontre le brouillon.`
  4. `Ne rien poster` — `La review reste ici, rien ne part sur GitHub.`
- Seconde question si `Choisir` (multiSelect) : `Quels commentaires je poste ?`, une option par commentaire : `{n}. {titre court}` — `{path}:{line}, {label}`.

## MSG_REVIEW_POSTING

Step 8 when `review.mode` is `"post"`: one line under the draft, then post.

### en

```text
Posting the {count} comment(s) on PR #{PR_NUMBER} (this repository posts reviews without asking).
```

### fr

```text
Je poste les {count} commentaire(s) sur la PR #{PR_NUMBER} (ce repository poste les reviews sans demander).
```

## MSG_REVIEW_SUMMARY

Drop the confidence line when `review.confidenceScore` is off.

The next-steps block is chosen by the event actually posted (SKILL.md Step 11), self-review
included: APPROVE renders `{If approved}`, REQUEST_CHANGES `{If changes_requested}`, COMMENT
`{If commented}` (so a self-review always renders `{If commented}`). When nothing was posted, the
`{If not posted}` block is rendered as is. These lines are this skill's own: it is not a step of
the workflow, and never adds a next step from it.

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code review completed for {TICKET-ID}

📋 PR       : #{PR_NUMBER} - {PR_TITLE}
🎯 Confidence : {score} / 10
📊 Result   : {APPROVE / REQUEST_CHANGES / COMMENT / not posted}
💬 Posted   : {posted} of {drafted} comment(s), {count} to address

{If approved}
Next steps:
1. Wait for CI checks to pass
2. Merge the PR once approved

{If changes_requested}
Next steps:
1. The author addresses the comments
2. Run /magic:review again once they push

{If commented}
Next steps:
1. Consider the suggestions and discuss if needed
2. Wait for CI checks to pass
3. Merge the PR once approved

{If not posted}
Nothing was posted on GitHub. The draft above is yours to reuse.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Revue de code terminée pour {TICKET-ID}

📋 PR       : #{PR_NUMBER} - {PR_TITLE}
🎯 Confiance : {score} / 10
📊 Résultat : {APPROVE / REQUEST_CHANGES / COMMENT / non postée}
💬 Postés   : {posted} commentaire(s) sur {drafted}, dont {count} à traiter

{Si approved}
Prochaines étapes :
1. Attend que les checks CI passent
2. Merge la PR une fois approuvée

{Si changes_requested}
Prochaines étapes :
1. L'auteur traite les commentaires
2. Relance /magic:review une fois ses corrections poussées

{Si commented}
Prochaines étapes :
1. Considère les suggestions et discute si besoin
2. Attend que les checks CI passent
3. Merge la PR une fois approuvée

{Si non postée}
Rien n'a été posté sur GitHub. Le brouillon ci-dessus reste à ta disposition.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_REVIEW_SUMMARY_FULLSTACK

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code review completed for {TICKET-ID} (Full-Stack)

  • api-PROJ-123: PR #{PR_NUMBER_1} → {APPROVE / REQUEST_CHANGES / COMMENT}
  • web-PROJ-123: PR #{PR_NUMBER_2} → {APPROVE / REQUEST_CHANGES / COMMENT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Revue de code terminée pour {TICKET-ID} (Full-Stack)

  • api-PROJ-123 : PR #{PR_NUMBER_1} → {APPROVE / REQUEST_CHANGES / COMMENT}
  • web-PROJ-123 : PR #{PR_NUMBER_2} → {APPROVE / REQUEST_CHANGES / COMMENT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_JIRA_REVIEW_COMMENT

Drop `, confidence {score} / 10` when `review.confidenceScore` is off.

### en

```text
🔍 Code review completed for PR #{PR_NUMBER}

Result: {APPROVE / REQUEST_CHANGES / COMMENT}, confidence {score} / 10
- {count} comment(s) to address
- {count} other comment(s)
```

### fr

```text
🔍 Revue de code terminée pour la PR #{PR_NUMBER}

Résultat : {APPROVE / REQUEST_CHANGES / COMMENT}, confiance {score} / 10
- {count} commentaire(s) à traiter
- {count} autre(s) commentaire(s)
```
