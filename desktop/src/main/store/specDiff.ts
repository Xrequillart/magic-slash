/**
 * The line diff between two revisions of a spec, as the unified diff text `parseDiff`
 * (main/ipc/config-handlers.ts) already reads for a changed file — so a plan's history is
 * drawn by the same `CodeView` rows, rails and gutter as a file in a review.
 *
 * WRITTEN HERE RATHER THAN TAKEN FROM A PACKAGE. The app has no diff dependency and one
 * function does not justify adding one; a spec is markdown, compared line by line, which is
 * the textbook case.
 *
 * THE COMMON ENDS ARE TRIMMED FIRST, and on a spec that is nearly everything: a revision
 * rewrites a section and leaves the rest alone, so what reaches the O(ND) search below is
 * the rewritten section and nothing else.
 *
 * THE SEARCH IS CAPPED (`MAX_EDIT_DISTANCE`). Myers' algorithm costs O((N+M)·D) in time and,
 * as written here, O(D²) in memory to walk back, which is nothing for a revision and a lot
 * for two unrelated documents of a megabyte each. Past the cap the middle is reported as
 * removed wholesale and added wholesale: a correct diff, only not a minimal one — and for
 * two texts that far apart, the minimal one would not read any better.
 *
 * ONE HUNK, THE WHOLE DOCUMENT. `parseDiff` walks context lines as well as changes, and the
 * preview shows the full text with the changed regions marked (and collapses to them itself
 * — `annotateAgainstDiff`), so cutting the diff into hunks here would only be undone there.
 */

export interface SpecDiffOp {
  kind: 'equal' | 'remove' | 'add'
  text: string
}

/** Past this many inserted plus deleted lines in the middle, the search gives up. See above. */
export const MAX_EDIT_DISTANCE = 1500

/**
 * The shortest edit script from `a` to `b`, or null when it is longer than `maxD`.
 *
 * Myers' greedy forward search, keeping at each step `d` the furthest-reaching x on every
 * diagonal k it could reach — only the window [-d-1, d+1] of it, which is all the walk back
 * reads, and what keeps the memory at O(D²) rather than O(D·(N+M)).
 */
function shortestEdit(a: readonly string[], b: readonly string[], maxD: number): SpecDiffOp[] | null {
  const n = a.length
  const m = b.length
  // D is never below the length difference: past the cap already, skip the search.
  if (Math.abs(n - m) > maxD) return null
  const max = n + m
  const offset = max + 1
  const v = new Int32Array(2 * max + 3)
  const trace: Int32Array[] = []

  for (let d = 0; d <= Math.min(max, maxD); d++) {
    // The state BEFORE this step, over the diagonals this step reads from.
    trace.push(v.slice(offset - d - 1, offset + d + 2))
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
        ? v[offset + k + 1]
        : v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) { x++; y++ }
      v[offset + k] = x
      if (x >= n && y >= m) return walkBack(a, b, trace)
    }
  }
  return null
}

/** Rebuild the script from the recorded states, end to start. */
function walkBack(a: readonly string[], b: readonly string[], trace: Int32Array[]): SpecDiffOp[] {
  const ops: SpecDiffOp[] = []
  let x = a.length
  let y = b.length
  for (let d = trace.length - 1; d >= 0; d--) {
    const state = trace[d]
    // `state` starts at diagonal -d-1.
    const at = (k: number) => state[k + d + 1]
    const k = x - y
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1
    const prevX = at(prevK)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      ops.push({ kind: 'equal', text: a[x - 1] })
      x--
      y--
    }
    if (d > 0) {
      if (x === prevX) ops.push({ kind: 'add', text: b[y - 1] })
      else ops.push({ kind: 'remove', text: a[x - 1] })
    }
    x = prevX
    y = prevY
  }
  return ops.reverse()
}

/**
 * A text's lines. An empty text has none: `''.split('\n')` is `['']`, and that phantom blank
 * line would show the plan's first revision as deleting a line nobody wrote.
 */
function linesOf(text: string): string[] {
  return text === '' ? [] : text.split('\n')
}

/** The line-by-line edit script from `oldText` to `newText`. */
export function diffSpecLines(oldText: string, newText: string, maxD = MAX_EDIT_DISTANCE): SpecDiffOp[] {
  const a = linesOf(oldText)
  const b = linesOf(newText)

  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB-- }

  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)
  const middle = shortestEdit(midA, midB, maxD) ?? [
    ...midA.map((text) => ({ kind: 'remove' as const, text })),
    ...midB.map((text) => ({ kind: 'add' as const, text })),
  ]

  return [
    ...a.slice(0, start).map((text) => ({ kind: 'equal' as const, text })),
    ...middle,
    ...a.slice(endA).map((text) => ({ kind: 'equal' as const, text })),
  ]
}

/**
 * The unified diff `parseDiff` reads, and the two counts `DiffStat` draws.
 *
 * An empty old side starts at line 0, as git writes a new file's hunk. The new side always
 * starts at 1: `parseDiff` ignores every row until its new-line counter is set.
 */
export function unifiedSpecDiff(oldText: string, newText: string): { diff: string; additions: number; deletions: number } {
  const ops = diffSpecLines(oldText, newText)
  let additions = 0
  let deletions = 0
  let equal = 0
  const body = ops.map((op) => {
    if (op.kind === 'add') { additions++; return `+${op.text}` }
    if (op.kind === 'remove') { deletions++; return `-${op.text}` }
    equal++
    return ` ${op.text}`
  })
  const oldCount = equal + deletions
  const header = `@@ -${oldCount ? 1 : 0},${oldCount} +1,${equal + additions} @@`
  const diff = ['--- a/spec.md', '+++ b/spec.md', header, ...body].join('\n')
  return { diff, additions, deletions }
}
