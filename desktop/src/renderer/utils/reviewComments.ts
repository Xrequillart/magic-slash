/**
 * A review's comments as ONE list, and as the text handed to the agent.
 *
 * `commentAnchors` next door answers where a single comment sits in a single document.
 * This answers the two questions a whole review raises that no card can: which comments
 * exist across every file of it, and what they say when they are read together — by a
 * person scanning the list, and by the agent the list is sent to.
 *
 * Free of DOM types and of React, like `commentAnchors` and `reviewLayout`, and free of
 * the STORE as well. The renderer suite runs on node with no jsdom, so the input types
 * below are structural rather than imports of `FileComment` and of the store's map — the
 * precedent, and the reason, are spelled out on `AnchoredComment` in `commentAnchors`.
 * `ChangedFile` is imported because it is neither DOM nor store, but the file list is
 * still typed structurally: nothing here reads a file's counts or its status.
 */

import { commentAnchorKind, commentFileKeyPrefix, type LineRange } from './commentAnchors'
import { reviewFileKey } from './reviewLayout'

/**
 * Just enough of a stored comment to list it and to write it out.
 *
 * `FileComment` satisfies it as it stands; `createdAt` is deliberately absent, because
 * nothing here sorts by time — the store's own order is creation order already.
 */
export interface StoredComment {
  id: string
  anchor: LineRange | null
  quote: string
  body: string
}

/**
 * A file as the review names it. `ChangedFile` satisfies it.
 *
 * The PATH alone: the counts and the status describe the diff, and a comment is about
 * the diff rather than about how big it is.
 */
export interface CommentedFile {
  path: string
}

/** One comment of the review, with the version of the file it was filed under. */
export interface ReviewComment extends StoredComment {
  /**
   * The `diffFingerprint` its key carries — what the caller needs to rebuild a
   * `CommentTarget` and delete it, or to point a card at it.
   *
   * Kept per COMMENT rather than per group, so a path whose comments span two versions
   * of the file still reads as one file in the list. The store's own sweep in
   * `addFileComment` makes that state short-lived — writing a comment drops every other
   * version of that file — but it is reachable, and a group that could only hold one
   * fingerprint would have had to drop the others silently.
   */
  fingerprint: string
}

/**
 * Every comment left on one file of the review, in the order they were written.
 *
 * The PATH and nothing more. No index into the review's frozen list, deliberately: the one
 * caller that scrolls starts from `focusedComment`, which reaches it through the store and
 * carries a target rather than a group, so it has to resolve the card from the path anyway.
 * An index here would be a second answer to "which card is this" that nothing reads.
 */
export interface ReviewCommentGroup {
  path: string
  comments: ReviewComment[]
}

/**
 * Every comment of a review, grouped by file.
 *
 * Walked FILE BY FILE, in the order of the review's own list, rather than by walking the
 * store's map: the list is what the reader sees stacked in the drawer, so a panel built
 * from it reads top to bottom the same way. It also means a comment on a path the review
 * does not hold — a file committed away since — simply does not appear, rather than
 * appearing under a heading with no card to jump to.
 *
 * The fingerprint comes off the key by LENGTH, `key.slice(prefix.length)`, and not by
 * splitting on the NUL byte. The key's format is `commentFileKey`'s business and is
 * spelled in exactly one place; a second module that knew a NUL separates the two halves
 * would be a second place to change if it ever gained a third segment.
 *
 * Files with nothing on them are omitted rather than carried as empty groups: the count
 * every caller wants is a count of comments, and an empty group would draw a heading
 * over nothing.
 *
 * One pass over the map per file, which is a product and looks like the wrong shape until
 * you try the alternative: grouping the keys first means deriving a PATH from a key, and
 * a path can only be recovered by knowing the key's layout — see above. A review holds
 * tens of files and the map holds an entry per file anyone has commented, so the product
 * is small, and it is only ever recomputed when one of the two actually changes.
 *
 * `liveFingerprints` is what keeps a SUPERSEDED version's comments out of the list. The
 * prefix matches every fingerprint a path has ever carried, and a comment filed against an
 * older one is not merely untidy: no mounted card holds that key, so clicking it cannot
 * open anything — the jump stops at the file — and its line numbers describe a diff that has
 * since moved, which `commentAnchors` documents as pointing at unrelated code. Sent to the
 * agent, that is an instruction about the wrong lines.
 *
 * The filter is deliberately NOT strict. A path is filtered only when its live fingerprint
 * is actually known; a path absent from the map keeps all of its comments. Cards report
 * their fingerprint once their read lands, so an unread or collapsed card has none to
 * report — and dropping those comments would empty the list of everything the reader has not
 * scrolled past yet, which is a worse failure than the one this fixes. Absent means unknown,
 * never superseded.
 *
 * Keyed by `reviewFileKey`, not by the bare path, and that is what lets the map OUTLIVE a
 * review. Two repositories hold files of the same name, so a path-keyed map had to be emptied
 * whenever the review changed — and a reset is the one thing this map cannot afford: cards
 * report from an effect on the fingerprint itself, so a card whose content did not change
 * never reports again, and a map cleared under it stays empty for as long as that card is
 * mounted. Putting the repository in the key removes the collision, which removes the reason
 * to reset, which removes the window where everything reads as unknown.
 */
export function collectReviewComments(
  fileComments: Record<string, readonly StoredComment[]>,
  files: readonly CommentedFile[],
  repoPath: string,
  liveFingerprints: Readonly<Record<string, string>> = {},
): ReviewCommentGroup[] {
  const groups: ReviewCommentGroup[] = []
  const entries = Object.entries(fileComments)

  for (const { path } of files) {
    const prefix = commentFileKeyPrefix(repoPath, path)
    const live = liveFingerprints[reviewFileKey(repoPath, path)]
    const comments: ReviewComment[] = []

    for (const [key, stored] of entries) {
      if (!key.startsWith(prefix)) continue
      const fingerprint = key.slice(prefix.length)
      if (live !== undefined && fingerprint !== live) continue
      for (const comment of stored) {
        comments.push({
          id: comment.id,
          fingerprint,
          anchor: comment.anchor,
          quote: comment.quote,
          body: comment.body,
        })
      }
    }

    if (comments.length > 0) groups.push({ path, comments })
  }

  return groups
}

/**
 * Where a comment points, in the shortest form that stays unambiguous — all three cases.
 *
 * `L12` for one line, `L12-18` for several, and `old:` in front of a range on the side of
 * the diff the file no longer has: `data-line="40"` on a removed row and `data-line="40"`
 * on an ordinary one are two different lines of two different files, so a range written
 * without its side is a range the agent could resolve to the wrong code.
 *
 * `(whole file)` is verbatim on purpose: it is what the agent has been reading since story 5,
 * and a comment on nothing in particular is still that. No range is invented to cover the
 * file, which would be a claim the reader never made.
 *
 * `(quoted passage)` is the new one, and it is a POSITIVE statement rather than the absence
 * of a line number: a comment left on the rendered markdown is anchored to the text quoted
 * on the `>` lines immediately below, and the agent has to be told that those lines ARE the
 * anchor rather than context beside one. Deriving a source line from a rendered selection is
 * out of scope by decision — the rendering has no mapping back to the file's lines — so this
 * is also the honest limit of what is known about where the comment points.
 *
 * ONE function over `commentAnchorKind` rather than a range half returning `null` for the
 * other two to catch: the subject here is "what stands in front of a comment", which has
 * three answers, and a nullable half would have to carry a paragraph explaining that it
 * cannot answer the question it is named for.
 */
function anchorText(comment: StoredComment): string {
  switch (commentAnchorKind(comment)) {
    case 'lines': {
      // Non-null by the discriminant: `'lines'` is what having an anchor MEANS.
      const anchor = comment.anchor as LineRange
      const lines = anchor.startLine === anchor.endLine
        ? `L${anchor.startLine}`
        : `L${anchor.startLine}-${anchor.endLine}`
      return anchor.side === 'old' ? `old:${lines}` : lines
    }
    case 'quote':
      return '(quoted passage)'
    case 'file':
      return '(whole file)'
  }
}

/**
 * The whole review as the text the agent is given.
 *
 * ENGLISH, and not a catalogue key. Every prompt this app writes for an agent is an
 * English literal at its call site — see `UpdateOverlay`'s debug prompt and the Skills
 * page's — because the reader's interface language is not the agent's, and a comment
 * body is the reader's own words either way. `commentLabel` in `commentAnchors` answers a
 * KEY instead, and that is the contrast rather than an inconsistency: it feeds a label a
 * person reads.
 *
 * The QUOTE is emitted alongside the range, always, and not only when there is no range
 * to emit. `diffFingerprint` documents the failure it guards: a comment re-rendered at
 * the same line numbers of a diff that has since moved points at UNRELATED code, "which
 * the next story then hands to the agent as an instruction" — this is that story. The
 * store says the same thing from the other side: the quote is "the one thing line numbers
 * cannot survive an edit and still answer". So the agent gets both, and can tell for
 * itself whether the lines still say what the comment was about.
 *
 * Quotes are prefixed `>` line by line, which is what keeps a multi-line quote from
 * reading as part of the body underneath it. An EMPTY quote emits nothing: a comment made
 * by picking line numbers in the gutter has no selected text, and a blank `>` would say
 * the lines were empty.
 *
 * On a comment left on the RENDERED markdown those `>` lines are not corroboration, they
 * are the anchor itself: there is no line number to emit, so `(quoted passage)` names what
 * the passage below is for. Nothing about the emission changes — the quote was always
 * written out — only the line above it, which is what turns "here is what those lines said"
 * into "this passage is what the comment is about".
 *
 * No trailing newline. The one caller that is not the clipboard writes this into a
 * terminal as a bracketed paste that must NOT submit itself, and a trailing newline is
 * exactly the byte that would submit it.
 */
export function formatReviewComments(groups: readonly ReviewCommentGroup[]): string {
  const files: string[] = []

  for (const group of groups) {
    const lines: string[] = [group.path]
    for (const comment of group.comments) {
      // Indented under the path, so the file a comment belongs to is legible without
      // repeating the path on every one of them. One `push` for all three anchor kinds,
      // because the indent is the same fact about all of them.
      lines.push(`  ${anchorText(comment)}`)
      for (const quoteLine of comment.quote.split('\n')) {
        if (quoteLine.trim() !== '') lines.push(`    > ${quoteLine}`)
      }
      // A blank line inside a body stays blank rather than becoming four spaces: the
      // text is pasted into a terminal, where trailing whitespace is visible.
      for (const bodyLine of comment.body.split('\n')) {
        lines.push(bodyLine === '' ? '' : `    ${bodyLine}`)
      }
    }
    files.push(lines.join('\n'))
  }

  // A blank line between files, nothing after the last one.
  return files.join('\n\n')
}
