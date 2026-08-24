import { useLayoutEffect, useRef } from 'react'
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
     Carries no data-diff on purpose: FilePreviewPanel's sweep walks .line[data-diff]
     to build the ruler and the navigator, and a separator is not a change to navigate
     to. Its label is written in by the layout effect above rather than by content:,
     because it is translated. */
  /* Taller than a line of code on purpose: this row is a seam between two regions of
     the file, and at code line-height it read as just another line. The padding is what
     gives it that weight — it is applied in the stylesheet, so it is already in place
     before anything measures the rows below it. */
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

export default function CodeView({ content, highlightedHtml, appearance = 'dark', blend = true }: Props) {
  const htmlRef = useRef<HTMLDivElement>(null)
  const t = useT()

  /**
   * Label the elision rows. That is now this component's ONLY layout-time job.
   *
   * It used to also measure the changed rows, report them upwards, and scroll the
   * container onto the first one. All three moved to FilePreviewPanel, because the
   * drawer stopped being about one file: N cards mount in the same commit, and N copies
   * of this effect would each resolve the SAME scroller and each write `scrollTop` into
   * it — the last card to mount would win, so where the reader landed would depend on
   * the order forty reads happened to resolve in. Measuring is now a single sweep from
   * the panel, which is also the only place that can group rows by the file they are in.
   *
   * Labelling has to stay HERE, and in a LAYOUT effect: the markers arrive empty from
   * the main process, where no interface language is bound, and the label is what gives
   * the row its height. React runs a child's layout effects before its parent's, so
   * every card's labels are written — and every row below them is at its final offset —
   * by the time the panel's sweep runs. That ordering is the whole reason the panel can
   * measure the cards without asking them anything.
   *
   * `t` IS a dependency: its identity changes with the interface language, and these
   * labels are written straight into the DOM, where nothing else would ever come back
   * to retranslate them.
   */
  useLayoutEffect(() => {
    const root = htmlRef.current
    if (!root) return

    for (const row of root.querySelectorAll<HTMLElement>('.line[data-elided]')) {
      row.textContent = t('filePreview.linesHidden', { count: Number(row.dataset.elided) })
    }
  }, [highlightedHtml, t])

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
