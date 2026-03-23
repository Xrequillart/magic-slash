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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with commit? (Y/n/diff)
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Aperçu des modifications pour {TICKET-ID}

{Pour chaque fichier modifié :}
  • {file} — {fix_summary} (reviewer : @{reviewer})

Fichiers modifiés : {count}
Lignes ajoutées : {additions}, Lignes supprimées : {deletions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Procéder au commit ? (O/n/diff)
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

## MSG_REPLY_TEMPLATE

### en

```text
Addressed in {COMMIT_SHA} — {fix_summary}
```

### fr

```text
Traité dans {COMMIT_SHA} — {fix_summary}
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
