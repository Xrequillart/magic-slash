/**
 * The rules a profile photo obeys, in one place.
 *
 * WHY A MODULE
 * ---------------------------------------------------------------------------
 * An avatar is decided in three processes at once, and none of them can import
 * the others' code:
 *
 *   * the RENDERER picks the file, crops it on a canvas and encodes the WebP;
 *   * the MAIN process reads the original off disk (the only place its true size
 *     is knowable) and uploads the encoded result to Supabase Storage;
 *   * the object PATH has to be the same string in both, and in the account
 *     deletion path in main/cloud/auth.ts, or a photo is written where nothing
 *     will ever look for it again.
 *
 * So the cap, the accepted formats, the crop geometry, the bucket and the path
 * live here, next to types.ts / repoMatch.ts / urls.ts, for those modules'
 * reason: both processes need them and a literal repeated across processes is a
 * literal that drifts.
 *
 * DELIBERATELY PURE. No `electron`, no `@supabase/supabase-js`, no `fs`, at any
 * depth — the renderer imports it directly, and the root vitest suite runs it
 * with no Electron around. Callers who need the filesystem measure the file
 * themselves and hand the numbers in.
 *
 * NO i18n EITHER. A refusal comes back as a REASON CODE, never as a sentence:
 * the renderer owns the catalogue and maps the code to a message key. A module
 * that returned "File is too large" would have to know the user's language, and
 * i18n/ imports types.ts, so reaching back for MessageKey here would close a
 * cycle (see the note at the bottom of types.ts).
 */

/**
 * The stored edge length, in pixels. The crop is square, so this is both the
 * width and the height of what gets uploaded.
 *
 * 256 is a display decision, not a storage one: the identity card renders the
 * photo at 44 px and the sidebar smaller still, so 256 covers a 3x retina panel
 * with room to spare while keeping the WebP at a few tens of kilobytes.
 */
export const AVATAR_SIZE = 256

/**
 * The Storage bucket the photos live in.
 *
 * Here rather than spelled at each call site for the module's own reason: it is
 * named by CloudStore (upload, remove, download), by the account deletion path in
 * main/cloud/auth.ts, and by the `avatars_*` policies in SQL. A typo in any one
 * of them is a photo written where nothing will look for it.
 */
export const AVATAR_BUCKET = 'avatars'

/**
 * What a stored photo IS, whatever the user picked: a WebP.
 *
 * One constant because three places have to agree on it — the renderer encodes to
 * it, the upload declares it as its `contentType`, and the download hands it back
 * as a `data:` URL prefix. `avatarObjectPath`'s `.webp` is the fourth.
 */
export const AVATAR_MIME_TYPE = 'image/webp'

/**
 * The largest ORIGINAL file we will read, in bytes (5 MB).
 *
 * It is measured against the file the user PICKED, never against the encoded
 * result — a 50 MB JPEG becomes a ~20 KB WebP, so validating the upload payload
 * would accept everything and cap nothing. That makes this constant the ONLY
 * thing that ever refuses an oversized photo, and the refusal readable.
 *
 * The `avatars` bucket's `file_size_limit` carries the same number, and should
 * keep carrying it, but it is not a second line of this defence: it only ever
 * sees the 256 px WebP, which is orders of magnitude under the cap. What it
 * guarantees is narrower and still worth having — that nothing but a small image
 * lands in the bucket, whatever client is talking to Storage.
 */
export const AVATAR_MAX_BYTES = 5242880

/**
 * Why a picked file was refused. A code, not a message — see the module note.
 *
 * `unreadable` covers everything that is not a verdict on the file's type or
 * size: a path that no longer exists, a stat that threw, a directory picked
 * instead of a file. The main process maps its own I/O failures onto it so the
 * renderer has exactly one union to translate.
 */
export type AvatarRejection = 'too_large' | 'bad_extension' | 'unreadable'

/**
 * What `profile:readAvatarSource` answers with: the picked file as a data URL, or
 * the reason we would not read it.
 *
 * Named here rather than spelled inline on both sides of the channel — the handler
 * in main/ipc/profile-handlers.ts and the preload signature are two halves of ONE
 * contract, and two independent literals are two things to keep in step. Same
 * treatment as `FilePreviewResult` in types.ts, which this channel's shape follows.
 */
export type AvatarSourceResult = { dataUrl: string } | { reason: AvatarRejection }

/**
 * What we let a user pick, and what each accepted extension is CALLED.
 *
 * One map rather than a set here and a mime lookup in the main process: the two
 * always have to list the same formats, and two lists kept in agreement by a
 * comment are the drift this module exists to prevent. `validateAvatarFile`
 * returns the mime it resolved, so a caller reading a picked file never has to
 * re-derive it — and adding a format is one line that cannot be half-done.
 *
 * `svg` is ABSENT on purpose, and it is the one exclusion worth a note because
 * the existing image picker in skills-handlers.ts does offer it. Two reasons:
 * neither a canvas nor Electron's `nativeImage` rasterises an SVG reliably
 * (`drawImage` of an unsized SVG yields an empty bitmap), so the crop would
 * silently produce a blank square; and an SVG carries script, which makes an
 * `svg+xml` data URL rendered in a renderer window an XSS surface rather than a
 * picture. A vector avatar is not worth either.
 *
 * `gif` and `ico` are out for the simpler reason that the first frame of an
 * animation is not what the user thinks they chose.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: AVATAR_MIME_TYPE,
}

/** Lower-case extension of a path, without the dot ('' when there is none). */
function extensionOf(filePath: string): string {
  const base = filePath.replace(/^.*[/\\]/, '')
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

/**
 * Where a user's photo lives in the `avatars` bucket.
 *
 * One object per user, overwritten on every change (`upsert: true`), rather than
 * a new key per upload. Two things follow from that and both are wanted: the
 * storage policies can be the same own-rows shape as the `profiles` table's,
 * because the first path segment IS the owner's uid; and replacing a photo can
 * never leave the previous one orphaned in the bucket, which a timestamped key
 * would do on every change.
 *
 * The extension is fixed because the format is: whatever the user picked, what
 * we upload is always WebP.
 */
export function avatarObjectPath(uid: string): string {
  return `${uid}/avatar.webp`
}

/**
 * Whether a picked file may be read and uploaded at all — and if so, what it is.
 *
 * Called by the main process with a `statSync` size, BEFORE the file is read —
 * refusing a 4 GB video should not mean loading it into a Buffer first.
 *
 * The type is checked before the size, so a picked `.mp4` is reported as the
 * wrong kind of file rather than as a large one; a huge PNG is the only case
 * where `too_large` is the honest answer. A missing path or a non-positive /
 * non-finite size is `unreadable`: those describe a failed stat, not a verdict
 * on the user's choice.
 *
 * The accepting branch carries the `mime`, because deciding the format and naming
 * it are the same decision: the caller that turns the bytes into a data URL then
 * cannot disagree with the caller that allowed them.
 */
export function validateAvatarFile(
  input: { path: string; size: number },
): { ok: true; mime: string } | { ok: false; reason: AvatarRejection } {
  const { path: filePath, size } = input
  if (!filePath || !Number.isFinite(size) || size <= 0) return { ok: false, reason: 'unreadable' }
  const mime = MIME_BY_EXTENSION[extensionOf(filePath)]
  if (!mime) return { ok: false, reason: 'bad_extension' }
  if (size > AVATAR_MAX_BYTES) return { ok: false, reason: 'too_large' }
  return { ok: true, mime }
}

/**
 * The largest centred square inside an image: the automatic crop.
 *
 * `size` is the smaller of the two dimensions, so a landscape photo loses its
 * sides and a portrait loses its top and bottom, evenly. NOT clamped to
 * AVATAR_SIZE: an image smaller than 256 px is cropped to its own edge and the
 * caller decides whether to upscale it (it does — the stored object is always
 * 256 px, and letting the box report a square larger than the source would ask
 * `drawImage` to read outside the bitmap).
 *
 * ROUNDING. Everything is floored. `size` is floored so the box never claims a
 * fraction of a pixel that the source does not have, and the offsets are floored
 * so an odd difference biases the crop up and left by half a pixel rather than
 * risking `x + size > width`. Flooring the offsets is what makes that safe:
 * floor((w - s) / 2) + s <= (w + s) / 2 <= w for every s <= w.
 *
 * A degenerate input — zero, negative or non-finite — yields a zero-sized box at
 * the origin. The caller has an image with no pixels in it and there is no
 * square to be had; returning NaN would travel into canvas coordinates instead.
 */
export function centerCropBox(
  input: { width: number; height: number },
): { x: number; y: number; size: number } {
  const { width, height } = input
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { x: 0, y: 0, size: 0 }
  }
  const size = Math.floor(Math.min(width, height))
  return {
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) / 2),
    size,
  }
}
