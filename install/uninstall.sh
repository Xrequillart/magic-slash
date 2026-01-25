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
# CONFIRMATION
# ============================================
echo "This script will remove:"
echo ""
echo "  • ~/.claude/commands/start.md"
echo "  • ~/.claude/commands/commit.md"
echo "  • ~/.claude/commands/done.md"
echo "  • ~/.config/magic-slash/ (entire folder)"
echo "  • MCP Atlassian (via claude mcp remove)"
echo "  • MCP GitHub (via claude mcp remove)"
echo "  • magic-slash CLI command"
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
# 1. SLASH COMMANDS REMOVAL
# ============================================
echo "1. Removing slash commands..."
echo ""

COMMANDS_DIR="$HOME/.claude/commands"

for cmd in start.md commit.md done.md; do
  if [ -f "$COMMANDS_DIR/$cmd" ]; then
    rm "$COMMANDS_DIR/$cmd"
    echo "   ✓ Removed: $COMMANDS_DIR/$cmd"
  else
    echo "   - Not found: $COMMANDS_DIR/$cmd"
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
# 3. MCP SERVERS CLEANUP
# ============================================
echo "3. Removing MCP servers (Atlassian & GitHub)..."
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
# 4. CLI REMOVAL
# ============================================
echo "4. Removing magic-slash CLI..."
echo ""

CLI_REMOVED=false
for dir in "$HOME/.local/bin" "/usr/local/bin"; do
  if [ -f "$dir/magic-slash" ]; then
    rm "$dir/magic-slash"
    echo "   ✓ Removed: $dir/magic-slash"
    CLI_REMOVED=true
    break
  fi
done

if [ "$CLI_REMOVED" = false ]; then
  echo "   - magic-slash CLI not found"
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
