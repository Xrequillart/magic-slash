# Pre-push validation and push hook errors

Detailed procedures for Step 2.1 (detect the verification command), Step 3 (the push commands) and
Step 3.1 (push hook error handling) of `/magic:pr`.

## Step 2.1: Detect the project's verification command

Detect the appropriate validation command for the project:

1. Check `package.json` scripts for common verification commands:
   - `"lint"` → `npm run lint` (or yarn/pnpm equivalent)
   - `"typecheck"` or `"type-check"` → `npm run typecheck`
   - `"check"` → `npm run check`
2. For non-Node.js projects, detect common tools:
   - Python: `mypy`, `ruff check`, `flake8`
   - Go: `go vet ./...`
   - Rust: `cargo check`
3. If no verification command is found, skip this step

## Step 3: Push commands

```bash
# If $NODE_PREFIX is set (e.g. nvm):
source ~/.nvm/nvm.sh && nvm use && git push -u origin <branch-name>

# If $NODE_PREFIX is empty:
git push -u origin <branch-name>
```

## Step 3.1: Push hook error handling

If the push fails (non-zero exit code), analyze the error:

**Error classification by level**:

| Level          | Error type    | Examples                               | Action              |
| -------------- | ------------- | -------------------------------------- | ------------------- |
| 1 - Auto       | **Formatter** | Prettier, Black, gofmt                 | Fix automatically   |
| 2 - Semi-auto  | **Linter**    | ESLint --fix, Pylint, Flake8, Rubocop  | Fix and inform      |
| 3 - Manual     | **Type check**| TypeScript, mypy                       | **Ask the user**    |
| 3 - Manual     | **Tests**     | Jest, pytest (if in pre-push)          | **Ask the user**    |
| 3 - Manual     | **Other**     | Secrets detected, files too large      | **Ask the user**    |

#### For level 3 errors (manual)

These errors require human intervention because automatic fixes could introduce regressions.

Use `AskUserQuestion` with the text from **`MSG_PUSH_ERROR_MANUAL`** (substituting `{error message}`). Options:
1. Fix manually and retry
2. Skip this check (`--no-verify`) — warn the user if they choose this
3. Abort push

#### Automatic correction process (levels 1 and 2 only)

1. **Analyze the error output** to identify:
   - The affected files
   - The problematic lines
   - The error type (lint, format, type, etc.)

2. **Fix the code**:
   - Read the files with errors
   - Apply the necessary corrections
   - For formatting, run the formatter if available: `npx prettier --write`, `black`, etc.
   - **Remember to prepend `$NODE_PREFIX`** (from Step 0.6) to any Node.js command (npx, npm, yarn, pnpm)

3. **Re-stage and commit the corrected files**:

   ```bash
   git add <corrected-files>
   git commit --amend --no-edit
   ```

4. **Retry the push** (remember to prepend `$NODE_PREFIX` if set):

   ```bash
   git push -u origin <branch-name>
   ```

5. **Repeat up to 3 times maximum**. If the push still fails after 3 attempts,
   display a detailed error message and ask the user to intervene.

Display **`MSG_PUSH_AUTO_FIX`** during the correction process, substituting the error details and fix results.
