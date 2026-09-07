'use client'

import { ArrowRight, GitMerge, Sparkles, SquareTerminal, type LucideIcon } from 'lucide-react'
import { ButtonNavLink, FeaturePoints, SplitFeature } from '@/components/ui'
import {
  SKILLS_BAND_CHROME,
  SKILLS_BAND_PATH,
  SKILLS_BAND_POINTS,
  type SkillsBandIcon,
} from '@/lib/skillsBand'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { SkillsRunTerminal } from './SkillsRunTerminal'
import { HomeHeading, HomeSection } from './Shell'

/**
 * THE BAND AFTER "Working with Magic Slash": the skills themselves, argued in a heading,
 * a paragraph and three claims, beside a Claude Code session running seven of them one
 * after the other.
 *
 * WHY IT IS HERE AND NOT SOMEWHERE ELSE ON THE PAGE. The band above it names the five
 * MOMENTS of a working day and draws each as the artefact it produces; this one names the
 * TOOL those moments are made of, and it has to come second because a reader who has not
 * been shown the day has no use for a list of eight commands. It sits before
 * `DesktopSection` for the same reason that band sits where it does: the page runs from
 * the most abstract to the most concrete without a step back — what it is, what a day with
 * it looks like, what you type, and then the window all of it happens in.
 *
 * IT IS NOT "the eight commands" COMING BACK, and the difference is worth being exact
 * about because that band's cut is documented at length in `app/(marketing)/page.tsx`.
 * `CommandsSection` was a GRID: eight cards, one per command, each with a name and a line
 * of description — an inventory on a landing page, which is the thing `/features` exists
 * to be. This band shows no inventory at all. It makes one argument — eight skills carry a
 * ticket end to end and barely stop to ask you anything — and points at the inventory with
 * a button. `site.commands.*` stays where it is, read by `/features` and `/workflow`.
 *
 * ── THE ARRANGEMENT ───────────────────────────────────────────────────────────────
 *
 * `SplitFeature`, which is new to the design system and was written for this band:
 * a band's worth of copy beside a large drawing, either way round. The reference is one
 * the product owner brought — media a little over half the row, copy centred against it,
 * a short list of claims under the paragraph, one button — and the component owns the
 * arrangement while this file owns what goes in it. See `components/ui.tsx` for why the
 * copy arrives as `children` rather than as `title` / `description` props: the heading in
 * this block IS the band's `h2`, at the size every band on this page sets its headline in,
 * and that recipe has exactly one home (`BAND_TITLE`, next door in `Shell.tsx`). A prop
 * would have had to respell it.
 *
 * `media="left"`, which is what the reference does and what the product owner asked for.
 * THE OTHER SIDE IS AVAILABLE and is the reason it is an option rather than a hard-coded
 * `flex-row-reverse`: the next band to use this shape should put its drawing on the right,
 * because a page whose every picture is on the same side reads as a template. The design
 * system gallery shows both.
 *
 * `HomeHeading` IS REUSED AS IT IS, and it needed no change to serve a third band: it is
 * `max-w-2xl`, left-aligned, an `h2` under the page's one `h1`. The width does nothing
 * here — the copy column is narrower than `max-w-2xl` at every breakpoint — which is
 * exactly the shape a component gets to have when nobody dresses it from the call site.
 *
 * THE BUTTON IS `secondary`, and it is the only band on the page whose button is not the
 * brand fill. Two reasons, and both are about the band directly above: that one's button
 * is `primary` and points at `/workflow`, and two brand-blue buttons within one screen of
 * each other read as a page asking twice. The reference's own button is a white pill with a
 * hairline, which is what `secondary` is. The primary fill stays where it earns its
 * loudness — the hero, and the ask at the end.
 *
 * ── THE ENTRANCE ──────────────────────────────────────────────────────────────────
 *
 * TWO `Reveal`s AND NOT FIVE. The copy column enters as ONE block rather than heading,
 * then points, then button: they are one paragraph of argument, and staggering the three
 * would animate the reader's eye down a list it is meant to take in at once. The drawing
 * is the second, a beat behind — which is the right order, since the copy is what says
 * what the drawing is.
 *
 * THE DRAWING'S `Reveal` IS INSIDE `art` rather than around the whole block, because
 * `SplitFeature` is a flex row and its two children are the flex items. Wrapping the block
 * would have made one `Reveal` the item and collapsed the row — the same trap
 * `WorkflowSection` documents from the other direction, where the grid span has to go on
 * the `Reveal` and not on the card.
 */

/**
 * The three claims' icons, by the lucide name `lib/skillsBand.ts` carries.
 *
 * THE MAP IS HERE AND THE NAMES ARE THERE, which is the arrangement `lib/commands.ts`
 * documents: that module must not import `lucide-react` (the root vitest suite runs on the
 * root `node_modules` and CI never installs `webapp/`'s dependencies), so it names an icon
 * and whoever draws it resolves the name. The union makes this record exhaustive, so a
 * fourth claim is a compile error here rather than a missing glyph on the page.
 */
const ICON: Record<SkillsBandIcon, LucideIcon> = {
  SquareTerminal,
  GitMerge,
  Sparkles,
}

export function SkillsSection() {
  const { t } = useT()

  return (
    <HomeSection>
      <SplitFeature
        media="left"
        art={
          <Reveal order={2}>
            <SkillsRunTerminal />
          </Reveal>
        }
      >
        <Reveal order={1}>
          <HomeHeading
            title={t(SKILLS_BAND_CHROME.title)}
            subtitle={t(SKILLS_BAND_CHROME.subtitle)}
          />

          {/* `mt-10` between the paragraph and the claims, against the `mt-4` inside
              `HomeHeading` and the `gap-6` between the rows themselves. The three gaps are
              a hierarchy and not a rhythm: the subtitle belongs to the heading, the claims
              are a separate move, and a reader has to see that at a glance rather than
              read three evenly spaced blocks and work out which is which. */}
          <FeaturePoints className="mt-10" points={points(t)} />

          {/* A `div` rather than a margin on the button, because a `mt-10` through
              `className` would be additive layout on a recipe that already owns its own
              box — safe here, and the wrapper is what keeps the button's own class list
              about the button. `inline-flex` on the recipe means it takes its label's
              width and no more, so nothing has to stop it stretching. */}
          <div className="mt-10">
            <ButtonNavLink
              href={SKILLS_BAND_PATH}
              variant="secondary"
              size="lg"
              icon={ArrowRight}
            >
              {t(SKILLS_BAND_CHROME.cta)}
            </ButtonNavLink>
          </div>
        </Reveal>
      </SplitFeature>
    </HomeSection>
  )
}

/**
 * The claims, translated, in the shape `FeaturePoints` takes.
 *
 * A FUNCTION AND NOT AN INLINE `.map()`, so the component above reads as the composition
 * it is. It takes the translator rather than calling `useT()` itself: `Translate` is the
 * type `lib/i18n` exports for exactly this — anything that needs to translate without
 * being a hook — and a second `useT()` in a helper would be a second subscription to the
 * language for the same three strings.
 */
function points(t: ReturnType<typeof useT>['t']) {
  return SKILLS_BAND_POINTS.map(({ icon, label }) => ({
    icon: ICON[icon],
    label: t(label),
  }))
}
