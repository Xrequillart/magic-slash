import { X, XCircle } from 'lucide-react'
import { WaveLoader } from '../WaveLoader'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useStore } from '../../store'
import { useT } from '../../i18n'

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
 */
export function RunningScripts({ repoPath, agentId }: RunningScriptsProps) {
  const t = useT()
  const { scriptTerminals, stopScript } = useScriptRunner()
  // Straight off the store rather than through `useTerminals`: that hook registers the
  // six global terminal listeners and replays `loadExistingTerminals` on mount, and this
  // component is instantiated once per attached repository. Same idiom as
  // `openRepoReview` in `RepositoryCard`.
  const setActiveTerminal = useStore(s => s.setActiveTerminal)

  // Same predicate `ScriptsDropdown` uses to grey out an already-running entry,
  // minus the script name: here every script of the pair is wanted, whatever its state.
  const scripts = scriptTerminals.filter(s => s.projectPath === repoPath && s.agentId === agentId)

  if (scripts.length === 0) return null

  return (
    <div className="flex flex-col gap-1 mb-2">
      {scripts.map(script => (
        <button
          key={script.id}
          onClick={() => setActiveTerminal(script.id)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-all rounded-lg group text-on-brand ${
            script.state === 'running' ? 'bg-purple' : 'bg-red'
          }`}
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
            <div className="truncate text-xs font-medium" title={script.scriptName}>{script.scriptName}</div>
          </div>
          <span
            onClick={(e) => { e.stopPropagation(); stopScript(script.id) }}
            className="p-0.5 rounded hover:bg-surface-strong opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            title={t('agentInfo.stopScript')}
          >
            <X className="w-3 h-3 text-on-brand/60 hover:text-on-brand" />
          </span>
        </button>
      ))}
    </div>
  )
}
