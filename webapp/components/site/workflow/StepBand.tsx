'use client'

import { CARD_TONES, FeaturePoints, SplitFeature, type CardTone } from '@/components/ui'
import { MAGIC_COMMANDS, type MagicCommandId } from '@/lib/commands'
import { useT } from '@/lib/i18n/useLanguage'
import type { WorkflowStep, WorkflowStepId } from '@/lib/workflow'
import { STEP_CLAIMS, stepAnchor } from '@/lib/workflowPage'
import { DESKTOP_ICONS } from '../desktop/icons'
import { withChips } from '../home/AppSection'
import { SpecPanelMockup } from '../features/SpecPanelMockup'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { StepTerminal } from './StepTerminal'

/**
 * ONE STEP OF THE LOOP, AS A BAND: the command on top, the step's title and sentence under
 * it, three claims, and beside all of it the artefact the step produces, on a plate in the
 * step's own colour.
 *
 * NO NUMBER. Each band opened on a disc with its rank in the step's tone, and the product
 * owner cut it ("horrible et pas utile"): the bands are in order down the page and the
 * plates change colour with each, so a numeral was counting something the reader could
 * already see. What stays above the heading is the one thing the heading cannot say, which
 * is what you type.
 *
 * THE TRACKERS ARE CHIPS. The plan step's third claim names Jira and GitHub, and it names
 * them the way the homepage's app band does inside its first claim: `withChips` turns the
 * `{jira}` and `{github}` tokens in the catalogue string into the mark-and-name plates that
 * component draws, so a tracker looks the same on every page that mentions one. Every claim
 * goes through it, as every row does over there; a sentence with no token renders as itself.
 *
 * THE ARRANGEMENT IS `SplitFeature`, the block the homepage's skills band and `/desktop`'s
 * agents band are built on, and the side ALTERNATES down the page: copy left for the odd
 * steps, right for the even ones. Five splits on one side would read as a template
 * (`SPLIT_MEDIA` in `components/ui.tsx` says why the side is an option at all); alternating
 * them is what makes five bands read as one page walking down a list.
 *
 * THE DRAWINGS. The plan step keeps `/features`' spec panel, the document the command
 * produces, cropped on the right as it is over there. The four steps after it are each a
 * TERMINAL, whole on its plate, running the step's command(s) with a loader on every line
 * and ending on the artefact: the plan and the choice to build it, the pull request card
 * the sidebar shows, the approved state, the cleanup ticked off. That is the product
 * owner's brief for all four ("un terminal comme celle du dessus, des loader à chaque
 * étape"), and one engine with four scripts draws them: `StepTerminal.tsx`.
 *
 * The four shipped first as `/features`' own mockups, cropped bottom and right on the
 * plate the way they are on a `ToneCard`; the owner asked for the whole window and the
 * whole run instead. What survives of that round is the plan step, and the plate.
 *
 * WHICH DRAWING GOES WHERE is the one thing this file knows that `lib/workflowPage.ts`
 * does not, and it is a `Record<WorkflowStepId, …>` for `WorkflowSection`'s reason: a
 * sixth step is a compile error at the map that forgot to draw it.
 */
const ART: Record<WorkflowStepId, () => React.ReactElement> = {
  plan: SpecPanelMockup,
  start: () => <StepTerminal step="start" />,
  commit: () => <StepTerminal step="commit" />,
  review: () => <StepTerminal step="review" />,
  done: () => <StepTerminal step="done" />,
}

/**
 * HOW A DRAWING SITS ON ITS PLATE. `center` is `ToneCard`'s own slot: a panel drawn with
 * its own insets and cropped on one side, centred in the plate's height and magnified. `frame`
 * is for a drawing shown WHOLE: the plate pads it on all four sides and it takes the width,
 * nothing cropped and nothing scaled, which is what a terminal a reader is meant to read
 * from top to bottom wants.
 */
const VISUAL: Record<WorkflowStepId, PlateVisual> = {
  plan: 'center',
  start: 'frame',
  commit: 'frame',
  review: 'frame',
  done: 'frame',
}

type PlateVisual = 'center' | 'frame'

const COMMAND = Object.fromEntries(MAGIC_COMMANDS.map((c) => [c.id, c.command])) as Record<
  MagicCommandId,
  string
>

export function StepBand({ step, index }: { step: WorkflowStep; index: number }) {
  const { t } = useT()
  const Art = ART[step.id]

  return (
    // `follow` under the hero for the first step, a band's padding for the rest: the hero
    // is its own band with a band's bottom, so the first step owes it only the remainder.
    <HomeSection id={stepAnchor(step.id)} padding={index === 0 ? 'follow' : 'band'}>
      <SplitFeature
        media={index % 2 === 0 ? 'right' : 'left'}
        art={
          <Reveal order={2}>
            <StepPlate tone={step.tone} visual={VISUAL[step.id]}>
              <Art />
            </StepPlate>
          </Reveal>
        }
      >
        <Reveal order={1}>
          <Commands commands={step.commands} />
          <div className="mt-5">
            <HomeHeading title={t(step.title)} subtitle={t(step.description)} />
          </div>
          <FeaturePoints
            className="mt-10"
            points={STEP_CLAIMS[step.id].map(({ icon, label }) => ({
              icon: DESKTOP_ICONS[icon],
              id: label,
              label: withChips(t(label)),
            }))}
          />
        </Reveal>
      </SplitFeature>
    </HomeSection>
  )
}

/**
 * WHAT YOU TYPE, over the heading, in the monospace the rest of the site gives a command.
 * Two commands where the step runs two, separated by a plus rather than a comma, because
 * they are one motion (`lib/workflow.ts` on why five steps hold seven commands).
 */
function Commands({ commands }: { commands: readonly MagicCommandId[] }) {
  return (
    <code className="font-mono text-sm font-medium tracking-tight text-brand">
      {commands.map((id, i) => (
        <span key={id}>
          {i > 0 && <span className="mx-1.5 text-muted">+</span>}
          {COMMAND[id]}
        </span>
      ))}
    </code>
  )
}

/**
 * THE PLATE: the step's ground, `overflow-hidden` so the drawing's own negative margins
 * crop against its radius exactly as they do against a `ToneCard`'s. A minimum height so
 * a short panel still gives the copy beside it something its own size to sit against, and
 * the drawing placed in that height by `visual`.
 *
 * NO PADDING OF ITS OWN FOR A `center` DRAWING: it brings its insets (`pl-7`, `py-7`) and was
 * measured against a card that added none, and it is magnified by a quarter from `sm`, the
 * move `AgentsSidebarMockup` makes on `/desktop`, because it was sized for a card a third
 * of a row wide. A `frame` drawing is the opposite case: the plate pads it, the drawing
 * takes the width, and nothing is scaled, so a terminal's type stays the terminal's.
 */
function StepPlate({
  tone,
  visual,
  children,
}: {
  tone: CardTone
  visual: PlateVisual
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex min-h-[22rem] flex-col overflow-hidden rounded-2xl sm:min-h-[26rem] ${
        visual === 'frame' ? 'p-5 sm:p-7' : ''
      } ${CARD_TONES[tone].surface}`}
    >
      <div className={visual === 'frame' ? 'my-auto' : 'my-auto origin-left sm:scale-[1.25]'}>{children}</div>
    </div>
  )
}
