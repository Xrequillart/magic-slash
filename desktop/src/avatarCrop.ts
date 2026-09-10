/**
 * The geometry of a hand-placed avatar crop: where the square the user dragged
 * sits inside the source image.
 *
 * WHY A SECOND MODULE NEXT TO avatar.ts
 * ---------------------------------------------------------------------------
 * `avatar.ts` answers "what may be stored, and where" — the cap, the formats, the
 * bucket, the automatic centre square. This one answers a different question that
 * only exists once a human is allowed to move the square around: given a zoom and
 * a pan, WHICH pixels of the source are the avatar? Keeping it apart means the
 * upload path in the main process still imports only the rules it needs, and the
 * crop maths stays testable on its own.
 *
 * DELIBERATELY PURE, for the same reason and under the same rule as `avatar.ts`:
 * no `electron`, no `@supabase/supabase-js`, no `fs`, no React, at any depth. The
 * only thing it imports is `avatar.ts`, which is pure itself. The root vitest
 * suite runs both with no Electron and no DOM around.
 *
 * THE COORDINATE CONVENTION, which is the whole design
 * ---------------------------------------------------------------------------
 * Everything here is expressed in SOURCE PIXELS and nothing here knows how big
 * the crop is drawn on screen:
 *
 *   * `zoom` is a ratio, not a length. `zoom === 1` means "the crop square is the
 *     largest square the image can give", i.e. exactly `centerCropBox`'s square;
 *     `zoom === 2` means the square is half as wide, so the user sees twice as
 *     much of the face. It is therefore always `>= 1` — zooming out past 1 would
 *     ask for a square bigger than the image, which is the gap inside the round
 *     mask this module exists to make impossible.
 *
 *   * `offsetX` / `offsetY` are the displacement of the crop square's CENTRE from
 *     the image's centre, in source pixels. Zero is centred, which is why
 *     `sourceRectFor` at zoom 1 and no offset returns `centerCropBox`'s box
 *     exactly.
 *
 * A mask size in pixels does NOT appear in any signature, on purpose. An earlier
 * draft threaded the on-screen mask width through these functions, which made the
 * saved rectangle depend on how big the dialog happened to be — resize the window
 * between the drag and the confirm and the stored photo is not the one that was
 * on screen. The renderer converts a pointer delta in CSS pixels into source
 * pixels at the one place it must (`delta * sSize / maskCssSize`) and hands the
 * result here already in this module's units.
 *
 * ROUNDING is `avatar.ts`'s decision, not a second one. Everything is floored the
 * way `centerCropBox` floors, and the containment invariant
 * (`sx >= 0`, `sy >= 0`, `sx + sSize <= naturalWidth`, `sy + sSize <= naturalHeight`)
 * holds AFTER the rounding, not before it. That invariant is load-bearing: a
 * rectangle one pixel past the edge makes `drawImage` read outside the bitmap and
 * paint a transparent sliver INSIDE the round mask, which looks like a rendering
 * bug rather than an off-by-one.
 */

import { centerCropBox } from './avatar'

/**
 * The closest the user may get. `zoom === 1` is the whole image's largest square;
 * this is one eighth of its edge, so a 2000 px photo can be cropped down to a
 * 250 px square and no further.
 *
 * A cap rather than an open-ended slider because the stored object is 256 px:
 * past this point every extra step of zoom is upscaling blur, and without a cap a
 * few flicks of a trackpad wheel land on a four-pixel square that encodes as a
 * flat colour.
 *
 * CROP in the name, and in `MIN_CROP_ZOOM` and `clampCropZoom` beside it, because
 * `types.ts` already exports `MAX_ZOOM`, `MIN_ZOOM` and `clampZoom` for the
 * INTERFACE scale — a 0.8-1.5 Electron zoom factor that has nothing to do with a
 * photo. Both modules sit in `desktop/src/`, so an auto-import that reached for
 * the wrong one would type-check and silently cap this dialog's zoom at 1.5.
 */
export const MAX_CROP_ZOOM = 8

/** The furthest out: the largest square the image contains. See the header. */
export const MIN_CROP_ZOOM = 1

/** Source dimensions plus the transform the user has dialled in. */
export interface CropState {
  naturalWidth: number
  naturalHeight: number
  zoom: number
  offsetX: number
  offsetY: number
}

/** A square in source pixels, in the order `drawImage`'s nine-argument form wants it. */
export interface SourceRect {
  sx: number
  sy: number
  sSize: number
}

/**
 * `zoom`, forced into the range the rest of this module assumes.
 *
 * Exported because the renderer needs the same ceiling for its `+` button and its
 * wheel handler — a component that clamped to its own number would let the button
 * and the maths disagree about what "fully zoomed in" is.
 *
 * Only NaN is special-cased, and it becomes MIN_CROP_ZOOM: the infinities already
 * land on the right end of the range through `Math.min`/`Math.max`, whereas NaN
 * passes straight through both and would reach canvas coordinates, where it draws
 * nothing and reports nothing.
 */
export function clampCropZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return MIN_CROP_ZOOM
  return Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, zoom))
}

/**
 * The edge of the crop square, in source pixels, for a given zoom.
 *
 * `centerCropBox` decides the zoom-1 size and NOTHING here recomputes it: the
 * zoom-1 square is `box.size` itself, and every other zoom is that same number
 * divided down. That is what makes the flooring convention `avatar.ts`'s single
 * decision rather than a rule restated here — re-deriving `min(width, height)`
 * locally would be a second, unfloored copy of it that could drift.
 *
 * No upper clamp is needed, and that is the point: `clampCropZoom` is `>= 1`, so
 * `box.size / zoom` can never exceed `box.size`, and the square is inside the
 * bitmap at every zoom by construction. `Math.max(1, …)` is the only guard left —
 * it stops MAX_CROP_ZOOM on a very small image from flooring to a zero-pixel
 * square, which `drawImage` treats as "draw nothing" rather than as an error.
 */
function cropSizeFor(naturalWidth: number, naturalHeight: number, zoom: number): number {
  const box = centerCropBox({ width: naturalWidth, height: naturalHeight })
  if (box.size <= 0) return 0
  return Math.max(1, Math.floor(box.size / clampCropZoom(zoom)))
}

/**
 * The pan clamp, for a crop square whose size the caller has ALREADY worked out.
 *
 * Split out so `sourceRectFor` can hand in the size it just computed rather than
 * making `clampOffset` compute the very same thing a second time on every frame
 * of a drag. `clampOffset` keeps the public shape and is a one-line wrapper.
 *
 * The limit is half the slack on each axis, because the centre moving by `d`
 * moves both edges by `d`: with a square of `s` inside a width of `w`, the
 * square's left edge is at `(w - s) / 2 + offsetX`, which is `>= 0` and
 * `<= w - s` exactly when `|offsetX| <= (w - s) / 2`. It needs no `Math.max(0, …)`
 * floor of its own: `size` comes from `cropSizeFor`, which never returns more
 * than `centerCropBox`'s square, so the slack is never negative.
 *
 * A NaN offset is read as no pan, for the reason `clampCropZoom` refuses one — it
 * survives both comparisons below and would reach canvas coordinates intact.
 */
function clampOffsetForSize(
  state: CropState,
  size: number,
): { offsetX: number; offsetY: number } {
  const { naturalWidth, naturalHeight, offsetX, offsetY } = state
  const limitX = (naturalWidth - size) / 2
  const limitY = (naturalHeight - size) / 2
  const x = Number.isNaN(offsetX) ? 0 : offsetX
  const y = Number.isNaN(offsetY) ? 0 : offsetY
  return {
    offsetX: Math.min(limitX, Math.max(-limitX, x)),
    offsetY: Math.min(limitY, Math.max(-limitY, y)),
  }
}

/**
 * The pan, brought back inside the image.
 *
 * THIS is the function that makes the round mask impossible to break: whatever a
 * drag, a wheel or a zoom button asks for, the crop square is put back so that all
 * four of its edges are still on the picture. The renderer routes every
 * interaction through it and stores what comes back, so the state it holds is
 * always already legal — which is what makes a zoom-out after a pan snap the image
 * back against the edge instead of revealing a transparent wedge.
 *
 * Degenerate dimensions give a zero pan, mirroring `centerCropBox`'s zero box: an
 * image with no pixels has nowhere to pan to.
 */
export function clampOffset(state: CropState): { offsetX: number; offsetY: number } {
  const size = cropSizeFor(state.naturalWidth, state.naturalHeight, state.zoom)
  if (size <= 0) return { offsetX: 0, offsetY: 0 }
  return clampOffsetForSize(state, size)
}

/**
 * The square of source pixels the user has framed, ready for the nine-argument
 * `drawImage(image, sx, sy, sSize, sSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE)`.
 *
 * It clamps the offset itself rather than trusting the caller. Both the preview
 * and the export call this, and a preview that drew an unclamped rectangle while
 * the export drew a clamped one would be a UI that shows one crop and saves
 * another — the exact failure the shared function exists to rule out. Clamping
 * here also means the containment invariant is a property of this function, not a
 * property of its call sites.
 *
 * At `zoom === 1` with no offset the result is `centerCropBox`'s box, to the
 * pixel. That is only true because both floor the same way: the size comes
 * straight from `centerCropBox`, and `Math.floor((w - size) / 2 + 0)` is the
 * expression `centerCropBox` uses for its origin.
 */
export function sourceRectFor(state: CropState): SourceRect {
  const { naturalWidth, naturalHeight } = state
  const sSize = cropSizeFor(naturalWidth, naturalHeight, state.zoom)
  if (sSize <= 0) return { sx: 0, sy: 0, sSize: 0 }

  // `clampOffsetForSize` rather than `clampOffset`, so the size above is computed
  // once per rect instead of twice. It also needs no pre-clamped zoom: the size is
  // the only thing the zoom feeds, and `cropSizeFor` clamped it already.
  const { offsetX, offsetY } = clampOffsetForSize(state, sSize)

  // Floored, like `centerCropBox`'s origin: at the positive limit the unfloored
  // value is exactly `natural - sSize`, so flooring can only move the square
  // further inside the bitmap, never past the far edge.
  return {
    sx: Math.floor((naturalWidth - sSize) / 2 + offsetX),
    sy: Math.floor((naturalHeight - sSize) / 2 + offsetY),
    sSize,
  }
}
