/**
 * What a signed-in session IS, read off the User-Agent it signed in with.
 *
 * TWO KINDS OF CLIENT sign in to an account: this app, and a browser on the web app. The
 * app sends its own agent (`desktopUserAgent` below), which carries the machine's name so
 * two Macs can be told apart. Sessions opened before it did carry Node's default agent
 * (`node`, `undici`) or nothing at all; those are still this app, just unnamed.
 *
 * A browser is named by its engine family and its OS, which is as far as a User-Agent can
 * honestly be read. The order of the checks matters: Edge and Opera say "Chrome", and
 * Chrome says "Safari".
 */

export type SessionKind = 'desktop' | 'browser' | 'other'

export interface SessionAgent {
  kind: SessionKind
  /** The browser (Chrome, Safari…), the machine's name for the app, or null. */
  name: string | null
  /** The operating system, when the agent says. */
  os: string | null
}

const APP_PREFIX = 'MagicSlash/'

/**
 * The agent this app signs in with: `MagicSlash/<version> (<os>; <machine name>)`.
 * Parentheses and semicolons are stripped from the name so it cannot break the format.
 */
export function desktopUserAgent(version: string, platform: string, hostname: string): string {
  const machine = hostname.replace(/\.local$/i, '').replace(/[();]/g, ' ').trim()
  return `${APP_PREFIX}${version} (${osOfPlatform(platform)}${machine ? `; ${machine}` : ''})`
}

function osOfPlatform(platform: string): string {
  if (platform === 'darwin') return 'macOS'
  if (platform === 'win32') return 'Windows'
  if (platform === 'linux') return 'Linux'
  return platform
}

export function parseSessionAgent(userAgent: string | null | undefined): SessionAgent {
  const ua = (userAgent ?? '').trim()

  if (ua.startsWith(APP_PREFIX)) {
    const inside = ua.match(/\(([^)]*)\)/)?.[1] ?? ''
    const [os, ...machine] = inside.split(';').map((part) => part.trim())
    return { kind: 'desktop', name: machine.join(' ').trim() || null, os: os || null }
  }
  // Node's fetch, before the app sent an agent of its own. Nothing else signs in from Node.
  if (ua === '' || /^(node|undici)\b/i.test(ua)) return { kind: 'desktop', name: null, os: null }

  const os = osOfAgent(ua)
  const name = browserOfAgent(ua)
  if (name) return { kind: 'browser', name, os }
  return { kind: 'other', name: null, os }
}

function browserOfAgent(ua: string): string | null {
  if (/\bEdg(e|A|iOS)?\//.test(ua)) return 'Edge'
  if (/\b(OPR|Opera)\//.test(ua)) return 'Opera'
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return 'Firefox'
  if (/\bArc\//.test(ua)) return 'Arc'
  if (/\bChrome\/|\bCriOS\//.test(ua)) return 'Chrome'
  if (/\bSafari\//.test(ua) && /\bVersion\//.test(ua)) return 'Safari'
  return null
}

function osOfAgent(ua: string): string | null {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
  if (/Windows/.test(ua)) return 'Windows'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Linux/.test(ua)) return 'Linux'
  return null
}
