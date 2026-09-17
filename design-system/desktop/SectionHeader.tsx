import { Button } from './Button'
import { Icon } from './Icon'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * WHAT THE THING UNDER IT IS — a mark, a name, optionally how many, and what you can do
 * to the lot.
 *
 * ONE HEADING FOR THE WHOLE APP, which is the reason this left the app at all. The same
 * fourteen pixels of secondary text beside a sixteen-pixel glyph were being drawn from
 * `pages/Config/SectionHeader.tsx` by twelve settings surfaces, AND spelled out by hand
 * in the Plans page, the Tasks board and four places in Skills. Three of those copies
 * had already drifted: the repository list wore an 11px uppercase variant nobody else
 * used, and the counts beside two of them disagreed about their own opacity. A heading
 * repeated in eighteen places is a heading nobody can keep correct.
 *
 * THE ROW IS PINNED TO `h-5` — the natural height of the bare title — so a section
 * carrying a taller control lines up with one that does not. Without it a button
 * stretches the row and pushes that tab's content about ten pixels lower than its
 * neighbours. The control simply overflows the line, centred.
 *
 * ── THE COUNT RIDES WITH THE TITLE, THE ACTIONS DO NOT ────────────────────────────
 *
 * Both are extras on one row, and they answer to different sides. An action is a CONTROL
 * and belongs at the far edge, where the hand goes. A count is part of what the heading
 * SAYS — "Personal, three of them" is one phrase — and putting the figure at the other
 * end of the row makes the eye travel the width of the page to finish reading a label.
 *
 * Zero is drawn like any other number: an empty section is a fact, and whatever sits
 * under the heading is already saying so in words.
 *
 * ── THE ACTIONS ARRIVE AS DATA ────────────────────────────────────────────────────
 *
 * `Banner` made this move first and `AccountCard` followed; the argument has not changed.
 * This component's predecessor took `action: ReactNode`, and the two call sites that used
 * it passed hand-built buttons with two different spellings of the same control: one was
 * `text-xs text-text-secondary/60` with no plate at all, the other `px-3 py-1.5 bg-surface
 * border border-line-strong rounded-lg`. Neither was wrong on its own, and together they
 * were two answers to "what does a button beside a heading look like".
 *
 * A list of `{ label, icon, onClick }` lets this draw every one of them at one rung, in
 * one tone. `sm` — 28px — because the heading is a label and not a section of its own.
 */

/** One control at the far edge of the row. */
export interface SectionHeaderAction {
  /** Stable across renders — 'create-org', 'recheck'. Not an index. */
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

export interface SectionHeaderProps {
  /** The mark in the gutter. */
  icon: IconComponent
  /** What the section is. Already translated. */
  title: string
  /**
   * How many things are under it, drawn quiet beside the title. Omit where the section
   * is not a list — a count of one setting is noise.
   */
  count?: number
  /** At the far edge. Empty draws nothing. */
  actions?: SectionHeaderAction[]
  /**
   * `none` drops the bottom margin, for a parent that already spaces its children with a
   * flex `gap` — which is the arrangement the Plans page and the repository list use, and
   * the better one: a heading that spaces itself from its list with a margin only one of
   * the two knows about is a heading you have to remember to adjust twice.
   */
  spacing?: 'default' | 'none'
  /** Margins and width. Not the height, the gutter or the type. */
  className?: string
}

export function SectionHeader({
  icon,
  title,
  count,
  actions = [],
  spacing = 'default',
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`flex h-5 items-center justify-between ${spacing === 'none' ? '' : 'mb-4'} ${className}`.trim()}
    >
      {/* THE COLOUR IS ON THE GROUP AND `inherit` ON BOTH CHILDREN, which is how every
          copy of this heading already drew it and the only spelling that keeps the mark
          and the word at one weight. `Icon` has no `secondary` tone of its own — it
          offers `default`, `muted` and `inherit` — so a mark that took its own colour
          here would be a bright glyph beside a quiet label. */}
      <div className="flex min-w-0 items-center gap-2 text-text-secondary">
        {/* `md` — 16px, the size every copy already used. */}
        <Icon glyph={icon} size="md" tone="inherit" className="flex-shrink-0" />
        <Text size="sm" tone="inherit" className="truncate">
          {title}
        </Text>
        {count !== undefined && (
          <Text size="sm" tone="inherit" className="flex-shrink-0 opacity-40">
            {String(count)}
          </Text>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-shrink-0 items-center gap-2">
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
