import { Banner } from './Banner'
import { Card } from './Card'
import type { CardAlert } from './cardAlert'
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from './icons'
import { Loader } from './Loader'
import { RepairList, type RepairRow } from './RepairList'
import { SettingRow, type SettingRowProps } from './SettingRow'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * IS THIS WORKING? — a mark, a verdict in one sentence, and what is wrong underneath.
 *
 * ── WHY A COMPONENT AND NOT A BANNER ──────────────────────────────────────────────
 *
 * A `Banner` interrupts: it appears because something just happened and it carries the
 * button that deals with it. This is the opposite — it is always there, it is usually
 * green, and its whole job is that the day it is not, the change is legible. The two
 * were drawn with the same classes in the app and they are not the same thing: a card
 * that can only ever say "fine" is an ornament, and a strip that is permanent stops
 * being read.
 *
 * ── FIVE STATES, AND `off` IS THE ONE THAT MATTERS ────────────────────────────────
 *
 * `off` is the user's own choice and is drawn NEUTRALLY — a grey minus, never an amber
 * mark. Dressing a deliberate setting as a fault is how a panel like this teaches
 * people to ignore it, and once ignored it cannot do the one job it has. `checking` is
 * the spinner, for the moment the words on screen are known to be stale. `failed` is
 * the check itself not coming back, which is a different thing from something being
 * broken and wears the same red because both need the same click.
 *
 * ── THE WORDS ARE THE CALLER'S, ALWAYS ────────────────────────────────────────────
 *
 * Every string here is translated and handed over. What this owns is the mark, the
 * tone, the rungs and the arrangement — so two surfaces reporting on two different
 * pipelines cannot disagree about what "degraded" looks like.
 *
 * ── A VERDICT YOU CANNOT ACT ON IS A WORRY ────────────────────────────────────────
 *
 * Which is why the card carries the repairs too, and everything else that belongs to
 * one verdict: `fixes` for what can be done about each fault, `log` for the output of
 * the fix while it runs, `setting` for the one choice that changes what is being
 * checked at all, and `alert` for a choice that wants confirming before it is applied.
 *
 * EVERY ONE OF THEM IS OPTIONAL AND MOST CARDS USE NONE. The telemetry card is a mark
 * and a sentence; the machine setup card is all five parts, and it was 190 lines of
 * hand-drawn rows, three spellings of a repair button and a plate respelled from
 * scratch. They are one component because they are one card — the alternative was a
 * second card type whose first half would have had to stay in step with this one by
 * hand.
 *
 * THE ORDER IS THE READING: what is wrong, what is being done about it right now, what
 * you may change, and last the thing that wants confirming — because a confirmation
 * belongs next to the control that raised it.
 */

export type HealthState = 'healthy' | 'degraded' | 'off' | 'checking' | 'failed'

/**
 * The mark each state is read by, on `CHECK_STATE_MARK`'s model: the glyph and the
 * colour belong here, the words belong to the caller.
 *
 * Theme tokens rather than Tailwind's numbered scale — a fixed colour stops being
 * readable on half the themes (see `themes.test.ts`).
 */
const MARKS: Record<Exclude<HealthState, 'checking'>, { icon: IconComponent; tone: string }> = {
  healthy: { icon: CheckCircle2, tone: 'text-green' },
  degraded: { icon: AlertTriangle, tone: 'text-yellow' },
  off: { icon: MinusCircle, tone: 'text-text-secondary/60' },
  failed: { icon: XCircle, tone: 'text-red' },
}

export interface HealthCardProps {
  state: HealthState
  /**
   * What is being reported on. Translated.
   *
   * Optional, because a card that is already under a heading saying so would be saying
   * it twice — which is the setup card's case, where this sits under the section's own
   * title and needs only the sentence.
   */
  title?: string
  /** The verdict, in one sentence, in this state's words. Translated. */
  message: string
  /**
   * WHAT IS ACTUALLY WRONG, one short line each, bulleted in the state's own colour.
   *
   * Only worth having for `degraded` and `failed` — a healthy pipeline has nothing to
   * list — but not gated on the state here: which issues are worth naming is the
   * caller's judgement, and a component that silently dropped them would be the harder
   * bug to find.
   */
  details?: string[]
  /**
   * WHAT TO DO ABOUT EACH FAULT — see `RepairList`. One line per thing that is broken,
   * with the one button, command or page that fixes it.
   *
   * These are the same faults `details` would list, with an answer attached. A card uses
   * one or the other: `details` when there is nothing to press, `fixes` when there is.
   */
  fixes?: RepairRow[]
  /**
   * The running output of a repair, while one is running.
   *
   * An install can be silent for a minute, and a button that has been saying "Installing"
   * for that long is indistinguishable from one that has hung. Absent while idle — the
   * caller clears it; a pane that outlived its install would be the stalest thing on the
   * card.
   */
  log?: string
  /**
   * THE ONE CHOICE THAT CHANGES WHAT IS CHECKED, under a rule at the foot of the card.
   *
   * `SettingRow`'s props, so it is the same row as every setting elsewhere. It is in here
   * rather than in a card of its own because it is the reason half these checks run at
   * all — the machine setup card carries which integrations you use, and the checks
   * below it are about the servers those integrations need.
   */
  setting?: SettingRowProps
  /**
   * A choice that wants confirming before it is applied, or a strip about the card — see
   * `CardAlert`. Under everything, next to the control that raised it.
   *
   * The setup card's is the one that matters: turning an integration OFF revokes access
   * in the middle of somebody's ticket, where everything else on that card only ever
   * ADDS something, so the picker moves and nothing happens until this is answered.
   */
  alert?: CardAlert
  /**
   * The last line, quieter: what is pending rather than broken.
   *
   * Runs queued behind an offline stretch are not an issue — they retry by themselves —
   * and listing them among the faults would make a working pipeline look broken.
   * Translated.
   */
  note?: string
  /** Margins and width. Not the ground, the padding or the radius. */
  className?: string
}

export function HealthCard({
  state,
  title,
  message,
  details,
  fixes,
  log,
  setting,
  alert,
  note,
  className = '',
}: HealthCardProps) {
  const mark = state === 'checking' ? undefined : MARKS[state]

  return (
    <Card className={`flex items-start gap-2.5 ${className}`.trim()}>
      {/* The mark holds the top line's height rather than centring on the whole card:
          a verdict with four issues under it would otherwise pin its own icon halfway
          down the list. */}
      {mark ? (
        // A JSX member expression, which is resolved as a value: the lower-case rule
        // that would read `<mark />` as an HTML tag does not apply to `<mark.icon />`.
        <mark.icon className={`mt-0.5 h-4 w-4 shrink-0 ${mark.tone}`} />
      ) : (
        <Loader variant="spin" size="sm" className="mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <Text size="sm" weight="medium" className="block">
            {title}
          </Text>
        )}
        <Text size="xs" tone="secondary" className={`block opacity-70 ${title ? 'mt-1' : ''}`.trim()}>
          {message}
        </Text>
        {details && details.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {details.map((detail) => (
              <li key={detail} className="flex gap-1.5 text-xs">
                {/* A bullet in the state's colour and not a second icon: these are the
                    parts of the verdict above, and a row of marks beside them would
                    read as four more verdicts. */}
                <span aria-hidden className={mark?.tone ?? ''}>
                  •
                </span>
                <Text size="xs" tone="secondary" className="block opacity-70">
                  {detail}
                </Text>
              </li>
            ))}
          </ul>
        )}
        {fixes && fixes.length > 0 && <RepairList rows={fixes} className="mt-2.5" />}
        {log && (
          // A tail and not a console: the card shows that something is happening, not a
          // build log. `whitespace-pre-wrap` because an installer's lines are longer than
          // this column and a horizontal scrollbar inside a card is a line nobody reads.
          <pre className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-2 text-[10px] leading-relaxed text-text-secondary/60">
            {log}
          </pre>
        )}
        {setting && (
          <div className="mt-3 border-t border-line pt-3">
            <SettingRow {...setting} />
          </div>
        )}
        {alert && (
          <Banner
            variant={alert.variant ?? 'danger'}
            icon={alert.icon}
            hint={alert.hint}
            actions={alert.actions}
            className="mt-2"
            bordered
          >
            {alert.message}
          </Banner>
        )}
        {note && (
          <Text size="xs" tone="secondary" className="mt-2 block opacity-50">
            {note}
          </Text>
        )}
      </div>
    </Card>
  )
}
