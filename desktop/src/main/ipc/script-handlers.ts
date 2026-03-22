import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { getNodeActivationPrefix } from '../pty/node-version'
import type { PackageManager, ScriptCategory, PackageScript, ProjectScripts } from '../../types'

let getMainWindow: () => BrowserWindow | null

// Track running script processes
const scriptProcesses = new Map<string, ChildProcess>()

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

function getDefaultShell(): string {
  if (process.platform === 'win32') return process.env.COMSPEC || 'cmd.exe'
  return process.env.SHELL || '/bin/zsh'
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

  ipcMain.handle('scripts:run', async (_event, { repoPath, scriptName, packageManager, agentId: _agentId, agentName: _agentName }: {
    repoPath: string
    scriptName: string
    packageManager: string
    agentId: string
    agentName: string
  }) => {
    const id = `script-${Date.now()}`
    const mainWindow = getMainWindow()

    const runCommand = packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`
    const nodePrefix = getNodeActivationPrefix(repoPath)
    const fullCommand = nodePrefix ? `${nodePrefix} && ${runCommand}` : runCommand

    const shell = getDefaultShell()
    const proc = spawn(shell, ['-lc', fullCommand], {
      cwd: repoPath,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    scriptProcesses.set(id, proc)

    proc.on('close', (exitCode) => {
      scriptProcesses.delete(id)
      if (mainWindow) {
        mainWindow.webContents.send('terminal:exit', { id, exitCode: exitCode ?? 1 })
      }
    })

    return { id }
  })

  ipcMain.handle('scripts:stop', async (_event, { id }: { id: string }) => {
    const proc = scriptProcesses.get(id)
    if (proc) {
      proc.kill('SIGTERM')
      scriptProcesses.delete(id)
    }
  })
}
