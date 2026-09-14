'use client'

import { SidebarAgentPlannerInfo } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'width',
    type: 'number',
    required: true,
    description:
      'Wider than the coder’s, by the app’s reckoning rather than this component’s: a planner’s column holds long-form prose being written live and the terminal beside it is mostly a place to reply, so the width is what makes the spec readable. Which share of the viewport that is, and where the bounds are, is policy this column has no way to hold.',
  },
  {
    name: 'collapsed',
    type: 'boolean',
    fallback: 'false',
    description: 'Folded away: it slides shut by its own width rather than unmounting, so the scroll position survives.',
  },
  {
    name: 'animate',
    type: 'boolean',
    fallback: 'false',
    description:
      'Folding open or shut is a move and should be seen; a width that changed because the window was resized is not. Only the caller knows which just happened.',
  },
  {
    name: 'usage',
    type: 'ContextAgentCardProps',
    description:
      'A planner spends like any other agent, and a long spec spends a lot. This is the one region the two columns share, and it sits above the spec here exactly as it sits above the ticket there.',
  },
  {
    name: 'spec',
    type: 'SpecCardProps',
    required: true,
    description: 'The reason this column exists, and the only thing in it that grows.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the width, the ground, or the order of the regions.' },
]

const noop = () => undefined

const TITLE = {
  value: 'Invoice VAT, rounded once',
  placeholder: 'Invoice VAT, rounded once',
  editing: false,
  draft: 'Invoice VAT, rounded once',
  onDraftChange: noop,
  onStartEditing: noop,
  onSave: noop,
  onCancel: noop,
}

const SPEC = {
  repos: [{ name: 'magic-pay', color: '#F43F5E' }],
  emptyLabel: 'spec.md',
  ticket: { children: 'PAY-318', tone: 'jira' as const, title: 'PAY-318', onClick: noop },
  status: { label: 'Planned', tone: 'purple' as const, options: [], onSelect: noop },
  expand: { title: 'Open the spec', onClick: noop },
  title: TITLE,
  scrollToTopLabel: 'Back to top',
  children: (
    <div className="space-y-3 p-4 text-xs leading-relaxed text-text-secondary">
      <p className="text-sm font-medium text-ink">Why</p>
      <p>
        Per-line rounding drifts by a cent on long invoices. Accounting reconciles against
        the total, so the total is what has to be right.
      </p>
      <p className="text-sm font-medium text-ink">What changes</p>
      <p>Round once, on the summed amount, and keep the per-line figures unrounded.</p>
    </div>
  ),
}

const USAGE = {
  contextPercent: 61,
  contextDetail: '122.0k / 200.0k tokens',
  model: 'Opus 5',
  cost: '$2.40',
  duration: '31m 12s',
  onMinimizedChange: noop,
  labels: { context: 'Context', minimize: 'Fold', expand: 'Unfold' },
}

export function SidebarAgentPlannerInfoEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="SidebarAgentPlannerInfo"
        uses={usesOf('sidebaragentplannerinfo')}
        onOpen={onOpen}
      >
        The right column of a PLANNING agent, whole. What it is spending, and the spec —
        and that is all: a planner has no branch, no diff and no pull request, so drawing
        them would be four empty cards above the one thing worth reading.
      </EntryHeader>

      <EntrySection
        title="Two columns and not one with a mode"
        note="The single column carried a fill flag and four conditions spelling out that at replace the ticket goes, the repositories go, the add-repository box goes and the spec takes the height — a mode that switched off almost everything the component was. Two names say the same thing and cannot fall out of step: whichever column is on screen, every region it has is a region that agent actually uses."
      >
        <Stage theme={theme} className="flex gap-6 overflow-x-auto">
          <Specimen label="a planner mid-spec">
            <div className="h-[460px]">
              <SidebarAgentPlannerInfo width={360} usage={USAGE} spec={SPEC} />
            </div>
          </Specimen>
          <Specimen label="collapsed — it slides shut by its own width">
            <div className="h-[460px]">
              <SidebarAgentPlannerInfo width={360} collapsed usage={USAGE} spec={SPEC} />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The spec owns the only scroll region"
        note="So this column does not scroll, and there is never a scrollbar inside a scrollbar. The content box is a flex column with a gap rather than a stack with margins, because the spec card has to be allowed to grow into whatever height the usage card leaves."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The fold, the ground and the face are the coder column’s too, and deliberately
          identical: the two sit in the same place, and a reader switching between a planner
          and a coder must not see the panel itself change.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SidebarAgentPlannerInfo } from '@ds/desktop'

<SidebarAgentPlannerInfo
  key={specPath}
  width={width}
  collapsed={!isOpen}
  animate={animateWidth}
  usage={usageCard}
  spec={useSpecCard({ agentId, identity, repoPath, filePath, … })}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
