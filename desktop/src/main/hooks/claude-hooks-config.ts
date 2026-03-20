import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const MAGIC_SLASH_HOOK_MARKER = 'magic-slash-desktop'
const MAGIC_SLASH_PERMISSION = 'Bash(*http://127.0.0.1:*)'

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

    // Configure permissions for curl to localhost (auto-allow)
    if (!settings.permissions) {
      settings.permissions = { allow: [] }
    }
    if (!settings.permissions.allow) {
      settings.permissions.allow = []
    }
    // Remove old magic-slash permissions (to update them if pattern changed)
    settings.permissions.allow = settings.permissions.allow.filter(
      (p: string) => !p.includes('127.0.0.1')
    )
    settings.permissions.allow.push(MAGIC_SLASH_PERMISSION)

    // Write back settings
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code hooks configured successfully')
  } catch (error) {
    console.error('Failed to configure Claude Code hooks:', error)
  }
}

export function removeClaudeHooks(): void {
  try {
    if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      return
    }

    const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
    const settings: ClaudeSettings = JSON.parse(content)

    if (!settings.hooks) {
      return
    }

    // Remove Magic Slash hooks from all events
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

    // Remove Magic Slash permissions
    if (settings.permissions?.allow) {
      settings.permissions.allow = settings.permissions.allow.filter(
        (p: string) => !p.includes('127.0.0.1')
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
