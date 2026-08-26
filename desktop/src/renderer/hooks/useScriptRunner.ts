import { useCallback } from 'react'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import type { ScriptTerminalInfo } from '../../types'
// Shared with the main process (menu bar panel previews) — see src/strip-ansi.ts.
import { stripAnsi } from '../../strip-ansi'

// Parse test results from terminal output (Vitest, Jest, Mocha)
function parseTestResults(buffer: string): { passed: number; failed: number; total: number } | null {
  const clean = stripAnsi(buffer)

  // Vitest: "Tests  36 passed (36)" or "Tests  5 failed | 31 passed (36)"
  const vitestMatch = clean.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed\s*\((\d+)\)/)
  if (vitestMatch) {
    const failed = vitestMatch[1] ? parseInt(vitestMatch[1]) : 0
    const passed = parseInt(vitestMatch[2])
    const total = parseInt(vitestMatch[3])
    return { passed, failed, total }
  }

  // Jest: "Tests:       5 failed, 31 passed, 36 total" or "Tests:       36 passed, 36 total"
  const jestMatch = clean.match(/Tests:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed,\s+(\d+)\s+total/)
  if (jestMatch) {
    const failed = jestMatch[1] ? parseInt(jestMatch[1]) : 0
    const passed = parseInt(jestMatch[2])
    const total = parseInt(jestMatch[3])
    return { passed, failed, total }
  }

  // Mocha: "X passing" and optionally "Y failing"
  const mochaPassMatch = clean.match(/(\d+)\s+passing/)
  if (mochaPassMatch) {
    const passed = parseInt(mochaPassMatch[1])
    const mochaFailMatch = clean.match(/(\d+)\s+failing/)
    const failed = mochaFailMatch ? parseInt(mochaFailMatch[1]) : 0
    return { passed, failed, total: passed + failed }
  }

  return null
}

// Global listener registered once
let exitListenerRegistered = false

function registerExitListener() {
  if (exitListenerRegistered) return
  exitListenerRegistered = true

  window.electronAPI.terminal.onExit(async ({ id, exitCode }) => {
    if (!id.startsWith('script-')) return

    const { scriptTerminals, removeScriptTerminal, updateScriptTerminalState } = useStore.getState()
    const script = scriptTerminals.find(s => s.id === id)

    // Card first, buffer second. Only the failure toast's test counts need the buffer, so
    // awaiting that round trip before this would leave the card reading "running" — and
    // the dialog's Stop button armed — for as long as it takes to ship up to 100 KB.
    if (exitCode === 0) {
      removeScriptTerminal(id)
    } else {
      updateScriptTerminalState(id, 'error')
    }

    if (!script) return

    if (exitCode === 0) {
      // No buffer read: a clean exit keeps none (`main/pty/exited-buffer.ts`), so this
      // would be an IPC round trip guaranteed to answer null.
      showToast(`"${script.scriptName}" finished successfully`)
      return
    }

    // Try to parse test results from the terminal buffer
    let testInfo = ''
    try {
      const buffer = await window.electronAPI.terminal.getBuffer(id)
      if (buffer) {
        const results = parseTestResults(buffer)
        if (results) {
          testInfo = ` (${results.passed}/${results.total} passed)`
        }
      }
    } catch {
      // Buffer may already be gone, ignore
    }

    showToast(`"${script.scriptName}" failed${testInfo}`, 'error')
  })
}

export function useScriptRunner() {
  const { scriptTerminals, addScriptTerminal, removeScriptTerminal } = useStore()

  // Register the global exit listener once
  registerExitListener()

  const runScript = useCallback(async (
    repoPath: string,
    scriptName: string,
    packageManager: string,
    agentId: string,
    agentName: string
  ) => {
    const { id } = await window.electronAPI.scripts.run(repoPath, scriptName, packageManager, agentId, agentName)
    const fullCommand = packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`

    const script: ScriptTerminalInfo = {
      id,
      scriptName,
      fullCommand,
      agentId,
      agentName,
      projectPath: repoPath,
      state: 'running',
    }

    // No `setActiveTerminal`: launching a script must leave the main pane on the agent
    // that was already there. `ScriptTerminalModal` is where its output is read.
    addScriptTerminal(script)
  }, [addScriptTerminal])

  // Nothing to switch back to: the pane was never taken. Returning to the launching agent
  // would now steal it from whichever agent is being watched.
  const stopScript = useCallback(async (id: string) => {
    await window.electronAPI.scripts.stop(id)
    removeScriptTerminal(id)
  }, [removeScriptTerminal])

  return { scriptTerminals, runScript, stopScript }
}
