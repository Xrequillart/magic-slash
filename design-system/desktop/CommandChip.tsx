import { CopyButton } from './CopyButton'
import { Icon } from './Icon'
import type { IconComponent } from './types'

/**
 * A COMMAND THE READER IS MEANT TO TYPE, on a plate that says so — `gh auth login`,
 * `brew install gh`.
 *
 * IT IS NOT A BUTTON AND MUST NOT LOOK LIKE ONE. That is the whole reason it is its own
 * component rather than a `Label` with a mono class on it: everything else this app puts
 * on a small rounded plate can be pressed, and a chip that reads as pressable while the
 * only thing it can do is be retyped in a terminal is the cruellest control on a page
 * about something being broken. So there is no hover on the plate, no pointer, nothing in
 * the tab order — and, where the command is worth carrying away, a `CopyButton` INSIDE it
 * that is unambiguously the pressable part.
 *
 * `bg-surface-sunken` AND NOT A BORDER. The four hand-built copies of this in the app
 * were all `border border-line rounded-md` with the text at `[11px]`, which is a box
 * drawn around a phrase; a recessed plate says "this is a different kind of text" without
 * an edge, and it is the same ground the diff and log views already read code on.
 *
 * THE FOUR COPIES it replaces: two on the Tasks page's GitHub panel, one in the setup
 * wizard's prerequisite row, one in the repository settings page. They disagreed about
 * their padding, their radius and whether the glyph came before the command.
 */

export interface CommandChipProps {
  /**
   * The command, verbatim. A STRING and never a node — a command with structure in it is
   * a code block, which is a different object with a different measure.
   */
  children: string
  /**
   * A mark before it, saying where the command goes. `Terminal` is the usual one; a chip
   * with no glyph is legitimate where the surrounding sentence already said.
   */
  icon?: IconComponent
  /**
   * A copy button at the end of the chip, and the two words it needs.
   *
   * Worth it for anything longer than two tokens, and worth NOT having for a chip that is
   * quicker to type than to reach for — the button is 24px of the plate either way.
   */
  copy?: { label: string; copiedLabel: string }
  /** Margins, width and alignment. Not the ground, the padding, the radius or the type. */
  className?: string
}

export function CommandChip({ children, icon, copy, className = '' }: CommandChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 min-w-0 rounded-lg bg-surface-sunken
        ${copy ? 'py-0.5 pl-2 pr-0.5' : 'px-2 py-1'} ${className}`.trim()}
    >
      {icon && <Icon glyph={icon} size="xs" tone="muted" className="flex-shrink-0" />}
      {/* `break-all` rather than `truncate`: half a command is not a command, so a chip
          too narrow for one wraps it rather than hiding the end of it behind an ellipsis
          nobody can expand. */}
      <code className="min-w-0 font-mono text-[11px] leading-5 text-text-secondary break-all">
        {children}
      </code>
      {copy && (
        <CopyButton
          value={children}
          label={copy.label}
          copiedLabel={copy.copiedLabel}
          size="sm"
        />
      )}
    </span>
  )
}
