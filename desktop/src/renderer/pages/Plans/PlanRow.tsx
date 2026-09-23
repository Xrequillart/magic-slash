import { PlanItem, type StatusTone } from '@ds/desktop'
import type { PlanCard } from '../../utils/planRows'
import { planLabel, planRecency } from '../../utils/planRows'
import { useRepoColor } from '../../components/agent-info-sidebar/RepoMark'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { useStore } from '../../store'
import { configKeyForRepoId } from '../../utils/projectColors'
import { useT, type MessageKey, type Translate } from '../../i18n'

/**
 * THE WIRING, and that is all that is left here.
 *
 * The drawing went to `@ds/desktop/PlanItem.tsx` whole — the three lines, the id badge,
 * the status and the date at the right edge, the three chips — and so did the chrome it
 * used to spell itself: the ground, the hover, the rule against the row above and the
 * focus ring are `Item`'s now, which is the same object the repositories list stands on.
 * The two lists had two answers to what a list of rows looks like.
 *
 * WHAT COULD NOT GO is everything in this file: the store, the translator, the plural
 * rule for the ticket count, the relative date, and the resolution from a plan's cloud
 * repository id to the local key its colour is filed under. A design system has no
 * dictionary and no store, so all of it arrives at the component as data — the count
 * already worded, the date already phrased, the colour already a value.
 */

/** "no ticket" / "1 ticket" / "7 tickets". */
function ticketCountLabel(count: number, t: Translate): string {
  if (count === 0) return t('plans.tickets.none')
  return t(count === 1 ? 'plans.tickets.one' : 'plans.tickets.other', { count })
}

/**
 * "1 comment" / "7 comments", and NOTHING for a plan nobody has written on.
 *
 * The asymmetry with the tickets beside it is deliberate. "No ticket" is a fact about the
 * plan — it was never broken down — and a row states it. A plan with no comments is the
 * ordinary case, and a chip saying so on every row of the list would be a column of
 * "0 comment" that no reader is served by.
 */
function commentCountLabel(count: number, t: Translate): string | undefined {
  if (count === 0) return undefined
  return t(count === 1 ? 'plans.comments.one' : 'plans.comments.other', { count })
}

/**
 * How the two statuses read: a plate and a word.
 *
 * Exported because the DETAIL page draws the same status at the top of the plan it was
 * opened from, and a row and its page disagreeing about one state is the exact drift one
 * table exists to prevent.
 *
 * The colour is the webapp's: `green` once the tickets exist, `yellow` while the spec is
 * still being written, so a session reads the same on both surfaces.
 */
export const STATUS_LOOK = {
  planned: { tone: 'green', labelKey: 'plans.status.planned' },
  planning: { tone: 'yellow', labelKey: 'plans.status.planning' },
  in_progress: { tone: 'purple', labelKey: 'plans.status.inProgress' },
  done: { tone: 'blue', labelKey: 'plans.status.done' },
  abandoned: { tone: 'red', labelKey: 'plans.status.abandoned' },
} as const satisfies Record<PlanCard['status'], { tone: StatusTone; labelKey: MessageKey }>

export function PlanRow({ card, now, onSelect }: { card: PlanCard; now: number; onSelect: (card: PlanCard) => void }) {
  const t = useT()
  const repositories = useStore((s) => s.config?.repositories)

  /**
   * The repository's COLOUR IDENTITY, which is not its name.
   *
   * `card.repoName` is the name the cloud row carries, and names are unique only within
   * one organization: two orgs that both have an `api` produce two rows spelled the same,
   * and the colour map — keyed by the keys of the LOCAL config, where the second one is
   * stored as `api (Acme)` — would hand one of them the other's colour. So the row
   * resolves the plan's cloud `repoId` (a uuid, which cannot collide) to the local key
   * that records it, and colours by that.
   *
   * Undefined when this machine has no entry for the repository, which is the ordinary
   * case for a teammate's plan on something never cloned here. The chip is then drawn on
   * the neutral plate, which is the honest look for a repository this app knows no
   * colour for.
   */
  const repoColor = useRepoColor(configKeyForRepoId(card.repoId, repositories))

  const { tone, labelKey } = STATUS_LOOK[card.status]

  // WHEN THE PLAN WAS STARTED, and also the key the list is ordered by: `planRecency`
  // reads creation first, so the dates run in order down the column instead of
  // contradicting the sort. It answers 0 for a timestamp no Date can parse, which is the
  // one input that would otherwise render as "NaNy ago".
  const when = planRecency(card)

  return (
    <PlanItem
      number={card.number}
      title={planLabel(card)}
      status={{ label: t(labelKey), tone }}
      when={when > 0 ? t('relative.ago', { time: formatTimestamp(when, now, t) }) : undefined}
      idea={card.idea}
      repository={{ label: card.repoName ?? t('plans.noRepo'), color: repoColor }}
      author={{ name: card.author, avatarUrl: card.avatarUrl }}
      tickets={ticketCountLabel(card.ticketCount, t)}
      comments={commentCountLabel(card.commentCount, t)}
      onSelect={() => onSelect(card)}
    />
  )
}
