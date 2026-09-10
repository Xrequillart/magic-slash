import type { MessageKey } from './i18n'

/**
 * THE SECURITY BAND — five cards under "built for developers, and not only": what the
 * product does and does not do with your code.
 *
 * A MODULE RATHER THAN FIVE OBJECTS IN THE COMPONENT, on `lib/workflow.ts`'s and
 * `lib/skillsBand.ts`'s shape and for the reason `skillsBand.ts` sets out at length: `tsc`
 * never runs on `webapp/` in CI, so a `MessageKey` union inside a component guarantees
 * nothing, and `t()` has no per-key fallback — a renamed catalogue entry ships as a card
 * with a title and a hole under it, in silence. Named here, every key below goes through
 * `security.test.ts`, which runs in the ROOT vitest suite and looks each one up in both
 * catalogues for real.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n`: the root suite runs on the ROOT `node_modules` and CI
 * never installs `webapp/`'s dependencies (see the note in `vitest.config.ts`). A `react`,
 * `next/*` or `lucide-react` import at any depth from here would fail to RESOLVE, which
 * reads as a broken suite rather than a broken module. Which is why `art` below is a NAME
 * and not a component; the band resolves it through a map beside the markup.
 *
 * ── WHAT EVERY CLAIM RESTS ON ─────────────────────────────────────────────────────
 *
 * THIS IS THE ONE BAND ON THE PAGE WHERE A WRONG SENTENCE IS A LIE ABOUT SECURITY, so
 * every card below was checked against the source before it was written, and the check is
 * recorded on the card. Nothing here is aspirational, and two things a reader might expect
 * to find are deliberately absent:
 *
 *   • "YOUR CODE NEVER LEAVES YOUR MACHINE" IS NOT CLAIMED, because it is not true. The
 *     skills run inside Claude Code, and Claude Code sends code to Anthropic — that is
 *     what it is. What IS true, and what the band says instead, is that MAGIC SLASH never
 *     sees it: `desktop/src/main/usage/skill-invocations.ts` states in its own header that
 *     "only the skill name is collected — no prompt, no args, no code".
 *   • NO COMPLIANCE STATUS IS ASSERTED. The GDPR card says what is stored, which is a fact
 *     about the code; it does not say the product is certified, audited or hosted in any
 *     particular place, because none of those is something this file can verify. A legal
 *     claim is the company's to make, not a drawing's.
 *
 * AND ONE THING IS DELIBERATELY UNDERSTATED: activity logging is ON by default (see
 * `usageLogsEnabled`, read as `!== false`), so it is opt-OUT and the copy says "a switch
 * turns it off" rather than "you opt in". Getting that backwards would be the exact kind
 * of privacy claim that costs a company its credibility when somebody checks.
 */

/** The band's own chrome, as catalogue keys. */
export const SECURITY_CHROME = {
  /**
   * The band's `h2`. A CLAIM and not the category label the owner named the block with
   * ("Security & Privacy") — every other headline on this page is a claim, and a reader
   * who has scrolled this far is owed the sentence rather than the heading it sits under.
   *
   * It is also the strongest TRUE thing this band can say. See the header for the stronger
   * sentence next door that is false.
   */
  title: 'site.security.title',
  /** The two lines under it: what the cloud actually holds, itemised. */
  subtitle: 'site.security.subtitle',
  /**
   * The acronym inside the European emblem on the GDPR card — RGPD in French, GDPR in
   * English.
   *
   * IN THIS TABLE AND NOT SPELLED IN THE DRAWING, for the reason `WORKFLOW_CHROME`'s
   * `planIssuesCreated` is: a key typed inline in a component is a key nothing pins, so
   * renaming it on both sides passes `i18n.test.ts` and leaves the badge rendering an empty
   * `<text>` — and `t()` has no per-key fallback to catch it. Named here, it goes through
   * `security.test.ts`'s catalogue loop with the rest.
   */
  gdprMark: 'site.security.gdprMark',
} as const satisfies Record<string, MessageKey>

/**
 * The art names, resolved to components by whoever draws them.
 *
 * `injection` IS GONE. A fifth card — "a ticket cannot give the agent orders", on every
 * skill's untrusted-content contract — was cut when the band went to two rows of two, and
 * the cost is worth recording because it was the band's most differentiating claim: nobody
 * else's landing page says it, and it was true. It went rather than the other two because
 * it is the only one of the three short cards the product owner did not ask for in the
 * original brief. Its copy stays in the catalogues; see the note there.
 */
export type SecurityArt = 'privateRepo' | 'gdpr' | 'commitGuard' | 'secrets'

/**
 * The tones these five cards ask for BY NAME — a deliberate subset of `CARD_TONES`, kept
 * as its own union here for the purity reason above and cross-checked against that table
 * by `security.test.ts`, which reads `components/ui.tsx` as TEXT (the trick
 * `features.test.ts` and `designTokens.test.ts` both use on the same file).
 *
 * THE GROUNDS ARE CHOSEN BY WHAT STANDS ON THEM, which is unusual on this site and is
 * forced by what each drawing is made of: several of them are single-colour, so their card
 * decides whether they can be seen at all.
 *
 *   • the padlock is drawn in WHITE, so its card must be dark — `midnight`;
 *   • the branch graph is near-black ink on a hairline, with one red disc, so its card must
 *     be light — `sky`. It replaced a black shield, which wanted the same thing for the
 *     same reason, so the ground survived the change of drawing;
 *   • the GDPR seal brings its own blue disc and can sit anywhere, which is what makes its
 *     ground the only free choice of the four. It sat on `mist` for that reason — the
 *     palest ground on the site, chosen so the emblem was the only saturated thing on the
 *     card — and the owner moved it to `mint`. See below for what that changes.
 *
 * `mint` IS THE BAND'S ONLY NON-BLUE GROUND, and it is the owner's call. It is the one card
 * here whose drawing does not care what is under it, so it is the one that could take it
 * without costing anything: the seal's blue disc reads on a pale green as well as it read on
 * `mist`, and `components/ui.tsx` gives `mint` the same dark ink every light tone in this
 * band already uses, so nothing about the type changes either.
 *
 * WHAT IT COSTS IS `mint`'S MEANING SOMEWHERE ELSE. `CARD_TONES` records that green is
 * "earned rather than added" and is asked for BY NAME because it MEANS something — on
 * `/features` it dresses `/magic:done`, where the loop closes. A second green on the home
 * page dilutes that by exactly one card. It is worth saying out loud rather than discovering
 * later: this band is not the loop, so the two greens do not contradict each other, but the
 * argument for naming a tone is weaker the more places name it.
 *
 * WHAT IT BUYS is the one warm-adjacent note in four blues, on the card a reader is most
 * likely to skim past — "what we store" is the least visual claim in the band, and it now
 * has the ground that makes it the card the eye lands on.
 *
 * THE SECRETS TABLE IS THE OTHER EXCEPTION, and it is the owner's call rather than the rule's.
 * It shipped on `indigo` because its panel is the site's off-white and a pale panel wants a
 * saturated ground under it — the mirror of `StartTerminal`'s rule. The owner moved it to
 * `sky`, and what that costs is written down rather than argued: `sky`'s field is #E2EEFC
 * and the panel is #F4F7FE, twelve points apart, so the separation now rests on
 * `shadow-lift` and on the tone's own blooms gathering under the panel rather than on the
 * ground being a different colour. It reads, and it reads less.
 *
 * WHAT IT ALSO COSTS IS THE BAND'S SECOND DARK CARD. Before the move each row paired one
 * light card with one dark one and the two rows inverted each other — `sky` beside
 * `midnight`, then `indigo` beside `mist`. It is now `sky`, `midnight`, `mist`, `sky`:
 * three light grounds and one dark, with the only dark card in the top-right corner. The
 * band is lighter and flatter than it was, which is a legitimate thing to want and not
 * something that fell out of the pairing rule. The GDPR card's move to `mint` since then
 * makes the run `sky`, `midnight`, `mint`, `sky` — same weights, one of them no longer
 * blue.
 *
 * `mist` AND `indigo` ARE STILL IN THIS UNION with no card on them, and deliberately: it is
 * the set of grounds this band is allowed to use, not an inventory of the four in use today.
 * Both were on cards one round ago and either could come back.
 */
export type SecurityTone = 'midnight' | 'mist' | 'sky' | 'indigo' | 'mint'

export type SecurityCard = {
  id: SecurityArt
  tone: SecurityTone
  title: MessageKey
  description: MessageKey
  /**
   * This card takes TWO of the row's three columns; a card without it takes one.
   *
   * TWO CARDS A ROW, ONE LONG AND ONE SHORT, by the product owner's layout — "un card 2
   * block de longueur et un card 1 block de longueur par ligne". The long slot goes to the
   * two cards that carry a WIDE drawing and could not work without the width: a branch graph
   * is a horizontal object, and a table cropped at its right edge needs something to crop.
   *
   * THE TWO ROWS RUN OPPOSITE WAYS: long-then-short, then short-then-long. The owner asked
   * for the second row to be swapped, and what it buys is that the two wide drawings sit
   * DIAGONALLY across the band instead of stacked down its left edge — so the eye crosses
   * the band rather than running down one side of it. The SIZES did not swap with the
   * positions, and could not have: the seal is a 128px object that would waste a long slot,
   * and the table has nothing to crop in a short one.
   *
   * THE BAND WAS THREE-THEN-TWO ON SIX COLUMNS before this, which was itself the owner's
   * earlier brief ("tout sur la même ligne") back when there were three cards. Five cards
   * became four in the same move; see `SecurityArt` for which one went and what it cost.
   */
  wide?: true
  /**
   * This card's drawing is a PANEL cropped by the card's bottom-right corner, not an
   * object floating in the middle of it — so it takes `ToneCard`'s `end` slot instead of
   * `center`.
   *
   * ONE CARD HAS IT, and the distinction is the slot's own: `ToneCardVisual` documents
   * `center` as being for "a visual that is an OBJECT rather than a crop — one bar, one
   * switch, one tile, complete in itself", and `end` as being for a panel that "runs off
   * the card" and is cut by its radius. Four of these five are objects; the secrets table
   * is the crop.
   */
  crop?: true
}

export const SECURITY_CARDS: readonly SecurityCard[] = [
  /**
   * ① The commit guard rail, LONG. VERIFIED in `skills/magic-commit/SKILL.md`, step 4.6: a
   * branch matching `main`, `master`, `develop`, `dev`, `staging`, `production`, `trunk` or
   * the repo's configured development branch stops the skill and asks; with
   * `allowOnProtectedBranch: false` there is no question at all and a branch is cut instead.
   *
   * It opens the band by the owner's call. It is also the right card to open on: of the four
   * it is the one that describes an action the product REFUSES to take, which is the
   * least expected thing on this page and therefore the most worth reading first.
   */
  {
    id: 'commitGuard',
    tone: 'sky',
    title: 'site.security.guardTitle',
    description: 'site.security.guardDesc',
    wide: true,
  },
  /**
   * ② The repository, SHORT. VERIFIED: the skills operate on the local clone through git in
   * the user's own shell, and what the desktop persists per repository is `path`,
   * `keywords`, `languages`, the commit and PR options — the shape `/config` returns. No
   * file contents are read into anything that leaves the machine.
   */
  {
    id: 'privateRepo',
    tone: 'midnight',
    title: 'site.security.repoTitle',
    description: 'site.security.repoDesc',
  },
  /**
   * ③ GDPR, SHORT — and FIRST on its row, where the long card leads on row one. VERIFIED as
   * a statement about what is stored: the account, the repository settings, and the
   * per-skill hour counts (`skill-invocations.ts`, whose header says "no prompt, no args,
   * no code"). NOT a compliance assertion; see this file's header.
   */
  {
    id: 'gdpr',
    tone: 'mint',
    title: 'site.security.gdprTitle',
    description: 'site.security.gdprDesc',
  },
  /**
   * ④ Secrets, LONG. VERIFIED in `skills/magic-commit/SKILL.md`, steps 2.2 and 2.3: `.env`,
   * `.env.*`, `credentials.*`, `secrets.*`, `*.pem` and `*.key` are scanned for, reported,
   * and reset out of the index after `git add -A` — the skill's own comment calls those
   * patterns "a safety net even if .gitignore is misconfigured", which is exactly the claim
   * the card makes.
   */
  {
    id: 'secrets',
    tone: 'sky',
    title: 'site.security.secretsTitle',
    description: 'site.security.secretsDesc',
    wide: true,
    crop: true,
  },
]
