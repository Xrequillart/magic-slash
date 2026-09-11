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
 * themselves and hand the numbers in. The only platform anything here touches is
 * `atob`, which is a standard global in both a browser and Node; nothing here
 * takes or returns a `Buffer`, so `parseAvatarDataUrl` deals in `Uint8Array` and
 * the main process wraps it at the one call site that talks to Storage.
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
 * Why a photo was refused. A code, not a message — see the module note.
 *
 * `unreadable` covers everything that is not a verdict on the file's type or
 * size: a path that no longer exists, a stat that threw, a directory picked
 * instead of a file, and — on the upload side — a payload that is not the data
 * URL this app produces. The main process maps its own I/O failures onto it so
 * the renderer has exactly one union to translate.
 *
 * `not_webp` is the one verdict that can only be reached AFTER decoding: a
 * payload whose base64 is perfectly well formed and whose bytes are not a WebP
 * container. It is separate from `bad_extension` because it is a different fact
 * about a different thing — the extension check judges the file the user picked,
 * this one judges the bytes that are about to be stored as `image/webp`.
 */
export type AvatarRejection = 'too_large' | 'bad_extension' | 'unreadable' | 'not_webp'

/**
 * What `profile:pickAvatarSource` answers with: the picked file as a data URL, or
 * the reason there is nothing to hand back.
 *
 * `'cancelled'` sits alongside the rejections rather than in a third branch
 * because the channel has exactly two outcomes for its caller — bytes, or no
 * bytes — and dismissing the dialog is the one "no bytes" that must NOT be shown
 * as an error. Keeping it inside the same union is what forces every caller to
 * decide what to do about it instead of falling through to a toast.
 *
 * Named here rather than spelled inline on both sides of the channel — the handler
 * in main/ipc/profile-handlers.ts and the preload signature are two halves of ONE
 * contract, and two independent literals are two things to keep in step. Same
 * treatment as `FilePreviewResult` in types.ts, which this channel's shape follows.
 */
export type AvatarSourceResult =
  | { dataUrl: string }
  | { reason: AvatarRejection | 'cancelled' }

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
 * The one prefix a stored photo's data URL may carry.
 *
 * Derived from AVATAR_MIME_TYPE rather than typed out, so the string the renderer
 * encodes, the string the download hands back and the string the parser below
 * demands are one decision. Matched EXACTLY — see `parseAvatarDataUrl`.
 */
export const AVATAR_DATA_URL_PREFIX = `data:${AVATAR_MIME_TYPE};base64,`

/**
 * The longest data URL string we will even look at.
 *
 * Base64 inflates by 4/3 (four characters per three bytes, rounded up to a whole
 * quantum), so the largest legitimate payload is computable from AVATAR_MAX_BYTES
 * instead of guessed. The slack absorbs nothing in particular — it exists so that
 * this ceiling can never be the thing that refuses a payload the arithmetic below
 * would have accepted; the byte cap stays the only real limit.
 *
 * Checking the STRING length first is the whole point: it is the only bound that
 * can be applied before any of the value has been copied or decoded.
 */
export const AVATAR_MAX_DATA_URL_LENGTH =
  AVATAR_DATA_URL_PREFIX.length + Math.ceil(AVATAR_MAX_BYTES / 3) * 4 + 64

/** Standard base64, no URL-safe alphabet, no whitespace, no line breaks. */
const BASE64_BODY = /^[A-Za-z0-9+/]*$/

/**
 * A RIFF container holding a WEBP chunk: 'RIFF', a 4-byte length, then 'WEBP'.
 * Twelve bytes is the shortest thing that can carry both markers.
 */
const WEBP_HEADER_BYTES = 12
const RIFF = [0x52, 0x49, 0x46, 0x46] // 'RIFF'
const WEBP = [0x57, 0x45, 0x42, 0x50] // 'WEBP'

/** Whether `bytes` opens with the RIFF/WEBP marker pair a .webp always does. */
function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < WEBP_HEADER_BYTES) return false
  return (
    RIFF.every((byte, i) => bytes[i] === byte) && WEBP.every((byte, i) => bytes[8 + i] === byte)
  )
}

/**
 * Decode strictly-validated base64 to bytes.
 *
 * `atob` rather than `Buffer`: this module is imported by the renderer too, and a
 * Buffer in its signature would make it a Node module. The caller in the main
 * process wraps the result (`Buffer.from(bytes)`) at the one point it needs to.
 *
 * Only ever called on a payload `parseAvatarDataUrl` has already checked against
 * BASE64_BODY, so `atob`'s own leniency is not load-bearing here.
 */
function decodeBase64(payload: string): Uint8Array {
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Turn the renderer's `data:image/webp;base64,…` string into the bytes we are
 * willing to store — or say why we are not.
 *
 * WHY THIS IS NOT A ONE-LINE GUARD
 * ---------------------------------------------------------------------------
 * The string arrives over the preload bridge, which makes it untrusted input to
 * the main process however trustworthy the code that normally produces it is.
 * "Has a comma, decodes to at least one byte" accepts three things it should not:
 * a payload of any length (allocated in full before Storage ever sees it), base64
 * with characters in it that `Buffer.from` silently drops, and bytes that are not
 * an image at all yet get uploaded labelled `image/webp`.
 *
 * THE ORDER OF THE CHECKS IS THE FIX, not merely tidiness. Each step is cheaper
 * than the one after it and each one bounds the next:
 *
 *   1. a string at all, and short enough to be a candidate — the only check that
 *      costs nothing, and the only one that can precede touching the value;
 *   2. the EXACT prefix, so the format is decided before anything is decoded;
 *   3. a strict charset and padding check on the payload, which is what makes
 *      step 4's arithmetic trustworthy;
 *   4. the decoded length, computed from the base64 length and the padding and
 *      compared to the cap BEFORE decoding. This is the point of the whole
 *      function: an oversized payload is refused without being allocated;
 *   5. only now, decode — and check that the bytes are a WebP container, so the
 *      `contentType` the upload declares is a fact rather than a hope.
 *
 * A byte-for-byte empty payload is refused by step 3's length check: there is no
 * such thing as base64 for zero bytes here worth accepting, and an empty object
 * in the bucket renders as a broken image the user cannot tell from a bug.
 */
export function parseAvatarDataUrl(
  input: unknown,
): { ok: true; bytes: Uint8Array } | { ok: false; reason: AvatarRejection } {
  if (typeof input !== 'string' || input.length === 0) return { ok: false, reason: 'unreadable' }
  // Before the prefix check, because a 200 MB string is a size problem whatever
  // it starts with — and because reporting it as an unreadable format would send
  // the user looking for a converter instead of a smaller photo.
  if (input.length > AVATAR_MAX_DATA_URL_LENGTH) return { ok: false, reason: 'too_large' }
  if (!input.startsWith(AVATAR_DATA_URL_PREFIX)) return { ok: false, reason: 'unreadable' }

  const payload = input.slice(AVATAR_DATA_URL_PREFIX.length)
  // Length first: a quantum is four characters, so anything else is malformed,
  // and 0 is the empty payload.
  if (payload.length === 0 || payload.length % 4 !== 0) return { ok: false, reason: 'unreadable' }

  // Padding is only ever the last one or two characters, and only '=' — which is
  // why it can be counted before the charset test rather than allowed for in it.
  let padding = 0
  if (payload.endsWith('==')) padding = 2
  else if (payload.endsWith('=')) padding = 1
  if (!BASE64_BODY.test(padding === 0 ? payload : payload.slice(0, -padding))) {
    return { ok: false, reason: 'unreadable' }
  }

  // Four characters carry three bytes; the padding says how many of the last
  // three are not really there. No allocation has happened yet.
  const decodedLength = (payload.length / 4) * 3 - padding
  if (decodedLength === 0) return { ok: false, reason: 'unreadable' }
  if (decodedLength > AVATAR_MAX_BYTES) return { ok: false, reason: 'too_large' }

  const bytes = decodeBase64(payload)
  if (!isWebp(bytes)) return { ok: false, reason: 'not_webp' }
  return { ok: true, bytes }
}

/**
 * The largest centred square inside an image: the zoom-1 starting point of the
 * crop the user then moves (see `avatarCrop.ts`).
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
