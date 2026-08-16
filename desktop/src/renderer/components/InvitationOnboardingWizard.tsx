import { useState, useCallback, useEffect, useMemo } from 'react'
import { Mail, ChevronLeft, ChevronRight, X, Check, Download, Folder, FolderOpen, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOrg } from '../hooks/useOrg'
import { useConfig } from '../hooks/useConfig'
import { useT, type Translate } from '../i18n'
import { isCloneErrorCode } from '../../types'
import { INPUT } from '../theme/controls'
import { repoBasename } from '../../repoMatch'
import { REASON_META, type RepoSetupReason } from '../utils/repoSetup'
import {
  detectFolderNameMismatch,
  isKeyTaken,
  listBindableOrgRepos,
  slugifyRepoName,
  type FolderNameVerdict,
  type OrgRepoRow,
} from '../utils/orgRepoBinding'

interface InvitationOnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  initialToken?: string
}

/**
 * Per-row progress on step 2. Absent = untouched, and every writer sets exactly
 * one of these — the states are alternatives, never combined.
 */
interface RowState {
  /**
   * Work in flight, and which button started it — a clone takes minutes rather
   * than milliseconds, so its button says "Cloning…" instead of spinning silently
   * while the other one does the waiting.
   */
  busy?: 'link' | 'clone'
  /**
   * A picked folder whose name does not look like the repository's, held until
   * the user confirms. Non-blocking on purpose: a local clone is allowed to be
   * named anything, so this asks rather than refuses. Carries the verdict itself
   * so 'belongs-to-other' is the only shape that has an `otherRepoName`.
   */
  pending?: { path: string } & Exclude<FolderNameVerdict, { kind: 'none' }>
  /** The re-check's verdict when the bound folder is still not usable. */
  reason?: RepoSetupReason
  /**
   * `config:addRepository` succeeds on a folder that does not exist or is not a
   * git repository, and reports it as a warning instead. The repository really
   * was added, so this is not an error — but a row that says nothing would be
   * the same silent success this step exists to remove.
   */
  warning?: string
  error?: string
}

const TOTAL_STEPS = 3

/** The row's two action buttons, which differ only in icon and label. */
const ROW_ACTION =
  'flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all disabled:opacity-40'

/**
 * What to show for a failed clone.
 *
 * `repo:clone` throws a message-catalogue key for every failure it can explain
 * (see CLONE_ERROR_CODES) and git's own text for the ones it cannot. Translating
 * only the keys keeps that raw text intact — losing it would replace a precise
 * git error with a generic apology.
 */
function cloneErrorMessage(error: unknown, t: Translate): string {
  const message = error instanceof Error ? error.message : String(error)
  // Electron wraps a handler's throw as "Error invoking remote method '…': Error: <message>".
  const unwrapped = message.replace(/^Error invoking remote method '[^']*': (?:Error: )?/, '')
  return isCloneErrorCode(unwrapped) ? t(unwrapped) : unwrapped || t('repoSetup.error')
}

interface OrgRepoBindRowProps {
  row: OrgRepoRow
  state?: RowState
  onLink: () => void
  onClone: () => void
  onConfirm: (folderPath: string) => void
  onCancel: () => void
}

/**
 * One repository of the organization, with the folder it is bound to on this
 * machine — or the yellow "no folder yet" state and the button to bind one.
 *
 * Local to this wizard on purpose: the launch modal's row answers a different
 * question ("which of your repositories are broken"), and merging the two would
 * make each one carry the other's states.
 */
function OrgRepoBindRow({ row, state = {}, onLink, onClone, onConfirm, onCancel }: OrgRepoBindRowProps) {
  const t = useT()
  const pending = state.pending
  // Only offered for a repo that is BOTH clonable and absent. A repo already on
  // disk gets "Link folder" alone: cloning it again would either fail on a
  // non-empty folder or leave the user with a second, unrelated checkout.
  const canClone = !!row.remoteUrl && !row.path

  return (
    <div className="px-3 py-2 bg-surface border border-line-field rounded-lg">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{row.displayName}</div>
          {row.path ? (
            <div className="text-xs text-text-secondary/50 truncate">{row.path}</div>
          ) : (
            // The same state the launch modal names, from the same table — one
            // vocabulary and one tone for "no folder on this machine".
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[11px] rounded-full bg-yellow/10 text-yellow">
              <FolderOpen className="w-3 h-3" />
              {t(REASON_META['no-local-path'].labelKey)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canClone && (
            <button onClick={onClone} disabled={!!state.busy} className={ROW_ACTION}>
              {state.busy === 'clone'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('invite.wizard.cloning')}</>
                : <><Download className="w-3.5 h-3.5" />{t('invite.wizard.clone')}</>}
            </button>
          )}
          <button onClick={onLink} disabled={!!state.busy} className={ROW_ACTION}>
            {state.busy === 'link'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <><FolderOpen className="w-3.5 h-3.5" />{t(row.path ? 'invite.wizard.changeFolder' : 'invite.wizard.linkFolder')}</>}
          </button>
        </div>
      </div>

      {/* Name mismatch — a question, never a wall: the user can link anyway. */}
      {pending && (
        <div className="mt-2 px-3 py-2 bg-yellow/10 border border-yellow/20 rounded-lg text-xs text-yellow">
          <p>
            {pending.kind === 'belongs-to-other'
              ? t('invite.wizard.belongsToOther', { folder: repoBasename(pending.path), name: pending.otherRepoName })
              : t('invite.wizard.mismatchWarning', { folder: repoBasename(pending.path), name: row.displayName })}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onConfirm(pending.path)}
              className="px-2.5 py-1 font-medium bg-yellow/15 hover:bg-yellow/25 rounded-lg transition-colors"
            >
              {t('invite.wizard.linkAnyway')}
            </button>
            <button
              onClick={onCancel}
              className="px-2.5 py-1 text-text-secondary hover:text-ink transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Added, but the main process flagged the folder — yellow, not red. */}
      {state.warning && (
        <div className="mt-2 px-3 py-2 bg-yellow/10 border border-yellow/20 rounded-lg text-xs text-yellow">
          {state.warning}
        </div>
      )}

      {/* A verdict and a failure are alternatives, so they share one block. */}
      {(state.reason || state.error) && (
        <div className="mt-2 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
          {state.reason
            ? t('invite.wizard.linkInvalid', { reason: t(REASON_META[state.reason].labelKey) })
            : state.error}
        </div>
      )}
    </div>
  )
}

/**
 * Invitation onboarding: accept token → sign up/in → accept invitation → bind
 * the org's repositories to their local folders (everything else is inherited
 * from the org). Skippable — the app never blocks on it. Modeled on
 * ProfileOnboardingWizard.
 */
export function InvitationOnboardingWizard({ isOpen, onClose, initialToken = '' }: InvitationOnboardingWizardProps) {
  const { login, signup } = useAuth()
  const { accept } = useOrg()
  const { config, loadConfig, addRepository, updateRepository } = useConfig()
  const t = useT()

  const [step, setStep] = useState(1)
  const [token, setToken] = useState(initialToken)
  const [isNewAccount, setIsNewAccount] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  // The org the invitation landed in, pinned at accept time: step 2 keeps
  // listing the repositories of the org just joined even if the active org
  // changes under it mid-flow.
  const [orgId, setOrgId] = useState<string | null>(null)
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  // Repositories added here that the org does not have. They are created
  // personal, so they never appear among the org rows — listed apart so the
  // user still sees what they just added.
  const [addedKeys, setAddedKeys] = useState<string[]>([])
  // The parent folder clones land in. Read from the main process — it owns the
  // default (~/dev) and the memory of a previous choice — so it is null until the
  // first read answers rather than flashing a guess the app might not use.
  const [cloneDestination, setCloneDestinationState] = useState<string | null>(null)

  useEffect(() => { setToken(initialToken) }, [initialToken])

  // Only once step 2 is reachable: before that there is nothing to clone into,
  // and the wizard may well be closed again from step 1. Asked once — step 2 is
  // re-enterable via Back, and the only thing that changes the destination
  // afterwards is handleChangeDestination, which sets the state itself.
  useEffect(() => {
    if (step !== 2 || cloneDestination !== null) return
    window.electronAPI.repo.getCloneDestination()
      .then(({ destination }) => setCloneDestinationState(destination))
      .catch(() => setCloneDestinationState(null))
  }, [step, cloneDestination])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Step 1 → 2: authenticate then accept the invitation (membership + inherit config).
  const handleAcceptInvitation = useCallback(async () => {
    if (busy) return
    setError(null)
    if (!token.trim()) { setError(t('invite.error.tokenRequired')); return }
    if (!email.trim() || !password) { setError(t('invite.error.credentialsRequired')); return }

    setBusy(true)
    try {
      const status = isNewAccount
        ? await signup(email.trim(), password, { invitationToken: token.trim() })
        : await login(email.trim(), password)

      if (!status.loggedIn) {
        setError(t('invite.error.confirmEmail'))
        return
      }

      // `accept` resolves with the org it joined — no need to ask again for it.
      const result = await accept(token.trim())
      setOrgId(result?.orgId ?? null)
      setOrgName((await window.electronAPI.org.current())?.name ?? null)
      // Reflect the inherited config merge in the UI immediately — step 2 lists
      // the org's repositories straight out of it, so it must not run on the
      // pre-invitation config.
      await loadConfig()
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('invite.error.acceptFailed'))
    } finally {
      setBusy(false)
    }
  }, [busy, token, email, password, isNewAccount, signup, login, accept, loadConfig])

  const repositories = useMemo(() => config?.repositories ?? {}, [config])

  // The org's repositories, by name — what the invitee binds instead of guessing.
  const orgRows = useMemo(
    () => listBindableOrgRepos(repositories, orgId),
    [repositories, orgId],
  )

  // The extra repositories added from here. They are created personal, so the
  // personal scope is exactly what builds them — same mapper, same shape as the
  // org rows. Kept in the order they were added, and anything that has meanwhile
  // become an org repo is dropped: the org list already has it.
  const addedRows = useMemo(() => {
    const personal = new Map(listBindableOrgRepos(repositories, null).map((row) => [row.key, row]))
    return addedKeys
      .map((key) => personal.get(key))
      .filter((row): row is OrgRepoRow => !!row && !orgRows.some((org) => org.key === row.key))
  }, [addedKeys, repositories, orgRows])

  /**
   * Ask the main process whether the path a row just acquired — picked or cloned —
   * actually produced a usable repo, and settle the row on the answer.
   *
   * Not belt and braces: `config:updateRepository` validates the path but drops
   * the warning it computes, so without this a folder that is not a git repository
   * — or one that has since moved — binds silently, which is the failure this step
   * exists to remove. Runs only AFTER the write has landed, which is what makes
   * its own failure different: the verdict is unknown, the write is not, so the
   * row stays actionable and claims nothing.
   */
  const recheck = useCallback(async (key: string) => {
    try {
      const invalid = await window.electronAPI.config.getInvalidRepos()
      const stillInvalid = invalid.find((repo) => repo.name === key)
      setRowStates((prev) => ({ ...prev, [key]: stillInvalid ? { reason: stillInvalid.reason } : {} }))
    } catch (e) {
      // The write landed; only its verdict is unknown. Say exactly that.
      setRowStates((prev) => ({
        ...prev,
        [key]: { error: e instanceof Error ? e.message : t('repoSetup.unverified') },
      }))
    }
  }, [t])

  const bindFolder = useCallback(async (key: string, folderPath: string) => {
    setRowStates((prev) => ({ ...prev, [key]: { busy: 'link' } }))
    try {
      await updateRepository(key, { path: folderPath })
    } catch (e) {
      setRowStates((prev) => ({
        ...prev,
        [key]: { error: e instanceof Error ? e.message : t('repoSetup.error') },
      }))
      return
    }
    await recheck(key)
  }, [updateRepository, recheck, t])

  /** Pick a folder for one org repo. A name that does not match only warns. */
  const handleLinkFolder = useCallback(async (row: OrgRepoRow) => {
    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return
    setError(null)
    // Only the org rows are comparable; a row added from the escape hatch is not
    // in this list, so it binds without a name check — it has nothing to match.
    const verdict = detectFolderNameMismatch(folderPath, row.key, orgRows)
    if (verdict.kind === 'none') {
      await bindFolder(row.key, folderPath)
      return
    }
    setRowStates((prev) => ({
      ...prev,
      [row.key]: { pending: { path: folderPath, ...verdict } },
    }))
  }, [orgRows, bindFolder])

  const handleCancelPending = useCallback((key: string) => {
    setRowStates((prev) => ({ ...prev, [key]: {} }))
  }, [])

  /**
   * Clone an org repository into the chosen destination and bind it.
   *
   * The main process binds the path itself — to the ORG's repository, never to a
   * new entry — so the config on this side is stale the moment it returns. Hence
   * the explicit `loadConfig()`: `bindFolder` gets the same refresh for free from
   * `useConfig.updateRepository`, and without it the row would keep showing "no
   * folder" and offering to clone what was just cloned.
   *
   * It runs alongside the re-check rather than before it: `repos:getInvalid` reads
   * the main process's own config, which `repo:clone` already updated before it
   * resolved, so it does not wait on this renderer catching up.
   */
  const handleClone = useCallback(async (row: OrgRepoRow) => {
    setError(null)
    setRowStates((prev) => ({ ...prev, [row.key]: { busy: 'clone' } }))
    try {
      await window.electronAPI.repo.clone(row.key)
    } catch (e) {
      setRowStates((prev) => ({ ...prev, [row.key]: { error: cloneErrorMessage(e, t) } }))
      return
    }
    await Promise.all([loadConfig(), recheck(row.key)])
  }, [loadConfig, recheck, t])

  /** Change where clones land. Remembered by the main process, for every repo. */
  const handleChangeDestination = useCallback(async () => {
    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return
    try {
      const { destination } = await window.electronAPI.repo.setCloneDestination(folderPath)
      setCloneDestinationState(destination)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('repoSetup.error'))
    }
  }, [t])

  /**
   * Escape hatch: a repository the org does not have. Repositories are keyed by
   * name, so an unchecked add would silently overwrite one of the org's — the
   * guard runs against the whole config, not against a local list.
   */
  const handleAddOtherRepo = useCallback(async () => {
    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return
    const name = slugifyRepoName(repoBasename(folderPath))
    if (!name) { setError(t('toast.invalidFolderName')); return }
    if (isKeyTaken(repositories, orgRows, name)) { setError(t('invite.error.repoExists', { name })); return }
    setError(null)
    setBusy(true)
    try {
      const result = await addRepository(name, folderPath, [])
      setAddedKeys((prev) => (prev.includes(name) ? prev : [...prev, name]))
      // Same reasoning as bindFolder's re-check, one round-trip cheaper: this
      // handler is told about a folder that is not a git repository, so the row
      // has to say so rather than render as usable.
      setRowStates((prev) => ({ ...prev, [name]: result?.warning ? { warning: result.warning } : {} }))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('repoSetup.error'))
    } finally {
      setBusy(false)
    }
  }, [repositories, orgRows, addRepository, t])

  /**
   * Step 2 → 3. Nothing left to persist — every binding was written as it was
   * made — so this only re-runs the shared-config merge, best effort, to catch
   * org repositories that landed after the merge at accept time. It fills only
   * keys still undefined and never touches `path`, so a repo bound above keeps
   * both the org's settings and its local folder. Repositories added from the
   * escape hatch are personal, and `mergeOrgSharedConfig` skips them by design.
   */
  const handleFinishRepos = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await window.electronAPI.org.applySharedConfig().catch(() => undefined)
      loadConfig()
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('invite.error.addReposFailed'))
    } finally {
      setBusy(false)
    }
  }, [busy, loadConfig, t])

  if (!isOpen) return null

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
            <div className="p-2 bg-accent/10 rounded-lg">
              <Mail className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">{t('invite.wizard.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-5 pb-4">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-accent' : 'bg-surface-strong'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pb-5 min-h-[220px]">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">{t('invite.wizard.acceptTitle')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">
                  {t('invite.wizard.acceptHelp')}
                </div>
              </div>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t('invite.wizard.tokenPlaceholder')}
                autoFocus
                className={`${INPUT} w-full font-mono`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsNewAccount(true)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${isNewAccount ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface border-line-field text-text-secondary hover:text-ink'}`}
                >
                  {t('invite.wizard.newAccount')}
                </button>
                <button
                  onClick={() => setIsNewAccount(false)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${!isNewAccount ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface border-line-field text-text-secondary hover:text-ink'}`}
                >
                  {t('invite.wizard.existingAccount')}
                </button>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('invite.wizard.emailPlaceholder')}
                className={`${INPUT} w-full`}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('invite.wizard.passwordPlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAcceptInvitation() }}
                className={`${INPUT} w-full`}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">{t('invite.wizard.orgReposTitle')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">
                  {t('invite.wizard.orgReposHelp')}
                </div>
              </div>

              {/* Where clones land. Shown before the rows because it applies to
                  all of them, and changeable here because otherwise the "chosen
                  once, remembered after" half of the flow has no way in. */}
              {cloneDestination && (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line-field rounded-lg">
                  <Folder className="w-3.5 h-3.5 text-text-secondary/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text-secondary/60">{t('invite.wizard.cloneDestination')}</div>
                    <div className="text-xs truncate" title={cloneDestination}>{cloneDestination}</div>
                  </div>
                  <button
                    onClick={handleChangeDestination}
                    className="px-2.5 py-1 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all flex-shrink-0"
                  >
                    {t('invite.wizard.changeDestination')}
                  </button>
                </div>
              )}

              {/* Scrollable, so an org with twenty repositories stays usable */}
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {orgRows.length === 0 && addedRows.length === 0 && (
                  <div className="px-3 py-2 bg-surface border border-line-field rounded-lg text-xs text-text-secondary">
                    {t('invite.wizard.noOrgRepos')}
                  </div>
                )}
                {[...orgRows, ...addedRows].map((row) => (
                  <OrgRepoBindRow
                    key={row.key}
                    row={row}
                    state={rowStates[row.key]}
                    onLink={() => handleLinkFolder(row)}
                    onClone={() => handleClone(row)}
                    onConfirm={(folderPath) => bindFolder(row.key, folderPath)}
                    onCancel={() => handleCancelPending(row.key)}
                  />
                ))}
              </div>

              <button
                onClick={handleAddOtherRepo}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm border border-dashed border-line-strong rounded-lg text-text-secondary hover:border-accent/40 hover:text-ink transition-colors disabled:opacity-40"
              >
                <Folder className="w-4 h-4" />
                {t('invite.wizard.addOtherRepo')}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
              <div className="p-3 bg-green/10 rounded-full">
                <Check className="w-6 h-6 text-green" />
              </div>
              <div className="text-sm font-medium">{t('invite.wizard.doneTitle')}</div>
              <div className="text-xs text-text-secondary/60">
                {orgName ? t('invite.wizard.doneNamed', { name: orgName }) : t('invite.wizard.doneFallback')}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t('common.back')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary/50 hover:text-text-secondary transition-colors"
              >
                {t('common.skip')}
              </button>
            )}
            {step === 1 && (
              <button
                onClick={handleAcceptInvitation}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>{t('invite.wizard.accept')}<ChevronRight className="w-3.5 h-3.5" /></>}
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleFinishRepos}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ChevronRight className="w-3.5 h-3.5" />{t('invite.wizard.continue')}</>}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {t('common.done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
