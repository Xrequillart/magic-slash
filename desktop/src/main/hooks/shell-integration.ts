import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const MAGIC_SLASH_MARKER = '# Magic Slash shell integration - DO NOT EDIT THIS BLOCK'
const MAGIC_SLASH_END_MARKER = '# End Magic Slash shell integration'

// ZSH hook script
const ZSH_SCRIPT = `
_magic_slash_preexec() {
  local cmd="$1"
  # URL encode the command for safe transmission
  local encoded_cmd=$(printf '%s' "$cmd" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))" 2>/dev/null || printf '%s' "$cmd" | sed 's/ /%20/g; s/"/%22/g; s/#/%23/g; s/&/%26/g; s/=/%3D/g; s/?/%3F/g')
  curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/command/start?id=$MAGIC_SLASH_TERMINAL_ID&cmd=$encoded_cmd" > /dev/null 2>&1 &
}

_magic_slash_precmd() {
  local exit_code=$?
  curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/command/end?id=$MAGIC_SLASH_TERMINAL_ID&exit=$exit_code" > /dev/null 2>&1 &
}

# Only add hooks if MAGIC_SLASH_PORT is set (running in Magic Slash terminal)
if [[ -n "$MAGIC_SLASH_PORT" ]]; then
  autoload -Uz add-zsh-hook
  add-zsh-hook preexec _magic_slash_preexec
  add-zsh-hook precmd _magic_slash_precmd
fi
`

// Bash hook script
const BASH_SCRIPT = `
_magic_slash_preexec() {
  # Skip if no command or already in hook
  [[ -z "$BASH_COMMAND" || -n "$_MAGIC_SLASH_IN_HOOK" ]] && return

  # Skip the precmd call itself
  [[ "$BASH_COMMAND" == *"_magic_slash_precmd"* ]] && return

  _MAGIC_SLASH_IN_HOOK=1
  local cmd="$BASH_COMMAND"
  # URL encode the command for safe transmission
  local encoded_cmd=$(printf '%s' "$cmd" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))" 2>/dev/null || printf '%s' "$cmd" | sed 's/ /%20/g; s/"/%22/g; s/#/%23/g; s/&/%26/g; s/=/%3D/g; s/?/%3F/g')
  curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/command/start?id=$MAGIC_SLASH_TERMINAL_ID&cmd=$encoded_cmd" > /dev/null 2>&1 &
  unset _MAGIC_SLASH_IN_HOOK
}

_magic_slash_precmd() {
  local exit_code=$?
  curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/command/end?id=$MAGIC_SLASH_TERMINAL_ID&exit=$exit_code" > /dev/null 2>&1 &
}

# Only add hooks if MAGIC_SLASH_PORT is set (running in Magic Slash terminal)
if [[ -n "$MAGIC_SLASH_PORT" ]]; then
  trap '_magic_slash_preexec' DEBUG
  PROMPT_COMMAND="_magic_slash_precmd\${PROMPT_COMMAND:+;\$PROMPT_COMMAND}"
fi
`

function getMagicSlashDir(): string {
  return path.join(os.homedir(), '.magic-slash', 'shell')
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function writeScripts(): void {
  const shellDir = getMagicSlashDir()
  ensureDir(shellDir)

  // Write zsh script
  const zshPath = path.join(shellDir, 'zsh-integration.zsh')
  fs.writeFileSync(zshPath, ZSH_SCRIPT.trim() + '\n', 'utf-8')

  // Write bash script
  const bashPath = path.join(shellDir, 'bash-integration.bash')
  fs.writeFileSync(bashPath, BASH_SCRIPT.trim() + '\n', 'utf-8')
}

function getSourceLine(shell: 'zsh' | 'bash'): string {
  const shellDir = getMagicSlashDir()
  const scriptName = shell === 'zsh' ? 'zsh-integration.zsh' : 'bash-integration.bash'
  return `source "${path.join(shellDir, scriptName)}"`
}

function addToRcFile(rcFile: string, shell: 'zsh' | 'bash'): void {
  const rcPath = path.join(os.homedir(), rcFile)
  const sourceLine = getSourceLine(shell)

  // Create file if it doesn't exist
  if (!fs.existsSync(rcPath)) {
    fs.writeFileSync(rcPath, '', 'utf-8')
  }

  const content = fs.readFileSync(rcPath, 'utf-8')

  // Check if already installed
  if (content.includes(MAGIC_SLASH_MARKER)) {
    return
  }

  // Add the sourcing block
  const block = `
${MAGIC_SLASH_MARKER}
${sourceLine}
${MAGIC_SLASH_END_MARKER}
`

  fs.writeFileSync(rcPath, content + block, 'utf-8')
}

function removeFromRcFile(rcFile: string): void {
  const rcPath = path.join(os.homedir(), rcFile)

  if (!fs.existsSync(rcPath)) {
    return
  }

  let content = fs.readFileSync(rcPath, 'utf-8')

  // Remove the block if it exists
  const startIndex = content.indexOf(MAGIC_SLASH_MARKER)
  if (startIndex === -1) {
    return
  }

  const endIndex = content.indexOf(MAGIC_SLASH_END_MARKER)
  if (endIndex === -1) {
    return
  }

  // Remove from just before the marker to just after the end marker (including newline)
  const beforeBlock = content.substring(0, startIndex).trimEnd()
  const afterBlock = content.substring(endIndex + MAGIC_SLASH_END_MARKER.length).trimStart()

  content = beforeBlock + (afterBlock ? '\n' + afterBlock : '')

  fs.writeFileSync(rcPath, content, 'utf-8')
}

export function installShellIntegration(): void {
  try {
    // Write the shell scripts
    writeScripts()

    // Add to shell rc files
    addToRcFile('.zshrc', 'zsh')
    addToRcFile('.bashrc', 'bash')
  } catch (error) {
    console.error('[Shell Integration] Failed to install:', error)
  }
}

export function uninstallShellIntegration(): void {
  try {
    // Remove from shell rc files
    removeFromRcFile('.zshrc')
    removeFromRcFile('.bashrc')

    // Remove scripts directory
    const shellDir = getMagicSlashDir()
    if (fs.existsSync(shellDir)) {
      fs.rmSync(shellDir, { recursive: true })
    }
  } catch (error) {
    console.error('[Shell Integration] Failed to uninstall:', error)
  }
}
