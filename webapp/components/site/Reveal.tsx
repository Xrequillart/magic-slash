'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/useLanguage'

/**
 * The staggered entrance the header and the hero share.
 *
 * `docs/script.js` did this by walking `.hero-fade, .header-fade` and adding
 * `.visible` on a 150ms-apart `setTimeout` each. That could not survive the port: the
 * header re-renders whenever its scroll state changes, and React would overwrite a
 * class the DOM was holding imperatively — the bar would flash back to invisible the
 * moment the page moved.
 *
 * So the stagger is CSS. Every element gets the same animation and carries an
 * `animation-delay` for its position in the sequence, which means the class is derived
 * from state and nothing can clobber it.
 *
 * This replaces `Fade.tsx`, and the difference is where the styling comes from: `Fade`
 * emitted `hero-fade` / `visible`, both defined only in `marketing.css`, and that
 * stylesheet no longer reaches these routes. `animate-reveal-*` says the same thing —
 * 12px up, 600ms, opacity and translate together — from `tailwind.config.ts`.
 *
 * `Fade`'s other half did NOT come along: it took an optional message `k` and rendered
 * it through `dangerouslySetInnerHTML`, which is `RichText`'s entire job. Wrap a
 * `<RichText>` in a `<Reveal>` instead of having two components that both know how to
 * render markup from the catalogue.
 *
 * ── THE ENTRANCE IS AN ENHANCEMENT, NOT THE PAINT PATH ─────────────────────────────
 *
 * Which is the one thing this file got wrong for a release. It used to hold a boolean
 * that started at `false` and render `opacity-0` plus a translate until an effect
 * flipped it, so `opacity-0` was what the SERVER emitted — for the header and for every
 * element of the hero: headline, subtitle, both CTAs. With JavaScript unavailable,
 * blocked, still downloading, or simply not yet hydrated, the first screen of the most
 * conversion-critical page on the site was blank, and only a client effect could ever
 * fill it in. (The stylesheet this replaced had the same flaw in `hero-fade` /
 * `visible`; it was survivable there because `marketing.css` was still painting the
 * page underneath it.)
 *
 * So THE RESTING STATE IS NOW THE ABSENCE OF EVERYTHING. An element in the entrance
 * wears no reveal class until the client has mounted and confirmed motion is wanted,
 * and the resting state is the browser's own default — opaque, untranslated. No
 * JavaScript, and the page simply stays that way, which is exactly what it should look
 * like. Nothing is read from the browser during render, so the first client render
 * agrees with the server's and hydration matches by construction: the same discipline
 * as `getServerSnapshot` in `lib/i18n/useLanguage.ts`, which always answers with the
 * default language for exactly this reason.
 *
 * WHY AN ANIMATION AND NOT THE TRANSITION THIS USED TO BE. A transition needs its
 * from-state to be in the markup and RESOLVED BY THE BROWSER before the to-state
 * lands. Once the server can only emit the resting state, driving that from React means
 * rendering a from-state and then a to-state and trusting the browser to resolve a
 * style between two commits — and React is free to batch them. Measured, in Chrome
 * against the production build: `setPhase('from')` followed by `setPhase('to')` one
 * frame later produced a SINGLE mutation straight to the to-state and not one
 * `transitionrun`; splitting them across two frames produced both mutations and still
 * not one `transitionrun`, and a screenshot burst through the first second showed the
 * hero fully opaque the whole way. The entrance was in the class list and absent from
 * the screen. An animation carries its from-state in its own keyframes, so ADDING THE
 * CLASS IS ENOUGH — there is no before-state to preserve and nothing to race.
 *
 * WHAT THIS COSTS, honestly: on a slow connection the resting hero is painted, and then
 * hydration hides it and plays it in. That blink is inherent to the shape — the content
 * is genuinely visible before the animation can own it — and it is the right trade: a
 * bounded flicker for people on bad connections, instead of a permanently blank first
 * screen for everyone without JavaScript. On a normal load hydration lands within a
 * frame or two of the first paint and it looks as it always did.
 */

/** How far apart consecutive elements start, matching the original's timers. */
const STEP_MS = 150

/**
 * The two spellings of one entrance, alternated on every replay.
 *
 * They are identical animations under different names because THE ONLY THING THAT
 * RESTARTS A CSS ANIMATION IS A CHANGE OF `animation-name` — see the note on the
 * keyframes in `tailwind.config.ts`. Dropping the class for one render and putting it
 * back would be the same batching coin-toss the header above describes, and it would
 * lose the same way.
 */
const REVEAL_ANIMATION = ['animate-reveal-a', 'animate-reveal-b'] as const

/**
 * The animation class for one element of the entrance, or `''` for nothing at all.
 * Exported because the header needs it without the wrapper element — it applies the
 * entrance to the bar itself.
 *
 * REPLAYS on a language change, as the original did: the copy is what the animation is
 * introducing, so new copy earns a new entrance. That is what `lang` is doing in the
 * dependency list, and it is the only reason this is not a one-shot effect. Each replay
 * bumps the counter, which swaps the animation for its twin and starts it over.
 */
export function useRevealClass(): string {
  const lang = useLanguage()
  // `null` is the resting state — what the server renders, what the first client
  // render agrees on, and where the entrance never having played and someone asking
  // for less motion are deliberately the same thing.
  const [played, setPlayed] = useState<number | null>(null)

  useEffect(() => {
    // Someone who asked for less motion keeps the resting state, which is already on
    // screen: no animation to sit through, and nothing that has to arrive for the page
    // to be readable.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPlayed(null)
      return
    }
    setPlayed((count) => (count === null ? 0 : count + 1))
  }, [lang])

  return played === null ? '' : REVEAL_ANIMATION[played % REVEAL_ANIMATION.length]
}

/**
 * One element in the entrance sequence. `order` is its place in the queue — the header
 * is 0, then each hero element in the order it is read.
 *
 * ALWAYS A `div`, and there is no `as` prop: the element this renders is a wrapper, and
 * the heading level comes from what is INSIDE it — an `h1` through `RichText`, a `p`, a
 * row of buttons. That is the split the header above describes, and it is what let
 * `Fade`'s markup-rendering half be deleted rather than ported.
 *
 * The delay stays an INLINE STYLE rather than becoming a `delay-*` utility: the
 * sequence is generated from an index, and Tailwind can only emit classes it can see in
 * the source, so `delay-[${order * 150}ms]` would compile to nothing at all. It sits
 * outside the animation shorthand on purpose — the shorthand resets every
 * `animation-*` longhand, so the delay has to arrive after it, and an inline style is
 * the one thing that always does.
 */
export function Reveal({
  order = 0,
  className,
  children,
}: {
  order?: number
  className?: string
  children?: React.ReactNode
}) {
  const reveal = useRevealClass()

  return (
    <div
      className={[reveal, className].filter(Boolean).join(' ')}
      style={{ animationDelay: `${order * STEP_MS}ms` }}
    >
      {children}
    </div>
  )
}
