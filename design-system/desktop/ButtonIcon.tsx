import { Icon } from './Icon'
import type { IconComponent } from './types'

/**
 * A control that is a mark and nothing else.
 *
 * The app's `ACTION_CHIP`: a 24px square on the ticket badge's own ground, which is
 * how the agent sidebar's four repository actions came to read as one object with the
 * label above them instead of as an older generation of button. Written out, those
 * chips ran to some 270px — most of a 288px sidebar — so the mark carries the whole
 * meaning and the TOOLTIP carries the name.
 *
 * WHICH IS WHY `title` IS REQUIRED. An icon-only control with no name is a control
 * only its author can use; there is no label beside it to fall back on, and the same
 * string is the accessible name. This is the one component here that will not let you
 * skip it.
 *
 * NOT MIGRATED IN THE APP. It is here so the design system holds the shape and the
 * rule; the 284 buttons in the renderer are a separate job.
 */

/**
 * What the chip turns when the pointer is over it.
 *
 * A hover tint and nothing at rest: every one of these sits in a row of its siblings,
 * and a chip that announced its own colour before being touched would break the row
 * into four unrelated controls. `neutral` is the default and the common case; the
 * other two are the app's real exceptions — removing a repository, and opening one in
 * VS Code, whose blue is the editor's own and not a token.
 */
export type ButtonIconTone = 'neutral' | 'danger' | 'vscode'

const TONES: Record<ButtonIconTone, string> = {
  neutral: 'hover:bg-ink/10 hover:text-ink',
  danger: 'hover:bg-red/15 hover:text-red',
  // VS Code's own blue, spelled as an arbitrary value because it is a BRAND's colour:
  // it may not become a token, and Tailwind emits it from this literal.
  vscode: 'hover:bg-[#007ACC]/15 hover:text-[#007ACC]',
}

export interface ButtonIconProps {
  icon: IconComponent
  /**
   * The name of the action. REQUIRED: it is the tooltip, the accessible name, and the
   * only thing on screen that says what the mark means.
   */
  title: string
  onClick: () => void
  tone?: ButtonIconTone
  disabled?: boolean
  /** Margins and placement — `ml-auto`, a gap. Not the size, the ground or the hover. */
  className?: string
}

export function ButtonIcon({
  icon,
  title,
  onClick,
  tone = 'neutral',
  disabled = false,
  className = '',
}: ButtonIconProps) {
  return (
    <button
      // `type="button"` because a bare button inside a form submits it. 238 of the
      // app's 284 buttons do not say so; this one does, once, for all of them.
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`h-6 w-6 inline-flex items-center justify-center rounded-lg bg-ink/5 text-icon
        border-none cursor-pointer transition-colors flex-shrink-0 disabled:opacity-50
        disabled:cursor-not-allowed ${TONES[tone]} ${className}`}
    >
      <Icon glyph={icon} tone="inherit" />
    </button>
  )
}
