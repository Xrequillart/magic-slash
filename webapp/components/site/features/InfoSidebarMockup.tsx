'use client'

import {
  ArrowRight,
  ChevronDown,
  CircleStop,
  PenLine,
  ExternalLink,
  FolderGit2,
  Globe,
  X,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import {
  BranchCard,
  CommitCard,
  ContextAgentCard,
  HeaderRepoCard,
  RepositoryCard,
  ScriptCard,
  SidebarAgentCoderInfo,
  TitleAgentCard,
  UnCommittedChangesCard,
  type StatusTone,
} from '@ds/desktop'
import { Github, Play, VSCode } from '@ds/desktop/icons'
import { useT } from '@/lib/i18n/useLanguage'
import { AppGround } from '../AppGround'
import { PullRequestCard, type PullRequestPart, type PullRequestReview } from './PullRequestCardMockup'
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
  inProgress: { tone: 'yellow', label: 'site.status.inProgress' },
  committed: { tone: 'cyan', label: 'site.status.committed' },
  readyForPR: { tone: 'orange', label: 'site.status.readyForPR' },
  prCreated: { tone: 'green', label: 'site.status.prCreated' },
  ciGreen: { tone: 'accent', label: 'site.status.ciGreen' },
  inReview: { tone: 'blue', label: 'site.status.inReview' },
  changesRequested: { tone: 'red', label: 'site.status.changesRequested' },
  prMerged: { tone: 'purple', label: 'site.status.prMerged' },
} as const satisfies Record<string, { tone: StatusTone; label: MessageKey }>

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

/** Nothing is listening: these are drawings, and a hash nobody can copy is still a hash. */
const noop = () => undefined

/**
 * The scripts menu's own contents, in `SelectIcon`'s shape — a group per package.json
 * section, an item per script, the command as the quiet trailing hint.
 *
 * A FUNCTION AND NOT A CONSTANT because the group headings are translated and the
 * script NAMES are not: `dev`, `build` and `test` are keys in a package.json, which no
 * catalogue should touch.
 */
export const SCRIPT_GROUPS = (t: (key: MessageKey) => string) => [
  { label: t('site.infoSidebar.scriptsDev'), items: [{ id: 'dev', label: 'dev', hint: 'pnpm dev' }] },
  { label: t('site.infoSidebar.scriptsBuild'), items: [{ id: 'build', label: 'build', hint: 'pnpm build' }] },
  { label: t('site.infoSidebar.scriptsTest'), items: [{ id: 'test', label: 'test', hint: 'pnpm test' }] },
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

/**
 * The dim-or-ring treatment a `focus` puts on a card. `transition-opacity` rather than
 * `transition-all`: the ring is a box-shadow and snaps, the fade is what reads as the
 * eye moving. Nothing here when no card is in focus, so the window's copy of the panel
 * is exactly the app's.
 */
const RING = 'ring-2 ring-accent ring-offset-2 ring-offset-appbg'

/**
 * A field at rest and going nowhere. `EditableText` is controlled, so a drawing hands it
 * the closed state and handlers that do nothing — the price of using the real component,
 * and a fair one: the pencil and the column it reserves are the app's.
 */
const FIELD = (value: string) => ({
  value,
  placeholder: value,
  editing: false,
  draft: value,
  onDraftChange: () => undefined,
  onStartEditing: () => undefined,
  onSave: () => undefined,
  onCancel: () => undefined,
})

/**
 * WHERE THE TOUR GRABS A PART THAT LIVES INSIDE A COMPONENT.
 *
 * `SidebarScrollBand` finds what it zooms to with a query, and a `data-part` attribute
 * is what the hand-drawn parts carry. A design-system component draws its own markup
 * and takes no arbitrary attributes — deliberately — so the two parts inside the ticket
 * card are marked with a CLASS instead, through the `className` every one of them
 * already accepts. The band's selector takes either form.
 *
 * A class as a selector hook rather than an escape hatch in the design system: a
 * marketing page's scroll animation has no business widening a component's API.
 */
const part = (name: SidebarPart) => `part-${name}`

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
  const pill = SIDEBAR_STATUSES[status]

  // The pull request card draws its own rings, so it is told which of ITS parts is in
  // focus and nothing else.
  const prFocus: PullRequestPart | null =
    focus === 'prHeader' || focus === 'prComments' || focus === 'prChecks' ? focus : null

  return (
    // NO HEADER. No title, no agent name, no close X — the close action is the Archive
    // pill in the titlebar, because it belongs to the agent and not to a panel that may
    // be collapsed.
    //
    // `SidebarInfo` from `design-system/desktop/` is the column itself now: its ground,
    // its width, its gutter, the face it sets for everything inside, and the order the
    // regions are read in. What was here was a copy of all five — down to a comment
    // pointing at the line of `AgentInfoSidebar.tsx` it had copied the font from, which
    // is the kind of note that is only ever true on the day it is written.
    /* `paint={false}`: the column paints its OWN ground (`bg-surface-sunken`), and it
       only needs the variables to resolve it with. */
    <AppGround paint={false} className={['shrink-0', className].filter(Boolean).join(' ')}>
    {/* THE COLUMN AND EVERY CARD IN IT are `SidebarAgentCoderInfo`'s: its ground, its
        width, its gutter, the face it sets for everything inside, the order the regions
        are read in, and the arrangement of the repository cards. What was here was a copy
        of all six — down to a comment pointing at the line of `AgentInfoSidebar.tsx` it had
        copied the font from, which is the kind of note that is only ever true on the day it
        is written.

        SO THIS FILE IS DATA NOW. Every region below is the card's own arguments rather
        than the card: the drawings cannot drift from the app's, because they ARE the app's.

        THE TOUR RIDES ON `className` at every level, which is why each region has one. The
        scroll band rings a part and zooms to it, and `.part-x` is a selector it already
        accepts beside `[data-part="x"]` — so a wrapper `div`, which there is no longer
        anywhere to put, is not what it needed. */}
    <SidebarAgentCoderInfo
      width={PANEL_WIDTH}
      /* ── 1. THE SESSION CARD ─────────────────────────────────────────────────
         `rounded-xl` is gone with the wrapper and nothing was lost: the ring now rides on
         `Card` itself, which is where that radius came from in the first place. */
      usage={{
        contextPercent: CONTEXT_PCT,
        contextDetail: '540.0k / 1.00M tokens',
        model: 'Fable 5.1',
        cost: '$3.13',
        duration: '24m 18s',
        onMinimizedChange: noop,
        labels: {
          context: t('site.infoSidebar.context'),
          minimize: t('site.infoSidebar.fold'),
          expand: t('site.infoSidebar.unfold'),
        },
        className: `${part('session')} transition-opacity duration-500 ${focusClass(focus, 'session')}`,
      }}
      /* ── 2. THE TICKET CARD ──────────────────────────────────────────────────
         THE TOUR REACHES INSIDE IT: the band rings the ticket id and the status separately
         and zooms to whichever it names. Both ride on the parts' OWN `className`, which
         `TitleAgentCard` already passes down, so the card needs no escape hatch.

         The pill FADES between the four status steps because `Status` carries
         `transition-colors`, which it does for `ProgressBar`'s reason rather than for this
         page's: a coloured indicator that snaps reads as a redraw. */
      ticket={{
        ticket: {
          children: 'PAY-318',
          // The tone brings Atlassian's own mark and its blue at 14%, which is what a Tasks
          // card wears — so the badge says which tracker the id belongs to whether or not a
          // URL could be built for it.
          tone: 'jira',
          title: 'PAY-318',
          onClick: noop,
          className: `${part('ticketId')} ${focus === 'ticketId' ? RING : ''}`,
        },
        status: {
          label: t(pill.label),
          tone: pill.tone,
          options: [],
          onSelect: noop,
          className: `${part('status')} ${focusClass(focus, 'status')}`,
        },
        title: FIELD(t('site.infoSidebar.ticketTitle')),
        description: FIELD(t('site.infoSidebar.ticketDescription')),
        className: `${part('ticket')} transition-opacity duration-500 ${focusClass(focus, 'ticket')}`,
      }}
      /* ── 3. THE REPOSITORY CARDS ─────────────────────────────────────────────
         A LIST, because an agent can carry several repositories — this one carries one, and
         the list is what makes the second cost no layout. The `space-y-3` between them is
         the column's, not this drawing's. */
      repositories={[
        {
          id: 'magic-pay',
          /* `relative` so the hand-drawn scripts menu below can hang off this card, and the
             ring rides on the same element: `Card` is `rounded-xl`, so the outline follows
             the plate instead of squaring it off. */
          className: `relative ${part('repository')} transition-opacity duration-500 ${focusClass(focus, 'repository')}`,
          /* THE SCRIPTS STEP RINGS THE TRIGGER, not the row around it. The button lives
             inside `HeaderRepoCard`, so it carries `part-scripts` in its own `className`. */
          header: {
            name: 'magic-pay',
            color: REPO_COLOR,
            scripts: {
              icon: Play,
              title: t('site.infoSidebar.scripts'),
              groups: SCRIPT_GROUPS(t),
              onSelect: noop,
              className: `${part('scripts')} ${focus === 'scripts' ? RING : ''}`,
              /* THE REAL PANEL IS NOT USED HERE, and this is the one place in the four
                 drawings where it could not be. `SelectIcon` positions its panel `fixed`,
                 from the trigger's VIEWPORT rect — and `/desktop` draws this sidebar at
                 500px inside a `scale()` that its scroll tour animates. A fixed box inside
                 a transformed ancestor resolves its coordinates against that ancestor
                 rather than the viewport: measured, the panel landed 767px to the right of
                 its trigger and came out 290px wide instead of 280. Nothing at the call
                 site fixes that; the panel would have to anchor within a container rather
                 than within the window.

                 So the menu is drawn by hand below, and the cost is the trigger's open
                 tint — `DevServerMockup` on `/features`, which has no transform over it,
                 uses the real one and keeps it. */
            },
            editor: { icon: VSCode, title: t('site.infoSidebar.open'), onClick: noop },
            remote: { icon: Github, title: t('site.infoSidebar.open'), onClick: noop },
            remove: { title: t('site.infoSidebar.open'), onClick: noop },
          },
          /* `RunningScripts` is the app's own component — it reads the store and the pty —
             so what stands in for it is drawn here. The slot is what puts it under the
             header, and it is also where the hand-drawn menu goes: an absolutely positioned
             child takes no space in the card's flow, and the card is its containing block. */
          activity: (
            <>
              {/* `ScriptCard` from `design-system/desktop/`: the purple bar, its loader, the
                  stop chip and the address row hanging off it are all its own. */}
              {scripts === 'running' || scripts === 'serving' ? (
                <div data-part="server">
                  <ScriptCard
                    name="dev"
                    state="running"
                    stop={{ label: t('site.infoSidebar.stop'), title: t('site.infoSidebar.stop'), onStop: noop }}
                    urls={
                      scripts === 'serving'
                        ? [{ url: 'http://localhost:3000', label: 'localhost:3000', title: 'localhost:3000' }]
                        : []
                    }
                    onOpenUrl={noop}
                  />
                </div>
              ) : null}
              {/* ── THE SCRIPTS MENU, hung under its trigger (`ScriptsDropdown.tsx`) ─────
                  `right-[3.25rem]` puts it under the icon-only trigger, which sits three
                  `ButtonIcon`s in from the card's right edge. */}
              {scripts === 'open' || scripts === 'hover' ? (
                <div className="absolute right-[3.25rem] top-[calc(0.75rem+1.5rem+8px)] z-20 w-[280px] overflow-hidden rounded-lg border border-appline/50 bg-appbg-secondary shadow-lift">
                  {SCRIPT_GROUPS(t).map((group) => (
                    <div key={group.label}>
                      <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
                        {group.label}
                      </div>
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                            scripts === 'hover' && item.id === 'dev' ? 'bg-white/[0.06]' : ''
                          }`}
                        >
                          <Play className="h-3 w-3 shrink-0 text-accent" />
                          <span className="truncate text-xs font-medium text-white/90">{item.label}</span>
                          <span className="ml-auto truncate text-[10px] text-appink/40">{item.hint}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ),
          /* `BranchCard`'s subject is the RELATION between two branches — base, arrow,
             current — which `BranchPill` drew only one side of at a time. */
          branch: {
            branch: BRANCH,
            base: BASE_BRANCH,
            copy: { label: BRANCH, onCopy: noop },
            /* `rounded-lg` WITH THE RING: `BranchCard`'s root is a bare flex row, the two
               chips inside it carry the radius, so a ring on the row alone drew a square
               corner around two round ones. The chips' own radius, on the element the ring
               is a shadow of. */
            className: `${part('branches')} ${focus === 'branches' ? `rounded-lg ${RING}` : ''}`,
          },
          changes: {
            label: t('site.infoSidebar.uncommitted'),
            summary: t('site.infoSidebar.files', { count: FILES.length }),
            additions: added,
            deletions: removed,
            files: FILES.map((file) => ({
              path: file.file,
              name: file.file,
              additions: file.added,
              deletions: file.removed,
            })),
            /* A HANDLER, EVEN THOUGH NOTHING OPENS. `FileModifiedLine` is inert without one
               — no pointer, and no lift on the filename under the cursor — and this panel is
               a picture of a card whose rows DO answer the mouse. The hover is a text colour
               and nothing else since the plate went, so it promises far less than a ground
               would: it says the row is a row, not that a drawer is about to open. */
            onOpenFile: noop,
            className: `${part('files')} ${focus === 'files' ? RING : ''}`,
          },
          commits: {
            label: t('site.infoSidebar.commits'),
            summary: `${COMMITS.length} ahead of ${BASE_BRANCH}`,
            commits: COMMITS.map((commit) => ({
              hash: commit.hash,
              shortHash: commit.hash,
              subject: commit.subject,
              relativeDate: commit.age,
              copyLabel: commit.hash,
            })),
            onCopyHash: noop,
            className: `${part('commits')} ${focus === 'commits' ? RING : ''}`,
          },
          pullRequest: pr ? (
            <div
              data-part="pr"
              className={`rounded-lg transition-opacity duration-500 ${focusClass(focus, 'pr')}`}
            >
              <PullRequestCard passed={pr.passed} review={pr.review} comments={pr.comments} focus={prFocus} />
            </div>
          ) : undefined,
        },
      ]}
      /* ── 4. THE ADD-REPOSITORY BOX ──────────────────────────────────────────── */
      /* THE REAL BOX, like every card above it. What stood here was a fourth copy of the
         dashed rectangle, and it had drifted from the app's: `rounded-lg` against the card
         radius, and a hardcoded `appline` / `appink` that stayed the dark theme's grey
         whatever ground it was dropped on. */
      addRepository={{
        label: t('site.mockup.addRepo'),
        onClick: noop,
        className: `transition-opacity duration-500 ${focus ? 'opacity-30' : ''}`.trim(),
      }}
    />
    </AppGround>
  )
}
