import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createTerminal, killTerminal, writeToTerminal } from '../pty/terminal-manager'
import { getNodeActivationPrefix } from '../pty/node-version'
import type { PackageManager, ScriptCategory, PackageScript, ProjectScripts } from '../../types'

let getMainWindow: () => BrowserWindow | null

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

    createTerminal(
      id,
      `${scriptName} (${agentName})`,
      repoPath,
      (data) => {
        if (mainWindow) {
          mainWindow.webContents.send('terminal:data', { id, data })
        }
      },
      () => {},
      (exitCode) => {
        if (mainWindow) {
          mainWindow.webContents.send('terminal:exit', { id, exitCode })
        }
      }
    )

    // Write the run command with `exec` so the shell is replaced by the command.
    // When the command exits (including via Ctrl+C), the PTY exits and terminal:exit fires.
    const runCommand = packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`
    const nodePrefix = getNodeActivationPrefix(repoPath)
    const fullCommand = nodePrefix ? `${nodePrefix} && exec ${runCommand}` : `exec ${runCommand}`
    // Small delay to let the shell initialize
    setTimeout(() => {
      writeToTerminal(id, `${fullCommand}\r`)
    }, 500)

    return { id }
  })

  ipcMain.handle('scripts:stop', async (_event, { id }: { id: string }) => {
    killTerminal(id)
  })
}
