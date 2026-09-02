import { CircleStop, ExternalLink, Globe, XCircle } from 'lucide-react'
import { WaveLoader } from '../WaveLoader'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useStore } from '../../store'
import { useT } from '../../i18n'
import { serverUrlLabel } from '../../../server-url'
import { scriptLabel } from '../../utils/scriptTerminals'

interface RunningScriptsProps {
  /** Only the scripts launched against this repo are this card's business. */
  repoPath: string
  /** …and only the ones this agent launched: the same repo can be open under several. */
  agentId: string
}

/**
 * The scripts running on one repository, one card each, under that repository's
 * button row.
 *
 * This used to be a section at the bottom of the LEFT sidebar, which meant a global
 * list that had to name its own agent on every line to be readable. Rendered from
 * inside the repository card, the (repo, agent) pair IS the context — hence no
 * `({agentName})` suffix — and a running script is where the person who started it
 * would look for it.
 *
 * `error` cards stay: a script that exited non-zero is the one thing worth keeping on
 * screen, and it leaves only when it is dismissed or stopped.
 *
 * A click opens the script's terminal in a dialog (`ScriptTerminalModal`), which `App`
 * owns — a script never takes the main content pane.
 *
 * A script that ANNOUNCED local URLs — a dev server, in practice — grows a row per
 * address under its own, opening it in the default browser. There is a row per address
 * and not one per script because `dev:local` starting an API next to a front end is the
 * ordinary case. The URLs are read off the script's output (`src/server-url.ts`), never
 * inferred from its name: `dev`, `web`, `storybook` and `docs:dev` are all the same kind
 * of thing, and only the tool itself knows the port it settled on after finding 5173
 * taken.
 */
export function RunningScripts({ repoPath, agentId }: RunningScriptsProps) {
  const t = useT()
  const { scriptTerminals, stopScript } = useScriptRunner()
  // Straight off the store rather than through `useTerminals`: that hook registers the
  // six global terminal listeners and replays `loadExistingTerminals` on mount, and this
  // component is instantiated once per attached repository. Same idiom as
  // `openRepoReview` in `RepositoryCard`.
  const openScriptTerminalModal = useStore(s => s.openScriptTerminalModal)

  // Same predicate `ScriptsDropdown` uses to grey out an already-running entry,
  // minus the script name: here every script of the pair is wanted, whatever its state.
  const scripts = scriptTerminals.filter(s => s.projectPath === repoPath && s.agentId === agentId)

  if (scripts.length === 0) return null

  return (
    <div className="flex flex-col gap-1 mb-2">
      {scripts.map(script => {
        const urls = script.serverUrls ?? []

        return (
          <div key={script.id} className="flex flex-col">
            <button
              onClick={() => openScriptTerminalModal(script)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-all group text-on-brand ${
                script.state === 'running' ? 'bg-purple' : 'bg-red'
              } ${urls.length > 0 ? 'rounded-t-lg' : 'rounded-lg'}`}
            >
              {/* The loader is `currentColor` by design, so the wrapper is what makes it
                  white against the filled surface. */}
              {script.state === 'running' ? (
                <span className="text-on-brand flex-shrink-0">
                  <WaveLoader />
                </span>
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <div className="flex-1 text-left min-w-0">
                {/* The package prefixes the name, dimmed: on a monorepo the card would
                    otherwise read `dev` three times over, and which package is serving
                    is the whole question a person opens this card with. */}
                <div className="truncate text-xs font-medium" title={scriptLabel(script)}>
                  {script.workspace && <span className="font-normal text-on-brand/70">{script.workspace}/</span>}
                  {script.scriptName}
                </div>
              </div>
              {/* Always visible and worded, never a hover reveal on a lone glyph:
                  stopping a server is the action a person comes to this card for, and
                  a control that only exists under the pointer — or that only ever says
                  what it does in a tooltip — cannot be found by someone looking for it.
                  `common.stop` rather than a new key: it is the same verb the rest of
                  the app already puts on this button. */}
              <span
                onClick={(e) => { e.stopPropagation(); stopScript(script.id) }}
                className="flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-md bg-on-brand/15 hover:bg-on-brand/30 transition-colors flex-shrink-0"
                title={t('agentInfo.stopScript')}
              >
                <CircleStop className="w-3.5 h-3.5 text-on-brand" />
                <span className="text-[11px] font-semibold text-on-brand">{t('common.stop')}</span>
              </span>
            </button>

            {/* Attached to the card above rather than spaced from it: these are that
                script's addresses, not further items in the list. Each row carries its
                own bottom border, so consecutive rows are separated by a single line. */}
            {urls.map((url, index) => (
              <ServerUrlRow key={url} url={url} last={index === urls.length - 1} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/**
 * The "open this in a browser" row under a script that serves a page.
 *
 * Its own component so the URL is narrowed once, by the list that renders it, instead of
 * asserted non-null inside a click handler that fires long after the check.
 *
 * Deliberately taller and larger-typed than the script card above it: that one is a
 * status line to glance at, this one is a link to hit — and at 500px of sidebar it is
 * also the row a person reads a port off.
 */
function ServerUrlRow({ url, last }: { url: string; last: boolean }) {
  const t = useT()

  return (
    <button
      onClick={() => window.electronAPI.shell.openExternal(url)}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm border border-t-0 border-line-subtle bg-surface text-text-secondary hover:text-ink hover:bg-surface-strong transition-colors group/url ${
        last ? 'rounded-b-lg' : ''
      }`}
      title={t('agentInfo.openServerInBrowser', { url })}
    >
      <Globe className="w-4 h-4 flex-shrink-0 text-purple" />
      <span className="flex-1 text-left truncate font-medium">{serverUrlLabel(url)}</span>
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-60 group-hover/url:opacity-100 transition-opacity" />
    </button>
  )
}
