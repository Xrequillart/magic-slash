import { useEffect, useCallback, ReactNode } from 'react'
import { Modal as ModalGround, ModalHeader } from '@ds/desktop'
import { useModalExit } from '../hooks/useModalExit'
import { useT } from '../i18n'

/**
 * The app's DIALOG: a title, a body, and optionally a footer of buttons.
 *
 * IT IS NO LONGER THE GROUND IT FLOATS ON. The portal, the dimmed scrim, the stacking
 * order, the elevation and the opaque plate under the panel are `Modal` in the design
 * system, and this composes it. What is left here is everything that design system
 * deliberately does not do, and every line of it is the app's: the Escape key, the
 * exit animation, and the header/body/footer arrangement that makes a dialog a dialog
 * rather than a box in the middle of the window.
 *
 * WHAT MOVED AND WHAT DID NOT, because the two are easy to confuse when reading this
 * against the version it replaced. Moved: `createPortal`, `fixed inset-0`, `bg-black/70`,
 * the centring, `bg-bg-secondary`, the radius, the click on the ground that closes — and
 * now the HEADER, which is `ModalHeader` and is the same band the page overlay wears.
 * Stayed: the width, the height policy, and the animation classes, all passed down as
 * `className`, which is exactly the seam the design system left open for them.
 *
 * IT HAS ROOM NOW. The body and the footer sat at `px-5 pb-5` and the header at its own
 * `px-4`, which is two things at once: a dialog too tight for a form, and a title four
 * pixels left of the text under it. Both are fixed by one number — `px-6` here and
 * `gutter="wide"` on the header, which is the rung that exists so the two cannot
 * disagree again. The body also takes a little off the top, because the header's 48px
 * band ends flush against it and a field starting on that seam reads as part of the
 * chrome.
 *
 * THE BORDER IS GONE rather than moved. It was `border border-line` on the panel, and a
 * hairline around something already lifted off a dimmed background by a shadow is a
 * second answer to "where does this window end". The rule under the header went with it,
 * for the same reason: a dialog is one surface.
 *
 * AND SO IS THE `hero` SLOT, with the close button it carried in its own corner. It had
 * exactly one caller — the What's New dialog, which is `WhatsNewDialog` in the design
 * system now and owns its own band. A slot nobody fills is a shape this dialog promises
 * and never has to keep.
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
  /**
   * Give the body all the height that is left instead of letting the dialog grow to
   * its content and scroll.
   *
   * For the one kind of child that has to be told how tall it is rather than announce
   * it — a terminal. Sized in rows from its container, a terminal in an auto-height
   * dialog either has to name a height of its own (`h-[60vh]`, which then collides
   * with the dialog's own `max-h` and gets cut halfway through) or collapses. With
   * this, the dialog claims a fixed share of the window, the header and footer keep
   * their natural height, and everything left over goes to the body — which is what
   * `h-full` inside it can finally mean something against.
   */
  fillHeight?: boolean
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md', fillHeight = false }: ModalProps) {
  const t = useT()
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Stop here, or Escape closes two dialogs at once. This listener sits on
      // `document` and PageModal's sits on `window`, which is the next hop in
      // the bubble chain — so without this, dismissing a dialog opened from
      // inside Settings (every one in CloudAccountSection, the crop included)
      // also tears down the Settings sheet behind it. Only the topmost modal
      // answers Escape.
      //
      // It stays HERE and not in the design system's `Modal`, which says in as many
      // words that it does not close on Escape: a rule about which of several open
      // dialogs answers a key is a fact about this app's layering, not about the
      // shape of a dialog.
      e.stopPropagation()
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Outlives `isOpen` by the length of the exit animation. Every way a caller
  // closes this dialog goes through that prop — the buttons here, but also the
  // parent closing it after a successful save — so all of them animate out.
  const { mounted, closing, onExitAnimationEnd } = useModalExit(isOpen)

  if (!mounted) return null

  return (
    <ModalGround
      onClose={onClose}
      // The app's keyframes, which is the one thing the design system cannot supply:
      // they live in `index.css` and that folder cannot reach them. Ground and panel
      // animate separately, hence two classes rather than one.
      backdropClassName={closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}
      className={`w-full ${maxWidth} ${
        fillHeight ? 'h-[85vh] flex flex-col' : 'max-h-[90vh] overflow-y-auto'
      } ${closing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
      onAnimationEnd={onExitAnimationEnd}
    >
      {/* THE SAME BAND THE PAGE OVERLAY WEARS. It was a bare `<h3>` and a hand-rolled
          close button at a padding of its own; there is one header in this app now.
          No `fullScreen`, so no expand button is drawn — there is nothing in "are you
          sure?" to expand into. */}
      <ModalHeader title={title} onClose={onClose} closeTitle={t('modal.closeEsc')} gutter="wide" />

      {/* Body */}
      {/* `min-h-0` is what makes `flex-1` a real height here rather than a floor: a
          flex child defaults to its content's minimum size, and without it a terminal
          asking for 100% would push the footer off the bottom instead of fitting. */}
      <div className={`px-6 pb-6 pt-1 text-sm text-text-secondary ${fillHeight ? 'flex-1 min-h-0' : ''}`}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="flex-shrink-0 flex gap-2 justify-end px-6 pb-6">
          {footer}
        </div>
      )}
    </ModalGround>
  )
}
