'use client'

import { ArrowRight, Building2, NotebookPen, UserRound } from 'lucide-react'
import { ButtonNavLink, FeaturePoints, SplitFeature } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'
import { Reveal } from '../Reveal'
import { CloudBrowserMockup } from './CloudBrowserMockup'
import { HomeHeading, HomeSection } from './Shell'

/**
 * THE BAND AFTER "Built for developers. Not only for them.": the half of the product that
 * opens in a browser — a heading, a paragraph, three rows and a button, beside a drawing
 * of the dashboard loading.
 *
 * WHY IT IS HERE. The page had shown the reader the eight commands and the app's own
 * window and then went straight to what the product does with their code; nothing on it
 * said that a configuration, an organization and an account exist at all, which is the
 * one thing a reader deciding for a TEAM needs to know. The product owner asked for a
 * "block Cloud" and placed it: "juste après « Fait pour les développeurs. Pas seulement
 * pour eux. »" — so it follows `BuiltForSection` and precedes `SecuritySection`.
 *
 * WHICH IS ALSO THE RIGHT SEAM. The band above closes the account of the DESKTOP side —
 * five cards about living in that window — and the band below is about what the product
 * does with a repository. Between the two is exactly where "and none of this is on one
 * machine" lands: it answers the question the five cards raise (what happens on my second
 * Mac, and on my colleague's) before the page moves on to a different subject.
 *
 * IT WAS ASKED FOR AS TWO BANDS AND SHIPS AS ONE. The brief opened "Block Cloud juste
 * après Organisation", then corrected itself — "alors le block Organisation n'existe pas
 * encore donc on va le mettre juste après…" — and the organization is instead the SECOND
 * of this band's three rows. That is the better division rather than a shortcut: an
 * organization is not a separate promise from the cloud, it is what the cloud holds, and
 * two adjacent bands whose subject is "your account" and "your team's account" would be
 * one argument read twice.
 *
 * ── THE ARRANGEMENT ───────────────────────────────────────────────────────────────
 *
 * `SplitFeature` with `media="left"`, asked for in those terms — "j'aimerai qu'on
 * reprenne le style block comme les 8 skills" — which is `SkillsSection`'s shape exactly:
 * a heading, a paragraph, three claims in `FeaturePoints`, one `secondary` button, and a
 * large drawing on a coloured plate beside them. Nothing here dresses the recipe, so the
 * three splits on this page stay one composition at three subjects.
 *
 * THE SIDE IS THE ALTERNATION AND NOT A COPY OF THE SKILLS BAND'S. `SPLIT_MEDIA` in
 * `components/ui.tsx` says a page whose every picture is on the same side reads as a
 * template, and this page now runs left (skills), right (app), left (this) — so the third
 * split lands on `left` by the rule and by the request at once, which is worth recording
 * because it looks like a coincidence. Note the two are no longer ADJACENT splits: the
 * five-card built-for band sits between this one and the app band, so the alternation is
 * now about the page's rhythm rather than about two neighbours.
 *
 * THE PLATE IS GREEN, by request — "une illustration de la webapp sur un background
 * vert". `tone-mint`, which is the design system's own green ground, and it is the third
 * tone a drawing on this page sits on: rose under the skills terminal, sky under the app
 * window, mint here. The gradient reading as a gradient is what fixed the plate's shape —
 * the browser runs off its right edge and sits inside a band of green on the other three
 * sides, and `PLATE` in `CloudBrowserMockup` holds the measurements that decided that.
 * That file also says why the browser is a loading skeleton rather than the dashboard.
 *
 * THE BUTTON IS `secondary`, like the two splits above it and for their reason: the brand
 * fill is spent in the hero and in the ask at the end, and a page with four blue buttons
 * in it is a page asking four times. It opens `/cloud`, which is still a placeholder page
 * (`PLACEHOLDER_PAGES` in `lib/siteNav.ts`) — the row is in the header's Product menu
 * already, so this is the page BODY reaching a route the bar has always offered, not a
 * link to nowhere.
 *
 * TWO `Reveal`s, in `SkillsSection`'s arrangement: the copy as one block, the drawing a
 * beat behind, and the drawing's own `Reveal` INSIDE the `art` slot rather than around
 * the whole band — wrapping the band would make one element the flex item and collapse
 * the row.
 */

/**
 * THE THREE ROWS UNDER THE PARAGRAPH, and they are the dashboard's own three pages:
 * `/plans`, `/organization`, `/account`. Asked for as "Liste des plan / Organisation
 * settings / Your Account management", which is that nav read out loud.
 *
 * THE ICONS ARE THE APP'S OWN, straight off `NAV_LINKS` in `components/TopNav.tsx` —
 * `NotebookPen`, `Building2`, `UserRound`, in that order. That is `AppSection`'s
 * discipline ("the icons are the app's own where the app has one") and it pays for itself
 * here more than anywhere: a reader who follows the button and signs in meets these three
 * glyphs in the same order in the bar at the top of the product. The rows are a table of
 * contents for a real screen, so borrowing its icons is not decoration.
 *
 * A MODULE CONST AND NOT A `lib/` MODULE, which is the call `AppSection` documents: a
 * band's rows live in `lib/` only when something OUTSIDE `webapp/` reads them too
 * (`lib/skillsBand.ts` exists because the root vitest suite checks its keys). Nothing
 * reads these but the component below, so a file in `lib/` would be one more thing to
 * keep in step for no second reader.
 *
 * NO CHIPS. `AppSection`'s rows name Jira, GitHub and Claude Code, and put a mark and a
 * name on a tinted plate for each, because those rows are claims about somebody else's
 * product. Every noun in these three is OURS — a plan, an organization, an account — so
 * there is nothing to identify and the rows are plain strings. Which means no `id` is
 * needed either: `FeaturePoint` keys on the label when the label is a string.
 */
const POINTS = [
  { icon: NotebookPen, label: 'site.cloudBand.pointPlans' },
  { icon: Building2, label: 'site.cloudBand.pointOrg' },
  { icon: UserRound, label: 'site.cloudBand.pointAccount' },
] as const

/**
 * The rows, translated, in the shape `FeaturePoints` takes — the same helper the two
 * splits above have, and a function for their reason: the component stays a composition,
 * and the translator is passed in rather than a second `useT()` subscribing to the
 * language again for three strings.
 */
function points(t: ReturnType<typeof useT>['t']) {
  return POINTS.map(({ icon, label }) => ({ icon, label: t(label) }))
}

export function CloudSection() {
  const { t } = useT()

  return (
    <HomeSection>
      <SplitFeature
        media="left"
        art={
          <Reveal order={2}>
            <CloudBrowserMockup />
          </Reveal>
        }
      >
        <Reveal order={1}>
          <HomeHeading title={t('site.cloudBand.title')} subtitle={t('site.cloudBand.subtitle')} />

          {/* `mt-10` under the paragraph and `mt-10` again over the button, which is the
              stack both splits above build and at the same two gaps. Against
              `HomeHeading`'s own `mt-4`, the three spaces are a hierarchy rather than a
              rhythm: the subtitle belongs to the heading, the rows are a separate move,
              and the button is a third. The button's margin is a wrapping `div` because
              a `mt-10` through `className` would be additive layout on a recipe that
              already owns its own box. */}
          <FeaturePoints className="mt-10" points={points(t)} />

          <div className="mt-10">
            <ButtonNavLink
              href={PLACEHOLDER_PAGES.cloud.path}
              variant="secondary"
              size="lg"
              icon={ArrowRight}
            >
              {t('site.cloudBand.cta')}
            </ButtonNavLink>
          </div>
        </Reveal>
      </SplitFeature>
    </HomeSection>
  )
}
