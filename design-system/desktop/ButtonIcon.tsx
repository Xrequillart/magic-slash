import { forwardRef } from 'react'
import { Icon, type IconSize } from './Icon'
import { Loader } from './Loader'
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
 * sort — and all eight are this component now. The PR card's refresh is the ninth,
 * and it is the one that arrived carrying a WORD: it gave the word up rather than
 * this growing a `children` slot, which is how a component like this one stops being
 * about one thing. The tooltip says "Refresh", and a spinning arrow beside a
 * "checked 2 min ago" stamp needs no label to be read. `ACTION_CHIP` itself stays for
 * the two uses that genuinely are not icon-only: a branch name, and the scripts menu
 * with its chevron.
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

/**
 * EXPORTED, because `SelectIcon` is this control with a chevron and has to stand the
 * same height in the same row. Split into height, width and radius rather than one
 * `box` string for exactly that: a select is a PILL — it keeps the height and the
 * radius and takes its own horizontal padding, and a shared table that only spoke in
 * whole boxes would have forced it to respell the ladder.
 */
export const BUTTON_ICON_SIZES: Record<
  ButtonIconSize,
  { h: string; w: string; radius: string; icon: IconSize }
> = {
  /**
   * THE ONE RUNG THAT IS NOT ON THE SHARED LADDER, and it is here because a button
   * nested inside a chip is not measured against the badges beside it — it is
   * measured against the chip it sits in. The branch chip is 32px with this in it;
   * at `sm` the control would be 24 of those 32 and all but fill the row.
   *
   * Reach for it ONLY inside something else. A 20px target on its own is small, and
   * the three rungs below are what a control standing in a row should be.
   */
  xs: { h: 'h-5', w: 'w-5', radius: 'rounded-lg', icon: 'xs' },
  sm: { h: 'h-6', w: 'w-6', radius: 'rounded-lg', icon: 'sm' },
  md: { h: 'h-7', w: 'w-7', radius: 'rounded-lg', icon: 'sm' },
  lg: { h: 'h-8', w: 'w-8', radius: 'rounded-xl', icon: 'md' },
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

/**
 * WHAT `active` LOOKS LIKE, and the two answers are about what the row is.
 *
 * `accent` is the loud one and the default: a control in a row of equal siblings, one of
 * which is doing something — a filter applied, a sort that is not the order things were
 * learned in. The colour is the whole point, because nothing else in the row differs.
 *
 * `ink` is for a PAIR OF TOGGLES THAT ARE ALWAYS ON. The title bar's two panel toggles
 * are open most of the time, and two accent squares at rest read as an alert about the
 * app's own furniture rather than as a state. Lit ink says the same thing at the volume
 * the thing deserves — which is what the app's hand-written bar did before it was one of
 * these, and it was right. Same plate, same hover: only the mark's colour is the state.
 */
export type ButtonIconActive = 'accent' | 'ink'

const ACTIVE: Record<ButtonIconActive, string> = {
  accent: 'bg-accent/15 text-accent hover:bg-accent/20',
  ink: 'bg-ink/5 text-ink hover:bg-ink/10',
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
   * `activeTone` is how loudly it says so.
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
  /** How `active` is drawn. `accent` unless the row is toggles that are usually on. */
  activeTone?: ButtonIconActive
  disabled?: boolean
  /**
   * THE CONTROL IS DOING THE THING RIGHT NOW — a refresh in flight, a save on its way.
   *
   * The mark spins, and the click is blocked while it does: a refresh that accepts a
   * second press queues a second read, and the reader has no way to know that is what
   * they did. So this implies `disabled` rather than sitting beside it, and a caller
   * does not have to remember to pass both.
   *
   * IT DOES NOT DIM, and that is the difference from `disabled`. A dimmed spinner says
   * "unavailable" about a control that is in fact working — the two states look the
   * same and mean opposite things, so the opacity rule is dropped for this one while
   * the pointer and the block stay. `aria-busy` is what says it out loud.
   *
   * THE MARK IS REPLACED BY `Loader`, NOT SPUN. It was the caller's own glyph turning
   * for one commit, which reads well enough on a refresh arrow and badly on everything
   * else: a spinning trash can or a rotating chevron is a mark that has lost its
   * meaning rather than one that is working. `Loader`'s `spin` is the app's single
   * answer for "an action YOU started and are waiting on" — its own words — so a busy
   * button now looks like every other thing this app waits on, and the reduced-motion
   * rule that file carries applies here for free.
   *
   * A PROP AND NOT A TONE. A tone is what a button IS; this is what it is doing this
   * second, and it composes with every one of them — a `danger` control can be busy.
   */
  busy?: boolean
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
  {
    icon,
    title,
    onClick,
    tone = 'neutral',
    size = 'sm',
    active,
    activeTone = 'accent',
    disabled = false,
    busy = false,
    className = '',
  },
  ref,
) {
  const shape = BUTTON_ICON_SIZES[size]
  // Busy blocks the click the same way `disabled` does — see the prop's note — but
  // keeps its opacity, so the dimming rule is emitted only for the other case.
  const blocked = disabled || busy
  return (
    <button
      ref={ref}
      // `type="button"` because a bare button inside a form submits it. 238 of the
      // app's 284 buttons do not say so; this one does, once, for all of them.
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={blocked}
      aria-pressed={active}
      aria-busy={busy || undefined}
      className={`${shape.h} ${shape.w} ${shape.radius} inline-flex items-center justify-center
        border-none cursor-pointer transition-colors flex-shrink-0
        disabled:cursor-not-allowed ${busy ? '' : 'disabled:opacity-50'} ${
          active ? ACTIVE[activeTone] : TONES[tone]
        } ${className}`}
    >
      {/* The loader takes the mark's own rung — `Loader`'s sizes are `Icon`'s, in pixels
          — so the chip does not resize under it and a row of these does not twitch when
          one starts working. `tone="inherit"` and no `label`: the button already carries
          the accessible name and `aria-busy`, and a second voice saying "loading" would
          be the control announcing itself twice. */}
      {busy ? (
        <Loader variant="spin" size={shape.icon} tone="inherit" />
      ) : (
        <Icon glyph={icon} size={shape.icon} tone="inherit" />
      )}
    </button>
  )
})
