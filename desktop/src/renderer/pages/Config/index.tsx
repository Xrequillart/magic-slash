import { useState, useEffect, useMemo, useRef } from 'react'
import { FolderPlus, Folder, Building2, Lock } from '@ds/desktop/icons'
import { Button, ItemGroup, RepositoryItem } from '@ds/desktop'
import { RepoPage } from './RepoPage'
import { SweepPane } from '../../components/SweepPane'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import type { RepositoryConfig } from '../../../types'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'
import { useT } from '../../i18n'


/**
 * THE MODAL IS ONE PAGE NOW, and the page is the repositories.
 *
 * It had eleven tabs, then seven, then six, and this is the end of that road rather
 * than another step along it. Everything that was a PREFERENCE went to the quick
 * settings sheet under the title bar and the panel it opens — the setup, the
 * notifications, the appearance, the language, the chords. Everything that was an
 * IDENTITY went to the account sheet beside it and ITS panel — who you are, which
 * organization, which connections, which Claude Code, which version.
 *
 * A repository is neither. It is a folder on this disk with a remote behind it and a
 * detail page of its own, and a list of them does not fit in a card hanging off a menu
 * the way a roster or a version number does. So it kept the window, and the window lost
 * the rail: a vertical menu of one entry is a menu that has nothing to say. The left
 * sidebar names it directly.
 *
 * WHAT WENT WITH THE RAIL, and is not coming back as a component somewhere else: the
 * repositories and organizations that unfolded under their tabs, and the account footer
 * with its sign-out. The first two answered "which of these am I looking at", which the
 * page itself answers now that it is the only page; the footer is the account sheet's
 * first card.
 */

/**
 * Whether a switch is the hop between the repository list and one repository's
 * detail. Opening a repository is opening a page, not travelling down the rail,
 * so it sweeps sideways: in from the right on the way in, back out to the right
 * on the way out. Reaching another settings tab straight from a detail is still
 * a rail move and keeps its vertical sweep.
 */
function isRepoDetailSwitch(fromKey: string, toKey: string): boolean {
  return (
    (fromKey === 'repositories' && toKey.startsWith('repo:')) ||
    (toKey === 'repositories' && fromKey.startsWith('repo:'))
  )
}

/**
 * How deep a page sits, which is the whole of what `SweepPane` needs: it compares two
 * ranks and takes the SIGN, so the numbers only have to be in the right order.
 *
 * Declared at module scope because `SweepPane` reads it during render — a fresh closure
 * on every render would be a new prop each time, which is what `pages/Tasks/index.tsx`
 * and `pages/Plans/index.tsx` both note where they declare theirs.
 */
function pageDepth(pageKey: string): number {
  return pageKey.startsWith('repo:') ? 1 : 0
}

/** Hash route within Settings. `repo` is a sub-page of the Repositories tab. */
interface SettingsRoute {
  page: string
  params: { name?: string }
}

function WelcomePage({ route }: { route: SettingsRoute }) {
  const { config, terminals } = useStore()
  const { addRepository } = useConfig()
  const orgs = useStore((s) => s.orgs)
  const t = useT()

  // Two pages and not seven: the list, and one repository's detail under `#/repo/<name>`.
  const isRepoRoute = route.page === 'repo'

  /**
   * What the content pane is currently showing. Used as its React key, so moving
   * between the list and a repository — or between two repositories — remounts the pane
   * and plays the sweep. Without the key React would reuse the same element and the new
   * page would simply appear.
   */
  const contentKey = isRepoRoute ? `repo:${route.params.name ?? ''}` : 'repositories'

  // A page opens at its top. The pane is the scroll container and it survives
  // the switch, so without this the next page inherits the previous page's
  // offset — a short one can open already scrolled past its own heading.
  const contentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 })
  }, [contentKey])

  const [githubStatus, setGithubStatus] = useState<Record<string, boolean>>({})
  const [isAdding, setIsAdding] = useState(false)
  const repos = Object.entries(config?.repositories || {})
  const projectNames = repos.map(([name]) => name)

  // One section per organization, plus a personal one. Every org the user
  // belongs to is listed at once — there is no active org to narrow to. A team
  // repo the user has not bound to a local folder yet (needsLocalPath) stays
  // visible: that is how you discover a colleague's repo and point it at your
  // own clone.
  const personalRepos = useMemo(() => repos.filter(([, r]) => !r.orgId), [repos])
  /**
   * The team sections: the organizations `useOrgList` hydrated, in its order, and then
   * any org a REPOSITORY names that the list does not hold.
   *
   * That tail is the whole point. This used to render `orgs.map(...)` and nothing else,
   * so a repository whose org was missing from the list had no section to sit in and
   * simply was not drawn — the page showed the personal repos and swallowed every team
   * one. And `orgs` is missing far more often than it looks: it lands asynchronously
   * from the cloud, it stays empty when that read fails or the user is offline, and it
   * never holds an org the user has since left while a local repo still points at it.
   * Grouping by what the repositories themselves say, with `orgs` supplying only names
   * and order, means a repo can lose its heading but never its row.
   */
  const orgSections = useMemo(() => {
    const byOrg = new Map<string, typeof repos>()
    for (const org of orgs) byOrg.set(org.id, [])
    for (const entry of repos) {
      const orgId = entry[1].orgId
      if (!orgId) continue
      byOrg.set(orgId, [...(byOrg.get(orgId) ?? []), entry])
    }
    const names = new Map(orgs.map((org) => [org.id, org.name]))
    return [...byOrg].map(([id, orgRepos]) => ({
      id,
      name: names.get(id) ?? t('settings.repos.otherOrg'),
      repos: orgRepos,
    }))
  }, [repos, orgs, t])

  const colorMap = useMemo(
    () => getProjectColorMap(projectNames, config?.repositories),
    [projectNames, config?.repositories]
  )

  // Count active agents per repo
  const agentCountByRepo = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const terminal of terminals) {
      for (const repoPath of terminal.repositories || []) {
        for (const [name, repo] of repos) {
          // Guard the empty path: ''.startsWith() matches everything, which would
          // credit every agent to every repo with no local folder bound.
          if (repo.path && repoPath.startsWith(repo.path)) {
            counts[name] = (counts[name] || 0) + 1
          }
        }
      }
    }
    return counts
  }, [terminals, repos])

  // One row of the repositories list. Shared by the Personal and Team sections —
  // a plain render function, not a component, so React keeps the same elements
  // across renders instead of remounting a freshly-declared type.
  const renderRepoRow = ([name, repo]: [string, RepositoryConfig]) => {
    const agentCount = agentCountByRepo[name] || 0

    return (
      <RepositoryItem
        key={name}
        name={name}
        color={colorMap[name]}
        href={`#/repo/${encodeURIComponent(name)}`}
        // Only meaningful once a local folder is bound: until then there is nothing
        // to read a remote off, so the chip stays away rather than reporting none.
        remote={
          repo.needsLocalPath
            ? undefined
            : {
                connected: !!githubStatus[name],
                label: githubStatus[name] ? t('settings.repos.connected') : t('settings.repos.noRemote'),
              }
        }
        path={repo.needsLocalPath ? undefined : repo.path}
        missingPath={repo.needsLocalPath ? t('settings.repos.noLocalFolder') : undefined}
        // Worded here, where the catalogue is. The row takes the sentence, not the
        // number — the plural rule is the app's and not the design system's.
        agents={
          agentCount > 0
            ? t(agentCount > 1 ? 'settings.repos.agents.other' : 'settings.repos.agents.one', { count: agentCount })
            : undefined
        }
      />
    )
  }

  // Check GitHub remote status for all repos
  useEffect(() => {
    const checkGitHubRemotes = async () => {
      const repoList = config?.repositories || {}
      const status: Record<string, boolean> = {}

      for (const [name, repo] of Object.entries(repoList)) {
        try {
          status[name] = await window.electronAPI.config.hasGitHubRemote(repo.path)
        } catch {
          status[name] = false
        }
      }

      setGithubStatus(status)
    }

    checkGitHubRemotes()
  }, [config?.repositories])

  const handleOpenProject = async () => {
    if (isAdding) return

    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return

    const folderName = folderPath.split('/').pop() || ''
    const repoName = folderName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()

    if (!repoName) {
      showToast(t('toast.invalidFolderName'), 'error')
      return
    }

    if (config?.repositories?.[repoName]) {
      showToast(t('toast.repoExists', { name: repoName }), 'error')
      return
    }

    setIsAdding(true)
    try {
      const result = await addRepository(repoName, folderPath, [])

      if (result.warning) {
        showToast(t('toast.repoAddedWarning', { name: repoName, warning: result.warning }), 'warning')
      } else {
        showToast(t('toast.repoAdded', { name: repoName }))
      }

      window.location.hash = `#/repo/${encodeURIComponent(repoName)}`
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoAddFailed'), 'error')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="h-full animate-fade-in">
      {/* THE WHOLE WINDOW, where it used to be the half beside the rail.

          NO PADDING ON THE PANE — it is on the SWEEP LAYERS below, which is
          `pages/Plans/index.tsx`'s arrangement and it is load-bearing for the sideways
          sweep. A scrolling box clips at its padding box, so a page inset 24px from the
          pane's edge has nowhere to travel: sliding it 24px left puts its first column
          of pixels exactly on the clip edge, and the row you are leaving loses its left
          side for the length of the animation. Padding on the LAYER instead means the
          24px that leaves the box is the layer's own empty inset, and the content
          arrives and departs whole. */}
      <div ref={contentScrollRef} className="h-full overflow-y-auto">
        <SweepPane
          pageKey={contentKey}
          // `depth` AND NOT A CONSTANT, which is what this was — and the constant was
          // the bug. `SweepPane` reads the SIGN of the gap between two ranks to decide
          // which way a switch travels; with every page ranked 0 the gap is always 0,
          // never negative, so no switch here was ever a switch BACK. Opening a
          // repository and leaving it both played `sweep-*-left`, and the return
          // repeated the arrival instead of undoing it.
          //
          // The rail is gone, so there is no longer a menu order to read this off —
          // but there is still a DEPTH, and depth is all the sign needs: the list is
          // the surface and a repository is one page under it. Going down sweeps left,
          // coming back up sweeps right, which is what the comment at the top of this
          // file already promised.
          order={pageDepth}
          horizontal={isRepoDetailSwitch}
          scrollRef={contentScrollRef}
          // A CAP AGAIN, and centred — which reverses a decision the rail had made for
          // us. There was a `max-w-4xl` here once; it went because a form sitting against
          // a 224px rail on a full-screen modal was already off the window edge, and the
          // cap only added a band of empty panel beside it. The rail is gone, so nothing
          // holds the content in any more: a repository row would run the full width of a
          // maximised window, with its name at one end and its chevron at the other.
          // 72rem is wider than the measure prose would ask for, because these are rows
          // and not paragraphs — it is a limit on the reach of the eye, not on the line.
          className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6"
        >

      {/* One repository, under `#/repo/<name>` — the window's only sub-page. */}
      {isRepoRoute && <RepoPage repoName={route.params.name || ''} />}

      {/* The repository list — the whole of this window, the detail above excepted. */}
      {!isRepoRoute && <div>
        {/* NO HEADING, AND NOT A `SectionHeader` ANY MORE. This window has one page and
            the page is the repositories — a heading saying so names the thing a reader
            is already looking at, which is what a section header is for when there are
            several sections and dead weight when there is one. What is left is the
            action, so the row exists only to put it at the right edge.

            `justify-end` and `mb-4`, the two things `SectionHeader` was still supplying.
            Its `h-5` is deliberately NOT kept: that height pins a row to the natural
            height of a bare title so sections with and without a button line up, and
            with no title there is nothing to line up with — the button would simply
            overflow a 20px box for no one's benefit. The row is the button's height now.

            `SectionHeader` itself stays: ten other settings surfaces draw one. */}
        <div className="mb-4 flex items-center justify-end">
          {/* `neutral` and not `accent`, which is the weight this button already had:
              it is an affordance in the corner rather than the step the page is asking
              for. The border went with the migration — a plate a shade off the ground
              and a hairline around it are the same statement made twice, which is the
              whole of what `Button` refuses to draw.

              `md` — 28px, one rung up from a list row, and the mark goes up with it to
              16px because `Button` sizes its glyph from the rung and will not let a call
              site pick the two apart.

              `busy` RATHER THAN `disabled`. Picking a folder opens a native dialog and
              the wait is the reader's own, but adding what comes back is not — it hits
              the cloud — and a button that only dims says "unavailable" about a control
              that is working. The mark becomes a spinner and the word already says
              `adding`. */}
          <Button
            size="md"
            icon={FolderPlus}
            busy={isAdding}
            onClick={handleOpenProject}
          >
            {isAdding ? t('settings.repos.adding') : t('settings.repos.add')}
          </Button>
        </div>

        {repos.length === 0 ? (
          <button
            onClick={handleOpenProject}
            disabled={isAdding}
            className="w-full py-8 text-center border border-dashed border-border/50 rounded-xl hover:border-text-secondary/50 hover:bg-surface transition-colors"
          >
            <Folder className="w-8 h-8 text-icon-muted mx-auto mb-3" />
            <div className="text-sm text-text-secondary/50 mb-1">{t('settings.repos.emptyTitle')}</div>
            <div className="text-xs text-text-secondary/30">{t('settings.repos.emptyHint')}</div>
          </button>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Personal */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-icon mb-2">
                <Lock className="w-3 h-3" />
                <span>{t('settings.repos.personal')}</span>
                <span className="text-text-secondary/30">{personalRepos.length}</span>
              </div>
              {personalRepos.length === 0 ? (
                <div className="px-4 py-3 text-xs text-text-secondary/40 border border-dashed border-line-field rounded-xl">
                  {t('settings.repos.noPersonal')}
                </div>
              ) : (
                /* `ItemGroup` AND NOT `space-y-2`: the rows are flush now, on the
                   ground and the hover the Plans list uses, so a section reads as one
                   panel divided into its repositories rather than as a stack of separate
                   plates. The radius is on the first and the last row — see `Item`. */
                <ItemGroup>{personalRepos.map(renderRepoRow)}</ItemGroup>
              )}
            </div>

            {/* One section per organization, in the order useOrgList lists them */}
            {orgSections.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-icon mb-2">
                  <Building2 className="w-3 h-3" />
                  <span>{section.name}</span>
                  <span className="text-text-secondary/30">{section.repos.length}</span>
                </div>
                {section.repos.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-text-secondary/40 border border-dashed border-line-field rounded-xl">
                    {t('settings.repos.noTeam')}
                  </div>
                ) : (
                  <ItemGroup>{section.repos.map(renderRepoRow)}</ItemGroup>
                )}
              </div>
            ))}
          </div>
        )}
      </div>}

        </SweepPane>
      </div>
    </div>
  )
}

export function ConfigPage() {
  const [route, setRoute] = useState<{ page: string; params: { name?: string } }>({
    page: 'home',
    params: {}
  })

  useEffect(() => {
    const parseRoute = (): { page: string; params: { name?: string } } => {
      const hash = window.location.hash || '#/'

      if (hash === '#/' || hash === '#') {
        return { page: 'home', params: {} }
      }

      const repoMatch = hash.match(/^#\/repo\/(.+)$/)
      if (repoMatch) {
        return { page: 'repo', params: { name: decodeURIComponent(repoMatch[1]) } }
      }

      return { page: 'home', params: {} }
    }

    const handleHashChange = () => {
      setRoute(parseRoute())
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <div className="h-full">
      <WelcomePage route={route} />
    </div>
  )
}
