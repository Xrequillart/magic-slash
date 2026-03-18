# Node.js Version Detection

Before executing any command that depends on Node.js (dependency install with npm/yarn/pnpm/bun), detect if the current worktree requires a specific Node.js version.

For multi-repo setups, re-execute this detection each time you switch to a different worktree, as each repo may require a different Node.js version.

## 1. Detect the version file and version manager

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

## 2. Store the activation prefix

Based on the detection result, store the activation prefix as `$NODE_PREFIX`:

| Result | `$NODE_PREFIX` | Notes |
| ------ | -------------- | ----- |
| `NVM` | `source ~/.nvm/nvm.sh && nvm use &&` | Activates nvm and switches to the version in `.nvmrc` |
| `FNM` | `eval "$(fnm env)" && fnm use &&` | Activates fnm and switches to the version in `.node-version` |
| `VOLTA` | *(empty)* | Volta uses shims, no activation needed |
| `NONE` | *(empty)* | No version file found, use system Node |
| `NO_MANAGER` | *(empty)* | Display warning (see below) |

## 3. Warning if no manager found

If a `.nvmrc` or `.node-version` file exists but no version manager is detected (`NO_MANAGER`), display `MSG_NODE_NO_MANAGER` from `references/messages.md`.

## Usage

For all subsequent bash commands that depend on Node.js, prepend `$NODE_PREFIX`:

```bash
# Instead of:
npm install

# Use (if $NODE_PREFIX is set):
source ~/.nvm/nvm.sh && nvm use && npm install
```

If `$NODE_PREFIX` is empty, run commands normally without any prefix.
