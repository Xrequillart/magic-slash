---
name: release
description: magic-slash - This skill should be used when the user says "release", "prepare release", "preparer la release", "nouvelle version", "new version", "bump version", or indicates they want to prepare a new version release.
argument-hint: <VERSION>
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, AskUserQuestion
---

# magic-slash - /release

Tu es un assistant qui prepare les releases du projet Magic Slash en mettant a jour tous les fichiers contenant des references de version.

Ce skill est uniquement pour le developpement interne du projet Magic Slash, pas pour la distribution.

## Regle importante : interactions utilisateur

Quand tu poses une question ou demandes une confirmation a l'utilisateur, utilise toujours l'outil `AskUserQuestion` et attends sa reponse avant de continuer. Sans cela, l'utilisateur voit la question defiler et n'a pas le temps de repondre, ce qui rend le processus de release inutilisable de maniere interactive.

## Etape 1 : Obtenir et valider le numero de version

### 1.1 : Recuperer la version demandee

Si un argument est fourni (`$ARGUMENTS`), utilise-le comme nouvelle version.
Sinon, utilise `AskUserQuestion` pour demander le numero de version souhaite.

### 1.2 : Recuperer la version actuelle

Lis le fichier `package.json` a la racine du projet avec l'outil `Read` et recupere la valeur du champ `version`.

Stocke cette valeur comme `VERSION_ACTUELLE`.

### 1.3 : Valider le format de version

Le numero de version doit respecter le format semver : `X.Y.Z` ou X, Y et Z sont des entiers positifs.

Regex de validation : `^[0-9]+\.[0-9]+\.[0-9]+$`

**Si le format est invalide** :
- Utilise `AskUserQuestion` pour signaler l'erreur et demander une version valide.

### 1.4 : Verifier la coherence de version

Compare la nouvelle version avec la version actuelle.

**Si la nouvelle version est inferieure ou egale a la version actuelle** :

Utilise `AskUserQuestion` avec le message suivant :

```text
La version demandee ({NOUVELLE_VERSION}) est inferieure ou egale a la version actuelle ({VERSION_ACTUELLE}).

Voulez-vous continuer quand meme ? (oui/non)
```

Si l'utilisateur refuse, arrete le processus.

## Etape 2 : Mettre a jour les fichiers package.json

### 2.1 : package.json (racine)

Mets a jour la version dans `/package.json` :

```json
"version": "X.Y.Z"
```

### 2.2 : desktop/package.json

Mets a jour la version dans `/desktop/package.json` :

```json
"version": "X.Y.Z"
```

Affiche une confirmation pour chaque fichier mis a jour.

## Etape 3 : Mettre a jour la documentation

### 3.1 : README.md

Cherche la ligne contenant `"version":` dans le bloc de configuration JSON du README et mets-la a jour :

```json
"version": "X.Y.Z"
```

### 3.2 : docs/documentation.html

Cherche les 2 occurrences de `"version":` dans les blocs `<pre>` de la documentation et mets-les a jour :

```json
"version": "X.Y.Z"
```

Affiche une confirmation pour chaque fichier mis a jour.

## Etape 4 : Mettre a jour les skills et l'interface desktop

### 4.1 : Fichiers SKILL.md (7 fichiers)

Mets a jour le titre de version dans les 7 fichiers de skills :

- `skills/magic-start/SKILL.md`
- `skills/magic-continue/SKILL.md`
- `skills/magic-commit/SKILL.md`
- `skills/magic-pr/SKILL.md`
- `skills/magic-review/SKILL.md`
- `skills/magic-resolve/SKILL.md`
- `skills/magic-done/SKILL.md`

Dans chaque fichier, cherche le titre avec un pattern regex generique (pour eviter les desynchronisations de version) :

```regex
# magic-slash v[0-9]+\.[0-9]+\.[0-9]+ - /nom-du-skill
```

Remplace par :

```markdown
# magic-slash vX.Y.Z - /nom-du-skill
```

**IMPORTANT** : Ne cherche PAS la version actuelle (`VERSION_ACTUELLE`) dans ces fichiers. Utilise toujours le pattern regex generique ci-dessus pour trouver la ligne, car un fichier peut avoir rate une mise a jour precedente et contenir une version differente.

### 4.2 : desktop/src/renderer/components/Sidebar.tsx

Cherche la version affichee dans le footer de la sidebar en utilisant un pattern regex generique (meme approche que l'etape 4.1) :

**Pattern principal** : Cherche `v[0-9]+\.[0-9]+\.[0-9]+` dans la zone footer du fichier (pres des liens Docs/Changelog/GitHub).

**Cascade de recherche** :

1. **Regex dans le footer** : Cherche le pattern `v[0-9]+\.[0-9]+\.[0-9]+` dans les 40 dernieres lignes du fichier (zone footer). Si une seule correspondance est trouvee, remplace-la par `vX.Y.Z`.
2. **Regex globale avec contexte** : Si le pattern n'est pas trouve dans le footer, cherche dans tout le fichier. Si plusieurs correspondances existent, utilise le contexte environnant (presence de `opacity`, `Docs`, `Changelog`, ou `Footer` a proximite) pour identifier la bonne occurrence.
3. **Demande a l'utilisateur** : Si aucune correspondance n'est trouvee ou si l'ambiguite ne peut etre resolue, utilise `AskUserQuestion` pour demander :

```text
Le pattern de version (v[0-9]+.[0-9]+.[0-9]+) n'a pas ete trouve dans Sidebar.tsx, ou plusieurs occurrences ambigues existent.

Pouvez-vous indiquer la ligne ou se trouve la version a mettre a jour dans desktop/src/renderer/components/Sidebar.tsx ?
```

**IMPORTANT** : Ne cherche PAS un className exact comme `opacity-60` — le style CSS peut changer a tout moment. Utilise uniquement le pattern de version et le contexte structurel (footer).

Affiche une confirmation pour chaque fichier mis a jour.

## Etape 5 : Mettre a jour le script d'installation

### 5.1 : install/install.sh

Cherche la ligne contenant le fallback de version dans la commande curl/jq (pattern `.tag_name // "v`) et remplace la valeur par defaut.

La ligne ressemble a :
```bash
CURRENT_VERSION=$(curl -s ... | jq -r '.tag_name // "v0.X.Y"' | sed 's/^v//')
```

Remplace `"v0.X.Y"` par `"v{NOUVELLE_VERSION}"`.

Affiche une confirmation.

## Etape 6 : Mettre a jour le CHANGELOG.md

### 6.0 : Collecter les commits depuis la derniere release

Detecte le dernier tag de release :

```bash
git tag --sort=-version:refname | grep "^v[0-9]" | head -1
```

Stocke ce tag comme `LAST_TAG`. Si aucun tag n'est trouve, utilise le premier commit du depot (`git rev-list --max-parents=0 HEAD`).

Recupere tous les sujets de commits depuis le dernier tag :

```bash
git log <LAST_TAG>..HEAD --format="%s"
```

Parse chaque sujet de commit selon le format conventional commits (`type(scope): subject`) et classe-les dans les categories Keep a Changelog :

| Type(s) de commit | Categorie CHANGELOG |
|---|---|
| `feat` | **Added** |
| `fix` | **Fixed** |
| `refactor`, `chore`, `perf`, `style`, `docs`, `ci`, `build`, `test` | **Changed** |

Pour chaque entree, formate le bullet en utilisant le scope comme prefixe en gras (coherent avec le format existant du CHANGELOG) :

- Si le commit a un scope : `- **Scope**: sujet` (premiere lettre du scope en majuscule)
- Si le commit n'a pas de scope : `- sujet` (premiere lettre en majuscule)

### 6.1 : Creer une nouvelle section pre-remplie

Ajoute une nouvelle section en haut du changelog (apres l'entete), avec les entrees categorisees collectees a l'etape 6.0 :

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- **Scope**: description du feat 1
- **Scope**: description du feat 2

### Changed

- **Scope**: description du refactor/chore 1

### Fixed

- **Scope**: description du fix 1
```

Utilise la date du jour au format `YYYY-MM-DD`.

**Regles** :
- Omets les categories vides (pas de section `### Added` si aucun `feat` n'a ete trouve).
- Si aucun commit n'est trouve (cas rare), cree les 3 sections avec des placeholders `-`.

### 6.2 : Ajouter le lien de release

Ajoute un nouveau lien en bas du fichier, juste apres les autres liens :

```markdown
[X.Y.Z]: https://github.com/xrequillart/magic-slash/releases/tag/vX.Y.Z
```

Assure-toi que le nouveau lien est ajoute AVANT les liens existants (le plus recent en premier dans la liste).

### 6.3 : Presenter le CHANGELOG pour validation

Utilise `AskUserQuestion` pour presenter le CHANGELOG pre-rempli et demander validation :

```text
Voici le CHANGELOG genere a partir des commits depuis <LAST_TAG> :

## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

Voulez-vous :
- 'ok' pour valider tel quel
- 'edit' pour decrire vos modifications (ajouts, suppressions, reformulations)
- 'non' pour laisser tel quel et continuer
```

Si l'utilisateur repond 'edit', utilise `AskUserQuestion` pour lui demander de decrire ses modifications. Applique-les au CHANGELOG puis continue.

## Etape 7 : Verification et resume

### 7.1 : Verifier les modifications avec grep

**CRITIQUE** : Cette etape est obligatoire. Tu dois verifier que CHAQUE fichier contient bien la nouvelle version.

Execute la commande suivante pour verifier que tous les fichiers ont ete mis a jour :

```bash
echo "=== Verification de la version X.Y.Z ===" && \
ERRORS=0 && \
for f in package.json desktop/package.json README.md; do
  if grep -q "\"version\": \"X.Y.Z\"" "$f"; then
    echo "  OK  $f"
  else
    echo "  ERREUR  $f - version X.Y.Z NON trouvee"
    ERRORS=$((ERRORS+1))
  fi
done && \
if grep -c "\"version\": \"X.Y.Z\"" docs/documentation.html | grep -q "^2$"; then
  echo "  OK  docs/documentation.html (2 occurrences)"
else
  COUNT=$(grep -c "\"version\": \"X.Y.Z\"" docs/documentation.html 2>/dev/null || echo "0")
  echo "  ERREUR  docs/documentation.html - attendu 2 occurrences, trouve $COUNT"
  ERRORS=$((ERRORS+1))
fi && \
for f in skills/magic-start/SKILL.md skills/magic-continue/SKILL.md skills/magic-commit/SKILL.md skills/magic-pr/SKILL.md skills/magic-review/SKILL.md skills/magic-resolve/SKILL.md skills/magic-done/SKILL.md; do
  if grep -q "magic-slash vX.Y.Z" "$f"; then
    echo "  OK  $f"
  else
    echo "  ERREUR  $f - version X.Y.Z NON trouvee"
    ERRORS=$((ERRORS+1))
  fi
done && \
if grep -q "vX.Y.Z" desktop/src/renderer/components/Sidebar.tsx; then
  echo "  OK  desktop/src/renderer/components/Sidebar.tsx"
else
  echo "  ERREUR  desktop/src/renderer/components/Sidebar.tsx - version X.Y.Z NON trouvee"
  ERRORS=$((ERRORS+1))
fi && \
if grep -q "vX.Y.Z" install/install.sh; then
  echo "  OK  install/install.sh"
else
  echo "  ERREUR  install/install.sh - version X.Y.Z NON trouvee"
  ERRORS=$((ERRORS+1))
fi && \
echo "=== $ERRORS erreur(s) detectee(s) ==="
```

**Si des erreurs sont detectees** : corrige immediatement les fichiers concernes et relance la verification jusqu'a ce que toutes les verifications passent (0 erreurs).

### 7.2 : Afficher le resume

Affiche un resume de tous les fichiers modifies :

```text
Resume des modifications pour la version X.Y.Z :

  package.json                                  {VERSION_ACTUELLE} -> X.Y.Z
  desktop/package.json                          {VERSION_ACTUELLE} -> X.Y.Z
  README.md                                     {VERSION_ACTUELLE} -> X.Y.Z
  docs/documentation.html                       {VERSION_ACTUELLE} -> X.Y.Z (2 occurrences)
  skills/magic-start/SKILL.md                   v{VERSION_ACTUELLE} -> vX.Y.Z
  skills/magic-continue/SKILL.md                v{VERSION_ACTUELLE} -> vX.Y.Z
  skills/magic-commit/SKILL.md                  v{VERSION_ACTUELLE} -> vX.Y.Z
  skills/magic-pr/SKILL.md                      v{VERSION_ACTUELLE} -> vX.Y.Z
  skills/magic-review/SKILL.md                  v{VERSION_ACTUELLE} -> vX.Y.Z
  skills/magic-resolve/SKILL.md                 v{VERSION_ACTUELLE} -> vX.Y.Z
  skills/magic-done/SKILL.md                    v{VERSION_ACTUELLE} -> vX.Y.Z
  desktop/src/renderer/components/Sidebar.tsx    v{VERSION_ACTUELLE} -> vX.Y.Z
  install/install.sh                            v{VERSION_ACTUELLE} -> vX.Y.Z
  CHANGELOG.md                                  Nouvelle section ajoutee
```

### 7.3 : Commit de release (interactif)

Cette etape execute les operations git de maniere interactive via `AskUserQuestion`. Chaque operation est proposee, confirmee, puis executee.

#### 7.3.1 : Pre-vol — afficher le diff

Execute `git diff --stat` via `Bash` pour afficher un apercu de tous les fichiers modifies.

Presente le resultat et utilise `AskUserQuestion` pour proposer le commit :

```text
Voici les fichiers modifies pour la release X.Y.Z :

<resultat du git diff --stat>

Voulez-vous creer le commit de release ? (oui/non)
```

Si l'utilisateur refuse, arrete le processus de release ici.

#### 7.3.2 : Staging et commit

**IMPORTANT** : Ne fais PAS `git add -A`. Stage uniquement les fichiers specifiques que le skill a modifies pour eviter de contaminer le commit de release avec des fichiers non lies :

```bash
git add package.json desktop/package.json README.md docs/documentation.html \
  skills/magic-start/SKILL.md skills/magic-continue/SKILL.md skills/magic-commit/SKILL.md \
  skills/magic-pr/SKILL.md skills/magic-review/SKILL.md skills/magic-resolve/SKILL.md \
  skills/magic-done/SKILL.md desktop/src/renderer/components/Sidebar.tsx \
  install/install.sh CHANGELOG.md
```

Puis execute le commit :

```bash
git commit -m "chore(release): bump version to X.Y.Z"
```

**Gestion d'erreur** : Si le commit echoue (hook pre-commit par exemple), affiche l'erreur et utilise `AskUserQuestion` :

```text
Le commit a echoue avec l'erreur suivante :

<message d'erreur>

Voulez-vous :
- 'retry' pour reessayer apres correction
- 'abort' pour arreter le processus de release
```

Si l'utilisateur choisit 'retry', relance le commit. Si 'abort', arrete.

Affiche la confirmation : `Commit de release cree.`

#### 7.3.3 : Creation du tag

Utilise `AskUserQuestion` pour proposer la creation du tag :

```text
Voulez-vous creer le tag vX.Y.Z ? (oui/non)
```

Si oui, execute :

```bash
git tag vX.Y.Z
```

**Gestion d'erreur** : Si le tag existe deja, utilise `AskUserQuestion` :

```text
Le tag vX.Y.Z existe deja.

Voulez-vous :
- 'force' pour ecraser le tag existant (git tag -f vX.Y.Z)
- 'abort' pour arreter
```

Affiche la confirmation : `Tag vX.Y.Z cree.`

#### 7.3.4 : Push vers le remote

Utilise `AskUserQuestion` pour proposer le push :

```text
Voulez-vous pousser le commit et le tag vers origin ? (oui/non)

Note : le workflow CI creera automatiquement la release GitHub a partir du tag.
```

Si oui, execute :

```bash
git push origin main --tags
```

**Gestion d'erreur** : Si le push est rejete, utilise `AskUserQuestion` :

```text
Le push a ete rejete avec l'erreur suivante :

<message d'erreur>

Voulez-vous :
- 'pull' pour faire un git pull --rebase puis reessayer
- 'abort' pour arreter
```

Si 'pull', execute `git pull --rebase origin main` puis relance le push.

Affiche la confirmation : `Push effectue. Le workflow CI va creer la release GitHub automatiquement.`

## Gestion des erreurs

### Fichier non trouve

Si un fichier a mettre a jour n'est pas trouve :
- Affiche un avertissement : ` Fichier non trouve : {chemin}`
- Continue avec les autres fichiers
- Mentionne le fichier manquant dans le resume final

### Pattern non trouve

Si le pattern de version n'est pas trouve dans un fichier :
- Affiche un avertissement : ` Pattern de version non trouve dans : {chemin}`
- Continue avec les autres fichiers
- Mentionne le probleme dans le resume final

### Erreur de mise a jour

Si une mise a jour echoue :
- Affiche une erreur : ` Echec de la mise a jour de : {chemin}`
- Continue avec les autres fichiers
- Mentionne l'erreur dans le resume final
