'use client'

import {
  ArrowRight,
  ChevronDown,
  CircleStop,
  Copy,
  Edit2,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Globe,
  Play,
  X,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { ContextAgentCard } from '@ds/desktop'
import { useT } from '@/lib/i18n/useLanguage'
import { AppGround } from '../AppGround'
import { PullRequestCard, type PullRequestPart, type PullRequestReview } from './PullRequestCardMockup'
import { WaveLoader } from './RepoCardMockup'
import { GithubMark } from './TasksModalMockup'
import { JiraMark } from './TicketCardMockup'

/**
 * THE AGENT INFO SIDEBAR, redrawn at the app's own pixel values — `AgentInfoSidebar.tsx`
 * and the `agent-info-sidebar/` folder of `desktop/src/renderer/components/`, card by
 * card: the usage card, the ticket header with its status pill, the repository card
 * with the branch row, the uncommitted diff, the commits and, nested where the app nests
 * it (RepositoryCard.tsx:290), the pull request watch card; then the dashed
 * add-a-repository box.
 *
 * IT WAS THE RIGHT PANEL OF `home/AppWindowMockup.tsx`, section 4 of that drawing, and
 * that file's long note on where each value was read from still applies to every line
 * here. It moved into a file of its own the day `/desktop` needed the panel ALONE, at
 * full size, with the reader's scroll deciding what it shows: the window keeps
 * rendering it (`<InfoSidebarPanel />` with no props), so there is one drawing of the
 * panel on the site and two places it stands.
 *
 * THREE THINGS CHANGE, AND THEY ARE THE PROPS:
 *
 *   • `status` — the ticket's status pill, one of the app's own `STATUS_OPTIONS`
 *     (StatusPill.tsx), tint and ink included. The window shows `inProgress`; the
 *     `/desktop` tour walks it from there to merged.
 *   • `pr` — whether the pull request card is drawn under the commits, and what it says.
 *     The app draws it when the agent has a PR URL and not before, so a status before
 *     "PR created" shows no card.
 *   • `focus` — which card the reader is being shown. The others dim; the one named keeps
 *     its ink and takes a ring. `null` (the default) is the panel as the app shows it.
 *   • `scripts` — the scripts dropdown and the server it starts, played through its
 *     phases by the tour's "local test server" step. See `ScriptsPhase`.
 *
 * `data-part` ON EVERY CARD AND ON THE PARTS INSIDE THEM, and it is the tour's handle
 * rather than decoration: the tour reads each part's box out of the DOM to know where to
 * pan and how far to zoom, and the attribute is what it looks for. Rename one and the tour
 * pans to nothing. `SidebarPart` below is the list.
 */

export const PANEL_WIDTH = 500

/**
 * What a caller can point at: the five cards, and the parts inside them the `/desktop`
 * tour stops on — the ticket id, the scripts dropdown, the uncommitted files, the commits,
 * and the three rows of the pull request card. `PART_PARENT` says what is inside what: a
 * card whose descendant is in focus keeps its ink, because the reader is looking INTO it.
 */
export type SidebarPart =
  | 'session'
  | 'ticket'
  | 'ticketId'
  | 'status'
  | 'repository'
  | 'scripts'
  | 'branches'
  | 'files'
  | 'commits'
  | 'pr'
  | PullRequestPart

const PART_PARENT: Record<SidebarPart, SidebarPart | null> = {
  session: null,
  ticket: null,
  ticketId: 'ticket',
  status: 'ticket',
  repository: null,
  scripts: 'repository',
  branches: 'repository',
  files: 'repository',
  commits: 'repository',
  pr: 'repository',
  prHeader: 'pr',
  prComments: 'pr',
  prChecks: 'pr',
}

/** Whether `part` is `focus` itself or one of its ancestors. */
function holds(part: SidebarPart, focus: SidebarPart): boolean {
  let node: SidebarPart | null = focus
  while (node) {
    if (node === part) return true
    node = PART_PARENT[node]
  }
  return false
}

/**
 * The statuses the pill can show, with the app's own tint and ink for each
 * (StatusPill.tsx `STATUS_OPTIONS`, value for value) and the site's own label key.
 */
export const SIDEBAR_STATUSES = {
  inProgress: { tone: 'bg-yellow/20 text-yellow', label: 'site.status.inProgress' },
  committed: { tone: 'bg-cyan/20 text-cyan', label: 'site.status.committed' },
  readyForPR: { tone: 'bg-orange/20 text-orange', label: 'site.status.readyForPR' },
  prCreated: { tone: 'bg-green/20 text-green', label: 'site.status.prCreated' },
  ciGreen: { tone: 'bg-accent/20 text-accent', label: 'site.status.ciGreen' },
  inReview: { tone: 'bg-blue/20 text-blue', label: 'site.status.inReview' },
  changesRequested: { tone: 'bg-red/20 text-red', label: 'site.status.changesRequested' },
  prMerged: { tone: 'bg-purple/20 text-purple', label: 'site.status.prMerged' },
} as const satisfies Record<string, { tone: string; label: MessageKey }>

export type SidebarStatus = keyof typeof SIDEBAR_STATUSES

export type SidebarPR = { passed: number; review: PullRequestReview; comments: number }

/**
 * The scripts dropdown and what it started, as the `/desktop` tour plays it: closed (the
 * app's resting state, and the window's), open under its trigger, the `dev` row hovered,
 * then `dev` running — the purple bar `RunningScripts.tsx` draws under the card's header
 * — and finally serving, with the address row the app hangs under a script that opened a
 * port. The markup is `RepoCardMockup.tsx`'s, which drew these states first for `/features`.
 */
export type ScriptsPhase = 'closed' | 'open' | 'hover' | 'running' | 'serving'

/** The repository colour the app assigned this repository — one of its palette. */
const REPO_COLOR = '#3B82F6'

/** The account's two rate limits and the agent's own context, as the cards show them. */
export const CONTEXT_PCT = 54

/** The files the agent has touched since its last commit, as `git diff --numstat` has them. */
const FILES: readonly { file: string; added: number; removed: number }[] = [
  { file: 'vat.ts', added: 4, removed: 1 },
  { file: 'vat.test.ts', added: 14, removed: 0 },
]

/** The commits already on the branch, newest first, as `git log` hands them over. */
const COMMITS: readonly { subject: string; age: string; hash: string }[] = [
  { subject: 'fix(billing): round the VAT once, on the total', age: '2m', hash: 'a3f1c92' },
  { subject: 'test(billing): cover the two-line invoice', age: '9m', hash: '7b40e18' },
  { subject: 'refactor(billing): lift applyVat out of the PDF', age: '14m', hash: 'c1d8a05' },
]

const BASE_BRANCH = 'main'
const BRANCH = 'feature/PAY-318-invoice-vat'

/** `LimitGauge.tsx`'s thresholds for the account limits: green, then yellow at 65, red at 85. */
export function gaugeColors(pct: number) {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

/**
 * The three dashed controls of the repository card (RepositoryCard.tsx:82 and :91,
 * ScriptsDropdown.tsx:161), character for character.
 */
const DASHED_BUTTON =
  'flex items-center gap-1 rounded border border-dashed border-appline/40 px-1.5 py-0.5 text-[10px] font-semibold text-appink-icon'

/** A branch pill of the branch row: `px-2 py-1.5` on the raised surface, inside a subtle filet. */
function BranchPill({ name, tone }: { name: string; tone: 'base' | 'current' }) {
  const ink = tone === 'current' ? 'text-green' : 'text-appink'
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.06] px-2 py-1.5 ${
        tone === 'current' ? 'flex-1' : 'self-stretch'
      }`}
    >
      <GitBranch className={`h-3.5 w-3.5 shrink-0 ${ink}`} />
      <span className={`truncate text-xs font-medium ${ink}`}>{name}</span>
      {tone === 'current' ? (
        <span className="ml-auto shrink-0 rounded p-1">
          <Copy className="h-3 w-3 text-appink-icon" />
        </span>
      ) : null}
    </div>
  )
}

/**
 * The dim-or-ring treatment a `focus` puts on a card. `transition-opacity` rather than
 * `transition-all`: the ring is a box-shadow and snaps, the fade is what reads as the
 * eye moving. Nothing here when no card is in focus, so the window's copy of the panel
 * is exactly the app's.
 */
const RING = 'ring-2 ring-accent ring-offset-2 ring-offset-appbg'

function focusClass(focus: SidebarPart | null | undefined, part: SidebarPart): string {
  if (!focus) return ''
  if (focus === part) return RING
  // A card with the focus somewhere inside it keeps its ink; the ring is on the part.
  if (holds(part, focus)) return ''
  return 'opacity-30'
}

export function InfoSidebarPanel({
  status = 'inProgress',
  pr = null,
  focus = null,
  scripts = 'closed',
  className,
}: {
  status?: SidebarStatus
  pr?: SidebarPR | null
  focus?: SidebarPart | null
  scripts?: ScriptsPhase
  /** Additive only — the window passes nothing, the tour passes nothing either. */
  className?: string
} = {}) {
  const { t } = useT()

  const added = FILES.reduce((n, f) => n + f.added, 0)
  const removed = FILES.reduce((n, f) => n + f.removed, 0)
  const ratio = added / (added + removed || 1)
  const pill = SIDEBAR_STATUSES[status]

  // The pull request card draws its own rings, so it is told which of ITS parts is in
  // focus and nothing else.
  const prFocus: PullRequestPart | null =
    focus === 'prHeader' || focus === 'prComments' || focus === 'prChecks' ? focus : null

  return (
    // NO HEADER. No title, no agent name, no close X — the close action is the Archive
    // pill in the titlebar, because it belongs to the agent and not to a panel that may
    // be collapsed. `font-display`: the one region whose family the app sets EXPLICITLY,
    // as an inline `fontFamily` on the scrolling container (AgentInfoSidebar.tsx:445).
    <div
      aria-hidden
      className={['shrink-0 space-y-4 bg-black/30 p-4 font-display', className].filter(Boolean).join(' ')}
      style={{ width: PANEL_WIDTH }}
    >
      {/* ── 1. THE SESSION CARD (`UsageCard.tsx`) ──────────────────────────────── */}
      {/* THE REAL CARD, not a reproduction of it. `ContextAgentCard` comes from
          `design-system/desktop/` — the file the Electron renderer compiles — on a patch
          of the app's theme variables. What stood here was forty lines of copied classes
          that the app had already left behind: a SESSION header it no longer has, a
          purple model pill that is now a `Label`.

          `paint={false}`: this panel IS the app's column and already carries its ground.
          A second window colour inside it would be a panel drawn on a panel.

          The wrapper keeps `data-part` and the focus class, because the scroll band
          measures that element to zoom on it — and a wrapper with no padding of its own
          has exactly the card's rect. */}
      <div
        data-part="session"
        // `rounded-xl`, the radius `Card` draws — and the wrapper needs it even though it
        // paints nothing: a Tailwind `ring` follows the radius of the element CARRYING it,
        // and every other part here wears the ring on the card itself. Without it the tour
        // drew a square outline around a rounded card.
        className={`rounded-xl transition-opacity duration-500 ${focusClass(focus, 'session')}`}
      >
        <AppGround paint={false}>
          <ContextAgentCard
            contextPercent={CONTEXT_PCT}
            contextDetail="540.0k / 1.00M tokens"
            model="Fable 5.1"
            cost="$3.13"
            duration="24m 18s"
            onMinimizedChange={() => undefined}
            labels={{
              context: t('site.infoSidebar.context'),
              minimize: t('site.infoSidebar.fold'),
              expand: t('site.infoSidebar.unfold'),
            }}
          />
        </AppGround>
      </div>

      {/* ── 2. THE TICKET CARD (`TicketHeader.tsx`) ────────────────────────────── */}
      <div
        data-part="ticket"
        className={`rounded-xl bg-white/[0.06] p-4 transition-opacity duration-500 ${focusClass(focus, 'ticket')}`}
      >
        <div className="mb-3 flex items-center justify-between">
          {/* The mark hangs off the ticket ID rather than off the link: it says which
              tracker the ID belongs to, which is worth showing whether or not a URL
              could be built for it. */}
          <span
            data-part="ticketId"
            className={`flex items-center gap-1.5 rounded text-xs font-semibold text-white ${focus === 'ticketId' ? RING : ''}`}
          >
            <JiraMark className="h-3.5 w-3.5 shrink-0" />
            PAY-318
          </span>
          {/* `StatusPill`: `px-2.5 py-1 rounded-full text-xs font-medium`, tint and ink
              from `STATUS_OPTIONS`, the chevron that opens the list. The colours change
              with the status; the shape never does. */}
          <span
            data-part="status"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-500 ${pill.tone} ${focusClass(focus, 'status')}`}
          >
            {t(pill.label)}
            <ChevronDown className="h-3 w-3" />
          </span>
        </div>

        <div className="flex items-start gap-2">
          <h2 className="flex-1 break-words text-sm font-semibold leading-tight text-white">
            {t('site.infoSidebar.ticketTitle')}
          </h2>
          <Edit2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-appink-muted" />
        </div>
        <div className="mt-3 flex items-start gap-2">
          <div className="flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/60">
            {t('site.infoSidebar.ticketDescription')}
          </div>
          <Edit2 className="mt-0.5 h-3 w-3 shrink-0 text-appink-muted" />
        </div>
      </div>

      {/* ── 3. THE REPOSITORY CARD (`RepositoryCard.tsx`) ──────────────────────── */}
      {/* A `space-y-3` LIST, because an agent can carry several repositories — this one
          carries one, and the list is what makes the second one cost no layout. */}
      <div className="space-y-3">
        <div
          data-part="repository"
          className={`relative rounded-xl bg-white/[0.06] p-3 transition-opacity duration-500 ${focusClass(focus, 'repository')}`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${REPO_COLOR}1f`, color: REPO_COLOR }}
            >
              <FolderGit2 className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-sm font-medium text-white/90">magic-pay</span>
            <div className="ml-auto flex items-center gap-1.5">
              {/* SCRIPTS reads first — `ScriptsDropdown` is the first child of this row
                  in the app (RepositoryCard.tsx:78) — drawn CLOSED, its resting state. */}
              <span
                data-part="scripts"
                className={`${DASHED_BUTTON} ${focus === 'scripts' ? RING : ''} ${
                  scripts === 'open' || scripts === 'hover' ? 'border-accent/50 bg-accent/5 text-accent' : ''
                }`}
              >
                <Play className="h-3 w-3" />
                {t('site.infoSidebar.scripts')}
                <ChevronDown className="h-2.5 w-2.5" />
              </span>
              <span className={DASHED_BUTTON}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/vscode-logo.png" alt="" className="h-3 w-3 object-contain" />
                {t('site.infoSidebar.open')}
              </span>
              <span className={DASHED_BUTTON}>
                <GithubMark className="h-3 w-3" />
                {t('site.infoSidebar.open')}
              </span>
              <span className="flex items-center justify-center rounded p-1 text-appink-icon">
                <X className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* ── THE SCRIPTS MENU, hung under its trigger (`ScriptsDropdown.tsx`) ─────
              Portalled and `fixed` in the app; absolute here, at the offset that puts it
              under the trigger in this card, the same numbers `RepoCardMockup.tsx` uses. */}
          {scripts === 'open' || scripts === 'hover' ? (
            <div className="absolute right-[calc(0.75rem+7.75rem)] top-[calc(0.75rem+1.5rem+4px)] z-20 w-[280px] overflow-hidden rounded-lg border border-appline/50 bg-appbg-secondary shadow-lift">
              <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
                {t('site.infoSidebar.scriptsDev')}
              </div>
              <div className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${scripts === 'hover' ? 'bg-white/[0.06]' : ''}`}>
                <Play className="h-3 w-3 shrink-0 text-accent" />
                <span className="truncate text-xs font-medium text-white/90">dev</span>
                <span className="ml-auto truncate text-[10px] text-appink/40">pnpm dev</span>
              </div>
              <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
                {t('site.infoSidebar.scriptsBuild')}
              </div>
              <div className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
                <Play className="h-3 w-3 shrink-0 text-accent" />
                <span className="truncate text-xs font-medium text-white/90">build</span>
                <span className="ml-auto truncate text-[10px] text-appink/40">pnpm build</span>
              </div>
              <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
                {t('site.infoSidebar.scriptsTest')}
              </div>
              <div className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
                <Play className="h-3 w-3 shrink-0 text-accent" />
                <span className="truncate text-xs font-medium text-white/90">test</span>
                <span className="ml-auto truncate text-[10px] text-appink/40">pnpm test</span>
              </div>
            </div>
          ) : null}

          {/* ── A SCRIPT RUNNING (`RunningScripts.tsx`), between the header and the branch
              row where RepositoryCard.tsx:111 puts it: the purple bar with the app's
              WaveLoader, the script's name, the Stop button; then, once the server has
              opened a port, the address row hung under it. */}
          {scripts === 'running' || scripts === 'serving' ? (
            <div data-part="server" className="mb-2 flex flex-col">
              <div
                className={`flex w-full items-center gap-2 bg-purple px-2 py-1.5 text-xs text-white ${
                  scripts === 'serving' ? 'rounded-t-lg' : 'rounded-lg'
                }`}
              >
                <span className="shrink-0 text-white">
                  <WaveLoader />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-medium">dev</div>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/15 py-1 pl-1.5 pr-2">
                  <CircleStop className="h-3.5 w-3.5 text-white" />
                  <span className="text-[11px] font-semibold text-white">{t('site.infoSidebar.stop')}</span>
                </span>
              </div>
              {scripts === 'serving' ? (
                <div className="flex w-full items-center gap-2.5 rounded-b-lg border border-t-0 border-white/5 bg-white/[0.06] px-3 py-2.5 text-sm text-appink">
                  <Globe className="h-4 w-4 shrink-0 text-purple" />
                  <span className="flex-1 truncate text-left font-medium">localhost:3000</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* The branch row: where the work came from, an arrow, where it is now. */}
          <div
            data-part="branches"
            className={`mb-2 flex items-center gap-1.5 rounded-md ${focus === 'branches' ? RING : ''}`}
          >
            <BranchPill name={BASE_BRANCH} tone="base" />
            <ArrowRight className="h-3 w-3 shrink-0 text-appink-muted" />
            <BranchPill name={BRANCH} tone="current" />
          </div>

          {/* Uncommitted changes, with the six-square gauge: each square is green when
              the additions' share of the diff clears `(i + 1) / 6`. */}
          <div
            data-part="files"
            className={`mb-2 rounded-md border border-white/5 bg-white/[0.06] p-2 ${focus === 'files' ? RING : ''}`}
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-medium text-appink/70">{t('site.infoSidebar.uncommitted')}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-appink/50">{t('site.infoSidebar.files', { count: FILES.length })}</span>
                <span className="flex items-center gap-1">
                  <span className="text-green">+{added}</span>
                  <span className="text-red">-{removed}</span>
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-sm ${ratio >= (i + 1) / 6 ? 'bg-green' : 'bg-red'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-0.5">
              {FILES.map((file) => (
                <div key={file.file} className="flex items-center gap-1.5 py-0.5 text-xs">
                  <span className="flex-1 truncate font-mono text-appink/60">{file.file}</span>
                  <span className="shrink-0 text-[10px] text-appink/40">
                    <span className="text-green">+{file.added}</span>
                    {file.removed > 0 ? <span className="text-red"> -{file.removed}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The commits already on the branch. "N ahead of main" is the app's own
              literal (RepositoryCard.tsx:227) — git's phrasing, in every language. */}
          <div
            data-part="commits"
            className={`rounded-md border border-white/5 bg-white/[0.06] p-2 ${focus === 'commits' ? RING : ''}`}
          >
            <div className="mb-1.5 flex items-center text-xs">
              <span className="font-medium text-appink/70">{t('site.infoSidebar.commits')}</span>
              <span className="ml-auto text-appink/50">
                {COMMITS.length} ahead of {BASE_BRANCH}
              </span>
            </div>
            <div className="space-y-1">
              {COMMITS.map((commit) => (
                <div key={commit.hash} className="flex items-center gap-2 py-0.5 text-xs">
                  <span className="flex-1 truncate text-appink/60">{commit.subject}</span>
                  <span className="shrink-0 text-xs text-appink/40">{commit.age}</span>
                  <span className="flex shrink-0 items-center gap-1 rounded border border-appline/30 bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-appink-icon">
                    {commit.hash}
                    <Copy className="h-3 w-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3b. THE PULL REQUEST (`PRWatchCard.tsx`), when there is one ────────
              Under the commits, inside the repository card, `mt-2` — where
              RepositoryCard.tsx:290 puts it. Absent until the agent has opened one. */}
          {pr ? (
            <div
              data-part="pr"
              className={`mt-2 rounded-lg transition-opacity duration-500 ${focusClass(focus, 'pr')}`}
            >
              <PullRequestCard passed={pr.passed} review={pr.review} comments={pr.comments} focus={prFocus} />
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 4. THE ADD-REPOSITORY BOX ──────────────────────────────────────────── */}
      <div
        className={`w-full rounded-lg border border-dashed border-appline/50 py-4 text-center transition-opacity duration-500 ${
          focus ? 'opacity-30' : ''
        }`}
      >
        <div className="text-xs text-appink/50">Add a repository</div>
      </div>
    </div>
  )
}
