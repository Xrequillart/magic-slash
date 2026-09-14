import { useEffect, useState, type AnimationEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * THE GROUND A DIALOG FLOATS ON, and nothing else.
 *
 * It is a FOUNDATION and it draws five things: a portal to the body, a dimmed ground over
 * the whole window, the stacking order that puts it above everything, the elevation under
 * whatever is handed to it, and the OPAQUE ground that thing sits on. It has no opinion
 * about what is inside or how wide it is — a `Card`, a wizard, a picture.
 *
 * THE OPAQUE GROUND IS NOT DECORATION. `surface` — what `Card` paints — is 6% white, and 6%
 * white over a 70% black scrim is a panel you cannot see. Every dialog needs a window colour
 * under its plate, so the dialog carries it rather than each caller remembering to.
 *
 * THE PORTAL IS THE POINT, and it is why this cannot be a plain `div`. A dialog rendered
 * where it sits in the tree inherits every `overflow-hidden`, `transform` and stacking
 * context above it: the agent sidebar it is opened from is a folded column with its own
 * `overflow-hidden`, which would clip a centred overlay to a 288px strip. Going to
 * `document.body` is the only way a fixed box means the WINDOW.
 *
 * WHICH IS ALSO WHAT `portalTo` IS FOR, on `SelectIcon`'s precedent. The app writes its
 * theme's `--c-*` variables on `:root`, so a dialog on the body inherits them and everything
 * resolves. A DRAWING of the app does not: the marketing site and `/design-system` put those
 * variables on one element, and a portal to the body lands OUTSIDE it — measured, the panel
 * came out fully transparent, because `bg-bg-secondary` had no variable to read. Pointing it
 * at the themed element is what makes the same component draw in both places.
 *
 * THE ANIMATION IS THE CALLER'S. The app's enter and exit keyframes live in its own
 * stylesheet and this folder cannot reach them; `backdropClassName` and `className` are
 * where they go, along with the width. Handed nothing, the dialog simply appears — which is
 * what the marketing site's drawings of it want anyway.
 *
 * WHAT IT DOES NOT DO, said plainly so nobody assumes otherwise: it does not trap focus, it
 * does not close on Escape, and it does not restore focus to whatever opened it. Those are
 * real obligations for a dialog and they are not here yet.
 */

export interface ModalProps {
  /**
   * Dismiss. Wired to the GROUND only — a click inside the panel never reaches it, which is
   * the one piece of behaviour this component does own.
   */
  onClose?: () => void
  /** The panel. A `Card`, usually. */
  children: ReactNode
  /** The ground: the caller's enter and exit animation. Not the dim, the fixing or the z. */
  backdropClassName?: string
  /** The panel's width, and the caller's animation. Not the ground, the radius or the z. */
  className?: string
  /** For a caller driving its own exit: see the app's `useModalExit`. */
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Names the dialog for a screen reader — the id of whatever heads the panel. */
  labelledBy?: string
  /**
   * Where to portal. `document.body` by default, which is right wherever the theme's
   * variables are on `:root` — the app. A drawing of the app has them on one element
   * instead, and has to point this at it. See the note above.
   */
  portalTo?: HTMLElement | null
}

export function Modal({
  onClose,
  children,
  backdropClassName = '',
  className = '',
  onAnimationEnd,
  labelledBy,
  portalTo,
}: ModalProps) {
  /**
   * MOUNTED BEFORE PORTALLED, because `document` does not exist while the marketing site is
   * pre-rendered on the server and `createPortal` would throw there. One state flip after
   * the first client render costs nothing and is what lets this folder be imported by a
   * Next page at all.
   */
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 ${backdropClassName}`.trim()}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onAnimationEnd={onAnimationEnd}
        onClick={(event) => event.stopPropagation()}
        className={`bg-bg-secondary rounded-xl shadow-xl ${className}`.trim()}
      >
        {children}
      </div>
    </div>,
    portalTo ?? document.body,
  )
}
