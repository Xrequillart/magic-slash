/**
 * The colours a pull request speaks in, as a mark and as a badge.
 *
 * A MODULE THAT IMPORTS NOTHING, for `progressTones.ts`'s and `avatarSizes.ts`'s
 * reason: the root Vitest suite runs on the ROOT `node_modules`, where React does not
 * exist, so anything reaching a `.tsx` is unreachable from it. Keep it that way — the
 * rule is not "prefer pure modules", it is "anything a test can reach imports nothing".
 *
 * THREE TABLES AND NOT ONE, because a colour does three different jobs on this card. A
 * check's state is a MARK: a glyph and a word, coloured, on the card's own ground. A
 * PR's state is a BADGE: a word on a tinted capsule. The same green means both, and a
 * single table would have forced every call site to remember which half of its string
 * to use. The third is neither — it is the colour as a VALUE, for `Label`, which takes
 * one rather than a class.
 *
 * THE NAMES ARE THE COLOURS, which `Status` settled for this folder: the alternative
 * is a semantic scale — `success`, `danger`, `pending` — and a pull request has more
 * states than any such scale has rungs. Purple is not a severity, it is what GitHub
 * has meant by "merged" for a decade, and `merged: 'success'` would be a worse lie
 * than `merged: 'purple'` is a leak.
 */
export type PRTone = 'neutral' | 'muted' | 'green' | 'red' | 'blue' | 'yellow' | 'purple'

export const PR_TONES: readonly PRTone[] = [
  'neutral',
  'muted',
  'green',
  'red',
  'blue',
  'yellow',
  'purple',
]

/**
 * The mark: a glyph, or a label beside one.
 *
 * `muted` is the one rung that is not simply a colour — it is `neutral` stepped back,
 * for a line that has been dealt with. A ticked checklist row wears it so the eye
 * lands on what is still open rather than on what is already fine.
 */
export const PR_MARK: Record<PRTone, string> = {
  neutral: 'text-text-secondary',
  muted: 'text-text-secondary/60',
  green: 'text-green',
  red: 'text-red',
  blue: 'text-blue',
  yellow: 'text-yellow',
  purple: 'text-purple',
}

/**
 * The badge: a word on a tinted capsule.
 *
 * A 10% tint of the mark's own colour, so a badge and the glyph beside it read as one
 * statement. `neutral` is the exception and has to be: there is no `text-secondary/10`
 * worth painting, so a draft takes the surface it would have sat on anyway.
 */
export const PR_BADGE: Record<PRTone, string> = {
  neutral: 'bg-surface-strong text-text-secondary',
  muted: 'bg-surface-strong text-text-secondary/70',
  green: 'bg-green/10 text-green',
  red: 'bg-red/10 text-red',
  blue: 'bg-blue/10 text-blue',
  yellow: 'bg-yellow/10 text-yellow',
  purple: 'bg-purple/10 text-purple',
}

/**
 * The colour itself, as a CSS value rather than as a class.
 *
 * A THIRD TABLE ONLY BECAUSE `Label` TAKES A VALUE. Its `color` prop paints the plate
 * and the mark from one colour — the way a repository wears its own hue — and a class
 * cannot be handed to it. `rgb(var(--c-green))` and not a hex, so a badge built this way
 * still follows the theme the two tables above follow.
 *
 * EACH CARRIES THE FALLBACK the Tailwind config carries, and it is not decoration: an
 * undefined variable makes the whole `color-mix` invalid, so a page that had not posted
 * the theme would draw a label with no plate at all rather than a slightly wrong green.
 *
 * `neutral` AND `muted` ARE ABSENT, and that is the point rather than an omission:
 * they are this app's own greys, which `Label`'s neutral ground already paints. A caller
 * with no entry here asks for no colour and gets that ground.
 */
export const PR_COLOR: Partial<Record<PRTone, string>> = {
  green: 'rgb(var(--c-green, 34 197 94))',
  red: 'rgb(var(--c-red, 239 68 68))',
  blue: 'rgb(var(--c-blue, 59 130 246))',
  yellow: 'rgb(var(--c-yellow, 234 179 8))',
  purple: 'rgb(var(--c-purple, 168 85 247))',
}
