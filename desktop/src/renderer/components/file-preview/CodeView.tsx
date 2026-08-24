import { useLayoutEffect, useRef } from 'react'
import {
  countMarkerKinds, groupMarkerBlocks, selectScrollTop,
  type MarkerBlock, type MarkerCounts, type MarkerPosition,
} from '../../utils/diffMarkers'
import { useT } from '../../i18n'

interface Props {
  content: string
  highlightedHtml: string | null
  /**
   * Which appearance the HTML above was highlighted in — NOT the app's theme. The
   * two differ whenever the reader has pinned one in Settings, and everything this
   * component draws over the code (the line-number gutter, the +/- rails) has to
   * follow the CODE: a light theme's ink over a dark slab of code is the exact
   * unreadability this option exists to let people avoid.
   */
  appearance?: 'light' | 'dark'
  /**
   * Whether that appearance matches the interface's, in which case shiki's own
   * background is dropped and the code sits straight on the panel — one surface
   * instead of a slab floating in a drawer. Pinned the other way it is kept, since
   * it is then the only thing making the code legible.
   */
  blend?: boolean
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
   *
   * `counts` rides along for the change bar's summary: it comes off the same walk of
   * the same rows, and measuring the document twice for two numbers that are equal by
   * construction is how the two readouts would end up disagreeing.
   */
  onBlocksMeasured?: (blocks: MarkerBlock[], contextPx: number, counts: MarkerCounts) => void
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

/**
 * The chrome CodeView draws over shiki's output, per appearance.
 *
 * Fixed values rather than the app's theme tokens, deliberately: these sit ON the
 * highlighted code, so they belong to the code's palette, not the window's. They are
 * GitHub's own diff colours because the highlighting is GitHub's github-light /
 * github-dark — a second source of green would put two of them on one added line.
 */
interface CodeChrome {
  /** Line numbers, and the rule between them and the code. */
  gutter: string
  rule: string
  add: string
  addBg: string
  addRule: string
  remove: string
  removeBg: string
  removeRule: string
}

const CHROME: Record<'light' | 'dark', CodeChrome> = {
  dark: {
    gutter: 'rgba(255,255,255,0.18)',
    rule: 'rgba(255,255,255,0.07)',
    add: '#2ea043',
    addBg: 'rgba(46,160,67,0.15)',
    addRule: 'rgba(46,160,67,0.3)',
    remove: '#f85149',
    removeBg: 'rgba(248,81,73,0.15)',
    removeRule: 'rgba(248,81,73,0.3)',
  },
  light: {
    // Heavier than the dark theme's mirror image: 18% black on white reads as a
    // smudge where 18% white on near-black reads as a number.
    gutter: 'rgba(27,31,36,0.4)',
    rule: 'rgba(27,31,36,0.12)',
    add: '#1a7f37',
    addBg: 'rgba(74,194,107,0.18)',
    addRule: 'rgba(26,127,55,0.3)',
    remove: '#cf222e',
    removeBg: 'rgba(255,129,130,0.2)',
    removeRule: 'rgba(207,34,46,0.3)',
  },
}

function codeStyles(c: CodeChrome): string {
  return `
  .shiki code { white-space: normal; }

  .shiki code .line { display: block; white-space: pre; }

  /* The number comes off the ROW, not off a CSS counter.
     A counter counts the rows that were drawn, and the changes-only view drops
     whole regions of them — the gutter would then read 1, 2, 3… against a file
     whose lines are 1, 2, 3, 40, 41. data-line is stamped in the main process
     from the file itself and survives any elision. A row without the attribute
     (an elision marker) resolves attr() to the empty string, which leaves the
     gutter box drawn and blank — exactly what that row wants. */
  .shiki code .line::before {
    content: "\\00a0" attr(data-line);
    display: inline-block;
    width: 3rem;
    margin-right: 1.25rem;
    padding-right: 0.75rem;
    text-align: right;
    color: ${c.gutter};
    border-right: 1px solid ${c.rule};
    user-select: none;
    -webkit-user-select: none;
  }

  /* diff: added lines */
  .shiki code .line[data-diff="add"] {
    background-color: ${c.addBg};
    border-left: 2px solid ${c.add};
    margin-left: -1px;
  }
  .shiki code .line[data-diff="add"]::before {
    content: "+" attr(data-line);
    color: ${c.add};
    border-right-color: ${c.addRule};
  }

  /* diff: removed lines */
  .shiki code .line[data-diff="remove"] {
    background-color: ${c.removeBg};
    border-left: 2px solid ${c.remove};
    margin-left: -1px;
  }
  .shiki code .line[data-diff="remove"]::before {
    content: "-" attr(data-line);
    color: ${c.remove};
    border-right-color: ${c.removeRule};
  }

  /* Where the unchanged middle of the file was left out.
     Carries no data-diff on purpose: the measurement below walks
     .line[data-diff] to build the ruler and the navigator, and a separator is not
     a change to navigate to. Its label is written in by the layout effect rather
     than by content:, because it is translated. */
  /* Taller than a line of code on purpose: this row is a seam between two regions of
     the file, and at code line-height it read as just another line. The padding is what
     gives it that weight — it is applied in the stylesheet, so it is already in place
     when the layout effect measures the rows below it. */
  .shiki code .line[data-elided] {
    color: ${c.gutter};
    background-color: ${c.rule};
    font-style: italic;
    padding-top: 0.45rem;
    padding-bottom: 0.45rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    user-select: none;
    -webkit-user-select: none;
  }
`
}

/** Built once per appearance at module scope — a render must not assemble a stylesheet. */
const CODE_STYLES: Record<'light' | 'dark', string> = {
  dark: codeStyles(CHROME.dark),
  light: codeStyles(CHROME.light),
}

/** Lines of unchanged code kept above the first change, so it reads in context. */
const CONTEXT_LINES = 3

/** Only used if the first marked row measures zero, which layout should never give. */
const FALLBACK_LINE_HEIGHT = 18

export default function CodeView({ content, highlightedHtml, appearance = 'dark', blend = true, scrollSeq, onBlocksMeasured }: Props) {
  const htmlRef = useRef<HTMLDivElement>(null)
  const t = useT()

  // Opening a modified file at line 1 hides the very thing it was opened for, so the
  // panel is anchored on the first change instead. In a layout effect, before paint:
  // the reader must never see the top of the file and then a jump away from it.
  useLayoutEffect(() => {
    const root = htmlRef.current
    if (!root) return

    // The elision markers arrive empty from the main process — the HTML is built
    // there, where no interface language is bound — so their label is written here.
    //
    // BEFORE the measurement below, and in this same effect rather than one of its
    // own: the label is what gives the row its height, and a measurement taken over
    // rows that are still empty would put every block below the first elision a few
    // pixels off. The ruler and the navigator both read those numbers.
    for (const row of root.querySelectorAll<HTMLElement>('.line[data-elided]')) {
      row.textContent = t('filePreview.linesHidden', { count: Number(row.dataset.elided) })
    }

    const rows = [...root.querySelectorAll<HTMLElement>('.line[data-diff]')]
    // `annotateShikiHtml` only ever writes "add" or "remove", and the selector above
    // already excluded rows with no attribute at all; anything else is a row this
    // version does not know, and colouring it as an addition beats dropping it.
    const kindOf = (line: HTMLElement): MarkerPosition['kind'] =>
      line.dataset.diff === 'remove' ? 'remove' : 'add'

    const container = findScrollContainer(root)
    // No scrollable ancestor means no scrollable overflow: every change is already on
    // screen. The COUNTS are still worth reporting — the navigator is built to stand on
    // them alone, dropping its own arrows below two blocks — but the BLOCKS are not, and
    // that asymmetry is the decision rather than an oversight. Reporting them would put
    // up arrows that move nothing (`blockScrollTop` clamps every one to 0), leaving a
    // counter walking 1 → 2 → 3 over a view that never changes, which reads as a broken
    // button rather than as "already there"; it would also draw a ruler with nowhere to
    // send anyone. Passing no block is what makes both drop out on their existing rule.
    //
    // Collapsed to its changed regions, a big file with a small diff lands here as a
    // matter of course, so this path carries the summary for the common case — not just
    // for the short files it used to be about.
    if (!container) {
      onBlocksMeasured?.([], 0, countMarkerKinds(rows.map(line => ({ kind: kindOf(line) }))))
      return
    }

    const containerTop = cumulativeOffsetTop(container)
    const markers: MarkerPosition[] = rows.map(line => ({
      top: cumulativeOffsetTop(line) - containerTop,
      height: line.offsetHeight,
      kind: kindOf(line),
    }))

    const contextPx = CONTEXT_LINES * (markers[0]?.height || FALLBACK_LINE_HEIGHT)
    const blocks = groupMarkerBlocks(markers)
    // Reported before the scroll rather than after it, and from this one grouping:
    // measuring a second time for the navigator would mean two passes over the DOM
    // for numbers that are the same by construction.
    onBlocksMeasured?.(blocks, contextPx, countMarkerKinds(markers))

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
    //
    // `t` IS a dependency: its identity changes with the interface language, and the
    // elision labels above are written straight into the DOM, where nothing else
    // would ever come back to retranslate them.
  }, [highlightedHtml, scrollSeq, t])

  if (highlightedHtml) {
    return (
      <>
        <style>{CODE_STYLES[appearance]}</style>
        <div
          ref={htmlRef}
          /* `!bg-transparent` beats the background shiki writes as an INLINE style on
             its own `<pre>` — nothing but `!important` can. Dropping it is what lets
             the panel's own surface show through, so the preview reads as one card
             rather than as a code slab sitting in a drawer. */
          className={`text-sm [&>pre]:p-4 [&>pre]:min-h-full [&>pre]:font-mono [&>pre]:text-xs [&>pre]:leading-relaxed [&>pre]:overflow-auto ${blend ? '[&>pre]:!bg-transparent' : ''}`}
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
