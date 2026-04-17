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

Veuillez creer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

## MSG_AUDIT_START

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 DOCUMENTATION AUDIT

Scope: {scope}
Auditing docs/ pages against current codebase state...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 AUDIT DE DOCUMENTATION

Perimetre : {scope}
Verification des pages docs/ par rapport a l'etat actuel de la codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_AUDIT_REPORT

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 AUDIT REPORT

🏥 Health: {health_score}% ({ok_count} OK, {warning_count} warnings, {error_count} errors)

{findings_by_page}

{version_table}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 RAPPORT D'AUDIT

🏥 Sante : {health_score}% ({ok_count} OK, {warning_count} alertes, {error_count} erreurs)

{findings_by_page}

{version_table}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_ALL_CLEAR

### en

```text
✅ All clear! Documentation is in sync with the codebase. Ready to release.
```

### fr

```text
✅ Tout est bon ! La documentation est en phase avec la codebase. Pret pour la release.
```

## MSG_MINOR_ISSUES

### en

```text
⚠️ Minor issues detected. Some warnings to review, but nothing blocking a release.
```

### fr

```text
⚠️ Problemes mineurs detectes. Quelques alertes a verifier, mais rien de bloquant pour la release.
```

## MSG_NEEDS_ATTENTION

### en

```text
🟠 Attention needed. Several issues should be fixed before the next release.
```

### fr

```text
🟠 Attention requise. Plusieurs problemes devraient etre corriges avant la prochaine release.
```

## MSG_CRITICAL

### en

```text
🔴 Critical divergence! Documentation is significantly out of sync. Fix before release.
```

### fr

```text
🔴 Divergence critique ! La documentation est significativement desynchronisee. A corriger avant la release.
```

## MSG_NEXT_STEPS

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What would you like to do?

  1. 🔧 Fix automatically — Apply corrections where possible
  2. 📝 Create issues — One GitHub issue per error finding
  3. 📄 Export report — Save the full report to a file
  4. ✅ Done — Acknowledge and move on

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qu'est-ce que tu veux faire ?

  1. 🔧 Corriger automatiquement — Appliquer les corrections possibles
  2. 📝 Creer des issues — Une issue GitHub par erreur trouvee
  3. 📄 Exporter le rapport — Sauvegarder le rapport dans un fichier
  4. ✅ Termine — Prendre acte et passer a la suite

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_FIXES_APPLIED

### en

```text
✅ {fix_count} fix(es) applied successfully.

{fix_details}

Run /audit again to verify the remaining issues.
```

### fr

```text
✅ {fix_count} correction(s) appliquee(s) avec succes.

{fix_details}

Relance /audit pour verifier les problemes restants.
```

## MSG_DONE

### en

```text
👍 Audit complete. You can re-run /audit anytime to check again.
```

### fr

```text
👍 Audit termine. Tu peux relancer /audit a tout moment pour re-verifier.
```
