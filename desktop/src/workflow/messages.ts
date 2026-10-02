import type { WorkflowPayloadLink } from './payload'
import { isCustomNodeId } from './overlay'
import { nodeIdForSkill } from './defaultFlow'

/**
 * How the workflow words what follows a step: the messages, in each language a
 * repository may discuss in, and the helpers that fill them for a link. One copy, for
 * next.ts, which renders a step's next steps: two wordings of one hand-off, in the same
 * session, is exactly what the default flow is meant to rule out.
 *
 * Pure: no node or electron import.
 */

export type WorkflowLanguage = 'en' | 'fr'

/** A suggested next step. */
export const NEXT_STEP_LINE: Record<WorkflowLanguage, string> = {
  en: '   • Run {skill} to {purpose}',
  fr: '   • Lance {skill} pour {purpose}',
}

/** Said right before chaining into the next step. */
export const CHAINING: Record<WorkflowLanguage, string> = {
  en: "➡️  Continuing with {skill}, as this repository's workflow says.",
  fr: "➡️  J'enchaîne avec {skill}, comme le prévoit le workflow de ce repository.",
}

/** An auto link a failure stopped, both lines. */
export const CHAIN_BROKEN: Record<WorkflowLanguage, string> = {
  en: '⚠️  {skill} would normally follow on its own, but this step failed: {reason}\nRun it yourself once the problem is fixed.',
  fr: "⚠️  {skill} devait s'enchaîner tout seul, mais cette étape a échoué : {reason}\nLance-le toi-même une fois le problème réglé.",
}

/** One per `then` link under a suggested custom target. */
/** A chain the user's settings held back: its target is not installed on this machine. */
export const CHAIN_MISSING: Record<WorkflowLanguage, string> = {
  en: "⚠️  {skill} would normally follow on its own, but it is not installed on this machine.\nGet it, or run it yourself once it is installed.",
  fr: "⚠️  {skill} devait s'enchaîner tout seul, mais il n'est pas installé sur cette machine.\nRécupère-le, ou lance-le toi-même une fois installé.",
}

/** A chain whose target is not installed, stepped over as the user's settings say. */
export const CHAIN_SKIPPED: Record<WorkflowLanguage, string> = {
  en: "⏭️  {skill} is not installed on this machine: skipped, as your settings say.",
  fr: "⏭️  {skill} n'est pas installé sur cette machine : étape sautée, comme le prévoient tes réglages.",
}

/** A chain held back because enough steps already followed on their own in a row. */
export const CHAIN_LIMIT: Record<WorkflowLanguage, string> = {
  en: "⏸️  {skill} would normally follow on its own, but {count} steps already chained in a row.\nRun it yourself to carry on.",
  fr: "⏸️  {skill} devait s'enchaîner tout seul, mais {count} étapes se sont déjà enchaînées d'affilée.\nLance-le toi-même pour continuer.",
}

export const THEN_LINE: Record<WorkflowLanguage, string> = {
  en: '     ↳ then run {skill} to {purpose}',
  fr: '     ↳ puis lance {skill} pour {purpose}',
}

/** A `then` link taken only on one outcome of the custom target. */
export const THEN_ON_LINE: Record<WorkflowLanguage, string> = {
  en: '     ↳ on {outcome}, then run {skill} to {purpose}',
  fr: '     ↳ sur {outcome}, puis lance {skill} pour {purpose}',
}

/** A selected link that leads to an end note. */
export const NOTE_LINE: Record<WorkflowLanguage, string> = {
  en: '   📝 {note}',
  fr: '   📝 {note}',
}

/** A `then` link to an end note, under a suggested custom target. */
export const THEN_NOTE_LINE: Record<WorkflowLanguage, string> = {
  en: '     ↳ then 📝 {note}',
  fr: '     ↳ puis 📝 {note}',
}
export const THEN_NOTE_ON_LINE: Record<WorkflowLanguage, string> = {
  en: '     ↳ on {outcome}, 📝 {note}',
  fr: '     ↳ sur {outcome}, 📝 {note}',
}

/** How several outcomes of one link read in a `then` line: `a or b`. */
const OR: Record<WorkflowLanguage, string> = { en: ' or ', fr: ' ou ' }

/** What each built-in target is for, the `{purpose}` of a line. A target missing here is a custom step. */
export const PURPOSES: Record<WorkflowLanguage, Record<string, string>> = {
  en: {
    'magic-plan': 'turn an idea into tickets',
    'magic-start': 'start the ticket',
    'magic-commit': 'create a commit',
    'magic-pr': 'create a Pull Request',
    'magic-review': 'perform a code review',
    'magic-resolve': 'address the review comments',
    'magic-done': 'finalize the task once the PR is merged',
  },
  fr: {
    'magic-plan': 'transformer une idée en tickets',
    'magic-start': 'démarrer le ticket',
    'magic-commit': 'créer un commit',
    'magic-pr': 'créer une Pull Request',
    'magic-review': 'faire une revue de code',
    'magic-resolve': 'corriger les commentaires de review',
    'magic-done': 'finaliser la tâche une fois la PR mergée',
  },
}

/** The `{purpose}` of any other skill: a custom step. */
export const CUSTOM_PURPOSE: Record<WorkflowLanguage, string> = {
  en: "run this repository's custom step",
  fr: "lancer l'étape custom de ce repository",
}

export type SkilledLink = WorkflowPayloadLink & { skill: string }
export type NoteLink = WorkflowPayloadLink & { note: string }
/** What a context offers: a step to run, or an end note to show. */
export type ShownLink = SkilledLink | NoteLink

export function isNoteLink(link: ShownLink): link is NoteLink {
  return typeof link.note === 'string'
}

/**
 * `/magic:pr` for a built-in target, `/check-types` or `/plugin:foo` for any other.
 * Decided by the target NODE, never by the skill's name: nothing stops a repository from
 * naming its own skill `magic-foo`, and reading the prefix would hand the user
 * `/magic:foo`, a command for a skill that does not exist.
 */
export function commandFor(link: SkilledLink): string {
  return isCustomNodeId(link.to) ? `/${link.skill}` : `/magic:${nodeIdForSkill(link.skill)}`
}

/** The target's `{purpose}`, by the same node test as `commandFor`. */
export function purposeFor(link: SkilledLink, lang: WorkflowLanguage): string {
  return (isCustomNodeId(link.to) ? undefined : PURPOSES[lang][link.skill]) ?? CUSTOM_PURPOSE[lang]
}

export function hasSkill(link: WorkflowPayloadLink): link is SkilledLink {
  return typeof link.skill === 'string'
}

/** A link to a step with a skill, or to an end note: anything else cannot be offered. */
export function isShown(link: WorkflowPayloadLink): link is ShownLink {
  return typeof link.skill === 'string' || typeof link.note === 'string'
}

/**
 * A note is free text: a fence of its own inside it would close the one it is shown in.
 * A note of several lines keeps them, each further one under the first one's words.
 */
export function safeNote(note: string, indent = '      '): string {
  return note.replace(/`{3,}/g, "'''").replace(/\n/g, `\n${indent}`)
}

/**
 * The `then` lines under a suggested custom target, one per link, one level
 * deeper per nesting, all suggestions whatever their kind. A suggestion is run by hand:
 * typed, the target gets its own context from the prompt hook, but these lines are what
 * the user reads BEFORE typing it, and all an older app's session ever gets. The walk
 * is bounded by the payload itself, which stops at a custom step already on the path.
 */
export function thenLines(links: WorkflowPayloadLink[], lang: WorkflowLanguage, depth = 0): string[] {
  return grouped(links.filter(isShown)).flatMap(({ link, outcomes }) => {
    const on = outcomes === null ? null : outcomes.join(OR[lang])
    if (isNoteLink(link)) {
      const line = on === null ? THEN_NOTE_LINE[lang] : THEN_NOTE_ON_LINE[lang].replace('{outcome}', on)
      return ['  '.repeat(depth) + line.replace('{note}', safeNote(link.note))]
    }
    return [
      '  '.repeat(depth) + (on === null
        ? fill(THEN_LINE[lang], commandFor(link), purposeFor(link, lang))
        : fill(THEN_ON_LINE[lang], commandFor(link), purposeFor(link, lang)).replace('{outcome}', on)),
      ...thenLines(link.then, lang, depth + 1),
    ]
  })
}

/**
 * The payload's links, one per target and kind. Each outcome leading to a step is a link
 * of its own (overlay.ts), and one line per outcome would offer the same command twice:
 * those of one kind are put back together here, in the order they came. `outcomes` is
 * null when one of them applies whatever the outcome, which then covers them all.
 */
export function grouped<L extends WorkflowPayloadLink>(links: L[]): { link: L; outcomes: string[] | null }[] {
  const groups: { link: L; outcomes: string[] | null }[] = []
  for (const link of links) {
    const group = groups.find((g) => g.link.to === link.to && g.link.kind === link.kind)
    if (!group) groups.push({ link, outcomes: link.outcome === null ? null : [link.outcome] })
    else if (group.outcomes !== null) group.outcomes = link.outcome === null ? null : [...group.outcomes, link.outcome]
  }
  return groups
}

export function fill(template: string, skill: string, purpose = '{purpose}'): string {
  return template.replace('{skill}', skill).replace('{purpose}', purpose)
}
