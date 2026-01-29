---
name: release
description: This skill should be used when the user says "release", "prepare release", "preparer la release", "nouvelle version", "new version", "bump version", or indicates they want to prepare a new version release.
argument-hint: <VERSION>
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep
---

# Magic Slash - /release

Tu es un assistant qui prepare les releases du projet Magic Slash en mettant a jour tous les fichiers contenant des references de version.

Ce skill est uniquement pour le developpement interne du projet Magic Slash, pas pour la distribution.

## Etape 1 : Obtenir et valider le numero de version

### 1.1 : Recuperer la version demandee

Si un argument est fourni (`$ARGUMENTS`), utilise-le comme nouvelle version.
Sinon, demande a l'utilisateur de fournir le numero de version.

### 1.2 : Recuperer la version actuelle

Lis le fichier `package.json` a la racine du projet :

```bash
cat package.json | jq -r '.version'
```

Stocke cette valeur comme `VERSION_ACTUELLE`.

### 1.3 : Valider le format de version

Le numero de version doit respecter le format semver : `X.Y.Z` ou X, Y et Z sont des entiers positifs.

Regex de validation : `^[0-9]+\.[0-9]+\.[0-9]+$`

**Si le format est invalide** :
- Affiche un message d'erreur
- Demande a l'utilisateur de fournir une version valide

### 1.4 : Verifier la coherence de version

Compare la nouvelle version avec la version actuelle.

**Si la nouvelle version est inferieure ou egale a la version actuelle** :

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

### 2.2 : web-ui/package.json

Mets a jour la version dans `/web-ui/package.json` :

```json
"version": "X.Y.Z"
```

Affiche une confirmation pour chaque fichier mis a jour.

## Etape 3 : Mettre a jour la documentation

### 3.1 : README.md

Mets a jour la version dans l'exemple de configuration (~ligne 204) :

```json
"version": "X.Y.Z"
```

Cherche la ligne contenant `"version":` dans le bloc de configuration JSON du README.

### 3.2 : docs/index.html

Mets a jour les 2 occurrences de version (~lignes 2402 et 2732) :

```json
"version": "X.Y.Z"
```

Ces lignes se trouvent dans les blocs `<pre>` de la documentation.

Affiche une confirmation pour chaque fichier mis a jour.

## Etape 4 : Mettre a jour le script d'installation

### 4.1 : install/install.sh

Mets a jour la version fallback a la ligne 111. Cherche la ligne contenant le fallback de version dans la commande curl/jq et remplace la valeur par defaut.

La ligne ressemble a :
```bash
CURRENT_VERSION=$(curl -s ... | jq -r '.tag_name // "v0.X.Y"' | sed 's/^v//')
```

Remplace `"v0.X.Y"` par `"v{NOUVELLE_VERSION}"`.

Affiche une confirmation.

## Etape 5 : Mettre a jour le CHANGELOG.md

### 5.1 : Creer une nouvelle section

Ajoute une nouvelle section en haut du changelog (apres l'entete), avec le format suivant :

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

-

### Changed

-

### Fixed

-
```

Utilise la date du jour au format `YYYY-MM-DD`.

### 5.2 : Ajouter le lien de release

Ajoute un nouveau lien en bas du fichier, juste apres les autres liens :

```markdown
[X.Y.Z]: https://github.com/xrequillart/magic-slash/releases/tag/vX.Y.Z
```

Assure-toi que le nouveau lien est ajoute AVANT les liens existants (le plus recent en premier dans la liste).

### 5.3 : Demander les changements

Apres avoir cree la structure de la nouvelle section, demande a l'utilisateur :

```text
La section pour la version X.Y.Z a ete creee dans CHANGELOG.md.

Voulez-vous documenter les changements maintenant ?
- Repondez 'oui' pour decrire les changements
- Repondez 'non' pour laisser les placeholders (vous pourrez les remplir plus tard)
```

Si l'utilisateur repond 'oui', demande-lui de decrire :
1. Les nouvelles fonctionnalites (Added)
2. Les modifications (Changed)
3. Les corrections (Fixed)

Et mets a jour le CHANGELOG en consequence.

## Etape 6 : Verification et resume

### 6.1 : Verifier les modifications

Affiche un resume de tous les fichiers modifies avec leur statut :

```text
Resume des modifications pour la version X.Y.Z :

  package.json                  {VERSION_ACTUELLE} -> X.Y.Z
  web-ui/package.json           {VERSION_ACTUELLE} -> X.Y.Z
  README.md                     {VERSION_ACTUELLE} -> X.Y.Z
  docs/index.html               {VERSION_ACTUELLE} -> X.Y.Z (2 occurrences)
  install/install.sh            v{VERSION_ACTUELLE} -> vX.Y.Z
  CHANGELOG.md                  Nouvelle section ajoutee
```

### 6.2 : Rappeler les etapes manuelles

```text
Prochaines etapes manuelles :

1. Verifiez les modifications :
   git diff

2. Creez le commit de release :
   git add -A && git commit -m "chore(release): bump version to X.Y.Z"

3. Creez le tag :
   git tag vX.Y.Z

4. Poussez les modifications :
   git push origin main --tags

5. Creez la release sur GitHub :
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "See CHANGELOG.md"
```

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
