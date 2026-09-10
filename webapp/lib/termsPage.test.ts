import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import { ALL_KEYS, PAGE_CHROME, SECTIONS, TERMS_PATH } from './termsPage'

/**
 * `/terms`, pinned exactly as `privacyPage.test.ts` pins the page next door, and the
 * header on that file carries the argument in full. The short version: the clause list
 * used to be an array inside a `'use client'` component, justified by a typecheck that
 * only runs on Vercel, while `t()` renders an unknown key as an EMPTY paragraph — so a
 * mistyped key shipped as a heading with no clause under it and nothing on a pull
 * request said a word.
 *
 * Runs in the ROOT vitest suite on the root `node_modules`, which is why
 * `lib/termsPage.ts` may import nothing but `./i18n` and its neighbour. `TermsContent.tsx`
 * and `hostRouting.ts` are read as TEXT: the first imports React, and the second keeps
 * its paths as literals inside a `Set`.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]
const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

describe('the terms page', () => {
  it('names keys the catalogues actually carry, in both languages', () => {
    for (const key of ALL_KEYS) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }
  })

  it('renders every clause it names, and names every clause it renders', () => {
    // A duplicated row prints one clause twice and drops another, which on this page
    // reads as boilerplate rather than as a bug. `key={entry.title}` in the markup makes
    // a duplicated title a React key collision too.
    const titles = SECTIONS.map((section) => section.title)
    const bodies = SECTIONS.map((section) => section.body)
    expect(new Set(titles).size, titles.join(', ')).toBe(titles.length)
    expect(new Set(bodies).size, bodies.join(', ')).toBe(bodies.length)
  })

  it('puts the disclaimers after what was offered', () => {
    // THE ORDER IS THE ARGUMENT (see `SECTIONS`): what the thing is, the two grants, the
    // two responsibilities, then the disclaimers. A clause appended to the array lands
    // after "When this page changes" by default, and a warranty disclaimer read before
    // the grant it disclaims is the shape of a contract nobody finishes.
    expect(SECTIONS.at(-2)?.title).toBe('site.terms.warranty.title')
    expect(SECTIONS.at(-1)?.title).toBe('site.terms.changes.title')
    expect(SECTIONS[0]?.title).toBe('site.terms.what.title')
  })

  it('keeps its clause list out of the client component', () => {
    // The regression this file was written against: the array moved to `lib/` so a test
    // could read it, and moving it back would take every check above with it while
    // changing nothing on screen.
    const component = readFileSync(webapp('../components/site/terms/TermsContent.tsx'), 'utf8')
    expect(component).toContain("from '@/lib/termsPage'")
    expect(component).not.toMatch(/^const SECTIONS/m)
  })

  it('turns its clauses without an em dash', () => {
    // The house punctuation rule. A period, a colon or a comma instead, in both
    // languages.
    // `?? ''` so a key that is missing outright fails in the assertion above, which
    // names it, rather than here as an unreadable complaint about `undefined`.
    for (const key of ALL_KEYS) {
      expect(site(key) ?? '', `en.${key}`).not.toContain('—')
      expect(siteFr(key) ?? '', `fr.${key}`).not.toContain('—')
    }
  })

  it('renders the real page behind the path', () => {
    const file = webapp(`../app/(marketing)${TERMS_PATH}/page.tsx`)
    expect(existsSync(file), `app/(marketing)${TERMS_PATH}/page.tsx`).toBe(true)

    const page = readFileSync(file, 'utf8')
    expect(page).toContain('<TermsContent')
    expect(page).not.toContain('PlaceholderContent')
  })

  it('points at a path the public site owns', () => {
    // Absent from `PUBLIC_PATHS` this path 307s to a login form on `app.magic-slash.io`
    // rather than 404ing, and the link to it is in the copyright row of every public
    // page.
    const routing = readFileSync(webapp('./hostRouting.ts'), 'utf8')
    expect(routing, `${TERMS_PATH} in PUBLIC_PATHS`).toContain(`'${TERMS_PATH}',`)
  })

  it('leaves both of its links to JSX and keeps only the labels', () => {
    // `i18n.test.ts` fails on an `<a>` inside a translated string, so `LICENSE_URL` and
    // `NEW_ISSUE_URL` are composed in the component and the catalogue holds the two
    // labels. This pins the pair the chrome is responsible for.
    expect(Object.keys(PAGE_CHROME)).toEqual(['title', 'lead', 'licenseLink', 'askLink'])

    const component = readFileSync(webapp('../components/site/terms/TermsContent.tsx'), 'utf8')
    expect(component).toContain('href={LICENSE_URL}')
    expect(component).toContain('href={NEW_ISSUE_URL}')
  })
})
