'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button, ButtonLink, ButtonNavLink } from '@/components/ui'
import { GITHUB_REPO_URL } from '@/components/site/links'
import { DOWNLOAD_PATH } from '@/lib/siteNav'
import type { ChangelogVersion } from '@/lib/changelog'
import {
  CATEGORIES,
  formatReleaseDate,
  isKnownCategory,
  PAGE_CHROME,
  VERSIONS_PER_PAGE,
} from '@/lib/changelogPage'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { HomeSection } from '../home/Shell'

/**
 * The whole of `/changelog`: the headline, then every release as a row of two columns.
 *
 * ── THE SHAPE, AND WHERE IT COMES FROM ──────────────────────────────────────────────
 *
 * Modelled on CleanShot's changelog, measured off that page rather than eyeballed. Its
 * geometry is a grid of `278px / 1fr` with a 24px gap and a hairline under each row: the
 * DATE alone in the left column at 64% ink, and in the right column the version number
 * over the list of what it carried. Below 800px it collapses to one column.
 *
 * That arrangement is the reason to copy it. A changelog is read in two completely
 * different ways — "what shipped last week", scanned top to bottom, and "when did X
 * land", scanned down the left column alone — and giving the release's identity a column
 * of its own serves the second without costing the first anything. A date printed inline
 * above each entry, which is what this looked like before, only serves the first.
 *
 * WITH ONE CHANGE TO THE REFERENCE, AND IT IS THE ONE THING THIS PAGE DOES BETTER. The
 * left column holds the VERSION NUMBER as well as the date, and it is `sticky`: it pins
 * under the bar, rides down the length of one release, and is carried off the top by the
 * next one. A release with thirty entries is several screens long, and on the reference
 * you are three screens into a list with nothing on screen telling you which version you
 * are reading. Here that answer never leaves.
 *
 * It costs no machinery at all, which is why it is worth doing this way rather than with
 * a scroll listener: a sticky grid item is confined to its own GRID AREA, so the row IS
 * the range, and "until the next version" is the browser's containment rule rather than
 * a measurement that could disagree with the page. See the note on the rail below.
 *
 * WHAT WAS NOT COPIED, and each omission is a decision rather than an oversight:
 *   • The reference's release BADGE ("Major Update", a blue pill beside the number).
 *     There is no such field in `CHANGELOG.md` — it would have to be invented from the
 *     semver bump or from which sections a version happens to have, and a label derived
 *     from the data it sits next to tells the reader nothing the data did not.
 *   • Its per-release intro paragraph and its video links. Same reason: the file has no
 *     room for either, and an empty slot on 238 rows is worse than no slot.
 *   • Its gradient headline (ink → its own blue). The argument used to be that the band
 *     behind it was already blue; the band is white now (see the opening below), and the
 *     omission stands on its own feet instead — this page is two hundred rows of ink at
 *     three strengths, and a headline that is the only coloured type on it reads as a
 *     banner rather than as a title.
 *
 * ── THE OPENING IS WHITE, AND IT IS THE ONE PAGE THAT IS ────────────────────────────
 *
 * Every page in this group opened on the same `softblue → white` wash with `Bloom`
 * behind it, in one centred column. This one went first: it dropped both and split the
 * band in two instead — the page's name and its one line on the left, a drawing on the
 * right. The wash and the drawing were two decorations competing for the same band, and
 * only one of them says anything about the page.
 *
 * `/faq`, `/download` and `/features` have since followed. `/privacy` and `/terms` have
 * not, and that is deliberate rather than a job half done: those two are documents, and
 * a document has no drawing to put beside its title.
 *
 * THE LINK OUT TO `CHANGELOG.md` WENT WITH THEM. It sat under the lead, on the argument
 * that a reader after a two-year-old version should be told the whole file is one click
 * away before they start paging. It is gone at the owner's request, and the page still
 * offers it in the one place it is genuinely needed: the empty state below, where there
 * is no list to page through at all.
 *
 *
 * ── ONE INK AT SEVERAL ALPHAS ───────────────────────────────────────────────────────
 *
 * `text-ink` and `text-ink/60`, not `ink` and `muted`, and the ground is white rather
 * than `canvas`. That is `/features`'s convention and the reasoning is written out at
 * length in `FeaturesContent.tsx`: `muted` (#52525b) is a cooler, desaturated hue, so
 * next to `ink` (#0a0a0a) at this density the two read as two decisions instead of one
 * weakened. It matters more here than there — this page is nothing BUT text hierarchy,
 * and a list of two hundred releases holds together only if the date, the version and
 * the entries are visibly the same ink at three strengths.
 *
 * ── NO `marketing.css` ──────────────────────────────────────────────────────────────
 *
 * This tree is inside `homepageStylesheet.test.ts`'s scan (it walks `components/site/**`
 * and cuts out only `story/` and `documentation/`), so that is enforced rather than
 * remembered. Every value below is a token from `tailwind.config.ts` or a primitive from
 * `components/ui.tsx`. The old rendering lived under `documentation/`, which IS excluded
 * — moving the page here is what puts it under the rule.
 */

/**
 * A category's hue → the dot that carries it. `CATEGORIES` names the hue and this maps
 * it, the same split `lib/features.ts` and `LogoPlate` make: that module is read by a
 * test which cannot import a React component, so the class string lives here.
 *
 * A DOT AND NOT A `Badge`, and this is the one place the page turns down a design-system
 * primitive on purpose.
 *
 * `Badge`'s coloured tones are a hue on a 10% wash of itself — `text-green` on
 * `bg-green/10`, `text-yellow` on `bg-yellow/10`. Measured against this page's white
 * ground that is 2.1:1 and 1.8:1, at 11px, and on THIS page the label is the only thing
 * naming the category: there is no icon beside it and no heading above it, so a reader
 * who cannot make out the word has lost the group. That is a different job from the one
 * `Badge` does elsewhere in the product, where it repeats a state the row already shows.
 *
 * Splitting the two roles fixes it without touching the token: the DOT carries the
 * colour, which is what the eye scans a long list by, and the LABEL is ink, which is what
 * gets read. A 6px dot is not text and is not held to a text contrast ratio.
 *
 * Exhaustive by TYPE over `CATEGORIES`'s own hues, so a fourth category with a new hue is
 * a `tsc` error here rather than a group with no mark beside it.
 */
const DOTS: Record<(typeof CATEGORIES)[keyof typeof CATEGORIES]['hue'], string> = {
  green: 'bg-green',
  accent: 'bg-accent',
  yellow: 'bg-yellow',
}

/** The file this page is rendered from, for the reader who would rather have the source. */
const CHANGELOG_SOURCE_URL = `${GITHUB_REPO_URL}/blob/main/CHANGELOG.md`

export function ChangelogContent({ versions }: { versions: ChangelogVersion[] }) {
  // `lang` comes off the same hook as `t` — `useT` already returns it, precisely so a
  // caller that formats a date does not need a second subscription to say it twice.
  const { t, lang } = useT()

  // How many rows are on screen. The list is static build-time data in a fixed order, so
  // a count is the whole of the state — there is nothing to filter and nothing to sort.
  const [visible, setVisible] = useState(VERSIONS_PER_PAGE)

  return (
    // WHITE, not `canvas`. See the ink note above; `/features` paints its own ground the
    // same way, and the `(marketing)` layout deliberately paints none.
    <div className="bg-white [--reveal-from:0px]">
      {/* A FADE AND NOT A RISE, and it is one custom property rather than a second
          animation. `reveal-a`/`reveal-b` translate by `var(--reveal-from, 0.75rem)`,
          so setting that to zero HERE leaves the opacity half of the keyframes and
          takes the movement out — for every `Reveal` on the page at once, because a
          custom property inherits. The site bar already uses the same seam from the
          other end (`[--reveal-from:-1.25rem]`, to drop in from above).

          IT IS THESE TWO PAGES ONLY. The home, `/desktop` and `/workflow` still rise
          12px; that is deliberate, at the owner's request, and not a divergence to
          propagate by reading this file. To make the whole site fade, move this class
          onto the keyframes' own default in `tailwind.config.ts` and delete it here. */}
      {/* The page's opening band. `padding="hero"` still, because the bar is `fixed` at
          `h-16` and a page's first line owes it that — but no wash and no `Bloom`, which
          is where this parts company with `/features`'s recipe. See the header.

          NO `backdrop` AT ALL rather than an empty one: `HomeSection` turns `relative`
          and clips itself only when it is passed a layer, so dropping the prop also drops
          an `overflow-hidden` this band no longer needs. And no ground class either — the
          page's own `bg-white` is right underneath. */}
      <HomeSection padding="hero">
        {/* TWO COLUMNS: what the page IS on the left, a drawing of it on the right.
            It opened as one centred column — the argument being that centring an opening
            says "this is the page" — and a split says the same thing with the width it
            actually has: at 1100px a centred 768px block leaves the band's own edges
            unused, which is what made the drawing above the title so tall.

            IT STACKS BELOW `lg`, text first. The drawing is a decoration, so it is the
            half that waits: on a phone the heading and the line under it are the whole
            of what this band has to say.

            `items-center` rather than `items-start`: the text block is two elements tall
            and the drawing is several times that, so aligning their tops would hang the
            title off the top of a column of empty space. */}
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            {/* THE ENTRANCE, and the margins moved onto the wrappers with it: a `mt-6` on
                a child of a `Reveal` would have to collapse through an element that is
                being translated, which happens to work and is not a thing to depend on.
                On the wrapper it is a plain margin between two siblings.

                `order` counts the way the band is read — heading, line, buttons, then the
                drawing, 80ms apart. `Reveal` handles the rest: it plays on mount for what
                is already in view, waits for an `IntersectionObserver` for what is not,
                and leaves everything at rest for a reader who asked for less motion. */}
            <Reveal order={1}>
              <h1 className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl">
                {t(PAGE_CHROME.title)}
              </h1>
            </Reveal>
            {/* `max-w-md` inside a half-column that is already about that wide: it is the
                measure that holds on the wide screens where the column grows past it, so
                the line length stays readable instead of tracking the viewport. */}
            <Reveal order={2} className="mt-6">
              <p className="max-w-md text-lg leading-relaxed text-ink/60">
                {t(PAGE_CHROME.lead)}
              </p>
            </Reveal>

            {/* THE SAME PAIR EVERY HERO ON THIS SITE OPENS WITH: the blue fill takes
                you to the product, the white one further into the page you are on. The
                home, `/desktop` and `/workflow` all draw it, in this order and at this
                rung, and `site.hero.downloadCta` is literally the same key on all four —
                one sentence, so it cannot end up saying four things.

                `ButtonNavLink` for the download because `/download` is a ROUTE, and the
                site settled that question everywhere else: a bare `<a>` would make this
                the one internal link on the site that costs a full document load.

                `ButtonLink` — a plain `<a>` — for the other one, and that is not an
                inconsistency. A same-page fragment is not a route change at all. Every
                row carries `id="v0.96.6"` so `/changelog#v0.96.6` is a real address, and
                the site sets `scroll-behavior: smooth` globally, so an ordinary anchor
                animates there, survives being opened in a new tab, and leaves the reader
                something they can send to somebody. A `scrollIntoView` handler would be
                JavaScript reimplementing all three.

                The row's own `scroll-mt-24` keeps the version number clear of the fixed
                64px bar on arrival. It was already there for readers landing from a link
                in a PR; this button is the same journey starting on the page.

                THE SECOND BUTTON IS GUARDED and the first is not. `versions` is empty
                when the build could not read `CHANGELOG.md` — a real failure mode, see
                the empty state below — and a CTA pointing at `#vundefined` is worse than
                no CTA. The download has nothing to do with the file and stays. */}
            <Reveal order={3} className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonNavLink href={DOWNLOAD_PATH} variant="primary" size="lg" icon={Download}>
                {t('site.hero.downloadCta')}
              </ButtonNavLink>
              {versions.length > 0 && (
                <ButtonLink href={`#v${versions[0].version}`} variant="secondary" size="lg">
                  {t(PAGE_CHROME.seeLatest, { version: versions[0].version })}
                </ButtonLink>
              )}
            </Reveal>
          </div>

          {/* THE DRAWING.

              ITS FILE IS CROPPED, not sized down here. The source is a 1000×1000 canvas
              carrying the drawing at 761×950, so a third of the box is empty margin —
              which at this scale is ~100px of blank page inside the hero.
              `illustration-storage.svg` therefore ships with a `viewBox` of
              `120 25 761 950` and matching `width`/`height`, which is its measured
              bounding box. Nothing in this file has to correct for empty space.

              `alt=""`: a decoration. It says nothing the heading beside it does not, and
              a screen reader on its way to two hundred rows of changelog wants to get
              there. */}
          {/* THE `justify-self` MOVED TO THE WRAPPER, and it had to: `Reveal` renders a
              div, so that div is the grid item now and the image inside it is not. Left
              on the image the rule would simply stop applying, silently. */}
          <Reveal order={4} className="justify-self-center lg:justify-self-end">
            <img src="/img/illustration-storage.svg" alt="" className="w-full max-w-md" />
          </Reveal>
        </div>
      </HomeSection>

      <HomeSection padding="follow">
        {versions.length === 0 ? (
          /* THE HONEST EMPTY STATE. `loadChangelog()` returns nothing when it cannot
             find `CHANGELOG.md` — which depends on the deployment's root directory, so
             it is a real failure mode rather than a defensive branch (see the note on
             `CANDIDATES` in `lib/changelog.ts`). Saying so and pointing at the file is
             what the section this page replaces did, and it is still the right answer:
             the content exists, this build just could not read it. */
          <p className="text-base leading-relaxed text-ink/60">
            {t(PAGE_CHROME.unavailable)}{' '}
            <a
              href={CHANGELOG_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {t(PAGE_CHROME.readOnGithub)}
            </a>
          </p>
        ) : (
          <>
            <div className="flex flex-col">
              {versions.slice(0, visible).map((version, index) => (
                /* ONE ROW PER RELEASE, and an `id` on each so `/changelog#v0.88.0` is a
                   real address. Nothing on the page draws that anchor as a control — the
                   reference has no permalink either — but a release note linked from a
                   pull request, an issue or a support reply is the ordinary case, and an
                   anchor costs an attribute. `scroll-mt-24` for the same reason
                   `HomeSection` carries one: the bar is `fixed` and 64px tall, so a bare
                   fragment would drop the version number underneath it.

                   `border-b` on EVERY row including the last, which is the reference's
                   own choice and reads as deliberate here for a reason it does not have:
                   the list is paginated, so the final rule is the edge the button sits
                   under rather than a line dangling off the end of the document.

                   THE GRID IS `lg` AND NOT `md`. The reference switches at 800px, which
                   is between our two breakpoints; `md` (768px) would leave the left
                   column 220px and the entries ~470px, and an entry is a full sentence
                   with a bold scope in front of it. The rail is two short lines and
                   loses nothing by sitting above rather than beside.

                   `items-start` IS WHAT MAKES THE RAIL STICK, and it is easy to delete by
                   accident. A grid item stretches to its row's height by default, and a
                   box already as tall as the thing it would travel inside has nowhere to
                   travel — `position: sticky` on it is a silent no-op. Start-aligned, the
                   rail is only as tall as its own two lines and the row is the track it
                   moves along. Same reason `FeaturesSidebar` carries `self-start`; here it
                   is on the container because the right column wants it too. */
                /* EVERY ROW RISES INTO PLACE AS IT ARRIVES, which is what `Reveal` was
                   built for — and with NO `order`. A stagger is for the few elements of
                   one band crossing the fold together; on a list of twenty-five it would
                   hand the last row a two-second delay on top of its own arrival. The
                   scroll IS the stagger here.

                   `first:pt-0` BECAME AN INDEX CHECK, and that is a correctness fix
                   rather than a style: every article is now the only child of its own
                   wrapper, so `:first-child` matches ALL of them and the rule that was
                   meant to pull the first row up under the heading would have flattened
                   the padding off all twenty-five. */
                <Reveal key={version.version}>
                  <article
                    id={`v${version.version}`}
                    className={`grid scroll-mt-24 items-start gap-2 border-b border-hairline py-10 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-6 ${
                      index === 0 ? 'pt-0' : ''
                    }`}
                  >
                    {/* THE RAIL: which release this is — the number, then the day it
                        shipped — and it FOLLOWS THE READER DOWN ITS OWN ENTRIES.

                        A sticky grid item is confined to its GRID AREA, and that is the
                        whole trick: the area is this row and nothing else, so the rail
                        pins at 96px, travels the length of one release, and is carried
                        off the top by its own bottom edge exactly as the next release
                        arrives. No scroll listener, no measurement, no `IntersectionObserver`
                        deciding which version is current — the containment does it, and
                        it cannot disagree with what is on screen.

                        `lg:` ONLY. Below the breakpoint the grid is one column and the rail
                        sits above the entries rather than beside them, so a sticky one
                        would hover over the text scrolling under it — and it has no
                        background to hide behind, because in its own column it never needed
                        one. On a phone it stays put.

                        `top-24` — 96px — clears the `fixed h-16` bar with room under it,
                        the same offset `FeaturesSidebar` pins at, so the two pages agree on
                        where a pinned rail sits.

                        THE VERSION NUMBER MOVED IN HERE, out of the right column. The
                        reference keeps its number beside the copy and only the date in the
                        rail; that split cannot be made sticky without pinning two separate
                        boxes at one offset, and the second of them would be over the
                        entries scrolling beneath it. Putting both in the rail also fixes
                        something that was wrong before it: the `article` opened on a
                        `<time>` and reached its `<h2>` second, so every release was a
                        section whose heading was not its first line. */}
                    <div className="lg:sticky lg:top-24">
                      {/* An `h2`: the page's `h1` is "Changelog" and each release is a
                          section of it, so the outline reads as a document rather than as
                          a list of unlabelled boxes. The version number is the heading —
                          there is no title to put here, and inventing one from the entries
                          would be writing copy the file does not have. */}
                      <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink">
                        {version.version}
                      </h2>

                      {/* A `<time>` with a machine-readable `dateTime`, because the visible
                          string is localised into two languages and neither is parseable.
                          The attribute keeps the ISO date the file actually holds.

                          `block`, because `<time>` is inline by default and an inline box
                          would sit beside the heading's line box rather than under it. */}
                      <time
                        dateTime={version.date}
                        className="mt-1 block text-base leading-relaxed text-ink/60"
                      >
                        {formatReleaseDate(version.date, lang)}
                      </time>
                    </div>

                    <div>
                      {/* `gap-6` between categories against `gap-2` between entries: three
                          groups of one-line items only read as three groups if the space
                          between them is several times the space inside them.

                          NO TOP MARGIN. The version number used to head this column and the
                          categories cleared it by `mt-6`; the rail carries it now, so the
                          first category label starts level with the number beside it, which
                          is what makes the two columns read as one row. */}
                      <div className="flex flex-col gap-6">
                        {version.categories.map((category) => {
                          /* The parser matches `### (Added|Changed|Fixed)` and `CATEGORIES`
                             is keyed by those same three strings — `changelogPage.test.ts`
                             pins the two against each other by reading that regex out of
                             the source. This guard is what happens if they ever disagree
                             anyway: the entries still render, under their raw English
                             heading and a neutral dot, rather than the row throwing on an
                             undefined hue and taking the whole page with it. */
                          // Bound to a `const` first, and that is not a style preference:
                          // `isKnownCategory` is a type guard, and TypeScript narrows a
                          // property access like `category.type` only through the guard
                          // call itself — not through a boolean stored beside it. On the
                          // local, the narrowing survives into the branch.
                          const type = category.type
                          const dress = isKnownCategory(type) ? CATEGORIES[type] : null

                          return (
                            <div key={type}>
                              {/* THE GROUP'S NAME. Uppercase at `text-xs` with the letters
                                  opened up — the shape of a label rather than of a line of
                                  prose, which is what keeps it from reading as the first
                                  entry of the list under it. `text-ink/50` puts it a rung
                                  below the entries themselves (70%) and two below a scope
                                  (100%): it is the quietest thing in the column, because it
                                  is the only thing there a reader already knows. */}
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${dress ? DOTS[dress.hue] : 'bg-ink/25'}`}
                                />
                                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">
                                  {dress ? t(dress.label) : type}
                                </span>
                              </div>

                              <ul className="mt-3 flex flex-col gap-2">
                                {category.items.map((item, index) => (
                                  // Index is a legitimate key here: this is static
                                  // build-time data that is never reordered, inserted into
                                  // or filtered.
                                  <li
                                    key={index}
                                    className="flex gap-2.5 text-[15px] leading-relaxed text-ink/70"
                                  >
                                    {/* A DRAWN BULLET, not `list-disc`. The marker box a
                                        browser draws sits on the first line's baseline and
                                        is styled with the text, so a wrapped entry hangs
                                        under its own bullet rather than beside it. A flex
                                        row with a dot of its own gives the whole entry one
                                        hanging indent, which is what a list of sentences
                                        this long needs.

                                        `mt-[0.6em]` and not a fixed pixel offset: the dot
                                        has to sit on the CAP height of the line beside it,
                                        and that moves with the font size. In `em` it
                                        follows. */}
                                    <span
                                      aria-hidden
                                      className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink/25"
                                    />
                                    {/* `min-w-0` so the flex item can be narrower than its
                                        longest word, and `overflow-wrap: anywhere` so that
                                        word then breaks: entries quote identifiers and
                                        flags with no spaces in them, and one of those at
                                        390px pushed the whole page 32px wide. */}
                                    <span className="min-w-0 [overflow-wrap:anywhere]">
                                      {/* THE SCOPE, IN FULL INK, and the entry at 70%.
                                          That is the reference's device — a bold name, then
                                          the sentence — and it is what makes a column of
                                          two hundred one-line entries scannable: the eye
                                          runs down the bold words and stops at the one it
                                          came for.

                                          A COLON and not the reference's dash, because the
                                          two are not the same kind of label. Its bold is a
                                          feature NAME ("Smart Zooms") and a dash reads as
                                          an apposition; ours is a SCOPE ("Desktop",
                                          "Landing", "Deps"), and a scope introduces what
                                          follows it. Same convention the file itself uses. */}
                                      {item.component ? (
                                        <>
                                          <span className="font-semibold text-ink">
                                            {item.component}
                                          </span>
                                          {': '}
                                        </>
                                      ) : null}
                                      {item.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            {/* THE ONLY BUTTON ON THE PAGE. `secondary` and not `primary`: `brand` is the
                fill of a primary action and this page has none — nothing here is a step
                towards installing anything, and a blue button at the bottom of a
                changelog would be the loudest thing on it.

                Centred under the list, so it reads as the list continuing rather than as
                a control belonging to the last row above it. */}
            {visible < versions.length ? (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setVisible((shown) => shown + VERSIONS_PER_PAGE)}
                >
                  {t(PAGE_CHROME.showMore)}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </HomeSection>
    </div>
  )
}
