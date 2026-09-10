import { describe, it, expect } from 'vitest'
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPE,
  AVATAR_SIZE,
  avatarObjectPath,
  centerCropBox,
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
