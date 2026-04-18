import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { HistoryEntry, HistoryAction } from '../../types'
import { CONFIG_DIR } from './config'

const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json')
const MAX_ENTRIES = 500

export function readHistory(): HistoryEntry[] {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return []
    }
    const content = fs.readFileSync(HISTORY_FILE, 'utf8')
    const data = JSON.parse(content)
    if (!Array.isArray(data)) {
      return []
    }
    return data
  } catch (error) {
    console.error('Error reading activity history:', error)
    return []
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2))
  } catch (error) {
    console.error('Error writing activity history:', error)
  }
}

export function addHistoryEntry(params: {
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
}): HistoryEntry {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    agentId: params.agentId,
    agentName: params.agentName,
    action: params.action,
    ticketId: params.ticketId,
    description: params.description,
    repositories: params.repositories,
    timestamp: Date.now(),
  }

  const entries = readHistory()
  entries.push(entry)

  // Purge oldest entries if over the limit
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES)
  }

  writeHistory(entries)
  return entry
}

export function clearHistory(): void {
  writeHistory([])
}
