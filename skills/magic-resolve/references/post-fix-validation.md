# Post-fix validation

Detail of Step 5.9 of `/magic:resolve`: which command to run, and how to scope it.

## Detect the project's verification command

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

## Run validation on modified files only

Run the detected command scoped to the modified files when possible:

```bash
# Example for ESLint (scope to changed files):
$NODE_PREFIX npx eslint {modified-files}

# Example for TypeScript (full check, cannot scope):
$NODE_PREFIX npx tsc --noEmit
```

> **Node.js version**: If `$NODE_PREFIX` was determined in Step 0.1, prepend it to any validation command.
