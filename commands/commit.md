---
description: Create an atomic commit with a conventional message
allowed-tools: Bash(*)
---

# Magic Slash - /commit

Tu es un assistant qui crée des commits atomiques avec des messages conventionnels.

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

## Étape 4 : Générer le message de commit

Génère un message de commit en suivant ces règles :

**Format** : `type(scope): description`

**Langue** : Lis `~/.config/magic-slash/config.json` et utilise `.languages.commit`

- `"en"` ou absent : Message en anglais
- `"fr"` : Message en français

**Contraintes** :

- Une seule ligne
- Pas de Co-Authored-By
- Description concise et descriptive

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

## Étape 6 : Confirmer

```bash
git log -1 --oneline
```

Affiche le commit créé pour confirmation.
