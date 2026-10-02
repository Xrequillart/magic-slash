import type { WorkflowPayload } from './payload'
import { isCustomNodeId, isLinkIntoStart } from './overlay'
import type { NoteLink, SkilledLink, WorkflowLanguage } from './messages'
import {
  CHAINING, CHAIN_BROKEN, CHAIN_LIMIT, CHAIN_MISSING, CHAIN_SKIPPED, CUSTOM_PURPOSE, NEXT_STEP_LINE, NOTE_LINE, PURPOSES,
  commandFor, fill, grouped, hasSkill, isNoteLink, isShown, purposeFor, safeNote, thenLines,
} from './messages'

/**
 * The body of `GET /workflow/next`: what a step shows, and follows, once it is done. A magic
 * skill asks for it by its protocol (workflow.md §2), a custom one by the context the app
 * injects when it is invoked (skillContext.ts).
 *
 * WHY THE APP DECIDES
 * ---------------------------------------------------------------------------
 * Each magic skill used to read its flow at Step 0 and, at its end, select the links
 * itself, by following prose: which outcome matches which link, what a failure keeps,
 * when an `auto` link is broken, that start is never chained into, at most one chain,
 * how a custom target's `then` reads, every message of it copied into the skill. Six
 * skills applying the same rules from text is six chances to apply them differently.
 * Here the rules are code, tested once, and a skill only names the outcome its own
 * table picked and shows what comes back.
 *
 * The skill still owns the outcome: only it knows how it ended. And it still words the
 * targets it has its own words for (plan's `/magic:start <ID>`, resolve's `/magic:done`),
 * which is why each line names its skill next to its text.
 *
 * Pure, like payload.ts: the route only moves this object around.
 */

/** The outcome of a skill that stopped on an error it could not resolve. */
export const FAILED = 'failed'

export interface WorkflowNextLine {
  /** `suggest`: a skill to run by hand. `note`: the repository's text for the user, never acted on. */
  kind: 'suggest' | 'note'
  /** The target's skill (`magic-pr`, `check-types`), null for a note. */
  skill: string | null
  /** What the user types (`/magic:pr`, `/check-types`), null for a note. */
  command: string | null
  /** The broken-chain message when this line is an `auto` link a failure stopped, else null. */
  broken: string | null
  /** The line as the flow words it, `broken` and any `then` lines under it included. */
  text: string
}

export interface WorkflowNextChain {
  /** The skill to invoke with the Skill tool: `magic-resolve`, or a custom one's own name. */
  skill: string
  command: string
  /** What to say right before invoking it. */
  text: string
  /** A custom step's skill, rather than a magic one. */
  custom: boolean
  /** Ask the user before invoking it (`applyChainPolicy`, from their settings). */
  confirm: boolean
}

export interface WorkflowNext {
  /** Notes first, then suggestions, in the flow's order. Empty: the skill keeps its own closing text. */
  lines: WorkflowNextLine[]
  /** The one link to follow on its own, once the run is recorded. */
  chain: WorkflowNextChain | null
}

export const NO_NEXT: WorkflowNext = { lines: [], chain: null }

function suggestionText(link: SkilledLink, lang: WorkflowLanguage): string {
  return [fill(NEXT_STEP_LINE[lang], commandFor(link), purposeFor(link, lang)), ...thenLines(link.then, lang)].join('\n')
}

/**
 * What follows the skill `payload` is centred on, now that it ended on `outcome`.
 *
 * A link applies when it carries no outcome or this one; an empty `outcome` (a custom step
 * that ended on none of its own) matches only the former. `failed` (with `reason`) keeps
 * only the unconditional `auto` links: a step that failed shows its error, not a way
 * forward. Of the `auto` links that apply, the first is the chain, unless it leads into
 * start (a new agent, never opened behind the user's back) or the step is `blocking` and
 * failed, in which case it is a suggestion carrying the broken-chain message; any further
 * `auto` link is a suggestion. A link to an end note is shown, never followed.
 *
 * No node (a skill in no flow, or a path matching no repository on a skill the default
 * flow leaves out) is nothing to show.
 */
export function buildWorkflowNext(
  payload: WorkflowPayload,
  outcome: string,
  { reason = '', lang = 'en' }: { reason?: string; lang?: WorkflowLanguage } = {},
): WorkflowNext {
  const node = payload.node
  if (!node) return NO_NEXT
  const failed = outcome === FAILED

  const applicable = payload.links
    .filter(isShown)
    .filter((link) => link.outcome === null || (!failed && link.outcome === outcome))
    .filter((link) => !failed || (link.kind === 'auto' && hasSkill(link)))

  const lines: WorkflowNextLine[] = grouped(applicable.filter(isNoteLink) as NoteLink[]).map(({ link }) => ({
    kind: 'note', skill: null, command: null, broken: null, text: NOTE_LINE[lang].replace('{note}', safeNote(link.note)),
  }))

  let chain: WorkflowNextChain | null = null
  let autoSeen = false
  for (const { link } of grouped(applicable.filter(hasSkill))) {
    const command = commandFor(link)
    const auto = link.kind === 'auto' && !isLinkIntoStart(link) && !autoSeen
    if (auto) autoSeen = true
    if (auto && !(failed && node.mode === 'blocking')) {
      chain = { skill: link.skill, command, text: fill(CHAINING[lang], command), custom: isCustomNodeId(link.to), confirm: false }
      continue
    }
    const broken = auto ? fill(CHAIN_BROKEN[lang], command).replace('{reason}', reason.trim() || FAILED) : null
    const text = suggestionText(link, lang)
    if (lines.some((line) => line.command === command)) continue
    lines.push({ kind: 'suggest', skill: link.skill, command, broken, text: broken ? `${broken}\n${text}` : text })
  }
  return { lines, chain }
}

/**
 * What the user's own settings (Settings → Workflow) do to a chain the flow hands out. The
 * flow is the repository's, shared by its members; these are the person's: how far they
 * let it run on its own on their machine.
 */
export interface ChainPolicy {
  /** Ask before every chain, before one into a custom step only, or never. */
  confirm: 'never' | 'custom' | 'always'
  /** Steps already chained in a row, with no prompt typed in between, and how many are allowed (0: no limit). */
  chained: number
  limit: number
  /** A chain into a skill this machine does not have: hold it back (`stop`), or step over it (`skip`). */
  missing: 'stop' | 'skip'
  /** Whether the skill a chain invokes is installed here. */
  installed: (skill: string) => boolean
  /** The payload centred on `skill`, for `skip` to read what follows the step it steps over. */
  payloadOf: (skill: string) => WorkflowPayload
}

/** How many missing steps in a row `skip` steps over before it gives up: a flow of missing skills is a broken flow. */
const MAX_SKIPS = 5

/** A chain turned back into a line: the reason it was held, then the suggestion it would have been. */
function heldLine(chain: WorkflowNextChain, reason: string, lang: WorkflowLanguage): WorkflowNextLine {
  const purpose = (chain.custom ? undefined : PURPOSES[lang][chain.skill]) ?? CUSTOM_PURPOSE[lang]
  return { kind: 'suggest', skill: chain.skill, command: chain.command, broken: null, text: `${reason}\n${fill(NEXT_STEP_LINE[lang], chain.command, purpose)}` }
}

/** A held chain's line, in place of a plain suggestion of the same command: the reason is what matters. */
function withHeld(lines: WorkflowNextLine[], held: WorkflowNextLine): WorkflowNextLine[] {
  return [...lines.filter((line) => line.command !== held.command), held]
}

/** Lines appended once each: a command already shown is not shown twice. */
function withLines(lines: WorkflowNextLine[], more: WorkflowNextLine[]): WorkflowNextLine[] {
  return more.reduce((all, line) => (line.command && all.some((one) => one.command === line.command) ? all : [...all, line]), lines)
}

/**
 * Apply `policy` to what `buildWorkflowNext` answered. In this order, since each one can
 * only make the next one moot: a chain into a skill that is not installed is held, or
 * stepped over to whatever follows that step on any outcome; one over the limit is held;
 * what is left is asked first when the user wants to be asked. A held chain becomes a
 * suggestion carrying why, so the user still sees where the flow was going.
 */
export function applyChainPolicy(next: WorkflowNext, policy: ChainPolicy, lang: WorkflowLanguage = 'en'): WorkflowNext {
  let { lines, chain } = next
  const skipped = new Set<string>()
  while (chain && !policy.installed(chain.skill)) {
    if (policy.missing === 'stop' || skipped.size >= MAX_SKIPS || skipped.has(chain.skill)) {
      lines = withHeld(lines, heldLine(chain, fill(CHAIN_MISSING[lang], chain.command), lang))
      chain = null
      break
    }
    skipped.add(chain.skill)
    const note: WorkflowNextLine = { kind: 'note', skill: null, command: null, broken: null, text: fill(CHAIN_SKIPPED[lang], chain.command) }
    const after = buildWorkflowNext(policy.payloadOf(chain.skill), '', { lang })
    lines = withLines([...lines, note], after.lines)
    chain = after.chain
  }
  if (chain && policy.limit > 0 && policy.chained >= policy.limit) {
    lines = withHeld(lines, heldLine(chain, fill(CHAIN_LIMIT[lang], chain.command).replace('{count}', String(policy.chained)), lang))
    chain = null
  }
  if (chain && (policy.confirm === 'always' || (policy.confirm === 'custom' && chain.custom))) chain = { ...chain, confirm: true }
  return { lines, chain }
}
