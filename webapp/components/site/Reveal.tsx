'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n/useLanguage'
import { isStill } from '@/lib/stillness'

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
 * 12px up, 400ms, opacity and translate together — from `tailwind.config.ts`.
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
 *
 * ── THE ENTRANCE PLAYS ON ARRIVAL, NOT ON LOAD ─────────────────────────────────────
 *
 * `Reveal` used to play every element's entrance the moment the page mounted, whatever
 * its position: a band five screens down had risen into place long before anyone
 * scrolled to it, and arrived looking like it had always been there. The product owner
 * asked for the opposite ("dès qu'on arrive dans une section les blocs s'affichent un
 * par un, du bas vers le haut"), on the homepage and on `/desktop` — and since every
 * band on both pages is built from this component, it is done here once.
 *
 * So an element now WAITS. On mount it measures itself: in the viewport already (the
 * header, the hero) and it plays at once, as before; below the fold and it is held at
 * `opacity-0` and handed to an `IntersectionObserver`, which plays it the first time it
 * crosses into view. `order` still staggers: the elements of one band cross the fold
 * together and start 80ms apart, bottom of the band last, which is the "one by one"
 * asked for. The keyframes are the same 12px rise, so an element arrives from below.
 *
 * `useLayoutEffect` AND NOT `useEffect` for the measurement, and it is the difference
 * between a page that works and one that blinks: a layout effect runs before the
 * browser paints the committed render, so an element that is below the fold is at
 * `opacity-0` before it is ever painted, and one that is in view has its animation class
 * before its first frame. A passive effect would paint the resting state first and hide
 * it a frame later — the blink the section above describes, on every element instead of
 * only on a slow connection.
 *
 * THE SERVER STILL RENDERS THE RESTING STATE, and so does the first client render, for
 * the reason the section above sets out: `waiting` is a state only the layout effect
 * ever sets, so nothing is hidden until the client has measured it. Someone who asked for
 * less motion never leaves the resting state — nothing is hidden, nothing has to arrive.
 * A language change replays the entrance of what is on screen, as it always did; what
 * is still below the fold is simply re-armed.
 *
 * `-8%` OF ROOT MARGIN at the bottom: an element plays once its top is a little way into
 * the viewport rather than the instant a pixel of it appears, so the rise is seen and
 * not merely started at the screen's edge.
 */

/**
 * How far apart consecutive elements start. It was 150ms, the original's timers, and
 * came down once the entrance played on arrival rather than on load: a band of six
 * blocks at 150ms apart took nearly a second to finish rising after the reader had
 * already scrolled to it, and the product owner called it ("trop lent à venir"). 80ms
 * still reads as one by one; the rise itself came down with it (see the `reveal-*`
 * durations in `tailwind.config.ts`).
 */
const STEP_MS = 80

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
 * entrance to the bar itself. The header is always in view, so it plays on load; `Reveal`
 * below plays on arrival instead and keeps its own state.
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
    if (isStill()) {
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
/**
 * Where one element of the entrance stands: at rest (the server's state, and the reduced
 * motion one), waiting below the fold, or playing — the number counting the replays, so
 * each swaps the animation for its twin (see `REVEAL_ANIMATION`).
 */
type RevealState = 'rest' | 'waiting' | number

export function Reveal({
  order = 0,
  className,
  children,
}: {
  order?: number
  className?: string
  children?: React.ReactNode
}) {
  const lang = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  const plays = useRef(0)
  const [state, setState] = useState<RevealState>('rest')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (isStill()) {
      setState('rest')
      return
    }
    const play = () => {
      plays.current += 1
      setState(plays.current)
    }
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      play()
      return
    }
    setState('waiting')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          play()
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [lang])

  const reveal =
    state === 'rest' ? '' : state === 'waiting' ? 'opacity-0' : REVEAL_ANIMATION[state % REVEAL_ANIMATION.length]

  return (
    <div
      ref={ref}
      className={[reveal, className].filter(Boolean).join(' ')}
      style={{ animationDelay: `${order * STEP_MS}ms` }}
    >
      {children}
    </div>
  )
}
