import { Button } from './Button'
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
  /** What ends the emptiness. Empty draws the sentence alone. */
  actions?: EmptyStateAction[]
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function EmptyState({ children, actions = [], className = '' }: EmptyStateProps) {
  return (
    <div className={`w-full rounded-xl bg-surface-subtle px-4 py-8 ${className}`.trim()}>
      {/* CENTRED, which is the whole of how this reads as an absence rather than as the
          first row of a list that failed to load — `EmptyLine`'s rule, and the reason
          the buttons are centred under it rather than pushed to an edge. */}
      <Text size="sm" tone="secondary" className="block text-center opacity-50">
        {children}
      </Text>
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
