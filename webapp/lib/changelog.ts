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
export type ChangelogVersion = { version: string; date: string; categories: ChangelogCategory[] }

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

/** Every released version, newest first. Empty when the file could not be found. */
export function loadChangelog(): ChangelogVersion[] {
  const raw = readChangelog()
  return raw ? parseChangelog(raw) : []
}
