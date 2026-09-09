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

The default. One line: the commit, and what changed. Nothing about how, nothing about why.

### en

```text
Addressed in {COMMIT_SHA} — {fix_summary}
```

### fr

```text
Traité dans {COMMIT_SHA} — {fix_summary}
```

### Rendered

What this level looks like when it is respected — real replies, 149 to 382 characters:

```text
Addressed in a406102 — folder name is now split on `/[\\/]/` so Windows paths keep their last segment.
Addressed in f3f5a2c — added a `stopped` flag; `arm()` now no-ops after `stop()`.
Addressed in 26bb1b4 — dropped the always-`undefined` `archivedAt` push.
```

And the failure mode this level exists to prevent — the same fix, written the way it comes out when nothing caps it:

```text
Fixed in ff0f40c. The timer now lives in a ref and is cleared on unmount.

Worth recording why the earlier reasoning for skipping this — not a leak in React 18,
and the five other hand-rolled copy buttons here have no cleanup either — does not
hold at this call site. Unmount inside the two-second window is not an edge case
here, it is ordinary use: the panel closes itself when the count reaches zero, Send
closes the drawer, and deleting the last comment unmounts the bar entirely. [...]
```

Every sentence after the first is either the diff restated, an alternative that was
rejected, or an argument with a decision nobody asked about. At this level the first
sentence *is* the reply:

```text
Fixed in ff0f40c — the timer lives in a ref and is cleared on unmount.
```

## MSG_REPLY_NORMAL

The `minimal` line, plus one sentence of `why` — **only** when the fix departs from what
the comment asked for. A departure is the one thing the reviewer cannot get from the
diff: they will read the change and wonder why it is not the change they suggested.
When the fix does what was asked, drop the second line and render `minimal`.

### en

```text
Addressed in {COMMIT_SHA} — {fix_summary}

{why_departed}
```

### fr

```text
Traité dans {COMMIT_SHA} — {fix_summary}

{why_departed}
```

### Rendered

```text
Addressed in 8be1a36 — the map is now keyed by repository + path.

Not the reset you suggested: the reset was itself the bug, since it emptied the map
on every sidebar click. Keying it makes the collision impossible instead.
```

## MSG_REPLY_DETAILED

A reply that reads like a person talking: the fix, why it took that shape, and what the
reviewer should know that the diff will not tell them. It may open with an
acknowledgement. It is still capped — 3 short paragraphs, 1200 characters — and the
exclusions in Step 7 still apply: no diff walkthrough, no codebase archaeology, no test
counts.

### en

```text
{acknowledgement (optional, one clause)} Addressed in {COMMIT_SHA} — {fix_summary}

{why it took this shape, and anything the diff will not tell them}
```

### fr

```text
{remerciement (optionnel, une clause)} Traité dans {COMMIT_SHA} — {fix_summary}

{pourquoi cette forme, et ce que le diff ne dira pas}
```

### Rendered

```text
Good catch — addressed in 8be1a36 by keying the map on repository + path.

The reset you pointed at was the actual cause rather than the cure: it emptied the map
on every sidebar click, so every file then read as unknown and the filter quietly
stopped filtering. Keying the map removes the name collision that the reset was there
to paper over, which removes the reason to reset at all.

One thing worth knowing: the filter stays deliberately non-strict. A path with no known
fingerprint keeps its comments, because a card reports only once its read lands —
treating unknown as superseded would empty the list of everything not yet scrolled past.
```

## MSG_REPLY_FALLBACK

### en

```markdown
### Review comments addressed in {COMMIT_SHA}

The following review comments have been resolved:

{For each resolved comment:}
- **{file}:{line}** — {fix_summary}
```

### fr

```markdown
### Commentaires de review traités dans {COMMIT_SHA}

Les commentaires de review suivants ont été résolus :

{Pour chaque commentaire résolu :}
- **{file}:{line}** — {fix_summary}
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
