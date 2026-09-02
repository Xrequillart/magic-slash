import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ChangedFile, Config, TerminalInfo, TerminalState, TerminalMetadata, ScriptTerminalInfo, SettingsTab, Org, PRReviewThread } from '../../types'
import { reviewFileKey } from '../utils/reviewLayout'
import {
  commentFileKey, commentFileKeyPrefix,
  type CommentTarget, type LineRange,
} from '../utils/commentAnchors'
import { migrateSkillsContextWindow } from '../pages/Skills/contextWindow'

interface CloseAgentModalData {
  terminalId: string
  terminalName: string
}

/** Agents is the only page; everything else opens as a centered overlay. */
export type ModalId = 'settings' | 'skills' | 'team' | 'tasks'

/**
 * The two windows the Skills page offers as presets — the ones worth comparing,
 * and the two values its switch can force.
 *
 * Kept as a closed pair rather than a bare `number`: the switch renders one
 * segment per member, so widening this type would silently leave a preset
 * undrawn.
 */
export type SkillsContextWindow = 200_000 | 1_000_000

/**
 * The model context window the Skills page sizes its listing budget against.
 *
 * Claude Code derives that budget from the window (1% of it, in characters), so
 * the same set of skills is comfortable on a 1M model and already over budget on
 * a 200k one. On 'auto' — the default — the page reads the window off the agents
 * actually running, which Claude Code reports through the statusline hook. The
 * two presets are explicit overrides: what these skills would look like on
 * another model, and the answer when nothing is running.
 *
 * A viewing preference, never written back to Claude Code's settings.
 */
export type SkillsContextWindowSetting = 'auto' | SkillsContextWindow

/**
 * The single-file preview's payload, which is now the SPEC panel's surface alone.
 *
 * A changed file in a repository no longer opens this — it opens `RepoReview` below, with
 * every changed file of that repository stacked. What is left here is the one preview
 * that is not a git change at all: `status: ''`, and a `repoPath` that is the spec's
 * parent directory rather than a repository root.
 *
 * Named rather than spelled inline at the two places that mention it — the state field and
 * its setter — on `RepoReview`'s precedent below and for a sharper reason: those two are the
 * halves of one contract, and while the shape was a literal each side, the next field added
 * to one of them type-checks perfectly well without the other. A setter that accepts what the
 * state cannot hold, or the reverse, surfaces only as a value quietly lost at runtime.
 */
export interface SelectedFile {
  repoPath: string
  path: string
  status: string
  /**
   * Present only for a `/magic:plan` spec, and it is what the drawer READS rather than
   * assumes. It opens commenting on the expanded view: the comments already exist under the
   * spec's key, but the capability has to be turned on where the document is being shown.
   *
   * It carries the owning agent's terminal id, because that is the send target for those
   * comments, and ONE field carries both facts so that a spec without its agent is a state
   * nobody can write down. `resolveAgentTarget` falls back to whichever terminal is SELECTED
   * when no target is given, which in split mode is not the agent whose spec this is — see
   * `SpecPanel`'s `agentId` prop for the failure that fallback would silently reintroduce.
   */
  spec?: { agentId: string }
}

/**
 * A repository being reviewed: every changed file at once, in one scroll.
 *
 * `files` is a COPY taken at click time, never a live read of the sidebar's git data.
 * That data is re-polled every five seconds and replaced wholesale when a byte differs,
 * so a live list would re-key the cards under the reader — a file dropping out mid-read
 * unmounts a card, a status flipping `modified → renamed` changes the read's cache key,
 * and either one moves every offset the panel measured. Freezing the list is what makes
 * "the view does not refresh while the agent edits" true by construction rather than by
 * a rule someone has to remember.
 *
 * `anchorPath` is the file the reader clicked. It positions the review and nothing
 * else: every file in `files` is rendered either way, so the anchor is where the scroll
 * lands, not what is shown.
 */
export interface RepoReview {
  repoPath: string
  repoName: string
  files: ChangedFile[]
  anchorPath: string
  /**
   * Bumped on every open, including re-opening on the file already anchored.
   *
   * The panel needs a signal that says "take the reader back to that card" even when
   * nothing else about the review changed — same repository, same list, same path, same
   * bytes already read. Object identity plays that role for `selectedFile`; a review is
   * compared field by field, so it carries the counter explicitly.
   */
  anchorSeq: number
}

/**
 * A pull request's conversation, as the sliding panel reads it.
 *
 * A COPY of the threads the card fetched, taken at click time, and for `RepoReview`'s
 * reason turned inside out: the card re-fetches its threads whenever the fold is
 * reopened or the refresh button is pressed, and a panel reading that state live would
 * have the exchange it is scrolled into replaced mid-read. Freezing the list is what
 * makes the panel a picture of one moment rather than a second subscriber to a poll.
 *
 * Never persisted, in either `partialize`, and cleared on the same events the file
 * preview is: these are whole comment BODIES — the thing `RepositoryMetadata` is
 * carefully kept free of — and they have no business outliving the reading of them.
 *
 * No `prTitle`, deliberately. Nothing that opens this panel knows one: the card renders
 * from `prUrl` and a `RepositoryMetadata` that carries a state, some counts and no
 * title. A field only the store could fill with a placeholder is a field that would be
 * a placeholder forever, so the header names the PR by its number, read off the URL.
 */
export interface PRCommentsView {
  prUrl: string
  threads: PRReviewThread[]
  /**
   * The thread the reader clicked, or null when the panel was opened on the list as a
   * whole. It positions the scroll and nothing else — every thread is rendered either
   * way, exactly as `RepoReview.anchorPath` works.
   */
  anchorThreadId: string | null
  /**
   * Bumped on every open, including re-opening on the thread already anchored.
   *
   * `RepoReview.anchorSeq`'s twin, and it exists for the identical reason: clicking the
   * same row twice has to take the reader back to it the second time, and every other
   * field would be identical. The panel keys its scroll effect on this counter, not on
   * `anchorThreadId`.
   */
  anchorSeq: number
}

/**
 * One note a reader left on a file being reviewed.
 *
 * `anchor` is the LINES, in the numbering of the file they belong to — never a position
 * in the rendering. The rendering is not stable: the diff injects a row per deleted line,
 * the changes-only view drops whole regions, and a theme change re-reads the file and
 * swaps the entire HTML string. So the anchor is re-derived from these numbers on every
 * render, and nothing anywhere holds a reference to a row.
 *
 * `quote` is what was selected, kept ALONGSIDE the line numbers rather than instead of
 * them. The numbers are what an agent can act on; the quote is what tells a reader — and
 * the agent — whether the lines still say what the comment was about, which is the one
 * thing line numbers cannot survive an edit and still answer.
 *
 * `null` is a comment with no line numbers, and it now means TWO things: the whole file when
 * nothing was quoted, and a QUOTED PASSAGE when something was — a comment left on a markdown
 * card switched to its rendered view, where the prose has no mapping back to the file's lines
 * and the quote is therefore the whole of the anchor. That is why the shape did not have to
 * widen for it, and why `commentAnchorKind` in `utils/commentAnchors` exists: one function
 * reads these two fields together and answers which of the three a comment is, so the card,
 * the list, the marker sweep and the text handed to the agent cannot come to disagree.
 */
export interface FileComment {
  id: string
  anchor: LineRange | null
  quote: string
  body: string
  createdAt: number
}

/**
 * A comment as a view hands it over: everything except the two fields the store mints.
 */
export type NewFileComment = Omit<FileComment, 'id' | 'createdAt'>

/**
 * A comment's id.
 *
 * A counter and a timestamp rather than `crypto.randomUUID()`, which needs a secure
 * context and would therefore be one packaging change away from throwing in the one
 * window nobody tested. Ids only have to be unique among the comments of one session —
 * they are never persisted and never leave the renderer — and a module-scope counter is
 * unique across every caller in the app, which is the only scope that could be wrong.
 */
let commentSeq = 0
function newCommentId(): string {
  return `c${Date.now().toString(36)}-${commentSeq++}`
}

/**
 * The counter behind `focusedComment.seq`.
 *
 * At module scope, like `commentSeq` above, and for a reason `anchorSeq`'s in-state counter
 * does not have to face: this field is CLEARED to `null` whenever the review changes, so a
 * sequence read off the value being replaced would restart at 1 — while the consumers that
 * remember which seq they have already acted on are components that may not have unmounted
 * (the same repository, another anchor). The second request would then carry a number one of
 * them had already crossed off, and the jump would be silently dropped. A counter that never
 * goes back cannot produce that.
 */
let focusSeq = 0

/**
 * No comments, as ONE array.
 *
 * Every selector below reads `fileComments[key] ?? NO_COMMENTS`, never `?? []`: zustand
 * v4 compares a selector's result by identity, so a fresh `[]` per call makes every
 * subscriber re-render on every unrelated store mutation — and this store is a busy one
 * (terminal state, config, the five-second git poll). With forty cards mounted that is
 * forty re-rendered shiki documents, each one re-running the layout effect that stamps
 * the markers. The same trick as `NO_CHANGES` in FilePreviewPanel.
 */
export const NO_COMMENTS: FileComment[] = []

interface AppState {
  // Config
  config: Config | null
  configLoading: boolean
  configError: string | null

  // Organization (cloud, multi-org). Held globally so the switcher and other
  // views react live to the active org / membership set. Ephemeral (not
  // persisted) — refreshed from the main process on mount and after mutations.
  activeOrg: Org | null
  orgs: Org[]

  // Terminals
  terminals: TerminalInfo[]
  activeTerminalId: string | null

  // Split screen
  splitTerminalId: string | null
  focusedPane: 'primary' | 'secondary'
  isSplitMode: boolean
  isWideScreen: boolean
  splitEnabled: boolean
  splitActive: boolean
  rightPaneTerminalIds: string[]

  // UI
  // When set, the Config page selects this settings tab on mount, then resets it
  // to null. Lets other views (e.g. the sidebar account menu) deep-link a tab.
  settingsInitialTab: SettingsTab | null
  // Which organization the Organization page is scoped to. Held here rather than
  // in the page because the settings rail lists the organizations too, and both
  // it and the page's tab strip have to agree on which one is open. `null` = the
  // user has not picked one, so the page falls back to the first.
  settingsOrgId: string | null
  // The overlay currently on screen, if any. Only one can be open at a time.
  activeModal: ModalId | null
  rightSidebar: 'info' | null
  leftSidebarVisible: boolean
  // Which context window the Skills page's budget gauges are scaled to. See
  // SkillsContextWindowSetting above.
  skillsContextWindow: SkillsContextWindowSetting

  // Script terminals
  scriptTerminals: ScriptTerminalInfo[]

  /**
   * The script whose terminal dialog is showing, and whether that dialog is open.
   *
   * A full SNAPSHOT rather than an id, because the script it names may already be gone
   * from `scriptTerminals`: the exit listener removes a script that exited 0, and the
   * dialog has to keep showing that output rather than vanish with it.
   *
   * Payload and flag are separate for the reason `WhatsNewModal` gives: the dialog needs
   * its content while it animates out, so closing clears only the flag. The next open
   * overwrites the payload.
   *
   * Both live here, and not in the repository card the script is clicked from, because
   * that card is only rendered for the INSPECTED agent — switching agents would unmount
   * the dialog mid-read, and an agent sharing the same repository path would inherit it.
   */
  scriptTerminalModal: ScriptTerminalInfo | null
  scriptTerminalModalOpen: boolean

  // Close agent modal
  closeAgentModal: CloseAgentModalData | null

  // Launch repository-setup modal: dismissed for this session ("Later"). Session
  // storage, so it survives a renderer reload but comes back on the next launch.
  repoSetupDismissed: boolean

  /** The single-file preview, when one is open — see `SelectedFile` for what it carries. */
  selectedFile: SelectedFile | null

  /** The repository review, when one is open. Mutually exclusive with `selectedFile`. */
  review: RepoReview | null

  /**
   * The PR comments panel, when one is open.
   *
   * A THIRD occupant of the same slot, mutually exclusive with the two above: all three
   * are the same sliding drawer over the same backdrop, and two of them open at once
   * would be two panels stacked on one z-index with only one backdrop between them. So
   * every action that opens one clears the other two, and this field is listed wherever
   * `selectedFile` and `review` are.
   */
  prComments: PRCommentsView | null

  /**
   * Which cards the reader has folded shut, keyed by `reviewFileKey`.
   *
   * Deliberately NOT in either `partialize`. The store is a module singleton, so
   * closing the drawer and opening it again already finds this map exactly as it was —
   * which is the whole of what "reopening lands on the same file with the same cards
   * collapsed" asks for. Persisting it would instead accumulate a key per file anyone
   * ever collapsed, in any repository, for as long as the install lives, with nothing
   * that could ever tell which of those files still exist.
   */
  collapsedFiles: Record<string, boolean>

  /**
   * The comments left on each file, keyed by `commentFileKey` — the repository path, the
   * file path and a fingerprint of the version being commented on, joined with NUL bytes.
   *
   * On a file read as a DIFF, that fingerprint is derived from the content, and it is what
   * stops a comment outliving the diff it was about. Line numbers and a quote mean something
   * against ONE state of a file, and the agent this app drives rewrites files continuously —
   * so when a file moves its key moves with it, and the old entries stop resolving rather
   * than re-attaching to whatever now sits at those line numbers. `diffFingerprint` carries
   * the argument for deriving it from the content; `addFileComment` below is what keeps the
   * entries left behind from piling up.
   *
   * On a file read LIVE — the agent sidebar's spec panel, which re-reads the document every
   * time `/magic:plan` saves it — the key carries `SPEC_FINGERPRINT` instead, one string for
   * every version. That is not an exception to the reasoning above so much as the same
   * reasoning reaching the other conclusion: a content-derived key would mint a new name on
   * every save, and there the reader is still looking at the passage they commented on. The
   * comment is anchored to a QUOTE and nothing else, so it has no line numbers to be wrong
   * about — `locateQuote` re-searches the passage in the text as it now stands, and reports a
   * lost anchor when the agent has rewritten it away. So the two key spaces cohabit here, and
   * `SPEC_FINGERPRINT` is where the proof that they cannot collide lives.
   *
   * Deliberately NOT in either `partialize`, and that absence is the feature. The store
   * is a module singleton, so these survive everything a reading session does to them:
   * folding a card shut, scrolling forty files away, switching to another file, closing
   * the drawer and opening it again. They do NOT survive relaunching the app, which is
   * what "for the session" means here — a comment is a note to the agent about the diff
   * currently on the branch, and a diff does not outlive a restart in any useful sense.
   * Persisting them would instead accumulate notes about code that has since been
   * rewritten, keyed by paths with nothing that could ever say which still exist.
   *
   * A flat map rather than a nested `Record<repo, Record<path, …>>` for the reason spelled
   * out on `reviewFileKey`: it is only ever read one file at a time, and a flat key cannot
   * leave a repository entry behind holding nothing.
   */
  fileComments: Record<string, FileComment[]>

  /**
   * Which stored comment the review has been asked to take the reader to.
   *
   * STATE rather than an imperative call, and that is the whole reason it is in the store
   * at all. The comment being jumped to is very often in a card that is folded shut, or in
   * one whose read has not come back — `highlightedHtml` arrives asynchronously — so there
   * are no rows to open a card against at the moment the reader clicks the entry. A
   * `querySelector` on the next frame would find nothing in exactly the case that matters.
   * As state it is simply read by whichever CodeView eventually mounts for that file, in
   * the first render it has rows in, and the card opens then.
   *
   * `seq` is a counter on `review.anchorSeq`'s model, and for its reason: two clicks on the
   * SAME entry have to do the jump twice, and every other field would be identical the
   * second time. Consumers key their effect on it rather than comparing the target, and
   * remember the last one they acted on — which is why it comes from a module counter that
   * never restarts rather than from the value being replaced. See `focusSeq`.
   *
   * Cleared wherever `review` is, since it names a comment of the review being left.
   */
  focusedComment: { target: CommentTarget; id: string; seq: number } | null

  // Actions
  setConfig: (config: Config) => void
  setConfigLoading: (loading: boolean) => void
  setConfigError: (error: string | null) => void

  setActiveOrg: (org: Org | null) => void
  setOrgs: (orgs: Org[]) => void

  addTerminal: (terminal: TerminalInfo) => void
  updateTerminalState: (id: string, state: TerminalState) => void
  updateTerminalBranch: (id: string, branchName: string | null) => void
  updateTerminalMetadata: (id: string, metadata: Partial<TerminalMetadata>) => void
  updateTerminalRepositories: (id: string, repositories: string[]) => void
  removeTerminal: (id: string) => void
  clearTerminals: () => void
  setActiveTerminal: (id: string | null) => void
  setSplitTerminalId: (id: string | null) => void
  setFocusedPane: (pane: 'primary' | 'secondary') => void
  setSplitMode: (enabled: boolean) => void
  setIsWideScreen: (wide: boolean) => void
  toggleSplitEnabled: () => void
  toggleSplitActive: () => void
  moveTerminalToPane: (id: string, pane: 'left' | 'right') => void

  setSettingsInitialTab: (tab: SettingsTab | null) => void
  setSettingsOrgId: (orgId: string | null) => void
  openModal: (modal: ModalId) => void
  closeModal: () => void
  openSettingsModal: (tab?: SettingsTab) => void
  setRightSidebar: (sidebar: 'info' | null) => void
  toggleRightSidebar: (sidebar: 'info') => void
  toggleLeftSidebar: () => void
  setSkillsContextWindow: (contextWindow: SkillsContextWindowSetting) => void

  // Close agent modal actions
  openCloseAgentModal: (data: CloseAgentModalData) => void
  closeCloseAgentModal: () => void

  // Script terminal actions
  addScriptTerminal: (script: ScriptTerminalInfo) => void
  removeScriptTerminal: (id: string) => void
  updateScriptTerminalState: (id: string, state: 'running' | 'error') => void
  /** Record one more address a running script announced it serves on. */
  addScriptServerUrl: (id: string, url: string) => void
  openScriptTerminalModal: (script: ScriptTerminalInfo) => void
  closeScriptTerminalModal: () => void

  // Launch repository-setup modal actions
  setRepoSetupDismissed: (dismissed: boolean) => void

  setSelectedFile: (file: SelectedFile | null) => void
  /**
   * Open the review of a repository, scrolled to `anchorPath`.
   *
   * `files` is copied here rather than referenced — see `RepoReview` above for why the
   * list has to stop moving the moment the drawer opens.
   */
  openRepoReview: (repo: { repoPath: string; repoName: string; files: ChangedFile[] }, anchorPath: string) => void
  /**
   * Open a pull request's conversation, scrolled to `anchorThreadId`.
   *
   * `threads` is copied here rather than referenced — see `PRCommentsView` for why the
   * list has to stop moving the moment the panel opens.
   */
  openPRComments: (view: { prUrl: string; threads: PRReviewThread[] }, anchorThreadId: string | null) => void
  /** Fold a card shut, or open it again. */
  toggleReviewFileCollapsed: (repoPath: string, path: string) => void
  /**
   * Leave a comment on a file. The id and the timestamp are minted HERE rather than by
   * the caller: they are the two fields no view has an opinion about, and every further
   * call site — the list view, a paste, an import — would otherwise have to remember to
   * mint both, the same way, from a counter living in a component file.
   */
  /**
   * File a new comment, and answer the id it was filed under.
   *
   * The id is RETURNED rather than left for the caller to find again, because the card that
   * wrote the comment stays open on it: it has to switch from "a new comment" to "this stored
   * comment" in the same handler, and the alternative — reading the array back and taking the
   * last entry — is a guess that happens to be right while nothing else writes.
   */
  addFileComment: (target: CommentTarget, comment: NewFileComment) => string
  /** Rewrite a comment's body. The anchor and the quote are what the reader picked and never move. */
  updateFileComment: (target: CommentTarget, id: string, body: string) => void
  removeFileComment: (target: CommentTarget, id: string) => void
  /**
   * Drop every comment of the files named, in one write.
   *
   * What "send to the agent" leaves behind. Sending is a HANDOVER: the review has left
   * the app and the agent is acting on it, so the same notes sitting in the margins
   * afterwards are not a record of that — they are an unsent review, indistinguishable
   * from one still being written, and the next send would repeat every one of them.
   *
   * Takes the targets rather than a repository, so it clears exactly what was handed
   * over: a target names one version of one file, and comments left on another review
   * are none of its business.
   */
  clearFileComments: (targets: readonly CommentTarget[]) => void
  /**
   * Take the reader to a comment: open its card, and light up the lines it is on.
   *
   * No `unfocusComment` beside it. The focus is not a mode the reader is in — it is a
   * request that was made, and the card it opens is dismissed the way every other card is
   * (Escape, a click elsewhere). Leaving it set costs nothing: consumers act on the `seq`
   * changing, so a focus that has already been honoured is inert.
   */
  focusFileComment: (target: CommentTarget, id: string) => void
  closeFilePreview: () => void
  /**
   * Dismiss the comments panel, and only it.
   *
   * The narrow twin of `closeFilePreview`, which clears all three shapes of the drawer.
   * Since they are mutually exclusive the two are equivalent whenever this panel is the
   * one open, so this is about NAMING rather than blast radius: a caller that means "shut
   * the conversation" should not have to reach for an action named after the file
   * preview, and the day the drawer stops being one slot the narrow one is still right.
   */
  closePRComments: () => void
}

/**
 * The drawer, shut — every one of its three shapes at once, plus the focus request that
 * only means anything while one of them is open.
 *
 * One constant rather than the same four nulls written out at each of the five sites that
 * open or close the drawer, because they are not four independent fields: they are one
 * slot with three possible occupants, and the invariant is that at most one is ever set.
 * Spelled out per site, that invariant is enforced by nobody — adding `prComments` meant
 * finding and editing every existing site, and missing one would have left two panels
 * stacked on a single backdrop with no error anywhere. Spread instead, a fourth shape
 * costs one line here and the sites keep it for free.
 *
 * `as const satisfies` so the spread stays exactly-typed against `AppState`: a field
 * renamed out from under this object fails to compile rather than quietly clearing
 * nothing.
 */
const DRAWER_CLOSED = {
  selectedFile: null,
  review: null,
  prComments: null,
  focusedComment: null,
} as const satisfies Partial<AppState>

export const useStore = create<AppState>()(
  persist(
    persist(
      (set, get) => ({
        // Initial state
        config: null,
        configLoading: true,
        configError: null,

        activeOrg: null,
        orgs: [],

        terminals: [],
        activeTerminalId: null,

        splitTerminalId: null,
        focusedPane: 'primary',
        isSplitMode: false,
        isWideScreen: false,
        splitEnabled: false,
        splitActive: false,
        rightPaneTerminalIds: [],

        settingsInitialTab: null,
        settingsOrgId: null,
        activeModal: null,
        rightSidebar: null,
        leftSidebarVisible: true,
        skillsContextWindow: 'auto',

        scriptTerminals: [],
        scriptTerminalModal: null,
        scriptTerminalModalOpen: false,

        closeAgentModal: null,
        repoSetupDismissed: false,
        selectedFile: null,
        review: null,
        prComments: null,
        collapsedFiles: {},
        fileComments: {},
        focusedComment: null,

        // Actions
        setConfig: (config) => set({
          config,
          configLoading: false,
          configError: null,
          ...(config?.splitEnabled !== undefined ? { splitEnabled: config.splitEnabled } : {}),
          ...(config?.splitActive !== undefined ? { splitActive: config.splitActive } : {}),
        }),
        setConfigLoading: (configLoading) => set({ configLoading }),
        setConfigError: (configError) => set({ configError, configLoading: false }),

        setActiveOrg: (activeOrg) => set({ activeOrg }),
        setOrgs: (orgs) => set({ orgs }),

        addTerminal: (terminal) =>
          set((state) => {
            // Prevent duplicates - don't add if terminal with same ID exists
            if (state.terminals.some((t) => t.id === terminal.id)) {
              return { activeTerminalId: terminal.id }
            }
            return {
              terminals: [...state.terminals, terminal],
              activeTerminalId: terminal.id,
              rightSidebar: 'info',
            }
          }),

        updateTerminalState: (id, state) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, state } : t
            ),
          })),

        updateTerminalBranch: (id, branchName) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, branchName: branchName || undefined } : t
            ),
          })),

        updateTerminalMetadata: (id, metadata) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, metadata: { ...t.metadata, ...metadata } } : t
            ),
          })),

        updateTerminalRepositories: (id, repositories) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, repositories } : t
            ),
          })),

        removeTerminal: (id) =>
          set((state) => {
            const newTerminals = state.terminals.filter((t) => t.id !== id)
            const newRightIds = state.rightPaneTerminalIds.filter(tid => tid !== id)
            return {
              terminals: newTerminals,
              activeTerminalId:
                state.activeTerminalId === id
                  ? newTerminals.filter(t => !newRightIds.includes(t.id))[0]?.id || null
                  : state.activeTerminalId,
              splitTerminalId:
                state.splitTerminalId === id ? (newRightIds[0] || null) : state.splitTerminalId,
              focusedPane:
                state.splitTerminalId === id ? 'primary' : state.focusedPane,
              rightPaneTerminalIds: newRightIds,
              // The info sidebar describes an agent, so it has nothing to show
              // once the last one is gone: leaving it open would slide an empty
              // panel back in on the next launch's blank slate.
              rightSidebar: newTerminals.length === 0 ? null : state.rightSidebar,
            }
          }),

        // Drop every terminal and the pane layout around them. Used when the app
        // loses its session: the store is a module singleton that outlives the
        // gate, so without this the next account would inherit the previous
        // one's tabs. The PTYs themselves are killed by the main process.
        clearTerminals: () =>
          set({
            terminals: [],
            activeTerminalId: null,
            splitTerminalId: null,
            rightPaneTerminalIds: [],
            focusedPane: 'primary',
            scriptTerminals: [],
            scriptTerminalModal: null,
            scriptTerminalModalOpen: false,
            closeAgentModal: null,
            // The whole drawer, whichever shape it was in. Not merely tidiness on this
            // path: the PR conversation holds whole comment bodies from someone's
            // repository, and this is the logout. Leaving them in a module singleton
            // across an account switch is the next account inheriting the previous
            // one's review.
            ...DRAWER_CLOSED,
            // The collapsed-card map goes too: it is keyed by repository path, and the
            // next account's repositories are not this one's. So do the comments, for
            // the same reason and a stronger one — they are the reader's own words about
            // someone else's diff.
            collapsedFiles: {},
            fileComments: {},
            rightSidebar: null,
          }),

        setActiveTerminal: (activeTerminalId) =>
          set((state) => {
            if (state.isSplitMode && activeTerminalId === state.splitTerminalId) {
              return {
                activeTerminalId,
                splitTerminalId: state.activeTerminalId,
                focusedPane: 'primary',
              }
            }
            return { activeTerminalId }
          }),

        setSplitTerminalId: (splitTerminalId) =>
          set((state) => state.splitTerminalId === splitTerminalId ? {} : { splitTerminalId }),
        setFocusedPane: (focusedPane) =>
          set((state) => state.focusedPane === focusedPane ? {} : { focusedPane }),
        setSplitMode: (isSplitMode) =>
          set((state) => state.isSplitMode === isSplitMode ? {} : { isSplitMode }),
        setIsWideScreen: (isWideScreen) =>
          set((state) => state.isWideScreen === isWideScreen ? {} : { isWideScreen }),
        toggleSplitEnabled: () =>
          set((state) => ({ splitEnabled: !state.splitEnabled })),
        toggleSplitActive: () =>
          set((state) => {
            if (state.splitActive) {
              // Switching to single: move all right-pane agents back to left in config.json
              for (const id of state.rightPaneTerminalIds) {
                window.electronAPI?.terminal.updateSplitPane(id, 'left').catch(() => {})
              }
              window.electronAPI?.config.updateSplitActive(false).catch(() => {})
              return { splitActive: false, rightPaneTerminalIds: [], splitTerminalId: null, focusedPane: 'primary' }
            }
            window.electronAPI?.config.updateSplitActive(true).catch(() => {})
            return { splitActive: true }
          }),
        moveTerminalToPane: (id, pane) => {
          window.electronAPI?.terminal.updateSplitPane(id, pane).catch(() => {})
          return set((state) => {
            if (pane === 'right') {
              if (state.rightPaneTerminalIds.includes(id)) return {}
              const newRightIds = [...state.rightPaneTerminalIds, id]
              const updates: Partial<AppState> = { rightPaneTerminalIds: newRightIds }
              if (id === state.activeTerminalId) {
                const leftTerminals = state.terminals.filter(t => !newRightIds.includes(t.id))
                updates.activeTerminalId = leftTerminals[0]?.id || null
              }
              if (!state.splitTerminalId || !newRightIds.includes(state.splitTerminalId)) {
                updates.splitTerminalId = id
              }
              return updates
            } else {
              if (!state.rightPaneTerminalIds.includes(id)) return {}
              const newRightIds = state.rightPaneTerminalIds.filter(tid => tid !== id)
              const updates: Partial<AppState> = { rightPaneTerminalIds: newRightIds }
              if (id === state.splitTerminalId) {
                updates.splitTerminalId = newRightIds[0] || null
              }
              return updates
            }
          })
        },

        setSettingsInitialTab: (settingsInitialTab) => set({ settingsInitialTab }),
        setSettingsOrgId: (settingsOrgId) => set({ settingsOrgId }),
        // Modals are overlays, never destinations: the agents page stays mounted
        // and visible behind them. Two things are normalised on open — every shape
        // of the sliding drawer is dismissed (they all sit above the overlay in the
        // z-order), and a blank agents page gets its first agent selected so the
        // overlay never floats over an empty app.
        openModal: (modal) => set((state) => {
          const updates: Partial<AppState> = { ...DRAWER_CLOSED, activeModal: modal }
          if (!state.activeTerminalId && state.terminals.length > 0) {
            updates.activeTerminalId = state.terminals[0].id
          }
          return updates
        }),
        closeModal: () => set({ activeModal: null }),
        // Convenience wrapper: opens Settings straight on a given tab.
        openSettingsModal: (tab) => {
          if (tab) set({ settingsInitialTab: tab })
          get().openModal('settings')
        },
        setRightSidebar: (rightSidebar) => set({ rightSidebar }),
        toggleRightSidebar: (sidebar) => set((state) => ({
          rightSidebar: state.rightSidebar === sidebar ? null : sidebar
        })),
        toggleLeftSidebar: () => set((state) => ({ leftSidebarVisible: !state.leftSidebarVisible })),
        setSkillsContextWindow: (skillsContextWindow) => set({ skillsContextWindow }),

        // Close agent modal actions
        openCloseAgentModal: (data) => set({ closeAgentModal: data }),
        closeCloseAgentModal: () => set({ closeAgentModal: null }),

        // Script terminal actions
        addScriptTerminal: (script) =>
          set((state) => ({
            scriptTerminals: [...state.scriptTerminals, script],
          })),

        // `scriptTerminalModal` is deliberately NOT cleared: a script that exits 0 is
        // removed from this list, and its dialog has to keep showing the output that
        // was just produced rather than close under the reader.
        removeScriptTerminal: (id) =>
          set((state) => ({
            scriptTerminals: state.scriptTerminals.filter((s) => s.id !== id),
            activeTerminalId: state.activeTerminalId === id
              ? state.terminals[0]?.id || null
              : state.activeTerminalId,
          })),

        updateScriptTerminalState: (id, newState) =>
          set((state) => ({
            scriptTerminals: state.scriptTerminals.map((s) =>
              s.id === id ? { ...s, state: newState } : s
            ),
          })),

        // A script that has already exited keeps no card, so a URL arriving after that
        // has nowhere to land — `map` over the current list is what makes that a no-op
        // rather than a resurrected entry. Main already reports each origin once; the
        // `includes` guard is what survives a duplicate anyway (a replayed event, a
        // second listener) without doubling a row.
        addScriptServerUrl: (id, url) =>
          set((state) => ({
            scriptTerminals: state.scriptTerminals.map((s) =>
              s.id === id && !(s.serverUrls ?? []).includes(url)
                ? { ...s, serverUrls: [...(s.serverUrls ?? []), url] }
                : s
            ),
          })),

        openScriptTerminalModal: (script) =>
          set({ scriptTerminalModal: script, scriptTerminalModalOpen: true }),
        closeScriptTerminalModal: () => set({ scriptTerminalModalOpen: false }),

        // Launch repository-setup modal actions
        setRepoSetupDismissed: (repoSetupDismissed) => set({ repoSetupDismissed }),

        // The three previews share one drawer, so opening any of them closes the other
        // two. The reader can only be looking at one thing, and leaving the review
        // mounted behind a spec preview would keep forty cards — and forty reads —
        // alive underneath it.
        setSelectedFile: (selectedFile) => set({ ...DRAWER_CLOSED, selectedFile }),

        // `DRAWER_CLOSED` first, then the occupant: it also drops `focusedComment`, which
        // named a file of the review being replaced and cannot survive the switch.
        openRepoReview: (repo, anchorPath) => set((state) => ({
          ...DRAWER_CLOSED,
          review: {
            repoPath: repo.repoPath,
            repoName: repo.repoName,
            // Copied, not referenced: the array this came from is replaced wholesale by
            // the sidebar's five-second poll, and the review must not follow it.
            files: [...repo.files],
            anchorPath,
            // Read off the review being replaced rather than kept as a counter of its
            // own, so it never restarts and the panel can compare two renders of it.
            anchorSeq: (state.review?.anchorSeq ?? 0) + 1,
          },
        })),

        openPRComments: (view, anchorThreadId) => set((state) => ({
          ...DRAWER_CLOSED,
          prComments: {
            prUrl: view.prUrl,
            // Copied, not referenced: the array this came from is replaced wholesale
            // whenever the card refetches, and the panel must not follow it.
            threads: [...view.threads],
            anchorThreadId,
            // Read off the view being replaced, exactly as `openRepoReview` does it.
            // It RESTARTS at 1 whenever the panel has been closed in between, which is
            // harmless and is why a module-level counter like `focusSeq` would be
            // overkill: all the panel asks of it is that it differ from the value the
            // previous render saw, and after a close there was no previous render.
            anchorSeq: (state.prComments?.anchorSeq ?? 0) + 1,
          },
        })),

        toggleReviewFileCollapsed: (repoPath, path) => set((state) => {
          const key = reviewFileKey(repoPath, path)
          return { collapsedFiles: { ...state.collapsedFiles, [key]: !state.collapsedFiles[key] } }
        }),

        addFileComment: (target, comment) => {
          // Minted OUTSIDE the updater so it can be returned: a value read from inside a
          // `set` callback has nowhere to go. Nothing is lost by taking it early — this
          // action always writes, so the id is always the one that lands.
          const id = newCommentId()
          set((state) => {
            const key = commentFileKey(target)
            const stored: FileComment = { ...comment, id, createdAt: Date.now() }
            // Every OTHER version of this file goes in the same write. Those entries are
            // already unreachable — nothing left in the app can compute their key — so this
            // is the moment to drop them: the file's map is being rewritten anyway, and the
            // alternative is one entry per save of every file anyone commented on, for as
            // long as the session lives.
            //
            // INERT for a live document, which is the whole reason the spec panel is safe
            // sharing this map: a spec carries one key for all of its versions, so the entry
            // this write is about is the only one under the prefix — and `existing === key` is
            // tested FIRST, so that entry is kept rather than swept. A second comment on the
            // same spec appends beside the first instead of replacing it.
            //
            // Only THIS file is swept, not the whole map: a review holds forty of them, and
            // a comment written on one says nothing about whether the other thirty-nine have
            // moved. The arrays are carried over by reference, so the other files' selectors
            // still see the identity they saw before — which is what `NO_COMMENTS` exists to
            // protect.
            const prefix = commentFileKeyPrefix(target.repoPath, target.path)
            const fileComments: Record<string, FileComment[]> = {}
            for (const [existing, comments] of Object.entries(state.fileComments)) {
              if (existing === key || !existing.startsWith(prefix)) fileComments[existing] = comments
            }
            fileComments[key] = [...(state.fileComments[key] ?? []), stored]
            return { fileComments }
          })
          return id
        },

        updateFileComment: (target, id, body) => set((state) => {
          const key = commentFileKey(target)
          const comments = state.fileComments[key]
          // Nothing to do rather than an empty entry: writing one would hand every
          // selector reading this key a NEW array, which is exactly what NO_COMMENTS
          // exists to avoid.
          if (!comments) return {}
          return {
            fileComments: {
              ...state.fileComments,
              [key]: comments.map(c => (c.id === id ? { ...c, body } : c)),
            },
          }
        }),

        removeFileComment: (target, id) => set((state) => {
          const key = commentFileKey(target)
          const comments = state.fileComments[key]
          if (!comments) return {}
          const left = comments.filter(c => c.id !== id)
          // The key is dropped once its last comment goes, rather than left holding an
          // empty array: the map is keyed by path and lives as long as the app does, so
          // an entry per file anyone ever commented and then un-commented would only
          // ever grow.
          const next = { ...state.fileComments }
          if (left.length === 0) delete next[key]
          else next[key] = left
          return { fileComments: next }
        }),

        clearFileComments: (targets) => set((state) => {
          const keys = new Set(targets.map(commentFileKey))
          const fileComments: Record<string, FileComment[]> = {}
          for (const [key, comments] of Object.entries(state.fileComments)) {
            if (!keys.has(key)) fileComments[key] = comments
          }
          // A focus pointing into what was just cleared would send the next reader to a
          // comment that no longer exists. `removeFileComment` can leave one dangling
          // and it stays inert — one id among many — but here nothing survives to land on.
          const focused = state.focusedComment
          const dropFocus = focused !== null && keys.has(commentFileKey(focused.target))
          return dropFocus ? { fileComments, focusedComment: null } : { fileComments }
        }),

        focusFileComment: (target, id) => set({
          focusedComment: { target, id, seq: ++focusSeq },
        }),

        closeFilePreview: () => set(DRAWER_CLOSED),

        closePRComments: () => set({ prComments: null }),
      }),
      // Session storage persist for activeTerminalId (cleared on app close)
      {
        name: 'magic-slash-session',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          activeTerminalId: state.activeTerminalId,
          splitTerminalId: state.splitTerminalId,
          rightPaneTerminalIds: state.rightPaneTerminalIds,
          repoSetupDismissed: state.repoSetupDismissed,
        }),
      }
    ),
    // Local storage persist for UI preferences (permanent)
    {
      name: 'magic-slash-storage',
      // v1 — skillsContextWindow gained an 'auto' state and made it the default.
      // Without a migration, every user carries a stored `200_000` written by the
      // old default and keeps overriding the window their agents report; the
      // point of the feature is precisely that the stored value stops winning
      // over reality.
      version: 1,
      // Annotated: zustand infers the persisted shape from what `migrate` returns,
      // and an inferred `'auto' | 1_000_000` would then reject the 200K preset in
      // `partialize` below.
      migrate: (persistedState): Partial<AppState> => {
        const state = (persistedState ?? {}) as Partial<AppState>
        return {
          ...state,
          skillsContextWindow: migrateSkillsContextWindow(state.skillsContextWindow),
        }
      },
      partialize: (state) => ({
        leftSidebarVisible: state.leftSidebarVisible,
        skillsContextWindow: state.skillsContextWindow,
      }),
    }
  )
)
