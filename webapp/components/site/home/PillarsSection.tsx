'use client'

import { ToneCard } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { StartTerminal } from '../features/StartTerminal'
import { SkillsTimeline } from './SkillsTimeline'
import { HomeSection } from './Shell'

/**
 * The band directly under the hero: the product is TWO THINGS, one card each, and a line
 * underneath saying what they add up to.
 *
 * WHY IT OPENS THE PAGE'S BODY. The hero names an outcome ("De l'idée à la PR mergée")
 * and the band below it shows the app's window at length. Between the two, a reader who
 * has never heard of this product still does not know WHAT IT IS — a CLI? an editor? a
 * hosted service? — and the window alone answers that with a picture they have to
 * interpret. Two cards answer it in a sentence each: eight skills in your terminal, and a
 * window that runs them. Everything after this is detail.
 *
 * TWO CARDS AND NOT THREE. There is no third half of the product, and a grid that would
 * take one is a grid that invites someone to invent one — the cut bands this page has
 * already lost (`app/(marketing)/page.tsx` keeps that history) all started as a slot
 * somebody had to fill.
 *
 * `midnight` BESIDE `sky`, one dark and one light, which is the rule `CARD_TONE_CYCLE`
 * encodes for a row ("two light then two dark, so a four-column row lands one of each").
 * The row took four grounds to get here and each move was forced by what the card had to
 * hold, so the trail is worth keeping:
 *
 *   1. `indigo`, chosen on that rule — but the card then carried a `LogoPlate` on
 *      ANTHROPIC'S ORANGE, and those two colours fight.
 *   2. `mist`, so the orange plate had a pale ground to sit on, the relationship
 *      `ShowcaseCard`'s header describes ("the plate can be their brand without the page
 *      becoming it"). That cost the row its dark half.
 *   3. `amber`, by the owner's call, which put the plate on a warm ground instead.
 *   4. `midnight`, once the plate was replaced by `SkillsTimeline` — a rail and five
 *      words, drawn in white. Nothing on the card is anybody else's colour any more, so
 *      there is nothing left to keep it light, and the row gets its dark half back.
 *
 * `StartTerminal` KEEPS `sky` THROUGHOUT, and it is not free to move: it is `bg-ink`, and
 * its own header says it is drawn for "a card whose ground is a pale blue — the contrast
 * is what makes it read as a window ON the card rather than as a panel OF it". A dark
 * panel on a dark card loses that, which is why the dark half of the row had to be this
 * card and could never have been that one.
 *
 * ONE THING THE `amber` ROUND LEFT BEHIND, now moot but worth knowing if it comes back:
 * `tailwind.config.ts` reserves four grounds to be "asked for by name, never dealt", and
 * two of them MEAN something — amber opens the loop on `/magic:start`, mint closes it on
 * `/magic:done`. Wearing amber here shared that meaning with a band about the product as
 * a whole. `midnight` is a cycle tone and carries no such debt.
 *
 * THE VISUALS ARE BORROWED, both of them, and that is the point rather than a shortcut:
 *
 *   • The skills card carries `SkillsTimeline`, drawn for it: the cycle as a blue line
 *     running left to right, a dot per stop, cut by the card's RIGHT edge. It is the
 *     third thing to stand there and the history is short — the Claude Code mark on a
 *     `LogoPlate` first (a logo says WHOSE the skills are, which the title already says
 *     in three words), then a ring cut by the bottom edge, then this. A ring said the
 *     work comes back round; a line leaving the frame says it keeps going, and the second
 *     is what the product owner asked for. Anthropic's mark is still on the page, in the
 *     app window below, where it belongs.
 *   • The desktop card carries `StartTerminal`, the drawing `/features` puts inside its
 *     `/magic:start` card. Reused verbatim rather than redrawn: it is already a faithful,
 *     token-only panel that crops out of its card, and a second drawing of the same run
 *     would be the one that drifts. It is propless, so there is nothing to configure.
 *
 * WHAT THE COPY DELIBERATELY DOES NOT SAY. The desktop card does not repeat the parallel-
 * agents claim — that belongs to `DesktopSection` below, whose subtitle is built on it,
 * and saying it twice on one screen reads as a page with two openings. This card says
 * what the app IS; that one says what it does at scale.
 */
export function PillarsSection() {
  const { t } = useT()

  return (
    // `padding="follow"` because THIS is now the band under the hero — the rung exists for
    // exactly that position ("the band DIRECTLY UNDER a hero", `Shell.tsx`), and it moved
    // here from `DesktopSection` when this band was inserted above it.
    <HomeSection padding="follow">
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal order={1}>
          <ToneCard
            tone="midnight"
            title={t('site.pillars.skillsTitle')}
            description={t('site.pillars.skillsDesc')}
            className="h-full"
          >
            {/* LEFT PADDED, RIGHT NOT, and the asymmetry is the drawing's whole
                mechanic: the timeline has to be cut by the card's own right edge, so
                there must be nothing between the two. `ToneCard` is `overflow-hidden`,
                so the card's radius does the cutting and `SkillsTimeline` never has to
                know it is being cropped — the same arrangement `StartTerminal` uses
                beside it. The left keeps its gutter so the first stop lines up with the
                copy above it and the cut reads as ONE edge rather than two.

                `overflow-hidden` HERE TOO, and it is not redundant: this wrapper is a
                block in the card's column, and without it the row's real width would
                widen the column and push the card past its grid track. The card would
                still clip what showed, but the two cards would have stopped being the
                same width. */}
            <div className="overflow-hidden">
              <SkillsTimeline />
            </div>
          </ToneCard>
        </Reveal>

        <Reveal order={2}>
          <ToneCard
            tone="sky"
            title={t('site.pillars.desktopTitle')}
            description={t('site.pillars.desktopDesc')}
            className="h-full"
          >
            {/* UNPADDED, so the panel runs to the card's edges and is cut by its radius —
                `StartTerminal`'s own header explains that it is drawn wider than its
                column for that reason, and that the card's `overflow-hidden` does the
                clipping so the panel never has to know it is being cropped. */}
            <StartTerminal />
          </ToneCard>
        </Reveal>
      </div>

      {/* THE LINE THAT ADDS THEM UP, and it is the reason the band is two cards rather
          than two sections: neither half is the product, and this says so. Centred and
          narrower than the grid, so it reads as a conclusion drawn under the two columns
          rather than as a third card's worth of copy.

          `font-display` AND `text-ink`, not the `text-muted` body it was first set in.
          This is the band's conclusion and the one line on the page that names the reader,
          and grey body type under two loud cards read as a caption someone had added
          rather than as the point. It stays a step under `BAND_TITLE` so it concludes the
          band instead of opening a new one. */}
      <Reveal order={3}>
        <p className="mx-auto mt-12 max-w-2xl text-center font-display text-xl font-bold leading-snug text-ink md:text-2xl">
          {t('site.pillars.kicker')}
        </p>
      </Reveal>
    </HomeSection>
  )
}
