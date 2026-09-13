/**
 * A setting that is on or off, and takes effect the moment you say so.
 *
 * It is every toggle on the settings pages: the application tab's six, and the
 * ten down the repository page. It arrived here already deduplicated — the app
 * had this one and a hand-rolled `<label><input class="sr-only peer">` pair
 * repeated seven times, two pixels taller and with a knob a size up — so what
 * this move settles is not the drift but where the shape is DECIDED. It was a
 * component of the desktop's renderer that the webapp could not draw.
 *
 * WHAT IT IS NOT: a `Status`, which reports a state and happens to let you change
 * it. A switch has no third value and no verb — the label beside it is the noun,
 * the switch is whether that noun applies. Anything with more than two positions
 * is a segmented control (the title bar's split/single, the skills page's context
 * window) and none of those are this.
 *
 * NO SAVE BUTTON ANYWHERE NEAR IT. Every call site writes on change, and that is
 * the contract the shape promises: a switch that needed confirming would be a
 * checkbox and should look like one.
 */

/**
 * A `<button role="switch">` rather than a checkbox, and the reason is the
 * greying rather than the semantics.
 *
 * The checkbox version had to be hidden (`sr-only`) and repainted with sibling
 * divs, which put the visible part out of reach of `index.css`'s
 * `fieldset:disabled button` rule — the one that greys every other control when
 * the repository page goes read-only for a member who may not edit a team repo.
 * It needed a CSS rule of its own to stay in step with the inputs around it. A
 * real button is caught by the rule the rest of the page already obeys, so
 * `disabled` here does nothing visual on purpose: the page does it.
 */

/**
 * THE SHARED LADDER, and the three rungs are the ones `Label`, `Status` and
 * `ButtonIcon` already stand on: 24, 28, 32.
 *
 * A switch sits in a settings row beside those components, and a control that
 * measured itself against nothing was a control that could only ever line up
 * with the row by accident. An `sm` switch against an `sm` label now agree at
 * 24px because they read the same table, not because someone matched them by eye.
 *
 * `xs` is deliberately absent even though `ButtonIcon` has one. That rung exists
 * there for a button nested INSIDE a chip, measured against the chip and not the
 * row; a switch is never nested in anything, and a 20px switch is a target too
 * small for a control whose whole job is being hit.
 */
export type SwitchSize = 'sm' | 'md' | 'lg'

/**
 * The geometry. Three numbers per rung, and they are one decision — so they sit
 * in one row of one table rather than in three tables keyed by size.
 *
 * THE KNOB IS A PILL AT EVERY RUNG — wider than it is tall, 1.25 to 1.4 — and not
 * the circle this carried before. A circle in a track reads as a dot that slid; a
 * pill reads as a thing that was pushed, which is what a switch is.
 *
 * THE TRACKS ARE SHORT: about 1.7 times their height, against the 2.2 of the
 * first pill draft. That draft set the LENGTH to show the new knob off and
 * produced a control that outweighed the label beside it — sixteen of these run
 * down two settings pages, in rows whose text is 13px, and a switch is the answer
 * to its row, not the subject of it. Length is what came back down; the knob did
 * not, and the height is the ladder's now rather than anyone's preference.
 *
 * 4px of padding all round at every rung, which is what makes the arithmetic
 * check: the height is 4 + knob + 4, and the width is 4 + knob + travel + 4.
 *
 * Every value is a stock Tailwind class with no arbitrary brackets anywhere. That
 * is a sign rather than a rule — a ladder that lands on the scale's own numbers
 * at all three rungs is usually the right ladder.
 *
 * `stretch` AND `pressedTravel` ARE THE SQUASH, and the two are one number seen
 * from both ends: the knob gains 4px of width while the pointer is down, and when
 * it is already at the far end it gives back the same 4px of travel so it grows
 * INWARD. Without that second class the stretch would push the pill through the
 * right-hand padding and out of its own track.
 *
 * Four pixels at every rung rather than a proportion of the knob. The squash is a
 * gesture, not a measurement — it has to read the same on a 20px pill as on a
 * 32px one, and a proportional stretch is invisible at `sm` by the time it is
 * right at `lg`.
 */
const SIZES: Record<
  SwitchSize,
  { track: string; knob: string; travel: string; stretch: string; pressedTravel: string }
> = {
  /** 40×24, knob 20×16, travel 12. The settings rows, and the default. */
  sm: {
    track: 'w-10 h-6',
    knob: 'w-5 h-4',
    travel: 'translate-x-3',
    stretch: 'group-active:w-6',
    pressedTravel: 'group-active:translate-x-2',
  },
  /** 48×28, knob 28×20, travel 12. */
  md: {
    track: 'w-12 h-7',
    knob: 'w-7 h-5',
    travel: 'translate-x-3',
    stretch: 'group-active:w-8',
    pressedTravel: 'group-active:translate-x-2',
  },
  /** 56×32, knob 32×24, travel 16. */
  lg: {
    track: 'w-14 h-8',
    knob: 'w-8 h-6',
    travel: 'translate-x-4',
    stretch: 'group-active:w-9',
    pressedTravel: 'group-active:translate-x-3',
  },
}

export interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  /**
   * Names the control for assistive tech. The VISIBLE label sits outside, in the
   * row that owns it — this is the same words, not a second set, and it is
   * required because a switch with no label is a lever with no sign on it.
   */
  label: string
  /**
   * Which rung. `sm` like `Label`, `Status` and `ButtonIcon`, and for the same
   * reason they chose it: it is what a control standing in a row should be. The
   * larger two are for a switch that is the subject of its own panel rather than
   * the answer to a line of settings text.
   */
  size?: SwitchSize
  /**
   * Stops the interaction. Greying is `fieldset:disabled`'s job, not this
   * component's — see above — so a disabled switch outside a fieldset still
   * looks live. That is a page bug, and the fix is the fieldset.
   */
  disabled?: boolean
}

export function Switch({ checked, onChange, label, size = 'sm', disabled }: SwitchProps) {
  const shape = SIZES[size]

  return (
    <button
      // Explicit: a bare <button> inside a <form> defaults to submit, and half
      // these sit inside the repository page's fieldsets.
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`group relative ${shape.track} rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-ink/20'
      }`}
    >
      {/* `bg-on-brand` in both positions: the knob is the thing ON the track, and
          it stays the same object whichever end it is at. Tinting it when off
          would make the switch look like two different controls.

          `top-1 left-1` is not keyed by size because the padding is 4px on every
          rung — it is the one number the ladder does NOT scale, since a track
          that grew its inset as it grew would swallow the knob's own proportion
          and the pill would close back up into a circle at `lg`.

          WIDTH AND NOT `scale-x`, which is the obvious way to stretch a thing and
          the wrong one here. A scaled pill scales its corners too: at 1.25 the
          radius goes elliptical and the ends stop being semicircles, which is
          visible on the very shape this component exists to be. Animating the real
          width leaves `rounded-full` to recompute honestly at every frame.

          `transition-[width,transform]` and not `transition-all`, so the squash
          and the travel are the only things easing. `bg-on-brand` never changes
          and a colour left in the list is a colour some future theme switch will
          animate for no reason.

          THE EASING OVERSHOOTS, and it is the marketing home's rather than this
          file's invention: the switch in `MakeItYoursArt` was hand-tuned to this
          curve after the product owner found the plain one slow — "l'animation de
          l'activation est trop lente" — and what was wrong was never the duration.
          A knob on `ease-out` decelerates into its stop and reads as SLID; one that
          passes its mark by a hair and settles reads as THROWN, which is what a
          switch being flicked actually is. The card draws this component now, so
          the curve belongs here and the app's sixteen switches get it too.

          It cannot poke out of the track: the curve tops out near 1.09, which on
          `lg`'s 16px travel is 1.4px against the 4px of padding it has left. */}
      <div
        className={`absolute top-1 left-1 ${shape.knob} ${shape.stretch} rounded-full bg-on-brand transition-[width,transform] duration-200 ease-[cubic-bezier(.32,1.4,.55,1)] ${
          checked ? `${shape.travel} ${shape.pressedTravel}` : 'translate-x-0'
        }`}
      />
    </button>
  )
}
