'use client'

import { useState } from 'react'
import { ChecklistCard, CollapsibleLine } from '@ds/desktop'
import { CheckCircle2, Circle } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'verdict',
    type: "'ready' | 'pending'",
    required: true,
    description:
      'Done, or not done yet — there is no third answer a checklist can give. It decides the mark and its colour and nothing else. Pending is yellow and not red: nothing has gone wrong, there is simply more to do, and a red light on a fresh install would read as a failure the user caused.',
  },
  {
    name: 'title · subtitle',
    type: 'string · string',
    required: true,
    description:
      'The line that states the verdict, and the quieter one under it saying what the verdict is based on. Both translated; the subtitle truncates.',
  },
  {
    name: 'badge',
    type: '{ label: string; tone: PRTone }',
    description:
      'The count in the top-right slot — “3/5”. Where PullRequestCard’s badge carries a verdict the header does not give, this one is the arithmetic behind a verdict the header states in words. Both are the caller’s call for the same reason: neither is a fact about a card.',
  },
  {
    name: 'children',
    type: 'ReactNode',
    description:
      'The rows — CollapsibleLines, one per thing to do. Each gets its hairline from the card rather than spelling its own, because a caller drawing its own border-t is a caller that can forget one.',
  },
  {
    name: 'loading',
    type: '{ rows: number; label: string }',
    description:
      'Draws the card’s own shape with every string replaced by a bar of its size. In the component and not at the call site: a placeholder’s whole job is to occupy the exact space the real thing will, and a skeleton written beside the card is a second drawing of the same card that stops matching the day the header changes.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and width. Not the ground, the radius or the dividers.',
  },
]

/** One step of the account checklist, as the app hands it over. */
type Step = { id: string; label: string; todo?: string; done: boolean }

const STEPS: Step[] = [
  { id: 'account', label: 'Cloud account connected', done: true },
  { id: 'atlassian', label: 'Atlassian account linked', done: true },
  {
    id: 'profile',
    label: 'Profile filled in',
    todo: 'Fill in your profile at the bottom of this tab. The skills read it to pitch their vocabulary and their level of detail at you.',
    done: false,
  },
  { id: 'repository', label: 'At least one usable repository', done: true },
  {
    id: 'setup',
    label: 'Machine setup complete',
    todo: 'Finish the machine setup from the Application tab: the prerequisites, the MCP servers and the skills.',
    done: false,
  },
]

/**
 * The rows, with the first pending one unfolded until the reader touches a chevron —
 * which is the app's own behaviour and the thing worth showing here.
 */
function Rows({ steps }: { steps: Step[] }) {
  const [opened, setOpened] = useState<Set<string> | null>(null)
  const next = steps.find((step) => !step.done)?.id
  const isOpen = (id: string) => (opened ? opened.has(id) : id === next)

  return (
    <>
      {steps.map((step) => (
        <CollapsibleLine
          key={step.id}
          icon={step.done ? CheckCircle2 : Circle}
          tone={step.done ? 'green' : 'neutral'}
          label={step.label}
          muted={step.done}
          toggle={step.done ? undefined : {
            open: isOpen(step.id),
            onToggle: () => setOpened((previous) => {
              const set = new Set(previous ?? (next ? [next] : []))
              if (set.has(step.id)) set.delete(step.id)
              else set.add(step.id)
              return set
            }),
          }}
        >
          {step.done ? undefined : (
            <span className="block text-xs leading-relaxed text-text-secondary/70">{step.todo}</span>
          )}
        </CollapsibleLine>
      ))}
    </>
  )
}

export function ChecklistCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const doneSteps = STEPS.map((step) => ({ ...step, done: true }))

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ChecklistCard" uses={usesOf('checklistcard')} onOpen={onOpen}>
        A set of things to do and how far through them you are — a verdict, then the rows
        it is computed from.
      </EntryHeader>

      <EntrySection
        title="It is PullRequestCard’s shape"
        note="On purpose and almost to the pixel: a header band saying what this is, a stack of rows under it each divided by a hairline, and rows that are CollapsibleLines. The two cards answer the same kind of question — is this ready, and if not what is missing — and the app was drawing one of them as a bulleted list inside a bordered box while the other was a panel of foldable rows. Two answers to one question, on two tabs of one window."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="pending — the next step is already unfolded, the ticked ones have no chevron">
            <ChecklistCard
              verdict="pending"
              title="Setup in progress"
              subtitle="3 of 5 steps done."
              badge={{ label: '3/5', tone: 'yellow' }}
            >
              <Rows steps={STEPS} />
            </ChecklistCard>
          </Specimen>
          <Specimen label="ready — every row is a statement, so nothing folds at all">
            <ChecklistCard
              verdict="ready"
              title="Ready to use"
              subtitle="Onboarding is complete, every skill can run end to end."
              badge={{ label: '5/5', tone: 'green' }}
            >
              <Rows steps={doneSteps} />
            </ChecklistCard>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          What it does <em>not</em> copy is as deliberate. There is no <code>open</code>:
          a pull request card’s header is a link because the PR lives somewhere else, and
          a checklist is about <em>this</em> app — a header that looked like a control and
          did nothing would be an affordance that lies. There is no footer either, because
          nothing here is a snapshot of a remote thing: no staleness to date, nothing to
          refresh.
        </p>
      </EntrySection>

      <EntrySection
        title="The gutter is the point"
        note="The header’s mark is w-4 and its gap is gap-2 inside p-3, which is exactly CollapsibleLine’s own gutter. So the verdict’s title and every step label below it begin on the same x. That is what makes the card read as one object rather than as a heading that happens to sit above a list, and it is the whole reason the header pads to 12px rather than to the 16px AccountCard uses one card down the page."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The plate is <code>bg-surface rounded-xl</code> — the page’s card material, the
          one <code>AccountCard</code> stands on, because this sits beside it. Not{' '}
          <code>PullRequestCard</code>’s <code>bg-ink/5 rounded-lg</code>, which is the
          material of a block nested <em>inside</em> another card in the sidebar. Same
          shape, different ground: the ground is decided by what a card sits on rather
          than by which card it was modelled after.
        </p>
      </EntrySection>

      <EntrySection
        title="No border"
        note="It had border border-line-strong, and a hairline around a plate that is already a different colour from the page is the same thing said twice — Button states the rule, AccountCard and RepositoryItem learned it the same way. The hairlines inside stay: separating two things that are both here is a different job from drawing a line around the whole."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>overflow-hidden</code> comes with that, so the first and last rows are
          clipped to the radius. Rows drawn edge to edge would otherwise square off the
          two bottom corners the moment one of them is unfolded and takes a ground.
        </p>
      </EntrySection>

      <EntrySection
        title="The placeholder is the card’s own"
        note="A placeholder’s whole job is to occupy the exact space the real thing will, so that nothing moves when the answers land. A skeleton written beside the card is a second drawing of the same card, and the day the header gains a row the two stop matching and the page jumps. rows is the caller’s because only it knows how long its list is going to be."
      >
        <Stage theme={theme}>
          <Specimen label="loading — the bars land where the strings will">
            <ChecklistCard verdict="pending" title="" loading={{ rows: 5, label: 'Loading' }} />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The bar widths are staggered, which is the one thing that stops a placeholder
          reading as a table: four identical bars line up into columns the real list will
          not have.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ChecklistCard, CollapsibleLine } from '@ds/desktop'

<ChecklistCard
  verdict={ready ? 'ready' : 'pending'}
  title={ready ? t('account.checklist.ready') : t('account.checklist.pending')}
  subtitle={t('account.checklist.pendingHint', { done, total: steps.length })}
  badge={{ label: \`\${done}/\${steps.length}\`, tone: ready ? 'green' : 'yellow' }}
>
  {steps.map((step) => (
    <CollapsibleLine
      key={step.key}
      icon={step.done ? CheckCircle2 : Circle}
      tone={step.done ? 'green' : 'neutral'}
      label={t(step.key)}
      muted={step.done}
      // No toggle on a ticked row, and therefore no chevron: there is nothing behind it.
      toggle={step.done ? undefined : { open: isOpen(step.key), onToggle: () => toggleStep(step.key) }}
    >
      {step.done ? undefined : <Text size="xs" tone="secondary">{t(step.todo)}</Text>}
    </CollapsibleLine>
  ))}
</ChecklistCard>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>AccountChecklistCard</code> is what does the wiring: which steps
          exist for this install, whether each one is done, and the words.
        </p>
      </EntrySection>
    </article>
  )
}
