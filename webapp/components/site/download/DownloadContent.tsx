'use client'

import {
  ArrowUpRight,
  Download,
  GitBranch,
  Hexagon,
  Plug,
  ShieldCheck,
  Sparkles,
  Terminal,
  type LucideIcon,
} from 'lucide-react'
import { ButtonLink, ButtonNavLink, Card } from '@/components/ui'
import { GITHUB_REPO_URL, RELEASE_TAG_URL } from '@/components/site/links'
import type { ChangelogVersion } from '@/lib/changelog'
import { CATEGORIES, formatReleaseDate, isKnownCategory } from '@/lib/changelogPage'
import { DESKTOP_DOWNLOAD_URL, LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'
import {
  FIRST_LAUNCH,
  PAGE_CHROME,
  REQUIREMENTS,
  type DownloadIcon,
  type DownloadPoint,
} from '@/lib/downloadPage'
import { useT } from '@/lib/i18n/useLanguage'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { RichText } from '../RichText'

/**
 * The whole of `/download`: the button, what the machine needs first, what the first
 * launch does, and what the build being handed out changed.
 *
 * ── WHY A PAGE AND NOT A LINK ──────────────────────────────────────────────────────
 *
 * Every download button on the site used to point at the `.dmg`. The footer's row and
 * `FinalCtaSection` still do, and that is fine at the END of a page — a reader who has
 * scrolled the homepage has been told what they are getting. The hero's button and the
 * one on `/desktop` open THIS page instead, because a visitor two seconds in has not:
 * which Macs it runs on, the three things it will check for, and the fact that there is
 * no script to run are all things worth saying before a 100 MB file lands in their
 * Downloads folder. The page says them in that order, and the button is at the top of
 * it so nobody has to read them to get the file.
 *
 * ── THE FOUR BANDS ─────────────────────────────────────────────────────────────────
 *
 *   1. THE ASK, on the same opening every reference page in this group has
 *      (`padding="hero"`, `softblue → white`, `Bloom` fading `to-white`). One primary
 *      button, and it is the only primary on the page: `brand` is the primary CTA fill
 *      and this is the one page on the site whose entire purpose is that one press.
 *   2. PREREQUISITES — three `Card`s, one per thing the first launch checks. The same
 *      three `site.faq.prerequisites.a` lists; a paragraph there, a row of cards here,
 *      because a reader about to install scans rather than reads.
 *   3. FIRST LAUNCH — three numbered steps on the `canvas` ground, so the two
 *      instruction bands alternate grounds instead of running into one another.
 *   4. WHAT CHANGED — the release notes of `LATEST_DESKTOP_VERSION` only, dressed the
 *      way `/changelog` dresses a row (same dots, same scope-then-sentence entries), with
 *      a `secondary` button out to that page. The whole history is that page's job; this
 *      band answers "what am I getting" and hands over.
 *
 * `release` IS A PROP AND NOT A LOOKUP: `loadChangelog()` reads `CHANGELOG.md` with
 * `node:fs`, so it runs in `page.tsx` (a server component) and the matching entry is
 * handed down. `null` when the file could not be read at build time — a real failure
 * mode, see `CANDIDATES` in `lib/changelog.ts` — and the band then says so and points at
 * the GitHub release, which is what `ChangelogContent` does too.
 *
 * NO `FinalCtaSection` UNDER IT, unlike `/desktop`. That band's one button downloads the
 * `.dmg`, and a download page ending on a second download button is the same ask twice;
 * `/changelog` makes the same call for the opposite reason.
 *
 * `bg-white` on the wrapper, like every page in this group: the `(marketing)` layout
 * paints no ground, so whichever page owns one paints its own.
 */

/**
 * `lib/downloadPage.ts` names its glyphs rather than importing lucide (the root vitest
 * suite reads it, see the note there); this is the map back to components. The
 * fallback exists so a name added over there without a row here draws SOMETHING —
 * `downloadPage.test.ts` reads this file as text to make sure that never happens.
 */
const ICONS: Record<DownloadIcon, LucideIcon> = {
  Terminal,
  Hexagon,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Plug,
}

/** The category dots, the same three hues `ChangelogContent` maps — kept in step by hand. */
const DOTS: Record<(typeof CATEGORIES)[keyof typeof CATEGORIES]['hue'], string> = {
  green: 'bg-green',
  accent: 'bg-accent',
  yellow: 'bg-yellow',
}

const CHANGELOG_PATH = '/changelog'
const ALL_RELEASES_URL = `${GITHUB_REPO_URL}/releases`

export function DownloadContent({ release }: { release: ChangelogVersion | null }) {
  const { t, lang } = useT()

  return (
    <div className="bg-white">
      {/* ── 1. THE ASK ──────────────────────────────────────────────────────────── */}
      <HomeSection
        padding="hero"
        backdrop={<GreenBloom />}
        className="bg-gradient-to-b from-softgreen to-white"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <Reveal order={1}>
            {/* WHICH BUILD, said before the title. The pill is `/desktop`'s eyebrow
                recipe with a green dot in front: the one place on the site `green` is
                spent on decoration is the Download row in the header, and this is the
                same fact — "this is current" — on the page it opens. The date is the
                changelog's, so when the file could not be read the pill drops to the
                version alone rather than printing an empty `{date}`. */}
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3.5 py-1.5 text-xs font-bold text-muted">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green" />
              {release
                ? t(PAGE_CHROME.versionBadge, {
                    version: LATEST_DESKTOP_VERSION,
                    date: formatReleaseDate(release.date, lang),
                  })
                : `v${LATEST_DESKTOP_VERSION}`}
            </span>
          </Reveal>

          <Reveal order={2}>
            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-[3.6rem] [text-wrap:balance]">
              {t(PAGE_CHROME.title)}
            </h1>
          </Reveal>

          <Reveal order={3}>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted">
              {t(PAGE_CHROME.lead)}
            </p>
          </Reveal>

          <Reveal order={4} className="flex flex-col items-center gap-3">
            {/* A PLAIN `<a>` (`ButtonLink`) AND NOT `ButtonNavLink`: the href is a file
                on GitHub, not a route, and a `<Link>` to another origin prefetches a
                redirect for nothing. No `target="_blank"` either — GitHub answers with
                `Content-Disposition: attachment`, so the browser saves the file and this
                page stays exactly where it is. Opening a tab to do that would leave a
                blank one behind. */}
            <ButtonLink href={DESKTOP_DOWNLOAD_URL} variant="primary" size="lg" icon={Download}>
              {t(PAGE_CHROME.button)}
            </ButtonLink>
            <p className="text-xs text-muted/80">
              {t(PAGE_CHROME.fileHint, { version: LATEST_DESKTOP_VERSION })}
            </p>
          </Reveal>

          <Reveal order={5}>
            {/* Three facts, no verb — `/desktop`'s own line under its buttons, with the
                platform said precisely (Apple Silicon, not macOS) because this is the page
                where that precision matters: it is the one thing that decides whether the
                button works for the reader at all. */}
            <p className="flex flex-wrap items-center justify-center gap-2.5 text-sm text-muted">
              <span>{t('site.desktop.reassureFree')}</span>
              <Dot />
              <span>{t(PAGE_CHROME.reassureChip)}</span>
              <Dot />
              <span>{t(PAGE_CHROME.reassureSigned)}</span>
            </p>
          </Reveal>
        </div>
      </HomeSection>

      {/* ── 2. PREREQUISITES ────────────────────────────────────────────────────── */}
      <HomeSection padding="follow">
        <HomeHeading
          eyebrow={t(PAGE_CHROME.requirementsEyebrow)}
          title={t(PAGE_CHROME.requirementsTitle)}
          subtitle={t(PAGE_CHROME.requirementsLead)}
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {REQUIREMENTS.map((point) => (
            <li key={point.id}>
              <PointCard point={point} />
            </li>
          ))}
        </ul>

        {/* THE LINE THAT TAKES THE PRESSURE OFF. Three cards in a row read as a checklist
            to complete before pressing the button, and they are not one: the app probes
            all three at first launch and offers to install whatever is missing. Set as
            large, bold display type and centred — the one centred thing in the band — so
            it reads as the band's conclusion rather than as a fourth card's caption.
            `[text-wrap:balance]` keeps the two lines even, like the `h1`. */}
        <p className="mx-auto mt-14 max-w-3xl text-center font-display text-2xl font-black leading-snug tracking-tight text-ink md:text-3xl [text-wrap:balance]">
          {t(PAGE_CHROME.requirementsReassure)}
        </p>
      </HomeSection>

      {/* ── 3. FIRST LAUNCH ─────────────────────────────────────────────────────── */}
      <HomeSection className="bg-canvas">
        <HomeHeading
          eyebrow={t(PAGE_CHROME.launchEyebrow)}
          title={t(PAGE_CHROME.launchTitle)}
          subtitle={t(PAGE_CHROME.launchLead)}
        />
        {/* An `<ol>`, because the order IS the content: the app checks, then installs,
            then wires, and a step cannot start before the one above it passed. The
            numeral is drawn large and light so the three read as a sequence at a glance
            and the glyph beside it says what kind of step it is. */}
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {FIRST_LAUNCH.map((point, index) => {
            const Icon = ICONS[point.icon]
            return (
              <li key={point.id} className="flex flex-col rounded-2xl border border-hairline bg-white p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-black leading-none text-ink/15">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                    <Icon className="h-5 w-5 text-brand" aria-hidden />
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-bold leading-snug text-ink">
                  {t(point.title)}
                </h3>
                <RichText
                  k={point.body}
                  as="p"
                  className="mt-2 text-[15px] leading-relaxed text-muted [&_code]:rounded [&_code]:bg-black/[0.05] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-ink"
                />
              </li>
            )
          })}
        </ol>
      </HomeSection>

      {/* ── 4. WHAT CHANGED ─────────────────────────────────────────────────────── */}
      <HomeSection id="changelog">
        <HomeHeading
          eyebrow={t(PAGE_CHROME.changelogEyebrow)}
          title={t(PAGE_CHROME.changelogTitle, { version: LATEST_DESKTOP_VERSION })}
          subtitle={t(PAGE_CHROME.changelogLead)}
        />

        {release ? (
          <ReleaseNotes release={release} />
        ) : (
          /* THE HONEST EMPTY STATE, the same one `/changelog` prints when the build could
             not read `CHANGELOG.md`: the notes exist, this build just does not have them.
             The GitHub release always does. */
          <p className="mt-10 text-base leading-relaxed text-ink/60">
            {t('site.changelog.unavailable')}{' '}
            <a
              href={RELEASE_TAG_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {t(PAGE_CHROME.releaseNotes)}
            </a>
          </p>
        )}

        {/* THE WAY ONWARD. `secondary` for the changelog page — `brand` is spent on the
            download button above and nothing else on this page is a step toward
            installing anything. The GitHub release beside it as a footnote link, not a
            second button: it is the same notes in another place, for whoever wants the
            assets or the commit list. */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonNavLink href={CHANGELOG_PATH} variant="secondary" size="lg">
            {t(PAGE_CHROME.fullChangelog)}
          </ButtonNavLink>
          <a
            href={RELEASE_TAG_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink"
          >
            {t(PAGE_CHROME.releaseNotes)}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>

        {/* The last line, for whoever needs a build that is not this one: an earlier
            release, or a look at what an update will replace. A hairline above it so it
            reads as the page's footnote rather than as part of the band. */}
        <p className="mt-14 border-t border-hairline pt-6 text-sm text-muted">
          {t(PAGE_CHROME.olderVersions)}{' '}
          <a
            href={ALL_RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            {t(PAGE_CHROME.allReleases)}
          </a>
        </p>
      </HomeSection>
    </div>
  )
}

function Dot() {
  return <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-muted/50" />
}

/**
 * `Bloom` (`HeroSection.tsx`) in green: the same three pools at the same places and the
 * same fade to white, with the blue swapped for the green the header's Download row is
 * drawn in. Every other page in this group opens blue; this one opens on the colour the
 * menu already gave the ask, so the row and the page it opens agree.
 *
 * `green` IS A STATUS TOKEN (see `tailwind.config.ts`) and this is the second place on
 * the site it is spent on decoration, after that menu row — and for the same reason: a
 * download that is ready is the one unambiguously good news on the site, so the two
 * readings do not fight. At 20% and 15% it is a wash rather than a signal.
 */
function GreenBloom() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-green/20 blur-3xl" />
      <div className="absolute -left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-green/15 blur-3xl" />
      <div className="absolute -right-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-green/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
    </div>
  )
}

/** One prerequisite: a tiled glyph, a name, and one sentence on why the app needs it. */
function PointCard({ point }: { point: DownloadPoint }) {
  const { t } = useT()
  const Icon = ICONS[point.icon]

  return (
    <Card className="flex h-full flex-col p-6">
      {/* The same 48px white tile `/desktop`'s highlights draw, so the two pages' rows
          of "things about the app" agree on what a glyph on a card looks like. */}
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-white shadow-card">
        <Icon className="h-5 w-5 text-brand" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-lg font-bold leading-snug text-ink">{t(point.title)}</h3>
      <RichText
        k={point.body}
        as="p"
        className="mt-2 text-[15px] leading-relaxed text-muted [&_code]:rounded [&_code]:bg-black/[0.05] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-ink"
      />
    </Card>
  )
}

/**
 * One release, dressed the way `/changelog` dresses a row — the version and date in a
 * rail, the categories beside it — inside a `Card` so it reads as an excerpt of that
 * page rather than as the page itself. The rail is not sticky here: it is one release,
 * and a card of a dozen lines has nothing to follow.
 */
function ReleaseNotes({ release }: { release: ChangelogVersion }) {
  const { t, lang } = useT()

  return (
    <Card className="mt-10 grid gap-6 p-6 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:p-8">
      <div>
        <p className="font-display text-2xl font-bold leading-tight tracking-tight text-ink">
          {release.version}
        </p>
        <time dateTime={release.date} className="mt-1 block text-base leading-relaxed text-ink/60">
          {formatReleaseDate(release.date, lang)}
        </time>
      </div>

      <div className="flex flex-col gap-6">
        {release.categories.map((category) => {
          // Bound first so the type guard narrows — same note as in `ChangelogContent`.
          const type = category.type
          const dress = isKnownCategory(type) ? CATEGORIES[type] : null

          return (
            <div key={type}>
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
                  // Static build-time data, never reordered: the index is a fine key.
                  <li key={index} className="flex gap-2.5 text-[15px] leading-relaxed text-ink/70">
                    <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink/25" />
                    <span>
                      {item.component ? (
                        <>
                          <span className="font-semibold text-ink">{item.component}</span>
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
    </Card>
  )
}
