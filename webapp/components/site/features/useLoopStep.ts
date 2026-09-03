'use client'

import { useEffect, useState } from 'react'

/**
 * The step a looping storyboard is on: the index of the last entry of `at` (milliseconds
 * into a loop of `loopMs`) that the clock has passed, or -1 before the first.
 *
 * ONE STATE CHANGE PER STEP, not one per frame. The card drawings on `/features` are
 * React trees with a dozen leaves; re-rendering them sixty times a second for a story
 * that has six beats would be the wrong cost for the wrong reason. The interval only
 * looks at the clock; `setStep` fires when the beat changes.
 *
 * Under `prefers-reduced-motion` the clock never starts and the story rests on its LAST
 * step — the state with the most in it, which is what the still should show.
 */
export function useLoopStep(at: readonly number[], loopMs: number): number {
  const [step, setStep] = useState(at.length - 1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = performance.now()
    let shown = -2
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - start) % loopMs
      let current = -1
      for (let i = 0; i < at.length; i++) if (elapsed >= at[i]) current = i
      if (current !== shown) {
        shown = current
        setStep(current)
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [at, loopMs])

  return step
}
