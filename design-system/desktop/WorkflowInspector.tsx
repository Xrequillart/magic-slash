import { Banner, type BannerVariant } from './Banner'
import { ButtonIcon } from './ButtonIcon'
import { Card, type CardGround } from './Card'
import { Icon } from './Icon'
import { OutputSample } from './OutputSample'
import './workflowCanvas.css'

import { Eye, EyeOff, Sparkles, Trash, X } from './icons'
import type { OutcomeTableLabels } from './OutcomeTable'
import type { SelectOption } from './Select'
import { SettingsCard, type SettingsCardRow } from './SettingsCard'
import { SkillIntro } from './SkillIntro'
import { skillIcon } from './skillIcons'
import { Text } from './Text'
import { WORKFLOW_STEP_COLORS } from './palette'
import type { WorkflowCanvasLinkKind, WorkflowCanvasNodeMode } from './workflowLayout'

/**
 * WHAT IS SELECTED ON THE WORKFLOW CANVAS, and what can be done to it: the editor's side
 * panel.
 *
 * THREE SHAPES, one per thing a press on the canvas can select:
 *
 *  - a CUSTOM STEP: what its skill does (`description`, its SKILL.md's), then its two
 *    choices as rows of a `SettingsCard`, the way a skill's settings are drawn: its card's
 *    colour (`WORKFLOW_STEP_COLORS`, never the built-in steps' plain ground) and its mode,
 *    with `modeNote` under it. Then Remove. The skill it runs is not changed here: a step is its skill, and another
 *    skill is another step, removed and added. `hints` are facts about where it sits ("runs only when there are review comments"),
 *    drawn as quiet lines under the controls, and `warning` a strip above them;
 *  - a BUILT-IN STEP (`locked`): its name and the `builtIn` sentence, and nothing to
 *    change. The line's six steps are the product's, not the repository's;
 *  - a LINK: from and to, the outcome it is taken on if any, and its kind. A kind the
 *    model refuses there (`disabledKinds`, an auto link into start, say) stays in the
 *    list, greyed, with the link's `hint` saying why.
 *
 * EVERY STEP HAS ITS SWITCH, beside its name: the eye its card wears, open or shut
 * (`onToggle`), greyed on start (`alwaysOn`). A step that is off says what that means
 * (`labels.offHint`) above its controls.
 *
 * A STEP'S OWN SETTINGS (`settings`), when its skill has any, follow its controls: the
 * repository's settings of that skill, saved as they change.
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
  /** The skill it runs, as the skills spell it. */
  skill: string
  /** What the skill does, its SKILL.md's `description`: under its name. */
  description?: string
  /** Built-in: no controls, the `builtIn` sentence instead. */
  locked?: boolean
  /** A custom step's card colour, one of `WORKFLOW_STEP_COLORS`: the swatch drawn selected. */
  color?: string
  /** Turned off: the switch shows the shut eye, and `labels.offHint` says what it means. */
  disabled?: boolean
  /** Start: its switch is greyed, it cannot be turned off. */
  alwaysOn?: boolean
  mode?: WorkflowCanvasNodeMode
  /** A strip above the controls, already translated. */
  warning?: string
  /** Quiet lines under the controls, already translated. */
  hints?: string[]
  /** Under the mode's row, what the mode does here: "No automatic link out of it: no effect." */
  modeNote?: string
  /**
   * A custom step's outcomes, as the admin declared them: one port each on its card, and
   * what a link out of it may be taken on. Built-in steps have theirs, and no such row.
   */
  outcomes?: string[]
  /**
   * What its SKILL.md's `outcomes:` declares, when that differs from `outcomes`: offered
   * as one press that replaces them. Absent when the file says nothing or says the same.
   */
  detectedOutcomes?: string[]
  /** By outcome, what leaves the step on it, already counted and translated: "2 links". */
  outcomeLinks?: Readonly<Record<string, string>>
  /**
   * The skill's own settings, the ones its repository gives it (Plan: search for
   * duplicates, how to split, what tickets to file), in groups. Drawn under the step's
   * controls, built-in step or not: a locked step cannot be removed, but how it runs is
   * the repository's to say. The rows are `SettingsCard`'s, each one's `onChange` the
   * caller's, and they are saved as they change, not with the workflow.
   */
  settings?: WorkflowInspectorSettings[]
  /** What the skill does with those settings, in words: `SkillIntro`'s, above them. */
  intro?: WorkflowInspectorIntro
}

/** A `SkillIntro`, as data: its command, its one-line lead, then its steps and flags. Translated. */
export interface WorkflowInspectorIntro {
  command: string
  lead: string
  steps?: string[]
  flags?: string[]
}

/**
 * One group of a step's settings: a `SettingsCard`, and under it either what those
 * settings produce (`sample`, an `OutputSample`: the commit message they would write) or
 * a warning in its place (`notice`, a `Banner`), when what they produce cannot be shown.
 */
export interface WorkflowInspectorSettings {
  id: string
  title?: string
  /** `SettingsCard`'s rows. A falsy entry is a row that does not apply, and is skipped. */
  rows: (SettingsCardRow | false | null | undefined)[]
  sample?: { label: string; text: string }
  notice?: { variant: BannerVariant; text: string }
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
  mode: string
  /** "Colour", over a custom step's swatches. */
  color: string
  kind: string
  /** "Taken on", before a conditional link's outcome. */
  outcome: string
  /** The two modes and the two kinds, as the options read. */
  blocking: string
  advisory: string
  auto: string
  suggest: string
  remove: string
  /** Remove's row: its name ("Remove from the workflow") and the line under it ("Its links go with it."). `remove` is the button's word. */
  removeRow?: string
  removeHint?: string
  /** A locked step's sentence: "Built-in step: it cannot be removed or replaced." */
  builtIn: string
  /** The switch's tooltip on a step that is on, off, and on start. */
  disable: string
  enable: string
  alwaysOn: string
  /** A step that is off, in words: "Turned off: the skills skip it." */
  offHint: string
  /** A drawn link's Remove: the button's word, its row's name ("Remove from the workflow") and the line under it. */
  removeLink?: string
  removeLinkRow?: string
  removeLinkHint?: string
  /** The outcome choice meaning "whatever it ended on". */
  anyOutcome?: string
  /** A default link's sentence: "Default link: it cannot be removed, only its kind changes." */
  defaultLink?: string
  /** A custom step's outcomes row: its name and the line under it, then its table's words. */
  outcomes?: string
  outcomesHint?: string
  outcomesTable?: OutcomeTableLabels
  /** The row offering the SKILL.md's outcomes: its name, the button's word, and the line under it, with `{outcomes}` filled. */
  detectRow?: string
  detect?: string
  detectHint?: string
  /** The corner X, with `onClose`. */
  close?: string
  /** The heading over a step's settings: "Settings". */
  settings?: string
  /** Under it: "Saved as soon as they change." */
  settingsHint?: string
}

export interface WorkflowInspectorProps {
  target: WorkflowInspectorTarget | null
  labels: WorkflowInspectorLabels
  /** Every control disabled, Remove hidden. */
  readOnly?: boolean
  onChangeMode?: (nodeId: string, mode: WorkflowCanvasNodeMode) => void
  onRemove?: (nodeId: string) => void
  onChangeKind?: (from: string, to: string, kind: WorkflowCanvasLinkKind) => void
  /** A drawn link's outcome, or none (`undefined`: whatever the source ended on). */
  onChangeOutcome?: (from: string, to: string, outcome: string | undefined) => void
  onRemoveLink?: (from: string, to: string) => void
  /** A custom step's card colour, one of `WORKFLOW_STEP_COLORS`. */
  onChangeColor?: (nodeId: string, color: string) => void
  /** A custom step's outcomes, the whole new list. The row is read-only without it. */
  onChangeOutcomes?: (nodeId: string, outcomes: string[]) => void
  /** A step's switch: turn it on (`true`) or off. Greyed without it. */
  onToggle?: (nodeId: string, enabled: boolean) => void
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
  labels,
  readOnly = false,
  onChangeMode,
  onRemove,
  onChangeKind,
  onChangeOutcome,
  onRemoveLink,
  onToggle,
  onChangeColor,
  onChangeOutcomes,
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
            labels={labels}
            readOnly={readOnly}
            onChangeMode={onChangeMode}
            onRemove={onRemove}
            onToggle={onToggle}
            onChangeColor={onChangeColor}
            onChangeOutcomes={onChangeOutcomes}
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
  labels,
  readOnly,
  onChangeMode,
  onRemove,
  onToggle,
  onChangeColor,
  onChangeOutcomes,
}: {
  step: WorkflowInspectorStep
  labels: WorkflowInspectorLabels
  readOnly: boolean
  onChangeMode?: WorkflowInspectorProps['onChangeMode']
  onRemove?: WorkflowInspectorProps['onRemove']
  onToggle?: WorkflowInspectorProps['onToggle']
  onChangeColor?: WorkflowInspectorProps['onChangeColor']
  onChangeOutcomes?: WorkflowInspectorProps['onChangeOutcomes']
}) {
  const outcomesEditable = !readOnly && !!onChangeOutcomes
  const modeOptions: SelectOption[] = MODES.map((mode) => ({ value: mode, label: labels[mode] }))

  return (
    <>
      <div className="flex items-center gap-2.5 pr-6">
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${step.color ? '' : 'bg-accent/10 text-accent'}`}
          style={step.color ? { backgroundColor: `${step.color}33`, color: step.color } : undefined}
        >
          <Icon glyph={skillIcon(step.skill)} size="md" tone="inherit" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="sm" weight="bold" className="truncate" title={step.label}>{step.label}</Text>
          <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={step.skill}>{step.skill}</code>
        </span>
        <ButtonIcon
          icon={step.disabled ? EyeOff : Eye}
          title={step.alwaysOn ? labels.alwaysOn : step.disabled ? labels.enable : labels.disable}
          onClick={() => onToggle?.(step.id, !!step.disabled)}
          disabled={readOnly || step.alwaysOn || !onToggle}
          tone="ghost"
          size="sm"
        />
      </div>

      {step.description && <Text size="xs" tone="secondary" className="whitespace-pre-line">{step.description}</Text>}
      {step.warning && <Banner variant="warning" layout="stacked">{step.warning}</Banner>}
      {step.disabled && <Text size="xs" tone="secondary">{labels.offHint}</Text>}

      {step.locked ? (
        <Text size="xs" tone="secondary">{labels.builtIn}</Text>
      ) : (
        <>
          {/* The step's own choices, as rows like any skill's settings: a SettingsCard. */}
          <SettingsCard
            rows={[
              {
                id: 'color',
                label: labels.color,
                layout: 'stacked',
                control: {
                  kind: 'swatches',
                  colors: WORKFLOW_STEP_COLORS,
                  // Vivid over deep, a hue per column.
                  columns: WORKFLOW_STEP_COLORS.length / 2,
                  value: step.color,
                  onChange: (color) => onChangeColor?.(step.id, color),
                  label: labels.color,
                  disabled: readOnly || !onChangeColor,
                },
              },
              {
                id: 'mode',
                label: labels.mode,
                layout: 'stacked',
                note: step.modeNote,
                control: {
                  kind: 'select',
                  value: step.mode ?? 'advisory',
                  options: modeOptions,
                  onChange: (mode) => onChangeMode?.(step.id, mode as WorkflowCanvasNodeMode),
                  disabled: readOnly || !onChangeMode,
                  ariaLabel: labels.mode,
                  size: 'md',
                },
              },
              !!labels.outcomes && !!labels.outcomesTable && {
                id: 'outcomes',
                label: labels.outcomes,
                hint: labels.outcomesHint,
                layout: 'stacked',
                control: {
                  kind: 'outcomes',
                  items: step.outcomes ?? [],
                  onChange: (outcomes) => onChangeOutcomes?.(step.id, outcomes),
                  labels: labels.outcomesTable,
                  details: step.outcomeLinks,
                  id: `wf-outcomes-${step.id}`,
                  disabled: !outcomesEditable,
                },
              },
              outcomesEditable && !!step.detectedOutcomes && !!labels.detect && {
                id: 'detect',
                label: labels.detectRow ?? labels.detect,
                hint: labels.detectHint?.replace('{outcomes}', step.detectedOutcomes.join(', ')),
                control: {
                  kind: 'button',
                  children: labels.detect,
                  icon: Sparkles,
                  size: 'sm',
                  onClick: () => onChangeOutcomes?.(step.id, step.detectedOutcomes ?? []),
                },
              },
              !readOnly && onRemove && {
                id: 'remove',
                label: labels.removeRow ?? labels.remove,
                hint: labels.removeHint,
                control: { kind: 'button', children: labels.remove, icon: Trash, tone: 'danger', size: 'sm', onClick: () => onRemove(step.id) },
              },
            ]}
          />
          {step.hints?.map((hint) => (
            <Text key={hint} size="2xs" tone="secondary">{hint}</Text>
          ))}
        </>
      )}

      {step.settings && step.settings.length > 0 && (
        <div className="-mx-1 mt-1 flex flex-col gap-3 border-t border-line px-1 pt-3">
          {labels.settings && (
            <div className="flex flex-col gap-0.5">
              <Text size="xs" weight="bold">{labels.settings}</Text>
              {labels.settingsHint && <Text size="2xs" tone="secondary">{labels.settingsHint}</Text>}
            </div>
          )}
          {step.intro && (
            <SkillIntro command={step.intro.command} icon={skillIcon(step.skill)} steps={step.intro.steps} flags={step.intro.flags}>
              {step.intro.lead}
            </SkillIntro>
          )}
          {step.settings.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <SettingsCard
                title={group.title}
                // Stacked: a panel this narrow has no room for a label and its control side by side.
                rows={group.rows.map((row) => row && { ...row, layout: 'stacked' as const })}
              />
              {group.sample && <OutputSample label={group.sample.label}>{group.sample.text}</OutputSample>}
              {group.notice && <Banner variant={group.notice.variant} bordered={false}>{group.notice.text}</Banner>}
            </div>
          ))}
        </div>
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
        <Text size="sm" weight="bold" className="min-w-0 flex-shrink truncate" title={link.fromLabel}>{link.fromLabel}</Text>
        <LinkTrail kind={link.kind} />
        <Text size="sm" weight="bold" className="min-w-0 flex-shrink truncate" title={link.toLabel}>{link.toLabel}</Text>
      </div>

      {/* The link's choices, as rows like a step's: a SettingsCard. */}
      <SettingsCard
        rows={[
          outcomeChoice ? {
            id: 'outcome',
            label: labels.outcome,
            layout: 'stacked',
            control: {
              kind: 'select',
              value: link.outcome ?? '',
              options: outcomeOptions,
              // "Whatever it ended on" is the Select's cleared state, `''`.
              clearLabel: labels.anyOutcome,
              placeholder: labels.anyOutcome,
              onChange: (outcome) => onChangeOutcome?.(link.from, link.to, outcome === '' ? undefined : outcome),
              disabled: readOnly || !onChangeOutcome,
              ariaLabel: labels.outcome,
              size: 'md',
            },
          } : link.outcome !== undefined && {
            // A default link's outcome is the product's: said, not offered.
            id: 'outcome',
            label: labels.outcome,
            note: link.outcome,
          },
          {
            id: 'kind',
            label: labels.kind,
            layout: 'stacked',
            note: link.hint,
            control: {
              kind: 'select',
              value: link.kind,
              options: kindOptions,
              onChange: (kind) => onChangeKind?.(link.from, link.to, kind as WorkflowCanvasLinkKind),
              disabled: readOnly || !onChangeKind,
              ariaLabel: labels.kind,
              size: 'md',
            },
          },
          !link.locked && !readOnly && onRemoveLink && {
            id: 'remove',
            label: labels.removeLinkRow ?? labels.removeLink ?? labels.remove,
            hint: labels.removeLinkHint,
            control: {
              kind: 'button',
              children: labels.removeLink ?? labels.remove,
              icon: Trash,
              tone: 'danger',
              size: 'sm',
              onClick: () => onRemoveLink(link.from, link.to),
            },
          },
        ]}
        note={link.locked ? labels.defaultLink : undefined}
      />
    </>
  )
}

/**
 * THE LINK ITSELF, between its two names: a used port, the stroke, a used port, as the
 * canvas draws them, and the pulse running along it when it is `auto`. The rules are the
 * canvas's own (`workflowCanvas.css`, `.ms-wf-trail`), so it is the same link to the pixel.
 * Decoration: the names beside it already say what it joins.
 */
function LinkTrail({ kind }: { kind: WorkflowCanvasLinkKind }) {
  return (
    <span aria-hidden="true" className="ms-wf-trail flex min-w-10 flex-1 items-center">
      <span className={`ms-wf-trail-port ms-wf-port-${kind}`} />
      <svg className="h-[13px] min-w-0 flex-1 overflow-visible">
        <line x1="0" y1="50%" x2="100%" y2="50%" className={`ms-wf-edge-${kind}`} />
        {kind === 'auto' && <circle r={3} cy="50%" className="ms-wf-pulse" />}
      </svg>
      <span className={`ms-wf-trail-port ms-wf-port-${kind}`} />
    </span>
  )
}

