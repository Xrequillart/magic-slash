#!/bin/bash
# Magic Slash - Uninstallation script
# Usage: curl -fsSL https://magic-slash.io/uninstall.sh | bash

set -e

# Colors
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

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
echo "  Magic Slash Uninstallation"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# READ INSTALLATION MODE
# ============================================
CONFIG_FILE="$HOME/.config/magic-slash/config.json"
INSTALL_MODE="unknown"
if [ -f "$CONFIG_FILE" ]; then
  INSTALL_MODE=$(jq -r '.installationMode // "unknown"' "$CONFIG_FILE" 2>/dev/null)
fi

# ============================================
# CONFIRMATION
# ============================================
echo "This script will remove:"
echo ""
echo "  • ~/.claude/skills/start/"
echo "  • ~/.claude/skills/continue/"
echo "  • ~/.claude/skills/commit/"
echo "  • ~/.claude/skills/done/"
echo "  • ~/.config/magic-slash/ (entire folder)"
if [ "$INSTALL_MODE" = "standalone" ]; then
  echo "  • ~/.local/bin/magic-slash (CLI)"
elif [ "$INSTALL_MODE" = "desktop" ]; then
  echo "  • /Applications/Magic Slash.app (desktop app)"
else
  echo "  • /Applications/Magic Slash.app (desktop app, if present)"
  echo "  • ~/.local/bin/magic-slash (CLI, if present)"
fi
echo "  • MCP Atlassian (via claude mcp remove)"
echo "  • MCP GitHub (via claude mcp remove)"
echo ""
read -p "Continue? (y/N) " CONFIRM < /dev/tty
echo ""

if [ "$CONFIRM" != "y" ]; then
  echo "❌ Uninstallation cancelled"
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# 1. SKILLS REMOVAL
# ============================================
echo "1. Removing skills..."
echo ""

SKILLS_DIR="$HOME/.claude/skills"

for skill in start "continue" commit "done"; do
  if [ -d "$SKILLS_DIR/$skill" ]; then
    rm -rf "${SKILLS_DIR:?}/${skill:?}"
    echo "   ✓ Removed: $SKILLS_DIR/$skill/"
  else
    echo "   - Not found: $SKILLS_DIR/$skill/"
  fi
done

# Also remove old commands if they exist (legacy cleanup)
COMMANDS_DIR="$HOME/.claude/commands"
for cmd in start.md continue.md commit.md done.md; do
  if [ -f "$COMMANDS_DIR/$cmd" ]; then
    rm "$COMMANDS_DIR/$cmd"
    echo "   ✓ Removed legacy: $COMMANDS_DIR/$cmd"
  fi
done

echo ""

# ============================================
# 2. MAGIC-SLASH CONFIG REMOVAL
# ============================================
echo "2. Removing Magic Slash configuration..."
echo ""

CONFIG_DIR="$HOME/.config/magic-slash"

if [ -d "$CONFIG_DIR" ]; then
  rm -rf "$CONFIG_DIR"
  echo "   ✓ Removed: $CONFIG_DIR"
else
  echo "   - Not found: $CONFIG_DIR"
fi

echo ""

# ============================================
# 3. DESKTOP APP / CLI REMOVAL
# ============================================
echo "3. Removing Magic Slash app/CLI..."
echo ""

# Remove desktop app (if installed in desktop mode or for safety)
APP_PATH="/Applications/Magic Slash.app"
if [ -d "$APP_PATH" ]; then
  rm -rf "$APP_PATH"
  echo "   ✓ Removed: $APP_PATH"
elif [ "$INSTALL_MODE" = "desktop" ]; then
  echo "   - Not found: $APP_PATH"
fi

# Remove CLI (if installed in standalone mode or for safety)
CLI_PATH="$HOME/.local/bin/magic-slash"
if [ -f "$CLI_PATH" ]; then
  rm "$CLI_PATH"
  echo "   ✓ Removed: $CLI_PATH"
elif [ "$INSTALL_MODE" = "standalone" ]; then
  echo "   - Not found: $CLI_PATH"
fi

# Also clean up legacy web UI if it exists
WEB_UI_DIR="$HOME/.local/share/magic-slash"
if [ -d "$WEB_UI_DIR" ]; then
  rm -rf "$WEB_UI_DIR"
  echo "   ✓ Removed legacy: $WEB_UI_DIR"
fi

# Also clean up CLI in /usr/local/bin if it exists (legacy location)
if [ -f "/usr/local/bin/magic-slash" ]; then
  rm "/usr/local/bin/magic-slash"
  echo "   ✓ Removed legacy: /usr/local/bin/magic-slash"
fi

echo ""

# ============================================
# 4. MCP SERVERS CLEANUP
# ============================================
echo "4. Removing MCP servers (Atlassian & GitHub)..."
echo ""

# Remove MCP Atlassian
if claude mcp remove atlassian --scope user 2>/dev/null; then
  echo "   ✓ MCP Atlassian removed"
else
  echo "   - MCP Atlassian not found"
fi

# Remove MCP GitHub
if claude mcp remove github --scope user 2>/dev/null; then
  echo "   ✓ MCP GitHub removed"
else
  echo "   - MCP GitHub not found"
fi

echo ""

# ============================================
# 5. BACKUP CLEANUP (OPTIONAL)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "5. Cleaning up backup files..."
echo ""

BACKUP_COUNT=$(find "$HOME/.claude" -name "*.backup.*" 2>/dev/null | wc -l | tr -d ' ')

if [ "$BACKUP_COUNT" -gt 0 ]; then
  echo "   $BACKUP_COUNT backup file(s) found"
  read -p "   Delete backups? (y/N) " DELETE_BACKUPS < /dev/tty

  if [ "$DELETE_BACKUPS" = "y" ]; then
    find "$HOME/.claude" -name "*.backup.*" -delete 2>/dev/null
    echo "   ✓ Backups deleted"
  else
    echo "   - Backups kept"
  fi
else
  echo "   - No backups found"
fi

echo ""

# ============================================
# DONE
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Uninstallation complete!"
echo ""
echo "   Magic Slash has been removed from your system."
echo ""
echo "   Note: Git worktrees created by /start have not been"
echo "   removed. You can delete them manually if needed."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
