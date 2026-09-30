import { Banner } from './Banner'
import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Card, type CardGround } from './Card'
import { Icon } from './Icon'
import { ArrowRight, Lock, Trash, X } from './icons'
import { Select, type SelectOption } from './Select'
import { skillIcon } from './skillIcons'
import { Text } from './Text'
import type { WorkflowSkillOption, WorkflowSkillSource } from './WorkflowSkillPicker'
import type { WorkflowCanvasLinkKind, WorkflowCanvasNodeMode } from './workflowLayout'

/**
 * WHAT IS SELECTED ON THE WORKFLOW CANVAS, and what can be done to it: the editor's side
 * panel.
 *
 * THREE SHAPES, one per thing a press on the canvas can select:
 *
 *  - a CUSTOM STEP: the skill it runs (a `Select` over `skills`), its mode, and Remove.
 *    `hints` are facts about where it sits ("runs only when there are review comments"),
 *    drawn as quiet lines under the controls, and `warning` a strip above them;
 *  - a BUILT-IN STEP (`locked`): its name and the `builtIn` sentence, and nothing to
 *    press. The line's six steps are the product's, not the repository's;
 *  - a LINK: from and to, the outcome it is taken on if any, and its kind. A kind the
 *    model refuses there (`disabledKinds`, an auto link into start, say) stays in the
 *    list, greyed, with the link's `hint` saying why.
 *
 * A DRAWN LINK can also be removed, and the outcome it is taken on changed (`outcomes`,
 * the ones its source can end on). A default link cannot: it is the product's, and only
 * its kind is the repository's (`locked`, with `labels.defaultLink` saying so).
 *
 * NOTHING SELECTED draws `labels.empty`. The full-screen editor floats the panel over the
 * canvas and shows it only while something is selected, with `onClose` for its corner X.
 *
 * DATA IN, CALLBACKS OUT. Every word arrives translated in `labels`; nothing here knows
 * the model's rules, which is why `disabled` and `disabledKinds` are the caller's.
 * `readOnly` (a viewer without the right to edit) disables every control and hides
 * Remove, and the panel still says what is selected.
 */

export interface WorkflowInspectorStep {
  id: string
  label: string
  /** The skill it runs, as the skills spell it. The `Select`'s value. */
  skill: string
  /** Built-in: no controls, the `builtIn` sentence instead. */
  locked?: boolean
  mode?: WorkflowCanvasNodeMode
  /** A strip above the controls, already translated. */
  warning?: string
  /** Quiet lines under the controls, already translated. */
  hints?: string[]
}

export interface WorkflowInspectorLink {
  from: string
  to: string
  /** The two ends' display names, as the canvas draws them. */
  fromLabel: string
  toLabel: string
  kind: WorkflowCanvasLinkKind
  /** Taken only on this outcome of `from`. Shown as the skills spell it. */
  outcome?: string
  /** Kinds this link may not take: listed, greyed, never picked. */
  disabledKinds?: WorkflowCanvasLinkKind[]
  /** Why, or anything else worth a line under the kind. Already translated. */
  hint?: string
  /** A default link: it cannot be removed, nor its outcome changed. */
  locked?: boolean
  /** A drawn link's choice of outcome: what its source can end on. Empty or absent: no choice. */
  outcomes?: string[]
}

export type WorkflowInspectorTarget =
  | { type: 'node'; step: WorkflowInspectorStep }
  | { type: 'link'; link: WorkflowInspectorLink }

export interface WorkflowInspectorLabels {
  /** The panel's accessible name: "Selection". */
  title: string
  /** Nothing selected: "Select a step or a link to edit it." */
  empty: string
  /** The field names. */
  skill: string
  mode: string
  kind: string
  /** "Taken on", before a conditional link's outcome. */
  outcome: string
  /** The two modes and the two kinds, as the options read. */
  blocking: string
  advisory: string
  auto: string
  suggest: string
  remove: string
  /** A locked step's sentence: "Built-in step, locked. It cannot be removed or changed." */
  builtIn: string
  /** A skill's source, as its option's note. */
  sources: Record<WorkflowSkillSource, string>
  /** The note on a skill already on the line: "In the workflow". */
  inWorkflow: string
  /** A drawn link's Remove. */
  removeLink?: string
  /** The outcome choice meaning "whatever it ended on". */
  anyOutcome?: string
  /** A default link's sentence: "Default link: it cannot be removed, only its kind changes." */
  defaultLink?: string
  /** The corner X, with `onClose`. */
  close?: string
}

export interface WorkflowInspectorProps {
  target: WorkflowInspectorTarget | null
  /** What a custom step may run. The step's own skill need not be in it: the trigger still names it. */
  skills: WorkflowSkillOption[]
  labels: WorkflowInspectorLabels
  /** Every control disabled, Remove hidden. */
  readOnly?: boolean
  onChangeSkill?: (nodeId: string, skill: string) => void
  onChangeMode?: (nodeId: string, mode: WorkflowCanvasNodeMode) => void
  onRemove?: (nodeId: string) => void
  onChangeKind?: (from: string, to: string, kind: WorkflowCanvasLinkKind) => void
  /** A drawn link's outcome, or none (`undefined`: whatever the source ended on). */
  onChangeOutcome?: (from: string, to: string, outcome: string | undefined) => void
  onRemoveLink?: (from: string, to: string) => void
  /** The corner X. Not drawn without it. */
  onClose?: () => void
  /** `raised` where the panel floats over something, the canvas: opaque, not the page's frost. */
  ground?: CardGround
  /** Margins and width. Not the ground or the padding. */
  className?: string
}

const MODES: WorkflowCanvasNodeMode[] = ['advisory', 'blocking']
const KINDS: WorkflowCanvasLinkKind[] = ['suggest', 'auto']

export function WorkflowInspector({
  target,
  skills,
  labels,
  readOnly = false,
  onChangeSkill,
  onChangeMode,
  onRemove,
  onChangeKind,
  onChangeOutcome,
  onRemoveLink,
  onClose,
  ground = 'surface',
  className = '',
}: WorkflowInspectorProps) {
  return (
    <section aria-label={labels.title} className={className}>
      <Card padding="regular" ground={ground} className="relative flex flex-col gap-3">
        {onClose && (
          <ButtonIcon icon={X} title={labels.close ?? labels.title} onClick={onClose} tone="ghost" size="sm" className="absolute right-2 top-2" />
        )}
        {!target ? (
          <Text size="xs" tone="secondary">{labels.empty}</Text>
        ) : target.type === 'node' ? (
          <StepPanel
            step={target.step}
            skills={skills}
            labels={labels}
            readOnly={readOnly}
            onChangeSkill={onChangeSkill}
            onChangeMode={onChangeMode}
            onRemove={onRemove}
          />
        ) : (
          <LinkPanel
            link={target.link}
            labels={labels}
            readOnly={readOnly}
            onChangeKind={onChangeKind}
            onChangeOutcome={onChangeOutcome}
            onRemoveLink={onRemoveLink}
          />
        )}
      </Card>
    </section>
  )
}

function StepPanel({
  step,
  skills,
  labels,
  readOnly,
  onChangeSkill,
  onChangeMode,
  onRemove,
}: {
  step: WorkflowInspectorStep
  skills: WorkflowSkillOption[]
  labels: WorkflowInspectorLabels
  readOnly: boolean
  onChangeSkill?: WorkflowInspectorProps['onChangeSkill']
  onChangeMode?: WorkflowInspectorProps['onChangeMode']
  onRemove?: WorkflowInspectorProps['onRemove']
}) {
  // A skill already on the line stays listed and greyed, except the step's own.
  const skillOptions: SelectOption[] = skills.map((skill) => ({
    value: skill.name,
    label: skill.name,
    hint: skill.disabled && skill.name !== step.skill ? labels.inWorkflow : labels.sources[skill.source],
    disabled: skill.disabled && skill.name !== step.skill,
  }))
  const modeOptions: SelectOption[] = MODES.map((mode) => ({ value: mode, label: labels[mode] }))

  return (
    <>
      <div className="flex items-center gap-2.5 pr-6">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon glyph={skillIcon(step.skill)} size="md" tone="inherit" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="sm" weight="bold" className="truncate" title={step.label}>{step.label}</Text>
          <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={step.skill}>{step.skill}</code>
        </span>
        {step.locked && <Icon glyph={Lock} size="sm" tone="muted" className="flex-shrink-0" />}
      </div>

      {step.warning && <Banner variant="warning" layout="stacked">{step.warning}</Banner>}

      {step.locked ? (
        <Text size="xs" tone="secondary">{labels.builtIn}</Text>
      ) : (
        <>
          <Field label={labels.skill}>
            <Select
              value={step.skill}
              options={skillOptions}
              onChange={(skill) => onChangeSkill?.(step.id, skill)}
              placeholder={step.skill}
              disabled={readOnly || !onChangeSkill}
              ariaLabel={labels.skill}
              size="md"
            />
          </Field>
          <Field label={labels.mode}>
            <Select
              value={step.mode ?? 'advisory'}
              options={modeOptions}
              onChange={(mode) => onChangeMode?.(step.id, mode as WorkflowCanvasNodeMode)}
              disabled={readOnly || !onChangeMode}
              ariaLabel={labels.mode}
              size="md"
              fit
            />
          </Field>
          {step.hints?.map((hint) => (
            <Text key={hint} size="2xs" tone="secondary">{hint}</Text>
          ))}
          {!readOnly && onRemove && (
            <Button tone="danger" size="sm" icon={Trash} onClick={() => onRemove(step.id)} className="self-start">
              {labels.remove}
            </Button>
          )}
        </>
      )}
    </>
  )
}

function LinkPanel({
  link,
  labels,
  readOnly,
  onChangeKind,
  onChangeOutcome,
  onRemoveLink,
}: {
  link: WorkflowInspectorLink
  labels: WorkflowInspectorLabels
  readOnly: boolean
  onChangeKind?: WorkflowInspectorProps['onChangeKind']
  onChangeOutcome?: WorkflowInspectorProps['onChangeOutcome']
  onRemoveLink?: WorkflowInspectorProps['onRemoveLink']
}) {
  const outcomeChoice = !link.locked && (link.outcomes?.length ?? 0) > 0
  const outcomeOptions: SelectOption[] = (link.outcomes ?? []).map((outcome) => ({ value: outcome, label: outcome }))
  const kindOptions: SelectOption[] = KINDS.map((kind) => ({
    value: kind,
    label: labels[kind],
    disabled: kind !== link.kind && (link.disabledKinds?.includes(kind) ?? false),
  }))

  return (
    <>
      <div className="flex min-w-0 items-center gap-2 pr-6">
        <Text size="sm" weight="bold" className="truncate" title={link.fromLabel}>{link.fromLabel}</Text>
        <Icon glyph={ArrowRight} size="sm" tone="muted" className="flex-shrink-0" />
        <Text size="sm" weight="bold" className="truncate" title={link.toLabel}>{link.toLabel}</Text>
      </div>

      {outcomeChoice ? (
        <Field label={labels.outcome}>
          <Select
            value={link.outcome ?? ''}
            options={outcomeOptions}
            // "Whatever it ended on" is the Select's cleared state, `''`.
            clearLabel={labels.anyOutcome}
            placeholder={labels.anyOutcome}
            onChange={(outcome) => onChangeOutcome?.(link.from, link.to, outcome === '' ? undefined : outcome)}
            disabled={readOnly || !onChangeOutcome}
            ariaLabel={labels.outcome}
            size="md"
            fit
          />
        </Field>
      ) : link.outcome && (
        <div className="flex items-center gap-1.5">
          <Text size="2xs" tone="secondary">{labels.outcome}</Text>
          <code className="rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-[10px] leading-4 text-text-secondary">
            {link.outcome}
          </code>
        </div>
      )}

      <Field label={labels.kind}>
        <Select
          value={link.kind}
          options={kindOptions}
          onChange={(kind) => onChangeKind?.(link.from, link.to, kind as WorkflowCanvasLinkKind)}
          disabled={readOnly || !onChangeKind}
          ariaLabel={labels.kind}
          size="md"
          fit
        />
      </Field>
      {link.hint && <Text size="2xs" tone="secondary">{link.hint}</Text>}
      {link.locked && labels.defaultLink && <Text size="2xs" tone="secondary">{labels.defaultLink}</Text>}
      {!link.locked && !readOnly && onRemoveLink && (
        <Button tone="danger" size="sm" icon={Trash} onClick={() => onRemoveLink(link.from, link.to)} className="self-start">
          {labels.removeLink ?? labels.remove}
        </Button>
      )}
    </>
  )
}

/** A field's name over its control. Private: the controls are this panel's own. */
function Field({ label, children }: { label: string; children: JSX.Element }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Text size="2xs" weight="medium" tone="secondary">{label}</Text>
      {children}
    </div>
  )
}

