import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from './icons'
import { ButtonIcon, type ButtonIconSize } from './ButtonIcon'

/**
 * A STRING ONTO THE CLIPBOARD, and two seconds of tick to say it got there.
 *
 * Icon-only, always, for the same reason each time it appears: it sits immediately
 * left of a worded "Open on GitHub", and a second set of words there takes its width
 * from the one element that has none to give — a ticket's title on a card, the
 * condensed title in a pinned bar, the author and path on a review comment. The
 * tooltip is the label.
 *
 * ITS OWN COMPONENT rather than state on the caller, so the two seconds of `Check` for
 * ONE link do not re-render every row beside it.
 *
 * WHY THE CONFIRMATION IS HERE AND NOT AT THE CALL SITE. Three surfaces in two areas
 * of the app copy a link; a copy offered on a board card, on that ticket's own page
 * and on a comment in the agent sidebar must not confirm differently, or hold the
 * confirmation for a different length of time. That is a design decision, which is
 * what makes it this folder's rather than the app's — and the reason the component
 * moved here instead of being rebuilt on `ButtonIcon` where it stood.
 */

/**
 * How long the tick shows before the button goes back to offering the copy.
 *
 * Long enough to be read, short enough that a row left on screen does not keep
 * claiming a copy that has scrolled out of anyone's memory.
 */
const COPIED_MS = 2000

export interface CopyButtonProps {
  /** What goes on the clipboard. A URL, usually. */
  value: string
  /** The tooltip and the accessible name at rest. Already translated. */
  label: string
  /** What it says for the two seconds after. Already translated. */
  copiedLabel: string
  /**
   * `ButtonIcon`'s ladder, and it matters more here than on most controls: this sits
   * beside buttons of different heights on three different surfaces, and a control
   * that ignores its neighbour's height is what reads as broken.
   */
  size?: ButtonIconSize
  /** Margins and placement. Not the ground, the height or the radius. */
  className?: string
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  size = 'md',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  // Held so it can be cancelled: a list re-reads its tracker on a reload and on a
  // repository being untracked, either of which unmounts this button inside the window
  // and would otherwise leave a `setCopied` scheduled against a component that is gone.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <ButtonIcon
      icon={copied ? Check : Copy}
      // `success` IS THE WHOLE OF THE CONFIRMATION'S COLOUR — the tone this folder
      // wrote for "it just worked", and the note there says in as many words that it is
      // a state a caller swaps to for a second rather than a kind of button.
      tone={copied ? 'success' : 'ghost'}
      title={copied ? copiedLabel : label}
      size={size}
      className={className}
      onClick={() => {
        // Confirmed only once the write has RESOLVED: the swap to `Check` asserts the
        // value is on the clipboard, and a refused write must not claim it. A failure
        // leaves the button offering the copy, which is the truth.
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          // Restarted, not stacked: a second press inside the window would let the
          // first timer clear the confirmation early.
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), COPIED_MS)
        }, () => {})
      }}
    />
  )
}
