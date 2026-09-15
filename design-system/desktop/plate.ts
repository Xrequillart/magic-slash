/**
 * THE ONE OPAQUE PLATE — what a control stands on when the ground under it is frost.
 *
 * `ControlCenter`'s sheet is a thin tint over the blurred app, and on it every translucent
 * plate in this folder fails the same way: `bg-surface` (6% ink) and `bg-ink/10` are a
 * plate at whatever the frost happens to be, so a tile reads as a hole and the card beside
 * it as a different, lighter hole. The product owner put it in one line — the tiles and
 * the card were not the same colour, and both were transparent.
 *
 * `bg-bg-tertiary` alone, the raised-menu token, is OPAQUE but too close to the floor: in
 * the dark theme it is 28 over a floor of 10, and on a 60% tint of that floor a tile at 28
 * is a tile you have to look for. So the plate is the tertiary token lifted a step towards
 * the ink — `color-mix` in the stylesheet, which is theme-aware for free: in a light theme
 * the ink is dark and the lift goes the other way.
 *
 * SPELLED AS ONE ARBITRARY CLASS and shared by name, because four components draw it —
 * `ToggleButton`'s off state, `Stepper`'s pill, `SelectIcon`'s `solid` tone and `Card`'s
 * `raised` ground — and "the same colour" is a promise only one spelling can keep. The
 * `color:` hint is what tells Tailwind this is a colour and not an image; the underscores
 * are its spelling of spaces. `theme()` is NOT used inside it, deliberately: Tailwind's
 * arbitrary-value parser drops a `color-mix` of two `theme()` calls silently (see `Switch`),
 * where the raw variables it does emit.
 */
export const RAISED_PLATE =
  'bg-[color:color-mix(in_srgb,rgb(var(--c-bg-tertiary)),rgb(var(--c-ink))_9%)]'

/** The hover for anything on `RAISED_PLATE`: a brightness step, never a second colour. */
export const RAISED_PLATE_HOVER = 'hover:brightness-125'
