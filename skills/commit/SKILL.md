---
name: commit
description: This skill should be used when the user says "commit", "je suis prêt à committer", "on commit", "create a commit", "faire un commit", "committer les changements", "save my changes", "enregistrer mes changements", "prêt à committer", "ready to commit", or indicates they want to save their current changes as a commit.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep
---

# Magic Slash - /commit

Tu es un assistant qui crée des commits atomiques avec des messages conventionnels.

## Étape 0 : Détecter les worktrees multi-repo

### 0.1 : Extraire l'ID du ticket depuis le worktree actuel

Récupère le nom du répertoire courant et extrait l'ID du ticket :

```bash
basename "$PWD"
```

Le nom du worktree suit le pattern `{repo-name}-{TICKET-ID}` (ex: `my-api-PROJ-123`, `my-web-PROJ-123`).

Extrait le TICKET-ID en utilisant le pattern :

- **Jira** : `[A-Z]+-\d+` (ex: `PROJ-123`, `ABC-456`)
- **GitHub** : le dernier segment numérique après le nom du repo (ex: `123` dans `my-api-123`)

Si aucun ID n'est détecté (tu es dans un repo normal, pas un worktree), passe directement à l'**Étape 1**.

### 0.2 : Lire la configuration des repos

```bash
cat ~/.config/magic-slash/config.json
```

Récupère la liste des repos configurés avec leurs chemins :

```json
{
  "repositories": {
    "api": {"path": "/path/to/api", "keywords": [...]},
    "web": {"path": "/path/to/web", "keywords": [...]}
  }
}
```

### 0.3 : Chercher les worktrees associés

Pour chaque repo configuré, vérifie si un worktree avec le même TICKET-ID existe :

```bash
ls -d {REPO_PATH}-{TICKET_ID} 2>/dev/null
```

Par exemple, si TICKET-ID = `PROJ-123` et les repos sont `/projects/api` et `/projects/web`, cherche :

- `/projects/api-PROJ-123`
- `/projects/web-PROJ-123`

Collecte tous les worktrees trouvés.

### 0.4 : Vérifier les changements dans chaque worktree

Pour chaque worktree trouvé, vérifie s'il y a des changements :

```bash
git -C {WORKTREE_PATH} status --porcelain
```

Garde uniquement les worktrees qui ont des modifications.

### 0.5 : Résumé et confirmation

Si plusieurs worktrees ont des changements, affiche un résumé :

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Commits multi-repo détectés pour {TICKET-ID}

Worktrees avec des changements :
  • /projects/api-PROJ-123 (3 fichiers modifiés)
  • /projects/web-PROJ-123 (5 fichiers modifiés)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Puis exécute les **Étapes 1 à 6** pour CHAQUE worktree ayant des changements.
Change de répertoire avant chaque cycle :

```bash
cd {WORKTREE_PATH}
```

À la fin de chaque commit, affiche une confirmation avant de passer au worktree suivant.

---

## Étape 1 : Vérifier l'état du repository

```bash
git status
```

Si aucune modification n'est détectée, informe l'utilisateur qu'il n'y a rien à commiter.

## Étape 2 : Stager les changements

```bash
git add -A
```

## Étape 3 : Analyser les modifications

```bash
git diff --cached
```

Analyse les fichiers modifiés pour comprendre la nature des changements.

## Étape 3.1 : Évaluer si un split est recommandé

Évalue si les changements stagés devraient être divisés en plusieurs commits atomiques. Un split est recommandé si :

- Les modifications concernent plusieurs fonctionnalités distinctes
- Il y a un mix de types différents (ex: `feat` + `fix` + `chore`)
- Les changements touchent des scopes/modules indépendants
- La cohésion logique des changements est faible

**Si un split est recommandé** :

1. Propose à l'utilisateur de diviser en plusieurs commits
2. Décris brièvement chaque commit proposé (type, scope, description)
3. Demande confirmation avant de procéder
4. Si l'utilisateur accepte :
   - Unstage tous les fichiers : `git reset HEAD`
   - Pour chaque commit logique :
     - Stage uniquement les fichiers concernés : `git add <fichiers>`
     - Crée le commit avec son message approprié
   - Continue jusqu'à ce que tous les changements soient commités
5. Si l'utilisateur refuse : Continue à l'étape 4 pour créer un seul commit

## Étape 4 : Générer le message de commit

Génère un message de commit en suivant ces règles :

**Format** : `type(scope): description`

**⚠️ RÈGLE ABSOLUE : Le message de commit doit tenir sur UNE SEULE LIGNE.**

- PAS de saut de ligne
- PAS de liste à puces
- PAS de description détaillée sur plusieurs lignes
- JUSTE : `type(scope): description courte`

**Langue** : Lis `~/.config/magic-slash/config.json` et utilise `.languages.commit`

- `"en"` ou absent : Message en anglais
- `"fr"` : Message en français

**Contraintes** :

- **UNE SEULE LIGNE** (jamais de multi-lignes, jamais de body)
- Pas de Co-Authored-By
- Description concise (max ~72 caractères)

**Types disponibles** :

- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation uniquement
- `style` : Formatage, points-virgules manquants, etc. (pas de changement de code)
- `refactor` : Refactoring du code (ni nouvelle fonctionnalité, ni correction de bug)
- `test` : Ajout ou modification de tests
- `chore` : Maintenance, dépendances, configuration

**Scope** : Le fichier principal ou composant modifié (ex: `auth`, `api`, `user-service`)

**Exemples** :

- `feat(auth): add JWT token refresh mechanism`
- `fix(api): handle null response from payment gateway`
- `refactor(user-service): extract validation logic`
- `chore(deps): update axios to 1.6.0`

## Étape 5 : Créer le commit

```bash
git commit -m "message généré"
```

### 5.1 : Gestion des erreurs de pre-commit hooks

Si le commit échoue (code de sortie non-zéro), analyse l'erreur :

**Erreurs courantes et actions** :

| Type d'erreur | Exemples | Action |
| ------------- | -------- | ------ |
| **Linter** | ESLint, Pylint, Flake8, Rubocop | Corrige les erreurs de lint dans les fichiers concernés |
| **Formatter** | Prettier, Black, gofmt | Applique le formatage requis |
| **Type check** | TypeScript, mypy | Corrige les erreurs de typage |
| **Tests** | Jest, pytest (si en pre-commit) | Corrige les tests cassés |
| **Autres** | Secrets détectés, fichiers trop gros | Informe l'utilisateur et demande comment procéder |

**Processus de correction automatique** :

1. **Analyse l'output d'erreur** pour identifier :
   - Les fichiers concernés
   - Les lignes problématiques
   - Le type d'erreur (lint, format, type, etc.)

2. **Corrige le code** :
   - Lis les fichiers en erreur
   - Applique les corrections nécessaires
   - Pour le formatage, lance le formatter si disponible : `npx prettier --write`, `black`, etc.

3. **Re-stage les fichiers corrigés** :

   ```bash
   git add -A
   ```

4. **Réessaie le commit** avec le même message :

   ```bash
   git commit -m "message généré"
   ```

5. **Répète jusqu'à 3 fois maximum**. Si le commit échoue toujours après 3 tentatives,
   affiche un message d'erreur détaillé et demande à l'utilisateur d'intervenir.

**Exemple de flow** :

```text
❌ Commit échoué - ESLint errors détectées

Correction automatique en cours...
  • src/auth.ts:42 - Missing semicolon → Corrigé
  • src/auth.ts:58 - Unexpected console.log → Supprimé

🔄 Nouvelle tentative de commit...

✅ Commit réussi après correction
```

## Étape 6 : Confirmer

```bash
git log -1 --oneline
```

Affiche le commit créé pour confirmation.

## Étape 7 : Résumé multi-repo (si applicable)

Si tu as commité dans plusieurs worktrees, affiche un résumé final :

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Commits créés pour {TICKET-ID}

  • api-PROJ-123 : feat(auth): add token refresh
  • web-PROJ-123 : feat(login): update UI for refresh flow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
