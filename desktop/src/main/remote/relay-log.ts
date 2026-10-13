import * as fs from 'fs'
import * as path from 'path'
import { CONFIG_DIR } from '../config/paths'

// What the relay went through, one timestamped line per event, in
// ~/.config/magic-slash/relay-events.log: joins, drops, presence of the phones, sends the
// server refused. The app keeps no other log on disk, and a relay that drops for a few
// seconds leaves no other trace. Never a key, a box or a payload: only states and ids.

const FILE = path.join(CONFIG_DIR, 'relay-events.log')
/** Past this, the log moves to `.old` and starts again: two files at most. */
const MAX_BYTES = 256 * 1024

export function logRelayEvent(event: string): void {
  try {
    if (fs.existsSync(FILE) && fs.statSync(FILE).size > MAX_BYTES) fs.renameSync(FILE, `${FILE}.old`)
    fs.appendFileSync(FILE, `${new Date().toISOString()} ${event}\n`)
  } catch {
    // A log that cannot be written is not worth breaking the relay over.
  }
}
