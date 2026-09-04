'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { GITHUB_REPO_URL } from '@/components/site/links'
import type { ChangelogVersion } from '@/lib/changelog'
import {
  CATEGORIES,
  formatReleaseDate,
  isKnownCategory,
  PAGE_CHROME,
  VERSIONS_PER_PAGE,
} from '@/lib/changelogPage'
import { useT } from '@/lib/i18n/useLanguage'
import { Bloom } from '../home/HeroSection'
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
 *   • Its gradient headline (ink → its own blue). This page's hero already carries the
 *     site's blue — the `softblue → white` wash with `Bloom` behind it, the same opening
 *     `/features` has — and a gradient in the type on top of a gradient in the band is
 *     two of them arguing over one screen.
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
    <div className="bg-white">
      {/* The page's opening band, on `/features`'s recipe: `padding="hero"` because the
          bar is `fixed` at `h-16` and the first line owes it that, the `softblue → white`
          wash, and `Bloom` fading `to-white` so the band lands cleanly on the ground
          below instead of leaving a blue-grey step at its bottom edge. */}
      <HomeSection
        padding="hero"
        backdrop={<Bloom fadeTo="to-white" />}
        className="bg-gradient-to-b from-softblue to-white"
      >
        {/* Centred, and the list below is not. Centring an opening says "this is the
            page"; centring two hundred rows of prose would only make them harder to
            scan. Same split `/features` makes. */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl">
            {t(PAGE_CHROME.title)}
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/60">
            {t(PAGE_CHROME.lead)}
          </p>
          {/* THE WAY OUT TO THE SOURCE, and it is in the hero rather than at the bottom
              on purpose. The list is paginated, so a reader after a version from two
              years ago would otherwise have to press the button eight times to discover
              that the whole file is one link away. Here it is offered before they start.

              A plain `<a>` and not `ButtonLink`: this is a footnote under a lead, not
              the page's action. The page has exactly one button and it is at the bottom. */}
          <a
            href={CHANGELOG_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink"
          >
            {t(PAGE_CHROME.readOnGithub)}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
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
              {versions.slice(0, visible).map((version) => (
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
                <article
                  key={version.version}
                  id={`v${version.version}`}
                  className="grid scroll-mt-24 items-start gap-2 border-b border-hairline py-10 first:pt-0 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-6"
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
                                  <span>
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
