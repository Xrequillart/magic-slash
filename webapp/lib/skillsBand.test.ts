import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MAGIC_COMMANDS } from './commands'
import { FEATURE_FAMILIES } from './features'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import { SKILLS_BAND_CHROME, SKILLS_BAND_PATH, SKILLS_BAND_POINTS } from './skillsBand'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/skillsBand.ts` may import nothing but `./i18n` — see the note on that file. THIS
 * TEST EXISTING IS WHAT KEEPS THAT TRUE: add a `react`, a `next/*` or a `lucide-react`
 * import over there and this fails to RESOLVE rather than shipping a bundle dragged into a
 * list of six strings.
 *
 * The other half of its job is the one a type cannot do here. `tsc` never runs on
 * `webapp/` in CI (`.github/workflows/ci.yml` typechecks `desktop/` only), so the
 * `MessageKey` unions over there guarantee nothing — and `t()` has no per-key fallback, so
 * a key that does not exist renders as an EMPTY element rather than as an error. On this
 * band that failure is a heading with a hole under it, which looks like a design decision.
 *
 * Same shape and same reasoning as `workflow.test.ts` next door.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

describe('the skills band', () => {
  it('names keys the catalogues actually carry', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.skillsBand.pointCycle", which does not say who wanted it. Here
    // it does.
    for (const key of Object.values(SKILLS_BAND_CHROME)) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }

    for (const point of SKILLS_BAND_POINTS) {
      expect(site(point.label), `en.${point.label}`).toBeTruthy()
      expect(siteFr(point.label), `fr.${point.label}`).toBeTruthy()
    }
  })

  it('makes exactly three claims', () => {
    // THE NUMBER IS THE DESIGN and it is a whole band away from anything that would argue
    // with a fourth: `FeaturePoints` is a `flex-col`, so a fourth row simply appears and
    // the copy column grows past the drawing beside it. The band's own header sets out why
    // three — a count, a span, and what that leaves you doing — and a fourth is the slot
    // somebody has to fill, which is how every cut band on this page started.
    expect(SKILLS_BAND_POINTS).toHaveLength(3)
  })

  it('claims a count the product actually ships', () => {
    // "8 skills" is the band's one checkable claim, and `MAGIC_COMMANDS` is the authority
    // — so a ninth command is a failing test here rather than a landing page quietly
    // under-selling the product, and a removed one is a page over-selling it.
    //
    // THE DIGIT IS BUILT FROM THAT LENGTH rather than typed, which is the whole point of
    // doing this here: the assertion reads the same number the product ships and looks
    // for it in the copy, so there is no second `8` in this file to keep in step either.
    // The title AND the first claim, in both languages — the count is spelled twice per
    // catalogue and a half-done rename is exactly the edit this catches.
    const count = String(MAGIC_COMMANDS.length)

    for (const key of [SKILLS_BAND_CHROME.title, SKILLS_BAND_POINTS[0].label]) {
      expect(site(key), `en.${key}`).toContain(count)
      expect(siteFr(key), `fr.${key}`).toContain(count)
    }
  })

  it('turns its review clause without an em dash', () => {
    // The product owner cut the em dash out of the subtitle ("retire le grand —"), and a
    // reworded paragraph is exactly the kind of edit that puts one back — it is the house
    // punctuation on this page, used by the hero and the desktop band. Both catalogues,
    // because the French is where it was noticed.
    for (const lookup of [site, siteFr]) {
      expect(lookup(SKILLS_BAND_CHROME.subtitle)).not.toContain('—')
    }
  })

  it('keeps every command name out of the copy', () => {
    // THE DIVISION THIS BAND IS BUILT ON: a command is a token the product defines, so it
    // belongs to the DRAWING — spelled from `lib/commands.ts`, whose template-literal type
    // makes `/magic:pln` a compile error — and never to a catalogue, where it would be a
    // string a translator can edit and nothing can check. The workflow band's catalogue
    // entries state the same rule; this is the only place either of them is enforced.
    const copy = [
      ...Object.values(SKILLS_BAND_CHROME),
      ...SKILLS_BAND_POINTS.map((point) => point.label),
    ].flatMap((key) => [site(key), siteFr(key)])

    for (const line of copy) {
      expect(line, `"${line}"`).not.toContain('/magic:')
    }
  })

  it('points its button at a route the public site owns, and at an anchor that exists', () => {
    // THE THREE HALVES A BROKEN CTA NEEDS, and none of them is visible in a diff.
    //
    // ① `PUBLIC_PATHS` in `lib/hostRouting.ts` enumerates the paths the apex answers;
    // everything absent from it belongs to the app host. A path the band links to but that
    // list does not know about does not 404 on production — it 307s the reader to a login
    // form on `app.magic-slash.io`, and a landing page whose CTA appears to sign you out
    // is worse than one whose CTA is missing. Read as TEXT for the purity reason above:
    // that module imports nothing, but this assertion is about what the file SAYS, and a
    // literal inside a `Set` is not reachable any other way.
    const [path, anchor] = SKILLS_BAND_PATH.split('#')

    const routing = readFileSync(webapp('./hostRouting.ts'), 'utf8')
    expect(routing, `${path} in PUBLIC_PATHS`).toContain(`'${path}',`)

    // ② The route has to exist, which is the half `PUBLIC_PATHS` cannot check: a listed
    // path with no page behind it is a clean 404, which is honest and still a dead button
    // on the homepage.
    expect(existsSync(webapp(`../app/(marketing)${path}/page.tsx`))).toBe(true)

    // ③ And the ANCHOR has to be one `/features` renders. This is the half a URL check
    // cannot do at all: `/features#nonsense` is a 200 that lands the reader at the top of
    // a long page, which reads as a button that did nothing. `FEATURE_FAMILIES` owns those
    // ids — its own note says an anchor is in whatever URL somebody shared — and this band
    // is pointing at the family that holds the eight commands.
    expect(FEATURE_FAMILIES.map((family) => family.anchor)).toContain(anchor)
  })
})
