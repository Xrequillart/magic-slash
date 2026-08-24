import { useLayoutEffect, useRef } from 'react'
import { groupMarkerBlocks, selectScrollTop, type MarkerBlock, type MarkerPosition } from '../../utils/diffMarkers'

interface Props {
  content: string
  highlightedHtml: string | null
  /**
   * Bump to re-anchor on the first change without re-reading the file. Clicking a
   * file that is already open changes nothing else — same path, same status, same
   * HTML — so this counter is the only thing left that can say "take me back to the
   * change".
   */
  scrollSeq?: number
  /**
   * Where the changes ended up ON SCREEN, handed to the parent so the navigator and the
   * marker ruler can both work from the same anchoring this component opens on.
   * Reported from the measurement below rather than measured again: the numbers are
   * only valid for the layout that produced them.
   *
   * This — and NOT the `changedLines` the IPC read also returns — is the only usable
   * source of position. A deletion is re-injected as an extra visual row, so a file
   * line number is not a rendered row index, and nothing downstream can convert one
   * into the other without measuring the document anyway. Each block carries the kind
   * of the rows it covers, which is the ruler's only other input.
   */
  onBlocksMeasured?: (blocks: MarkerBlock[], contextPx: number) => void
}

/**
 * The element the preview actually scrolls in, walking up from the highlighted
 * block. It is FilePreviewPanel's `flex-1 overflow-auto`, but this is resolved from
 * the DOM rather than assumed, because the same component also renders inside the
 * spec panel, which scrolls somewhere else entirely.
 *
 * Both halves of the test matter, and neither is about the inner `<pre>` — the walk
 * starts at the parent, so the `<pre>` sitting *inside* the highlighted block is never
 * a candidate. Size alone would stop at any ancestor whose content merely overflows a
 * `hidden` or `visible` box, which scrolls nothing; overflow alone would stop at an
 * `overflow-auto` ancestor that currently fits its content, and scrolling it is a
 * no-op that leaves the real container untouched.
 */
function findScrollContainer(from: HTMLElement): HTMLElement | null {
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
 * Layout offsets, not `getBoundingClientRect`: this runs while the panel is midway
 * through its 310 ms `animate-slide-in`, and a rect is a POST-transform measurement,
 * so every number it returns is displaced by however far the panel has slid. An
 * offset is pure layout and immune to the transform, which is also why no timer is
 * needed here — the values are already final at commit.
 */
function cumulativeOffsetTop(node: HTMLElement): number {
  let top = 0
  let current: HTMLElement | null = node
  while (current) {
    top += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return top
}

const CODE_STYLES = `
  .shiki code { counter-reset: line; white-space: normal; }

  .shiki code .line { display: block; white-space: pre; }

  .shiki code .line::before {
    counter-increment: line;
    content: "\\00a0" counter(line);
    display: inline-block;
    width: 3rem;
    margin-right: 1.25rem;
    padding-right: 0.75rem;
    text-align: right;
    color: rgba(255,255,255,0.18);
    border-right: 1px solid rgba(255,255,255,0.07);
    user-select: none;
    -webkit-user-select: none;
  }

  /* diff: added lines */
  .shiki code .line[data-diff="add"] {
    background-color: rgba(46,160,67,0.15);
    border-left: 2px solid #2ea043;
    margin-left: -1px;
  }
  .shiki code .line[data-diff="add"]::before {
    counter-increment: line;
    content: "+" counter(line);
    color: #2ea043;
    border-right-color: rgba(46,160,67,0.3);
  }

  /* diff: removed lines */
  .shiki code .line[data-diff="remove"] {
    background-color: rgba(248,81,73,0.15);
    border-left: 2px solid #f85149;
    margin-left: -1px;
  }
  .shiki code .line[data-diff="remove"]::before {
    counter-increment: line;
    content: "-" counter(line);
    color: #f85149;
    border-right-color: rgba(248,81,73,0.3);
  }
`

/** Lines of unchanged code kept above the first change, so it reads in context. */
const CONTEXT_LINES = 3

/** Only used if the first marked row measures zero, which layout should never give. */
const FALLBACK_LINE_HEIGHT = 18

export default function CodeView({ content, highlightedHtml, scrollSeq, onBlocksMeasured }: Props) {
  const htmlRef = useRef<HTMLDivElement>(null)

  // Opening a modified file at line 1 hides the very thing it was opened for, so the
  // panel is anchored on the first change instead. In a layout effect, before paint:
  // the reader must never see the top of the file and then a jump away from it.
  useLayoutEffect(() => {
    const root = htmlRef.current
    if (!root) return
    const container = findScrollContainer(root)
    // No scrollable ancestor means no scrollable overflow, and returning here reports
    // no block — which also leaves the navigator card unrendered. That is the decision,
    // not an oversight: with the content shorter than its viewport every change is
    // already on screen, so there is nothing to navigate to. Reporting the blocks
    // anyway would put up a card whose arrows move nothing — `blockScrollTop` clamps
    // every one of them to 0 — leaving a counter that walks 1 → 2 → 3 over a view that
    // never changes, which reads as a broken button rather than as "already there".
    if (!container) return

    const containerTop = cumulativeOffsetTop(container)
    const markers: MarkerPosition[] = [...root.querySelectorAll<HTMLElement>('.line[data-diff]')].map(line => ({
      top: cumulativeOffsetTop(line) - containerTop,
      height: line.offsetHeight,
      // `annotateShikiHtml` only ever writes "add" or "remove", and the selector above
      // already excluded rows with no attribute at all; anything else is a row this
      // version does not know, and colouring it as an addition beats dropping it.
      kind: line.dataset.diff === 'remove' ? 'remove' : 'add',
    }))

    const contextPx = CONTEXT_LINES * (markers[0]?.height || FALLBACK_LINE_HEIGHT)
    const blocks = groupMarkerBlocks(markers)
    // Reported before the scroll rather than after it, and from this one grouping:
    // measuring a second time for the navigator would mean two passes over the DOM
    // for numbers that are the same by construction.
    onBlocksMeasured?.(blocks, contextPx)

    // No marker is the normal case for the spec panel, which renders this component
    // with an empty status and therefore gets no `data-diff` at all: `selectScrollTop`
    // answers null and the panel's own follow-the-bottom scrolling is left alone.
    const target = selectScrollTop(blocks, {
      viewportHeight: container.clientHeight,
      contentHeight: container.scrollHeight,
      currentScrollTop: container.scrollTop,
      contextPx,
    })
    if (target !== null) container.scrollTo({ top: target })
    // `onBlocksMeasured` is deliberately absent from the dependencies: it is a
    // notification, not an input, and re-running this effect for a new callback
    // identity would drag the reader back to the first change on an unrelated render.
  }, [highlightedHtml, scrollSeq])

  if (highlightedHtml) {
    return (
      <>
        <style>{CODE_STYLES}</style>
        <div
          ref={htmlRef}
          className="text-sm [&>pre]:p-4 [&>pre]:min-h-full [&>pre]:font-mono [&>pre]:text-xs [&>pre]:leading-relaxed [&>pre]:overflow-auto"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </>
    )
  }

  return (
    <pre className="p-4 text-sm text-ink/80 font-mono whitespace-pre-wrap break-all">
      {content}
    </pre>
  )
}
