import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import { SECURITY_CARDS, SECURITY_CHROME } from './security'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/security.ts` may import nothing but `./i18n` — see the note on that file. THIS TEST
 * EXISTING IS WHAT KEEPS THAT TRUE: add a `react`, a `next/*` or a `lucide-react` import
 * over there and this fails to RESOLVE rather than shipping a bundle dragged into a list
 * of five cards.
 *
 * ITS OTHER HALF IS UNUSUAL FOR THIS SUITE, and it is the reason the file is worth reading.
 * Every other data module here is checked for CONSISTENCY — the keys exist, the order is
 * right, the anchor resolves. This band's copy makes CLAIMS ABOUT SECURITY, and the failure
 * that matters is not a missing key: it is a sentence that stops being true because
 * somebody changed a skill. So three of the tests below read the SHIPPED SKILLS as text and
 * assert that the mechanism each card describes is still in them.
 *
 * That is a blunt instrument and it is deliberately blunt. It cannot tell you the copy is
 * accurate; it can tell you the thing the copy is about has been deleted or renamed, which
 * is the way a claim on a landing page actually goes stale. A card that promises a guard
 * rail nobody implements any more is the single worst thing this page could ship.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

const repo = (relative: string) => fileURLToPath(new URL(`../../${relative}`, import.meta.url))
const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

const COMMIT_SKILL = readFileSync(repo('skills/magic-commit/SKILL.md'), 'utf8')


describe('the security band', () => {
  it('names keys the catalogues actually carry', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.security.guardDesc", which does not say who wanted it. Here it
    // does.
    for (const key of Object.values(SECURITY_CHROME)) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }

    for (const card of SECURITY_CARDS) {
      expect(site(card.title), `en.${card.title} (${card.id})`).toBeTruthy()
      expect(siteFr(card.title), `fr.${card.title} (${card.id})`).toBeTruthy()
      expect(site(card.description), `en.${card.description} (${card.id})`).toBeTruthy()
      expect(siteFr(card.description), `fr.${card.description} (${card.id})`).toBeTruthy()
    }
  })

  it('fills both rows of the three-column grid exactly, and alternates the long slot', () => {
    // TWO CARDS A ROW, ONE OF TWO COLUMNS BESIDE ONE OF ONE, TWICE. That is the product
    // owner's layout, and a fifth card or a `wide` flag moved leaves a hole in a grid
    // nobody is looking at on the width it appears at. Asserting the arithmetic is cheaper
    // than asserting the pixels.
    //
    // THE ORDER IS PART OF IT: long-short, then SHORT-LONG. Both fill, and the difference
    // is where the two wide drawings land — the owner asked for the second row to be
    // swapped so they sit diagonally across the band instead of stacked down its left
    // edge. An exact list rather than a sum, because a sum cannot tell the two apart.
    const columns = SECURITY_CARDS.map((card) => (card.wide ? 2 : 1))
    expect(columns).toEqual([2, 1, 1, 2])
    expect(columns.reduce((sum, n) => sum + n, 0) % 3).toBe(0)

    // And the two long slots are the cards that carry a wide drawing — see the note on
    // `wide`. A padlock in the long slot would waste it; a cropped table in the short one
    // would have nothing to crop.
    expect(SECURITY_CARDS.filter((card) => card.wide).map((card) => card.id)).toEqual([
      'commitGuard',
      'secrets',
    ])
  })

  it('names a ground that the design system actually declares', () => {
    // THIS USED TO BE THE RULE THIS BAND'S GROUNDS EXISTED FOR — the padlock drawn in
    // white, the branch graph in near-black ink, so either card taking the other's ground
    // made its drawing invisible. Half of it is unenforceable now; see below.
    //
    // THE SECRETS PANEL USED TO BE HELD TO THE SAME RULE and no longer is. It is
    // `bg-canvas`, so it wanted the dark ground the padlock wants, for the same reason in
    // reverse — `StartTerminal`'s rule, that contrast is what makes a panel read as
    // something ON a card rather than a hole IN it. The owner moved that card to `sky`
    // deliberately; `lib/security.ts` records what the move costs. The assertion is gone
    // rather than loosened, because a guard that admits the case it was written for is a
    // guard that will pass whatever anybody does next. `CARD_TONES` in
    // `components/ui.tsx` is the authority on which tones are dark; read as TEXT for the
    // purity reason in this file's header — the same trick `features.test.ts` and
    // `workflow.test.ts` use on that file.
    const ui = readFileSync(webapp('../components/ui.tsx'), 'utf8')
    const tone = (name: string) =>
      ui.split('\n').find((line) => line.trim().startsWith(`${name}: { surface:`)) ?? ''

    // A dark tone is the one whose title ink is white; that pairing is declared in
    // `CARD_TONES` precisely so a tone and its ink can never be separated.
    const isDark = (name: string) => tone(name).includes("title: 'text-white'")

    for (const card of SECURITY_CARDS) {
      expect(tone(card.tone), `${card.tone} declared in CARD_TONES`).toBeTruthy()
    }

    // THE PADLOCK'S HALF OF THIS RULE IS GONE, and not because it stopped mattering: the
    // two dark card grounds were removed from `CARD_TONES` at the owner's request, so
    // there is no dark ground left for a white drawing to ask for. `privateRepo` is on
    // `lemon` now and its padlock — a pale 3D object lit for a dark field — reads washed
    // out there. That was the owner's call, made with the rendering in front of them.
    //
    // The assertion is deleted rather than inverted. `isDark` can only ever be false now,
    // so `toBe(false)` on all three would be three tautologies dressed as a guard, and a
    // guard that cannot fail is worse than none: it reports success for ever. What is
    // left below is the half that still has teeth — every tone named here has to be one
    // `CARD_TONES` actually declares, which is what catches a card left on a ground that
    // no longer exists.
  })

  it('still has a commit guard rail to promise', () => {
    // CARD ③. The claim is that the commit skill stops on a protected branch and offers to
    // cut one instead, and that a setting turns the question into a permanent no. If that
    // step is ever removed from the skill, this card becomes a promise the product does not
    // keep — which is the failure this whole file exists for.
    expect(COMMIT_SKILL, 'the protected-branch guard').toContain('allowOnProtectedBranch')
    for (const branch of ['main', 'master', 'develop', 'staging']) {
      expect(COMMIT_SKILL, `${branch} named as protected`).toContain(`\`${branch}\``)
    }
  })

  it('still has a secrets guard to promise', () => {
    // CARD ④. The claim is that these patterns are pulled back out of the index even when
    // the gitignore let them through, and the skill's `git reset HEAD --` line is the whole
    // mechanism. Each pattern is asserted on its own: dropping ONE of them — private keys,
    // say — would leave the card's sentence four-fifths true, which is the version nobody
    // would notice.
    for (const pattern of ['.env', 'credentials', 'secrets', '*.pem', '*.key']) {
      expect(COMMIT_SKILL, `${pattern} kept out of the index`).toContain(pattern)
    }
    expect(COMMIT_SKILL, 'the unstage step itself').toContain('git reset HEAD --')
  })

  // THE UNTRUSTED-CONTENT GUARD WENT WITH ITS CARD. A test here used to read all eight
  // `SKILL.md` files and assert that each still carried the "## Untrusted content" section
  // and its "do not quietly drop it" clause, because a fifth card claimed exactly that on
  // the page. That card was cut (see `lib/security.ts`), so the assertion no longer guards
  // a promise anybody is making and it is gone rather than left as a test of nothing.
  //
  // IT IS THE ONE THING LOST IN THE CUT THAT WAS NOT COPY: nothing now fails if a skill
  // ships without that section. If the card comes back, so should the test — it is in this
  // file's history, and `SKILLS` above was only ever there to feed it.

  it('claims no compliance status, no hosting and no certification', () => {
    // THE ONE TEST HERE THAT GUARDS AGAINST OVERCLAIMING rather than against going stale.
    // `lib/security.ts`'s header states that the GDPR card says what is stored and stops
    // there, because compliance is a legal position the company holds and not something a
    // card can assert — and the easiest way for that decision to be quietly reversed is a
    // reword that sounds better. These are the words such a reword would reach for.
    const copy = SECURITY_CARDS.flatMap((card) => [
      site(card.title),
      site(card.description),
      siteFr(card.title),
      siteFr(card.description),
    ]).concat(Object.values(SECURITY_CHROME).map(site), Object.values(SECURITY_CHROME).map(siteFr))

    // WHOLE WORDS, and the first draft was not: `certifi` matched "certificates" in card
    // ④'s own copy, which is a legitimate word for a legitimate thing the commit skill
    // keeps out of the index. Worth recording rather than quietly widening — a guard that
    // fires on honest copy gets deleted by the next person who hits it, and then the
    // overclaim it was written for goes through unopposed.
    for (const line of copy) {
      expect(line.toLowerCase(), `"${line}"`).not.toMatch(
        /compliant|compliance|conforme|conformit|certified|certification|certifié|audited|audité|iso 27001|soc 2/,
      )
    }
  })
})
