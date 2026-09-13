import { forwardRef } from 'react'
import { Icon, type IconSize } from './Icon'
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
 * MIGRATED. The app's `ACTION_CHIP` had eight square call sites — the repository
 * card's four, the usage card's two, the sidebar's new-agent button and the agent
 * sort — and all eight are this component now. `ACTION_CHIP` itself stays, because
 * three of its nineteen uses are not icon-only: a branch name, a refresh with its
 * word beside it, and the scripts menu with its chevron. Those are chips, not
 * buttons that are only a mark, and folding them in here would mean a `children`
 * slot — which is how a component like this one stops being about one thing.
 *
 * `BTN_ICON` in the app's `theme/controls.ts` is a SECOND icon-button language —
 * 28px, bordered, on `bg-surface` — and it is still out there in Settings. It is not
 * a size of this one: it has a border and a different ground, so folding it in means
 * a variant, and which of the two languages the app should keep is a decision for a
 * person rather than for a migration.
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
export type ButtonIconTone = 'neutral' | 'danger' | 'vscode' | 'ghost' | 'success'

/**
 * Three on the shared ladder — `Label`'s and `Status`'s 24 / 28 / 32 — and one below
 * them for a button that lives inside something else.
 *
 * A control that is only a mark sits in rows with the badges that name things: the
 * repository card is a `Label` and four of these on one line. Giving it a scale of
 * its own would mean two ladders to keep in step, and the first row where they
 * disagreed would be the one nobody noticed.
 *
 * `sm` IS THE DEFAULT and is every one of the app's eight — 24px, `rounded-lg`, a
 * 14px mark. The other two are here for rows of 14px type, where a 24px square reads
 * as a control that shrank rather than as one that fits.
 */
export type ButtonIconSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZES: Record<ButtonIconSize, { box: string; icon: IconSize }> = {
  /**
   * THE ONE RUNG THAT IS NOT ON THE SHARED LADDER, and it is here because a button
   * nested inside a chip is not measured against the badges beside it — it is
   * measured against the chip it sits in. The branch chip is 32px with this in it;
   * at `sm` the control would be 24 of those 32 and all but fill the row.
   *
   * Reach for it ONLY inside something else. A 20px target on its own is small, and
   * the three rungs below are what a control standing in a row should be.
   */
  xs: { box: 'h-5 w-5 rounded-lg', icon: 'xs' },
  sm: { box: 'h-6 w-6 rounded-lg', icon: 'sm' },
  md: { box: 'h-7 w-7 rounded-lg', icon: 'sm' },
  lg: { box: 'h-8 w-8 rounded-xl', icon: 'md' },
}

/**
 * THE GROUND AND THE MARK'S COLOUR ARE BOTH IN HERE, and neither is on the button.
 *
 * The ground moved in so that `ghost` can have none. The mark's colour moved in after
 * a measurement: with `text-icon` spelled on the button, a caller passing `text-green`
 * in `className` to show a copy had landed got a GREY tick — two colour classes on one
 * element, and which of them wins is decided by the order Tailwind emitted them in,
 * not by the order they are written. `Text` states that rule for its own three props;
 * this is the same rule, learned the same way. Exactly one colour class per tone now,
 * so there is nothing to race.
 */
const TONES: Record<ButtonIconTone, string> = {
  neutral: 'bg-ink/5 text-icon hover:bg-ink/10 hover:text-ink',
  danger: 'bg-ink/5 text-icon hover:bg-red/15 hover:text-red',
  // VS Code's own blue, spelled as an arbitrary value because it is a BRAND's colour:
  // it may not become a token, and Tailwind emits it from this literal.
  vscode: 'bg-ink/5 text-icon hover:bg-[#007ACC]/15 hover:text-[#007ACC]',
  /**
   * NO PLATE AT REST — for a control nested inside something that already has one.
   *
   * The branch chip is the case it was written for: `bg-ink/5` over `bg-ink/5`
   * composes to about 10%, so a neutral button in there is a square that is visible
   * at all times inside a chip that is already a plate. `Label` states the rule for
   * its avatar — a plate inside a plate — and this is the same rule for a button.
   *
   * It is not a quieter neutral. Used on its own ground it is a control with nothing
   * to say it is one until the pointer arrives, which is the failure every chip in
   * this app got wrong in one direction or the other.
   */
  ghost: 'text-icon hover:bg-ink/10 hover:text-ink',
  /**
   * IT JUST WORKED — the tick after a copy, a save, a send.
   *
   * A STATE AND NOT A KIND OF BUTTON, which is why it is a tone the caller swaps to
   * for a second or two rather than something the control is. `danger` says what a
   * button WILL do; this says what it DID.
   *
   * Plate-less like `ghost`, because the one thing that confirms in this app is
   * nested in a chip. A plated confirmation is a fair thing to want and is not here:
   * it would be a second axis, and a tone table is not where two axes go.
   */
  success: 'text-green hover:bg-green/10 hover:text-green',
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
  size?: ButtonIconSize
  /**
   * The control is ON — a filter applied, a sort that is not the default, a panel
   * held open. It takes the accent ground at rest, which is the one case a chip is
   * allowed to announce a colour before being touched: the row is no longer four
   * equal siblings, and saying which one is doing something is the whole point.
   *
   * It also makes the button a TOGGLE for a screen reader, through `aria-pressed`.
   * The app's sort button had the tint and not the state, so a control that says
   * "sorted by recent" on screen said only "button" out loud.
   *
   * UNDEFINED AND NOT `false` BY DEFAULT, which is the difference between a control
   * that is off and one that does not toggle at all. `aria-pressed="false"` on the
   * repository card's four actions would announce each of them as an unpressed
   * switch — four things to turn on, where the truth is that opening VS Code is not
   * a state. Left alone, the attribute is simply absent.
   */
  active?: boolean
  disabled?: boolean
  /** Margins and placement — `ml-auto`, a gap. Not the size, the ground or the hover. */
  className?: string
}

/**
 * FORWARDS ITS REF, which is the one thing a plain function component could not do and
 * the reason this is wrapped.
 *
 * A control that opens a panel has to be MEASURABLE: the agent sort button anchors its
 * menu to its own box, through `useAnchoredPanel`, and a component that swallowed the
 * ref would have left that one call site on the hand-written chip — the single one of
 * the eight with a reason not to migrate, which is the kind of exception that quietly
 * becomes the rule.
 */

export const ButtonIcon = forwardRef<HTMLButtonElement, ButtonIconProps>(function ButtonIcon(
  { icon, title, onClick, tone = 'neutral', size = 'sm', active, disabled = false, className = '' },
  ref,
) {
  const shape = SIZES[size]
  return (
    <button
      ref={ref}
      // `type="button"` because a bare button inside a form submits it. 238 of the
      // app's 284 buttons do not say so; this one does, once, for all of them.
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      aria-pressed={active}
      className={`${shape.box} inline-flex items-center justify-center
        border-none cursor-pointer transition-colors flex-shrink-0 disabled:opacity-50
        disabled:cursor-not-allowed ${
          active ? 'bg-accent/15 text-accent hover:bg-accent/20' : TONES[tone]
        } ${className}`}
    >
      <Icon glyph={icon} size={shape.icon} tone="inherit" />
    </button>
  )
})
