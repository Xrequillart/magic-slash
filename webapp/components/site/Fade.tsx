'use client'

import { useEffect, useState } from 'react'
import { useLanguage, useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'

/**
 * The staggered entrance the header and the hero share.
 *
 * `docs/script.js` did this by walking `.hero-fade, .header-fade` and adding
 * `.visible` on a 150ms-apart `setTimeout` each. That cannot survive the port: the
 * header re-renders on every scroll to swap its `scrolled` / `past-hero` classes, and
 * React would overwrite a class the DOM was holding imperatively — the bar would flash
 * back to invisible the moment the page moved.
 *
 * So the stagger moves into CSS. One boolean flips every element at once, and each
 * one carries a `transition-delay` for its position in the sequence. Same result on
 * screen, but the class is now derived from state, so nothing can clobber it.
 *
 * The sequence REPLAYS on a language change, as it did originally — the copy is what
 * the animation is introducing, so new copy earns a new entrance.
 */

/** How far apart consecutive elements start, matching the original's timers. */
const STEP_MS = 150

export function useRevealed(): boolean {
  const lang = useLanguage()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    // Someone who asked for less motion gets the end state, immediately — no
    // transition to sit through, and no risk of content that never arrives.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    setShown(false)
    // A frame's gap so the browser paints the "before" state and actually
    // transitions, rather than coalescing both values into one style resolution.
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [lang])

  return shown
}

/**
 * One element in the entrance sequence. `order` is its place in the queue — the
 * header is 0, then each hero element in the order it is read.
 *
 * Pass `k` instead of children for copy that carries markup (the headline's `<br>`).
 * That renders the translation ON this element rather than inside a wrapper — the
 * original `<h1 class="hero-fade">` had no inner span, and adding one would change
 * what `h1`-scoped CSS applies to.
 */
export function Fade({
  order = 0,
  as: Tag = 'div',
  className,
  k,
  children,
}: {
  order?: number
  as?: 'div' | 'h1' | 'h2' | 'p' | 'span'
  className?: string
  /** A message key whose value carries inline markup. Mutually exclusive with children. */
  k?: MessageKey
  children?: React.ReactNode
}) {
  const shown = useRevealed()
  const { t } = useT()

  const props = {
    className: `hero-fade${shown ? ' visible' : ''}${className ? ` ${className}` : ''}`,
    style: { transitionDelay: `${order * STEP_MS}ms` },
  }

  // Same narrow-input argument as `RichText` — the only possible source is the
  // marketing catalogue, and the test suite pins which tags may appear in it.
  if (k) return <Tag {...props} dangerouslySetInnerHTML={{ __html: t(k) }} />

  return <Tag {...props}>{children}</Tag>
}
