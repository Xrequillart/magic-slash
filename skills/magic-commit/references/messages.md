# Bilingual Message Templates

This file contains all user-facing messages for the /commit skill.
Use the `discussion` language from the config to pick EN or FR.

## Config not found

- EN: `[error] Magic Slash configuration not found. Please create the config file at: ~/.config/magic-slash/config.json. See documentation: https://github.com/magic-slash/config`
- FR: `[error] Configuration Magic Slash introuvable. Veuillez creer le fichier de configuration : ~/.config/magic-slash/config.json. Voir la documentation : https://github.com/magic-slash/config`

## Node.js warnings

- EN: `[warn] Node.js version file detected (.nvmrc/.node-version) but no version manager (nvm/fnm) found. Commands will use the system Node.js version.`
- FR: `[warn] Fichier de version Node.js detecte (.nvmrc/.node-version) mais aucun gestionnaire de version (nvm/fnm) trouve. Les commandes utiliseront la version Node.js du systeme.`

## Sensitive files detected

- EN: `[warn] Potentially sensitive files detected: {file_list}. These files will NOT be staged. Continue? (Ctrl+C to abort)`
- FR: `[warn] Fichiers potentiellement sensibles detectes : {file_list}. Ces fichiers ne seront PAS stages. Continuer ? (Ctrl+C pour abandonner)`

## Multi-repo summary (before commits)

- EN: `Multi-repo commits detected for {TICKET-ID}. Worktrees with changes: {worktree_list}`
- FR: `Commits multi-repo detectes pour {TICKET-ID}. Worktrees avec des changements : {worktree_list}`

## Atomic split announcement

- EN: `Multiple logical changes detected - Creating {N} atomic commits... {commit_list}`
- FR: `Plusieurs changements logiques detectes - Creation de {N} commits atomiques... {commit_list}`

## Commit success

- EN: `Commit created: {hash_and_message}`
- FR: `Commit cree : {hash_and_message}`

## Pre-commit hook errors

### Auto-fixable (Level 1-2)

- EN: `Commit failed - {error_type} errors detected. Automatic correction in progress... {fix_list}. Retrying commit...`
- FR: `Commit echoue - Erreurs {error_type} detectees. Correction automatique en cours... {fix_list}. Nouvelle tentative de commit...`

### Manual fix required (Level 3)

- EN: `Cannot auto-fix this error: {error_message}. Options: 1. Fix manually and retry 2. Skip this check (--no-verify) [warn] 3. Abort commit`
- FR: `Impossible de corriger automatiquement : {error_message}. Options : 1. Corriger manuellement et reessayer 2. Ignorer cette verification (--no-verify) [warn] 3. Abandonner le commit`

## Multi-repo final summary

- EN: `Commits created for {TICKET-ID}: {commit_list}`
- FR: `Commits crees pour {TICKET-ID} : {commit_list}`

## Nothing to commit

- EN: `No changes detected - nothing to commit.`
- FR: `Aucun changement detecte - rien a committer.`

## Large diff warning

- EN: `Large diff detected ({N} lines). Using --stat summary first for analysis.`
- FR: `Diff volumineux detecte ({N} lignes). Utilisation du resume --stat pour l'analyse.`
