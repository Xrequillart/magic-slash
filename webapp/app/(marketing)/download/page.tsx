import type { Metadata } from 'next'
import { DownloadContent } from '@/components/site/download/DownloadContent'
import { loadChangelog } from '@/lib/changelog'
import { LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'

/**
 * magic-slash.io/download — the way to get the app.
 *
 * IT WAS A PLACEHOLDER, and what fills it is what its own note said it owed: the
 * button, which Macs the build runs on, the three prerequisites the first launch checks,
 * what the installer puts in `~/.claude/skills/`, and which release you are getting —
 * with that release's notes at the bottom and a way onward to `/changelog`.
 *
 * A SERVER COMPONENT whose job is the `metadata` and one file read, with the page in a
 * client component next door: the copy needs `useT()`, and `metadata` cannot be exported
 * from a `'use client'` module. The same split `/changelog` makes, for the same second
 * reason — `loadChangelog()` reads `CHANGELOG.md` off the disk with `node:fs` at build
 * time (`lib/changelog.ts` says at length why that replaced a runtime fetch), and a
 * client component cannot.
 *
 * THE ENTRY HANDED DOWN IS THE ONE FOR `LATEST_DESKTOP_VERSION`, not `versions[0]`. The
 * two agree on every release — `/magic:release` bumps the constant and writes the entry
 * in the same step — but the button downloads the CONSTANT's build, so the notes under it
 * have to be that build's. Falling back to the newest entry when the constant's is
 * missing would print notes for a file the button does not hand out. `null` instead, and
 * the band says so and links the GitHub release.
 *
 * `lib/desktopRelease.ts` owns the version and the file URL, pinned to
 * `desktop/package.json` by `desktopRelease.test.ts`; `downloadPage.test.ts` reads the
 * component as text to make sure the button is built from them and not spelled by hand.
 */

export const metadata: Metadata = {
  title: 'Download — magic-slash',
  description:
    'Download Magic Slash for macOS: the installer, what it needs, and what the first launch sets up.',
}

export default function DownloadPage() {
  const release = loadChangelog().find((version) => version.version === LATEST_DESKTOP_VERSION) ?? null

  return <DownloadContent release={release} />
}
