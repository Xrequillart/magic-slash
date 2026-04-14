#!/bin/bash
# Magic Slash - Installation script
# Usage: curl -fsSL https://magic-slash.io/install.sh | bash
# Flags: --dry-run  (preview changes without modifying anything)

set -e

# ============================================
# ARGUMENT PARSING
# ============================================
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
  esac
done

# ============================================
# COLORS AND HELPERS
# ============================================
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

hide_cursor() { printf '\033[?25l'; }
show_cursor() { printf '\033[?25h'; }

# ============================================
# PLATFORM DETECTION
# ============================================
detect_platform() {
  case "$(uname -s)" in
    Darwin) PLATFORM="macOS" ;;
    Linux)  PLATFORM="Linux" ;;
    *)      PLATFORM="unknown" ;;
  esac
}
detect_platform

# Platform-aware install suggestion for a given tool
suggest_install_cmd() {
  local tool="$1"
  case "$tool" in
    claude)
      echo "https://claude.ai/download"
      ;;
    node|jq|gh|git)
      # apt package for node is "nodejs", everything else matches the tool name
      local pkg="$tool"
      [ "$tool" = "node" ] && pkg="nodejs"
      if [ "$PLATFORM" = "macOS" ]; then
        echo "brew install $tool"
      else
        echo "sudo apt install $pkg"
      fi
      ;;
    *)
      echo "(see https://google.com/search?q=install+$tool)"
      ;;
  esac
}

# ============================================
# ROLLBACK MECHANISM
# ============================================
ROLLBACK_ACTIONS=()
INSTALL_SUCCESS=false

# Push a rollback action (will be executed in reverse order on failure)
push_rollback() {
  ROLLBACK_ACTIONS+=("$1")
}

rollback_and_cleanup() {
  local exit_code=$?
  show_cursor

  # If interrupted by user (Ctrl+C), show message and exit immediately
  if [ "$exit_code" -eq 130 ] || [ "$INTERRUPTED" = true ]; then
    echo ""
    echo -e "   ${YELLOW}Installation cancelled by user.${NC}"
    echo ""
    exit 130
  fi

  echo ""

  if [ "$exit_code" -ne 0 ] && [ "$INSTALL_SUCCESS" = false ] && [ "$DRY_RUN" = false ]; then
    if [ ${#ROLLBACK_ACTIONS[@]} -gt 0 ]; then
      echo -e "   ${RED}Installation failed — rolling back changes...${NC}"
      echo ""
      # Execute rollback actions in reverse order
      for (( i=${#ROLLBACK_ACTIONS[@]}-1; i>=0; i-- )); do
        local action="${ROLLBACK_ACTIONS[$i]}"
        echo -e "   ${DIM}Rollback: $action${NC}"
        eval "$action" 2>/dev/null || true
      done
      echo ""
      echo -e "   ${YELLOW}Rollback complete. Your system has been restored.${NC}"
    fi
  fi

  # Clean up backup files on success
  if [ "$INSTALL_SUCCESS" = true ]; then
    rm -f "$HOME/.claude/settings.json.magic-slash.bak" 2>/dev/null || true
    rm -f "$HOME/.config/magic-slash/config.json.magic-slash.bak" 2>/dev/null || true
    # Clean up skills backup temp directory
    [ -n "${SKILLS_BACKUP_DIR:-}" ] && rm -rf "$SKILLS_BACKUP_DIR" 2>/dev/null || true
  fi
}
INTERRUPTED=false
trap rollback_and_cleanup EXIT
trap 'INTERRUPTED=true; exit 130' INT TERM

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
      if [ "$i" -eq "$selected" ]; then
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
          [ "$selected" -lt 0 ] && selected=$((count - 1))
          ;;
        '[B') # Down
          ((selected++))
          [ "$selected" -ge "$count" ] && selected=0
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
  echo -e "   ${BOLD}                       _           ${PURPLE}__${NC}${BOLD}   _           _${NC}"
  echo -e "   ${BOLD} _ __ ___   __ _  __ _(_) ___     ${PURPLE}/ /${NC}${BOLD}__| | __ _ ___| |__${NC}"
  echo -e "   ${BOLD}| '_ \` _ \\ / _\` |/ _\` | |/ __|   ${PURPLE}/ /${NC}${BOLD} __| |/ _\` / __| '_ \\ ${NC}"
  echo -e "   ${BOLD}| | | | | | (_| | (_| | | (__   ${PURPLE}/ /${NC}${BOLD}\\__ \\ | (_| \\__ \\ | | |${NC}"
  echo -e "   ${BOLD}|_| |_| |_|\\__,_|\\__, |_|\\___| ${NC}${PURPLE}/_/${NC}${BOLD} |___/_|\\__,_|___/_| |_|${NC}${BOLD}.${NC}"
  echo -e "   ${BOLD}                 |___/${NC}"
  echo ""
}

print_logo

if [ "$DRY_RUN" = true ]; then
  echo -e "   ${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "   ${CYAN}[DRY RUN] No changes will be made${NC}"
  echo -e "   ${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
fi

echo "  Installing /magic:start, /magic:continue, /magic:commit, /magic:pr, /magic:review, /magic:resolve and /magic:done"
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
  CURRENT_VERSION=$(curl -s https://api.github.com/repos/xrequillart/magic-slash/releases/latest | jq -r '.tag_name // "v0.36.0"' | sed 's/^v//')
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

      if [ "$DRY_RUN" = true ]; then
        echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt for reconfigure or cancel"
        SELECT_RESULT=0
      else
        select_option "Reconfigure (GitHub auth, repositories...)" "Cancel"
      fi

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

      if [ "$DRY_RUN" = true ]; then
        echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt for update or keep"
        SELECT_RESULT=0
      else
        select_option "Update to v$CURRENT_VERSION" "Keep v$INSTALLED_VERSION"
      fi

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
# 1. PREFLIGHT CHECKS
# ============================================
echo "1. Checking prerequisites..."
echo ""

# Check a required command, optionally with minimum major version
# Usage: check_command "tool" [min_major_version]
check_command() {
  local tool="$1"
  local min_version="${2:-}"

  if ! command -v "$tool" &> /dev/null; then
    local install_hint
    install_hint=$(suggest_install_cmd "$tool")
    echo -e "   ${RED}❌ $tool is not installed${NC}"
    echo -e "      → Install: ${BOLD}$install_hint${NC}"
    return 1
  fi

  # Version check if minimum version specified
  if [ -n "$min_version" ]; then
    local actual_version
    case "$tool" in
      node)
        actual_version=$(node -v | sed 's/^v//')
        ;;
      *)
        actual_version=$("$tool" --version 2>/dev/null | head -1 | sed 's/[^0-9.]//g')
        ;;
    esac

    local actual_major
    actual_major=$(echo "$actual_version" | cut -d. -f1)

    if [ -n "$actual_major" ] && [ "$actual_major" -lt "$min_version" ] 2>/dev/null; then
      local install_hint
      install_hint=$(suggest_install_cmd "$tool")
      echo -e "   ${RED}❌ $tool v$actual_version found, but v$min_version+ is required${NC}"
      echo -e "      → Upgrade: ${BOLD}$install_hint${NC}"
      return 1
    fi

    echo "   ✓ $tool (v$actual_version)"
    return 0
  fi

  echo "   ✓ $tool"
  return 0
}

MISSING=false

check_command "claude" || MISSING=true
check_command "node" 20 || MISSING=true
check_command "git" || MISSING=true
check_command "jq" || MISSING=true

# Optional: gh CLI (informational warning only)
if ! command -v "gh" &> /dev/null; then
  gh_install_cmd=$(suggest_install_cmd "gh")
  echo ""
  echo -e "   ${YELLOW}ℹ️  gh CLI not found${NC} — threaded reply resolution in magic:resolve will use a fallback."
  echo "      All other skills work normally."
  echo -e "      Install it later with ${BOLD}$gh_install_cmd${NC}"
fi

echo ""

if [ "$MISSING" = true ]; then
  echo -e "${RED}❌ Some required prerequisites are missing. Please install them before continuing.${NC}"
  echo ""
  exit 1
fi

echo "✅ All prerequisites are installed"
echo ""

# ============================================
# 1b. INTEGRATION SELECTION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Which integrations do you want to use?"
echo ""

# Detect existing integration choice for pre-selection on reconfigure
ATLASSIAN_ENABLED=true
if [ -f "$CONFIG_FILE" ]; then
  EXISTING_ATLASSIAN=$(jq -r '.integrations.atlassian // "true"' "$CONFIG_FILE" 2>/dev/null)
  if [ "$EXISTING_ATLASSIAN" = "false" ]; then
    ATLASSIAN_ENABLED=false
  fi
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt for integration selection"
  echo -e "   ${CYAN}[DRY RUN]${NC} current: ATLASSIAN_ENABLED=$ATLASSIAN_ENABLED"
else
  if [ "$ATLASSIAN_ENABLED" = true ]; then
    select_option "Atlassian + GitHub  (Jira, Confluence, PRs, issues, reviews)" "GitHub only         (PRs, issues, reviews)"
  else
    select_option "GitHub only         (PRs, issues, reviews)" "Atlassian + GitHub  (Jira, Confluence, PRs, issues, reviews)"
  fi

  if [ "$ATLASSIAN_ENABLED" = true ]; then
    # First option was Atlassian+GitHub
    [ $SELECT_RESULT -eq 1 ] && ATLASSIAN_ENABLED=false
  else
    # First option was GitHub only
    [ $SELECT_RESULT -eq 1 ] && ATLASSIAN_ENABLED=true
  fi
fi

echo ""

CLAUDE_CONFIG="$HOME/.claude.json"

if [ "$ATLASSIAN_ENABLED" = true ]; then
# ============================================
# 2. MCP ATLASSIAN CONFIGURATION (JIRA + CONFLUENCE)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "2. MCP Atlassian configuration (Jira + Confluence)"
echo ""

# Check if MCP Atlassian is already configured
SKIP_JIRA=false
if [ -f "$CLAUDE_CONFIG" ] && jq -e '.mcpServers.atlassian' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
  echo "   MCP Atlassian already configured (OAuth)"
  echo ""
  if [ "$DRY_RUN" = true ]; then
    echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt to reconfigure Atlassian MCP"
    SKIP_JIRA=true
  else
    read -rp "   Reconfigure? (y/N) " RECONFIG < /dev/tty
    [ "$RECONFIG" != "y" ] && SKIP_JIRA=true
  fi
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

  if [ "$DRY_RUN" = true ]; then
    echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt to continue Atlassian setup"
    echo -e "   ${CYAN}[DRY RUN]${NC} would: claude mcp add atlassian --scope user --transport http https://mcp.atlassian.com/v1/mcp"
  else
    read -rp "   Continue installation? (Y/n) " CONTINUE_JIRA < /dev/tty

    if [ "$CONTINUE_JIRA" = "n" ] || [ "$CONTINUE_JIRA" = "N" ]; then
      echo "   ⏭️  MCP Atlassian configuration skipped"
    else
      # Add MCP Atlassian via claude mcp add (HTTP server with OAuth)
      claude mcp add atlassian \
        --scope user \
        --transport http \
        https://mcp.atlassian.com/v1/mcp

      push_rollback "claude mcp remove atlassian --scope user 2>/dev/null || true"

      echo "   ✅ MCP Atlassian configured"
      echo ""
      echo "   ℹ️  On first use, an OAuth window will open in your browser"
      echo "      to authorize Claude to access your Atlassian workspace."
    fi
  fi
else
  echo "   ✅ MCP Atlassian kept"
fi

echo ""

fi  # end ATLASSIAN_ENABLED check

# ============================================
# 3. MCP GITHUB CONFIGURATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. MCP GitHub configuration (required for /pr, /review, /resolve, /done)"
echo ""

SKIP_GITHUB=false
if [ -f "$CLAUDE_CONFIG" ] && jq -e '.mcpServers.github' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
  echo "   MCP GitHub already configured"
  echo ""
  if [ "$DRY_RUN" = true ]; then
    echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt to reconfigure GitHub MCP"
    SKIP_GITHUB=true
  else
    read -rp "   Reconfigure? (y/N) " RECONFIG_GH < /dev/tty
    [ "$RECONFIG_GH" != "y" ] && SKIP_GITHUB=true
  fi
  echo ""
fi

if [ "$SKIP_GITHUB" = false ]; then
  echo "   To get your GitHub Personal Access Token:"
  echo "   → https://github.com/settings/tokens"
  echo "   (Required permissions: repo, read:org)"
  echo ""

  if [ "$DRY_RUN" = true ]; then
    echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt for GitHub Personal Access Token"
    echo -e "   ${CYAN}[DRY RUN]${NC} would: claude mcp add github --scope user -e GITHUB_PERSONAL_ACCESS_TOKEN=*** -- npx -y @modelcontextprotocol/server-github"
  else
    read -rsp "   GitHub Personal Access Token: " GITHUB_TOKEN < /dev/tty
    echo ""
    echo ""

    # Add MCP GitHub via claude mcp add
    claude mcp add github \
      --scope user \
      -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
      -- npx -y @modelcontextprotocol/server-github

    push_rollback "claude mcp remove github --scope user 2>/dev/null || true"

    echo "   ✅ MCP GitHub configured"
  fi
else
  echo "   ✅ MCP GitHub kept"
fi

echo ""

# ============================================
# 4. SKILLS INSTALLATION (Commands + Natural Language)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4. Installing /magic:start, /magic:continue, /magic:commit, /magic:pr, /magic:review, /magic:resolve and /magic:done skills"
echo ""

SKILLS_DIR="$HOME/.claude/skills"

if [ "$DRY_RUN" = true ]; then
  echo -e "   ${CYAN}[DRY RUN]${NC} would: create $SKILLS_DIR"
  echo -e "   ${CYAN}[DRY RUN]${NC} would: install skills (magic-start, magic-continue, magic-commit, magic-pr, magic-review, magic-resolve, magic-done)"
else
  mkdir -p "$SKILLS_DIR"

  # Track skills that existed before for rollback
  SKILLS_BACKUP_DIR=$(mktemp -d)
  for skill in magic-start magic-continue magic-commit magic-pr magic-review magic-resolve magic-done; do
    if [ -d "$SKILLS_DIR/$skill" ]; then
      cp -r "$SKILLS_DIR/$skill" "$SKILLS_BACKUP_DIR/$skill"
      push_rollback "rm -rf '${SKILLS_DIR:?}/${skill:?}' && cp -r '$SKILLS_BACKUP_DIR/$skill' '$SKILLS_DIR/$skill'"
    else
      push_rollback "rm -rf '${SKILLS_DIR:?}/${skill:?}'"
    fi
  done

  # Remove old unprefixed skills from previous versions
  for skill in start "continue" commit "done"; do
    if [ -d "$SKILLS_DIR/$skill" ]; then
      rm -rf "${SKILLS_DIR:?}/${skill:?}"
      echo "   ↗️  Migrated: /$skill → /magic:$skill"
    fi
  done

  # Copy skills from local or download from GitHub
  if [ -d "$SCRIPT_DIR/../skills" ]; then
    # Local installation
    cp -r "$SCRIPT_DIR/../skills/"* "$SKILLS_DIR/"
  else
    # Remote installation - download full skill folders from GitHub
    TREE_JSON=$(curl -fsSL "https://api.github.com/repos/xrequillart/magic-slash/git/trees/main?recursive=1")
    for skill in magic-start magic-continue magic-commit magic-pr magic-review magic-resolve magic-done; do
      mkdir -p "$SKILLS_DIR/$skill"
      # Extract file paths for this skill from the tree
      SKILL_FILES=$(echo "$TREE_JSON" | grep -o "\"path\" *: *\"skills/$skill/[^\"]*\"" | sed 's/"path" *: *"skills\///;s/"//' | sed "s|^$skill/||")
      if [ -z "$SKILL_FILES" ]; then
        # Fallback: download SKILL.md and image.png directly
        curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills/$skill/SKILL.md" > "$SKILLS_DIR/$skill/SKILL.md"
        curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills/$skill/image.png" -o "$SKILLS_DIR/$skill/image.png" 2>/dev/null || true
      else
        echo "$SKILL_FILES" | while IFS= read -r file; do
          [ -z "$file" ] && continue
          mkdir -p "$SKILLS_DIR/$skill/$(dirname "$file")"
          curl -fsSL "https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills/$skill/$file" -o "$SKILLS_DIR/$skill/$file" 2>/dev/null || true
        done
      fi
    done
  fi
fi

echo "   ✅ Skills installed (magic:start, magic:continue, magic:commit, magic:pr, magic:review, magic:resolve, magic:done)"
echo "   → Type /magic: to quickly find all commands"
echo "   → Or use natural language: 'démarre PROJ-123', 'ready to commit', 'create the PR', 'review my PR'"

# Note: Old commands in ~/.claude/commands/ are no longer used
if [ -d "$HOME/.claude/commands" ]; then
  if [ -f "$HOME/.claude/commands/start.md" ] || [ -f "$HOME/.claude/commands/commit.md" ] || [ -f "$HOME/.claude/commands/done.md" ]; then
    echo ""
    echo "   ℹ️  Old commands found in ~/.claude/commands/"
    echo "   → You can safely delete them (skills replace commands)"
  fi
fi

echo ""

# ============================================
# 4b. CONFIGURE PERMISSIONS (MCP tools + common commands)
# ============================================
echo "   Configuring permissions for Magic Slash..."

CLAUDE_SETTINGS="$HOME/.claude/settings.json"

if [ "$DRY_RUN" = true ]; then
  echo -e "   ${CYAN}[DRY RUN]${NC} would: update $CLAUDE_SETTINGS with MCP tool permissions"
else
  mkdir -p "$HOME/.claude"

  if [ ! -f "$CLAUDE_SETTINGS" ]; then
    echo '{}' > "$CLAUDE_SETTINGS"
    push_rollback "rm -f '$CLAUDE_SETTINGS'"
  else
    # Back up settings before modifying
    cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.magic-slash.bak"
    push_rollback "mv '$CLAUDE_SETTINGS.magic-slash.bak' '$CLAUDE_SETTINGS'"
  fi

  # Permissions needed by magic:* skills
  MAGIC_SLASH_PERMS=(
    # Desktop communication
    'Bash(*http://127.0.0.1:*)'
    # GitHub MCP tools
    'mcp__github__get_issue'
    'mcp__github__add_issue_comment'
    'mcp__github__update_issue'
    'mcp__github__list_pull_requests'
    'mcp__github__get_pull_request'
    'mcp__github__get_pull_request_files'
    'mcp__github__get_pull_request_comments'
    'mcp__github__get_pull_request_reviews'
    'mcp__github__create_pull_request'
    'mcp__github__create_pull_request_review'
    # Common Bash commands used by skills
    'Bash(git *)'
    'Bash(npm *)'
    'Bash(yarn *)'
    'Bash(pnpm *)'
    'Bash(bun *)'
    'Bash(jq *)'
    'Bash(gh *)'
  )

  # Atlassian MCP tools (only if enabled)
  if [ "$ATLASSIAN_ENABLED" = true ]; then
    MAGIC_SLASH_PERMS+=(
      'mcp__atlassian__getAccessibleAtlassianResources'
      'mcp__atlassian__getJiraIssue'
      'mcp__atlassian__getTransitionsForJiraIssue'
      'mcp__atlassian__transitionJiraIssue'
      'mcp__atlassian__addCommentToJiraIssue'
    )
  fi

  # Build a JSON array of all permissions, then merge in a single jq call
  PERMS_JSON=$(printf '%s\n' "${MAGIC_SLASH_PERMS[@]}" | jq -R . | jq -s .)
  TMP_SETTINGS=$(mktemp)
  jq --argjson newPerms "$PERMS_JSON" '
    .permissions //= {} |
    .permissions.allow //= [] |
    .permissions.allow += ($newPerms - .permissions.allow)
  ' "$CLAUDE_SETTINGS" > "$TMP_SETTINGS" && mv "$TMP_SETTINGS" "$CLAUDE_SETTINGS"

  # Remove Atlassian permissions if switching to GitHub-only
  if [ "$ATLASSIAN_ENABLED" = false ]; then
    TMP_SETTINGS=$(mktemp)
    jq '
      .permissions.allow |= map(select(startswith("mcp__atlassian__") | not))
    ' "$CLAUDE_SETTINGS" > "$TMP_SETTINGS" && mv "$TMP_SETTINGS" "$CLAUDE_SETTINGS"
  fi
fi

echo "   ✅ Permissions configured (MCP tools + common commands auto-allowed)"
echo ""

# Create initial config file (repositories will be configured in desktop app)
if [ "$DRY_RUN" = true ]; then
  echo -e "   ${CYAN}[DRY RUN]${NC} would: create or update $CONFIG_FILE with version $CURRENT_VERSION"
else
  mkdir -p "$CONFIG_DIR"
  if [ ! -f "$CONFIG_FILE" ]; then
    jq -n --arg version "$CURRENT_VERSION" --argjson atlassian "$ATLASSIAN_ENABLED" \
      '{"version": $version, "integrations": {"github": true, "atlassian": $atlassian}, "repositories": {}}' > "$CONFIG_FILE"
    push_rollback "rm -f '$CONFIG_FILE'"
  else
    # Back up config before modifying
    cp "$CONFIG_FILE" "$CONFIG_FILE.magic-slash.bak"
    push_rollback "mv '$CONFIG_FILE.magic-slash.bak' '$CONFIG_FILE'"
    # Update version in existing config file
    TMP_FILE=$(mktemp)
    jq --arg version "$CURRENT_VERSION" --argjson atlassian "$ATLASSIAN_ENABLED" \
      '.version = $version | .integrations = {"github": true, "atlassian": $atlassian} | del(.installationMode)' "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"
  fi
fi

# ============================================
# 5. DESKTOP APP OR CLI INSTALLATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "5. Installing Magic Slash Desktop app"
echo ""

# Check if already installed in /Applications
SKIP_DESKTOP=false
if [ -d "/Applications/Magic Slash.app" ]; then
  INSTALLED_APP_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "/Applications/Magic Slash.app/Contents/Info.plist" 2>/dev/null || echo "unknown")
  echo "   Magic Slash Desktop already installed (v$INSTALLED_APP_VERSION)"
  echo ""
  if [ "$DRY_RUN" = true ]; then
    echo -e "   ${CYAN}[DRY RUN]${NC} would: prompt to reinstall/update desktop app"
    SKIP_DESKTOP=true
  else
    read -rp "   Reinstall/Update? (y/N) " REINSTALL_DESKTOP < /dev/tty
    [ "$REINSTALL_DESKTOP" != "y" ] && SKIP_DESKTOP=true
  fi
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

  if [ "$DRY_RUN" = true ]; then
    echo -e "   ${CYAN}[DRY RUN]${NC} would: download $DMG_URL"
    echo -e "   ${CYAN}[DRY RUN]${NC} would: open DMG and prompt to drag app to /Applications"
  else
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
      read -rp "   Press Enter once you've dragged the app to Applications... " < /dev/tty
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
  fi
else
  echo "   ✅ Desktop app kept"
fi

echo ""

# ============================================
# 6. DONE
# ============================================

# Mark installation as successful (prevents rollback in trap)
INSTALL_SUCCESS=true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Magic Slash v$CURRENT_VERSION installed successfully!"
echo ""
echo "Created files:"
if [ "$ATLASSIAN_ENABLED" = true ]; then
echo "  • MCP Atlassian  : ~/.claude.json (OAuth - Jira + Confluence)"
fi
echo "  • MCP GitHub     : ~/.claude.json"
echo "  • Config         : ~/.config/magic-slash/config.json"
echo "  • Skills         : ~/.claude/skills/{magic-start,magic-continue,magic-commit,magic-pr,magic-review,magic-resolve,magic-done}/SKILL.md"

echo "  • Desktop app    : /Applications/Magic Slash.app"
echo ""
echo "Configuration:"
echo "  • Open 'Magic Slash' app from Applications"
echo "  • Or use Spotlight: Cmd+Space → 'Magic Slash'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 You're ready! Try these commands in Claude Code:"
echo ""
if [ "$ATLASSIAN_ENABLED" = true ]; then
echo "   /magic:start PROJ-123   Start a Jira ticket"
fi
echo "   /magic:start #42       Start a GitHub issue"
echo "   /magic:commit          Create a commit"
echo "   /magic:pr              Push and create a Pull Request"
echo "   /magic:review          Review a Pull Request"
echo "   /magic:resolve         Address review comments"
echo "   /magic:done            Finalize after PR is merged"
echo ""
echo "   💡 Type /magic: to see all commands"
echo ""
echo "   Or use natural language:"
if [ "$ATLASSIAN_ENABLED" = true ]; then
echo "   'démarre PROJ-123'  'ready to commit'  'create the PR'"
else
echo "   'start #42'  'ready to commit'  'create the PR'"
fi
echo ""

# END_OF_INSTALL_SCRIPT
