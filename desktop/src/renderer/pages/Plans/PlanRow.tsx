import { useCallback, type KeyboardEvent } from 'react'
import { Ticket } from '@ds/desktop/icons'
import { PlanIdBadge } from './PlanIdBadge'
import type { PlanCard } from '../../utils/planRows'
import { planLabel, planRecency } from '../../utils/planRows'
import { Label } from '@ds/desktop'
import { RepoColorChip } from '../../components/agent-info-sidebar/RepoMark'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { useStore } from '../../store'
import { configKeyForRepoId } from '../../utils/projectColors'
import { useT, type MessageKey, type Translate } from '../../i18n'

/**
 * One plan, as one dense line.
 *
 * The gabarit is the Team page's `AgentRow` — the row that page drew a running agent
 * with — minus the `pl-9` that only existed because it was nested under an expandable
 * repository card, and at `items-start` rather than `items-center` because a plan is
 * three levels of text where an agent was one. A list of issues, not a stack of cards:
 * one hairline between rows, no ground of its own until the pointer is on it.
 *
 * What it says is what the webapp's `/plans` list says, in the same order: the title,
 * the status, an excerpt of the idea, then the repository, the author, the ticket count
 * and when it last moved. The two lists are read by the same people about the same
 * sessions, so they name the same four things. One difference: the author is named in
 * full here even when it is the reader, where the web list says "you" — see
 * `planAuthor`.
 *
 * A DIV WITH A ROLE, not a `<button>`, the shape `Tasks/TaskCard` already uses for the
 * same job: the row's content is stacked block-level boxes, and a `<button>` may only
 * contain phrasing content. Wrapping divs in one is invalid markup, and the browser's
 * fix-ups for it are not something a layout should rest on. The cost of the role is that
 * the keyboard half becomes ours to write, since a real button answers Enter and Space
 * for free and a `role="button"` that only answers the mouse cannot be reached without
 * one. Everything else is unchanged: the whole row is the target, and it keeps the same
 * hover ground and the same focus ring.
 */

/** "no ticket" / "1 ticket" / "7 tickets". */
function ticketCountLabel(count: number, t: Translate): string {
  if (count === 0) return t('plans.tickets.none')
  return t(count === 1 ? 'plans.tickets.one' : 'plans.tickets.other', { count })
}

/**
 * How the two statuses read: a plate and a word.
 *
 * Exported because the DETAIL page draws the same status at the top of the plan it was
 * opened from, and a row and its page disagreeing about one state is the exact drift one
 * table exists to prevent.
 *
 * The two glyphs are gone with the tinted word they stood beside — a dashed circle and a
 * closed one, which said the same thing the colour of the plate now says, twice, from
 * two places on the row. The colour is unchanged and is the webapp's: `green` once the
 * tickets exist, `yellow` while the spec is still being written, so a session reads the
 * same on both surfaces.
 *
 * The classes are written out in full, never assembled: Tailwind scans for literals.
 */
export const STATUS_LOOK = {
  planned: { pill: 'bg-green/20 text-green', labelKey: 'plans.status.planned' },
  planning: { pill: 'bg-yellow/20 text-yellow', labelKey: 'plans.status.planning' },
} as const satisfies Record<PlanCard['status'], { pill: string; labelKey: MessageKey }>

/**
 * The shape an agent's status wears, borrowed for a plan's.
 *
 * `px-2.5 py-1 rounded-full`, straight off `StatusPill` in the agent sidebar. A plan is
 * one more thing in this app that has a state, and there is no reason for its state to
 * be drawn as a tinted word when every agent's is a round plate. The colours stay the
 * plan's own — green once the tickets exist, yellow while the spec is being written —
 * which is also what the webapp uses, so a session reads the same on both surfaces.
 *
 * No chevron and no picker: an agent's status is set from its pill, a plan's is derived
 * from whether its tickets exist. Same object, one of them inert.
 */
export const STATUS_PILL = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0'

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
   * case for a teammate's plan on something never cloned here. `RepoMark` draws its
   * neutral mark for it.
   */
  const repoColorKey = configKeyForRepoId(card.repoId, repositories)
  const { pill, labelKey } = STATUS_LOOK[card.status]
  const statusLabel = t(labelKey)
  // WHEN THE PLAN WAS STARTED, and also the key the list is ordered by: `planRecency`
  // reads creation first now, so the dates run in order down the column instead of
  // contradicting the sort. It answers 0 for a timestamp no Date can parse, which is the
  // one input that would otherwise render as "NaNy ago".
  const when = planRecency(card)

  const select = useCallback(() => onSelect(card), [onSelect, card])

  /**
   * The two keys a `<button>` would have answered on its own.
   *
   * `preventDefault` because Space scrolls the pane otherwise, and this list lives inside
   * the one scrolling element of the Plans page.
   */
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    select()
  }, [select])

  return (
    /* `first:border-t-0` because the list is framed: the container draws a hairline all
       the way round, so the first row's own top rule would land directly on it and read as
       a double line. Every other row keeps it, and that rule is what separates the rows. */
    /* `hover:bg-surface-strong` and not `surface-subtle`: the frame around the list now
       IS `surface-subtle`, so the old hover tinted a row to exactly the colour it already
       sat on and read as no hover at all. `strong` is the next step up the same scale and
       the app's most common hover ground, so pointing at a row lifts it here the way it
       does everywhere else. */
    /* `focus-visible` and not `focus`: the ring is for someone navigating by keyboard,
       and a pointer click that left a ring behind on the row would look like a selection
       the list does not have. Inset, because the rows are flush with the frame and an
       outer ring would be clipped by its `overflow-hidden`. */
    <div
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={onKeyDown}
      className="w-full text-left flex items-start gap-3 px-4 py-3 min-w-0 border-t border-line-subtle first:border-t-0 hover:bg-surface-strong transition-colors focus:outline-none focus-visible:bg-surface-strong focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent"
    >
      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* The plan's own id, left of its name, exactly where a ticket wears its key —
              same chip, same grey, our mark instead of GitHub's. See `PlanIdBadge`. */}
          <PlanIdBadge number={card.number} />
          <span className="text-sm font-medium text-ink truncate">{planLabel(card)}</span>
          {/* THE RIGHT-HAND PAIR: what state this plan is in, and when it was started.
              Both are fixed-width facts every row has, so they hold a column each on the
              right edge and read straight down the list — where the title's length, and
              the badge's, vary. The status was on the left, immediately after the title,
              which put it at a different x on every row.

              The state is drawn on the plate every agent's state is drawn on, not as a
              tinted word; the leading glyph that used to stand outside the row went with
              it — one marker per fact, and this one carries its own colour. The date has
              no icon: it is the one piece of metadata whose shape already says what it
              is. */}
          <span className="ml-auto flex items-center gap-2 flex-shrink-0">
            <span className={`${STATUS_PILL} ${pill}`}>{statusLabel}</span>
            {when > 0 && (
              <span className="text-xs text-text-secondary/50">
                {t('relative.ago', { time: formatTimestamp(when, now, t) })}
              </span>
            )}
          </span>
        </div>

        {/* One line of the idea and no more. It is there to tell two plans on the same
            repository apart, which the first line always does; a paragraph here would
            turn the list back into a stack of cards. */}
        {card.idea && <span className="text-xs text-text-secondary line-clamp-1">{card.idea}</span>}

        {/* THREE CHIPS, not three phrases separated by spaces. Each of these is a fact
            with a mark and a value — the repository and its colour, the author and their
            face, the count and its glyph — which is what `Label` is for, and what
            the agent sidebar draws them as two panels away. Loose text ran them
            together into one grey sentence whose parts had to be picked apart by reading.
            `gap-1.5` rather than the old `gap-x-3`: the chips carry their own padding, so
            the wider gutter that separated bare words now separates plates. */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-text-secondary">
          {/* The repository as its COLOURED MARK and its name, not a name alone: that
              colour is how the same repo is recognised on the Tasks board and in the
              agent sidebar, and the shared `RepoMark` is what keeps the three the same
              tile. The name stays beside it — the colour tells two rows apart at a
              glance, it does not say which repo this is to someone reading their first
              plan. A session with no repository at all has no mark, only the label:
              there is no repo for a colour to belong to. What is DISPLAYED is the cloud
              name; what is COLOURED is the local key behind it. See `repoColorKey`. */}
          <RepoColorChip colorKey={repoColorKey} label={card.repoName ?? t('plans.noRepo')} />
          {/* `alt=""` because the author is named in the very next breath — an alt
              repeating the adjacent label makes a screen reader say the same person
              twice per row. At `sm` the face is 14px and the glyph fallback takes the
              label's own muted mark colour, so an author with no photo draws like the
              glyphs either side of them rather than an accent pill mid-sentence. */}
          <Label avatar={{ src: card.avatarUrl ?? null, alt: '' }} truncate>
            {card.author}
          </Label>
          <Label icon={Ticket}>{ticketCountLabel(card.ticketCount, t)}</Label>
        </div>
      </div>
    </div>
  )
}
