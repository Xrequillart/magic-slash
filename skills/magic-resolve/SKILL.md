---
name: magic-resolve
description: This skill should be used when the user says "resolve", "résoudre", "fix review comments", "corriger les commentaires", "address feedback", "traiter les retours", "fix the review", "corriger la review", "apply review changes", "appliquer les corrections", or indicates they want to address code review feedback on a pull request.
argument-hint: <TICKET-ID> (optional)
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.17.5 - /resolve

> **IMPORTANT**: You MUST follow EACH step of this skill in order. Do not skip any step and do not take shortcuts. Each step is essential for the proper functioning of the workflow.
>
> **NOTE**: This skill modifies files to address review comments, then commits and force-pushes the changes.

You are an assistant that addresses code review feedback by fixing the requested changes, amending the relevant commits, and force-pushing the result.

## Configuration

Read `~/.config/magic-slash/config.json` and determine the parameters based on the current repo:

1. Identify the current repo by comparing `$PWD` with the paths in `.repositories`
2. For each parameter, check the repo config
3. If no value is defined, use the default value

### Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------ |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"` |

## Step 0: Check configuration and detect Node.js version

### 0.0: Check configuration

Before starting, verify that the Magic Slash configuration exists:

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
if [ ! -f "$CONFIG_FILE" ]; then
  # Display error based on system language
fi
```

#### If the config does not exist

##### In English
```text
❌ Magic Slash configuration not found

Please create the config file at:
  ~/.config/magic-slash/config.json

See documentation: https://github.com/magic-slash/config
```

##### In French
```text
❌ Configuration Magic Slash introuvable

Veuillez créer le fichier de configuration :
  ~/.config/magic-slash/config.json

Voir la documentation : https://github.com/magic-slash/config
```

### 0.1: Detect and activate Node.js version

Before executing any command that depends on Node.js (git push with pre-push hooks), detect if the current worktree requires a specific Node.js version.

```bash
if [ -f ".nvmrc" ] || [ -f ".node-version" ]; then
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    echo "NVM"
  elif [ -d "$HOME/.local/share/fnm" ] || [ -d "$HOME/.fnm" ]; then
    echo "FNM"
  else
    echo "NO_MANAGER"
  fi
elif [ -f "package.json" ] && grep -q '"volta"' package.json 2>/dev/null; then
  echo "VOLTA"
else
  echo "NONE"
fi
```

Store the activation prefix as `$NODE_PREFIX`:

| Result | `$NODE_PREFIX` |
| ------ | -------------- |
| `NVM` | `source ~/.nvm/nvm.sh && nvm use &&` |
| `FNM` | `eval "$(fnm env)" && fnm use &&` |
| `VOLTA` | *(empty)* |
| `NONE` | *(empty)* |
| `NO_MANAGER` | *(empty)* + display warning |

## Step 1: Detect the ticket and worktree

If an argument is provided (e.g., `/magic-resolve PROJ-123`), use it as the ticket ID.

Otherwise, extract the ticket ID from the current worktree:

```bash
basename "$PWD"
```

The worktree name follows the pattern `{repo-name}-{TICKET-ID}` (e.g.: `my-api-PROJ-123`).

Extract the TICKET-ID using the pattern:

- **Jira**: `[A-Z]+-\d+` (e.g.: `PROJ-123`, `ABC-456`)
- **GitHub**: the last numeric segment after the repo name (e.g.: `123` in `my-api-123`)

If no ticket ID is found, ask the user which PR to resolve.

## Step 2: Find the associated PR

Use `mcp__github__list_pull_requests` to find the PR associated with this ticket.

Search strategy:
1. Get the current branch name: `git branch --show-current`
2. Search for open PRs matching the current branch (head parameter)
3. If no match, search for PRs whose title contains the ticket ID
4. If still no match, ask the user for the PR number

## Step 3: Retrieve review comments

Gather all unresolved review comments:

1. Use `mcp__github__get_pull_request_reviews` to get all reviews
2. Use `mcp__github__get_pull_request_comments` to get inline review comments
3. Filter to keep only unresolved/pending comments that request changes

## Step 4: Display summary and ask for confirmation

Display a summary of the review comments based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Review comments to resolve for {TICKET-ID}

{For each comment:}
  {index}. [{file}:{line}] {comment summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resolve all comments? (Y/n/select specific numbers)
```

### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Commentaires de review à résoudre pour {TICKET-ID}

{Pour chaque commentaire :}
  {index}. [{file}:{line}] {résumé du commentaire}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Résoudre tous les commentaires ? (O/n/sélectionner des numéros)
```

## Step 5: Apply fixes for each comment

For each selected comment:

1. **Read the file** using `Read` to understand the current code and surrounding context
2. **Understand the feedback**: Analyze what the reviewer is asking for
3. **Apply the correction** using `Edit` to make the necessary changes
4. **Verify the fix** by reading the file again to ensure correctness

If a comment is unclear or ambiguous, skip it and note it in the summary.

## Step 6: Commit and force push

After all fixes are applied:

### 6.1: Stage the modified files

```bash
git add <modified-files>
```

### 6.2: Amend the commit or create a fixup

Identify the commit(s) concerned by each change:

```bash
git log --oneline
```

- **If a single commit**: Amend it directly:
  ```bash
  git commit --amend --no-edit
  ```

- **If multiple commits are concerned**: Use fixup workflow:
  ```bash
  # For each commit that needs fixing:
  git commit --fixup=<commit-hash>
  ```
  Then rebase:
  ```bash
  GIT_SEQUENCE_EDITOR=: git rebase --autosquash <base-branch>
  ```
  **If the rebase fails** (conflicts or other errors):
  ```bash
  git rebase --abort
  ```
  Fall back to a simple new commit instead:
  ```bash
  git add <modified-files>
  git commit -m "fix: address review comments"
  ```
  Inform the user that the history could not be rewritten cleanly and a new commit was created instead.

### 6.3: Force push

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.1, prepend it to the push command.

```bash
# Use --force-with-lease to avoid overwriting remote changes
git push --force-with-lease
```

## Step 7: (Optional) Reply to comments on GitHub

For each resolved comment, optionally reply on GitHub using `mcp__github__add_issue_comment` or the review comments API to indicate the fix has been applied.

## Step 8: Update Magic Slash metadata

Update the status to indicate fixes have been pushed:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&status=PR%20created" > /dev/null 2>&1 || true
```

Status goes back to `PR created` (fixes pushed, awaiting re-review).

## Step 9: Summary

Display a summary of the resolved comments based on `.languages.discussion`:

### In English (discussion: "en" or absent)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Review comments resolved for {TICKET-ID}

📝 Resolved  : {count} comment(s)
⏭️  Skipped   : {count} comment(s)
📌 Branch    : {branch-name}

Changes have been force-pushed.

Next steps:
1. Request a re-review from the reviewer
2. Run /magic-review for a self-review of the fixes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### In French (discussion: "fr")

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Commentaires de review résolus pour {TICKET-ID}

📝 Résolus   : {count} commentaire(s)
⏭️  Ignorés   : {count} commentaire(s)
📌 Branche   : {branch-name}

Les changements ont été force-pushés.

Prochaines étapes :
1. Demande une re-review au reviewer
2. Lance /magic-review pour une auto-review des corrections

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
