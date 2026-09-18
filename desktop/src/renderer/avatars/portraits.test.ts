import { describe, it, expect } from 'vitest'
import { DEFAULT_PORTRAIT_ID, DEFAULT_PORTRAIT_SRC } from '@ds/desktop/defaultAvatar'
import { AVATAR_MAX_BYTES, AVATAR_SIZE, parseAvatarDataUrl } from '../../avatar'
import { PORTRAITS } from './portraits'

/**
 * WHAT THIS SUITE IS ACTUALLY FOR: a portrait is not a picture that gets prepared for
 * upload, it IS the upload payload — the very string handed to `profile.setAvatar()`.
 * So the thing worth asserting is not that the file parses as an image but that the
 * MAIN PROCESS WOULD ACCEPT IT, and `parseAvatarDataUrl` is the function that decides
 * that. Running the catalogue through it here is what turns a bad re-encode into a red
 * test instead of a toast saying "failed to save your photo" for one face in thirty.
 *
 * Node, no DOM: `parseAvatarDataUrl` uses `atob`, which is a standard global in both,
 * and nothing in this file touches a canvas. See `avatar.ts`'s own header on why that
 * module is deliberately free of `Buffer` and of `electron`.
 */

/**
 * The stored edge of a lossy WebP, read out of its own header.
 *
 * Twenty-odd bytes of container parsing rather than an image library, because the
 * suite runs on the ROOT `node_modules` and there is nothing there to decode with —
 * the same constraint that keeps `avatarSizes.ts` importing nothing. The layout is
 * fixed: `RIFF`, a length, `WEBP`, then a `VP8 ` chunk whose frame header opens with
 * the three-byte start code `9d 01 2a` followed by two 14-bit little-endian
 * dimensions. Anything that is not exactly that shape returns null, so a catalogue
 * re-encoded to lossless or to an extended container fails loudly here rather than
 * being silently unmeasured.
 */
function webpSize(bytes: Uint8Array): { width: number; height: number } | null {
  const chunk = String.fromCharCode(...bytes.slice(12, 16))
  if (chunk !== 'VP8 ') return null
  const startCode = [...bytes.slice(23, 26)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (startCode !== '9d012a') return null
  const read = (at: number) => ((bytes[at] | (bytes[at + 1] << 8)) & 0x3fff)
  return { width: read(26), height: read(28) }
}

describe('the portrait catalogue', () => {
  it('offers thirty faces under distinct ids', () => {
    expect(PORTRAITS).toHaveLength(30)
    expect(new Set(PORTRAITS.map((p) => p.id)).size).toBe(PORTRAITS.length)
  })

  it('leads with the default, and carries its one copy of the bytes', () => {
    // The default lives in the design system because `Avatar` draws it; this list
    // re-exports that copy rather than holding a second. A catalogue that had drifted
    // into its own encoding of the same drawing would put two faces in the app that
    // are the same picture and different bytes — and the picker would then fail to
    // ring the tile of the account already wearing it.
    expect(PORTRAITS[0].id).toBe(DEFAULT_PORTRAIT_ID)
    expect(PORTRAITS[0].src).toBe(DEFAULT_PORTRAIT_SRC)
  })

  it('carries payloads the main process will accept', () => {
    for (const portrait of PORTRAITS) {
      const parsed = parseAvatarDataUrl(portrait.src)
      // Narrowed rather than asserted on `.ok`, so a refusal names the portrait AND
      // the reason instead of reporting `false !== true`.
      if (!parsed.ok) throw new Error(`${portrait.id} would be refused: ${parsed.reason}`)
      expect(parsed.bytes.length, portrait.id).toBeLessThan(AVATAR_MAX_BYTES)
    }
  })

  it('stores every face at the one edge the app draws', () => {
    // 256 is `AVATAR_SIZE` — what the crop dialog encodes a photograph to. A portrait
    // at any other edge would be an avatar that resamples differently from a photo on
    // the same 44px card.
    for (const portrait of PORTRAITS) {
      const parsed = parseAvatarDataUrl(portrait.src)
      if (!parsed.ok) throw new Error(`${portrait.id} would be refused: ${parsed.reason}`)
      expect(webpSize(parsed.bytes), portrait.id).toEqual({
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
      })
    }
  })
})
