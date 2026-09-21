import { Card } from './Card'
import { CommandChip } from './CommandChip'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * WHAT A COMMAND ACTUALLY DOES, above the settings that tune it.
 *
 * The knobs alone never say it. "How much to split" and "Acceptance criteria" are
 * adjustments to a run whose shape you had to already know — that the command brainstorms
 * first, writes a spec, and creates nothing until you approve it. A tab of settings with
 * no such block is a form you can fill in correctly without ever learning what it
 * configures.
 *
 * ── THE STEPS ARE THE CALLER'S, AND THEY DESCRIBE ONE REPOSITORY ──────────────────
 *
 * That is the whole reason this takes them as strings rather than holding any of its own.
 * A repository filing GitHub issues reads "one issue per story on owner/repo" where a Jira
 * one reads "the epic and its stories in project PROJ" — a generic summary is wrong for
 * whichever half of the fleet is configured the other way, and there is no lead sentence
 * long enough to cover both without saying nothing.
 *
 * So the composition is the app's. What is here is the shape: the command on its plate,
 * the lead under it, the steps numbered because they happen in that order, and the flags
 * as one dim line at the end.
 *
 * ── NUMBERED, AND THE FLAGS ARE NOT ───────────────────────────────────────────────
 *
 * The run reads top to bottom and each step gates the next — the ticket creation at the
 * end is what the spec approval above it holds back. A flag is not a step: it only ADDS
 * something to the output (a co-author line, a ticket id, a label), and it happens
 * wherever it happens. The leading `+` is what says so without a second heading.
 *
 * NO OUTLINE. It wore `border border-line-subtle` around a `surface-subtle` ground, which
 * is a box drawn around a paragraph on a page that has stopped drawing boxes.
 *
 * ── THE MARK IS ON THE CHIP, NOT IN A GUTTER ──────────────────────────────────────
 *
 * It sat to the left of everything, in a column of its own, with the lead and all the
 * steps indented past it. That gutter cost every line of the block its first 28 pixels to
 * say one thing once — and it said it twice over, since the chip beside it already named
 * the command. On the chip the mark belongs to the thing it marks, and the text starts at
 * the card's own edge like the text in every other card in the app.
 */

export interface SkillIntroProps {
  /**
   * The command, verbatim — `/magic:plan`. Drawn as a `CommandChip`, because that is what
   * it is: a thing the reader types.
   */
  command: string
  /**
   * The mark, usually the tab's own — so the block reads as belonging to the tab you just
   * picked rather than as a notice about something else.
   *
   * It rides ON the command chip. See the header: a mark in a gutter indents every line
   * of the block behind it, and this one was standing next to the very chip it describes.
   */
  icon?: IconComponent
  /** The skill's job in one clause. The one static line; already translated. */
  children: string
  /**
   * The run, in order, already translated and already composed against this repository's
   * own settings. Empty draws no list.
   */
  steps?: string[]
  /**
   * What the run ADDS rather than what it does — a co-author line, a ticket id, default
   * labels. Already translated. Joined with a separator and prefixed with a `+`.
   */
  flags?: string[]
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function SkillIntro({
  command,
  icon,
  children,
  steps = [],
  flags = [],
  className = '',
}: SkillIntroProps) {
  return (
    <Card className={`flex min-w-0 flex-col items-start gap-1.5 ${className}`.trim()}>
      <CommandChip icon={icon}>{command}</CommandChip>
      <Text tone="secondary">{children}</Text>
      {steps.length > 0 && (
        <ol className="mt-0.5 flex flex-col gap-1">
          {steps.map((step, index) => (
            // Keyed on the sentence: these are composed strings with no id of their own,
            // and the list is rebuilt whole whenever a setting changes.
            <li key={step} className="flex gap-2">
              {/* `tabular-nums` so 9. and 10. start on the same x — a numbered list whose
                  marks drift is a list the eye has to re-find on every line. */}
              <Text size="2xs" tone="secondary" className="shrink-0 tabular-nums opacity-40">
                {`${index + 1}.`}
              </Text>
              <Text size="2xs" tone="secondary" className="opacity-70">
                {step}
              </Text>
            </li>
          ))}
        </ol>
      )}
      {flags.length > 0 && (
        <Text size="2xs" tone="secondary" className="mt-0.5 block opacity-50">
          {`+ ${flags.join(' · ')}`}
        </Text>
      )}
    </Card>
  )
}
