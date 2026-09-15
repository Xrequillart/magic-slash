import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import type { ComponentSize } from './componentSizes'

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
 * THE SHARED LADDER — `ComponentSize`, which is what the three rungs `Label`,
 * `Status` and `ButtonIcon` already stood on turned into a type: 24, 28, 32.
 *
 * A switch sits in a settings row beside those components, and a control that
 * measured itself against nothing was a control that could only ever line up
 * with the row by accident. An `sm` switch against an `sm` label now agree at
 * 24px because they read the same table, not because someone matched them by eye.
 *
 * SEVEN RUNGS NOW, and the two at the bottom come with a warning rather than a use:
 * see `SIZES`. A switch is never nested inside anything, so it has no equivalent of
 * `ButtonIcon`'s chip to be measured against — below `sm` it is simply a small target
 * for a control whose whole job is being hit.
 *
 * THE GEOMETRY IS DERIVED AND NOT CHOSEN, which is what made four new rungs safe to
 * add: track width is `2h - 8`, knob height is `track h - 8` (4px of padding each
 * side), and travel is what is left — `track w - knob w - 8`. Every rung in the table
 * satisfies all three, the three that were already there included.
 */
export type SwitchSize = ComponentSize

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
  /**
   * 24×16, knob 12×8, travel 4.
   *
   * A TARGET TOO SMALL FOR A CONTROL WHOSE JOB IS BEING HIT, and the note below on
   * `xs` is the argument — it applies to this rung twice over. It is reachable
   * because the ladder is shared and because a closed record with a hole in it is a
   * component you have to edit to try something; it is not a rung to ship.
   */
  '2xs': {
    track: 'w-6 h-4',
    knob: 'w-3 h-2',
    travel: 'translate-x-1',
    stretch: 'group-active:w-4',
    pressedTravel: 'group-active:translate-x-0',
  },
  /**
   * 32×20, knob 16×12, travel 8.
   *
   * DELIBERATELY ABSENT UNTIL THE LADDER WAS SHARED, and the reason still stands: a
   * 20px switch is a target too small for a control whose whole job is being hit.
   * `ButtonIcon` has an `xs` because a button nested INSIDE a chip is measured
   * against the chip; a switch is never nested in anything.
   */
  xs: {
    track: 'w-8 h-5',
    knob: 'w-4 h-3',
    travel: 'translate-x-2',
    stretch: 'group-active:w-5',
    pressedTravel: 'group-active:translate-x-1',
  },
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
  /** 64×36, knob 36×28, travel 20. */
  xl: {
    track: 'w-16 h-9',
    knob: 'w-9 h-7',
    travel: 'translate-x-5',
    stretch: 'group-active:w-10',
    pressedTravel: 'group-active:translate-x-4',
  },
  /**
   * 72×40, knob 40×32, travel 24. The switch as a page's one control.
   *
   * THE TRACK IS AN ARBITRARY VALUE because Tailwind's default spacing scale skips
   * 18 — it runs 16, 20, 24 — and neither app extends it. `w-[72px]` is the same
   * 72px the ladder's arithmetic asks for, spelled the one way that emits a class.
   */
  '2xl': {
    track: 'w-[72px] h-10',
    knob: 'w-10 h-8',
    travel: 'translate-x-6',
    stretch: 'group-active:w-11',
    pressedTravel: 'group-active:translate-x-5',
  },
}

/**
 * Two drawings of the same control, and the second one is jh3y's.
 *
 * `pill` is everything above — the flat track, the knob that travels, the 4px
 * squash. It stays the default because sixteen of these run down two settings
 * pages and a settings row wants the cheap one.
 *
 * `liquid` is the cross-browser liquid toggle from
 * https://codepen.io/jh3y/pen/bNVWoBW (Jhey Tompkins, MIT), ported to this
 * component's ladder. The knob is a lens rather than a fill: a white cover that
 * lifts on press to reveal an inset glass shadow, over a gooey copy of the track
 * that bleeds through it. The track behind is punched out by an SVG knockout so
 * the colour never shows under the knob.
 *
 * WHAT WAS TAKEN AS-IS: the layer stack, the two SVG filters, the knockout mask,
 * the 1.65 bulge, the blur that resolves on press, and the choreography — bulge,
 * hold 0.18s, slide, settle.
 *
 * WHAT HAD TO CHANGE, and neither was a preference:
 *
 *   1. THE SIZE. The pen is a fixed 140×60 with the knob at 60% of the track. This
 *      component answers a 13px settings row and stands on the 24/28/32 ladder
 *      `Label`, `Status` and `ButtonIcon` share, so the geometry below is the SAME
 *      table `SIZES` uses — same tracks, same knobs, same travel. Nothing about the
 *      pen's arithmetic resisted it: its own translate formula is
 *      `trackW - knobW - 2·border`, which is exactly the travel already in `SIZES`.
 *
 *   2. THE DRAG. The pen tracks a pointer with GSAP + Draggable and that is the only
 *      reason it needs them. A switch here is tapped, never dragged, so `--complete`
 *      is a registered custom property that CSS transitions on its own and the
 *      dependency does not follow the effect in. `--delta`, the pen's pointer
 *      velocity, is therefore always 0 and its terms fall out of the formulas.
 */
export type SwitchVariant = 'pill' | 'liquid'

/**
 * The liquid variant's geometry, and the first four columns are `SIZES` again in
 * pixels rather than Tailwind classes. They have to be numbers here: the pen's
 * layout is arithmetic on custom properties (`calc((--complete / 100) * --travel)`)
 * and a class name cannot be multiplied.
 *
 * `u` IS THE SCALE FACTOR AGAINST THE PEN, `height / 60`. Every soft measurement it
 * carries — the wrapper blur, the eleven-layer glass shadow, the goo's own spread —
 * is a proportion of the control rather than a fixed number, because those ARE the
 * effect: a 6px blur on a 24px track is not a softer version of the pen, it is an
 * opaque smudge. The hard measurements (the 4px padding, the travel) keep the
 * ladder's own values instead, which is why they are listed and not derived.
 *
 * `goo` IS `feGaussianBlur`'s `stdDeviation`, and it is the one value that cannot
 * come from CSS — filter primitives take attributes, not custom properties — so each
 * rung gets its own `<filter>`. The pen ships `13` in its stylesheet and then
 * overwrites it with `2` from its Tweakpane config before first paint, so `2` is what
 * anyone who has seen the pen has actually seen; these are `2 · u`, rounded up a
 * notch because a sub-pixel deviation stops merging anything at all — which works
 * out at `3 · u` across every rung, the four added with the shared ladder included.
 *
 * THE FIRST FOUR COLUMNS STAY `SIZES`' OWN ARITHMETIC — `w = 2h - 8`, `knob = w -
 * travel - 8` — so the two tables cannot drift: a rung whose liquid geometry
 * disagreed with its pill geometry would be one control that changed shape when a
 * caller swapped `variant`, which is the exact thing sharing a component is for.
 */
const LIQUID: Record<
  SwitchSize,
  { w: number; h: number; knob: number; travel: number; u: number; goo: number }
> = {
  '2xs': { w: 24, h: 16, knob: 12, travel: 4, u: 0.27, goo: 0.8 },
  xs: { w: 32, h: 20, knob: 16, travel: 8, u: 0.33, goo: 1 },
  sm: { w: 40, h: 24, knob: 20, travel: 12, u: 0.4, goo: 1.2 },
  md: { w: 48, h: 28, knob: 28, travel: 12, u: 0.47, goo: 1.4 },
  lg: { w: 56, h: 32, knob: 32, travel: 16, u: 0.53, goo: 1.6 },
  xl: { w: 64, h: 36, knob: 36, travel: 20, u: 0.6, goo: 1.8 },
  '2xl': { w: 72, h: 40, knob: 40, travel: 24, u: 0.67, goo: 2 },
}

/**
 * The pen's `linear()` bounce, copied digit for digit. It overshoots to 1.40 and
 * rings down through 0.95, which is what makes the bulge read as a drop of liquid
 * being pulled rather than a box being scaled.
 *
 * It is NOT on the slide. The pen tweens `--complete` in a flat 0.12s and spends this
 * curve on scale, mask and blur — the knob wobbles, the position does not — and a
 * switch whose knob overshot its own track would read as broken rather than springy.
 */
const BOUNCE =
  'linear(0 0%, 0.6091 3.69%, 1.0259 7.24%, 1.1733 9.05%, 1.283 10.92%, 1.3562 12.87%, 1.3948 14.95%, 1.4014 16.03%, 1.3999 17.16%, 1.3731 19.64%, 1.3202 22.27%, 1.1394 29.39%, 1.0582 33.17%, 0.9943 37.45%, 0.9734 39.64%, 0.9593 41.92%, 0.9505 45.08%, 0.9517 48.7%, 0.9924 63.02%, 1.0046 71.2%, 1.0061 78.24%, 1 100%)'

/**
 * How long the bulge is held, in ms: the pen's 0.18s wait plus its 0.12s slide plus
 * the 0.05s it sits there before letting go. The pen gets this from a GSAP timeline's
 * `onComplete`; a CSS transition has no such callback, so the one number is spelled
 * here and the stylesheet below is written to agree with it.
 */
const HOLD = 360

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
  /**
   * Which drawing. `pill` unless asked, and the ask is deliberate: the liquid one
   * mounts two SVG filters and composites five layers per instance, and the Tailwind
   * config next door turns `backdrop-filter` off outright over exactly this cost
   * (~53ms a frame against ~10ms on the settings page). One of these on a page is a
   * flourish; sixteen down a settings page is the thing that config already refused.
   */
  variant?: SwitchVariant
}

export function Switch({ variant = 'pill', ...rest }: SwitchProps) {
  return variant === 'liquid' ? <LiquidSwitch {...rest} /> : <PillSwitch {...rest} />
}

type DrawnSwitchProps = Omit<SwitchProps, 'variant'>

function PillSwitch({ checked, onChange, label, size = 'sm', disabled }: DrawnSwitchProps) {
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

/**
 * The pen's five layers, in the pen's order, at this component's size.
 *
 * TOP TO BOTTOM: a white `cover` that hides everything while the switch is at rest;
 * under it the `wrapper`, a blurred window onto a gooey copy of the track; under that
 * the `shadow`, eleven inset box-shadows that only become visible once the cover
 * lifts; and behind all of it the `knockout`, the full-width track with a black pill
 * punched through it where the knob is. Press, and the cover fades, the blur
 * resolves, the glass shadow arrives and the whole knob bulges to 1.65 — which is the
 * entire trick: the knob is not a thing sitting ON the track, it is a lens looking
 * THROUGH it.
 *
 * SPANS AND NOT DIVS. The pen nests `<div>`s inside its `<button>`, which no parser
 * objects to and the spec does not allow — a button takes phrasing content. Same
 * boxes, legal document, and it matters here because this one ships inside `<form>`s
 * on the repository page.
 */
function LiquidSwitch({ checked, onChange, label, size = 'sm', disabled }: DrawnSwitchProps) {
  const shape = LIQUID[size]

  /**
   * One scope per instance, and it buys two separate things at once.
   *
   * The stylesheet below needs a selector nobody else answers to, and the two SVG
   * filters need ids that are unique in the DOCUMENT — `url(#goo)` resolves against
   * the first match in the page, so two pen-faithful switches would silently share
   * one filter and a third would win the argument. `useId` is what makes that safe
   * under Next's server render as well: a counter or a random suffix would disagree
   * between the two passes and blank the filter on hydration.
   *
   * Its own spelling is `:r3:`, and while a colon is a legal id it is not legal in
   * the selector this doubles as. The punctuation goes; React's stability does not.
   */
  const scope = `ms-liquid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  /**
   * The bulge, held past the pointer.
   *
   * The pen runs a GSAP timeline and flips the attribute in its `onComplete`. There
   * is no timeline here, so the state is the timeline: `data-active` goes up on
   * press, the stylesheet spends `HOLD` milliseconds on the pen's own sequence, and
   * it comes back down. Plain `:active` would not do — it ends the instant a finger
   * lifts, and a tap is shorter than the animation it is supposed to start.
   */
  const [active, setActive] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => clear, [])

  /**
   * `index.css` already collapses every transition duration in the app under
   * `prefers-reduced-motion: reduce`, which is why neither variant carries a guard of
   * its own. A TIMER IS NOT A TRANSITION, though: left alone it would hold the knob
   * bulged and blurred for a third of a second with nothing animating it back, so
   * this one asks. It is the only thing in either variant that does.
   */
  const reduced = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const press = useCallback(() => {
    if (disabled || reduced()) return
    clear()
    setActive(true)
  }, [disabled])

  const drop = useCallback(() => {
    clear()
    setActive(false)
  }, [])

  /**
   * The write goes out on the click and not at the end of the animation, which is the
   * one place this deliberately parts with the pen.
   *
   * The pen owns its own state and can afford to swap `aria-pressed` when the motion
   * finishes. This is a controlled component in front of settings that save on change
   * — a third of a second of lag between the tap and the write would be a third of a
   * second in which the app and the switch disagree, and the class comment at the top
   * of this file is a promise that they never do. So the truth moves first and the
   * drawing catches up: `--complete` is transitioned off `aria-checked`, so if a
   * parent refuses the change the knob simply never leaves.
   */
  const toggle = () => {
    if (disabled) return
    onChange(!checked)
    if (reduced()) return
    setActive(true)
    clear()
    timer.current = setTimeout(() => setActive(false), HOLD)
  }

  const css = `
@property --complete {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}
.${scope} {
  --border: 4px;
  --liquid-off: color-mix(in oklab, var(--liquid-ink, #8a8d99) 20%, var(--liquid-ground, #fff));
  --checked: color-mix(in oklab, var(--liquid-on, currentColor) calc(var(--complete) * 1%), var(--liquid-off));
  --knob-fill: var(--liquid-knob, #fff);
  --transition: 0.2s;
  --ease: ease-out;
  --slide: 0.12s;
  --slide-delay: 0s;
  --complete: 0;
  position: relative;
  flex-shrink: 0;
  height: var(--track-h);
  width: var(--track-w);
  padding: 0;
  border: 0;
  border-radius: 100px;
  background: #0000;
  overflow: visible;
  container-type: inline-size;
  cursor: pointer;
  transition-property: --complete;
  transition-duration: var(--slide);
  transition-timing-function: ease-out;
  transition-delay: var(--slide-delay);
}
.${scope} * { pointer-events: none; }
.${scope}:disabled { cursor: default; }
.${scope}[aria-checked='true'] { --complete: 100; }
.${scope}:focus-visible {
  outline: 3px solid color-mix(in oklab, var(--liquid-on, currentColor) 45%, transparent);
  outline-offset: 2px;
}
.${scope}[data-active='true'] {
  --transition: 0.6s;
  --ease: ${BOUNCE};
  --slide-delay: 0.18s;
}
.${scope} .knockout {
  position: absolute;
  inset: 0;
  height: var(--track-h);
  width: var(--track-w);
  border-radius: 100px;
  filter: url(#${scope}-knockout);
  transform: translate3d(0, 0, 0);
}
.${scope} .indicator--masked {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  height: 100%;
  width: 100%;
  border-radius: 100px;
  background: var(--checked);
  z-index: 12;
  container-type: inline-size;
}
.${scope} .mask {
  position: absolute;
  top: 50%;
  left: var(--border);
  height: calc(100% - (2 * var(--border)));
  width: var(--knob-w);
  background: #000;
  border-radius: 100px;
  translate: calc((var(--complete) / 100) * var(--travel)) -50%;
  transition-property: height, width, margin;
  transition-duration: var(--transition);
  transition-timing-function: var(--ease);
}
.${scope}[data-active='true'] .mask {
  height: calc((100% - (2 * var(--border))) * 1.65);
  width: calc(var(--knob-w) * 1.65);
  margin-left: calc(var(--knob-w) * -0.325);
}
.${scope} .indicator__liquid {
  position: absolute;
  top: 50%;
  left: var(--border);
  height: calc(100% - (2 * var(--border)));
  width: var(--knob-w);
  border-radius: 100px;
  background: #0000;
  container-type: inline-size;
  translate: calc((var(--complete) / 100) * var(--travel)) -50%;
  transition-property: scale;
  transition-duration: var(--transition);
  transition-timing-function: var(--ease);
}
.${scope}[data-active='true'] .indicator__liquid { scale: 1.65; }
.${scope} .shadow {
  position: absolute;
  inset: 0;
  border-radius: 100px;
  opacity: 0;
  z-index: 20;
  box-shadow:
    1px -1px max(1px, calc(2px * var(--u))) hsl(0 0% 100% / 0.5) inset,
    0px -1px max(1px, calc(2px * var(--u))) hsl(0 0% 100% / 0.5) inset,
    -1px -1px max(1px, calc(2px * var(--u))) hsl(0 0% 100% / 0.5) inset,
    1px 1px max(1px, calc(2px * var(--u))) hsl(0 0% 30% / 0.5) inset,
    calc(-8px * var(--u)) calc(4px * var(--u)) calc(10px * var(--u)) calc(-6px * var(--u)) hsl(0 0% 30% / 0.25) inset,
    -1px 1px calc(6px * var(--u)) hsl(0 0% 30% / 0.25) inset,
    -1px -1px calc(8px * var(--u)) hsl(0 0% 60% / 0.15),
    1px 1px 2px hsl(0 0% 30% / 0.15),
    2px 2px calc(6px * var(--u)) hsl(0 0% 30% / 0.15),
    -2px -1px 2px hsl(0 0% 100% / 0.25) inset,
    calc(3px * var(--u)) calc(6px * var(--u)) calc(16px * var(--u)) calc(-6px * var(--u)) hsl(0 0% 30% / 0.5);
  transition: opacity var(--transition) var(--ease);
}
.${scope}[data-active='true'] .shadow { opacity: 1; }
.${scope} .cover {
  position: absolute;
  inset: 0;
  border-radius: 100px;
  background: var(--knob-fill);
  transition: opacity var(--transition) var(--ease);
}
.${scope}[data-active='true'] .cover { opacity: 0; }
.${scope} .wrapper {
  position: absolute;
  inset: 0;
  border-radius: 100px;
  clip-path: inset(0 0 0 0 round 100px);
  filter: blur(calc(6px * var(--u)));
  transition: filter var(--transition) var(--ease);
}
.${scope}[data-active='true'] .wrapper { filter: blur(0px); }
.${scope} .liquids {
  position: absolute;
  inset: 0;
  border-radius: 100px;
  overflow: hidden;
  transform: translate3d(0, 0, 0);
  filter: url(#${scope}-goo);
}
.${scope} .liquid__shadow {
  position: absolute;
  inset: 0;
  border-radius: 100px;
  /* THE RING IS WHAT CLOSES THE LENS. The track above is 60% of the lens on press —
     the pen's own proportion, and the pull that makes the fill read as liquid being
     stretched — which leaves a fifth of the lens bare top and bottom for this inset
     ring to cover from both edges. The pen's 3px blur and 4px spread reach 7px into a
     50px lens against a 10px gap and close it with room to spare; scaled by "u" they
     reach 2.8px into a 16px lens against a 3.2px gap and fall just short, which drew
     a hairline of the page's own ground across the bottom of the bulge. 4 and 6 are
     the same ring with the reach the smallest rung actually needs. */
  box-shadow:
    inset 0 0 calc(4px * var(--u)) calc(6px * var(--u)) var(--checked),
    inset calc(((var(--complete) / 100) * (8px * var(--u))) - (4px * var(--u))) 0 calc(4px * var(--u)) calc(6px * var(--u)) var(--checked);
}
/* THE LIQUID INSIDE THE LENS, and this is the one formula that could not be carried
   over as arithmetic. The pen slides its copy of the track by
   -(travel + 8·border), which on its geometry is a true alignment plus about a
   quarter of the track's width of deliberate over-slide — the lag that makes the
   fill read as liquid being dragged rather than as a picture being panned. Its
   "8 x border" is 28% of a 140px track. Ours is 4px against 40px, so the same
   expression comes to 80% and shoves the fill clean out of the lens: the first
   render of this port showed the page's own background through the knockout hole
   and read as a black blob. So the translate below is the alignment term alone —
   the copy stays continuous with the real track under it — and the lag is carried
   by "left", expressed against the KNOB because the lens is what it is seen in.
   0.18 and 0.36 of the knob are the pen's own 3·border and 6·border as a fraction
   of its 84px window. */
.${scope} .liquid__track {
  position: absolute;
  top: 50%;
  left: 0;
  height: var(--track-h);
  width: var(--track-w);
  background: var(--checked);
  border-radius: 100px;
  translate: calc(-1 * (var(--border) + ((var(--complete) / 100) * var(--travel)))) -50%;
  transition-property: height, left;
  transition-duration: var(--transition);
  transition-timing-function: var(--ease);
}
.${scope}[aria-checked='true']:not([data-active='true']) .liquid__track {
  left: calc(var(--knob-w) * 0.36);
}
.${scope}[data-active='true'] .liquid__track {
  left: calc(var(--knob-w) * 0.18);
  height: 60%;
}
`

  return (
    <>
      {/* The stylesheet travels with the instance rather than living in a `.css` file,
          and that is the design system's constraint rather than a taste: this folder
          is compiled from source by both apps and imports no CSS at all — every other
          component here is Tailwind class literals, which is what both Tailwind
          configs glob for. `@property`, `filter: url(…)` and an eleven-layer
          box-shadow have no class spelling, so they arrive as text that needs no
          build step on either side. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        data-active={active ? 'true' : 'false'}
        onClick={toggle}
        onPointerDown={press}
        onPointerLeave={drop}
        onPointerCancel={drop}
        /* THE THREE COLOURS COME IN AS TOKENS, not as the pen's `hsl(144 …)`.
           `text-accent` is doing the real work: the pen ramps saturation and lightness
           off a hue as the knob travels, which needs a hue, and the app's accent is
           `rgb(var(--c-accent))` with no hue to reach for. So the ramp becomes a
           `color-mix` between two ends and the ON end is picked up as `currentColor`
           — which is how the same component draws the desktop's indigo and whatever
           the theme registry swaps in next, without this file naming either.

           IT HAS TO BE SET ON THE BUTTON AND NOT INHERITED. A `<button>` takes
           `color: buttontext` from the UA sheet rather than its parent's colour, and
           the failure is not a wrong tint but a blank control: `buttontext` is black,
           and black is the one colour the knockout filter exists to delete.

           THE OFF TRACK IS OPAQUE, which is the single place this parts company with
           the pill variant's `bg-ink/20`. A flat track can be translucent because
           there is nothing behind it; this one has a hole punched through it and a
           lens sitting in the hole, so 20% ink over nothing means the page's own
           ground reads straight through the knob while it is open — which drew a
           black bruise in the middle of the bulge on the first render of this. Mixing
           the same 20% into `bg` lands on the same colour the pill variant
           composites to and gives the lens something to actually show.

           THE MIXING IS THE STYLESHEET'S, and that is Tailwind's constraint rather
           than a preference: an arbitrary property holding a `color-mix` of two
           `theme()` calls is silently DROPPED by the arbitrary-value parser — the
           class compiles to nothing at all, not to a warning — so the classes carry
           the two tokens and the rule below does the arithmetic. */
        className={`${scope} text-accent [--liquid-ink:theme(colors.ink/100%)] [--liquid-ground:theme(colors.bg.DEFAULT/100%)] [--liquid-knob:theme(colors.on-brand/100%)]`}
        style={
          {
            '--track-w': `${shape.w}px`,
            '--track-h': `${shape.h}px`,
            '--knob-w': `${shape.knob}px`,
            '--travel': `${shape.travel}px`,
            '--u': shape.u,
          } as CSSProperties
        }
      >
        <span className="knockout">
          <span className="indicator indicator--masked">
            <span className="mask" />
          </span>
        </span>
        <span className="indicator__liquid">
          <span className="shadow" />
          <span className="wrapper">
            <span className="liquids">
              <span className="liquid__shadow" />
              <span className="liquid__track" />
            </span>
          </span>
          <span className="cover" />
        </span>
        {/* Both filters are jh3y's, unchanged but for the deviation the rung sets.
            `goo` is the metaball: blur, then crush the alpha channel's contrast so the
            blurred edges snap back into one surface — which is what welds the sliding
            track to the knob instead of letting it fade out. `knockout` drops every
            black pixel, which is how the mask punches its hole. */}
        <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
          <defs>
            <filter id={`${scope}-goo`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation={shape.goo} result="blurred" />
              <feColorMatrix
                in="blurred"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -10"
                result="gooed"
              />
              <feComposite in="gooed" operator="atop" />
            </filter>
            <filter id={`${scope}-knockout`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -255 -255 -255 0 1"
                result="black-pixels"
              />
              {/* THE PEN'S `feMorphology` IS GONE, and it is the only primitive of
                  jh3y's that this port drops outright.

                  It dilates the black region by half a pixel before the composite,
                  which grows the HOLE rather than the mask — so the knob ends up
                  sitting in an opening slightly larger than itself and the page's own
                  ground shows as a ring around it. On an 84px knob that ring is half a
                  pixel of smoothing nobody can find. On a 20px one it is the first
                  thing you see, and it reads as the knob floating in its track rather
                  than filling it.

                  Swept across 0, 0.1, 0.2, 0.5 and 1: the ring grows with the radius
                  and is absent only at 0. The edge it was smoothing needs no smoothing
                  here — the alpha row above already resolves the mask cleanly — so the
                  composite runs straight off `black-pixels`, and each instance carries
                  one filter primitive fewer. */}
              <feComposite in="SourceGraphic" in2="black-pixels" operator="out" />
            </filter>
          </defs>
        </svg>
      </button>
    </>
  )
}
