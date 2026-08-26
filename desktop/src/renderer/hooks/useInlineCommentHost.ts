import { useLayoutEffect, useState } from 'react'

/**
 * A block in the document's own flow to render a comment composer into, inserted directly
 * after the element it is about.
 *
 * This is what replaced `useSelectionAnchoredPanel`, and the two are opposites rather than
 * variants. That hook placed a `fixed` panel by hand — measuring the anchor's rect on every
 * scroll frame, clamping it inside the window, flipping it above the line when it would run
 * off the bottom — because the card floated OVER the document. A card that sits IN the
 * document needs none of that: it scrolls because its neighbours do, it is never off-screen
 * because it takes up room, and it can never cover the lines it is about because it pushes
 * them apart instead. Every one of those problems was a consequence of floating.
 *
 * A DOM node created here rather than a React element, and that is forced: both callers draw
 * their content from HTML they do not own — shiki's for the diff, MarkdownView's parse for
 * prose — so there is no JSX position between two lines for a component to be rendered at.
 * The node is inserted imperatively and the caller `createPortal`s into it, which keeps the
 * card a child of the CALLER in the React tree while being a sibling of the lines in the DOM.
 * That split is load-bearing twice over: React events inside the card propagate up the React
 * tree, so they never reach the mousedown/mouseup/click handlers the caller has on the code
 * container, and the caller's state still drives the card without a second store.
 *
 * `resolveAnchor` is a callback, and its identity is the hook's whole dependency: it must be
 * `useCallback`d on the range the card is open on AND on the HTML that range is resolved
 * against. The second half is not hypothetical — the spec panel re-reads its file on every
 * save, and a host left in a `<pre>` that has been replaced is a detached node the portal
 * would go on rendering into for as long as the card stayed open.
 */
export function useInlineCommentHost(resolveAnchor: () => HTMLElement | null): HTMLDivElement | null {
  const [host, setHost] = useState<HTMLDivElement | null>(null)

  /**
   * A LAYOUT effect, so the node is in the flow before the browser paints: in a passive
   * effect the reader would see the lines part on the frame after the one that opened the
   * card.
   *
   * The cleanup removes the node rather than leaving it to be garbage collected with the
   * HTML around it, because it usually is NOT: the common case is a card closing while the
   * document it was inserted into stays exactly where it was.
   */
  useLayoutEffect(() => {
    const anchor = resolveAnchor()
    if (!anchor) {
      setHost(null)
      return
    }

    const node = document.createElement('div')
    /**
     * `user-select: none`, and this is the one line here that protects stored data.
     *
     * The comment pill is a `::after` for this very reason, written up at `COMMENT_ICON` in
     * CodeView: anything injected into the code lands in the row's `textContent` and
     * therefore in `selection.toString()` for the next drag over it — which would write the
     * card's own words into the quote of the comment being made about the code. A pseudo-
     * element was the way out for a badge; a card holds a textarea and cannot be one. Taking
     * the node out of the selection instead reaches the same place: a drag straight through
     * the card yields the lines above and below it and nothing in between.
     *
     * The textarea keeps working regardless — a form control owns its own selection, and the
     * document's has no say in what it can be given the caret in.
     *
     * Set as an inline style rather than a class, because the node is created outside React
     * and Tailwind is not in play until the portal's children render inside it.
     */
    node.style.userSelect = 'none'
    node.style.webkitUserSelect = 'none'
    anchor.after(node)
    setHost(node)

    return () => {
      node.remove()
      setHost(null)
    }
  }, [resolveAnchor])

  return host
}
