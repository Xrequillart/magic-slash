import { useState, useRef, useCallback } from 'react'
import { Play, ChevronDown } from 'lucide-react'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { ProjectScripts, ScriptCategory, PackageScript } from '../../../types'

const CATEGORY_ORDER: ScriptCategory[] = ['dev', 'build', 'test', 'lint', 'other']
const CATEGORY_LABELS: Record<ScriptCategory, string> = {
  dev: 'Dev',
  build: 'Build',
  test: 'Test',
  lint: 'Lint',
  other: 'Other',
}

interface ScriptsDropdownProps {
  repoPath: string
  agentId: string
  agentName: string
}

export function ScriptsDropdown({ repoPath, agentId, agentName }: ScriptsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projectScripts, setProjectScripts] = useState<ProjectScripts | null>(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { scriptTerminals, runScript } = useScriptRunner()

  const fetchScripts = useCallback(async () => {
    if (projectScripts) return
    setLoading(true)
    try {
      const result = await window.electronAPI.scripts.getProjectScripts(repoPath)
      setProjectScripts(result)
    } catch {
      setProjectScripts({ packageManager: 'npm', scripts: [] })
    } finally {
      setLoading(false)
    }
  }, [repoPath, projectScripts])

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      fetchScripts()
    }
    setIsOpen(!isOpen)
  }, [isOpen, fetchScripts])

  const handleRunScript = useCallback(async (script: PackageScript) => {
    if (!projectScripts) return
    await runScript(repoPath, script.name, projectScripts.packageManager, agentId, agentName)
    setIsOpen(false)
  }, [repoPath, agentId, agentName, projectScripts, runScript])

  // Close on click outside or Escape
  const closeDropdown = useCallback(() => setIsOpen(false), [])
  useClickOutside(dropdownRef, isOpen, closeDropdown)

  // Check if a script is already running for this repo+agent
  const isScriptRunning = useCallback((scriptName: string) => {
    return scriptTerminals.some(
      s => s.scriptName === scriptName && s.projectPath === repoPath && s.agentId === agentId
    )
  }, [scriptTerminals, repoPath, agentId])

  // Group scripts by category
  const groupedScripts = projectScripts?.scripts.reduce<Record<ScriptCategory, PackageScript[]>>(
    (acc, script) => {
      acc[script.category].push(script)
      return acc
    },
    { dev: [], build: [], test: [], lint: [], other: [] }
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary/50 border border-dashed border-border/40 rounded hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-colors"
      >
        <Play className="w-3 h-3" />
        Scripts
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[260px] max-h-[320px] overflow-y-auto bg-bg-secondary border border-border/50 rounded-lg shadow-xl">
          {loading ? (
            <div className="px-3 py-2 text-xs text-text-secondary/50">Loading...</div>
          ) : !groupedScripts || projectScripts?.scripts.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary/50">No scripts found</div>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const scripts = groupedScripts[category]
              if (scripts.length === 0) return null

              return (
                <div key={category}>
                  <div className="px-3 py-1.5 text-[10px] text-text-secondary/40 uppercase tracking-wider font-semibold bg-bg-tertiary/30">
                    {CATEGORY_LABELS[category]}
                  </div>
                  {scripts.map((script) => {
                    const running = isScriptRunning(script.name)
                    return (
                      <button
                        key={script.name}
                        onClick={() => !running && handleRunScript(script)}
                        disabled={running}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                          running
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-white/5 cursor-pointer'
                        }`}
                      >
                        <Play className="w-3 h-3 text-accent flex-shrink-0" />
                        <span className="text-xs text-white/90 font-medium">{script.name}</span>
                        <span className="text-[11px] text-text-secondary/40 truncate ml-auto">
                          {projectScripts!.packageManager} {script.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
