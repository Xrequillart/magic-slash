/**
 * Measuring where something sits inside the thing that scrolls it.
 *
 * These two lived inside CodeView while CodeView was the only component that measured
 * anything. The review drawer moved the measurement UP — one sweep from the panel over
 * every card at once, rather than one per card — so the panel needs them too, and a
 * second copy of `cumulativeOffsetTop` is a second copy of a subtle decision.
 *
 * Unlike the modules beside it, this one holds DOM types and therefore cannot be
 * covered by the renderer's node suite. That is exactly why it contains no arithmetic
 * beyond a sum: everything that decides anything lives in `diffMarkers` and
 * `reviewLayout`, which take numbers and are tested. What is here is the reading of the
 * DOM, and it is kept as small as it can be for that reason.
 */

/**
 * The element something actually scrolls in, walking up from a node inside it.
 *
 * Resolved from the DOM rather than assumed, because the same content renders in the
 * preview drawer and in the spec panel, which scroll in different boxes.
 *
 * Both halves of the test matter. Size alone would stop at any ancestor whose content
 * merely overflows a `hidden` or `visible` box, which scrolls nothing; overflow alone
 * would stop at an `overflow-auto` ancestor that currently fits its content, and
 * scrolling that is a no-op that leaves the real container untouched.
 *
 * The walk starts at the PARENT, so a node's own `<pre>`-style inner scroller is never
 * a candidate.
 */
export function findScrollContainer(from: HTMLElement): HTMLElement | null {
  let node = from.parentElement
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (node.scrollHeight > node.clientHeight && (overflowY === 'auto' || overflowY === 'scroll')) return node
    node = node.parentElement
  }
  return null
}

/**
 * Distance from the document's layout origin, summed up the offsetParent chain.
 *
 * Layout offsets, not `getBoundingClientRect`: this runs while the drawer is midway
 * through its 300 ms `animate-slide-in`, and a rect is a POST-transform measurement, so
 * every number it returns is displaced by however far the panel has slid. An offset is
 * pure layout and immune to the transform, which is also why no timer is needed — the
 * values are already final at commit.
 *
 * The review makes this load-bearing in a way one file never did: every card's rows are
 * measured against the same scroller, so an offset that drifted by the slide distance
 * would not merely be wrong, it would be wrong by an amount that changes between the
 * cards measured early in the animation and the ones measured late.
 */
export function cumulativeOffsetTop(node: HTMLElement): number {
  let top = 0
  let current: HTMLElement | null = node
  while (current) {
    top += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return top
}
