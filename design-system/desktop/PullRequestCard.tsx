import type { ReactNode } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, RefreshCw } from './icons'
import { Icon } from './Icon'
import { PR_BADGE, PR_MARK, type PRTone } from './prTones'
import { Text } from './Text'

/**
 * A pull request, as the sidebar watches it: what it is, what has to be true before it
 * ships, and how old that answer is.
 *
 * THREE BANDS AND NOTHING ELSE — a header, whatever the caller stacks in the middle,
 * and a footer that is always there. The middle is `children` on purpose: what belongs
 * in it is a watch error, a checklist, a prompt to switch the watcher back on, and
 * which of those applies is a question about the app's own state. This draws the card
 * and the dividers between the bands; the caller decides what the bands say.
 *
 * IT IS THE PANEL AND `CollapsibleLine` IS THE ROW, the split this folder makes
 * everywhere. The rows go in `children`, and the card gives every one of them the
 * hairline that separates it from the one above.
 *
 * THE HEADER IS THE LINK, which is why there is no "View pull request" button under
 * the card: the title, the slug and the tooltip already say where this goes, and an
 * external-link glyph beside them would say it a fourth time. The badge sits INSIDE
 * that target — it labels the PR, so clicking it should open the PR rather than land
 * on dead space.
 *
 * NO OUTER RULE, and the header chip's own ground and radius — `bg-ink/5`,
 * `rounded-lg` — because this is one more block in the repository card and they are
 * all one material. The bands INSIDE keep their hairline: separating two things that
 * are both here is a different job from drawing a line around the whole.
 */

/** The four states GitHub reports, and the mark and colour each is read by. */
export type PullRequestState = 'open' | 'draft' | 'merged' | 'closed'

/**
 * Merged is PURPLE and not a severity — GitHub has meant that for a decade, and the
 * sidebar keeps the association so the state reads before the word does. See
 * `prTones` on why this folder names colours rather than inventing a scale.
 */
export const PR_STATE_MARK: Record<PullRequestState, { icon: typeof GitMerge; tone: PRTone }> = {
  open: { icon: GitPullRequest, tone: 'green' },
  draft: { icon: GitPullRequestDraft, tone: 'neutral' },
  merged: { icon: GitMerge, tone: 'purple' },
  closed: { icon: GitPullRequestClosed, tone: 'red' },
}

export interface PullRequestCardProps {
  /**
   * Which of the four, or nothing at all.
   *
   * ABSENT IS A REAL ANSWER and not a default: a card built before the watcher has
   * ever read the PR knows nothing, and guessing "open" would be the card inventing a
   * fact. It falls back to the neutral pull-request mark and no badge.
   */
  state?: PullRequestState
  /** The line that names it — the app writes "PR #481". */
  title: string
  /** Under the title, quieter: the `owner/repo` it lives in. Truncates. */
  subtitle?: string
  /**
   * The one word in the top-right slot, already translated and already toned.
   *
   * WHICH word is the caller's call, and it is a real decision: on an OPEN pull request
   * the state is the thing the reader already knows — the card is there — while
   * "Changes requested" is what they opened the sidebar to find out. Draft, merged and
   * closed keep the slot, because those say something a verdict cannot. None of that is
   * a fact about a card, so none of it is in here.
   */
  badge?: { label: string; tone: PRTone }
  /** Opening it somewhere else. The whole header is this control. */
  open: { label: string; onOpen: () => void }
  /** The bands: a watch error, the checklist, a prompt. Each gets a hairline above it. */
  children?: ReactNode
  /**
   * The status bar — how old everything above it is, and the button that makes it
   * newer. Reading on the left, action on the right, so the control is where the eye
   * already is when the stamp turns out to be stale.
   *
   * OPTIONAL, because there is one state where it must not be there: with the watcher
   * switched off, nothing above will ever move again and a refresh button would be a
   * control that cannot do what it says.
   */
  footer?: {
    /** "Checked 2 min ago", already composed and already translated. */
    label: string
    refresh: {
      /** Tooltip and accessible name — the button carries no word of its own. */
      label: string
      /** A read is in flight: the arrow turns and the click is blocked. */
      busy?: boolean
      onRefresh: () => void
    }
  }
  /** Margins and width. Not the ground, the radius or the dividers. */
  className?: string
}

export function PullRequestCard({
  state,
  title,
  subtitle,
  badge,
  open,
  children,
  footer,
  className = '',
}: PullRequestCardProps) {
  const mark = state ? PR_STATE_MARK[state] : { icon: GitPullRequest, tone: 'neutral' as PRTone }

  return (
    <div className={`bg-ink/5 rounded-lg overflow-hidden ${className}`.trim()}>
      <div className="flex items-center p-2">
        {/* ONE GENEROUS HIT AREA. The negative margin lets the hover surface reach past
            the container's padding to 4px from the card edge, while the button's own
            padding keeps the text off that edge. */}
        <button
          type="button"
          onClick={open.onOpen}
          title={open.label}
          className="group flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg -m-1 p-2 border-none bg-transparent cursor-pointer hover:bg-ink/10 transition-colors"
        >
          <span className="w-4 flex-shrink-0 flex items-center justify-center">
            <Icon glyph={mark.icon} size="md" tone="inherit" className={PR_MARK[mark.tone]} />
          </span>
          <span className="min-w-0 flex-1">
            {/* Hover brightens the title to full ink rather than tinting it: the surface
                lighting up is already the affordance, and an accent read as a state
                change on the PR itself. */}
            <Text
              tone="inherit"
              className="block truncate text-ink/90 group-hover:text-ink transition-colors"
            >
              {title}
            </Text>
            {subtitle && (
              <span className="block text-[10px] text-text-secondary/50 truncate" title={subtitle}>
                {subtitle}
              </span>
            )}
          </span>
          {badge && (
            /* `h-5 rounded-lg`: the family's radius on a badge one step shorter than the
               24px chips — it sits beside a two-line title, not on a row of buttons, and
               a full-height chip there would outweigh the number it qualifies. A fixed
               height rather than padding, so "Changes requested" and "Open" are the same
               object. Not upper-cased: the long one is twice the width of the short one
               and would eat the title beside it. */
            <span
              className={`flex-shrink-0 h-5 inline-flex items-center px-2 rounded-lg text-[10px] font-semibold ${PR_BADGE[badge.tone]}`}
            >
              {badge.label}
            </span>
          )}
        </button>
      </div>

      {/* EVERY BAND GETS THE HAIRLINE, drawn from here rather than by each band: a
          caller spelling its own `border-t` is a caller that can forget one, and an
          empty band with a rule above it reads as a rendering bug. */}
      {children && <div className="[&>*]:border-t [&>*]:border-line-subtle">{children}</div>}

      {footer && (
        <div className="border-t border-line-subtle px-2 py-1.5 flex items-center gap-2">
          <span className="min-w-0 text-[10px] text-text-secondary/50 truncate">{footer.label}</span>
          {/* THE WORD IS GONE, and that is the trade this button made to become a
              `ButtonIcon`: that component is icon-only by construction, and a spinning
              arrow beside a "checked 2 min ago" stamp needs no label to be read. The
              tooltip carries the name, as it does for the repository actions above. */}
          <ButtonIcon
            icon={RefreshCw}
            title={footer.refresh.label}
            onClick={footer.refresh.onRefresh}
            busy={footer.refresh.busy}
            className="ml-auto"
          />
        </div>
      )}
    </div>
  )
}
