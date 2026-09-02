import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createTerminal, getTerminal, killTerminal, writeToTerminal } from '../pty/terminal-manager'
import { getNodeActivationPrefix } from '../pty/node-version'
import { createServerUrlScanner, serverUrlPort } from '../../server-url'
import { listeningPorts, listeningPortsOwnedBy } from '../listening-ports'
import type { PackageManager, ScriptCategory, PackageScript, ProjectScripts } from '../../types'

let getMainWindow: () => BrowserWindow | null

/**
 * One output scanner per running script, keyed by terminal id.
 *
 * The scanner stays for the life of the script rather than being dropped at the first
 * hit: a `dev:local` starting an API and a front end announces them one after the
 * other, sometimes seconds apart. Its own budget retires it (see MAX_CANDIDATES in
 * server-url.ts) without removing the entry, which makes presence in this map the
 * answer to "is that script still running" — what `confirmServerUrl` checks before
 * announcing anything. Both ways a script ends — the process exiting, the user
 * stopping it — delete the entry, and that is also what stops this map growing over a
 * session.
 */
const urlScanners = new Map<string, (chunk: string) => string[]>()

/**
 * When a candidate port is asked again whether the script has opened it yet.
 *
 * A script prints the URL it INTENDS to serve on long before it can: `dev:local`
 * announces its API in the first line and takes another twenty seconds to migrate a
 * database and bind. A three-second window wrote exactly that server off — the one the
 * person was waiting for — so this one runs for a minute, backing off as it goes, and
 * costs nothing once the address is confirmed.
 */
const CONFIRM_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000]

/**
 * The ports already taken when a script launched, per script.
 *
 * The other half of "did THIS script open that port": a stale server from a previous
 * run answers a connection exactly like the real one, and this is what tells them
 * apart. Snapshotted once at launch and dropped with the script.
 */
const portsAtLaunch = new Map<string, Set<number>>()

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Announce `url` to the renderer, but only once the script has actually opened its port.
 *
 * The scanner reports every local URL a script prints, which includes the ones it only
 * TALKS about — the API it proxies to, an allowed origin, a health check it waits on.
 * Those produce a card that opens on connection-refused, which is worse than no card.
 *
 * "Something is listening" alone does not settle it either: a stale process from an
 * earlier run answers just as well. So the port has to be listening AND either held by
 * this script's own process tree, or free at the moment the script launched — the second
 * clause being what covers a server the script starts at arm's length, in a container or
 * a daemon it does not own. See `main/listening-ports.ts`.
 */
async function confirmServerUrl(id: string, url: string): Promise<void> {
  const port = serverUrlPort(url)
  if (!port) return

  for (const delay of CONFIRM_DELAYS_MS) {
    if (delay) await wait(delay)
    // Re-checked at every step: the script may have exited or been stopped while this
    // waited, and its card is already gone.
    if (!urlScanners.has(id)) return

    const pid = getTerminal(id)?.pty.pid
    if (pid && (await listeningPortsOwnedBy(pid)).has(port)) {
      getMainWindow()?.webContents.send('scripts:serverUrl', { id, url })
      return
    }

    // Absent rather than empty means the launch snapshot has not landed yet, and an
    // unknown baseline must not read as "nothing was listening" — that clause would
    // then wave through any port at all. Waiting for the next attempt costs a second.
    const taken = portsAtLaunch.get(id)
    if (taken && !taken.has(port) && (await listeningPorts()).has(port)) {
      getMainWindow()?.webContents.send('scripts:serverUrl', { id, url })
      return
    }
  }
}

/**
 * Watch one script's output for the addresses it serves on, and tell the renderer about
 * each one once it has been confirmed.
 *
 * Done here rather than in the renderer because this is where the chunks already are:
 * the alternative is a second global `terminal:data` listener that wakes on every
 * keystroke of every agent terminal to look for something only a script can print.
 */
function scanForServerUrls(id: string, data: string): void {
  const scan = urlScanners.get(id)
  if (!scan) return

  for (const url of scan(data)) {
    // Not awaited, on purpose: this runs inside the PTY's data callback, and a probe
    // that retries for three seconds must not hold up the terminal's own output.
    void confirmServerUrl(id, url)
  }
}

function detectPackageManager(repoPath: string): PackageManager {
  if (fs.existsSync(path.join(repoPath, 'bun.lockb')) || fs.existsSync(path.join(repoPath, 'bun.lock'))) return 'bun'
  if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function categorizeScript(name: string): ScriptCategory {
  if (/^(dev|start|serve|watch)/.test(name)) return 'dev'
  if (/^(build|compile)/.test(name)) return 'build'
  if (/^(test|spec|e2e)/.test(name)) return 'test'
  if (/^(lint|format|prettier|eslint)/.test(name)) return 'lint'
  return 'other'
}

export function setupScriptHandlers(mainWindowGetter: () => BrowserWindow | null) {
  getMainWindow = mainWindowGetter

  ipcMain.handle('scripts:getProjectScripts', async (_event, { repoPath }: { repoPath: string }) => {
    const pkgPath = path.join(repoPath, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      return { packageManager: 'npm', scripts: [] } as ProjectScripts
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const rawScripts = pkg.scripts || {}
    const packageManager = detectPackageManager(repoPath)

    const scripts: PackageScript[] = Object.entries(rawScripts).map(([name, command]) => ({
      name,
      command: command as string,
      category: categorizeScript(name),
    }))

    return { packageManager, scripts } as ProjectScripts
  })

  ipcMain.handle('scripts:run', async (_event, { repoPath, scriptName, packageManager, agentId: _agentId, agentName }: {
    repoPath: string
    scriptName: string
    packageManager: string
    agentId: string
    agentName: string
  }) => {
    const id = `script-${Date.now()}`
    const mainWindow = getMainWindow()
    urlScanners.set(id, createServerUrlScanner())
    // Taken BEFORE the shell is spawned, so nothing this script opens can already be in
    // it. Not awaited: the first URL cannot be printed for another half-second, and the
    // confirmation reads this map only when it has one to check.
    void listeningPorts().then((ports) => {
      if (urlScanners.has(id)) portsAtLaunch.set(id, ports)
    })

    try {
      createTerminal(
        id,
        `${scriptName} (${agentName})`,
        repoPath,
        (data) => {
          scanForServerUrls(id, data)
          if (mainWindow) {
            mainWindow.webContents.send('terminal:data', { id, data })
          }
        },
        () => {},
        (exitCode) => {
          urlScanners.delete(id)
          portsAtLaunch.delete(id)
          if (mainWindow) {
            mainWindow.webContents.send('terminal:exit', { id, exitCode })
          }
        },
        undefined, undefined, undefined, undefined,
        { loginShell: false }
      )
    } catch (error) {
      console.error('[Scripts] Failed to create terminal:', error)
      urlScanners.delete(id)
      portsAtLaunch.delete(id)
      return { id: null, error: (error as Error).message }
    }

    // Write the run command with `exec` so the shell is replaced by the command.
    // When the command exits (including via Ctrl+C), the PTY exits and terminal:exit fires.
    const runCommand = packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`
    const nodePrefix = getNodeActivationPrefix(repoPath)
    const fullCommand = nodePrefix ? `${nodePrefix} && exec ${runCommand}` : `exec ${runCommand}`
    // Small delay to let the shell initialize
    setTimeout(() => {
      try {
        writeToTerminal(id, `${fullCommand}\r`)
      } catch (error) {
        console.error('[Scripts] Failed to write to terminal:', error)
      }
    }, 500)

    return { id }
  })

  ipcMain.handle('scripts:stop', async (_event, { id }: { id: string }) => {
    urlScanners.delete(id)
    portsAtLaunch.delete(id)
    killTerminal(id)
  })
}
