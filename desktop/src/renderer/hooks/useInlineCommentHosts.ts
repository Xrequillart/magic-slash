import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Bring one comment's card into view, for the review list's "take me to this comment".
 *
 * It lives beside the hook because it acts on the nodes the hook makes, and because what it
 * replaced was a piece of the same design: the jump used to OPEN a card, and opening stopped
 * being a thing that can be asked for when every stored comment became permanently open. All
 * that is left of the request is getting the card on screen.
 *
 * `inline: 'nearest'`, which is the one option here that is a decision rather than a default:
 * a host sits inside the `<pre>`, and that element scrolls horizontally. Left to `'start'` the
 * browser would satisfy the request by scrolling the code sideways as well, throwing away the
 * reader's horizontal position to centre a card that was already at the left edge.
 */
export function scrollCardIntoView(host: HTMLElement): void {
  host.scrollIntoView({ block: 'center', inline: 'nearest' })
}

/** No hosts, as ONE map — so a document with no comments does not re-render on identity. */
const NO_HOSTS: ReadonlyMap<string, HTMLDivElement> = new Map()

/**
 * A block in the document's own flow per comment, each inserted directly after the element
 * its comment is about.
 *
 * This is what replaced `useSelectionAnchoredPanel`, and the two are opposites rather than
 * variants. That hook placed a `fixed` panel by hand — measuring the anchor's rect on every
 * scroll frame, clamping it inside the window, flipping it above the line when it would run
 * off the bottom — because the card floated OVER the document. A card that sits IN the
 * document needs none of that: it scrolls because its neighbours do, it is never off-screen
 * because it takes up room, and it can never cover the lines it is about because it pushes
 * them apart instead. Every one of those problems was a consequence of floating.
 *
 * PLURAL, and that is the second thing floating made impossible. Every stored comment is now
 * shown open, all of them at once, so a document has as many of these as it has comments plus
 * one for whatever is being written. Floating cards could not have done that — forty panels
 * anchored to forty rows would have stacked on top of each other at the window's edges.
 *
 * DOM nodes created here rather than React elements, and that is forced: both callers draw
 * their content from HTML they do not own — shiki's for the diff, MarkdownView's parse for
 * prose — so there is no JSX position between two lines for a component to be rendered at.
 * The nodes are inserted imperatively and the caller `createPortal`s into them, which keeps
 * each card a child of the CALLER in the React tree while being a sibling of the lines in the
 * DOM. That split is load-bearing twice over: React events inside a card propagate up the
 * React tree, so they never reach the mousedown/mouseup/click handlers the caller has on the
 * code container, and the caller's state still drives the cards without a second store.
 *
 * `resolveAnchors` is a callback, and its identity is the hook's whole dependency: it must be
 * `useCallback`d on the comments, on whatever is being composed, AND on the HTML those are
 * resolved against. The last is not hypothetical — the spec panel re-reads its file on every
 * save, and a host left in a `<pre>` that has been replaced is a detached node the portal
 * would go on rendering into.
 */
export function useInlineCommentHosts(
  resolveAnchors: () => ReadonlyMap<string, HTMLElement>,
): ReadonlyMap<string, HTMLDivElement> {
  const [hosts, setHosts] = useState<ReadonlyMap<string, HTMLDivElement>>(NO_HOSTS)

  /**
   * The nodes currently spliced in, and the anchor each one was placed against.
   *
   * A ref beside the state, so the effect can tell what it already has from what it needs —
   * which is what makes the pass below a RECONCILIATION rather than a teardown and rebuild.
   * That distinction protects a draft: `resolveAnchors` changes identity whenever the comment
   * list does, so writing a new comment on one range while an older card sits in edit mode
   * would, under a rebuild, unmount that card and take the half-typed body with it.
   */
  const placedRef = useRef(new Map<string, { anchor: HTMLElement; node: HTMLDivElement }>())

  /**
   * A LAYOUT effect, so the nodes are in the flow before the browser paints: in a passive
   * effect the reader would see the lines part on the frame after the one that opened a card.
   */
  useLayoutEffect(() => {
    const anchors = resolveAnchors()
    const placed = placedRef.current
    let changed = false

    // Gone, moved, or orphaned. `isConnected` is the one that catches a re-read: the `<pre>`
    // is replaced wholesale, so every node in it is detached while this map still holds them.
    for (const [key, entry] of placed) {
      if (anchors.get(key) === entry.anchor && entry.node.isConnected) continue
      entry.node.remove()
      placed.delete(key)
      changed = true
    }

    for (const [key, anchor] of anchors) {
      if (placed.has(key)) continue
      const node = document.createElement('div')
      /**
       * `user-select: none`, and this is the one line here that protects stored data.
       *
       * The comment pill is a `::after` for this very reason, written up at `COMMENT_ICON` in
       * CodeView: anything injected into the code lands in the row's `textContent` and
       * therefore in `selection.toString()` for the next drag over it — which would write a
       * card's own words into the quote of the comment being made about the code. A pseudo-
       * element was the way out for a badge; a card holds a textarea and cannot be one.
       * Taking the node out of the selection instead reaches the same place: a drag straight
       * through a card yields the lines above and below it and nothing in between.
       *
       * It matters more now than it did with one card: a file with six comments has six of
       * these between its lines, so a drag over any sizeable region crosses at least one.
       *
       * The textarea keeps working regardless — a form control owns its own selection, and
       * the document's has no say in what it can be given the caret in.
       *
       * Set as an inline style rather than a class, because the node is created outside React
       * and Tailwind is not in play until the portal's children render inside it.
       */
      node.style.userSelect = 'none'
      node.style.webkitUserSelect = 'none'
      anchor.after(node)
      placed.set(key, { anchor, node })
      changed = true
    }

    // Only when something actually moved: this effect runs on every identity change of
    // `resolveAnchors`, and most of those resolve to the same anchors they did before.
    if (changed) setHosts(new Map([...placed].map(([key, entry]) => [key, entry.node])))
  }, [resolveAnchors])

  /**
   * Everything out, on unmount.
   *
   * Separate from the pass above, and not a formality: the nodes usually OUTLIVE their
   * cards — a card closing leaves the document exactly where it was — so there is no other
   * moment at which they would all be taken out. Empty deps, so it is the unmount and only
   * the unmount.
   */
  useEffect(() => () => {
    for (const entry of placedRef.current.values()) entry.node.remove()
    placedRef.current.clear()
  }, [])

  return hosts
}
