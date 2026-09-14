import { ScriptCard } from '@ds/desktop'
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
    <div className="flex flex-col gap-1">
      {scripts.map(script => (
        /* The bar, its two states, the stop chip and the address rows hanging off it are
           `ScriptCard`'s now. What stays here is what only the app can answer: which
           scripts belong to this (repo, agent) pair, what a script is called once its
           workspace is folded in, how short a URL may be printed, and what a click does
           to a running process. */
        <ScriptCard
          key={script.id}
          name={script.scriptName}
          workspace={script.workspace}
          state={script.state === 'running' ? 'running' : 'error'}
          title={scriptLabel(script)}
          onOpen={() => openScriptTerminalModal(script)}
          stop={{
            // `common.stop` rather than a new key: it is the same verb the rest of the
            // app already puts on this button.
            label: t('common.stop'),
            title: t('agentInfo.stopScript'),
            onStop: () => stopScript(script.id),
          }}
          urls={(script.serverUrls ?? []).map(url => ({
            url,
            label: serverUrlLabel(url),
            title: t('agentInfo.openServerInBrowser', { url }),
          }))}
          onOpenUrl={url => window.electronAPI.shell.openExternal(url)}
        />
      ))}
    </div>
  )
}
