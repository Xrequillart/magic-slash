'use client'

import { useId } from 'react'
import { Status, TitleAgentCard, type StatusStrength, type StatusTone } from '@ds/desktop'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { AppGround } from '../AppGround'

/**
 * A field at rest and going nowhere.
 *
 * `EditableText` is controlled, so a drawing has to hand it the closed state and a set
 * of handlers that do nothing. That is the price of using the real component here and
 * a fair one: the pencil, the hover ground and the column it reserves are the app's,
 * not a reproduction of them.
 */
const FIELD = (value: string) => ({
  value,
  placeholder: value,
  editing: false,
  draft: value,
  onDraftChange: () => undefined,
  onStartEditing: () => undefined,
  onSave: () => undefined,
  onCancel: () => undefined,
})

/**
 * The visual under the `ticketInfo` row: the info sidebar's ticket card.
 *
 * IT IS THE COMPONENT, not a drawing of one. `TitleAgentCard` comes from
 * `design-system/desktop/`, the same file the Electron renderer compiles, on a patch of
 * the app's own theme (`AppGround`). Change the card and this illustration changes with
 * it.
 *
 * WHAT THAT REPLACED. This file held a reproduction copied "class for class" from
 * `TicketHeader.tsx` and `AgentIdentityFields.tsx`, under a note listing every class it
 * had matched — the top row's `mb-3`, the pill's `px-2.5 py-1 rounded-full`, the two
 * pencils at `w-3.5` and `w-3`, the fields' `-mx-2 px-2 py-1` hit areas. All of it was
 * true when it was written, and some of it had already drifted: the fields' hit area is
 * `pl-2 py-1.5` with the right padding reserved for the pencil, and the description sits
 * `mt-1` under the title rather than `mt-3` — 12px of margin on 12px of padding had
 * pushed it away from the title it belongs to. A picture of a component is a claim that
 * needs maintaining; a component is not. `ContextCardMockup` and `UsageCardMockup` next
 * door have the same history.
 *
 * THE STATUSES BELOW ARE THE SAME COMPONENT TOO, one `Status` per row, so the legend and
 * the card cannot disagree about a colour. Their table used to carry raw tints
 * (`bg-blue/20 text-blue`); it names tones now, which is the vocabulary the pill itself
 * speaks.
 *
 * THE SAME INVENTED TICKET AS THE OTHER DRAWINGS: PAY-318, the invoice VAT ticket that
 * the Tasks list shows and the Agents sidebar runs.
 *
 * `aria-hidden`: it is a drawing, and a pill that cannot be opened should be announced
 * to nobody.
 */
/**
 * The Jira mark — `TrackerIcons.tsx`'s three stacked chevrons in Atlassian's two blues,
 * the same paths the Tasks drawing above uses. Kept as a vector rather than pointed at
 * `/img/jira-logo.png` so it takes `currentColor`-free exact fills at `w-3.5`.
 *
 * EXPORTED, the way `TasksModalMockup` exports `GithubMark`: the homepage's drawn app
 * window (`home/AppWindowMockup.tsx`) shows the same Jira ticket in its info panel, and a
 * third copy of these four paths is the copy that goes stale when Atlassian restyles.
 */
export function JiraMark({ className }: { className?: string }) {
  const gradientId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="16.53"
          y1="7.95"
          x2="12.78"
          y2="11.7"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path fill="#2684FF" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84z" />
      <path fill={`url(#${gradientId})`} d="M6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.8v1.72a4.362 4.362 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.83-.83z" />
      <path fill="#0052CC" d="M2 11.6c0 2.4 1.94 4.34 4.34 4.34h1.8v1.7c.003 2.4 1.95 4.342 4.35 4.35V12.43a.84.84 0 0 0-.84-.83z" />
    </svg>
  )
}

/**
 * THE STATUSES, `STATUS_OPTIONS` in `StatusPill.tsx` — every one the pill can wear, in the
 * order the app offers them, each in its own pair of tints. Listed under the card as a
 * table, because a reader who has just seen "in review" on the pill wants to know what
 * else it can say, and eleven pills in a paragraph is eleven things nobody maps back.
 * `none` is left out: it is the pill's empty state, not a status.
 */
const STATUSES: readonly {
  id: string
  tone: StatusTone
  strength?: StatusStrength
  name: MessageKey
  description: MessageKey
}[] = [
  { id: 'planning', tone: 'orange', strength: 'soft', name: 'site.status.planning', description: 'site.status.planningDesc' },
  { id: 'planned', tone: 'cyan', strength: 'soft', name: 'site.status.planned', description: 'site.status.plannedDesc' },
  { id: 'inProgress', tone: 'yellow', name: 'site.status.inProgress', description: 'site.status.inProgressDesc' },
  { id: 'committed', tone: 'cyan', name: 'site.status.committed', description: 'site.status.committedDesc' },
  { id: 'readyForPR', tone: 'orange', name: 'site.status.readyForPR', description: 'site.status.readyForPRDesc' },
  { id: 'prCreated', tone: 'green', name: 'site.status.prCreated', description: 'site.status.prCreatedDesc' },
  { id: 'ciGreen', tone: 'accent', name: 'site.status.ciGreen', description: 'site.status.ciGreenDesc' },
  { id: 'inReview', tone: 'blue', name: 'site.status.inReview', description: 'site.status.inReviewDesc' },
  { id: 'changesRequested', tone: 'red', name: 'site.status.changesRequested', description: 'site.status.changesRequestedDesc' },
  { id: 'reviewAddressed', tone: 'teal', name: 'site.status.reviewAddressed', description: 'site.status.reviewAddressedDesc' },
  { id: 'prMerged', tone: 'purple', name: 'site.status.prMerged', description: 'site.status.prMergedDesc' },
]

/** The pill, as the card above draws it — `px-2.5 py-1 rounded-full text-xs font-medium`. */
export function TicketCardMockup() {
  const { t } = useT()

  return (
    <div className="flex flex-col">
    <div
      aria-hidden
      className="flex justify-center overflow-hidden rounded-2xl bg-tone-sky px-6 py-14 sm:py-20"
    >
      {/* The sidebar's own ground, `p-4` around the card as the app's column has. */}
      <AppGround className="w-full max-w-[500px] rounded-2xl p-4 shadow-lift">
        <TitleAgentCard
          ticket={{
            children: 'PAY-318',
            // The tone brings Atlassian's own mark and its blue at 14% — the same one a
            // Tasks card wears. Naming a glyph here would be a second copy of that.
            tone: 'jira',
            title: 'PAY-318',
            onClick: () => undefined,
          }}
          status={{
            label: t('site.infoSidebar.status'),
            tone: 'blue',
            options: [],
            onSelect: () => undefined,
          }}
          title={FIELD(t('site.infoSidebar.ticketTitle'))}
          description={FIELD(t('site.infoSidebar.ticketDescription'))}
        />
      </AppGround>
    </div>

      {/* ── THE STATUSES, UNDER THE DRAWING ──────────────────────────────────
          Two to a row, the pill over its sentence, in the closed box the Agents legend
          uses: eleven statuses in one column was a scroll, and a pill beside a sentence
          left half of every row empty. The pills are the app's own, tint for tint, so a
          reader can match one to the card above without looking twice. */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-hairline sm:grid sm:grid-cols-2">
        {STATUSES.map((status, index) => (
          <div
            key={status.id}
            className={`border-hairline p-5 ${index > 0 ? 'border-t' : ''} ${
              index % 2 === 0 ? 'sm:border-r' : ''
            } ${index === 1 ? 'sm:border-t-0' : ''}`}
          >
            {/* The card above and this legend draw THE SAME COMPONENT, so a reader can
                match a pill to the card without looking twice — and neither can drift.
                Each row is inert: it names a status, it does not set one. */}
            <AppGround paint={false} className="inline-block">
              <Status label={t(status.name)} tone={status.tone} strength={status.strength} />
            </AppGround>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/70">{t(status.description)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
