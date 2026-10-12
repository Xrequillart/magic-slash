import { useEffect } from 'react'
import { useModalExit } from './useModalExit'

/**
 * What the app adds to a design-system dialog drawn whole (`ConfirmDialog`,
 * `OrganizationDialog`…): Escape, and the enter and exit animation. The same two
 * things `components/Modal` does around a body it is handed, for a dialog that
 * draws its own.
 *
 * `mounted` outlives `open` by the length of the exit animation: render the dialog
 * while it is true, and spread `motion` on it.
 */
export function useDialog(open: boolean, onClose: () => void) {
  const { mounted, closing, onExitAnimationEnd } = useModalExit(open)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Only the topmost dialog answers: see `components/Modal`.
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return {
    mounted,
    motion: {
      backdropClassName: closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop',
      className: closing ? 'animate-modal-content-out' : 'animate-modal-content',
      onAnimationEnd: onExitAnimationEnd,
    },
  }
}
