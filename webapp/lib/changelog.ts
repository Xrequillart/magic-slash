import fs from 'node:fs'
import path from 'node:path'

/**
 * The CHANGELOG, parsed at BUILD time.
 *
 * `docs/documentation.html` fetched
 * `raw.githubusercontent.com/.../CHANGELOG.md` from the browser on every page load and
 * parsed it there. That is the same shape of mistake `lib/desktopRelease.ts` documents
 * for the version badge: a value this repository already owns, fetched over the
 * network, so it can be rate-limited, blocked, or briefly disagree with the deploy it
 * is rendered next to — and it costs a round trip before the section shows anything at
 * all. Reading the file at build time removes all of that; the page ships with the
 * changelog already in the HTML.
 *
 * The trade-off is that a changelog entry only appears once the webapp is redeployed.
 * That is the same trade-off `LATEST_DESKTOP_VERSION` already makes, and a release
 * that updates the changelog is a release that redeploys.
 *
 * Server-only: it touches the filesystem. Importing it from a client component is a
 * build error, which is the intent.
 */

export type ChangelogItem = { component: string | null; text: string }
export type ChangelogCategory = { type: string; items: ChangelogItem[] }
/** A picture at the head of a release: a big feature's banner. */
export type ChangelogBanner = { src: string; alt: string }
export type ChangelogVersion = { version: string; date: string; banner?: ChangelogBanner; categories: ChangelogCategory[] }

/**
 * Where CHANGELOG.md might be, relative to the process's working directory.
 *
 * Two candidates because the answer depends on the deployment's root directory: the
 * repo root when the whole repository is the build context, `webapp/` when only this
 * app is. Missing is not an error — `parseChangelog` returns nothing and the page
 * renders a link to GitHub instead, which is what the static page's own catch did.
 */
const CANDIDATES = ['../CHANGELOG.md', 'CHANGELOG.md']

function readChangelog(): string | null {
  for (const candidate of CANDIDATES) {
    try {
      return fs.readFileSync(path.join(process.cwd(), candidate), 'utf8')
    } catch {
      // Try the next location.
    }
  }
  return null
}

/**
 * Parses the Keep-a-Changelog subset this project actually writes:
 *
 *   ## [0.63.1] - 2026-07-31
 *   ### Fixed
 *   - **desktop**: the thing that was broken
 *
 * Ported from the browser parser in `docs/documentation.html`, same three headings and
 * the same `**component**:` convention, so the rendering is unchanged.
 *
 * A BANNER is an image line between the version heading and its first category:
 *
 *   ## [0.106.0] - 2026-10-02
 *
 *   ![The workflow editor](https://github.com/user-attachments/assets/…)
 *
 * or the `<img … src="…" alt="…" />` tag GitHub's editor writes when an image is dropped
 * into it. Either gives a `user-attachments` URL. The GitHub release copies the
 * section as it is (`release.yml`), so the desktop's What's New reads the same image out of
 * the release HTML. Absolute `http(s)` URLs only: a relative path would resolve against
 * this site and against GitHub differently. The first one wins.
 */
export function parseChangelog(raw: string): ChangelogVersion[] {
  const versions: ChangelogVersion[] = []
  let version: ChangelogVersion | null = null
  let category: ChangelogCategory | null = null

  for (const line of raw.split('\n')) {
    const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/)
    if (versionMatch) {
      version = { version: versionMatch[1], date: versionMatch[2], categories: [] }
      versions.push(version)
      category = null
      continue
    }
    if (!version) continue

    const banner = !category && !version.banner ? parseBanner(line) : null
    if (banner) {
      version.banner = banner
      continue
    }

    const categoryMatch = line.match(/^### (Added|Changed|Fixed)/)
    if (categoryMatch) {
      category = { type: categoryMatch[1], items: [] }
      version.categories.push(category)
      continue
    }
    if (!category) continue

    const itemMatch = line.match(/^- \*\*(.+?)\*\*:?\s*(.+)/)
    if (itemMatch) {
      category.items.push({ component: itemMatch[1], text: itemMatch[2] })
      continue
    }
    const plainMatch = line.match(/^- (.+)/)
    if (plainMatch) category.items.push({ component: null, text: plainMatch[1] })
  }

  return versions
}

/** A banner line: `![alt](https://…)`, or an `<img>` tag with an `https` `src`. Null for anything else. */
function parseBanner(line: string): ChangelogBanner | null {
  const markdown = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)\s*$/)
  if (markdown) return { src: markdown[2], alt: markdown[1].trim() }
  if (!/^<img\s[^>]*>\s*$/i.test(line.trim())) return null
  const attribute = (name: string) => line.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1]
  const src = attribute('src')
  return src && /^https?:\/\//.test(src) ? { src, alt: (attribute('alt') ?? '').trim() } : null
}

/** Every released version, newest first. Empty when the file could not be found. */
export function loadChangelog(): ChangelogVersion[] {
  const raw = readChangelog()
  return raw ? parseChangelog(raw) : []
}
