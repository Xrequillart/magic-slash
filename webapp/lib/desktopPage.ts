import { FEATURE_FAMILIES, type Feature, type FeatureTitle } from './features'
import type { MessageKey } from './i18n'

/**
 * What `/desktop` says under its hero, as data — the same split `lib/skillsBand.ts` and
 * `lib/downloadPage.ts` make, and for the same reason: the root vitest suite can read
 * this file and cannot compile the JSX next to it, so everything a test should pin (the
 * keys exist in both catalogues, the features named here are features the inventory
 * declares, the button lands on an anchor that exists) is here, and the components in
 * `components/site/desktop/` only render it.
 *
 * THE PAGE PICKS FROM `/features` RATHER THAN RESTATING IT. `lib/features.ts` is the source
 * of truth for what the app does — one row per capability, a description each, a drawing
 * for most. `/desktop` is a different kind of page: it is the ARGUMENT for the app, six
 * bands long, and each band shows two to four of those rows at the size an argument needs.
 * So the bands below name the rows they show by id, and `pick()` reads them out of the
 * inventory: the title, the description and the drawing come from there, which means a
 * capability described on `/features` is described in the same words here, and a row that
 * is cut from the inventory fails this page's test rather than going quietly stale.
 *
 * What IS written here is the argument itself: a heading and a paragraph per band, and the
 * three claims under the two split bands. Those are `site.desktopPage.*`, a family of their
 * own beside `site.desktop.*` (the hero) — the hero's copy is about the pain the app
 * relieves, and this is about what the app does, which is a different sentence.
 */

/**
 * A band's heading: the headline and the paragraph under it. NO EYEBROW — the monospace
 * blue label every homepage band opens with was tried here and cut by the product owner
 * ("je n'aime pas"), so a `/desktop` band starts on its headline.
 */
export type BandChrome = {
  title: MessageKey
  subtitle: MessageKey
}

export const DESKTOP_BANDS = {
  tasks: {
    title: 'site.desktopPage.tasksTitle',
    subtitle: 'site.desktopPage.tasksSubtitle',
  },
  agents: {
    title: 'site.desktopPage.agentsTitle',
    subtitle: 'site.desktopPage.agentsSubtitle',
  },
  sidebar: {
    title: 'site.desktopPage.sidebarTitle',
    subtitle: 'site.desktopPage.sidebarSubtitle',
  },
  around: {
    title: 'site.desktopPage.aroundTitle',
    subtitle: 'site.desktopPage.aroundSubtitle',
  },
  guardrails: {
    title: 'site.desktopPage.guardTitle',
    subtitle: 'site.desktopPage.guardSubtitle',
  },
} as const satisfies Record<string, BandChrome>

/**
 * Icon NAMES, resolved to lucide components by the band that draws them — the same split
 * `lib/skillsBand.ts` makes, because this module is read by a suite with no `lucide-react`.
 */
export type DesktopIcon =
  | 'ListTodo'
  | 'MousePointerClick'
  | 'FolderGit2'
  | 'GitBranch'
  | 'Layers'
  | 'BellRing'
  | 'Wrench'
  | 'ShieldCheck'
  | 'Gauge'
  | 'Keyboard'
  // The four glyphs of the "around the window" band. They used to be resolved by
  // `AroundBand.tsx` from each row's own `FeatureIcon`, through a second lucide map that
  // existed only for that band; the two fact bands share one list shape now (see
  // `DesktopFact`), so they share this page's one icon vocabulary as well.
  | 'Columns'
  | 'Search'
  | 'Bell'
  | 'AppWindow'
  // The key points of the sidebar tour, one glyph each — see `POINT_ICONS`.
  | 'DollarSign'
  | 'Clock'
  | 'Pencil'
  | 'RefreshCw'
  | 'Ticket'
  | 'ExternalLink'
  | 'Tag'
  | 'Play'
  | 'ListOrdered'
  | 'GitCommitHorizontal'
  | 'CloudOff'
  | 'GitPullRequest'
  | 'PanelBottom'
  | 'MessageSquare'
  | 'Eye'
  | 'Activity'
  | 'Globe'
  | 'FileDiff'
  | 'LayoutGrid'
  | 'History'
  | 'Copy'
  | 'ArrowUp'
  | 'Hash'
  | 'EyeOff'
  | 'Loader'
  | 'ListChecks'
  | 'GitMerge'
  | 'MessagesSquare'
  | 'PanelRight'
  | 'Bot'
  | 'Tags'
  | 'BadgeCheck'

export type DesktopPoint = { icon: DesktopIcon; label: MessageKey }

/** The three claims under the backlog band. */
export const TASKS_POINTS: readonly DesktopPoint[] = [
  { icon: 'ListTodo', label: 'site.desktopPage.tasksPointTrackers' },
  { icon: 'MousePointerClick', label: 'site.desktopPage.tasksPointClick' },
  { icon: 'FolderGit2', label: 'site.desktopPage.tasksPointRepos' },
]

/** The three claims under the agents band. */
export const AGENTS_POINTS: readonly DesktopPoint[] = [
  { icon: 'GitBranch', label: 'site.desktopPage.agentsPointWorktree' },
  { icon: 'Layers', label: 'site.desktopPage.agentsPointTwelve' },
  { icon: 'BellRing', label: 'site.desktopPage.agentsPointWaiting' },
]

/**
 * A row of the inventory, by family and id. Throws rather than returning `undefined`: a
 * band that names a row the inventory no longer has is a broken page, and the test below
 * is where that should surface — at module load, on every run, not as a blank card.
 */
export function pick(familyId: string, featureId: string): Feature {
  const family = FEATURE_FAMILIES.find((candidate) => candidate.id === familyId)
  const feature = family?.features.find((candidate) => candidate.id === featureId)
  if (!feature) throw new Error(`/desktop names ${familyId}/${featureId}, which lib/features.ts does not declare`)
  return feature
}

/**
 * THE SCROLL TOUR OF THE INFO SIDEBAR. The panel stands on the right, sticky, at the
 * app's own size; these are the paragraphs that scroll past it on the left, and what the
 * panel does as each one arrives: which part it zooms to (`part`), what the status pill
 * reads (`status`), whether a pull request card is drawn and what it says (`pr`).
 *
 * THREE KINDS OF STEP. A CARD step is a `/features` row — the same title and description
 * the inventory gives that card — and `feature` names it. A STATUS step has no row: it is
 * one value of the pill, headed by `site.desktopPage.statusStepTitle` with the status's
 * own label in it, and explained by the status's own `site.status.*Desc` line. A DETAIL
 * step is a part INSIDE a card that the inventory has no row for — the ticket id, the
 * uncommitted files, the commits, the pull request's verdict and its checks — and carries
 * its own `site.desktopPage.step*` pair.
 *
 * THE ORDER IS THE PANEL'S, top to bottom, and inside a card the order the card stacks its
 * parts: session; ticket, its id, then the pill walked in progress → committed → PR created
 * (the PR card appears here, as it does in the app the moment the agent has a PR URL) →
 * in review; the repository card, its scripts dropdown, its two branches, its uncommitted
 * files, its commits;
 * the pull request card, its checks, its comments, and its verdict — where the pill goes
 * to "PR merged", so the tour ends on a ticket that is done. The PR data tightens along
 * the way: one check at creation, two running by the checks step, three and a pending
 * review, three comments, approved. The product owner asked for these finer stops
 * ("ajoute des étapes dans la card de la PR", "split les fichiers modifiés et les
 * commits", "une étape pour le dropdown script", "une étape sur l'id du ticket").
 */
export type SidebarTourStatus =
  | 'inProgress'
  | 'committed'
  | 'prCreated'
  | 'inReview'
  | 'prMerged'

export type SidebarTourPR = {
  passed: number
  review: 'none' | 'pending' | 'commented' | 'changes' | 'approved'
  comments: number
}

/** The parts of the panel a step can zoom to. `InfoSidebarMockup.tsx` draws the anchors. */
export type SidebarTourPart =
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
  | 'prChecks'
  | 'prComments'
  | 'prHeader'

export type SidebarTourStep = {
  id: string
  /** The part that takes the ring. */
  part: SidebarTourPart
  /**
   * The part the panel frames, when it is wider than the one ringed. The scripts step
   * rings the dropdown's trigger but has to show the menu that opens under it and the
   * server row that appears in the card, so it frames the whole repository card.
   */
  zoom?: SidebarTourPart
  status: SidebarTourStatus
  pr: SidebarTourPR | null
  /** Three key points under the paragraph, one line and one glyph each. */
  points: readonly DesktopPoint[]
} & (
  | { kind: 'card'; feature: Feature }
  | { kind: 'status'; statusLabel: MessageKey; description: MessageKey }
  | { kind: 'detail'; title: MessageKey; description: MessageKey }
)

const NO_PR = null
const PR_OPENED: SidebarTourPR = { passed: 1, review: 'none', comments: 1 }
const PR_CHECKING: SidebarTourPR = { passed: 2, review: 'pending', comments: 1 }
const PR_IN_REVIEW: SidebarTourPR = { passed: 3, review: 'pending', comments: 1 }
const PR_COMMENTED: SidebarTourPR = { passed: 3, review: 'commented', comments: 3 }
const PR_APPROVED: SidebarTourPR = { passed: 3, review: 'approved', comments: 3 }

/**
 * The glyph beside each key point, three a step, by the step's point family. A different
 * glyph on every line — the product owner's ask over a row of identical checks — and each
 * one names what its line says: a gauge for the context, a globe for the address, a copy
 * mark for the hash.
 */
const POINT_ICONS: Record<string, readonly [DesktopIcon, DesktopIcon, DesktopIcon]> = {
  Session: ['Gauge', 'DollarSign', 'Clock'],
  Ticket: ['Pencil', 'RefreshCw', 'Ticket'],
  TicketId: ['ExternalLink', 'Tag', 'GitBranch'],
  StatusInProgress: ['Play', 'MousePointerClick', 'ListOrdered'],
  StatusCommitted: ['GitCommitHorizontal', 'CloudOff', 'Layers'],
  StatusPrCreated: ['GitPullRequest', 'PanelBottom', 'MessageSquare'],
  StatusInReview: ['Eye', 'Activity', 'Wrench'],
  Repository: ['GitBranch', 'ExternalLink', 'FolderGit2'],
  Scripts: ['ListTodo', 'Globe', 'ExternalLink'],
  Branches: ['GitBranch', 'FolderGit2', 'Copy'],
  Files: ['RefreshCw', 'FileDiff', 'LayoutGrid'],
  Commits: ['History', 'Copy', 'ArrowUp'],
  Pr: ['Hash', 'RefreshCw', 'EyeOff'],
  PrChecks: ['Loader', 'ListChecks', 'GitMerge'],
  PrComments: ['MessagesSquare', 'PanelRight', 'Bot'],
  PrHeader: ['Tags', 'Eye', 'BadgeCheck'],
}

/**
 * The three key points of a step, by the step's point family: `site.desktopPage.pt<Id>1..3`,
 * each with its glyph from `POINT_ICONS`. The key is typed `MessageKey` by assertion, which
 * the test turns into a check that it is actually in both catalogues — the template cannot
 * be typed against the union directly. A family with no glyphs throws at module load,
 * which the same test catches.
 */
const points = (family: string): readonly DesktopPoint[] => {
  const icons = POINT_ICONS[family]
  if (!icons) throw new Error(`/desktop has no key-point glyphs for ${family}`)
  return icons.map((icon, index) => ({ icon, label: `site.desktopPage.pt${family}${index + 1}` as MessageKey }))
}

const status = (id: SidebarTourStatus, pr: SidebarTourPR | null, label: MessageKey, description: MessageKey): SidebarTourStep => ({
  id: `status-${id}`, kind: 'status', part: 'status', status: id, pr, statusLabel: label, description,
  points: points(`Status${id[0].toUpperCase()}${id.slice(1)}`),
})
const detail = (id: string, part: SidebarTourPart, st: SidebarTourStatus, pr: SidebarTourPR | null, title: MessageKey, description: MessageKey): SidebarTourStep => ({
  id, kind: 'detail', part, status: st, pr, title, description, points: points(`${id[0].toUpperCase()}${id.slice(1)}`),
})
const card = (id: string, part: SidebarTourPart, st: SidebarTourStatus, pr: SidebarTourPR | null, feature: Feature): SidebarTourStep => ({
  id, kind: 'card', part, status: st, pr, feature, points: points(`${id[0].toUpperCase()}${id.slice(1)}`),
})

export const SIDEBAR_TOUR: readonly SidebarTourStep[] = [
  card('session', 'session', 'inProgress', NO_PR, pick('insights', 'agentContext')),
  card('ticket', 'ticket', 'inProgress', NO_PR, pick('insights', 'ticketInfo')),
  detail('ticketId', 'ticketId', 'inProgress', NO_PR, 'site.desktopPage.stepTicketIdTitle', 'site.desktopPage.stepTicketIdDesc'),
  status('inProgress', NO_PR, 'site.status.inProgress', 'site.status.inProgressDesc'),
  status('committed', NO_PR, 'site.status.committed', 'site.status.committedDesc'),
  status('prCreated', PR_OPENED, 'site.status.prCreated', 'site.status.prCreatedDesc'),
  status('inReview', PR_IN_REVIEW, 'site.status.inReview', 'site.status.inReviewDesc'),
  card('repository', 'repository', 'inReview', PR_IN_REVIEW, pick('insights', 'repository')),
  { ...card('scripts', 'scripts', 'inReview', PR_IN_REVIEW, pick('insights', 'devServer')), zoom: 'repository' },
  detail('branches', 'branches', 'inReview', PR_IN_REVIEW, 'site.desktopPage.stepBranchesTitle', 'site.desktopPage.stepBranchesDesc'),
  detail('files', 'files', 'inReview', PR_IN_REVIEW, 'site.desktopPage.stepFilesTitle', 'site.desktopPage.stepFilesDesc'),
  detail('commits', 'commits', 'inReview', PR_IN_REVIEW, 'site.desktopPage.stepCommitsTitle', 'site.desktopPage.stepCommitsDesc'),
  card('pr', 'pr', 'inReview', PR_IN_REVIEW, pick('insights', 'pullRequest')),
  detail('prChecks', 'prChecks', 'inReview', PR_CHECKING, 'site.desktopPage.stepPrChecksTitle', 'site.desktopPage.stepPrChecksDesc'),
  card('prComments', 'prComments', 'inReview', PR_COMMENTED, pick('insights', 'prComments')),
  detail('prHeader', 'prHeader', 'prMerged', PR_APPROVED, 'site.desktopPage.stepPrVerdictTitle', 'site.desktopPage.stepPrVerdictDesc'),
]

/** The heading a status step carries: "Status: {status}", with the pill's own label. */
export const STATUS_STEP_TITLE: MessageKey = 'site.desktopPage.statusStepTitle'

/**
 * A FACT, which is what both of the page's last two bands are made of: a glyph, a
 * headline and a paragraph, no drawing and nothing to click.
 *
 * ONE TYPE FOR THE TWO BANDS, where there were two — `Feature[]` for the dark band and a
 * `GuardrailRow[]` of its own for the light one. They are drawn by ONE component now
 * (`components/site/desktop/FactList.tsx`, at the product owner's ask that the guardrails
 * be set at the same size as the rows above them), and a shared component over two
 * shapes is how the two would have come to disagree about what a row is.
 *
 * `FeatureTitle` AND NOT `MessageKey`, because the dark band's rows are inventory rows
 * and two of them are titled by a product's own name — "Split View", "Spotlight" — which
 * `lib/features.ts` deliberately spells as literals rather than as identical en/fr pairs.
 * `titleOf` tells the two apart at runtime. The guardrails are all keys, and the test
 * next door keeps them that way: a guardrail is a sentence, not a product name.
 *
 * THE GLYPH IS THE BAND'S CHOICE AND NOT THE ROW'S. `machineSetup` is drawn with a plug
 * on `/features` and with a wrench here, which is not drift: the inventory's glyph labels
 * a capability in a list of thirty, and this one labels an argument in a band of four.
 * So it is an argument to `fact()` rather than a field read off the row.
 */
export type DesktopFact = {
  id: string
  icon: DesktopIcon
  title: FeatureTitle
  description: MessageKey
}

/** An inventory row, as a fact: the title and the words are the row's, the glyph is not. */
const fact = (icon: DesktopIcon, feature: Feature): DesktopFact => ({
  id: feature.id,
  icon,
  title: feature.title,
  description: feature.description,
})

/**
 * WHAT SITS AROUND THE WINDOW: the four desktop rows `/features` sets as showcase cards
 * — the split view, the global shortcut, the menu bar, the Mac's own notifications — and
 * the keyboard. Shown WITHOUT their drawings, on a dark band: an icon, the title beside
 * it, the description under, by the product owner's call, because the drawings are on
 * `/features` and this band is short facts.
 *
 * THE KEYBOARD IS THE FIFTH AND IT MOVED HERE from the guardrails band below, by request.
 * It belongs to this question rather than to that one: this band is what the app does
 * AROUND the window you work in — a second pane, a global shortcut, the menu bar, the
 * Mac's own notifications — and getting between them without the mouse is one of those,
 * where "what the first launch installs and how far an agent may go" is not. The
 * copy is the homepage's own keyboard card, `site.builtFor.shortcuts*`: the inventory has
 * no row for the shortcuts, and that pair already says it in one sentence.
 *
 * FIVE IN A TWO-COLUMN GRID leaves the last one alone on its row, which is why the
 * component spans it — see `FactList`.
 */
export const AROUND_FACTS: readonly DesktopFact[] = [
  fact('Columns', pick('desktop', 'splitView')),
  fact('Search', pick('desktop', 'spotlight')),
  // THE MENU BAR BEFORE THE NOTIFICATIONS, swapped by request. It also reads as the
  // better pair: the second row is now where the app STANDS when you are not in it —
  // always running, then telling you something — where the first is the two ways you
  // reach it. The band is a grid of two, so this moves both rows of the middle line.
  fact('AppWindow', pick('desktop', 'menuBar')),
  fact('Bell', pick('desktop', 'notifications')),
  {
    id: 'shortcuts',
    icon: 'Keyboard',
    title: 'site.builtFor.shortcutsTitle',
    description: 'site.builtFor.shortcutsDesc',
  },
]

/**
 * THE GUARDRAILS: what the app checks, what it asks, what it shows you spending, and what
 * it keeps up to date on its own. Facts to know rather than screens to look at.
 *
 * THREE OF THE FOUR ARE INVENTORY ROWS, and the fourth is the automatic update, written
 * here as `site.desktopPage.updates*`. It has no inventory row — the FAQ answers it at
 * length (`site.faq.updates.a`) and `/features` has never listed it — and it is a fact of
 * exactly this kind: something the app does for you before you have asked, which you
 * would want to know before installing it.
 *
 * THE KEYBOARD USED TO BE THE FOURTH, and it is in `AROUND_FACTS` now for the reason
 * given up there. These four are one question — what happens to my machine, my code and
 * my bill — and the shortcuts were never an answer to it.
 */
export const GUARDRAILS: readonly DesktopFact[] = [
  fact('Wrench', pick('integrations', 'machineSetup')),
  fact('ShieldCheck', pick('configuration', 'permissionModes')),
  fact('Gauge', pick('desktop', 'usage')),
  {
    id: 'updates',
    icon: 'RefreshCw',
    title: 'site.desktopPage.updatesTitle',
    description: 'site.desktopPage.updatesDesc',
  },
]

/**
 * Where the page sends a reader who wants the whole list: the inventory, opened on its
 * desktop family. The button's label is `/features`' own "All features" row.
 */
export const ALL_FEATURES_PATH = '/features#desktop'
