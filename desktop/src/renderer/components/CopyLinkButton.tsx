import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * How long the confirmation shows before the button goes back to offering the copy.
 * The same two seconds the review-comments bar uses — long enough to be read, short
 * enough that a row left on screen does not keep claiming a copy that has scrolled
 * out of anyone's memory.
 */
const COPIED_MS = 2000

/**
 * A URL, onto the clipboard.
 *
 * Icon-only everywhere it appears, for the same reason each time: it sits
 * immediately left of a worded "Open on GitHub", and a second set of words there
 * takes its width from the one element that has none to give — the issue's title on
 * a list row, the condensed title in the detail page's bar, the author and path on a
 * PR comment. The hover text is the label.
 *
 * Lives here rather than beside its first caller because it now has three, in two
 * different areas of the app: a copy offered on a Tasks row, on that issue's own
 * page, and on a review comment in the agent sidebar must not confirm differently,
 * or hold the confirmation for a different length of time. `components/` is also the
 * only direction that works — nothing under it may import from `pages/`.
 *
 * Its own component rather than state on the caller, so the two seconds of `Check`
 * for ONE link do not re-render every other row beside it.
 */
export function CopyLinkButton({
  url,
  copyLabel,
  copiedLabel,
  className,
  iconClassName = 'w-3.5 h-3.5',
}: {
  url: string
  copyLabel: string
  copiedLabel: string
  /**
   * The button's box. Supplied by the caller for the reason `TaskErrorLines` takes
   * its own: the surfaces sit next to buttons of DIFFERENT sizes — a list row's
   * hand-rolled pill, the detail bar's `BTN`, a comment's dashed `[10px]` pill — and
   * a control that ignores its neighbour's height is what reads as broken.
   */
  className: string
  /**
   * The glyph's size, for the same reason and no other: the comment pill sets its
   * neighbouring icons at `w-3`, and a copy icon two pixels larger than the GitHub
   * one beside it is visible at that scale. What must NOT vary is what this still
   * owns — which glyph, that the write is awaited, and how long `Check` holds.
   */
  iconClassName?: string
}) {
  const [copied, setCopied] = useState(false)

  // Held so it can be cancelled: the list re-reads GitHub on a reload and on a repo
  // being untracked, either of which unmounts this row inside the window and would
  // otherwise leave a `setCopied` scheduled against a component that is gone.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <button
      onClick={(e) => {
        // On a list row, the surface underneath opens the issue's page. Without
        // this, one click would copy AND navigate away from the confirmation.
        // Harmless where nothing sits behind it.
        e.stopPropagation()
        // Confirmed only once the write has resolved: the swap to `Check` asserts
        // the link IS on the clipboard, and a refused write must not claim it.
        // Failure leaves the button offering the copy, which is the truth.
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true)
          // Restarted, not stacked: a second press inside the window would let the
          // first timer clear the confirmation early.
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), COPIED_MS)
        }, () => {})
      }}
      title={copied ? copiedLabel : copyLabel}
      className={className}
    >
      {copied ? (
        <Check className={`${iconClassName} text-green flex-shrink-0`} />
      ) : (
        <Copy className={`${iconClassName} flex-shrink-0`} />
      )}
    </button>
  )
}
