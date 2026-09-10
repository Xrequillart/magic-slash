'use client'

import { ToneCard, type CardTone, type ToneCardVisual } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { OrgTeamArt, PlanSharingArt, SharedConfigArt, TeamTasksArt } from './OrgArt'
import { HomeHeading, HomeSection } from './Shell'

/**
 * The band after the cloud: WHAT STOPS BEING YOURS ALONE, in four coloured cards.
 *
 * WHY IT IS HERE, directly after `CloudSection`, and it moved to get here. The owner first
 * placed it under `SkillsSection` ("partie organisation juste après le block Skills") and
 * then moved it down to follow the cloud band, which is the better seam for a reason worth
 * writing down.
 *
 * The page up to this point is addressed to ONE PERSON: the hero promises an outcome, the
 * pillars say what the product is, the workflow band walks a ticket to a merged PR, the
 * skills band names the eight commands, and the two app bands show the window they run in.
 * Every one of those sentences has "you" as its subject. `CloudSection` is where that
 * changes — its headline is "your configuration does not live on one machine" — and the
 * question it leaves open is WHOSE machines. This band is four answers to that question,
 * so it lands on a reader who has just been given the premise instead of having to supply
 * it. Under the skills band it made the same argument cold, three bands before anything
 * had said the configuration goes anywhere at all.
 *
 * IT IS STILL THE FIRST BAND WHOSE SUBJECT IS PLURAL, which is what the move preserves:
 * the cloud band is about one person's several machines, and this one is about several
 * people.
 *
 * FOUR CARDS, AND THEY ARE THE OWNER'S FOUR, in the order they were given: the
 * configuration a project shares, the organisation itself, plans that circulate, and the
 * backlog everyone draws from. What holds them together is a single mechanic rather than a
 * theme — each one names something that used to live on one laptop and now lives in an
 * organisation. That is also what keeps the band honest: nothing here is a feature the app
 * might grow into, and every card has a screen or a relationship behind it.
 *
 * NO BUTTON, BY REQUEST — "avec titre, description sans CTA". Which is right for where it
 * sits, and MORE right since the band moved: there is no `/organisation` page to send
 * anyone to, and by this point the page has already spent all three of its links out —
 * `/workflow`, `/features` and `/cloud`, the last of them on the band immediately above.
 * A fourth ask here, one band before the closing CTA, would be the page nagging.
 *
 * ── THE GRID ──────────────────────────────────────────────────────────────────────
 *
 * Two by two, and it is the shape the CONTENT chose rather than a default. Two of these
 * four carry a faithful screen — the repository's General tab and the Tasks modal — and a
 * dark window needs about 420px before its rows stop wrapping (`OrgArt`'s `WINDOW` records
 * the number). At `max-w-site` a half-width card is 538px, which clears that with room for
 * the crop; a third-width card would not, and the three-column grid next door
 * (`BuiltForSection`) has to give its window TWO of its columns for exactly this reason.
 * So: `md:grid-cols-2`, one column below that, no spans and no wide card.
 *
 * THE SPAN-FREE GRID IS ALSO WHY THE ORDER READS DOWN COLUMNS AS WELL AS ACROSS. Column
 * one is the two REPRODUCTIONS (a config page over a backlog, both dark windows), column
 * two the two DIAGRAMS (people on wires over a share graph). That was not planned — it
 * falls out of the owner's card order — and it is worth not disturbing: each column has one
 * anchor card setting its height and one lighter card beside it.
 *
 * `grid-cols-1` AND `min-w-0`, both load-bearing, both for the reason `BuiltForSection`
 * spells out: the two windows declare a `min-w-[26rem]`, and a grid track sized `auto`
 * grows to its content's MINIMUM — so on a phone a bare `grid` would widen this column to
 * 416px and take the document sideways with it. `grid-cols-1` makes the track
 * `minmax(0, 1fr)`; `min-w-0` does the same for the item inside it, whose automatic
 * minimum in a grid is otherwise its min-content.
 *
 * ── THE TONES ─────────────────────────────────────────────────────────────────────
 *
 * Not `CARD_TONE_CYCLE`, for `BuiltForSection`'s reason: the cycle deals four tones by
 * POSITION, which is right for a grid whose cards mean nothing in particular, and two of
 * these four have a ground their drawing decided. Each card names its tone.
 *
 * `sky` ON BOTH WINDOW CARDS, and it is not free to be anything else.
 * `TasksModalMockup` says outright that "a near-black panel dropped straight onto white
 * reads as a hole cut in the section", and `BuiltForSection` reached the same place by
 * experiment — its Tasks card opened on `mist`, the palest tone, and had to move. `sky` is
 * saturated enough at its deep end to hold a dark window and light enough that the four
 * cards still read as one set. Both windows here are that same near-black, so both take it.
 *
 * `mist` ON THE ORGANISATION CARD, because the reference the owner gave for that drawing IS
 * a pale blue wash with white objects on it, and those objects are the composition's whole
 * mechanic. On a dark ground they would still pop — arguably harder — but every one of them
 * is a WHITE surface carrying `shadow-card` (see `OrgArt`'s `Member`, which is built that
 * way rather than ringed so its shadow survives), and a soft ink shadow cast by a white
 * disc onto a dark ground is invisible. The drawing would have to be rebuilt, not
 * re-toned.
 *
 * `indigo` ON THE PLAN CARD, which is the row's dark half and the band's one saturated
 * card. `tailwind.config.ts` calls it "the accent, lit"; a white line drawing on it reads
 * brighter than the same drawing on `midnight`, and brightness is what a graph made
 * entirely of 2px strokes needs. `midnight` was the alternative and it is the deeper
 * ground — right for a glowing object (`BuiltForSection`'s Mac card, above), a step too
 * heavy for hairlines.
 *
 * WHICH LEAVES ONE BREAK IN THE ALTERNATION, KNOWINGLY: the top row is `sky` beside
 * `mist`, two light grounds touching. Everything else alternates — `sky` over `indigo` down
 * the first column, `mist` over `sky` down the second, `indigo` beside `sky` across the
 * bottom — and this one cannot be fixed without taking a tone off a card that needs it.
 * `BuiltForSection` accepts the same break for the same reason and on the same argument:
 * the two are separated by what is ON them, a near-black settings pane against white pills
 * and photographs on almost-white, which is a louder difference than a tone step. It also
 * buys a band that reads as one family rather than as four samples.
 */

/** The four cards, in the order the owner laid them out. See THE GRID. */
const CARDS: readonly {
  id: string
  tone: CardTone
  title: MessageKey
  description: MessageKey
  /**
   * Where the drawing sits in the height the copy leaves. `end` for the two cropped
   * windows, so they are cut by the card's own bottom radius; `center` for the two that
   * are complete OBJECTS — see `ToneCardVisual` in `components/ui.tsx` for why an object
   * pinned to the bottom edge reads as a mistake.
   */
  visual: ToneCardVisual
  Art: () => React.JSX.Element
}[] = [
  {
    id: 'config',
    tone: 'sky',
    title: 'site.orgBand.configTitle',
    description: 'site.orgBand.configDesc',
    visual: 'end',
    Art: SharedConfigArt,
  },
  {
    id: 'organisation',
    tone: 'mist',
    title: 'site.orgBand.orgTitle',
    description: 'site.orgBand.orgDesc',
    visual: 'center',
    Art: OrgTeamArt,
  },
  {
    id: 'plan',
    tone: 'indigo',
    title: 'site.orgBand.planTitle',
    description: 'site.orgBand.planDesc',
    visual: 'center',
    Art: PlanSharingArt,
  },
  {
    id: 'tasks',
    tone: 'sky',
    title: 'site.orgBand.tasksTitle',
    description: 'site.orgBand.tasksDesc',
    visual: 'end',
    Art: TeamTasksArt,
  },
]

export function OrgSection() {
  const { t } = useT()

  return (
    <HomeSection id="organisation">
      <Reveal order={1}>
        <HomeHeading title={t('site.orgBand.title')} subtitle={t('site.orgBand.subtitle')} />
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        {CARDS.map((card, index) => (
          // THE `min-w-0` IS ON THE `Reveal`, which is easy to get wrong: `Reveal` is a
          // `div`, so IT is the grid item and the card is its child. Same arrangement
          // `BuiltForSection` and `PillarsSection` use.
          <Reveal key={card.id} order={index + 2} className="min-w-0">
            <ToneCard
              tone={card.tone}
              visual={card.visual}
              title={t(card.title)}
              description={t(card.description)}
              className="h-full"
            >
              <card.Art />
            </ToneCard>
          </Reveal>
        ))}
      </div>
    </HomeSection>
  )
}
