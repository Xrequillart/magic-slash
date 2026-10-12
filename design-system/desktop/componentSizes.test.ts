import { describe, expect, it } from 'vitest'

import { AVATAR_SIZES } from './avatarSizes'
import { COMPONENT_SIZES } from './componentSizes'

/**
 * The ladder, asserted where it can be.
 *
 * Only two of the folder's size tables are reachable from this suite — it runs on the
 * ROOT `node_modules`, where React does not exist, so anything importing a `.tsx` fails
 * to RESOLVE. `componentSizes.ts` and `avatarSizes.ts` both import nothing, which is
 * the whole reason they are separate modules (see the note at the top of each).
 *
 * WHAT THIS IS ACTUALLY FOR is the second test. `avatarSizes.ts` cannot import
 * `ComponentSize` without giving up its own rule, so it SPELLS THE LADDER OUT — and a
 * copy is a thing that drifts silently. A rung added to the real scale and not to the
 * copy is a type error nowhere and a missing avatar geometry at runtime; this is what
 * turns it into a failing test instead.
 */
describe('ComponentSize', () => {
  it('is seven rungs, smallest first', () => {
    expect(COMPONENT_SIZES).toEqual(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'])
  })

  it('is spelled identically by avatarSizes, which cannot import it', () => {
    expect(Object.keys(AVATAR_SIZES)).toEqual([...COMPONENT_SIZES])
  })

  it('gives every rung a complete avatar geometry', () => {
    for (const size of COMPONENT_SIZES) {
      const geometry = AVATAR_SIZES[size]
      expect(geometry.box, size).toMatch(/^w-\S+ h-\S+$/)
      expect(COMPONENT_SIZES).toContain(geometry.glyph)
      expect(COMPONENT_SIZES).toContain(geometry.bare)
      expect(COMPONENT_SIZES).toContain(geometry.initial)
    }
  })
})
