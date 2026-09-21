import type { ReactNode } from 'react'
import { Card } from './Card'
import { Text } from './Text'

/**
 * ONE TURN IN A CONVERSATION: who said it and when, then what they said.
 *
 * THE DESCRIPTION IS ONE OF THESE TOO, and that is the decision the component is built
 * on. A ticket page is a description followed by a thread, and giving the replies a
 * different card would say they are a different kind of thing — they are not; the
 * description is simply the first turn. What separates them is the STRIP: the
 * description's names the field ("Description"), a comment's names a person.
 *
 * ── NO BORDER, AND NO PLATE UNDER THE STRIP EITHER ────────────────────────────────
 *
 * It was `border border-line-field` around the card and `bg-surface-subtle border-b
 * border-line-subtle` under the strip — a box, ruled off from a second box, on a page
 * whose every other edge has gone. The card is the plate now and the strip is just its
 * first line: quiet ink, then the body under it. A reader loses nothing, because the
 * strip was never distinguished by its ground — it was distinguished by being a name and
 * a date where the rest is prose.
 *
 * ── THE BODY IS `children` ────────────────────────────────────────────────────────
 *
 * The one node this file takes, and it has to be: a comment body is rendered markdown,
 * and the renderer lives in the app. What this owns is the plate, the strip, the measure
 * and the words for a turn that carried no text at all.
 */

export interface CommentCardProps {
  /**
   * Who wrote it, ALREADY DECORATED — `@ada` on a tracker whose people are handles,
   * `Ada Lovelace` on one whose people are names.
   *
   * The `@` is the caller's and not this file's, and the distinction is real: a login is
   * a handle and wears one everywhere in that product, while `@Ada Lovelace` reads as a
   * mention of an account that does not exist.
   *
   * Absent, `title` is drawn instead — for the description, and for the turns neither
   * tracker attributes: an app posting through an API, an account since deleted.
   */
  author?: string
  /**
   * The verb after the name — "commented". Already translated, and only ever drawn
   * beside an `author`.
   */
  verb?: string
  /**
   * What the strip says when there is no author: "Description", "Comment". Already
   * translated.
   */
  title?: string
  /** When, already formatted. At the far end of the strip. */
  date?: string
  /**
   * That it was changed after it was posted — the word, and the full sentence for the
   * pointer.
   *
   * IN THE TOOLTIP AND NOT ON THE STRIP, which has one line and a name already on it.
   */
  edited?: { label: string; title: string }
  /**
   * What the body says when there is none. A turn with no text is still a turn — an
   * attachment, a reaction, a transition a tracker recorded as a comment — so it keeps
   * its card and says so rather than rendering as an empty box.
   */
  empty?: string
  children?: ReactNode
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function CommentCard({
  author,
  verb,
  title,
  date,
  edited,
  empty,
  children,
  className = '',
}: CommentCardProps) {
  return (
    <Card padding="none" className={`flex flex-col gap-3 px-5 py-4 ${className}`.trim()}>
      <div className="flex items-center gap-1.5 min-w-0">
        {author ? (
          <>
            <Text weight="bold" className="min-w-0 truncate">
              {author}
            </Text>
            {verb && (
              <Text tone="secondary" className="flex-shrink-0">
                {verb}
              </Text>
            )}
          </>
        ) : (
          title && (
            <Text weight="bold" className="min-w-0 truncate">
              {title}
            </Text>
          )
        )}
        {edited && (
          <Text tone="secondary" title={edited.title} className="flex-shrink-0 opacity-50">
            {edited.label}
          </Text>
        )}
        {date && (
          <Text tone="secondary" className="ml-auto flex-shrink-0 opacity-50">
            {date}
          </Text>
        )}
      </div>
      {children ?? (
        empty && (
          <Text size="sm" tone="secondary" className="opacity-40">
            {empty}
          </Text>
        )
      )}
    </Card>
  )
}
