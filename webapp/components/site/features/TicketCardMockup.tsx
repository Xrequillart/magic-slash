'use client'

import { useId } from 'react'
import { ChevronDown, Edit2 } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual under the `ticketInfo` row: the info sidebar's ticket card, redrawn.
 *
 * DRAWN FROM `desktop/src/renderer/components/agent-info-sidebar/TicketHeader.tsx` and
 * the two fields it renders from `AgentIdentityFields.tsx`, class for class:
 *
 *   1. THE TOP ROW, `flex items-center justify-between mb-3`: the tracker's mark at
 *      `w-3.5` and the ticket id at `text-xs font-semibold` in full ink; on the right the
 *      `StatusPill` — `px-2.5 py-1 rounded-full text-xs font-medium` in the status's own
 *      pair from `STATUS_OPTIONS`, here "in review" on `bg-blue/20 text-blue`, with the
 *      `w-3` chevron that opens the menu.
 *   2. THE TITLE (`AgentTitleField`, at rest): an `h2` at `text-sm font-semibold
 *      leading-tight` in full ink, the pencil at `w-3.5` in muted icon ink beside it, in
 *      a `-mx-2 px-2 py-1` hit area.
 *   3. THE DESCRIPTION (`AgentDescriptionField`, at rest), `mt-3`: `text-xs leading-relaxed`
 *      at 60% ink, a smaller `w-3` pencil beside it, the same hit area.
 *
 * `blue` IS DECLARED FOR THIS PILL, as `orange` is for the gauge beside it: the app's
 * statuses each have a colour, "in review" is blue, and a reproduction that swapped it
 * for the nearest indigo would show a status the app never shows.
 *
 * THE SAME INVENTED TICKET AS THE OTHER DRAWINGS: PAY-318, the invoice VAT ticket that
 * the Tasks list shows and the Agents sidebar runs.
 *
 * IN DARK, as every app reproduction here: `bg-ink` for the window, `bg-white/[0.06]`
 * for the app's `surface`, `appink` for its inks. The card is drawn at the width it has
 * in the sidebar, on a dark panel, for the reason the Session card beside it is.
 *
 * `aria-hidden`: it is a drawing, and a pill that cannot be opened should be announced to
 * nobody.
 */

/**
 * The Jira mark — `TrackerIcons.tsx`'s three stacked chevrons in Atlassian's two blues,
 * the same paths the Tasks drawing above uses. Kept as a vector rather than pointed at
 * `/img/jira-logo.png` so it takes `currentColor`-free exact fills at `w-3.5`.
 */
function JiraMark({ className }: { className?: string }) {
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
const STATUSES: readonly { id: string; tint: string; name: MessageKey; description: MessageKey }[] = [
  { id: 'planning', tint: 'bg-orange/10 text-orange', name: 'site.status.planning', description: 'site.status.planningDesc' },
  { id: 'planned', tint: 'bg-cyan/10 text-cyan', name: 'site.status.planned', description: 'site.status.plannedDesc' },
  { id: 'inProgress', tint: 'bg-yellow/20 text-yellow', name: 'site.status.inProgress', description: 'site.status.inProgressDesc' },
  { id: 'committed', tint: 'bg-cyan/20 text-cyan', name: 'site.status.committed', description: 'site.status.committedDesc' },
  { id: 'readyForPR', tint: 'bg-orange/20 text-orange', name: 'site.status.readyForPR', description: 'site.status.readyForPRDesc' },
  { id: 'prCreated', tint: 'bg-green/20 text-green', name: 'site.status.prCreated', description: 'site.status.prCreatedDesc' },
  { id: 'ciGreen', tint: 'bg-accent/20 text-accent', name: 'site.status.ciGreen', description: 'site.status.ciGreenDesc' },
  { id: 'inReview', tint: 'bg-blue/20 text-blue', name: 'site.status.inReview', description: 'site.status.inReviewDesc' },
  { id: 'changesRequested', tint: 'bg-red/20 text-red', name: 'site.status.changesRequested', description: 'site.status.changesRequestedDesc' },
  { id: 'reviewAddressed', tint: 'bg-teal/20 text-teal', name: 'site.status.reviewAddressed', description: 'site.status.reviewAddressedDesc' },
  { id: 'prMerged', tint: 'bg-purple/20 text-purple', name: 'site.status.prMerged', description: 'site.status.prMergedDesc' },
]

/** The pill, as the card above draws it — `px-2.5 py-1 rounded-full text-xs font-medium`. */
function StatusPill({ tint, label }: { tint: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tint}`}>
      {label}
      <ChevronDown className="h-3 w-3" />
    </span>
  )
}

export function TicketCardMockup() {
  const { t } = useT()

  return (
    <div className="flex flex-col">
    <div
      aria-hidden
      className="flex justify-center overflow-hidden rounded-2xl bg-tone-sky px-6 py-14 sm:py-20"
    >
      <div className="w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">
        <div className="rounded-xl bg-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <JiraMark className="h-3.5 w-3.5 shrink-0" />
              PAY-318
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-blue/20 px-2.5 py-1 text-xs font-medium text-blue">
              {t('site.infoSidebar.status')}
              <ChevronDown className="h-3 w-3" />
            </span>
          </div>

          <div className="-mx-2 flex items-start gap-2 rounded px-2 py-1">
            <h2 className="flex-1 break-words text-sm font-semibold leading-tight text-white">
              {t('site.infoSidebar.ticketTitle')}
            </h2>
            <Edit2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-appink-muted" />
          </div>

          <div className="-mx-2 mt-3 rounded px-2 py-1">
            <div className="flex items-start gap-2">
              <div className="flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/60">
                {t('site.infoSidebar.ticketDescription')}
              </div>
              <Edit2 className="mt-0.5 h-3 w-3 shrink-0 text-appink-muted" />
            </div>
          </div>
        </div>
      </div>
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
            <StatusPill tint={status.tint} label={t(status.name)} />
            <p className="mt-2.5 text-sm leading-relaxed text-ink/70">{t(status.description)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
