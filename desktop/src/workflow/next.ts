import type { WorkflowPayload } from './payload'
import { isLinkIntoStart } from './overlay'
import type { NoteLink, SkilledLink, WorkflowLanguage } from './messages'
import {
  CHAINING, CHAIN_BROKEN, NEXT_STEP_LINE, NOTE_LINE,
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
      chain = { skill: link.skill, command, text: fill(CHAINING[lang], command) }
      continue
    }
    const broken = auto ? fill(CHAIN_BROKEN[lang], command).replace('{reason}', reason.trim() || FAILED) : null
    const text = suggestionText(link, lang)
    if (lines.some((line) => line.command === command)) continue
    lines.push({ kind: 'suggest', skill: link.skill, command, broken, text: broken ? `${broken}\n${text}` : text })
  }
  return { lines, chain }
}
