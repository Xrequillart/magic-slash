import { describe, it, expect } from 'vitest'
import { centerCropBox } from './avatar'
import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  clampCropZoom,
  clampOffset,
  sourceRectFor,
  type CropState,
} from './avatarCrop'

/**
 * The invariant every rectangle this module produces has to satisfy, asserted in
 * every case below and not only in the ones about clamping.
 *
 * It is the whole safety property: `drawImage` given a rectangle that pokes one
 * pixel outside the bitmap does not throw and does not warn — it simply leaves
 * that strip transparent, which shows up as a hairline of nothing INSIDE the
 * round mask. A test that only checked the obvious edge cases would let a
 * rounding change reintroduce that anywhere else.
 */
function expectInsideTheImage(
  rect: { sx: number; sy: number; sSize: number },
  naturalWidth: number,
  naturalHeight: number,
) {
  expect(rect.sx).toBeGreaterThanOrEqual(0)
  expect(rect.sy).toBeGreaterThanOrEqual(0)
  expect(rect.sx + rect.sSize).toBeLessThanOrEqual(naturalWidth)
  expect(rect.sy + rect.sSize).toBeLessThanOrEqual(naturalHeight)
}

/**
 * A state to hand `sourceRectFor`, with the pan defaulted away.
 *
 * One builder rather than a dozen inline literals: every case below varies two or
 * three of the five fields, and spelling all five each time buries which ones.
 */
function at(
  naturalWidth: number,
  naturalHeight: number,
  zoom: number,
  offsetX = 0,
  offsetY = 0,
): CropState {
  return { naturalWidth, naturalHeight, zoom, offsetX, offsetY }
}

/** A centred, fully zoomed-out state for an image of the given size. */
function centred(naturalWidth: number, naturalHeight: number): CropState {
  return at(naturalWidth, naturalHeight, 1)
}

describe('clampCropZoom', () => {
  it('never zooms out past the largest square the image contains', () => {
    // Below 1 the crop square would be wider than the image, which is precisely
    // the gap inside the round mask the whole module exists to prevent.
    expect(clampCropZoom(0.5)).toBe(MIN_CROP_ZOOM)
    expect(clampCropZoom(-3)).toBe(MIN_CROP_ZOOM)
    expect(clampCropZoom(0)).toBe(MIN_CROP_ZOOM)
  })

  it('caps at MAX_CROP_ZOOM so the square cannot shrink to a handful of pixels', () => {
    expect(clampCropZoom(1000)).toBe(MAX_CROP_ZOOM)
    expect(clampCropZoom(Infinity)).toBe(MAX_CROP_ZOOM)
  })

  it('leaves a zoom already in range alone', () => {
    expect(clampCropZoom(1)).toBe(1)
    expect(clampCropZoom(2.5)).toBe(2.5)
    expect(clampCropZoom(MAX_CROP_ZOOM)).toBe(MAX_CROP_ZOOM)
  })

  it('reads NaN as fully zoomed out rather than passing it on', () => {
    // NaN would travel into `drawImage`'s source rectangle, where it draws
    // nothing at all and reports nothing at all.
    expect(clampCropZoom(NaN)).toBe(MIN_CROP_ZOOM)
  })
})

describe('sourceRectFor', () => {
  it('takes a square image whole when fully zoomed out', () => {
    const rect = sourceRectFor(centred(800, 800))
    expect(rect).toEqual({ sx: 0, sy: 0, sSize: 800 })
    expectInsideTheImage(rect, 800, 800)
  })

  it('crops the sides of a landscape image, evenly, when fully zoomed out', () => {
    const rect = sourceRectFor(centred(1000, 600))
    expect(rect).toEqual({ sx: 200, sy: 0, sSize: 600 })
    expectInsideTheImage(rect, 1000, 600)
  })

  it('crops the top and bottom of a portrait image, evenly, when fully zoomed out', () => {
    const rect = sourceRectFor(centred(600, 1000))
    expect(rect).toEqual({ sx: 0, sy: 200, sSize: 600 })
    expectInsideTheImage(rect, 600, 1000)
  })

  // The automatic crop this feature replaces is still the STARTING POINT of the
  // manual one, and "still the same box" is only true because both floor the same
  // way: the size comes straight out of `centerCropBox`, and the origin is the
  // same `Math.floor((natural - size) / 2)` expression with a zero offset added.
  // Compute one from the other rather than restating literals, so a change to the
  // rounding convention in `avatar.ts` fails here instead of drifting quietly.
  it('is exactly centerCropBox at zoom 1 with no pan', () => {
    for (const [width, height] of [[800, 800], [1000, 600], [600, 1000], [4032, 3024], [101, 100]]) {
      const box = centerCropBox({ width, height })
      const rect = sourceRectFor(centred(width, height))
      expect(rect, `${width}x${height}`).toEqual({ sx: box.x, sy: box.y, sSize: box.size })
      expectInsideTheImage(rect, width, height)
    }
  })

  it('halves the square at zoom 2 and keeps it centred', () => {
    const rect = sourceRectFor(at(800, 800, 2))
    expect(rect).toEqual({ sx: 200, sy: 200, sSize: 400 })
    expectInsideTheImage(rect, 800, 800)
  })

  it('measures the zoom against the SHORT edge, so a wide photo zooms the same as a tall one', () => {
    // 600 is the short edge in both, so both give a 300 px square at zoom 2 — the
    // user's zoom means the same thing whichever way the photo is turned.
    const landscape = sourceRectFor(at(1000, 600, 2))
    const portrait = sourceRectFor(at(600, 1000, 2))
    expect(landscape.sSize).toBe(300)
    expect(portrait.sSize).toBe(300)
    expectInsideTheImage(landscape, 1000, 600)
    expectInsideTheImage(portrait, 600, 1000)
  })

  it('pans in source pixels: the rectangle moves by exactly what it was given', () => {
    const rect = sourceRectFor(at(1000, 600, 2, 120, -40))
    // Centred would be sx 350 / sy 150; the offsets displace the square's centre.
    expect(rect).toEqual({ sx: 470, sy: 110, sSize: 300 })
    expectInsideTheImage(rect, 1000, 600)
  })

  // AC2, stated as arithmetic. A pan far past the edge is not an error and is not
  // refused — it stops at the edge, which is what makes dragging feel like moving
  // a photo under a hole rather than like hitting a wall of validation.
  it('clamps a pan that would expose a gap, on all four edges', () => {
    const base = { naturalWidth: 1000, naturalHeight: 600, zoom: 2 }
    const right = sourceRectFor({ ...base, offsetX: 99999, offsetY: 0 })
    expect(right.sx + right.sSize).toBe(1000)
    expectInsideTheImage(right, 1000, 600)

    const left = sourceRectFor({ ...base, offsetX: -99999, offsetY: 0 })
    expect(left.sx).toBe(0)
    expectInsideTheImage(left, 1000, 600)

    const bottom = sourceRectFor({ ...base, offsetX: 0, offsetY: 99999 })
    expect(bottom.sy + bottom.sSize).toBe(600)
    expectInsideTheImage(bottom, 1000, 600)

    const top = sourceRectFor({ ...base, offsetX: 0, offsetY: -99999 })
    expect(top.sy).toBe(0)
    expectInsideTheImage(top, 1000, 600)
  })

  // The order the UI actually produces: pan hard against an edge while zoomed in,
  // then zoom back out. The square grows around its centre, and a centre that was
  // legal at zoom 4 is not legal at zoom 1 — nothing but the clamp inside this
  // function stops the enlarged square from hanging off the side.
  it('pulls the crop back inside when a zoom-out outgrows the pan', () => {
    const panned = { naturalWidth: 1000, naturalHeight: 600, zoom: 4, offsetX: 375, offsetY: 0 }
    // Legal while zoomed in: the 150 px square has 425 px of room either side.
    expect(sourceRectFor(panned)).toEqual({ sx: 800, sy: 225, sSize: 150 })
    expectInsideTheImage(sourceRectFor(panned), 1000, 600)

    // The same 375 px pan with a 600 px square would put the right edge 175 px
    // past the picture. It stops flush against it instead — the pan is kept as far
    // as it can go rather than thrown away and re-centred.
    const zoomedOut = sourceRectFor({ ...panned, zoom: 1 })
    expect(zoomedOut).toEqual({ sx: 400, sy: 0, sSize: 600 })
    expect(zoomedOut.sx + zoomedOut.sSize).toBe(1000)
    expectInsideTheImage(zoomedOut, 1000, 600)
  })

  it('honours the MAX_CROP_ZOOM cap rather than the number it was handed', () => {
    const capped = sourceRectFor(at(800, 800, MAX_CROP_ZOOM))
    const absurd = sourceRectFor(at(800, 800, 500))
    expect(capped.sSize).toBe(100)
    expect(absurd).toEqual(capped)
    expectInsideTheImage(absurd, 800, 800)
  })

  it('never shrinks to a zero-pixel square on a tiny image at full zoom', () => {
    // 4 / 8 floors to 0, and a zero-sized source rectangle makes `drawImage` a
    // silent no-op: an empty avatar rather than a small one.
    const rect = sourceRectFor(at(4, 4, MAX_CROP_ZOOM))
    expect(rect.sSize).toBeGreaterThanOrEqual(1)
    expectInsideTheImage(rect, 4, 4)
  })

  // The odd leftover, not a fractional DIMENSION: `naturalWidth`/`naturalHeight`
  // are always integers. 101 - 100 leaves 1 px of slack, and half of it is floored
  // away rather than claimed.
  it('floors an odd leftover instead of claiming half a pixel', () => {
    const rect = sourceRectFor(centred(101, 100))
    expect(rect).toEqual({ sx: 0, sy: 0, sSize: 100 })
    expectInsideTheImage(rect, 101, 100)
  })

  // Same contract as `centerCropBox`: an image with no pixels yields a zero box at
  // the origin, never NaN. Canvas coordinates swallow NaN without complaining.
  it('answers a zero box for a degenerate image rather than emitting NaN', () => {
    const degenerate = [
      { naturalWidth: 0, naturalHeight: 0 },
      { naturalWidth: -10, naturalHeight: 10 },
      { naturalWidth: NaN, naturalHeight: 100 },
      { naturalWidth: 100, naturalHeight: Infinity },
    ]
    for (const size of degenerate) {
      const rect = sourceRectFor({ ...size, zoom: 2, offsetX: 50, offsetY: 50 })
      expect(rect, JSON.stringify(size)).toEqual({ sx: 0, sy: 0, sSize: 0 })
    }
  })

  // NaN only. Infinity is non-finite too but is NOT read as no pan — it clamps to
  // the axis limit, which is the right answer and a different one.
  it('reads a NaN pan as no pan at all', () => {
    const rect = sourceRectFor(at(800, 800, 2, NaN, NaN))
    expect(rect).toEqual({ sx: 200, sy: 200, sSize: 400 })
    expectInsideTheImage(rect, 800, 800)
  })
})

describe('clampOffset', () => {
  // Half the slack, not all of it: moving the square's centre by one pixel moves
  // both of its edges by one pixel, so the centre may only travel half the room
  // the square leaves inside the image.
  it('allows exactly half the leftover room on each axis', () => {
    const state = at(1000, 600, 2, 350, 150)
    expect(clampOffset(state)).toEqual({ offsetX: 350, offsetY: 150 })
    expect(clampOffset({ ...state, offsetX: 351, offsetY: 151 })).toEqual({ offsetX: 350, offsetY: 150 })
    expect(clampOffset({ ...state, offsetX: -351, offsetY: -151 })).toEqual({ offsetX: -350, offsetY: -150 })
  })

  it('pins the pan to zero on the axis the crop already fills', () => {
    // A landscape image fully zoomed out: the square is as tall as the picture, so
    // there is no vertical room at all and a vertical drag must do nothing.
    expect(clampOffset(at(1000, 600, 1, 0, 80)))
      .toEqual({ offsetX: 0, offsetY: 0 })
  })

  it('leaves a pan that is already inside the image alone', () => {
    expect(clampOffset(at(1000, 600, 2, 10, -20)))
      .toEqual({ offsetX: 10, offsetY: -20 })
  })

  it('answers no pan for a degenerate image', () => {
    expect(clampOffset(at(0, 0, 2, 40, 40)))
      .toEqual({ offsetX: 0, offsetY: 0 })
  })

  // The renderer stores what this returns and feeds it back in on the next drag
  // frame, so a second pass has to be a no-op or the crop would creep.
  it('is idempotent', () => {
    const state = at(1000, 600, 3, 9999, -9999)
    const once = clampOffset(state)
    expect(clampOffset({ ...state, ...once })).toEqual(once)
  })
})
