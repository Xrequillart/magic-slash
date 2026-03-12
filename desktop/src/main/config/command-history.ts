import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')
const HISTORY_FILE = path.join(CONFIG_DIR, 'command-history.json')
const MAX_COMMANDS_PER_REPO = 500

export interface CommandHistoryEntry {
  command: string
  timestamp: number
  count: number
}

interface CommandHistoryData {
  // Key is normalized repo path
  [repoPath: string]: CommandHistoryEntry[]
}

function normalizeRepoPath(repoPath: string): string {
  // Expand ~ and normalize path
  if (repoPath.startsWith('~')) {
    repoPath = path.join(os.homedir(), repoPath.slice(1))
  }
  return path.normalize(repoPath)
}

function readHistoryFile(): CommandHistoryData {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return {}
    }
    const content = fs.readFileSync(HISTORY_FILE, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading command history:', error)
    return {}
  }
}

function writeHistoryFile(data: CommandHistoryData): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing command history:', error)
  }
}

export function getCommandHistory(repoPath: string): CommandHistoryEntry[] {
  const normalizedPath = normalizeRepoPath(repoPath)
  const data = readHistoryFile()
  return data[normalizedPath] || []
}

export function addCommandToHistory(repoPath: string, command: string): void {
  // Don't save empty or whitespace-only commands
  const trimmedCommand = command.trim()
  if (!trimmedCommand) {
    return
  }

  const normalizedPath = normalizeRepoPath(repoPath)
  const data = readHistoryFile()

  if (!data[normalizedPath]) {
    data[normalizedPath] = []
  }

  const entries = data[normalizedPath]
  const existingIndex = entries.findIndex(e => e.command === trimmedCommand)

  if (existingIndex >= 0) {
    // Update existing entry
    entries[existingIndex].count++
    entries[existingIndex].timestamp = Date.now()
  } else {
    // Add new entry
    entries.push({
      command: trimmedCommand,
      timestamp: Date.now(),
      count: 1
    })
  }

  // Limit to MAX_COMMANDS_PER_REPO (remove oldest, least used first)
  if (entries.length > MAX_COMMANDS_PER_REPO) {
    // Sort by count (desc) then timestamp (desc), then remove from the end
    entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.timestamp - a.timestamp
    })
    data[normalizedPath] = entries.slice(0, MAX_COMMANDS_PER_REPO)
  }

  writeHistoryFile(data)
}

export function findBestMatch(repoPath: string, prefix: string): string | null {
  if (!prefix || !prefix.trim()) {
    return null
  }

  const normalizedPath = normalizeRepoPath(repoPath)
  const data = readHistoryFile()
  const entries = data[normalizedPath] || []

  // Find all commands that start with the prefix
  const matches = entries.filter(e =>
    e.command.startsWith(prefix) && e.command !== prefix
  )

  if (matches.length === 0) {
    return null
  }

  // Sort by frequency (count) first, then by recency (timestamp)
  matches.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.timestamp - a.timestamp
  })

  return matches[0].command
}

export function clearCommandHistory(repoPath: string): void {
  const normalizedPath = normalizeRepoPath(repoPath)
  const data = readHistoryFile()
  delete data[normalizedPath]
  writeHistoryFile(data)
}

export function getLastCommand(repoPath: string): string | null {
  const normalizedPath = normalizeRepoPath(repoPath)
  const data = readHistoryFile()
  const entries = data[normalizedPath] || []

  if (entries.length === 0) {
    return null
  }

  // Sort by timestamp (most recent first)
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)
  return sorted[0].command
}
