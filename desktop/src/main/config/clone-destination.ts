import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { CONFIG_DIR } from './paths'
import { expandPath } from './validation'

/**
 * Where `repo:clone` puts the clones it makes.
 *
 * A machine preference, not a repository setting and not something the org gets a
 * say in — which is why it lives in its own small file next to the other local
 * state (command-history.json) rather than in the config blob that syncs to the
 * cloud. One value for the whole app: the point is that the invitee chooses a
 * parent folder ONCE and every subsequent clone lands next to the first.
 */
function destinationFile(): string {
  return path.join(CONFIG_DIR, 'clone-destination.json')
}

interface CloneDestinationData {
  destination?: string
}

/**
 * The default parent folder, `~/dev`.
 *
 * A guess, deliberately: it is the most common name for the folder people keep
 * their checkouts in, and being wrong costs one click on "Change". Having no
 * default at all would cost a folder picker before the very first clone, which is
 * the friction this whole feature removes.
 */
export function defaultCloneDestination(): string {
  return path.join(os.homedir(), 'dev')
}

/**
 * The remembered destination, or the default.
 *
 * Tolerant of a missing or corrupt file on purpose: this is a convenience
 * preference, and refusing to clone because a JSON file got truncated would be a
 * spectacularly bad trade. Anything unreadable simply reverts to the default.
 *
 * Expanded on the way out, like every other path the main process consumes: a
 * file holding `~/dev` — hand-edited, or restored from another machine — would
 * otherwise have `mkdirSync` create a literal `~` folder and clone into it.
 */
export function getCloneDestination(): string {
  try {
    const file = destinationFile()
    if (!fs.existsSync(file)) return defaultCloneDestination()
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as CloneDestinationData
    const destination = data?.destination
    return typeof destination === 'string' && destination.trim() !== ''
      ? expandPath(destination)
      : defaultCloneDestination()
  } catch (error) {
    console.error('Error reading clone destination:', error)
    return defaultCloneDestination()
  }
}

/** Remember `destination` for the next clone. Blank resets to the default. */
export function setCloneDestination(destination: string): string {
  const value = destination.trim()
  const resolved = value === '' ? defaultCloneDestination() : expandPath(value)
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(destinationFile(), JSON.stringify({ destination: resolved }, null, 2))
  } catch (error) {
    // The clone that follows still works — it just won't be remembered.
    console.error('Error writing clone destination:', error)
  }
  return resolved
}
