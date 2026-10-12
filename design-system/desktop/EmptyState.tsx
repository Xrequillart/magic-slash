import { Button } from './Button'
import { Icon } from './Icon'
import { Loader } from './Loader'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * A SECTION WITH NOTHING IN IT YET, and the ways to put something there.
 *
 * `EmptyLine` IS THE OTHER ONE AND THEY ARE NOT THE SAME SHAPE. That is a centred
 * sentence where a card's rows would be — a fact, with nothing to do about it, because
 * the thing it reports on is read off disk and will fill itself in. This is a section of
 * a page whose content the reader CREATES, so the emptiness comes with the two or three
 * verbs that end it. A sentence with no verbs is `EmptyLine`; a plate with buttons on it
 * is this.
 *
 * NO DASHED OUTLINE. It had one — `border border-dashed border-border/50` — which is the
 * convention for a drop target, and this is not one: nothing can be dragged into it, and
 * an edge that promises a gesture the surface does not accept is worse than no edge. A
 * quiet plate says "a thing would go here" without promising how.
 */

export interface EmptyStateAction {
  /** Stable across renders — 'create', 'import'. Not an index. */
  id: string
  /** The word on it, already translated. */
  label: string
  onClick: () => void
  /** A mark before the word. Optional. */
  icon?: IconComponent
  /** The action is in flight. Spins the mark and blocks a second press. */
  busy?: boolean
  disabled?: boolean
}

export interface EmptyStateProps {
  /**
   * What is missing, in one sentence, already translated.
   *
   * IT NAMES THE ABSENCE AND NOT THE CURE — "no custom skills yet", not "click create
   * below". The buttons under it say what can be done, and a sentence that also says it
   * is the same instruction twice, out of date the moment a third verb is added.
   */
  children: string
  /**
   * A mark above the sentence, saying what KIND of absence this is.
   *
   * It earns its place only where a page has more than one of these and they mean
   * different things. The Tasks board is the case it was added for: a search that matched
   * nothing and a repository nobody has configured are two states one under the other in
   * the same code, they read almost identically in words, and only one of them is the
   * reader's own doing. A magnifying glass with a line through it settles that before the
   * sentence is read.
   *
   * `2xl` — 28px, the rung that sits past a line of text. An absence is scanned before it
   * is read, and a 16px glyph over a centred sentence reads as a bullet.
   */
  icon?: IconComponent
  /**
   * The content is on its way: a spinner takes the mark's place, and the sentence says
   * what is being read. For a section that stays on screen while its content is swapped —
   * the Tasks board between two repositories — rather than a page's first paint.
   */
  busy?: boolean
  /**
   * ONE QUIET LINE UNDER THE SENTENCE, for the absence whose cure is NOT a button.
   *
   * It looks like it contradicts `children`'s rule and it is its complement: the rule
   * says the sentence must not spell out an instruction the buttons already carry. Where
   * there are no buttons — because the fix is a setting on another page, and a different
   * one per repository — the instruction has nowhere else to go, and an absence that
   * cannot say how to end it is an absence the reader can only stare at.
   *
   * A STRING, translated, and one sentence. Anything with structure is a `NoticeCard`.
   */
  hint?: string
  /** What ends the emptiness. Empty draws the sentence alone. */
  actions?: EmptyStateAction[]
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function EmptyState({ children, icon, busy = false, hint, actions = [], className = '' }: EmptyStateProps) {
  return (
    <div className={`w-full rounded-xl bg-surface-subtle px-4 py-8 ${className}`.trim()}>
      {/* CENTRED, which is the whole of how this reads as an absence rather than as the
          first row of a list that failed to load — `EmptyLine`'s rule, and the reason
          the buttons are centred under it rather than pushed to an edge. */}
      {busy ? (
        <Loader variant="spin" size="2xl" tone="accent" className="mx-auto mb-3 block" />
      ) : icon && (
        <Icon glyph={icon} size="2xl" tone="muted" className="mx-auto mb-3 block" />
      )}
      <Text size="sm" tone="secondary" className="block text-center opacity-50">
        {children}
      </Text>
      {hint && (
        // Narrower than the plate on purpose. A sentence explaining where a setting lives
        // is the longest thing on this card, and set to the full width of a modal it
        // becomes one line the eye has to travel rather than two it can read.
        <Text tone="secondary" className="mx-auto mt-1.5 block max-w-sm text-center opacity-40">
          {hint}
        </Text>
      )}
      {actions.length > 0 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              tone="neutral"
              icon={action.icon}
              busy={action.busy}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
