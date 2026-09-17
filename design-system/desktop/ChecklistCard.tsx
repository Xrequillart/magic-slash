import type { ReactNode } from 'react'
import { CheckCircle2, Circle } from './icons'
import { Icon } from './Icon'
import { PR_BADGE, PR_MARK, type PRTone } from './prTones'
import { Text } from './Text'

/**
 * A SET OF THINGS TO DO AND HOW FAR THROUGH THEM YOU ARE — a verdict, then the rows it
 * is computed from.
 *
 * IT IS `PullRequestCard`'S SHAPE, on purpose and almost to the pixel: a header band
 * saying what this is, a stack of rows under it each divided by a hairline, and rows
 * that are `CollapsibleLine`s. The two cards answer the same kind of question — "is
 * this ready, and if not, what is missing" — and the app was drawing one of them as a
 * bulleted `<ul>` inside a bordered box while the other was a panel of foldable rows.
 * Two answers to one question, on two tabs of one window.
 *
 * WHAT IT DOES NOT COPY is as deliberate. There is no `open`: a pull request card's
 * header is a link because the PR lives somewhere else, and a checklist is about THIS
 * app — a header that looked like a control and did nothing would be an affordance that
 * lies. There is no footer either: nothing here is a snapshot of a remote thing, so
 * there is no staleness to date and nothing to refresh.
 *
 * ── THE GUTTER IS THE POINT ────────────────────────────────────────────────────────
 *
 * The header's mark is `w-4` and its gap is `gap-2` inside `p-3`, which is exactly
 * `CollapsibleLine`'s own gutter. So the verdict's title and every step label below it
 * begin on the SAME x. That is what makes the card read as one object rather than as a
 * heading that happens to sit above a list — and it is the whole reason the header pads
 * to 12px rather than to the 16px `AccountCard` uses one card down the page.
 *
 * ── THE PLATE ──────────────────────────────────────────────────────────────────────
 *
 * `bg-surface rounded-xl` — the page's card material, the same one `AccountCard` stands
 * on, because this sits beside it on the account page. NOT `PullRequestCard`'s
 * `bg-ink/5 rounded-lg`, which is the material of a block nested INSIDE another card in
 * the sidebar. Same shape, different ground, and the ground is decided by what a card
 * sits on rather than by which card it was modelled after.
 *
 * NO BORDER. It had `border border-line-strong`, and a hairline around a plate that is
 * already a different colour from the page is the same thing said twice — `Button`
 * states the rule, `AccountCard` and `RepositoryItem` learned it the same way. The
 * hairlines INSIDE stay: separating two things that are both here is a different job
 * from drawing a line around the whole.
 *
 * `overflow-hidden` so the first and last rows are clipped to the radius. Rows drawn
 * edge to edge would otherwise square off the two bottom corners the moment one of them
 * is unfolded and takes a ground.
 *
 * AN UNFOLDED ROW STILL READS, and it is worth knowing WHY before anyone "fixes" the
 * plate. `CollapsibleLine` marks its open row with `bg-surface`, which is the token this
 * plate is also drawn in — the same class on both, which looks like it must cancel out.
 * It does not, because the surface tokens are TRANSLUCENT: 0.06 over 0.06 composites to
 * 0.116, a notch above `surface-strong`'s 0.10. So the open row lifts off the card by
 * about the step a hover takes elsewhere. `PullRequestCard` gets the same separation for
 * free, from a plate (`bg-ink/5`) that is a different colour to begin with; here it
 * comes out of the compositing, so swapping this plate for an OPAQUE ground would make
 * the open row vanish into it.
 */

/** Done, or not done yet. There is no third answer a checklist can give. */
export type ChecklistVerdict = 'ready' | 'pending'

/**
 * The mark each verdict is read by.
 *
 * IN HERE AND NOT AT THE CALL SITE, on `PR_STATE_MARK` and `CHECK_STATE_MARK`'s model:
 * a green tick for "everything is done" is not a fact about one app's account tab, it
 * is what done looks like. The caller keeps the WORDS, which need a catalogue and a
 * language; this keeps the glyph and the colour, so two surfaces reporting progress
 * cannot disagree about what finished looks like.
 *
 * PENDING IS YELLOW AND NOT RED. Nothing has gone wrong — there is simply more to do —
 * and a red light on a fresh install would read as a failure the user caused.
 */
export const CHECKLIST_VERDICT_MARK: Record<ChecklistVerdict, { icon: typeof CheckCircle2; tone: PRTone }> = {
  ready: { icon: CheckCircle2, tone: 'green' },
  pending: { icon: Circle, tone: 'yellow' },
}

export interface ChecklistCardProps {
  /** Done or not. Decides the mark and its colour, nothing else. */
  verdict: ChecklistVerdict
  /** The line that states it — "Ready to use", "Setup in progress". Translated. */
  title: string
  /** Under it, quieter: what the verdict is based on. Translated. Truncates. */
  subtitle?: string
  /**
   * The count in the top-right slot, already composed and already toned — "3/5".
   *
   * A FIGURE RATHER THAN A WORD, which is where this parts company with
   * `PullRequestCard`'s badge: that one carries a verdict the header does not already
   * give ("Changes requested"), while here the header states the verdict in words and
   * the badge is the arithmetic behind it. Both are the caller's call for the same
   * reason — neither is a fact about a card.
   */
  badge?: { label: string; tone: PRTone }
  /**
   * The rows. `CollapsibleLine`s, one per thing to do, and each gets its hairline from
   * here rather than spelling its own — a caller drawing its own `border-t` is a caller
   * that can forget one.
   */
  children?: ReactNode
  /**
   * Draw the card's own shape with every string replaced by a bar of its size.
   *
   * IN THE COMPONENT AND NOT AT THE CALL SITE, which is the one thing here that is not
   * `PullRequestCard`'s arrangement. A placeholder's whole job is to occupy the exact
   * space the real thing will, so that nothing moves when the answers land; a skeleton
   * written beside the card is a second drawing of the same card, and the day the
   * header gains a row the two stop matching and the page jumps. Keeping it in here
   * means the skeleton cannot describe a card that no longer exists.
   *
   * `rows` is how many bars to draw, because only the caller knows how long its list
   * is going to be. `label` is what a screen reader is told while it waits — this
   * folder cannot read a translation.
   */
  loading?: { rows: number; label: string }
  /** Margins and width. Not the ground, the radius or the dividers. */
  className?: string
}

/** The plate, spelled once: both the card and its placeholder stand on it. */
const PLATE = 'bg-surface rounded-xl overflow-hidden'

/**
 * The gutter, spelled once for the same reason the plate is. `p-3` plus a `w-4` mark
 * plus `gap-2` puts the header's text on `CollapsibleLine`'s own x — see the note at
 * the top on why that alignment is the point rather than a detail.
 */
const HEADER = 'flex items-center gap-2 p-3'

export function ChecklistCard({
  verdict,
  title,
  subtitle,
  badge,
  children,
  loading,
  className = '',
}: ChecklistCardProps) {
  if (loading) return <ChecklistCardSkeleton {...loading} className={className} />

  const mark = CHECKLIST_VERDICT_MARK[verdict]

  return (
    <div className={`${PLATE} ${className}`.trim()}>
      <div className={HEADER}>
        <span className="w-4 flex-shrink-0 flex items-center justify-center">
          <Icon glyph={mark.icon} size="md" tone="inherit" className={PR_MARK[mark.tone]} />
        </span>

        <div className="min-w-0 flex-1">
          <Text size="sm" weight="medium" className="block truncate" title={title}>
            {title}
          </Text>
          {subtitle && (
            <Text size="xs" tone="secondary" className="mt-0.5 block truncate opacity-60">
              {subtitle}
            </Text>
          )}
        </div>

        {badge && (
          /* `PullRequestCard`'s badge, down to the fixed `h-5`: it sits beside a
             two-line title rather than on a row of buttons, and a full-height chip
             there would outweigh the verdict it qualifies. */
          <span
            className={`flex-shrink-0 h-5 inline-flex items-center px-2 rounded-lg text-[10px] font-semibold ${PR_BADGE[badge.tone]}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* EVERY ROW GETS THE HAIRLINE, drawn from here. `PullRequestCard` does the same
          thing with the same selector and for the same reason. */}
      {children && <div className="[&>*]:border-t [&>*]:border-line-subtle">{children}</div>}
    </div>
  )
}

/**
 * The card's own shape with every string swapped for a bar of its size.
 *
 * THE BARS ARE STAGGERED IN WIDTH, which is the one thing that stops a placeholder
 * reading as a table: four identical bars line up into columns the real list will not
 * have. The heights match what lands in their place, so nothing moves.
 *
 * `role="status"` with `aria-busy`, so the wait is announced rather than being a silent
 * gap — and the bars themselves are `aria-hidden`, because a screen reader has no use
 * for eight nameless boxes.
 */
function ChecklistCardSkeleton({
  rows,
  label,
  className = '',
}: {
  rows: number
  label: string
  className?: string
}) {
  return (
    <div className={`${PLATE} ${className}`.trim()} role="status" aria-busy="true" aria-label={label}>
      <div className={`${HEADER} animate-pulse`}>
        <span aria-hidden className="w-4 h-4 flex-shrink-0 rounded-full bg-surface-strong" />
        <div className="min-w-0 flex-1">
          <span aria-hidden className="block h-5 w-32 rounded bg-surface-strong" />
          <span aria-hidden className="mt-0.5 block h-4 w-48 max-w-full rounded bg-surface-strong" />
        </div>
        <span aria-hidden className="h-5 w-9 flex-shrink-0 rounded-lg bg-surface-strong" />
      </div>

      <div className="[&>*]:border-t [&>*]:border-line-subtle">
        {Array.from({ length: rows }, (_, i) => (
          /* `h-9` and `px-3`: `CollapsibleLine`'s own row box, so a bar sits exactly
             where its label will. */
          <div key={i} className="h-9 px-3 flex items-center gap-2 animate-pulse">
            <span aria-hidden className="w-4 h-4 flex-shrink-0 rounded-full bg-surface-strong" />
            <span
              aria-hidden
              className={`block h-4 rounded bg-surface-strong ${['w-40', 'w-28', 'w-44', 'w-36'][i % 4]}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
