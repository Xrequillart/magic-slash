# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.

## MSG_CONFIG_ERROR

### en

```text
[error] Magic Slash configuration not found. Please create the config file at: ~/.config/magic-slash/config.json. See documentation: https://github.com/magic-slash/config
```

### fr

```text
[error] Configuration Magic Slash introuvable. Veuillez creer le fichier de configuration : ~/.config/magic-slash/config.json. Voir la documentation : https://github.com/magic-slash/config
```

## MSG_NODE_NO_MANAGER

### en

```text
[warn] Node.js version file detected (.nvmrc/.node-version) but no version manager (nvm/fnm) found. Commands will use the system Node.js version.
```

### fr

```text
[warn] Fichier de version Node.js detecte (.nvmrc/.node-version) mais aucun gestionnaire de version (nvm/fnm) trouve. Les commandes utiliseront la version Node.js du systeme.
```

## MSG_SENSITIVE_FILES

### en

```text
[warn] Potentially sensitive files detected: {file_list}. These files will NOT be staged. Continue? (Ctrl+C to abort)
```

### fr

```text
[warn] Fichiers potentiellement sensibles detectes : {file_list}. Ces fichiers ne seront PAS stages. Continuer ? (Ctrl+C pour abandonner)
```

## MSG_MULTI_REPO_SUMMARY

### en

```text
Multi-repo commits detected for {TICKET-ID}. Worktrees with changes: {worktree_list}
```

### fr

```text
Commits multi-repo detectes pour {TICKET-ID}. Worktrees avec des changements : {worktree_list}
```

## MSG_ATOMIC_SPLIT

### en

```text
Multiple logical changes detected - Creating {N} atomic commits... {commit_list}
```

### fr

```text
Plusieurs changements logiques detectes - Creation de {N} commits atomiques... {commit_list}
```

## MSG_COMMIT_SUCCESS

### en

```text
Commit created: {hash_and_message}
```

### fr

```text
Commit cree : {hash_and_message}
```

## MSG_HOOK_AUTO_FIX

### en

```text
Commit failed - {error_type} errors detected. Automatic correction in progress... {fix_list}. Retrying commit...
```

### fr

```text
Commit echoue - Erreurs {error_type} detectees. Correction automatique en cours... {fix_list}. Nouvelle tentative de commit...
```

## MSG_HOOK_MANUAL_FIX

### en

```text
Cannot auto-fix this error: {error_message}. Options: 1. Fix manually and retry 2. Skip this check (--no-verify) [warn] 3. Abort commit
```

### fr

```text
Impossible de corriger automatiquement : {error_message}. Options : 1. Corriger manuellement et reessayer 2. Ignorer cette verification (--no-verify) [warn] 3. Abandonner le commit
```

## MSG_MULTI_REPO_FINAL

### en

```text
Commits created for {TICKET-ID}: {commit_list}
```

### fr

```text
Commits crees pour {TICKET-ID} : {commit_list}
```

## MSG_NOTHING_TO_COMMIT

### en

```text
No changes detected - nothing to commit.
```

### fr

```text
Aucun changement detecte - rien a committer.
```

## MSG_LARGE_DIFF

### en

```text
Large diff detected ({N} lines). Using --stat summary first for analysis.
```

### fr

```text
Diff volumineux detecte ({N} lignes). Utilisation du resume --stat pour l'analyse.
```

## MSG_PROTECTED_BRANCH_ASK

### en

```text
You are on {branch}, a main branch. Commit here, or move this work to its own branch?
```

### fr

```text
Vous etes sur {branch}, une branche principale. Committer ici, ou deplacer ce travail sur sa propre branche ?
```

## MSG_PROTECTED_BRANCH_BLOCKED

### en

```text
{branch} is a main branch and direct commits are turned off for this repository. Creating a branch first.
```

### fr

```text
{branch} est une branche principale et les commits directs sont desactives pour ce depot. Creation d'une branche.
```

## MSG_BRANCH_NAME_CONFIRM

### en

```text
Branch to create: {branch_name}. Use this name, or type another?
```

### fr

```text
Branche a creer : {branch_name}. Garder ce nom, ou en saisir un autre ?
```

## MSG_BRANCH_EXISTS

### en

```text
Branch {branch_name} already exists. Switch to it, or use another name?
```

### fr

```text
La branche {branch_name} existe deja. Basculer dessus, ou utiliser un autre nom ?
```

## MSG_BRANCH_CREATED

### en

```text
[ok] Now on {branch_name} - your changes came along, nothing was stashed.
```

### fr

```text
[ok] Maintenant sur {branch_name} - vos changements ont suivi, rien n'a ete mis de cote.
```
