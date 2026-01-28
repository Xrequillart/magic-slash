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

# Get current version from GitHub API (latest release)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../package.json" ]; then
  # Local development: read from package.json
  CURRENT_VERSION=$(jq -r '.version' "$SCRIPT_DIR/../package.json")
else
  # Remote install: fetch latest version from GitHub API
  CURRENT_VERSION=$(curl -s https://api.github.com/repos/xrequillart/magic-slash/releases/latest | jq -r '.tag_name // "v0.8.0"' | sed 's/^v//')
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
  echo "   Repositories already configured:"
  jq -r '.repositories | to_entries[] | "   • \(.key): \(.value.path)"' "$CONFIG_FILE"
  echo ""
  read -p "   Reconfigure? (y/N) " RECONFIG_REPOS < /dev/tty
  [ "$RECONFIG_REPOS" != "y" ] && SKIP_REPOS=true
  echo ""
fi

if [ "$SKIP_REPOS" = false ]; then
  echo "   Magic Slash now supports multiple repositories!"
  echo ""
  read -p "   How many repositories do you want to configure? (1-10): " REPO_COUNT < /dev/tty
  echo ""

  # Validate input
  if ! [[ "$REPO_COUNT" =~ ^[0-9]+$ ]] || [ "$REPO_COUNT" -lt 1 ] || [ "$REPO_COUNT" -gt 10 ]; then
    echo "   ⚠️  Invalid number. Please enter a number between 1 and 10."
    exit 1
  fi

  # Initialize repositories JSON
  REPOS_JSON="{}"

  for ((i=1; i<=REPO_COUNT; i++)); do
    echo "   ━━━ Repository $i/$REPO_COUNT ━━━"
    echo ""

    read -p "   Name (e.g.: api, web, mobile): " REPO_NAME < /dev/tty

    # Validate name (alphanumeric and hyphens only)
    if ! [[ "$REPO_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
      echo "   ⚠️  Invalid name. Use only letters, numbers, hyphens and underscores."
      exit 1
    fi

    read -p "   Path (e.g.: ~/projects/my-$REPO_NAME): " REPO_PATH < /dev/tty

    # Expand ~
    REPO_PATH="${REPO_PATH/#\~/$HOME}"

    # Check that path exists
    if [ ! -d "$REPO_PATH" ]; then
      echo "   ⚠️  Directory does not exist: $REPO_PATH"
      read -p "   Continue anyway? (y/N) " CONTINUE < /dev/tty
      [ "$CONTINUE" != "y" ] && exit 1
    elif [ ! -d "$REPO_PATH/.git" ]; then
      echo "   ⚠️  $REPO_PATH is not a git repo"
      read -p "   Continue anyway? (y/N) " CONTINUE < /dev/tty
      [ "$CONTINUE" != "y" ] && exit 1
    fi

    read -p "   Keywords for auto-detection (comma-separated, optional): " KEYWORDS_INPUT < /dev/tty

    # Convert comma-separated keywords to JSON array, use repo name as default
    if [ -z "$KEYWORDS_INPUT" ]; then
      KEYWORDS_JSON="[\"$REPO_NAME\"]"
    else
      # Convert "a, b, c" to ["a","b","c"]
      KEYWORDS_JSON=$(echo "$KEYWORDS_INPUT" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | jq -R . | jq -s .)
    fi

    # Add repo to JSON
    REPOS_JSON=$(echo "$REPOS_JSON" | jq --arg name "$REPO_NAME" --arg path "$REPO_PATH" --argjson keywords "$KEYWORDS_JSON" \
      '.[$name] = {"path": $path, "keywords": $keywords}')

    echo ""
  done

  # Create config file
  mkdir -p "$CONFIG_DIR"
  jq -n --arg version "$CURRENT_VERSION" --argjson repos "$REPOS_JSON" \
    '{"version": $version, "repositories": $repos}' > "$CONFIG_FILE"

  echo "   ✅ Repositories configured"
else
  # Update version in existing config file
  TMP_FILE=$(mktemp)
  jq --arg version "$CURRENT_VERSION" '.version = $version' "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"
  echo "   ✅ Repositories kept"
fi

echo ""

# ============================================
# 5. SKILLS INSTALLATION (Commands + Natural Language)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "5. Installing /start, /commit and /done skills"
echo ""

SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"

# Copy skills from local or download from GitHub
if [ -d "$SCRIPT_DIR/../skills" ]; then
  # Local installation
  cp -r "$SCRIPT_DIR/../skills/"* "$SKILLS_DIR/"
else
  # Remote installation - download from GitHub
  for skill in start commit done; do
    mkdir -p "$SKILLS_DIR/$skill"
    curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills/$skill/SKILL.md" > "$SKILLS_DIR/$skill/SKILL.md"
  done
fi

echo "   ✅ Skills installed (start, commit, done)"
echo "   → Use /start, /commit, /done or natural language"
echo "   → Examples: 'démarre PROJ-123', 'ready to commit', 'create the PR'"

# Note: Old commands in ~/.claude/commands/ are no longer used
# Skills in ~/.claude/skills/ replace them completely
if [ -d "$HOME/.claude/commands" ]; then
  if [ -f "$HOME/.claude/commands/start.md" ] || [ -f "$HOME/.claude/commands/commit.md" ] || [ -f "$HOME/.claude/commands/done.md" ]; then
    echo ""
    echo "   ℹ️  Old commands found in ~/.claude/commands/"
    echo "   → You can safely delete them (skills replace commands)"
  fi
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

# Copy CLI script (version is read from config.json at runtime)
if [ -f "$SCRIPT_DIR/magic-slash" ]; then
  # Local installation
  cp "$SCRIPT_DIR/magic-slash" "$CLI_PATH"
else
  # Remote installation - download from GitHub
  curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/install/magic-slash" > "$CLI_PATH"
fi

chmod +x "$CLI_PATH"
echo "   ✅ CLI installed at $CLI_PATH"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo ""
  echo "   ⚠️  ~/.local/bin is not in your PATH"
  echo "   Add this line to your ~/.bashrc or ~/.zshrc:"
  echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""

# ============================================
# 7. DONE
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Magic Slash v$CURRENT_VERSION installed successfully!"
echo ""
echo "Created files:"
echo "  • MCP Atlassian  : ~/.claude.json (OAuth - Jira + Confluence)"
echo "  • MCP GitHub     : ~/.claude.json"
echo "  • Repos config   : ~/.config/magic-slash/config.json"
echo "  • Skills         : ~/.claude/skills/{start,commit,done}/SKILL.md"
echo "  • CLI command    : ~/.local/bin/magic-slash"
echo ""
echo "Run 'magic-slash' anytime to update your configuration."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 You're ready! Try these commands:"
echo ""
echo "   /start PROJ-123     Start a Jira ticket"
echo "   /start #42          Start a GitHub issue"
echo "   /commit             Create a commit"
echo "   /done               Push, create PR, update Jira"
echo ""
echo "   Or use natural language:"
echo "   'démarre PROJ-123'  'ready to commit'  'create the PR'"
echo ""

# END_OF_INSTALL_SCRIPT
