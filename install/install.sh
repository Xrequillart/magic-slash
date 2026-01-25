#!/bin/bash
# Magic Slash - Installation script
# Usage: curl -fsSL https://magic-slash.io/install.sh | bash

set -e

# ============================================
# COLORS AND HELPERS
# ============================================
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

hide_cursor() { printf '\033[?25l'; }
show_cursor() { printf '\033[?25h'; }

cleanup() {
  show_cursor
  echo ""
}
trap cleanup EXIT INT TERM

# Arrow key selection menu
# Usage: select_option "Option1" "Option2" ...
# Returns: selected index (0-based) in SELECT_RESULT
select_option() {
  local options=("$@")
  local selected=0
  local count=${#options[@]}

  hide_cursor

  # Save cursor position
  printf '\033[s'

  while true; do
    # Restore cursor position
    printf '\033[u'

    # Display options
    for i in "${!options[@]}"; do
      if [ $i -eq $selected ]; then
        echo -e "   ${GREEN}→ ${BOLD}${options[$i]}${NC}   "
      else
        echo -e "     ${DIM}${options[$i]}${NC}   "
      fi
    done

    echo -e "\n   ${DIM}Use ↑/↓ to navigate, Enter to select${NC}   "

    # Read key
    local key
    read -rsn1 key < /dev/tty

    if [[ $key == $'\x1b' ]]; then
      read -rsn2 key < /dev/tty
      case $key in
        '[A') # Up
          ((selected--))
          [ $selected -lt 0 ] && selected=$((count - 1))
          ;;
        '[B') # Down
          ((selected++))
          [ $selected -ge $count ] && selected=0
          ;;
      esac
    elif [[ $key == '' ]]; then # Enter
      break
    fi
  done

  show_cursor
  SELECT_RESULT=$selected
}

# Logo color
PURPLE='\033[0;35m'

print_logo() {
  echo ""
  echo -e "   ${BOLD}                    _        ${NC}"
  echo -e "   ${BOLD} _ __ ___   __ _  __ _(_) ___  ${NC}"
  echo -e "   ${BOLD}| '_ \` _ \\ / _\` |/ _\` | |/ __| ${NC}"
  echo -e "   ${BOLD}| | | | | | (_| | (_| | | (__  ${NC}"
  echo -e "   ${BOLD}|_| |_| |_|\\__,_|\\__, |_|\\___| ${NC}"
  echo -e "   ${PURPLE}    __${NC}${BOLD}           |___/      ${NC}"
  echo -e "   ${PURPLE}   / /${NC}${BOLD}__| | __ _ ___| |__   ${NC}"
  echo -e "   ${PURPLE}  / /${NC}${BOLD}/ __| |/ _\` / __| '_ \\  ${NC}"
  echo -e "   ${PURPLE} / /${NC}${BOLD}\\__ \\ | (_| \\__ \\ | | | ${NC}"
  echo -e "   ${PURPLE}/_/ ${NC}${BOLD}|___/_|\\__,_|___/_| |_| ${NC}"
  echo ""
}

print_logo
echo "  Installing /start, /commit and /done commands"
echo ""

# ============================================
# VERSION CHECK
# ============================================

# Get current version from package.json or use default
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../package.json" ]; then
  CURRENT_VERSION=$(jq -r '.version' "$SCRIPT_DIR/../package.json")
else
  CURRENT_VERSION="0.4.0"
fi

CONFIG_DIR="$HOME/.config/magic-slash"
CONFIG_FILE="$CONFIG_DIR/config.json"

# Check if already installed
if [ -f "$CONFIG_FILE" ]; then
  INSTALLED_VERSION=$(jq -r '.version // "unknown"' "$CONFIG_FILE" 2>/dev/null)

  if [ "$INSTALLED_VERSION" != "unknown" ] && [ "$INSTALLED_VERSION" != "null" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ "$INSTALLED_VERSION" = "$CURRENT_VERSION" ]; then
      echo -e "   ${GREEN}✅ Magic Slash v$INSTALLED_VERSION is already installed and up to date!${NC}"
      echo ""
      echo -e "   ${DIM}What would you like to do?${NC}"
      echo ""

      select_option "Reconfigure (GitHub auth, repositories...)" "Cancel"

      if [ $SELECT_RESULT -eq 1 ]; then
        echo ""
        echo -e "   ${DIM}Installation cancelled. You're all set!${NC}"
        echo ""
        exit 0
      fi
    else
      echo -e "   📦 Magic Slash ${CYAN}v$INSTALLED_VERSION${NC} is installed"
      echo -e "   🆕 New version available: ${GREEN}v$CURRENT_VERSION${NC}"
      echo ""
      echo -e "   ${DIM}What would you like to do?${NC}"
      echo ""

      select_option "Update to v$CURRENT_VERSION" "Keep v$INSTALLED_VERSION"

      if [ $SELECT_RESULT -eq 1 ]; then
        echo ""
        echo -e "   ${DIM}Update cancelled. Keeping v$INSTALLED_VERSION${NC}"
        echo ""
        exit 0
      fi
    fi
    echo ""
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# 1. PREREQUISITES CHECK
# ============================================
echo "1. Checking prerequisites..."
echo ""

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "   ❌ $1 is not installed"
    return 1
  else
    echo "   ✓ $1"
    return 0
  fi
}

MISSING=false

check_command "claude" || MISSING=true
check_command "node" || MISSING=true
check_command "git" || MISSING=true
check_command "jq" || MISSING=true

echo ""

if [ "$MISSING" = true ]; then
  echo "❌ Some prerequisites are missing. Please install them before continuing."
  echo ""
  echo "   • Claude Code : https://claude.ai/download"
  echo "   • Node.js     : https://nodejs.org"
  echo "   • Git         : https://git-scm.com"
  echo "   • jq          : brew install jq (macOS) / apt install jq (Linux)"
  echo ""
  exit 1
fi

echo "✅ All prerequisites are installed"
echo ""

# ============================================
# 2. MCP ATLASSIAN CONFIGURATION (JIRA + CONFLUENCE)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "2. MCP Atlassian configuration (Jira + Confluence)"
echo ""

CLAUDE_CONFIG="$HOME/.claude.json"

# Check if MCP Atlassian is already configured
SKIP_JIRA=false
if [ -f "$CLAUDE_CONFIG" ] && jq -e '.mcpServers.atlassian' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
  echo "   MCP Atlassian already configured (OAuth)"
  echo ""
  read -p "   Reconfigure? (y/N) " RECONFIG < /dev/tty
  [ "$RECONFIG" != "y" ] && SKIP_JIRA=true
  echo ""
fi

if [ "$SKIP_JIRA" = false ]; then
  echo "   This MCP uses the official Atlassian server with OAuth."
  echo "   → No API Token needed!"
  echo "   → Authentication will happen in your browser on first use."
  echo ""
  echo "   Prerequisites:"
  echo "   • An Atlassian Cloud site (Jira and/or Confluence)"
  echo "   • Being logged into your Atlassian account in your browser"
  echo ""
  read -p "   Continue installation? (Y/n) " CONTINUE_JIRA < /dev/tty

  if [ "$CONTINUE_JIRA" = "n" ] || [ "$CONTINUE_JIRA" = "N" ]; then
    echo "   ⏭️  MCP Atlassian configuration skipped"
  else
    # Add MCP Atlassian via claude mcp add (HTTP server with OAuth)
    claude mcp add atlassian \
      --scope user \
      --transport http \
      https://mcp.atlassian.com/v1/mcp

    echo "   ✅ MCP Atlassian configured"
    echo ""
    echo "   ℹ️  On first use, an OAuth window will open in your browser"
    echo "      to authorize Claude to access your Atlassian workspace."
  fi
else
  echo "   ✅ MCP Atlassian kept"
fi

echo ""

# ============================================
# 3. MCP GITHUB CONFIGURATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. MCP GitHub configuration (required for /done)"
echo ""

SKIP_GITHUB=false
if [ -f "$CLAUDE_CONFIG" ] && jq -e '.mcpServers.github' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
  echo "   MCP GitHub already configured"
  echo ""
  read -p "   Reconfigure? (y/N) " RECONFIG_GH < /dev/tty
  [ "$RECONFIG_GH" != "y" ] && SKIP_GITHUB=true
  echo ""
fi

if [ "$SKIP_GITHUB" = false ]; then
  echo "   To get your GitHub Personal Access Token:"
  echo "   → https://github.com/settings/tokens"
  echo "   (Required permissions: repo, read:org)"
  echo ""

  read -sp "   GitHub Personal Access Token: " GITHUB_TOKEN < /dev/tty
  echo ""
  echo ""

  # Add MCP GitHub via claude mcp add
  claude mcp add github \
    --scope user \
    -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
    -- npx -y @modelcontextprotocol/server-github

  echo "   ✅ MCP GitHub configured"
else
  echo "   ✅ MCP GitHub kept"
fi

echo ""

# ============================================
# 4. REPOSITORIES CONFIGURATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4. Repositories configuration"
echo ""

# Check if already configured
SKIP_REPOS=false
if [ -f "$CONFIG_FILE" ]; then
  BACKEND=$(jq -r '.repositories.backend // "not configured"' "$CONFIG_FILE")
  FRONTEND=$(jq -r '.repositories.frontend // "not configured"' "$CONFIG_FILE")

  echo "   Repositories already configured:"
  echo "   • Backend  : $BACKEND"
  echo "   • Frontend : $FRONTEND"
  echo ""
  read -p "   Reconfigure? (y/N) " RECONFIG_REPOS < /dev/tty
  [ "$RECONFIG_REPOS" != "y" ] && SKIP_REPOS=true
  echo ""
fi

if [ "$SKIP_REPOS" = false ]; then
  read -p "   BACKEND repo path (e.g.: ~/projects/my-api): " BACKEND_PATH < /dev/tty
  read -p "   FRONTEND repo path (e.g.: ~/projects/my-app): " FRONTEND_PATH < /dev/tty
  echo ""

  # Expand ~
  BACKEND_PATH="${BACKEND_PATH/#\~/$HOME}"
  FRONTEND_PATH="${FRONTEND_PATH/#\~/$HOME}"

  # Check that paths exist
  if [ ! -d "$BACKEND_PATH" ]; then
    echo "   ⚠️  Backend directory does not exist: $BACKEND_PATH"
    read -p "   Continue anyway? (y/N) " CONTINUE < /dev/tty
    [ "$CONTINUE" != "y" ] && exit 1
  fi

  if [ ! -d "$FRONTEND_PATH" ]; then
    echo "   ⚠️  Frontend directory does not exist: $FRONTEND_PATH"
    read -p "   Continue anyway? (y/N) " CONTINUE < /dev/tty
    [ "$CONTINUE" != "y" ] && exit 1
  fi

  # Check that they are git repos
  if [ ! -d "$BACKEND_PATH/.git" ]; then
    echo "   ⚠️  $BACKEND_PATH is not a git repo"
    read -p "   Continue anyway? (y/N) " CONTINUE < /dev/tty
    [ "$CONTINUE" != "y" ] && exit 1
  fi

  if [ ! -d "$FRONTEND_PATH/.git" ]; then
    echo "   ⚠️  $FRONTEND_PATH is not a git repo"
    read -p "   Continue anyway? (y/N) " CONTINUE < /dev/tty
    [ "$CONTINUE" != "y" ] && exit 1
  fi

  # Create config file
  mkdir -p "$CONFIG_DIR"
  cat > "$CONFIG_FILE" <<EOF
{
  "version": "$CURRENT_VERSION",
  "repositories": {
    "backend": "$BACKEND_PATH",
    "frontend": "$FRONTEND_PATH"
  }
}
EOF

  echo "   ✅ Repositories configured"
else
  # Update version in existing config file
  TMP_FILE=$(mktemp)
  jq --arg version "$CURRENT_VERSION" '.version = $version' "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"
  echo "   ✅ Repositories kept"
fi

echo ""

# ============================================
# 5. SLASH COMMANDS INSTALLATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "5. Installing /start, /commit and /done commands"
echo ""

COMMANDS_DIR="$HOME/.claude/commands"
mkdir -p "$COMMANDS_DIR"

# --- /start installation ---
START_CMD="$COMMANDS_DIR/start.md"
SKIP_START=false

if [ -f "$START_CMD" ]; then
  echo "   ⚠️  The /start command already exists"
  read -p "   Overwrite? (y/N) " OVERWRITE < /dev/tty
  if [ "$OVERWRITE" != "y" ]; then
    echo "   ✅ /start command kept"
    SKIP_START=true
  else
    cp "$START_CMD" "$START_CMD.backup.$(date +%s)"
  fi
  echo ""
fi

if [ "$SKIP_START" != true ]; then
  cat > "$START_CMD" << 'SLASH_CMD'
---
description: Start a task from a Jira ticket or GitHub issue
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), mcp__atlassian__*, mcp__github__*
---

# Magic Slash - /start

You are an assistant that helps start a development task from a Jira ticket or GitHub issue.

## Step 1: Detect ticket type

Analyze the provided argument: `$ARGUMENTS`

- **Jira format**: Contains an alphabetic prefix followed by a hyphen and digits (e.g., `PROJ-123`, `ABC-456`)
  - Regex: `^[A-Z]+-\d+$`
  - → Go to **Step 2A** (Jira)

- **GitHub format**: A simple number, with or without `#` (e.g., `123`, `#456`)
  - Regex: `^#?\d+$`
  - → Go to **Step 2B** (GitHub)

If format is not recognized, ask the user to clarify.

## Step 2A: Retrieve Jira ticket

Use the MCP Atlassian tool `mcp__atlassian__getJiraIssue` to retrieve ticket details.

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to get it.

→ Continue to **Step 3**.

## Step 2B: Retrieve GitHub issue

### 2B.1: Read repository configuration

```bash
cat ~/.config/magic-slash/config.json
```

Get the paths of configured repos (backend and frontend).

### 2B.2: Identify GitHub repositories

For each configured repo, get the owner and repo name:

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse the URL to extract `owner/repo` (possible formats: `git@github.com:owner/repo.git` or `https://github.com/owner/repo.git`).

### 2B.3: Search for issue in each repo

For each identified repo, use `mcp__github__get_issue` to check if the issue exists:

- `owner`: The repository owner
- `repo`: The repository name
- `issue_number`: The issue number (without `#`)

Collect all found issues.

### 2B.4: Resolution

- **No issue found**: Inform the user that no issue with this number exists in configured repos.

- **Single issue found**: Use this issue and continue.

- **Multiple issues found**: Display options and ask the user to choose:
  ```
  Multiple issues #123 found:

  1. owner1/repo-backend : "Backend issue title"
  2. owner2/repo-frontend : "Frontend issue title"

  Which one do you want to use?
  ```

→ Continue to **Step 3**.

## Step 3: Analyze ticket scope

Determine the ticket scope (BACK, FRONT, or BOTH) by analyzing:

**For Jira:**
- **Labels**: "backend", "frontend", "fullstack", "api", "ui"...
- **Jira Components**: if defined in the project

**For GitHub:**
- **Labels**: "backend", "frontend", "fullstack", "api", "ui"...
- **Assignees** and **Milestone** can provide hints

**For both:**
- **Keywords in title/description**:
  - BACK: API, endpoint, database, migration, service, controller, model, query
  - FRONT: component, UI, style, CSS, page, form, button, view, screen

If no clear indication, ask the user: "Does this ticket concern BACKEND, FRONTEND, or BOTH?"

**GitHub special case**: If the issue was found in only one repo during step 2B, the scope is automatically determined by that repo (BACK if backend, FRONT if frontend).

## Step 4: Read configuration

If not already done in step 2B, read the configuration file to get repo paths:

```bash
cat ~/.config/magic-slash/config.json
```

## Step 5: Create worktrees

For each relevant repo (based on step 3 analysis):

1. Go to the repo directory
2. Get the repo folder name
3. Fetch latest changes
4. Create the worktree AT THE SAME LEVEL as the main repo

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
git fetch origin
git worktree add -b feature/$TICKET_ID ../${REPO_NAME}-$TICKET_ID origin/main
```

**Branch naming note**:
- For Jira: use the ID as-is (e.g., `feature/PROJ-1234`)
- For GitHub: prefix with repo name to avoid conflicts (e.g., `feature/repo-name-123`)

Example: If the repo is `/projects/my-api`, the worktree will be `/projects/my-api-PROJ-1234` (Jira) or `/projects/my-api-123` (GitHub)

## Step 6: Summary and agent context

Once worktrees are created, display a summary:

- Source: Jira or GitHub (owner/repo)
- Ticket: [ID] - [Title]
- Type: [Bug/Feature/Task...] (Jira) or Labels (GitHub)
- Scope: [BACK/FRONT/BOTH]
- Worktree(s) created: [paths]

Then generate a contextual prompt to start working on the task, based on:
- The ticket/issue description
- The acceptance criteria (if present)
- The expected type of modification
SLASH_CMD

  echo "   ✅ /start command installed"
fi

# --- /commit installation ---
COMMIT_CMD="$COMMANDS_DIR/commit.md"
SKIP_COMMIT=false

if [ -f "$COMMIT_CMD" ]; then
  echo "   ⚠️  The /commit command already exists"
  read -p "   Overwrite? (y/N) " OVERWRITE_COMMIT < /dev/tty
  if [ "$OVERWRITE_COMMIT" != "y" ]; then
    echo "   ✅ /commit command kept"
    SKIP_COMMIT=true
  else
    cp "$COMMIT_CMD" "$COMMIT_CMD.backup.$(date +%s)"
  fi
  echo ""
fi

if [ "$SKIP_COMMIT" != true ]; then
  cat > "$COMMIT_CMD" << 'SLASH_CMD_COMMIT'
---
description: Create an atomic commit with a conventional message
allowed-tools: Bash(*)
---

# Magic Slash - /commit

You are an assistant that creates atomic commits with conventional messages.

## Step 1: Check repository status

```bash
git status
```

If no changes are detected, inform the user that there is nothing to commit.

## Step 2: Stage changes

```bash
git add -A
```

## Step 3: Analyze changes

```bash
git diff --cached
```

Analyze modified files to understand the nature of changes.

## Step 4: Generate commit message

Generate a commit message following these rules:

**Format**: `type(scope): description`

**Language**: English only

**Constraints**:
- Single line
- No Co-Authored-By
- Concise and descriptive

**Available types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc. (no code change)
- `refactor`: Code refactoring (neither new feature nor bug fix)
- `test`: Adding or modifying tests
- `chore`: Maintenance, dependencies, configuration

**Scope**: The main file or modified component (e.g.: `auth`, `api`, `user-service`)

**Examples**:
- `feat(auth): add JWT token refresh mechanism`
- `fix(api): handle null response from payment gateway`
- `refactor(user-service): extract validation logic`
- `chore(deps): update axios to 1.6.0`

## Step 5: Create the commit

```bash
git commit -m "generated message"
```

## Step 6: Confirm

```bash
git log -1 --oneline
```

Display the created commit for confirmation.
SLASH_CMD_COMMIT

  echo "   ✅ /commit command installed"
fi

# --- /done installation ---
DONE_CMD="$COMMANDS_DIR/done.md"
SKIP_DONE=false

if [ -f "$DONE_CMD" ]; then
  echo "   ⚠️  The /done command already exists"
  read -p "   Overwrite? (y/N) " OVERWRITE_DONE < /dev/tty
  if [ "$OVERWRITE_DONE" != "y" ]; then
    echo "   ✅ /done command kept"
    SKIP_DONE=true
  else
    cp "$DONE_CMD" "$DONE_CMD.backup.$(date +%s)"
  fi
  echo ""
fi

if [ "$SKIP_DONE" != true ]; then
  cat > "$DONE_CMD" << 'SLASH_CMD_DONE'
---
description: Push commits, create PR and update Jira ticket
allowed-tools: Bash(*), mcp__github__*, mcp__atlassian__*
---

# Magic Slash - /done

You are an assistant that finalizes a task by pushing commits, creating a PR and updating the Jira ticket.

## Step 1: Get current branch

```bash
git branch --show-current
```

Verify you are not on `main` or `master`. If so, inform the user they must be on a feature branch.

## Step 2: Push to remote

```bash
git push -u origin <branch-name>
```

If push fails, display the error and stop the process.

## Step 3: List commits for PR

```bash
git log origin/main..HEAD --oneline
```

Retrieve the list of commits that will be included in the PR.

## Step 4: Create Pull Request via MCP GitHub

Use the MCP GitHub tool `mcp__github__create_pull_request` to create the PR:

- **Title**: Based on branch name or first commit
  - If branch contains a ticket ID (e.g.: `feature/PROJ-123`), use format: `[PROJ-123] Description`
- **Description**: Generated from commits
  - List commits with their messages
  - Add a "Changes" section summarizing modifications
- **Base**: `main` (or `master` depending on repo)
- **Head**: Current branch

## Step 5: Extract ticket ID

Analyze branch name to extract Jira ticket ID:
- Pattern: `feature/PROJ-123`, `fix/PROJ-456`, `PROJ-789-description`
- Regex: `[A-Z]+-\d+`

If no ticket ID is found, ask the user if they still want to update a Jira ticket.

## Step 6: Update Jira ticket

If a ticket ID is found, use MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to get it.

1. **Get available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Change status** to "To be reviewed" (or equivalent) with `mcp__atlassian__transitionJiraIssue`
3. **Add a comment** with the PR link via `mcp__atlassian__addCommentToJiraIssue`

If "To be reviewed" status doesn't exist, try:
- "In Review"
- "Code Review"
- "Review"

## Step 7: Final summary

Display a summary of what was done:

```
✅ Task completed!

📌 Branch  : feature/PROJ-123
🔗 PR      : https://github.com/org/repo/pull/42
🎫 Ticket  : PROJ-123 → To be reviewed

Next steps:
1. Request a review from your colleagues
2. Wait for approval and CI checks
3. Merge the PR once approved
```
SLASH_CMD_DONE

  echo "   ✅ /done command installed"
fi

echo ""

# ============================================
# 6. CLI INSTALLATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "6. Installing magic-slash CLI command"
echo ""

CLI_DIR="$HOME/.local/bin"
CLI_PATH="$CLI_DIR/magic-slash"

# Create directory if needed
mkdir -p "$CLI_DIR"

# Copy CLI script and inject version
if [ -f "$SCRIPT_DIR/magic-slash" ]; then
  # Local installation
  sed "s/__VERSION__/$CURRENT_VERSION/g" "$SCRIPT_DIR/magic-slash" > "$CLI_PATH"
else
  # Remote installation - download from GitHub
  curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/install/magic-slash" | \
    sed "s/__VERSION__/$CURRENT_VERSION/g" > "$CLI_PATH"
fi

chmod +x "$CLI_PATH"

echo "   ✅ magic-slash CLI installed at $CLI_PATH"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$CLI_DIR:"* ]]; then
  echo ""
  echo "   ⚠️  $CLI_DIR is not in your PATH"
  echo ""
  echo "   Add this line to your shell config (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  echo "      export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "   Then restart your terminal or run: source ~/.bashrc"
fi

echo ""

# ============================================
# 7. DONE
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Magic Slash v$CURRENT_VERSION installed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "  1. Restart Claude Code (to load MCPs)"
echo ""
echo "  2. On first /start, an OAuth window will open"
echo "     to connect your Atlassian account"
echo ""
echo "  3. Launch Claude Code and use:"
echo "     /start PROJ-1234    → Start from a Jira ticket"
echo "     /start 42           → Start from a GitHub issue"
echo "     /commit             → Commit with conventional message"
echo "     /done               → Push, PR and update Jira"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Created files:"
echo "  • MCP Atlassian  : ~/.claude.json (OAuth - Jira + Confluence)"
echo "  • MCP GitHub     : ~/.claude.json"
echo "  • Repos config   : ~/.config/magic-slash/config.json"
echo "  • /start command : ~/.claude/commands/start.md"
echo "  • /commit command: ~/.claude/commands/commit.md"
echo "  • /done command  : ~/.claude/commands/done.md"
echo "  • CLI command    : ~/.local/bin/magic-slash"
echo ""
echo "Run 'magic-slash' anytime to update your configuration."
echo ""
