import { useState, useCallback, useMemo } from 'react'
import type { SelectIconGroup, SelectIconItem, SelectIconProps } from '@ds/desktop'
import { Play } from '@ds/desktop/icons'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useT, type MessageKey, type Translate } from '../../i18n'
import type { ProjectScripts, ScriptCategory, ScriptPackage } from '../../../types'

const CATEGORY_ORDER: ScriptCategory[] = ['dev', 'build', 'test', 'lint', 'other']
const CATEGORY_LABELS: Record<ScriptCategory, MessageKey> = {
  dev: 'scripts.dev',
  build: 'scripts.build',
  test: 'scripts.test',
  lint: 'scripts.lint',
  other: 'scripts.other',
}

interface ScriptsMenuOptions {
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

/**
 * The identity of a row, and the reason it is an index pair.
 *
 * `SelectIcon` hands an `id` back and nothing else — it knows nothing about packages.
 * A name alone will not do: a monorepo has a `dev` per package, and `dev` on its own
 * names two different scripts. A workspace path would be unique but it is a STRING
 * chosen by whoever laid the repository out, and building a key by joining two of
 * those is how a separator ends up inside a value one day.
 */
const rowId = (pkgIndex: number, scriptIndex: number) => `${pkgIndex}:${scriptIndex}`

/**
 * The scripts of a repository, as everything `SelectIcon` needs to draw a menu of them.
 *
 * A HOOK AND NOT A COMPONENT, because the row this belongs to draws its own controls:
 * `HeaderRepoCard` renders the select, so what it wants handed to it is props, not a
 * rendered chip. A component here would be a second chip inside a row that already
 * knows how many it has and in what order.
 *
 * WHAT IS LEFT IN THIS FILE is what a script IS: where it comes from, what running it
 * means, and the two ways a list of them wants to be grouped. The pill, the chevron,
 * the panel, the portal and the flip are all `SelectIcon`'s — see its notes for why a
 * menu in this sidebar cannot be positioned the way `Status`'s is.
 *
 * THE PANEL IS LAZY, through `onOpen`. Every repository card in the sidebar asks for
 * one of these, and reading `package.json` for each of them on mount would be a
 * filesystem call per card for a menu most people never open.
 */
export function useScriptsMenu({
  repoPath,
  repoName,
  agentId,
  agentName,
}: ScriptsMenuOptions): Omit<SelectIconProps, 'size' | 'tone' | 'className'> {
  const t = useT()
  const [projectScripts, setProjectScripts] = useState<ProjectScripts | null>(null)
  const [loading, setLoading] = useState(false)
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

  const packages = useMemo(() => projectScripts?.packages ?? [], [projectScripts])

  // Already running for this repo AND this agent AND this package: a monorepo has a
  // `dev` per package, and greying out all of them because one is up would take the
  // other dev servers off the menu.
  const isRunning = useCallback(
    (workspace: string, scriptName: string) =>
      scriptTerminals.some(
        s =>
          s.scriptName === scriptName &&
          (s.workspace ?? '') === workspace &&
          s.projectPath === repoPath &&
          s.agentId === agentId,
      ),
    [scriptTerminals, repoPath, agentId],
  )

  const groups = useMemo(
    () => buildGroups(packages, repoName, isRunning, t),
    [packages, repoName, isRunning, t],
  )

  // The PACKAGE is what carries the working directory and the package manager, so a
  // script is never run without the group it was picked from.
  const handleSelect = useCallback(
    async (item: SelectIconItem) => {
      const [pkgIndex, scriptIndex] = item.id.split(':').map(Number)
      const pkg = packages[pkgIndex]
      const script = pkg?.scripts[scriptIndex]
      if (!pkg || !script) return

      await runScript({
        repoPath,
        // '' is the repository root, and the IPC reads absent as exactly that.
        workspace: pkg.workspace || undefined,
        scriptName: script.name,
        packageManager: pkg.packageManager,
        agentId,
        agentName,
      })
    },
    [packages, repoPath, agentId, agentName, runScript],
  )

  return {
    icon: Play,
    title: t('agentInfo.runScripts'),
    groups,
    loading,
    loadingLabel: t('common.loading'),
    emptyLabel: t('agentInfo.noScripts'),
    onOpen: fetchScripts,
    onSelect: handleSelect,
  }
}

/**
 * THE AXIS FLIPS ON THE PACKAGE COUNT, and that is the only real decision here.
 *
 * One package: the useful axis is the KIND of script, so the headers are the
 * categories — which is what this list was before it knew about packages at all.
 *
 * Several: `webapp` and `desktop` both define `dev` and `build`, so the PACKAGE is
 * what a person is choosing between. Category headers under each would double the
 * length of an already long list, so the scripts merely stay in category order
 * (`main/project-scripts.ts` sorts them).
 */
function buildGroups(
  packages: ScriptPackage[],
  repoName: string,
  isRunning: (workspace: string, scriptName: string) => boolean,
  t: Translate,
): SelectIconGroup[] {
  // The index is taken from the package's OWN array and carried through the filter,
  // so a row's id always points back to where the script actually lives. Reading it
  // back with `indexOf` after filtering would be quadratic, and would return the
  // wrong index the day a package declares two scripts that compare equal.
  const itemsOf = (pkg: ScriptPackage, pkgIndex: number): (SelectIconItem & { category: ScriptCategory })[] =>
    pkg.scripts.map((script, scriptIndex) => ({
      id: rowId(pkgIndex, scriptIndex),
      label: script.name,
      hint: `${pkg.packageManager} ${script.name}`,
      disabled: isRunning(pkg.workspace, script.name),
      category: script.category,
    }))

  if (packages.length === 1) {
    const items = itemsOf(packages[0], 0)
    return CATEGORY_ORDER.map(category => ({
      label: t(CATEGORY_LABELS[category]),
      items: items.filter(item => item.category === category),
    }))
  }

  return packages.map((pkg, pkgIndex) => ({
    label: pkg.workspace ? pkg.label : repoName,
    items: itemsOf(pkg, pkgIndex),
  }))
}
