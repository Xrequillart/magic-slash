import { describe, it, expect } from 'vitest'
import {
  computeVisibleRanges, countShikiRows, numberShikiLines, renderRows, splitShikiLines,
  type Range,
} from './hunkView'

/** Shiki's shape for a file of `count` lines, each holding its own number as text. */
function shiki(count: number): string {
  const rows = Array.from({ length: count }, (_, i) => `<span class="line">line ${i + 1}</span>`)
  return `<pre class="shiki" style="background-color:#0d1117"><code>${rows.join('\n')}</code></pre>`
}

/** A row as `annotateShikiHtml` injects one for a deletion: old number, new-file anchor. */
function removedRow(oldLine: number, anchor: number): string {
  return `<span class="line" data-line="${oldLine}" data-anchor="${anchor}" data-diff="remove">gone</span>`
}

/** The whole document, as the caller hands it over: numbered, then taken apart. */
function documentOf(html: string) {
  return splitShikiLines(numberShikiLines(html))
}

/**
 * The gutter, read back off the rendered document: the number every surviving row
 * carries, in document order. Elision markers are left out — they have their own
 * helper below, and they show no number.
 */
function renderedLines(html: string): string[] {
  return [...html.matchAll(/<span class="line"([^>]*)>/g)]
    .filter(([, attrs]) => !/ data-elided=/.test(attrs))
    .map(([, attrs]) => attrs.match(/ data-line="(\d+)"/)?.[1] ?? '?')
}

/** How many file lines each elision marker announces, in document order. */
function elisionCounts(html: string): number[] {
  return [...html.matchAll(/ data-elided="(\d+)"/g)].map(([, n]) => parseInt(n, 10))
}

describe('splitShikiLines', () => {
  it('takes a document apart into pieces that join back into the original', () => {
    const html = shiki(4)
    const { prefix, lines, suffix } = splitShikiLines(html)
    expect(lines).toHaveLength(4)
    expect(prefix + lines.join('') + suffix).toBe(html)
  })

  it('keeps the closing tags out of the last row, so dropping it does not close the document', () => {
    const { lines, suffix } = splitShikiLines(shiki(3))
    expect(suffix).toBe('</code></pre>')
    expect(lines[2]).not.toContain('</code>')
  })

  it('reports no rows for a document that has none', () => {
    expect(splitShikiLines('<pre><code></code></pre>').lines).toEqual([])
  })
})

describe('numberShikiLines', () => {
  it('gives every row the file line it is, so the gutter can read it back', () => {
    expect(renderedLines(numberShikiLines(shiki(3)))).toEqual(['1', '2', '3'])
  })

  it('leaves the highlighted content alone', () => {
    expect(numberShikiLines(shiki(2))).toContain('>line 2</span>')
  })
})

describe('countShikiRows', () => {
  it('counts the rows of a document without taking it apart', () => {
    expect(countShikiRows(shiki(7))).toBe(7)
    expect(countShikiRows(numberShikiLines(shiki(7)))).toBe(7)
  })

  it('reports none for a document that has none', () => {
    expect(countShikiRows('<pre><code></code></pre>')).toBe(0)
  })
})

describe('computeVisibleRanges', () => {
  it('keeps a few lines of unchanged code on either side of a change', () => {
    expect(computeVisibleRanges([20], 100, 4)).toEqual([{ start: 16, end: 24 }])
  })

  it('folds two changes close together into one region rather than two', () => {
    // 10 reaches 14, 16 starts at 12 — they overlap, and a reader sees one change.
    expect(computeVisibleRanges([10, 16], 100, 4)).toEqual([{ start: 6, end: 20 }])
  })

  it('folds regions that merely touch, so no marker claims zero lines were hidden', () => {
    // 10 reaches 14 and 19 starts at 15: nothing at all sits between them.
    expect(computeVisibleRanges([10, 19], 100, 4)).toEqual([{ start: 6, end: 23 }])
  })

  it('leaves two regions apart when real code sits between them', () => {
    expect(computeVisibleRanges([10, 40], 100, 4)).toEqual([
      { start: 6, end: 14 },
      { start: 36, end: 44 },
    ])
  })

  it('stops the context at the first line of the file rather than before it', () => {
    expect(computeVisibleRanges([2], 100, 4)).toEqual([{ start: 1, end: 6 }])
  })

  it('stops the context at the last line of the file rather than past it', () => {
    expect(computeVisibleRanges([98], 100, 4)).toEqual([{ start: 94, end: 100 }])
  })

  it('collapses nothing when every line of the file changed', () => {
    // An added, untracked or deleted file: the regions would cover the document, so
    // the reader gets today's rendering rather than a card with one useless marker.
    expect(computeVisibleRanges([1, 2, 3, 4, 5], 5, 4)).toBeNull()
  })

  it('collapses nothing when the context alone already covers the file', () => {
    expect(computeVisibleRanges([5], 8, 4)).toBeNull()
  })

  it('collapses nothing when the file has no change at all', () => {
    expect(computeVisibleRanges([], 100, 4)).toBeNull()
  })

  it('pulls a change past the end of the file back to the last line', () => {
    // Lines deleted at the very end are anchored one past the file's last line.
    expect(computeVisibleRanges([101], 100, 4)).toEqual([{ start: 97, end: 100 }])
  })

  it('ignores a position too far past the end for its context to reach the file', () => {
    expect(computeVisibleRanges([200], 100, 4)).toBeNull()
  })
})

describe('renderRows', () => {
  /** Render `html` (already annotated) against `ranges`, over a file of `total` lines. */
  function render(html: string, ranges: Range[], total: number): string {
    return renderRows(documentOf(html), ranges, total)
  }

  it('keeps only the lines inside a region, with their own file numbers', () => {
    expect(renderedLines(render(shiki(20), [{ start: 8, end: 12 }], 20)))
      .toEqual(['8', '9', '10', '11', '12'])
  })

  it('numbers the gutter across an elision, rather than counting the rows it drew', () => {
    // Line 40 must still say 40 after 30 lines were left out above it.
    const kept = renderedLines(render(shiki(60), [{ start: 1, end: 5 }, { start: 38, end: 42 }], 60))
    expect(kept).toEqual(['1', '2', '3', '4', '5', '38', '39', '40', '41', '42'])
  })

  it('says how many lines each cut hid — before, between and after the regions', () => {
    const html = render(shiki(60), [{ start: 10, end: 12 }, { start: 30, end: 32 }], 60)
    // 1–9 above, 13–29 between, 33–60 below.
    expect(elisionCounts(html)).toEqual([9, 17, 28])
  })

  it('marks no cut where a region starts at the first line or ends at the last', () => {
    const html = render(shiki(20), [{ start: 1, end: 4 }, { start: 17, end: 20 }], 20)
    expect(elisionCounts(html)).toEqual([12])
  })

  it('leaves the document opening and closing tags intact', () => {
    const html = render(shiki(20), [{ start: 8, end: 9 }], 20)
    expect(html.startsWith('<pre class="shiki"')).toBe(true)
    expect(html.endsWith('</code></pre>')).toBe(true)
  })

  it('keeps a deleted line by where it sits now, not by the old number in its gutter', () => {
    // The removed row shows line 400 of the old file but belongs before line 10 of
    // the new one. Filtering on the number in the gutter would drop it.
    const doc = documentOf(shiki(20))
    doc.lines.splice(9, 0, removedRow(400, 10))
    const html = renderRows(doc, [{ start: 8, end: 12 }], 20)
    expect(html).toContain('data-anchor="10"')
    expect(renderedLines(html)).toEqual(['8', '9', '400', '10', '11', '12'])
  })

  it('drops a deleted line whose region was left out, wherever its old number points', () => {
    const doc = documentOf(shiki(20))
    doc.lines.splice(1, 0, removedRow(9, 2))
    const html = renderRows(doc, [{ start: 15, end: 18 }], 20)
    expect(html).not.toContain('data-anchor="2"')
  })

  it('keeps lines deleted at the very end of the file, which sit past its last line', () => {
    // `annotateShikiHtml` appends these after the last row, anchored at 21 for a
    // 20-line file — no region can contain that, so they are clamped into the last.
    const doc = documentOf(shiki(20))
    doc.lines.push(removedRow(21, 21), removedRow(22, 21))
    const html = renderRows(doc, [{ start: 17, end: 20 }], 20)
    expect(renderedLines(html)).toEqual(['17', '18', '19', '20', '21', '22'])
    expect(elisionCounts(html)).toEqual([16])
  })
})
