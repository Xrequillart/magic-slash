import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const MAGIC_SLASH_HOOK_MARKER = 'magic-slash-desktop'

// StatusLine integration: a wrapper script captures Claude Code's statusline JSON
// (cost, context usage, model) and POSTs it to the local status server, then relays
// the user's original statusline so nothing is lost.
const MAGIC_SLASH_CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')
const STATUSLINE_SCRIPT_PATH = path.join(MAGIC_SLASH_CONFIG_DIR, 'statusline.sh')
const STATUSLINE_BACKUP_PATH = path.join(MAGIC_SLASH_CONFIG_DIR, 'statusline-original.json')
const STATUSLINE_MARKER = 'magic-slash/statusline.sh'

// Wrap a string as a safe single-quoted POSIX shell literal.
function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

// Build the statusLine wrapper. The user's original command is baked in as the
// fallback so a plain `claude` session started OUTSIDE the desktop app (where
// MAGIC_SLASH_INNER_STATUSLINE is not injected) still renders the user's own
// statusline. Inside the app the env var takes precedence.
function buildStatusLineScript(innerCommand: string): string {
  const baked = shSingleQuote(innerCommand)
  return `#!/usr/bin/env bash
# Managed by Magic Slash Desktop — captures Claude Code usage for the app sidebar.
input=$(cat)
if [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && [ -n "$MAGIC_SLASH_PORT" ]; then
  printf '%s' "$input" | curl -s -X POST --data-binary @- \\
    "http://127.0.0.1:$MAGIC_SLASH_PORT/usage?id=$MAGIC_SLASH_TERMINAL_ID" >/dev/null 2>&1 || true
fi
# Relay the user's original statusline. The env var (set by the desktop app) wins;
# otherwise fall back to the command baked in at configuration time.
INNER=\${MAGIC_SLASH_INNER_STATUSLINE:-${baked}}
if [ -n "$INNER" ]; then
  printf '%s' "$input" | eval "$INNER"
fi
`
}

interface StatusLineConfig {
  type?: string
  command?: string
  [key: string]: unknown
}

function isMagicSlashStatusLine(sl: StatusLineConfig | undefined): boolean {
  return typeof sl?.command === 'string' && sl.command.includes(STATUSLINE_MARKER)
}
const MAGIC_SLASH_PERMISSIONS = [
  // Desktop communication
  'Bash(*http://127.0.0.1:*)',
  // GitHub MCP tools
  'mcp__github__get_issue',
  'mcp__github__add_issue_comment',
  'mcp__github__update_issue',
  'mcp__github__list_pull_requests',
  'mcp__github__get_pull_request',
  'mcp__github__get_pull_request_files',
  'mcp__github__get_pull_request_comments',
  'mcp__github__get_pull_request_reviews',
  'mcp__github__create_pull_request',
  'mcp__github__create_pull_request_review',
  // Atlassian MCP tools
  'mcp__atlassian__getAccessibleAtlassianResources',
  'mcp__atlassian__getJiraIssue',
  'mcp__atlassian__getTransitionsForJiraIssue',
  'mcp__atlassian__transitionJiraIssue',
  'mcp__atlassian__addCommentToJiraIssue',
  // Common Bash commands used by skills
  'Bash(git *)',
  'Bash(npm *)',
  'Bash(yarn *)',
  'Bash(pnpm *)',
  'Bash(bun *)',
  'Bash(jq *)',
  'Bash(gh *)',
]

const MAGIC_SLASH_PERMISSION_MARKERS = [
  '127.0.0.1',
  'mcp__github__',
  'mcp__atlassian__',
  'Bash(git ',
  'Bash(npm ',
  'Bash(yarn ',
  'Bash(pnpm ',
  'Bash(bun ',
  'Bash(jq ',
  'Bash(gh ',
]

function isMagicSlashPermission(perm: string): boolean {
  return MAGIC_SLASH_PERMISSION_MARKERS.some(marker => perm.includes(marker))
}

interface HookConfig {
  matcher?: Record<string, unknown>
  hooks: Array<{
    type: string
    command: string
  }>
}

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfig[]
    PostToolUse?: HookConfig[]
    Notification?: HookConfig[]
    Stop?: HookConfig[]
    [key: string]: HookConfig[] | undefined
  }
  permissions?: {
    allow?: string[]
    deny?: string[]
  }
  statusLine?: StatusLineConfig
  [key: string]: unknown
}

function getHookConfig(event: string): HookConfig {
  // Use curl to notify our status server
  // The command uses environment variables set by Magic Slash Desktop:
  // - MAGIC_SLASH_TERMINAL_ID: The terminal ID
  // - MAGIC_SLASH_PORT: The port of the status server
  // This allows hooks to be installed once and work with any instance
  let state: string
  switch (event) {
    case 'UserPromptSubmit':
      state = 'working' // User sent a message, Claude starts processing
      break
    case 'PreToolUse':
      state = 'working'
      break
    case 'PostToolUse':
      state = 'working' // Still working after tool completes (may use more tools)
      break
    case 'Notification':
      state = 'waiting' // Claude needs user attention
      break
    case 'Stop':
      state = 'completed' // Claude finished responding
      break
    case 'SessionStart':
      state = 'idle' // Session started, waiting for input
      break
    default:
      state = 'working'
  }

  const command = `[ -n "$MAGIC_SLASH_TERMINAL_ID" ] && [ -n "$MAGIC_SLASH_PORT" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/status?id=$MAGIC_SLASH_TERMINAL_ID&state=${state}" > /dev/null 2>&1 || true # ${MAGIC_SLASH_HOOK_MARKER}`

  return {
    hooks: [{
      type: 'command',
      command
    }]
  }
}

function isMagicSlashHook(hookConfig: HookConfig): boolean {
  return hookConfig.hooks?.some(h => h.command?.includes(MAGIC_SLASH_HOOK_MARKER)) ?? false
}

export function configureClaudeHooks(): void {
  try {
    // Ensure .claude directory exists
    const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH)
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true })
    }

    // Read existing settings or create new
    let settings: ClaudeSettings = {}
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
      try {
        settings = JSON.parse(content)
      } catch {
        // If JSON is invalid, start fresh but backup the old file
        const backupPath = `${CLAUDE_SETTINGS_PATH}.backup.${Date.now()}`
        fs.copyFileSync(CLAUDE_SETTINGS_PATH, backupPath)
        console.log(`Backed up invalid settings to ${backupPath}`)
      }
    }

    // Initialize hooks object if needed
    if (!settings.hooks) {
      settings.hooks = {}
    }

    // Events we want to hook into
    const hookEvents = [
      'UserPromptSubmit', // User sends a message → working
      'PreToolUse',       // Before tool use → working
      'PostToolUse',      // After tool use → working
      'Notification',     // Claude needs attention → waiting
      'Stop',             // Claude finished → idle
      'SessionStart',     // Session started → idle
    ]

    for (const event of hookEvents) {
      // Initialize array if needed
      if (!settings.hooks[event]) {
        settings.hooks[event] = []
      }

      // Remove any existing Magic Slash hooks (to update them)
      settings.hooks[event] = settings.hooks[event]!.filter(hook => !isMagicSlashHook(hook))

      // Add our hook
      settings.hooks[event]!.push(getHookConfig(event))
    }

    // Configure permissions for magic-slash skills (MCP tools + common commands)
    if (!settings.permissions) {
      settings.permissions = { allow: [] }
    }
    if (!settings.permissions.allow) {
      settings.permissions.allow = []
    }
    // Remove old magic-slash permissions (to update them if list changed)
    settings.permissions.allow = settings.permissions.allow.filter(
      (p: string) => !isMagicSlashPermission(p)
    )
    settings.permissions.allow.push(...MAGIC_SLASH_PERMISSIONS)

    // Write back settings
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code hooks configured successfully')
  } catch (error) {
    console.error('Failed to configure Claude Code hooks:', error)
  }
}

/**
 * Configure Claude Code's statusLine to point at our capture wrapper, preserving any
 * pre-existing user statusLine (chained via MAGIC_SLASH_INNER_STATUSLINE).
 * Returns the user's original statusLine command to chain (empty string if none).
 */
export function configureStatusLine(): string {
  try {
    // Ensure config dir exists
    if (!fs.existsSync(MAGIC_SLASH_CONFIG_DIR)) {
      fs.mkdirSync(MAGIC_SLASH_CONFIG_DIR, { recursive: true })
    }

    const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH)
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true })
    }

    let settings: ClaudeSettings = {}
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      try {
        settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'))
      } catch {
        // Leave settings empty; configureClaudeHooks handles backup of invalid files
      }
    }

    const existing = settings.statusLine
    let inner = ''

    if (existing && !isMagicSlashStatusLine(existing)) {
      // First time we take over: back up the user's original statusLine and chain it.
      // The backup MUST succeed before we overwrite — otherwise a later uninstall
      // could not restore the original and would silently drop the user's config.
      inner = typeof existing.command === 'string' ? existing.command : ''
      try {
        fs.writeFileSync(STATUSLINE_BACKUP_PATH, JSON.stringify(existing))
      } catch (e) {
        throw new Error('Failed to back up original statusLine; aborting to avoid data loss', { cause: e })
      }
    } else if (existing && isMagicSlashStatusLine(existing)) {
      // Already ours: recover the original command from the backup to keep chaining
      inner = readBackupStatusLineCommand()
    } else {
      // No statusLine configured: record "none" so uninstall removes ours cleanly
      try {
        fs.writeFileSync(STATUSLINE_BACKUP_PATH, 'null')
      } catch {
        // non-fatal
      }
    }

    // Write the wrapper script (executable) with the original command baked in as
    // the fallback, so it works even outside the desktop app.
    fs.writeFileSync(STATUSLINE_SCRIPT_PATH, buildStatusLineScript(inner), { mode: 0o755 })
    // Re-assert mode in case the file already existed with different perms
    fs.chmodSync(STATUSLINE_SCRIPT_PATH, 0o755)

    settings.statusLine = {
      type: 'command',
      command: `bash ${STATUSLINE_SCRIPT_PATH}`,
    }

    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code statusLine configured successfully')
    return inner
  } catch (error) {
    console.error('Failed to configure Claude Code statusLine:', error)
    return ''
  }
}

function readBackupStatusLineCommand(): string {
  try {
    if (!fs.existsSync(STATUSLINE_BACKUP_PATH)) return ''
    const raw = fs.readFileSync(STATUSLINE_BACKUP_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as StatusLineConfig | null
    return typeof parsed?.command === 'string' ? parsed.command : ''
  } catch {
    return ''
  }
}

function restoreStatusLine(settings: ClaudeSettings): void {
  if (!isMagicSlashStatusLine(settings.statusLine)) {
    return
  }
  let restored: StatusLineConfig | null = null
  try {
    if (fs.existsSync(STATUSLINE_BACKUP_PATH)) {
      restored = JSON.parse(fs.readFileSync(STATUSLINE_BACKUP_PATH, 'utf-8'))
    }
  } catch {
    restored = null
  }
  if (restored && typeof restored === 'object') {
    settings.statusLine = restored
  } else {
    delete settings.statusLine
  }
  try {
    if (fs.existsSync(STATUSLINE_BACKUP_PATH)) {
      fs.unlinkSync(STATUSLINE_BACKUP_PATH)
    }
  } catch {
    // non-fatal
  }
}

export function removeClaudeHooks(): void {
  try {
    if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      return
    }

    const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
    const settings: ClaudeSettings = JSON.parse(content)

    // Restore the user's original statusLine (or remove ours if they had none)
    restoreStatusLine(settings)

    // Remove Magic Slash hooks from all events
    if (settings.hooks) {
      for (const event of Object.keys(settings.hooks)) {
        if (Array.isArray(settings.hooks[event])) {
          settings.hooks[event] = settings.hooks[event]!.filter(hook => !isMagicSlashHook(hook))
          // Remove empty arrays
          if (settings.hooks[event]!.length === 0) {
            delete settings.hooks[event]
          }
        }
      }

      // Remove empty hooks object
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks
      }
    }

    // Remove Magic Slash permissions
    if (settings.permissions?.allow) {
      settings.permissions.allow = settings.permissions.allow.filter(
        (p: string) => !isMagicSlashPermission(p)
      )
      if (settings.permissions.allow.length === 0) {
        delete settings.permissions.allow
      }
      if (settings.permissions && Object.keys(settings.permissions).length === 0) {
        delete settings.permissions
      }
    }

    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code hooks removed')
  } catch (error) {
    console.error('Failed to remove Claude Code hooks:', error)
  }
}
