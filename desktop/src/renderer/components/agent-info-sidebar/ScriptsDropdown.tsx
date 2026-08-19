import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Play, ChevronDown } from 'lucide-react'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useT, type MessageKey } from '../../i18n'
import type { ProjectScripts, ScriptCategory, PackageScript } from '../../../types'

const CATEGORY_ORDER: ScriptCategory[] = ['dev', 'build', 'test', 'lint', 'other']
const CATEGORY_LABELS: Record<ScriptCategory, MessageKey> = {
  dev: 'scripts.dev',
  build: 'scripts.build',
  test: 'scripts.test',
  lint: 'scripts.lint',
  other: 'scripts.other',
}

const PANEL_WIDTH = 280
const PANEL_MAX_HEIGHT = 320
const VIEWPORT_MARGIN = 8

interface ScriptsDropdownProps {
  repoPath: string
  agentId: string
  agentName: string
}

export function ScriptsDropdown({ repoPath, agentId, agentName }: ScriptsDropdownProps) {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [projectScripts, setProjectScripts] = useState<ProjectScripts | null>(null)
  const [loading, setLoading] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
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

  const closeDropdown = useCallback(() => setIsOpen(false), [])

  // Anchor the panel to the trigger, right-aligned, flipping above when the space
  // below runs out. Re-measured when the script list arrives, since the panel is
  // empty (and zero-height) on the frame the dropdown opens.
  useLayoutEffect(() => {
    if (!isOpen) return
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelHeight = Math.min(panelRef.current?.offsetHeight ?? 0, PANEL_MAX_HEIGHT)
    const spaceBelow = window.innerHeight - rect.bottom

    const top = panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
      ? Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - 4)
      : rect.bottom + 4

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN),
    )

    setPosition({ top, left })
  }, [isOpen, loading, projectScripts])

  // Close on outside click, Escape, or anything that detaches the panel from its
  // trigger. The portalled panel is not a DOM descendant of the trigger, so it
  // needs its own containment check — and its own scroll exemption, or scrolling
  // a long script list would close the very list being scrolled.
  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      closeDropdown()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown()
    }
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      closeDropdown()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', closeDropdown)
    // capture: catches scrolls on any ancestor, not just the window.
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', closeDropdown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [isOpen, closeDropdown])

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
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary/50 border border-dashed border-border/40 rounded hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-colors"
      >
        <Play className="w-3 h-3" />
        {t('agentInfo.scripts')}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {/* Portalled to <body> and positioned `fixed`: rendered in place it was
          clipped by the sidebar's `overflow-hidden` and disappeared under the
          terminal pane, which no z-index inside the sidebar could fix. */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            width: PANEL_WIDTH,
            maxHeight: PANEL_MAX_HEIGHT,
            // Hidden until measured, so the first paint never flashes at 0,0.
            visibility: position ? 'visible' : 'hidden',
          }}
          className="z-[60] overflow-y-auto bg-bg-secondary border border-border/50 rounded-lg shadow-xl"
        >
          {loading ? (
            <div className="px-3 py-2 text-xs text-text-secondary/50">{t('common.loading')}</div>
          ) : !groupedScripts || projectScripts?.scripts.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary/50">{t('agentInfo.noScripts')}</div>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const scripts = groupedScripts[category]
              if (scripts.length === 0) return null

              return (
                <div key={category}>
                  <div className="px-3 py-1.5 text-[10px] text-text-secondary/40 uppercase tracking-wider font-semibold bg-bg-tertiary/30">
                    {t(CATEGORY_LABELS[category])}
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
                            : 'hover:bg-surface cursor-pointer'
                        }`}
                      >
                        <Play className="w-3 h-3 text-accent flex-shrink-0" />
                        <span className="text-xs text-ink/90 font-medium">{script.name}</span>
                        <span className="text-[10px] text-text-secondary/40 truncate ml-auto">
                          {projectScripts!.packageManager} {script.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
