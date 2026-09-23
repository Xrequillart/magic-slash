import { forwardRef, type CSSProperties } from 'react'
import type { ComponentSize } from './componentSizes'
import { Icon, type IconSize } from './Icon'
import { Loader } from './Loader'
import { RAISED_PLATE, RAISED_PLATE_HOVER } from './plate'
import { Text, type TextSize } from './Text'
import type { IconComponent } from './types'

/**
 * A control that is a WORD, and optionally a mark beside it.
 *
 * `ButtonIcon`'s other half. That one is a square with a tooltip, for a row of actions
 * where written out the names would not fit; this is the one that says what it does on
 * its face. Between them they are every button this app draws, and the choice between
 * the two is not a style decision — it is whether there is room for the word.
 *
 * WHAT IT REPLACES: the app's `theme/controls.ts` — `BTN`, `BTN_PRIMARY`, `BTN_DANGER`,
 * `BTN_GHOST`, `BTN_COMPACT` and the two stacked tiers. Seven constants, one gabarit
 * between them, and a header explaining that appending a padding to one of them does not
 * work because Tailwind settles two utilities of the same group by emit order. That
 * header is the argument for this component: a module of class strings cannot offer a
 * SIZE, so the app grew a second constant every time a button had to be a different one.
 *
 * NO BORDER, ANYWHERE, AND IT IS A DECISION RATHER THAN AN OMISSION. Four of the seven
 * constants carried one, and a bordered control is a hairline drawn around a plate that
 * is already a different colour from the ground — the same thing said twice, the way the
 * repository row's border said it (`RepositoryItem`). What separates this from what is
 * behind it is its GROUND, and every tone below has one or deliberately has none.
 *
 * THE SEVEN RUNGS ARE THE SHARED VOCABULARY AND NOT THE SHARED PIXELS — 20/24/28/32/36/
 * 40/44, which is one 4px step above the boxes `ButtonIcon`, `Label` and `Status` stand
 * on.
 *
 * THAT IS ALLOWED AND IS THE SYSTEM WORKING, not a deviation from it: `componentSizes.ts`
 * says in as many words that the ladder is a NAME and an ORDER, never one table of boxes
 * — `Text` resolves it to 10/12/14/16/18/20/24 and `Avatar` to something else again,
 * because a 24px plate and a 14px tick are not the same drawing. A button is not the same
 * drawing as a badge either.
 *
 * WHY A STEP UP. A badge is a word on a plate and a button is a TARGET, and on a control
 * with no border the AIR is the whole of what tells them apart — on both axes. At the
 * shared boxes a `md` button had 4px above and below its label; it has 6px now, and the
 * two large rungs have 8px. The horizontal padding says the same thing at the same time,
 * two steps wider than `Label`'s.
 *
 * WHAT IT COSTS, honestly: a button no longer lines up with an icon button of the SAME
 * rung, so a row holding both wants the button one rung down. Nothing in the app does
 * that today — all six call sites stand alone in their row — and the day one does, the
 * fix is one word at the call site rather than a component that is cramped everywhere so
 * that one row can be tidy.
 *
 * IT DRAWS A `Text` AND AN `Icon` and owns neither's size: both come off the rung. And
 * it takes the word as a STRING, not a node — `Text` says why, and a button whose label
 * can hold structure is a button that will grow a second line and then be a card.
 */

/**
 * The grounds, and there is no eighth: each is a job, not a colour.
 *
 * `accent` IS THE ONE AFFIRMATIVE ACTION of a view, at most one per card — the app's
 * `BTN_PRIMARY`. It is the only tone that announces itself before being touched, and
 * that is what makes it findable; a second one on the same card is two primaries, which
 * is none.
 *
 * `neutral` is the DEFAULT and the common case: everything that is available but is not
 * the obvious next step. `ghost` is the same button with no plate, for one sitting inside
 * something that already has one — a menu row, a toolbar, a card header. `Label` states
 * that rule for its avatar and `ButtonIcon` for its own ghost; a plate inside a plate is
 * a plate you can see at rest, and then the row is full of squares.
 *
 * `danger` is TINTED AND NOT FILLED, which is the app's own judgement and worth keeping:
 * a destructive action should read as available, never as the obvious next step. Filled
 * red is the colour of the primary in a view whose primary is deleting something.
 *
 * `ink` is the highest contrast the theme has — `bg-ink`, which is near-black on the four
 * light themes and near-white on the four dark ones, so it inverts for free where a
 * `bg-white` would have been an outline of nothing on half of them. For the second action
 * of a pair that both matter: it reads as a real button standing beside the primary
 * rather than as a lesser version of it.
 *
 * `solid` is `RAISED_PLATE`, the opaque one, for a button on the quick-settings sheet —
 * where the ground is frost and every translucent plate in this folder is a plate at
 * whatever happens to be behind it. `ButtonIcon` and `SelectIcon` both carry this tone
 * for the same row.
 *
 * `overlay` IS THE ONE THAT SITS ON A FILL — `ScriptCard`'s stop control, on a bar that
 * is solid purple while a script runs and solid red when it died. Every tone above is
 * mixed from `ink`, which is the colour that reads against the app's GROUND and not
 * against a saturated fill: ink at 5% on purple is purple, and ink at full is black on
 * a card the whole point of which is that it is loud. So this one is mixed from
 * `on-brand` — the fill's own ink, the colour already carrying the text beside it — and
 * the chip is then ON the bar rather than a second colour beside it.
 *
 * IT DOES NOT KNOW WHICH FILL. That is what makes it reusable and also what bounds it:
 * it works on any ground `on-brand` was chosen to read against, and on nothing else.
 * Used on the app's own surface it is a plate at 15% of a colour picked for a different
 * background, which is a chip that may be invisible or may be a hole.
 *
 * `tint` AND `fill` ARE THE TWO THAT HAVE NO COLOUR OF THEIR OWN. They are TREATMENTS —
 * a plate at 12% with the word at full strength, and the colour at full with the word in
 * `on-brand` — and the hue arrives in `color`, which is why both REQUIRE it and the type
 * will not let you write one without the other.
 *
 * They exist because a component can legitimately own a colour this folder does not: a
 * `Banner` has five variants and its button must be the variant's colour, a repository
 * has one of sixteen hues the app assigns at runtime. `Label` made this move first with
 * its own `color`; the difference is that a label has no hover to express, so a value in
 * `style` was enough there. Here the value is posted as a CSS VARIABLE and the two
 * grounds are mixed from it in classes — which is the only way a hover can be spelled at
 * all, since no inline style has a `:hover`.
 *
 * TWO RANKS AND NOT ONE, because the callers that need a colour of their own are exactly
 * the ones that need to rank a PAIR of buttons: do the thing, or go somewhere else about
 * it. `fill` is the louder and there is at most one per group.
 */
export type ButtonTone =
  | 'accent'
  | 'neutral'
  | 'ghost'
  | 'danger'
  | 'ink'
  | 'solid'
  | 'overlay'
  | 'tint'
  | 'fill'

export const BUTTON_TONES: readonly ButtonTone[] = [
  'accent',
  'neutral',
  'ghost',
  'danger',
  'ink',
  'solid',
  'overlay',
  'tint',
  'fill',
]

/**
 * THE SHADOW IS ON THE FILLED TONES ONLY, and that is the whole of what makes this
 * button look like an object rather than a rectangle of colour.
 *
 * A shadow under a TRANSLUCENT plate is a shadow under a hole: `bg-ink/5` lets the
 * ground through, so the dark it casts and the dark it shows are the same dark and the
 * control reads as smudged rather than as lifted. `accent` and `ink` are opaque, so they
 * can cast one — and it is TINTED with the plate's own colour rather than black, which is
 * the difference between a button that glows and a button that has been cut out and
 * dropped on the page.
 *
 * IT DOES NOT MOVE ON HOVER. The shadow is a property of the button at REST — what says
 * it is an object sitting on the page rather than a rectangle painted on it — and every
 * tone answers the pointer the same way, with a step of GROUND. A shadow that grew under
 * the cursor was the one thing on this control that behaved differently from the five
 * tones beside it, and on the loudest button of a view it read as a bloom rather than as
 * a response.
 *
 * So the hover is one rule for all seven: the plate goes a step. `accent` has a token for
 * it and takes it; `ink` has none and is mixed (see `INK_HOVER`); the translucent tones
 * step their own opacity, which is what they always did.
 *
 * `shadow-md` and not `shadow-lg` at rest because this ladder starts at 16px, and a large
 * shadow under a small control is a control that appears to be floating off the page.
 */
/**
 * THE FOCUS RING'S COLOUR AND OFFSET TRAVEL WITH THE GROUND, which is why they are here
 * and not in `CHROME` with the rest of the chrome.
 *
 * A ring offset from the page's background is right for a button standing ON the page,
 * and wrong for one inside a coloured bar: the offset is a band of app-background drawn
 * across the fill, which reads as a hole punched around the control. `overlay` therefore
 * takes no offset at all and rings in the fill's own ink.
 *
 * Interpolated rather than repeated so there is one spelling of the common case — and
 * stated per tone rather than appended, because two `ring-offset-<width>` classes on one
 * element are settled by the order Tailwind emitted them in, not by the order they were
 * written.
 */
const RING = 'focus-visible:ring-accent focus-visible:ring-offset-2'

/**
 * `tint` AND `fill`, MIXED FROM A VARIABLE THE CALLER POSTS.
 *
 * `color` cannot be a class — Tailwind reads source as text and never saw the hue, which
 * is the same wall `Label`'s own `color` hit. But it cannot be an inline `style` either,
 * because a style attribute has no `:hover`, and a button with no hover is the thing this
 * component exists to stop. So the value goes into `--btn-color` on the element and every
 * ground here is a `color-mix` of THAT — literal text in this file, so the scanner emits
 * it once, and per-instance at runtime because the variable is.
 *
 * 12% AND 20% are `Label`'s tint and a step past it. A plate under a WORD wants to stay
 * under the reading threshold, and 12% is where a hue reads as a tint on all eight themes
 * rather than as a colour; doubling it is what the hand-built banner chips already did.
 *
 * `fill`'s HOVER IS `ink`'s RULE — a step towards the ground rather than an opacity —
 * for the reason stated there: an opaque plate that goes translucent under the pointer
 * picks up whatever is behind it, and the same button then hovers to two different
 * colours in two different places.
 *
 * THE RING TAKES THE COLOUR TOO. The accent ring is right for a button wearing the app's
 * own hues and wrong for one wearing a variant's: a red banner with an indigo focus ring
 * is two colours arguing about which of them is the state.
 */
const COLOR_GROUND: Record<'tint' | 'fill', string> = {
  tint:
    'bg-[color:color-mix(in_srgb,var(--btn-color)_12%,transparent)] text-[color:var(--btn-color)] ' +
    'hover:bg-[color:color-mix(in_srgb,var(--btn-color)_20%,transparent)] ' +
    'focus-visible:ring-[color:var(--btn-color)] focus-visible:ring-offset-2',
  fill:
    'bg-[color:var(--btn-color)] text-on-brand ' +
    'hover:bg-[color:color-mix(in_srgb,var(--btn-color),rgb(var(--c-bg))_12%)] ' +
    'focus-visible:ring-[color:var(--btn-color)] focus-visible:ring-offset-2',
}

/**
 * `ink`'S HOVER, AND IT HAS TO BE MIXED RATHER THAN SPELLED.
 *
 * The other filled tone has a token for this — `accent-hover`, which every theme defines
 * beside its accent. `ink` has none, and the obvious substitute is the trap: `bg-ink/90`
 * makes an OPAQUE plate translucent, so the app's highest-contrast button picks up
 * whatever happens to be behind it. The same button then hovers to one grey over a card
 * and another over the page, which is a hover that depends on where you put the button.
 *
 * So the plate is mixed a step towards the GROUND instead — 12% of `bg` into `ink`,
 * opaque, and theme-aware for free: on a dark theme the ink is white and the step dims
 * it, on a light one the ink is near-black and the step lifts it. Both read as the same
 * gesture because both are the same distance travelled towards the same place.
 *
 * `color-mix` OF RAW VARIABLES and not of `theme()` calls, which is `plate.ts`'s rule
 * learned the same way: Tailwind's arbitrary-value parser drops a `color-mix` of two
 * `theme()` calls silently. The `color:` hint is what tells it this is a colour and not
 * an image; the underscores are its spelling of spaces.
 */
const INK_HOVER =
  'hover:bg-[color:color-mix(in_srgb,rgb(var(--c-ink)),rgb(var(--c-bg))_12%)]'

const TONES: Record<ButtonTone, string> = {
  accent: `bg-accent text-on-brand shadow-md shadow-accent/30 hover:bg-accent-hover ${RING}`,
  neutral: `bg-ink/5 text-ink hover:bg-ink/10 ${RING}`,
  ghost: `text-text-secondary hover:bg-ink/10 hover:text-ink ${RING}`,
  danger: `bg-red/10 text-red hover:bg-red/20 ${RING}`,
  ink: `bg-ink text-bg shadow-md shadow-ink/20 ${INK_HOVER} ${RING}`,
  solid: `${RAISED_PLATE} text-ink ${RAISED_PLATE_HOVER} ${RING}`,
  overlay:
    'bg-on-brand/15 text-on-brand hover:bg-on-brand/30 focus-visible:ring-on-brand focus-visible:ring-offset-0',
  ...COLOR_GROUND,
}

/** `ComponentSize`, the folder's one ladder. `sm` is the default, as everywhere. */
export type ButtonSize = ComponentSize

/**
 * The rungs. HEIGHT AND RADIUS ARE `ButtonIcon`'S, character for character — a word
 * button and a mark button on the same row must agree on both or the row has two
 * languages in it.
 *
 * THE PADDING IS THIS COMPONENT'S OWN on both axes now, and horizontally it is TWO steps
 * wider than `Label`'s at every rung, where it used to be one. A badge is a word on a plate and wants the plate tight
 * around it; a button is a TARGET, and the air either side of the word is what you are
 * aiming at. At one step the two read as the same object with different jobs, which is
 * exactly the confusion a button does not want: pressable has to look different from
 * merely labelled, and on a control with no border the padding is the whole of what says
 * so.
 *
 * THE HEIGHT MOVED WITH IT, one 4px step at every rung — see the rungs note above for why
 * that is the ladder working rather than the ladder broken.
 *
 * THE TYPE SCALE IS `Label`'S, so a button and a badge beside it read at one size.
 */
const SIZES: Record<
  ButtonSize,
  { box: string; text: TextSize; icon: IconSize }
> = {
  /**
   * 16px. A TARGET SMALLER THAN A FINGER and smaller than most cursor work: reach for
   * it only where the whole row is 16 and never for the one control a reader has to
   * find. It is here because the ladder is shared.
   */
  '2xs': { box: 'h-5 gap-1 px-2 rounded-lg', text: '2xs', icon: '2xs' },
  /** 24px — a button under a row rather than in one. */
  xs: { box: 'h-6 gap-1 px-2.5 rounded-lg', text: 'xs', icon: 'xs' },
  sm: { box: 'h-7 gap-1.5 px-3 rounded-lg', text: 'xs', icon: 'sm' },
  md: { box: 'h-8 gap-1.5 px-3.5 rounded-lg', text: 'sm', icon: 'sm' },
  lg: { box: 'h-9 gap-2 px-4 rounded-xl', text: 'sm', icon: 'md' },
  /** 40px — a control beside a heading rather than in a row. */
  xl: { box: 'h-10 gap-2 px-5 rounded-xl', text: 'md', icon: 'md' },
  /** 44px — the button IS the subject: an empty state's one action, a dialog's. */
  '2xl': { box: 'h-11 gap-2.5 px-6 rounded-2xl', text: 'lg', icon: 'lg' },
}

/**
 * What every button wears, whatever its tone and whatever its rung.
 *
 * THE BUTTON MOVES UNDER THE POINTER, and 4% is the whole of it.
 *
 * FOUR AND NOT TEN, which is a measurement rather than a preference. A row of buttons in
 * this app is spaced by `gap-2` — 8px — and a scale grows a box from its CENTRE, so half
 * the growth goes each way. At 1.04 a 130px button ("Change password", the widest in the
 * account card's row) gains 5px, which is 2.6px a side and leaves 5.4px of the gap
 * standing. At 1.10 it gains 13px, 6.5px a side, and the row's five buttons start
 * touching — and the one full-width button in the app, the sign-in submit, would grow
 * 38px inside a card whose padding is 28px.
 *
 * `transform-gpu` so the growth is composited rather than re-laid-out: a transform never
 * affects layout, but promoting the layer is what keeps the label's antialiasing steady
 * through the 150ms rather than reflowing the glyphs at each step.
 *
 * THE PRESS ANSWERS IT, and is the older half of the pair: 3% INWARD, far enough to be
 * felt under the finger and near enough that a row of them does not ripple. `Switch`
 * already presses this way. Together they are an object that comes up to meet the pointer
 * and gives when it is pushed.
 *
 * BOTH ARE HELD BACK WHEN THE BUTTON CANNOT BE PRESSED. A disabled control that grew
 * under the cursor would be inviting a press it will refuse, and one that squashed has
 * just told the reader it worked.
 *
 * THE FOCUS RING is `ToggleButton`'s, spelled the same way, and `focus-visible` rather
 * than `focus` so it answers the keyboard and stays out of the way of the mouse. Its
 * WIDTH is here because every tone rings the same; its COLOUR and its offset are in
 * `RING` and in the tone table, because one ground needs a different answer.
 *
 * `whitespace-nowrap` AND `flex-shrink-0`, both load-bearing in a row: a button is the
 * thing a row's flexible child gives way to, and a label that wrapped to two lines would
 * break the rung's height — which is the one promise the shared ladder makes.
 */
const CHROME = `inline-flex items-center justify-center border-none cursor-pointer
  whitespace-nowrap flex-shrink-0 transition-all duration-150 transform-gpu
  hover:scale-[1.04] active:scale-[0.97]
  disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-bg`

interface ButtonBase {
  /**
   * The word. A STRING — see `Text` for why, and because a button whose label can hold
   * structure grows a second line and stops being a button.
   */
  children: string
  onClick?: () => void
  size?: ButtonSize
  /**
   * A mark before the word. It takes the rung's own icon size, so a caller cannot put a
   * 20px glyph in a 24px control.
   */
  icon?: IconComponent
  /**
   * A mark AFTER the word, and it is a different job from `icon`: a leading mark says
   * what the action is, a trailing one says where it goes — a chevron on a menu trigger,
   * an arrow on a link out. Both at once is legal and almost always one too many.
   */
  trailing?: IconComponent
  disabled?: boolean
  /**
   * THE ACTION IS RUNNING RIGHT NOW. The leading mark becomes a spinner — or one is
   * added if there was no mark — and THE WORD STAYS, which is the difference from
   * `ButtonIcon`: there the mark was the whole meaning, so replacing it left nothing.
   *
   * It implies `disabled` rather than sitting beside it: a save that accepts a second
   * press sends a second save, and the reader has no way to know that is what they did.
   *
   * IT DOES NOT DIM. A dimmed spinner says "unavailable" about a control that is in fact
   * working, so the opacity rule is dropped for this one while the block stays.
   * `aria-busy` is what says it out loud.
   */
  busy?: boolean
  /**
   * `submit`, for the one button in a form that sends it. The default is `button`,
   * because a bare `<button>` inside a form submits it — which is the bug 238 of the
   * app's 284 buttons are one refactor away from, and the reason this is stated here
   * once for all of them.
   */
  type?: 'button' | 'submit'
  /**
   * The tooltip. A button says what it does on its face, so this is for the case the
   * FACE IS NOT THE WHOLE STORY — a truncated label, a shortcut worth naming, a control
   * that is disabled for a reason the reader cannot see.
   */
  title?: string
  /**
   * Margins, width and placement — `w-full`, `ml-auto`, `flex-1`, a gap. Not the ground,
   * the height, the radius or the padding: a second utility from any of those groups is
   * settled by the order Tailwind emitted them in, not by the order it was written in.
   */
  className?: string
  /**
   * TAKE THIS CONTROL OFF THE KEYBOARD'S PATH — `-1`, and there is no other value worth
   * passing. `ButtonIcon` carries the same escape hatch and its docblock holds the
   * reasoning; the short of it is a control that is present for the pointer and would be
   * three hundred announcements of the same offer for anything else, and which owes the
   * keyboard another way to the same place.
   */
  tabIndex?: number
}

/**
 * A UNION AND NOT TWO OPTIONAL PROPS, which is `parts.tsx`'s `UsesProps` trick and it is
 * here for the same reason: `tone="tint"` with no `color` is a button with an undefined
 * variable in every one of its `color-mix`es, and an invalid `color-mix` is not a slightly
 * wrong colour — it is NO background at all. That failure is silent, and it is silent in
 * the one place a reader is least likely to look, so it is worth a type that cannot
 * express it.
 *
 * `color?: never` on the other branch rather than omitting the key: a union whose members
 * do not all carry a property cannot be destructured, and this component destructures.
 */
export type ButtonProps = ButtonBase &
  (
    | {
        tone?: Exclude<ButtonTone, 'tint' | 'fill'>
        /**
         * A hue this folder does not own — a `Banner` variant's, a repository's, any CSS
         * colour. Only the two treatments that have no colour of their own take it.
         */
        color?: never
      }
    | {
        tone: 'tint' | 'fill'
        /**
         * REQUIRED by these two, and any CSS colour rather than only a hex: a fixed
         * `#F43F5E` the app picked once and a palette value like `rgb(var(--c-red))` are
         * both legal, and the second is the one that has to keep moving when the theme
         * does.
         */
        color: string
      }
  )

/**
 * FORWARDS ITS REF, for `ButtonIcon`'s reason: a button that opens a menu has to be
 * measurable, and `useAnchoredPanel` anchors to the trigger's own box.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    onClick,
    tone = 'neutral',
    color,
    size = 'sm',
    icon,
    trailing,
    disabled = false,
    busy = false,
    type = 'button',
    title,
    className = '',
    tabIndex,
  },
  ref,
) {
  const shape = SIZES[size]
  // Busy blocks the press the way `disabled` does — see the prop — but keeps its
  // opacity, so the dimming rule is emitted only for the other case.
  const blocked = disabled || busy
  // The hue reaches the grounds as a variable and not as a class, because Tailwind never
  // saw it — see `COLOR_GROUND`. Posted only by the two tones that read it, so nothing
  // else carries a custom property it has no use for.
  const style = color ? ({ '--btn-color': color } as CSSProperties) : undefined

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      title={title}
      disabled={blocked}
      tabIndex={tabIndex}
      aria-busy={busy || undefined}
      style={style}
      className={`${shape.box} ${TONES[tone]} ${CHROME} ${busy ? '' : 'disabled:opacity-50'} ${className}`}
    >
      {/* The spinner takes the mark's own rung and its place, so the box does not resize
          under it and a row of these does not twitch when one starts working. No `label`
          on it: the word beside it already says what is happening, and a second voice
          reading "loading" would be the control announcing itself twice. */}
      {busy ? (
        <Loader variant="spin" size={shape.icon} tone="inherit" />
      ) : (
        icon && <Icon glyph={icon} size={shape.icon} tone="inherit" className="flex-shrink-0" />
      )}

      {/* `tone="inherit"` — the colour is the BUTTON's, stated once in its tone. A second
          colour class here would race the tone's, and which won would be decided by
          Tailwind's emit order rather than by anything written down. */}
      <Text size={shape.text} tone="inherit">
        {children}
      </Text>

      {trailing && (
        <Icon glyph={trailing} size={shape.icon} tone="inherit" className="flex-shrink-0" />
      )}
    </button>
  )
})
