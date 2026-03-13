#!/bin/bash
# Magic Slash - Installation script
# Usage: curl -fsSL https://magic-slash.io/install.sh | bash

set -e

# ============================================
# COLORS AND HELPERS
# ============================================
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
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
  CURRENT_VERSION=$(curl -s https://api.github.com/repos/xrequillart/magic-slash/releases/latest | jq -r '.tag_name // "v0.12.11"' | sed 's/^v//')
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
# 1b. INSTALLATION MODE SELECTION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose installation mode:"
echo ""

select_installation_mode() {
  echo ""
  select_option "Desktop App (recommended)" "Standalone (CLI only)"

  if [ $SELECT_RESULT -eq 0 ]; then
    INSTALL_MODE="desktop"
    echo ""
    echo -e "   ${GREEN}→ Desktop App${NC}: Full visual interface with terminal management"
  else
    INSTALL_MODE="standalone"
    echo ""
    echo -e "   ${GREEN}→ Standalone${NC}: Terminal-based configuration, no desktop app"
  fi
  echo ""
}

select_installation_mode

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
# 4. SKILLS INSTALLATION (Commands + Natural Language)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4. Installing /start, /commit and /done skills"
echo ""

SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"

# Copy skills from local or download from GitHub
if [ -d "$SCRIPT_DIR/../skills" ]; then
  # Local installation
  cp -r "$SCRIPT_DIR/../skills/"* "$SKILLS_DIR/"
else
  # Remote installation - download from GitHub
  for skill in start commit "done"; do
    mkdir -p "$SKILLS_DIR/$skill"
    curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills/$skill/SKILL.md" > "$SKILLS_DIR/$skill/SKILL.md"
    curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills/$skill/image.png" -o "$SKILLS_DIR/$skill/image.png" 2>/dev/null || true
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

# Create initial config file (repositories will be configured in desktop app or TUI)
mkdir -p "$CONFIG_DIR"
if [ ! -f "$CONFIG_FILE" ]; then
  jq -n --arg version "$CURRENT_VERSION" --arg mode "$INSTALL_MODE" \
    '{"version": $version, "installationMode": $mode, "repositories": {}}' > "$CONFIG_FILE"
else
  # Update version and installationMode in existing config file
  TMP_FILE=$(mktemp)
  jq --arg version "$CURRENT_VERSION" --arg mode "$INSTALL_MODE" \
    '.version = $version | .installationMode = $mode' "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"
fi

# ============================================
# 5. DESKTOP APP OR CLI INSTALLATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$INSTALL_MODE" = "desktop" ]; then
  echo "5. Installing Magic Slash Desktop app"
  echo ""

  # Check if already installed in /Applications
  SKIP_DESKTOP=false
  if [ -d "/Applications/Magic Slash.app" ]; then
    INSTALLED_APP_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "/Applications/Magic Slash.app/Contents/Info.plist" 2>/dev/null || echo "unknown")
    echo "   Magic Slash Desktop already installed (v$INSTALLED_APP_VERSION)"
    echo ""
    read -p "   Reinstall/Update? (y/N) " REINSTALL_DESKTOP < /dev/tty
    [ "$REINSTALL_DESKTOP" != "y" ] && SKIP_DESKTOP=true
    echo ""
  fi

  if [ "$SKIP_DESKTOP" = false ]; then
    # Detect architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
      DMG_SUFFIX="arm64"
    else
      DMG_SUFFIX="x64"
    fi

    DMG_NAME="Magic-Slash-${CURRENT_VERSION}-${DMG_SUFFIX}.dmg"
    DMG_URL="https://github.com/xrequillart/magic-slash/releases/download/v${CURRENT_VERSION}/${DMG_NAME}"
    TMP_DMG="/tmp/${DMG_NAME}"

    echo "   Downloading Magic Slash Desktop v${CURRENT_VERSION}..."
    echo "   Architecture: ${ARCH}"
    echo ""

    # Download DMG from GitHub releases
    if curl -fsSL -o "$TMP_DMG" "$DMG_URL"; then
      echo "   ✅ Downloaded successfully"
      echo ""

      # Open DMG for manual installation
      echo "   Opening the disk image..."
      echo ""
      open "$TMP_DMG"

      echo "   ┌─────────────────────────────────────────────────┐"
      echo "   │                                                 │"
      echo "   │   A Finder window should have opened.           │"
      echo "   │                                                 │"
      echo "   │   → Drag 'Magic Slash' into the                 │"
      echo "   │     'Applications' folder.                      │"
      echo "   │                                                 │"
      echo "   │   If prompted to replace, click 'Replace'.      │"
      echo "   │                                                 │"
      echo "   └─────────────────────────────────────────────────┘"
      echo ""
      read -p "   Press Enter once you've dragged the app to Applications... " < /dev/tty
      echo ""

      # Verify installation
      if [ -d "/Applications/Magic Slash.app" ]; then
        echo "   ✅ Desktop app installed"
      else
        echo -e "   ${YELLOW}⚠️  Magic Slash.app not found in /Applications${NC}"
        echo "   → Make sure you dragged it to the Applications folder."
        echo "   → You can also do it later from the DMG."
      fi

      # Eject DMG
      MOUNT_POINT=$(hdiutil info | grep "Magic" | awk -F'\t' '{print $NF}' | head -1 | xargs)
      if [ -n "$MOUNT_POINT" ]; then
        hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
      fi

      # Cleanup
      rm -f "$TMP_DMG" 2>/dev/null
    else
      echo "   ⚠️  Could not download DMG from GitHub releases"
      echo "   → Download manually: https://github.com/xrequillart/magic-slash/releases"
    fi
  else
    echo "   ✅ Desktop app kept"
  fi

else
  # Standalone mode - install CLI
  echo "5. Installing Magic Slash CLI"
  echo ""

  CLI_DIR="$HOME/.local/bin"
  CLI_PATH="$CLI_DIR/magic-slash"

  # Create directory if needed
  mkdir -p "$CLI_DIR"

  # Copy CLI from local or download from GitHub
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
  if [[ ":$PATH:" != *":$CLI_DIR:"* ]]; then
    echo ""
    echo -e "   ${YELLOW}⚠️  $CLI_DIR is not in your PATH${NC}"
    echo ""
    echo "   Add this line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo ""
    echo -e "   ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
    echo ""
  fi

  # ============================================
  # 5b. REPOSITORY CONFIGURATION (Standalone only)
  # ============================================
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "6. Configure repositories"
  echo ""
  echo "   Add at least one repository so /start can match tickets to projects."
  echo ""

  REPO_INDEX=0
  ADD_MORE=true

  while [ "$ADD_MORE" = true ]; do
    REPO_INDEX=$((REPO_INDEX + 1))
    echo -e "   ${BOLD}Repository #$REPO_INDEX${NC}"
    echo ""

    # Repository name
    read -p "   Name (e.g. api, web, mobile): " REPO_NAME < /dev/tty
    echo ""

    # Repository path
    read -p "   Absolute path (e.g. /Users/dev/projects/my-api): " REPO_PATH < /dev/tty
    echo ""

    # Validate path exists
    if [ ! -d "$REPO_PATH" ]; then
      echo -e "   ${YELLOW}⚠️  Directory not found: $REPO_PATH${NC}"
      echo "   → The path will be saved anyway. Make sure it exists before using /start."
      echo ""
    fi

    # Keywords
    read -p "   Keywords, comma-separated (e.g. backend,api,server): " REPO_KEYWORDS_RAW < /dev/tty
    echo ""

    # Convert comma-separated keywords to JSON array
    KEYWORDS_JSON=$(echo "$REPO_KEYWORDS_RAW" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | jq -R . | jq -s .)

    # Add repository to config
    TMP_FILE=$(mktemp)
    jq --arg name "$REPO_NAME" --arg path "$REPO_PATH" --argjson keywords "$KEYWORDS_JSON" \
      '.repositories[$name] = {"path": $path, "keywords": $keywords}' "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"

    echo -e "   ${GREEN}✅ Repository '$REPO_NAME' added${NC}"
    echo ""

    # Ask to add another
    echo -e "   ${DIM}Add another repository?${NC}"
    echo ""
    select_option "Add another repository" "Done, continue installation"

    if [ $SELECT_RESULT -eq 1 ]; then
      ADD_MORE=false
    fi
    echo ""
  done

  echo "   ✅ $REPO_INDEX repository(ies) configured"
  echo ""
fi

echo ""

# ============================================
# 6. DONE
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Magic Slash v$CURRENT_VERSION installed successfully!"
echo ""
echo "Created files:"
echo "  • MCP Atlassian  : ~/.claude.json (OAuth - Jira + Confluence)"
echo "  • MCP GitHub     : ~/.claude.json"
echo "  • Config         : ~/.config/magic-slash/config.json"
echo "  • Skills         : ~/.claude/skills/{start,commit,done}/SKILL.md"

if [ "$INSTALL_MODE" = "desktop" ]; then
  echo "  • Desktop app    : /Applications/Magic Slash.app"
  echo ""
  echo "Configuration:"
  echo "  • Open 'Magic Slash' app from Applications"
  echo "  • Or use Spotlight: Cmd+Space → 'Magic Slash'"
else
  echo "  • CLI            : ~/.local/bin/magic-slash"
  echo ""
  echo "Configuration:"
  echo "  • Run 'magic-slash' to modify repositories or settings"
  echo "  • Or 'magic-slash --help' for more options"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 You're ready! Try these commands in Claude Code:"
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
