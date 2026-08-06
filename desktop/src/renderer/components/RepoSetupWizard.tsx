import { useCallback, useEffect, useState } from 'react'
import { Check, FolderGit2, FolderOpen, Loader2, X } from 'lucide-react'
import type { RepoSetup, RepoSetupReason } from '../utils/repoSetup'
import { REASON_META, mergeRepoSetup } from '../utils/repoSetup'
import { useConfig } from '../hooks/useConfig'
import { useT } from '../i18n'

interface RepoSetupWizardProps {
  setup: RepoSetup
  onClose: () => void
}

/** Per-row progress. Absent = untouched; the row shows its original reason. */
interface RowState {
  busy?: boolean
  /** Set once the re-check confirmed the picked folder is a usable git repo. */
  resolvedPath?: string
  /** The re-check's verdict when the picked folder is still not usable. */
  reason?: RepoSetupReason
  /**
   * The write landed but its verdict could not be read back. Distinct from both
   * outcomes above and load-bearing: without it, "we don't know" is indistinguishable
   * from "no reason left to show", which is how the row would claim Ready for a
   * folder nothing ever confirmed.
   */
  unverified?: boolean
  error?: string
}

/** A repository added from this modal. The path is kept so an add that turned out
 * unusable can show the folder it picked, next to the reason it is not usable. */
interface AddedRepo {
  name: string
  path: string
}

interface RepoRowProps {
  name: string
  path?: string
  /** Absent means the row is done — it renders as resolved, with no action. */
  reason?: RepoSetupReason
  state?: RowState
  onChooseFolder?: () => void
}

/**
 * One repository line. Shared by both modes so "this one is ready" is drawn once:
 * a freshly added repository and a freshly re-bound one are the same statement.
 */
function RepoRow({ name, path, reason, state = {}, onChooseFolder }: RepoRowProps) {
  const t = useT()
  // No reason left to show IS the resolved state: a row with no reason at all
  // (a repository just added) and one whose re-check came back clean read alike.
  // An unverified row is the exception — it has no reason either, but nothing
  // confirmed it, so it must keep its action instead of reading as done.
  const shownReason = state.resolvedPath ? undefined : state.reason ?? reason
  const isResolved = !shownReason && !state.unverified
  const shownPath = state.resolvedPath ?? path

  return (
    <div className="px-3 py-2 bg-surface border border-line-field rounded-lg">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          {shownPath && <div className="text-xs text-text-secondary/50 truncate">{shownPath}</div>}
        </div>
        {isResolved ? (
          <div className="flex items-center gap-1.5 text-xs text-green flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
            {t('repoSetup.resolved')}
          </div>
        ) : (
          <>
            {shownReason && (
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full flex-shrink-0 ${REASON_META[shownReason].severity === 'warning' ? 'bg-yellow/10 text-yellow' : 'bg-red/10 text-red'}`}
              >
                {t(REASON_META[shownReason].labelKey)}
              </span>
            )}
            <button
              onClick={onChooseFolder}
              disabled={state.busy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all disabled:opacity-40 flex-shrink-0"
            >
              {state.busy
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><FolderOpen className="w-3.5 h-3.5" />{t('repoSetup.chooseFolder')}</>}
            </button>
          </>
        )}
      </div>
      {state.error && (
        <div className="mt-2 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
          {state.error}
        </div>
      )}
    </div>
  )
}

/**
 * Launch onboarding for repositories that cannot be used yet: none configured at
 * all, or configured with no local folder bound / a folder that has moved or is
 * not a git repository. One modal for all of them — the user fixes each row in
 * place and the modal stays open, so nothing here needs a restart.
 *
 * Mounted only while open (App holds the latch), so nothing here runs for the
 * rest of the session once dismissed. Shell copied from InvitationOnboardingWizard;
 * Escape and a backdrop click both mean "Later", never a silent dismissal of a
 * state the user must eventually fix.
 */
export function RepoSetupWizard({ setup, onClose }: RepoSetupWizardProps) {
  const { config, addRepository, updateRepository } = useConfig()
  const t = useT()

  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const [added, setAdded] = useState<AddedRepo[]>([])
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // What the modal shows: the setup it opened with, with later payloads merged in
  // rather than substituted for it. `repos:invalid` is re-emitted on a 20s timer
  // and on window focus, so the incoming prop drops every row the user has just
  // fixed — see mergeRepoSetup for the full rationale. Mounted only while open, so
  // this snapshot is per-opening and the next launch starts from the live state.
  const [displayed, setDisplayed] = useState<RepoSetup>(setup)
  useEffect(() => {
    setDisplayed((prev) => mergeRepoSetup(prev, setup))
  }, [setup])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Adding the first repository makes the config non-empty, which would flip the
  // computed mode to 'fix' and swap the modal's whole body out from under the
  // user mid-action. Once they have added something here, they stay in the flow
  // they started, and see what they added, until they close it themselves.
  const effectiveMode = added.length > 0 ? 'empty' : displayed.mode

  /**
   * Ask the main process whether `name` is usable now. Runs only AFTER the config
   * write has landed, which is what makes its failure mode different: it is a
   * failure to learn the verdict, never a failed write. Reporting it as a failed
   * write would drop a repository that really was added, or leave a row that
   * really was re-bound showing its old reason — so an unreadable verdict keeps
   * the row listed and actionable, and claims nothing.
   */
  const recheck = useCallback(async (name: string, folderPath: string): Promise<RowState> => {
    try {
      const invalid = await window.electronAPI.config.getInvalidRepos()
      const stillInvalid = invalid.find((repo) => repo.name === name)
      return stillInvalid
        ? { reason: stillInvalid.reason, error: t('repoSetup.error') }
        : { resolvedPath: folderPath }
    } catch (e) {
      return { unverified: true, error: e instanceof Error ? e.message : t('repoSetup.unverified') }
    }
  }, [t])

  /**
   * Add a repository from a picked folder, then re-check it — `addRepository` only
   * warns about a folder that does not exist or is not a git repository, so an
   * unverified row would claim "Ready" for exactly what handleChooseFolder is
   * careful not to claim. Repositories are keyed by name, so two folders sharing a
   * basename would overwrite each other silently: the same guard Settings uses runs
   * first. Only the write itself is caught here; see recheck for why.
   */
  const handleAddRepo = useCallback(async () => {
    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return
    const folderName = folderPath.split(/[\\/]/).pop() || ''
    const name = folderName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
    if (!name) { setAddError(t('toast.invalidFolderName')); return }
    if (config?.repositories?.[name]) { setAddError(t('toast.repoExists', { name })); return }
    setAddBusy(true)
    setAddError(null)
    try {
      await addRepository(name, folderPath, [])
    } catch (e) {
      setAddError(e instanceof Error ? e.message : t('repoSetup.error'))
      setAddBusy(false)
      return
    }
    // The write landed: the repository is in the config whatever the re-check says,
    // so it is listed from here on and only its verdict is still open.
    const state = await recheck(name, folderPath)
    setRowStates((prev) => ({ ...prev, [name]: state }))
    setAdded((prev) => (prev.some((r) => r.name === name) ? prev : [...prev, { name, path: folderPath }]))
    setAddBusy(false)
  }, [addRepository, config, recheck, t])

  /**
   * Bind a folder to an existing repository, then re-check whether that fixed it.
   * `updateRepository` writes the path without validating it, so a folder that is
   * not a git repository would otherwise get a green check. A failed write keeps
   * whatever the row already showed — replacing that state would strip the reason
   * an added row has no prop to fall back on, leaving it green AND in error.
   */
  const handleChooseFolder = useCallback(async (name: string) => {
    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return
    setRowStates((prev) => ({ ...prev, [name]: { ...prev[name], busy: true, error: undefined } }))
    try {
      await updateRepository(name, { path: folderPath })
    } catch (e) {
      setRowStates((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          busy: false,
          error: e instanceof Error ? e.message : t('repoSetup.error'),
        },
      }))
      return
    }
    const state = await recheck(name, folderPath)
    setRowStates((prev) => ({ ...prev, [name]: state }))
  }, [updateRepository, recheck, t])

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-line rounded-xl w-full max-w-md mx-4 animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow/10 rounded-lg">
              <FolderGit2 className="w-4 h-4 text-yellow" />
            </div>
            <h3 className="text-base font-semibold">
              {t(effectiveMode === 'empty' ? 'repoSetup.title.empty' : 'repoSetup.title.fix')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable, so a long list of repositories stays usable */}
        <div className="px-5 pb-5 max-h-[50vh] overflow-y-auto">
          <p className="text-text-secondary text-sm mb-4">
            {t(effectiveMode === 'empty' ? 'repoSetup.body.empty' : 'repoSetup.body.fix')}
          </p>

          {effectiveMode === 'empty' ? (
            <div className="space-y-3">
              <button
                onClick={handleAddRepo}
                disabled={addBusy}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm border border-dashed border-line-strong rounded-lg text-text-secondary hover:border-accent/40 hover:text-ink transition-colors disabled:opacity-40"
              >
                {addBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                {t('repoSetup.addRepo')}
              </button>
              {added.length > 0 && (
                <div className="space-y-1.5">
                  {added.map((repo) => (
                    <RepoRow
                      key={repo.name}
                      name={repo.name}
                      path={repo.path}
                      state={rowStates[repo.name]}
                      onChooseFolder={() => handleChooseFolder(repo.name)}
                    />
                  ))}
                </div>
              )}
              {addError && (
                <div className="px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
                  {addError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayed.rows.map((row) => (
                <RepoRow
                  key={row.name}
                  name={row.name}
                  path={row.path}
                  reason={row.reason}
                  state={rowStates[row.name]}
                  onChooseFolder={() => handleChooseFolder(row.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary/50 hover:text-text-secondary transition-colors"
          >
            {t('app.later')}
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
