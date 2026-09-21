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

## MSG_MULTI_REPO_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Multi-repo resolve detected for {TICKET-ID}

Worktrees with review comments:
  • {worktree-path} ({count} comments)

Review comments will be resolved for each repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Résolution multi-repo détectée pour {TICKET-ID}

Worktrees avec des commentaires de review :
  • {worktree-path} ({count} commentaires)

Les commentaires de review seront résolus pour chaque repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_MULTI_REPO_FAILURE

### en

```text
❌ Failed to resolve comments for {worktree-name}: {error reason}
Continuing to next repository...
```

### fr

```text
❌ Échec de la résolution pour {worktree-name} : {raison de l'erreur}
Passage au repository suivant...
```

## MSG_PR_STATE

### en

```text
# If merged:
⚠️ PR #{number} is already merged. No review comments to resolve.

# If closed:
⚠️ PR #{number} is closed. Re-open it before resolving comments.

# If draft:
⚠️ PR #{number} is in draft state. Continue resolving comments? (Y/n)
```

### fr

```text
# Si mergée :
⚠️ La PR #{number} est déjà mergée. Aucun commentaire de review à résoudre.

# Si fermée :
⚠️ La PR #{number} est fermée. Rouvre-la avant de résoudre les commentaires.

# Si brouillon :
⚠️ La PR #{number} est en brouillon. Continuer la résolution des commentaires ? (O/n)
```

## MSG_BRANCH_STALE

### en

```text
⚠️ Your branch is {count} commit(s) behind {base_branch}.
Applying fixes on a stale branch may cause merge conflicts.

Options:
1. Continue anyway
2. Rebase first (git pull --rebase origin {base_branch})
3. Abort

Choose (1/2/3):
```

### fr

```text
⚠️ Votre branche a {count} commit(s) de retard sur {base_branch}.
Appliquer les corrections sur une branche en retard peut causer des conflits de merge.

Options :
1. Continuer quand même
2. Rebaser d'abord (git pull --rebase origin {base_branch})
3. Abandonner

Choix (1/2/3) :
```

## MSG_NO_COMMENTS

### en

```text
✅ No unresolved review comments found on PR #{number}.

Nothing to resolve. The PR is ready for re-review.
```

### fr

```text
✅ Aucun commentaire de review non résolu trouvé sur la PR #{number}.

Rien à résoudre. La PR est prête pour une re-review.
```

## MSG_COMMENT_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Review comments to resolve for {TICKET-ID}

{For each comment:}
  {index}. [{file}:{line}] {comment summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resolve all comments? (Y/n/select specific numbers)
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Commentaires de review à résoudre pour {TICKET-ID}

{Pour chaque commentaire :}
  {index}. [{file}:{line}] {résumé du commentaire}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Résoudre tous les commentaires ? (O/n/sélectionner des numéros)
```

## MSG_STALE_COMMENTS

### en

```text
⚠️ {count} comment(s) may be stale (file modified since comment was posted):
  {index}. [{file}:{line}] {comment summary} ⚠️ STALE

Options:
1. Resolve all (including stale)
2. Skip stale comments
3. Select specific comments to resolve

Choose (1/2/3):
```

### fr

```text
⚠️ {count} commentaire(s) potentiellement obsolète(s) (fichier modifié depuis le commentaire) :
  {index}. [{file}:{line}] {résumé du commentaire} ⚠️ OBSOLÈTE

Options :
1. Résoudre tous (y compris les obsolètes)
2. Ignorer les commentaires obsolètes
3. Sélectionner les commentaires à résoudre

Choix (1/2/3) :
```

## MSG_CHANGES_PREVIEW

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Changes preview for {TICKET-ID}

{For each modified file:}
  • {file} — {fix_summary} (reviewer: @{reviewer})

Files changed: {count}
Lines added: {additions}, Lines removed: {deletions}

Commit mode: {commit_mode_label}  (config: "{commitMode}")

Proceed?
  Y     — {commit_mode_action}
  amend — amend the last commit (git commit --amend)
  new   — create a new commit (fix: address review feedback)
  diff  — show full diff
  n     — abort

(Y/amend/new/diff/n)
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Aperçu des modifications pour {TICKET-ID}

{Pour chaque fichier modifié :}
  • {file} — {fix_summary} (reviewer : @{reviewer})

Fichiers modifiés : {count}
Lignes ajoutées : {additions}, Lignes supprimées : {deletions}

Mode commit : {commit_mode_label}  (config : "{commitMode}")

Procéder ?
  O     — {commit_mode_action}
  amend — amender le dernier commit (git commit --amend)
  new   — créer un nouveau commit (fix: address review feedback)
  diff  — voir le diff complet
  n     — abandonner

(O/amend/new/diff/n)
```

## MSG_POST_FIX_VALIDATION

### en

```text
⚠️ Post-fix validation found issues:

{error output}

Options:
1. Fix the issues and re-validate
2. Proceed anyway (issues may be caught by push hooks)
3. Abort and discard changes

Choose (1/2/3):
```

### fr

```text
⚠️ La validation post-correction a trouvé des problèmes :

{sortie d'erreur}

Options :
1. Corriger les problèmes et re-valider
2. Continuer quand même (les hooks de push peuvent les attraper)
3. Abandonner et annuler les changements

Choix (1/2/3) :
```

## MSG_NO_CHANGES

### en

```text
ℹ️ No code changes were needed — all comments were either skipped or already addressed.
```

### fr

```text
ℹ️ Aucun changement de code nécessaire — tous les commentaires ont été ignorés ou déjà traités.
```

## MSG_PUSH_ERROR_MANUAL

### en

```text
❌ Cannot auto-fix this push error:

{error message}

Options:
1. Fix manually and retry
2. Skip this check (--no-verify) ⚠️
3. Abort push

Choose (1/2/3):
```

### fr

```text
❌ Impossible de corriger automatiquement cette erreur de push :

{error message}

Options :
1. Corriger manuellement et réessayer
2. Ignorer cette vérification (--no-verify) ⚠️
3. Abandonner le push

Choix (1/2/3) :
```

## MSG_PUSH_AUTO_FIX

### en

```text
❌ Push failed - {error_type} errors detected ({hook_name})

Automatic correction in progress...
  • {file}:{line} - {error_description} → Fixed

🔄 Re-committing and retrying push...

✅ Push successful after correction
```

### fr

```text
❌ Push échoué - {error_type} errors détectées ({hook_name})

Correction automatique en cours...
  • {file}:{line} - {error_description} → Corrigé

🔄 Re-commit et nouvelle tentative de push...

✅ Push réussi après correction
```

## MSG_REPLY_MINIMAL

The default. Two parts, and the line break between them is the whole shape: the commit on
its own line, then what changed in plain words on the next.

They are separated because they answer to different readers. The SHA is a pointer, read by
somebody checking the thread is closed. The description is the only part a human actually
reads, and buried behind a dash at the end of a reference line it was skimmed past. On its
own line it is the reply.

### en

```text
Resolved in {COMMIT_SHA}

{fix_summary}
```

### fr

```text
Résolu dans {COMMIT_SHA}

{fix_summary}
```

### Rendered

What this level looks like when it is respected. Every description is a sentence somebody
could read out loud, with a subject, a verb and a full stop:

```text
Résolu dans a406102

Le nom du dossier est maintenant découpé sur les deux sortes de séparateurs, donc un
chemin Windows garde bien son dernier segment.
```

```text
Resolved in f3f5a2c

The watcher now remembers that it was stopped, so re-arming it after `stop()` does
nothing instead of starting a second timer.
```

```text
Resolved in 26bb1b4

The archive date is no longer sent: it was always empty, and the API was rejecting the
whole payload because of it.
```

And the failure mode this level exists to prevent. Not length this time but SHAPE: a
description written for whoever already has the diff open.

```text
Fixed in ff0f40c — timer in a ref, cleared on unmount.
```

There is no sentence there. No subject, no verb, three nouns and a comma, and a reader who
has not opened the file learns nothing except that something moved. The same fix, written
for a person:

```text
Résolu dans ff0f40c

Le minuteur de confirmation est maintenant annulé quand le bouton disparaît de l'écran,
ce qui évite une mise à jour d'état sur un composant démonté.
```

## MSG_REPLY_NORMAL

`minimal`, plus one paragraph of `why` — **only** when the fix departs from what the
comment asked for. A departure is the one thing the reviewer cannot get from the diff:
they will read the change and wonder why it is not the change they suggested. When the fix
does what was asked, drop the third part and render `minimal`.

### en

```text
Resolved in {COMMIT_SHA}

{fix_summary}

{why_departed}
```

### fr

```text
Résolu dans {COMMIT_SHA}

{fix_summary}

{why_departed}
```

### Rendered

```text
Résolu dans 8be1a36

La table est maintenant indexée par dépôt et par chemin, au lieu du chemin seul. Deux
fichiers du même nom dans deux dépôts ne s'écrasent donc plus l'un l'autre.

Ce n'est pas la remise à zéro que vous proposiez : cette remise à zéro était elle-même
le bug, puisqu'elle vidait la table à chaque clic dans la barre latérale. Indexer rend
la collision impossible, ce qui enlève la raison de remettre à zéro.
```

## MSG_REPLY_DETAILED

A reply that reads like a person talking: the fix, why it took that shape, and what the
reviewer should know that the diff will not tell them. The description paragraph may open
with an acknowledgement. It is still capped, and the exclusions in Step 7 still apply: no
diff walkthrough, no codebase archaeology, no test counts.

### en

```text
Resolved in {COMMIT_SHA}

{acknowledgement (optional, one clause)} {fix_summary}

{why it took this shape, and anything the diff will not tell them}
```

### fr

```text
Résolu dans {COMMIT_SHA}

{remerciement (optionnel, une clause)} {fix_summary}

{pourquoi cette forme, et ce que le diff ne dira pas}
```

### Rendered

```text
Résolu dans 8be1a36

Bien vu. La table est maintenant indexée par dépôt et par chemin, donc deux fichiers
du même nom dans deux dépôts ne s'écrasent plus.

La remise à zéro que vous pointiez était la cause plutôt que le remède : elle vidait la
table à chaque clic dans la barre latérale, donc tous les fichiers passaient ensuite pour
inconnus et le filtre cessait silencieusement de filtrer. Indexer la table supprime la
collision de noms que cette remise à zéro essayait de masquer.

Un point à savoir : le filtre reste volontairement permissif. Un chemin dont l'empreinte
est inconnue garde ses commentaires, parce qu'une carte ne se signale qu'une fois sa
lecture arrivée. Traiter l'inconnu comme périmé viderait la liste de tout ce qui n'a pas
encore été affiché.
```

## MSG_REPLY_FALLBACK

### en

```markdown
### Review comments resolved in {COMMIT_SHA}

{For each resolved comment:}
- **{file}:{line}** : {fix_summary}
```

### fr

```markdown
### Commentaires de review résolus dans {COMMIT_SHA}

{Pour chaque commentaire résolu :}
- **{file}:{line}** : {fix_summary}
```

## MSG_RE_REQUEST_REVIEW

### en

```text
🔔 Re-review requested from: {reviewer1}, {reviewer2}
```

### fr

```text
🔔 Re-review demandée à : {reviewer1}, {reviewer2}
```

## MSG_SUMMARY

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Review comments resolved for {TICKET-ID}

📝 Resolved  : {count} comment(s)
⏭️  Skipped   : {count} comment(s)
📌 Branch    : {branch-name}
🔗 Commit    : {COMMIT_SHA}
🔔 Re-review : {requested from @reviewer1, @reviewer2 / skipped (autoReRequestReview: false) / failed (manual re-request needed)}

{IF_RESOLVED}
Resolved details:
  • [{file}:{line}] — {fix_summary}
{/IF_RESOLVED}

{IF_SKIPPED}
Skipped details:
  • [{file}:{line}] — {reason: file not found / code context not found / ambiguous / stale / withdrawn}
{/IF_SKIPPED}

Changes have been pushed.

{IF_RE_REQUEST_OK}
Next step:
1. Run /magic:review for a self-review of the fixes
{/IF_RE_REQUEST_OK}

{IF_RE_REQUEST_FAIL}
Next steps:
1. Request a re-review from the reviewer
2. Run /magic:review for a self-review of the fixes
{/IF_RE_REQUEST_FAIL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Commentaires de review résolus pour {TICKET-ID}

📝 Résolus   : {count} commentaire(s)
⏭️  Ignorés   : {count} commentaire(s)
📌 Branche   : {branch-name}
🔗 Commit    : {COMMIT_SHA}
🔔 Re-review : {demandée à @reviewer1, @reviewer2 / ignorée (autoReRequestReview: false) / échouée (re-request manuelle nécessaire)}

{IF_RESOLVED}
Détails des résolus :
  • [{file}:{line}] — {fix_summary}
{/IF_RESOLVED}

{IF_SKIPPED}
Détails des ignorés :
  • [{file}:{line}] — {raison : fichier introuvable / contexte introuvable / ambigu / obsolète / retiré}
{/IF_SKIPPED}

Les changements ont été pushés.

{IF_RE_REQUEST_OK}
Prochaine étape :
1. Lance /magic:review pour une auto-review des corrections
{/IF_RE_REQUEST_OK}

{IF_RE_REQUEST_FAIL}
Prochaines étapes :
1. Demande une re-review au reviewer
2. Lance /magic:review pour une auto-review des corrections
{/IF_RE_REQUEST_FAIL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_MULTI_REPO_FINAL

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Review comments resolved for {TICKET-ID} (Full-Stack)

Resolved:
  • {worktree-name}: {count} comment(s) resolved, commit {SHA}

{IF_FAILED}
Failed:
  • {worktree-name}: {error reason}
{/IF_FAILED}

All changes have been pushed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Commentaires de review résolus pour {TICKET-ID} (Full-Stack)

Résolus :
  • {worktree-name} : {count} commentaire(s) résolus, commit {SHA}

{IF_FAILED}
Échoués :
  • {worktree-name} : {raison de l'erreur}
{/IF_FAILED}

Tous les changements ont été pushés.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
