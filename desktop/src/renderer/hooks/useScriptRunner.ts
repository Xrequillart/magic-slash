import { useCallback } from 'react'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import type { ScriptTerminalInfo } from '../../types'

// Strip ANSI escape codes from terminal output
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

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

    const { scriptTerminals, removeScriptTerminal, updateScriptTerminalState, setActiveTerminal } = useStore.getState()
    const script = scriptTerminals.find(s => s.id === id)

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

    if (exitCode === 0) {
      removeScriptTerminal(id)
      if (script) {
        showToast(`"${script.scriptName}" finished successfully${testInfo}`)
        setActiveTerminal(script.agentId)
      }
    } else {
      updateScriptTerminalState(id, 'error')
      if (script) {
        showToast(`"${script.scriptName}" failed${testInfo}`, 'error')
      }
    }
  })
}

export function useScriptRunner() {
  const { scriptTerminals, addScriptTerminal, removeScriptTerminal, setActiveTerminal } = useStore()

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

    addScriptTerminal(script)
    setActiveTerminal(id)
  }, [addScriptTerminal, setActiveTerminal])

  const stopScript = useCallback(async (id: string) => {
    // Find the agent that launched this script to switch back to it
    const script = scriptTerminals.find(s => s.id === id)
    const agentId = script?.agentId
    await window.electronAPI.scripts.stop(id)
    removeScriptTerminal(id)
    if (agentId) {
      setActiveTerminal(agentId)
    }
  }, [scriptTerminals, removeScriptTerminal, setActiveTerminal])

  return { scriptTerminals, runScript, stopScript }
}
