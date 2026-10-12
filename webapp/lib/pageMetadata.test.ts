import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pageMetadata, SITE_URL } from './pageMetadata'

/**
 * Runs in the ROOT vitest suite against the root `node_modules`, which is why
 * `lib/pageMetadata.ts` may import `next` as a TYPE ONLY — see the note on that file.
 * THIS TEST EXISTING IS WHAT KEEPS THAT TRUE: turn that into a value import and this
 * fails to RESOLVE rather than failing an assertion.
 *
 * Its real job is the regression that is invisible in a diff. Next inherits `title` and
 * `description` but NOT `openGraph`/`twitter`, so a page that sets a good `<title>` and
 * no card still shares under the ROOT's `og:title`. Every marketing page looked correct
 * on its own and the whole set shared as "Magic Slash". Nothing about a page that omits
 * a card looks wrong when you read that page, so the guard has to be a sweep over all
 * of them rather than an assertion on any one.
 */

const SHOWCASE = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', '(showcase)')

/**
 * Every `page.tsx` and `layout.tsx` under `(showcase)` that exports metadata, at ANY
 * depth: a nested route such as `blog/[slug]/page.tsx` hand-rolling its own card is the
 * same regression one level down, and a sweep of the first level would pass it green.
 * Layouts count too, since theirs is the card a route without metadata inherits.
 */
function showcaseFiles(dir = SHOWCASE): { route: string; source: string }[] {
  const out: { route: string; source: string }[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...showcaseFiles(path))
      continue
    }
    if (entry.name !== 'page.tsx' && entry.name !== 'layout.tsx') continue
    const source = readFileSync(path, 'utf8')
    if (!source.includes('export const metadata')) continue
    const segments = relative(SHOWCASE, dirname(path)).split(sep).filter(Boolean)
    out.push({ route: `/${segments.join('/')}${entry.name === 'layout.tsx' ? ' (layout)' : ''}`, source })
  }
  return out
}

describe('pageMetadata', () => {
  it('mirrors the page title into the card, which is the whole point', () => {
    const m = pageMetadata({ title: 'Features — magic-slash', description: 'Every switch.' })
    expect(m.title).toBe('Features — magic-slash')
    expect(m.openGraph?.title).toBe('Features — magic-slash')
    expect(m.twitter?.title).toBe('Features — magic-slash')
    expect(m.openGraph?.description).toBe('Every switch.')
    expect(m.twitter?.description).toBe('Every switch.')
  })

  it('emits og:url only when a page asks for one', () => {
    expect(pageMetadata({ title: 't', description: 'd' }).openGraph).not.toHaveProperty('url')
    const home = pageMetadata({ title: 't', description: 'd', url: SITE_URL })
    expect(home.openGraph).toHaveProperty('url', SITE_URL)
  })

  it('keeps the card square, because the icon is', () => {
    const m = pageMetadata({ title: 't', description: 'd' })
    // `card` lives on the discriminated members of `Twitter`, not on the base type.
    expect((m.twitter as { card?: string } | undefined)?.card).toBe('summary')
    const [image] = m.openGraph?.images as { width: number; height: number }[]
    expect(image.width).toBe(image.height)
  })

  it('labels the image on both cards, so neither ships without alt text', () => {
    const m = pageMetadata({ title: 't', description: 'd' })
    const [og] = m.openGraph?.images as { alt?: string }[]
    const [tw] = m.twitter?.images as { alt?: string }[]
    expect(og.alt).toBeTruthy()
    expect(tw.alt).toBe(og.alt)
  })

  it('hands each caller its own images array, so one page cannot mutate another', () => {
    const a = pageMetadata({ title: 'a', description: 'a' })
    const b = pageMetadata({ title: 'b', description: 'b' })
    expect(a.openGraph?.images).not.toBe(b.openGraph?.images)
    expect((a.openGraph?.images as unknown[])[0]).not.toBe((b.openGraph?.images as unknown[])[0])
  })
})

describe('every showcase page builds its card through the helper', () => {
  const pages = showcaseFiles()

  it('finds the whole set, so this sweep cannot silently cover nothing', () => {
    expect(pages.map((p) => p.route).sort()).toEqual([
      '/',
      '/ (layout)',
      '/changelog',
      '/desktop',
      '/download',
      '/faq',
      '/features',
      '/privacy',
      '/terms',
      '/workflow',
    ])
  })

  it.each(pages.map((p) => [p.route, p.source]))('%s comes through pageMetadata', (_route, source) => {
    expect(source).toContain('pageMetadata({')
    // A hand-rolled object is exactly how the regression got in: the page reads fine and
    // inherits the root's card anyway. There is no reason for one here.
    expect(source).not.toMatch(/export const metadata: Metadata = \{/)
  })
})
