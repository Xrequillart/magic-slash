import { describe, expect, it } from 'vitest'

import {
  MODAL_COLUMN_GUTTER,
  MODAL_COLUMN_MEASURE,
  MODAL_COLUMN_PADDING,
  PAGE_MODAL_SIZES,
  PAGE_MODAL_WIDTH,
} from './modalSizes'

/**
 * The one piece of geometry in this folder that is a CLAIM rather than a choice: the
 * narrow overlay is exactly its content plus its padding.
 *
 * Worth a test because the claim is invisible in the drawing — a panel 40px too wide
 * looks like a panel, and the only tell is a sliver of empty plate past the last card
 * that nobody reports. The numbers also live one import away from a `.tsx` this suite
 * cannot load, which is why they are their own module.
 */
describe('PAGE_MODAL_WIDTH', () => {
  it('gives every size a width', () => {
    for (const size of PAGE_MODAL_SIZES) {
      expect(PAGE_MODAL_WIDTH[size], size).toMatch(/^\d+(\.\d+)?(px|rem)$/)
    }
  })

  it('makes the column panel the measure plus both gutters, to the pixel', () => {
    expect(PAGE_MODAL_WIDTH.column).toBe(`${MODAL_COLUMN_MEASURE + MODAL_COLUMN_GUTTER * 2}px`)
  })

  it('pads the travelling layer by the same gutter the panel was measured from', () => {
    // The padding is applied by the caller, to the element that slides — see the
    // constant. If these two ever part, the panel is a few pixels wider or narrower
    // than the content it was supposed to fit exactly.
    expect(MODAL_COLUMN_PADDING.paddingLeft).toBe(MODAL_COLUMN_GUTTER)
    expect(MODAL_COLUMN_PADDING.paddingRight).toBe(MODAL_COLUMN_GUTTER)
  })

  it('keeps the column narrower than the page it was carved out of', () => {
    const page = parseFloat(PAGE_MODAL_WIDTH.page) * 16
    expect(parseFloat(PAGE_MODAL_WIDTH.column)).toBeLessThan(page)
  })
})
