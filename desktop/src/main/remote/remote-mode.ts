import * as fs from 'fs'
import * as path from 'path'
import { CONFIG_DIR } from '../config/paths'

/**
 * Remote mode (#352, PROTOCOL.md §9): whether this Mac relays its agents to paired phones.
 *
 * A MACHINE preference, deliberately kept out of the synced settings: turning it on makes
 * this particular Mac publish, and a switch flipped on the web app or on another machine must
 * never start a relay on a Mac nobody is sitting at. So it lives in its own small file next
 * to the other local state (clone-destination.json), and nothing here touches the cloud.
 *
 * OFF by default, and off whenever the file says anything other than `enabled: true`: an
 * unreadable file must fail closed, never into publishing.
 */
function modeFile(): string {
  return path.join(CONFIG_DIR, 'remote-mode.json')
}

interface RemoteModeData {
  enabled?: unknown
}

/** Whether remote mode is on. Tolerant: a missing or corrupt file reads as off. */
export function isRemoteModeEnabled(): boolean {
  try {
    const file = modeFile()
    if (!fs.existsSync(file)) return false
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as RemoteModeData
    return data?.enabled === true
  } catch (error) {
    console.error('[remote] failed to read remote mode, treating it as off:', error)
    return false
  }
}

/**
 * Remember remote mode. Returns what is now in effect: a write that failed leaves the
 * previous value on disk, and the caller must not report a switch the next launch will undo.
 */
export function setRemoteModeEnabled(enabled: boolean): boolean {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(modeFile(), JSON.stringify({ enabled }, null, 2))
    return enabled
  } catch (error) {
    console.error('[remote] failed to write remote mode:', error)
    return isRemoteModeEnabled()
  }
}
