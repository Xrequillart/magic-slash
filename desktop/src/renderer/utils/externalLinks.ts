/**
 * The tools an external link on a plan can open, and how an address says which one it is.
 *
 * `plan_links.kind` is free text (see 20260923110000), so this list is the app's and not the
 * table's: a kind added here needs no migration, and one a newer build wrote that this build
 * does not know draws as `other` — a plain link, still openable.
 *
 * THE READER MAY PICK THE TOOL, AND USUALLY DOES NOT HAVE TO: left on "Automatic", the kind
 * is read off the address, which is unambiguous for every tool here but one — an old
 * `figma.com/file/…` address can be a design file or a FigJam board, and is taken for a
 * design file, the far commoner of the two.
 */
export const LINK_KINDS = [
  'figma', 'figjam', 'notion', 'claude_artifact', 'google_docs', 'google_sheets', 'google_slides',
  'miro', 'loom', 'github', 'other',
] as const

export type LinkKind = typeof LINK_KINDS[number]

/** The tool's own name — a brand, so never translated. `other` is the catalogue's. */
export const LINK_KIND_NAMES: Record<Exclude<LinkKind, 'other'>, string> = {
  figma: 'Figma',
  figjam: 'FigJam',
  notion: 'Notion',
  claude_artifact: 'Claude artifact',
  google_docs: 'Google Docs',
  google_sheets: 'Google Sheets',
  google_slides: 'Google Slides',
  miro: 'Miro',
  loom: 'Loom',
  github: 'GitHub',
}

/** `kind` as this build knows it: a known kind, or `other`. */
export function toLinkKind(kind: string): LinkKind {
  return (LINK_KINDS as readonly string[]).includes(kind) ? kind as LinkKind : 'other'
}

/** The address, as a URL, when it is one a plan may carry: http(s), with a host. */
export function parseLinkUrl(value: string): URL | null {
  const trimmed = value.trim()
  if (trimmed === '' || /\s/.test(trimmed)) return null
  // A bare `figma.com/…` pasted without its scheme is still meant as https.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') ? url : null
  } catch {
    return null
  }
}

/** Whether `host` is `domain` or one of its subdomains. */
function on(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

/** The tool an address opens, read off its host and path. */
export function detectLinkKind(value: string): LinkKind {
  const url = parseLinkUrl(value)
  if (!url) return 'other'
  const host = url.hostname.toLowerCase()
  const path = url.pathname.toLowerCase()
  if (on(host, 'figma.com')) return path.startsWith('/board/') ? 'figjam' : 'figma'
  if (on(host, 'notion.so') || on(host, 'notion.site') || on(host, 'notion.com')) return 'notion'
  if (on(host, 'claude.site') || (on(host, 'claude.ai') && /\/(public\/)?artifacts?\//.test(path))) return 'claude_artifact'
  if (host === 'docs.google.com') {
    if (path.startsWith('/document/')) return 'google_docs'
    if (path.startsWith('/spreadsheets/')) return 'google_sheets'
    if (path.startsWith('/presentation/')) return 'google_slides'
  }
  if (on(host, 'miro.com')) return 'miro'
  if (on(host, 'loom.com')) return 'loom'
  if (on(host, 'github.com')) return 'github'
  return 'other'
}

/**
 * What a link is drawn as when nobody named it: the host without its `www.` and the path,
 * shortened — `figma.com/design/Abc…`. The address in full is the row's tooltip.
 */
export function linkDisplayName(value: string): string {
  const url = parseLinkUrl(value)
  if (!url) return value
  const host = url.hostname.replace(/^www\./, '')
  const path = url.pathname === '/' ? '' : decodeURIComponent(url.pathname).replace(/\/$/, '')
  const full = host + path
  return full.length > 60 ? `${full.slice(0, 59)}…` : full
}
