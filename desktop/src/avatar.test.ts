import { describe, it, expect } from 'vitest'
import {
  AVATAR_BUCKET,
  AVATAR_DATA_URL_PREFIX,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_DATA_URL_LENGTH,
  AVATAR_MIME_TYPE,
  AVATAR_SIZE,
  avatarObjectPath,
  centerCropBox,
  parseAvatarDataUrl,
  validateAvatarFile,
} from './avatar'

describe('avatarObjectPath', () => {
  it('keys the object by uid so the storage policies can match profiles RLS', () => {
    expect(avatarObjectPath('user-1')).toBe('user-1/avatar.webp')
  })

  it('always ends in .webp, whatever the user picked', () => {
    expect(avatarObjectPath('abc')).toMatch(/\.webp$/)
  })

  // The path's extension and the declared content type are one decision made in
  // two places (the object key, and the `contentType` on the upload). If they ever
  // disagree, the bucket stores a WebP under a name that says otherwise.
  it('names the same format the stored mime declares', () => {
    expect(AVATAR_MIME_TYPE).toBe('image/webp')
    expect(avatarObjectPath('u')).toContain(AVATAR_MIME_TYPE.replace('image/', ''))
  })
})

describe('AVATAR_BUCKET', () => {
  // Four production call sites name this bucket, and so do the avatars_* policies
  // in SQL. Pinning it here is what makes a rename a one-line change.
  it('is the bucket the storage policies are written against', () => {
    expect(AVATAR_BUCKET).toBe('avatars')
  })
})

describe('validateAvatarFile', () => {
  // The mime comes back with the verdict so the main process never re-derives it
  // from the path — one decision, one answer. `jpg` and `jpeg` are the same format
  // under two names, which is exactly the mapping a caller should not have to redo.
  it('accepts the four raster formats we can crop, and names each one', () => {
    const expected: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    }
    for (const [ext, mime] of Object.entries(expected)) {
      expect(validateAvatarFile({ path: `/tmp/me.${ext}`, size: 1024 }), ext).toEqual({ ok: true, mime })
    }
  })

  it('accepts an upper-case extension', () => {
    expect(validateAvatarFile({ path: '/tmp/ME.PNG', size: 1024 })).toEqual({
      ok: true,
      mime: 'image/png',
    })
  })

  it('refuses an svg — neither canvas nor nativeImage rasterises it, and it carries script', () => {
    expect(validateAvatarFile({ path: '/tmp/logo.svg', size: 2048 })).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
  })

  it('refuses a file that is not an image at all', () => {
    expect(validateAvatarFile({ path: '/tmp/clip.mp4', size: 2048 })).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
  })

  it('refuses a file with no extension', () => {
    expect(validateAvatarFile({ path: '/tmp/avatar', size: 2048 })).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
  })

  it('is not fooled by a dot in a directory name', () => {
    expect(validateAvatarFile({ path: '/tmp/my.photos/avatar', size: 2048 })).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
  })

  it('refuses a file over the cap', () => {
    expect(validateAvatarFile({ path: '/tmp/huge.png', size: AVATAR_MAX_BYTES + 1 })).toEqual({
      ok: false,
      reason: 'too_large',
    })
  })

  it('accepts a file exactly at the cap, rather than off by one', () => {
    expect(validateAvatarFile({ path: '/tmp/big.png', size: AVATAR_MAX_BYTES })).toEqual({
      ok: true,
      mime: 'image/png',
    })
  })

  // The type is the more specific verdict: telling someone their .mp4 is "too
  // large" would have them go looking for a smaller video.
  it('reports the wrong type before the size when both are wrong', () => {
    expect(validateAvatarFile({ path: '/tmp/movie.mov', size: AVATAR_MAX_BYTES * 4 })).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
  })

  it('reports a failed stat as unreadable rather than as a verdict on the file', () => {
    expect(validateAvatarFile({ path: '', size: 10 })).toEqual({ ok: false, reason: 'unreadable' })
    expect(validateAvatarFile({ path: '/tmp/empty.png', size: 0 })).toEqual({ ok: false, reason: 'unreadable' })
    expect(validateAvatarFile({ path: '/tmp/odd.png', size: NaN })).toEqual({ ok: false, reason: 'unreadable' })
  })
})


// ── parseAvatarDataUrl ──────────────────────────────────────────────────────
//
// This is the main process's end of the preload bridge, so everything below is a
// test of what happens to a payload the renderer should never have sent. The
// ordering assertions matter as much as the verdicts: the point of the function is
// that an oversized or malformed payload is refused BEFORE it is decoded, and the
// only way to observe that from outside is that the verdict is right for inputs
// that would be ruinous to decode.

describe('parseAvatarDataUrl', () => {
  const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64')

  /**
   * The 12 bytes every .webp starts with: 'RIFF', a length, 'WEBP'. Nothing here
   * cares what the rest of the file would say.
   */
  const WEBP_HEADER = [
    0x52, 0x49, 0x46, 0x46, // 'RIFF'
    0x1a, 0x00, 0x00, 0x00, // chunk length, irrelevant to the check
    0x57, 0x45, 0x42, 0x50, // 'WEBP'
  ]
  const webpDataUrl = (extra: number[] = []) =>
    `${AVATAR_DATA_URL_PREFIX}${b64([...WEBP_HEADER, ...extra])}`

  it('accepts a minimal WebP and hands back exactly the decoded bytes', () => {
    const result = parseAvatarDataUrl(webpDataUrl([1, 2, 3]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // A Uint8Array, not a Buffer: the module is imported by the renderer too.
    expect(result.bytes).toBeInstanceOf(Uint8Array)
    expect(Array.from(result.bytes)).toEqual([...WEBP_HEADER, 1, 2, 3])
  })

  it('refuses anything that is not a string', () => {
    for (const input of [undefined, null, 42, {}, [], Buffer.from([1])]) {
      expect(parseAvatarDataUrl(input), String(input)).toEqual({ ok: false, reason: 'unreadable' })
    }
  })

  it('demands the exact prefix rather than merely a comma', () => {
    // The guard this replaces was `indexOf(',') >= 0`, which accepted every one of
    // these and handed whatever followed the comma to a lenient base64 decoder.
    const wrongPrefixes = [
      'https://example.com/face.webp',
      'face.webp,AAAA',
      'data:image/webp,AAAA', // no ;base64
      'data:image/webp;base64AAAA', // no comma
      ' data:image/webp;base64,AAAA', // leading space
      'DATA:IMAGE/WEBP;BASE64,AAAA',
    ]
    for (const input of wrongPrefixes) {
      expect(parseAvatarDataUrl(input), input).toEqual({ ok: false, reason: 'unreadable' })
    }
  })

  it('refuses a JPEG data URL even though its payload is a real image', () => {
    // The upload declares image/webp unconditionally. A payload of any other
    // format would be stored under a content type that lies about it.
    const jpeg = `data:image/jpeg;base64,${b64([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])}`
    expect(parseAvatarDataUrl(jpeg)).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('refuses base64 with characters outside the alphabet', () => {
    // `Buffer.from(…, 'base64')` drops these silently and returns bytes, which is
    // exactly why the charset is checked here instead of being inferred from a
    // decoder that never complains.
    for (const payload of ['AAA!', 'AA A=', 'AA\nAA', 'AA-_', '****']) {
      expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + payload), payload).toEqual({
        ok: false,
        reason: 'unreadable',
      })
    }
  })

  it('refuses a payload whose length or padding is not valid base64', () => {
    for (const payload of ['A', 'AA', 'AAA', 'AAAAA', 'A===', '=AAA', 'AA=A']) {
      expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + payload), payload).toEqual({
        ok: false,
        reason: 'unreadable',
      })
    }
  })

  it('refuses an empty payload', () => {
    expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX)).toEqual({ ok: false, reason: 'unreadable' })
    expect(parseAvatarDataUrl('')).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('refuses an over-long STRING before looking at anything else', () => {
    // The cheapest bound there is, and the only one applicable before the value is
    // touched. A string this long is a size problem whatever it starts with, so it
    // is reported as one even though the prefix here is nonsense.
    const tooLong = 'x'.repeat(AVATAR_MAX_DATA_URL_LENGTH + 1)
    expect(parseAvatarDataUrl(tooLong)).toEqual({ ok: false, reason: 'too_large' })
  })

  it('derives the string ceiling from the byte cap, with room to spare', () => {
    // Not a magic number: 4 characters per 3 bytes, rounded up, plus the prefix.
    // The ceiling must never be what refuses a payload the byte cap would allow.
    expect(AVATAR_MAX_DATA_URL_LENGTH).toBeGreaterThan(
      AVATAR_DATA_URL_PREFIX.length + Math.ceil(AVATAR_MAX_BYTES / 3) * 4,
    )
  })

  it('refuses an oversized DECODED length without decoding it', () => {
    // Under the string ceiling (which carries slack over the byte cap) yet over
    // AVATAR_MAX_BYTES once decoded. The arithmetic catches it; a decoder would
    // have had to allocate five megabytes to reach the same conclusion.
    const quanta = Math.ceil((AVATAR_MAX_BYTES + 3) / 3)
    const payload = 'A'.repeat(quanta * 4)
    const input = AVATAR_DATA_URL_PREFIX + payload
    expect(input.length).toBeLessThanOrEqual(AVATAR_MAX_DATA_URL_LENGTH)
    expect((payload.length / 4) * 3).toBeGreaterThan(AVATAR_MAX_BYTES)
    expect(parseAvatarDataUrl(input)).toEqual({ ok: false, reason: 'too_large' })
  })

  it('counts the padding when it computes the decoded size, rather than rounding up', () => {
    // Exactly at the cap thanks to two padding characters. Off-by-one the other
    // way would refuse a photo that fits.
    const quanta = Math.ceil(AVATAR_MAX_BYTES / 3)
    const decodedWithoutPadding = quanta * 3
    const padding = decodedWithoutPadding - AVATAR_MAX_BYTES
    if (padding > 0 && padding <= 2) {
      const payload = 'A'.repeat(quanta * 4 - padding) + '='.repeat(padding)
      // Not a WebP, so it fails on the magic bytes — which is the proof that it got
      // PAST the size check rather than being refused by it.
      expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + payload)).toEqual({
        ok: false,
        reason: 'not_webp',
      })
    }
  })

  it('refuses well-formed base64 that is not a WebP container', () => {
    // The verdict that can only be reached after decoding, and the reason the
    // union has a fourth member: these bytes are a perfectly good payload and
    // would have been stored as image/webp.
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
    expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + b64(png))).toEqual({
      ok: false,
      reason: 'not_webp',
    })
  })

  it('checks RIFF at 0 and WEBP at 8, not just the first four bytes', () => {
    // A RIFF container that is not a WebP one — a .wav opens exactly like this.
    const riffWave = [...WEBP_HEADER.slice(0, 8), 0x57, 0x41, 0x56, 0x45] // 'WAVE'
    expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + b64(riffWave))).toEqual({
      ok: false,
      reason: 'not_webp',
    })
  })

  it('refuses a payload too short to carry the marker pair', () => {
    // The old guard accepted anything that decoded to at least one byte.
    expect(parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + b64([0x52, 0x49, 0x46, 0x46]))).toEqual({
      ok: false,
      reason: 'not_webp',
    })
  })

  it('accepts a payload exactly at the byte cap rather than off by one', () => {
    const bytes = Buffer.alloc(AVATAR_MAX_BYTES)
    Buffer.from(WEBP_HEADER).copy(bytes)
    const result = parseAvatarDataUrl(AVATAR_DATA_URL_PREFIX + bytes.toString('base64'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.bytes.length).toBe(AVATAR_MAX_BYTES)
  })

  it('is the same prefix the stored format announces', () => {
    // One decision in one place: what the renderer encodes, what a download hands
    // back, and what this parser demands.
    expect(AVATAR_DATA_URL_PREFIX).toBe(`data:${AVATAR_MIME_TYPE};base64,`)
  })
})

describe('centerCropBox', () => {
  it('crops the sides of a landscape image, evenly', () => {
    expect(centerCropBox({ width: 1000, height: 600 })).toEqual({ x: 200, y: 0, size: 600 })
  })

  it('crops the top and bottom of a portrait image, evenly', () => {
    expect(centerCropBox({ width: 600, height: 1000 })).toEqual({ x: 0, y: 200, size: 600 })
  })

  it('takes a square image whole', () => {
    expect(centerCropBox({ width: 800, height: 800 })).toEqual({ x: 0, y: 0, size: 800 })
  })

  it('never lets the box run past the edge on an odd difference', () => {
    const box = centerCropBox({ width: 101, height: 100 })
    expect(box).toEqual({ x: 0, y: 0, size: 100 })
    expect(box.x + box.size).toBeLessThanOrEqual(101)
  })

  // An image smaller than the stored size is cropped to ITS OWN edge, not to
  // 256: asking drawImage for a square bigger than the bitmap reads nothing.
  it('does not clamp up to AVATAR_SIZE for a small image', () => {
    const box = centerCropBox({ width: 120, height: 90 })
    expect(box).toEqual({ x: 15, y: 0, size: 90 })
    expect(box.size).toBeLessThan(AVATAR_SIZE)
  })

  it('floors fractional dimensions rather than claiming a fraction of a pixel', () => {
    expect(centerCropBox({ width: 100.7, height: 50.2 })).toEqual({ x: 25, y: 0, size: 50 })
  })

  it('yields an empty box for an image with no pixels instead of NaN', () => {
    expect(centerCropBox({ width: 0, height: 0 })).toEqual({ x: 0, y: 0, size: 0 })
    expect(centerCropBox({ width: -10, height: 10 })).toEqual({ x: 0, y: 0, size: 0 })
    expect(centerCropBox({ width: NaN, height: 10 })).toEqual({ x: 0, y: 0, size: 0 })
  })
})
