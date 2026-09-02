import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Play, ChevronDown } from 'lucide-react'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useT, type MessageKey } from '../../i18n'
import type { ProjectScripts, ScriptCategory, PackageScript, ScriptPackage } from '../../../types'

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
  /**
   * What to head the ROOT package's group with — the repository name the card itself
   * shows.
   *
   * Without it the root group takes its directory name, and in a worktree that reads
   * `poppins-pex-PER-5138` under a card titled `poppins-pex`: the same repository twice
   * under two names, which looks like two projects. Sub-packages keep their directory
   * path, which is what tells them apart.
   */
  repoName: string
  agentId: string
  agentName: string
}

export function ScriptsDropdown({ repoPath, repoName, agentId, agentName }: ScriptsDropdownProps) {
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
      setProjectScripts({ packages: [] })
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

  // The PACKAGE is what carries the working directory and the package manager, so a
  // script is never run without the group it was picked from.
  const handleRunScript = useCallback(async (pkg: ScriptPackage, script: PackageScript) => {
    await runScript({
      repoPath,
      // '' is the repository root, and the IPC reads absent as exactly that.
      workspace: pkg.workspace || undefined,
      scriptName: script.name,
      packageManager: pkg.packageManager,
      agentId,
      agentName,
    })
    setIsOpen(false)
  }, [repoPath, agentId, agentName, runScript])

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

  // Check if a script is already running for this repo+agent — and for this package: a
  // monorepo has a `dev` per package, and greying out all of them because one is up
  // would take the other dev servers off the menu.
  const isScriptRunning = useCallback((workspace: string, scriptName: string) => {
    return scriptTerminals.some(
      s => s.scriptName === scriptName
        && (s.workspace ?? '') === workspace
        && s.projectPath === repoPath
        && s.agentId === agentId
    )
  }, [scriptTerminals, repoPath, agentId])

  const packages = projectScripts?.packages ?? []

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-icon border border-dashed border-border/40 rounded hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-colors"
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
          ) : packages.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary/50">{t('agentInfo.noScripts')}</div>
          ) : packages.length === 1 ? (
            /* One package: the useful axis is the KIND of script, so the headers are the
               categories — unchanged from before this list knew about packages at all. */
            CATEGORY_ORDER.map((category) => {
              const scripts = packages[0].scripts.filter(s => s.category === category)
              if (scripts.length === 0) return null

              return (
                <div key={category}>
                  <GroupHeader label={t(CATEGORY_LABELS[category])} />
                  {scripts.map(script => (
                    <ScriptRow
                      key={script.name}
                      pkg={packages[0]}
                      script={script}
                      running={isScriptRunning(packages[0].workspace, script.name)}
                      onRun={handleRunScript}
                    />
                  ))}
                </div>
              )
            })
          ) : (
            /* Several packages: the axis flips. `webapp` and `desktop` both define `dev`
               and `build`, so the package is what a person is choosing between — and
               category headers under each would double the length of an already long
               list, so the scripts merely stay in category order (main/project-scripts.ts
               sorts them). */
            packages.map(pkg => (
              <div key={pkg.workspace}>
                <GroupHeader label={pkg.workspace ? pkg.label : repoName} />
                {pkg.scripts.map(script => (
                  <ScriptRow
                    key={script.name}
                    pkg={pkg}
                    script={script}
                    running={isScriptRunning(pkg.workspace, script.name)}
                    onRun={handleRunScript}
                  />
                ))}
              </div>
            ))
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

/** The one header style both groupings use — a category, or a package. */
function GroupHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 text-[10px] text-text-secondary/40 uppercase tracking-wider font-semibold bg-bg-tertiary/30 truncate">
      {label}
    </div>
  )
}

/**
 * One runnable script.
 *
 * The trailing hint is the command as it will actually be run — `pnpm dev`, `npm run
 * dev` — which is per PACKAGE now that a repository can mix a pnpm workspace with a
 * plain npm one.
 */
function ScriptRow({ pkg, script, running, onRun }: {
  pkg: ScriptPackage
  script: PackageScript
  running: boolean
  onRun: (pkg: ScriptPackage, script: PackageScript) => void
}) {
  return (
    <button
      onClick={() => !running && onRun(pkg, script)}
      disabled={running}
      title={script.command}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
        running
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-surface cursor-pointer'
      }`}
    >
      <Play className="w-3 h-3 text-accent flex-shrink-0" />
      <span className="text-xs text-ink/90 font-medium truncate">{script.name}</span>
      <span className="text-[10px] text-text-secondary/40 truncate ml-auto">
        {pkg.packageManager} {script.name}
      </span>
    </button>
  )
}
