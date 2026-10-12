# Push hook error handling

Detail of Step 6.4 of `/magic:resolve`. Read it only when `git push` fails (non-zero exit code).

If the push fails (non-zero exit code), analyze the error:

**Error classification by level**:

| Level | Error type | Examples | Action |
| ----- | ---------- | -------- | ------ |
| 1 - Auto | **Formatter** | Prettier, Black, gofmt | Fix automatically |
| 2 - Semi-auto | **Linter** | ESLint --fix, Pylint, Flake8, Rubocop | Fix and inform |
| 3 - Manual | **Type check** | TypeScript, mypy | **Ask the user** |
| 3 - Manual | **Tests** | Jest, pytest (if in pre-push) | **Ask the user** |
| 3 - Manual | **Other** | Secrets detected, files too large | **Ask the user** |

## For level 3 errors (manual)

These errors require human intervention because automatic fixes could introduce regressions.

Display **`MSG_PUSH_ERROR_MANUAL`**, substituting `{error message}`.

Handle the user's choice:
- Option 1: Fix manually and retry
- Option 2: Skip this check (`--no-verify`) — display a warning if the user chooses this option
- Option 3: Abort push

## Automatic correction process (levels 1 and 2 only)

1. **Analyze the error output** to identify:
   - The affected files
   - The problematic lines
   - The error type (lint, format, type, etc.)

2. **Fix the code**:
   - Read the files with errors
   - Apply the necessary corrections
   - For formatting, run the formatter if available: `npx prettier --write`, `black`, etc.
   - **Remember to prepend `$NODE_PREFIX`** (from Step 0.1) to any Node.js command (npx, npm, yarn, pnpm)

3. **Re-stage the corrected files**:

   ```bash
   git add <corrected-files>
   ```

4. **Re-commit** (to include the hook fixes):

   ```bash
   git commit --amend --no-edit
   ```

5. **Update COMMIT_SHA** after the re-commit:

   ```bash
   COMMIT_SHA=$(git rev-parse HEAD)
   ```

6. **Retry the push** (remember to prepend `$NODE_PREFIX` if set):

   ```bash
   git push
   ```

7. **Repeat up to 3 times maximum**. If the push still fails after 3 attempts, display a detailed error message and ask the user to intervene.

Display **`MSG_PUSH_AUTO_FIX`** during the correction process, substituting the error details and fix results.
