'use client'

import { ToneCard, type CardTone, type ToneCardVisual } from '@/components/ui'
import { titleOf } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import { CONTROL_FACTS, WORKFLOW_BANDS } from '@/lib/workflowPage'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { MergeButtonArt, PlanTerminalArt } from './ControlArt'

/**
 * THE LAST BAND BEFORE THE ASK: what stays in the reader's hands.
 *
 * A page that has just shown an agent planning, branching, committing, answering a review
 * and cleaning up has raised exactly one question in a developer's head, and it is not
 * "how much". It is "what does it do without asking me". This band answers it in four
 * cards, each of which is a place the loop stops, and the fourth is the one the page
 * could most easily get wrong: nothing here merges. `lib/workflowPage.ts` checks that
 * sentence against the skill.
 *
 * FOUR `ToneCard`s, TWO A ROW, by the product owner's call ("titre, description et panache
 * de color card", then "2 card par ligne"). Coloured cards are the homepage's own closing
 * move under a heading (`BuiltForSection`), and after five plates and a dark sheet they
 * read as the page raising its voice once more before the ask.
 *
 * THE DRAWINGS. The spec card is an illustration from the site's set, a team on a call
 * with an approved sheet held up, in place of the homepage's `PlanSpecArt` panel: the
 * owner's call. The other three
 * are this page's own (`ControlArt.tsx`), each asked for by the owner in place of the
 * homepage drawing that stood there first: a terminal stopped on the plan and the choice
 * it offers, a commit list on a white card with the branch in yellow, and GitHub's merge
 * button pressed by a cursor. The tones are the four the homepage's cards wear for these
 * moments (`sky`, `amber`, `midnight`, `mint`): two light, one dark, one light, and amber
 * and mint mean here exactly what they mean one band up, where the work enters the loop
 * and where it leaves.
 */
const CARD: Record<string, { tone: CardTone; visual: ToneCardVisual; Art: () => React.ReactElement }> = {
  // An illustration from the site's set, so it is centred like the merge button below.
  spec: { tone: 'sky', visual: 'center', Art: SpecIllustration },
  plan: { tone: 'amber', visual: 'end', Art: PlanTerminalArt },
  commits: { tone: 'lemon', visual: 'center', Art: CommitsIllustration },
  // An object rather than a crop, so it is centred in the height the copy leaves: see
  // `ToneCardVisual`.
  merge: { tone: 'mint', visual: 'center', Art: MergeButtonArt },
}

/**
 * The spec card's picture. Its `viewBox` is cropped to the drawing's measured box
 * (`23 84 954 832` out of 1000²). `alt=""`: the card's title says what it shows.
 */
function SpecIllustration() {
  return <img src="/img/illustration-video-call.svg" alt="" className="mx-auto w-full max-w-sm px-7 pb-7" />
}

/**
 * The commits card's picture, from the same set: a checkmark with someone at work on it.
 * `viewBox` cropped to the drawing (`23 108 954 784` out of 1000²).
 */
function CommitsIllustration() {
  return <img src="/img/illustration-checkmark.svg" alt="" className="mx-auto w-full max-w-sm px-7 pb-7" />
}

export function ControlBand() {
  const { t } = useT()

  return (
    <HomeSection>
      <Reveal order={1}>
        <HomeHeading title={t(WORKFLOW_BANDS.control.title)} subtitle={t(WORKFLOW_BANDS.control.subtitle)} />
      </Reveal>

      {/* `min-w-0` on the grid item: two of the four drawings are `min-w-96` panels cut by
          the card's right edge, and a grid track sized `auto` would grow to that minimum
          on a phone and take the page sideways. See `BuiltForSection`'s note on the same
          two classes. */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        {CONTROL_FACTS.map((fact, index) => {
          const card = CARD[fact.id]
          if (!card) return null
          return (
            <Reveal key={fact.id} order={index + 2} className="min-w-0">
              <ToneCard
                tone={card.tone}
                visual={card.visual}
                title={titleOf(fact.title, t)}
                description={t(fact.description)}
                className="h-full"
              >
                <card.Art />
              </ToneCard>
            </Reveal>
          )
        })}
      </div>
    </HomeSection>
  )
}
