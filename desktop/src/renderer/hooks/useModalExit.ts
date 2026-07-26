import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnimationEvent } from 'react'

/**
 * An overlay unmounts the instant it is closed, which leaves no frame for a
 * closing animation to play in. This keeps it on screen until the animation has
 * finished, then lets it go.
 *
 * `open` is what the caller wants; `mounted` is what should actually render.
 * While they disagree the overlay is on its way out and `closing` is true — the
 * caller uses it to swap the entrance animation class for the exit one, and must
 * put `onExitAnimationEnd` on the element carrying that class.
 *
 * `onExited` fires once the overlay is really gone. It is what an overlay whose
 * parent renders it conditionally uses to finally report the close: the child
 * holds its own `open`, so the parent keeps it mounted until this fires.
 */
export function useModalExit(open: boolean, onExited?: () => void) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  // Read at call time, so a new callback identity never restarts the exit.
  const exited = useRef(onExited)
  exited.current = onExited

  const finish = useCallback(() => {
    setMounted(false)
    setClosing(false)
    exited.current?.()
  }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    setClosing(true)
    /**
     * `animationend` normally ends the wait. This is the backstop for the cases
     * where it never arrives — the element hidden mid-flight, the animation
     * never started, the class not applied. An overlay stuck on screen blocks
     * the whole app, so it always leaves, animated or not.
     */
    const timeout = window.setTimeout(finish, 500)
    return () => window.clearTimeout(timeout)
  }, [open, mounted, finish])

  const onExitAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      // Only this element's own animation counts: animation events bubble, and
      // anything animating inside the overlay would otherwise end the exit early.
      if (closing && e.target === e.currentTarget) finish()
    },
    [closing, finish],
  )

  return { mounted, closing, onExitAnimationEnd }
}
