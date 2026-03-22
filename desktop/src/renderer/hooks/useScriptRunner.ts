import { useCallback } from 'react'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import type { ScriptTerminalInfo } from '../../types'

// Global listener registered once
let exitListenerRegistered = false

function registerExitListener() {
  if (exitListenerRegistered) return
  exitListenerRegistered = true

  window.electronAPI.terminal.onExit(({ id, exitCode }) => {
    if (!id.startsWith('script-')) return

    const { scriptTerminals, removeScriptTerminal, updateScriptTerminalState, setActiveTerminal } = useStore.getState()
    const script = scriptTerminals.find(s => s.id === id)

    if (exitCode === 0) {
      removeScriptTerminal(id)
      if (script) {
        showToast(`"${script.scriptName}" finished successfully`)
        setActiveTerminal(script.agentId)
      }
    } else {
      updateScriptTerminalState(id, 'error')
      if (script) {
        showToast(`"${script.scriptName}" failed`, 'error')
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
