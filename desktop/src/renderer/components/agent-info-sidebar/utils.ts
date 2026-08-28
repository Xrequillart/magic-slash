import type { Translate } from '../../i18n'
import type { AgentType, TerminalMetadata } from '../../../types'
import { JIRA_KEY } from '../../utils/taskAgents'

// Format a timestamp (ms) to compact relative time (now, 5min, 2h, 3d, 1w, 2mo, 1y).
// The translator is a parameter rather than a hook call: this stays a pure
// function, callable from a node-environment test and from a non-component path.
export function formatTimestamp(tsCreate: number, now: number | undefined, t: Translate): string {
  const current = now ?? Date.now()
  const diffMs = current - tsCreate
  if (diffMs < 60_000) return t('relative.now')

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return t('relative.minutes', { count: minutes })

  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 24) return t('relative.hours', { count: hours })

  const days = Math.floor(diffMs / 86_400_000)
  if (days < 7) return t('relative.days', { count: days })

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return t('relative.weeks', { count: weeks })

  const months = Math.floor(days / 30)
  if (months < 12) return t('relative.months', { count: months })

  const years = Math.floor(days / 365)
  return t('relative.years', { count: years })
}

// git's relative dates arrive as English prose ("2 hours ago", "1 month, 2 weeks
// ago") whatever the interface language, because that is what the CLI emits. Only
// the unit is ours to translate, so the number is parsed out and re-rendered
// through the catalogue: "3 weeks ago" → "3w" in English, "3 sem" in French.
const RELATIVE_UNIT_KEYS = {
  second: 'relative.seconds',
  minute: 'relative.minutes',
  hour: 'relative.hours',
  day: 'relative.days',
  week: 'relative.weeks',
  month: 'relative.months',
  year: 'relative.years',
} as const

// Format relative date to short format (15min, 3h, 1d, 15d, 1mo5d, etc.)
export function formatRelativeDate(relativeDate: string, t: Translate): string {
  // Parse git's relative date format (e.g., "2 hours ago", "3 days ago", "1 month, 2 weeks ago")
  const match = relativeDate.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s*(?:,\s*(\d+)\s+(day|week)s?)?/i)
  if (!match) return relativeDate

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase() as keyof typeof RELATIVE_UNIT_KEYS
  const subValue = match[3] ? parseInt(match[3]) : 0
  const subUnit = match[4]?.toLowerCase() as keyof typeof RELATIVE_UNIT_KEYS | undefined

  const unitKey = RELATIVE_UNIT_KEYS[unit]
  let result = unitKey ? t(unitKey, { count: value }) : `${value}${unit}`

  // Add sub-unit if present (e.g., "1 month, 5 days" -> "1mo5d")
  if (subValue && subUnit) {
    const subKey = RELATIVE_UNIT_KEYS[subUnit]
    result += subKey ? t(subKey, { count: subValue }) : `${subValue}${subUnit}`
  }

  return result
}

/**
 * Colour for the session context gauge: green, then orange from 40%, then red
 * from 70%. Deliberately not `gaugeColors` from LimitGauge — that one paints
 * the plan rate limits, where 60% of a weekly quota is unremarkable. A context
 * window is the opposite: filling it is what triggers a compaction, so the
 * warning has to arrive far earlier.
 *
 * Returns Tailwind classes rather than colours. `orange`, `red` and `green`
 * resolve against the per-theme tokens written by the theme registry
 * (src/themes.ts), so every theme supplies its own shade — the light ones need
 * a much darker orange to stay legible on white than the dark ones do.
 *
 * Lives here, next to the formatters, rather than in LimitGauge: that module
 * pulls in the i18n hook, which touches `window` at import and cannot be loaded
 * from a node-environment test.
 */
export function contextColors(pct: number): { bar: string; text: string } {
  if (pct >= 70) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 40) return { bar: 'bg-orange', text: 'text-orange' }
  return { bar: 'bg-green', text: 'text-green' }
}

/**
 * Which tracker a ticket ID belongs to, read from its shape alone.
 *
 * GitHub accepts the `#` or no `#`: `/magic:start` takes `^#?\d+$` from the person
 * and then uses the ID verbatim for the worktree directory and the branch name
 * (`magic-slash-196`, `feature/magic-slash-196-…`), so what it writes to
 * `/metadata` is the bare number. Requiring the `#` here is what left issues 196
 * and 197 with no mark and no link while Jira tickets beside them worked. The `#`
 * cannot simply be added upstream either: unencoded in a URL it opens a fragment,
 * so curl would drop it along with every parameter after it.
 *
 * Pure digits are unambiguous — a Jira key always carries its `ABC-` prefix.
 *
 * Returns null for anything else: a hand-typed reference is still a valid ticket
 * ID, and a wrong mark next to it would be worse than none.
 *
 * The Jira shape comes from `JIRA_KEY`, shared with `normalizeTicketId`, rather than
 * spelled out again here. The two must agree on what a key is: that function folds
 * `sup2-14` onto `SUP2-14` so the Tasks card can mark it, and a narrower rule here
 * would drop the very same id back to `null` — no mark, no link, and nothing in
 * either file to suggest why. Sharing the constant is what makes that impossible
 * rather than merely unlikely.
 */
export function detectTicketProvider(ticketId: string | undefined): 'github' | 'jira' | null {
  if (!ticketId) return null
  if (/^#?\d+$/.test(ticketId)) return 'github'
  if (JIRA_KEY.test(ticketId)) return 'jira'
  return null
}

/**
 * The tracker URL for a ticket ID, or null when none can be built — the ID is not
 * recognised, or the tracker it belongs to has no base URL configured.
 *
 * Deliberately separate from `detectTicketProvider`: the mark shows on shape alone,
 * so an unlinkable ID still says which tracker it came from.
 */
export function buildTicketLink(
  ticketId: string | undefined,
  urls: { jiraUrl?: string; githubIssuesUrl?: string },
): string | null {
  const provider = detectTicketProvider(ticketId)
  if (!ticketId || !provider) return null

  const base = provider === 'github' ? urls.githubIssuesUrl : urls.jiraUrl
  if (!base) return null

  // The `#` is display sugar, never part of the path.
  const segment = provider === 'github' ? ticketId.replace(/^#/, '') : ticketId
  return `${base.replace(/\/+$/, '')}/${segment}`
}

/**
 * Resolve an agent's kind, applying the default an absent one means.
 *
 * Absent is common and is not an error: every agent created before the type existed
 * has none, and so does one whose skill has not announced yet. `coder` is what all of
 * those were, so that is what absent reads as — never `planner`, which would put a
 * spec panel in front of someone writing code.
 *
 * Takes `string` rather than `AgentType` on purpose: a newer build can persist a kind
 * this one has never heard of, and that must fall back rather than render as itself.
 */
export function resolveAgentType(type: string | undefined): AgentType {
  return type === 'planner' ? 'planner' : 'coder'
}

/**
 * Does this agent's sidebar show the live spec instead of the ticket card?
 *
 * Keyed on the agent's TYPE, not on its status. It used to read the status —
 * `planning`/`planned` meant a spec panel — which meant a planner had no layout until
 * its first status arrived, and that renaming either value silently disabled the
 * panel for everyone. The type is declared at creation, so the layout is right from
 * the first render.
 */
export type SpecPanelMode = 'replace' | 'hidden'

export function getSpecPanelMode(type: string | undefined): SpecPanelMode {
  return resolveAgentType(type) === 'planner' ? 'replace' : 'hidden'
}

/**
 * The statuses each kind of agent can be in, in workflow order.
 *
 * EXHAUSTIVE BY TYPE across the two lists put together, and that is the point: this is
 * the whole contract between the statuses the skills write and the ones the picker
 * offers. Renaming a status in `TerminalMetadata` (desktop/src/types.ts) is a compile
 * error here rather than a value that quietly disappears from every menu.
 *
 * `''` — no status — belongs to both: it is where every agent starts, whatever it is.
 */
export const STATUSES_BY_TYPE: Record<AgentType, readonly NonNullable<TerminalMetadata['status']>[]> = {
  planner: ['', 'planning', 'planned'],
  coder: [
    '',
    'in progress',
    'committed',
    'ready for PR',
    'PR created',
    'CI green',
    'in review',
    'changes requested',
    'Review addressed',
    'PR merged',
  ],
}

/**
 * The status that ENDS each workflow — where the agent has nothing left to do.
 *
 * A planner stops at `planned`: it produces a spec and a ticket, never a branch or a
 * PR, so waiting for `PR merged` would leave it uncloseable forever.
 */
const TERMINAL_STATUS: Record<AgentType, NonNullable<TerminalMetadata['status']>> = {
  planner: 'planned',
  coder: 'PR merged',
}

/**
 * May this agent be closed for good?
 *
 * Its own workflow's end, or a beginning: an agent with no status never started, so
 * there is nothing to lose.
 *
 * Lives here rather than inline because two surfaces ask the question — the title bar,
 * which offers the button, and the sidebar, which used to. One answer is what stops
 * them disagreeing about whether the button should be there.
 */
export function canCloseAgent(status: string | undefined, type: string | undefined): boolean {
  return !status || status === TERMINAL_STATUS[resolveAgentType(type)]
}

/**
 * May the agent's kind still be changed?
 *
 * Only before it has done anything. Once a status is set the agent has committed to a
 * workflow — a coder mid-`in progress` has a branch and a diff, a planner at `planned`
 * has a ticket — and switching its kind would strand that status outside the list its
 * new kind offers. Rather than clearing the status or tolerating an orphan, the switch
 * simply stops being available, which is also why the caller HIDES the control instead
 * of disabling it: there is nothing the user could do to re-enable it.
 */
export function canChangeAgentType(status: string | undefined): boolean {
  return !status
}

/**
 * Split an ABSOLUTE spec path into the `(repoPath, filePath)` pair `config:readFile`
 * takes.
 *
 * Written with string operations rather than node's `path`: this runs in the
 * renderer bundle, where the builtin is not available, and in the node-environment
 * test suite, where importing it would hide that.
 *
 * The pair looks redundant — dirname plus basename is just the path again — and that
 * is exactly why it is NOT a security boundary. `config:readFile` resolves
 * `path.resolve(repoPath, filePath)` and checks the result sits under `repoPath`,
 * which a directory and its own child satisfy by construction: passing the pair this
 * way makes that check succeed for any path at all. It is a formatting helper, not an
 * authorization gate, and it must never be read as one.
 *
 * What actually constrains the path is `isSpecPath` in `main/store/spec-file.ts`,
 * applied by the `/metadata` route before `specPath` is ever stored — that route is
 * the only untrusted entry point, since it is a loopback server any local process can
 * call. No repo root is involved here, and none could be: an agent can hold several
 * repositories and the spec need not live inside any of them.
 *
 * Returns null for an empty or relative path — `TerminalMetadata.specPath` is
 * documented absolute, so anything else is a writer bug and guessing a root for it
 * would read some unrelated file.
 */
export function splitSpecPath(specPath: string | undefined): { repoPath: string; filePath: string } | null {
  if (!specPath) return null
  const trimmed = specPath.trim()
  if (!trimmed.startsWith('/')) return null

  const lastSlash = trimmed.lastIndexOf('/')
  const filePath = trimmed.slice(lastSlash + 1)
  // A path that ends on its separator names a directory, not a spec.
  if (!filePath) return null

  return { repoPath: lastSlash === 0 ? '/' : trimmed.slice(0, lastSlash), filePath }
}

/**
 * Has the reader scrolled the spec away from its top?
 *
 * The spec panel opens at the TOP — a spec is read from its first line, not tailed
 * like a log — so the only scroll question left is whether to offer the way back up.
 *
 * Takes the number rather than an `Element` on purpose: the suite runs on node with
 * no DOM, so a signature that named `HTMLElement` would be untestable — and this
 * threshold is exactly the part worth testing.
 *
 * The tolerance absorbs sub-pixel scroll positions and the elastic overscroll macOS
 * reports: a strict `> 0` would flash the control on a touchpad twitch.
 */
export const SPEC_SCROLL_TOLERANCE_PX = 32

export function hasScrolledFromTop(metrics: { scrollTop: number }): boolean {
  return metrics.scrollTop > SPEC_SCROLL_TOLERANCE_PX
}


