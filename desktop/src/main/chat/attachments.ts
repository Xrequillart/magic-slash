import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { randomUUID } from 'crypto'

/**
 * Files attached to a chat message. The chat sends PATHS, the way a file dropped on the
 * terminal does (Claude Code reads a path in the prompt, and turns an image's into an
 * attachment), so a file only has to exist somewhere `claude` can read it.
 *
 * A pasted image has no path: it is written to a folder of this app's own under the
 * system temp dir, which the OS clears on its own schedule. Only images, and only up to
 * a size a screenshot can reach.
 */

const PASTE_DIR = path.join(os.tmpdir(), 'magic-slash-chat')
const MAX_PASTE_BYTES = 20 * 1024 * 1024
const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export function savePastedImage(bytes: unknown, mime: unknown): string | null {
  const ext = typeof mime === 'string' ? IMAGE_EXT[mime] : undefined
  if (!ext || !(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > MAX_PASTE_BYTES) return null
  try {
    fs.mkdirSync(PASTE_DIR, { recursive: true, mode: 0o700 })
    const file = path.join(PASTE_DIR, `pasted-${randomUUID()}.${ext}`)
    fs.writeFileSync(file, bytes, { mode: 0o600 })
    return file
  } catch (error) {
    console.error('[Chat] Failed to save a pasted image:', error)
    return null
  }
}
