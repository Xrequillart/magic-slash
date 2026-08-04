import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `marketing.css` carries most of its reasoning in prose, and a broken comment there fails
 * SILENTLY: a `*​/` that closes nothing does not stop the cascade, it makes the parser
 * swallow whatever follows until it can resync — which in practice means the next rule's
 * declarations vanish. Nothing else notices. `tsc`, ESLint and `next build` all pass, the
 * page renders, and one element is simply missing the styles it was written to have.
 *
 * That happened twice while the tilted app illustrations were being built, both times by
 * adding a paragraph to a doc comment and leaving its old `*​/` behind. Both times it was
 * found by measuring pixels in a browser, which is a slow way to learn about a typo.
 *
 * PostCSS does not help — it parses the file without throwing and hands back a rule whose
 * selector is `orphan text *​/\n.the-real-selector`. So this checks the delimiters directly,
 * with no dependency, which also keeps it inside what the root suite can resolve.
 */

const CSS = fileURLToPath(new URL('../app/(marketing)/marketing.css', import.meta.url))

/** Lines carrying a `*​/` that closes no comment, and whether one is left open at EOF. */
function scanComments(css: string) {
  const strayCloses: number[] = []
  let open: number | null = null
  let line = 1

  for (let i = 0; i < css.length; i++) {
    if (css[i] === '\n') {
      line += 1
      continue
    }
    const pair = css[i] + css[i + 1]
    if (open === null && pair === '/*') {
      open = line
      i += 1
    } else if (open !== null && pair === '*/') {
      open = null
      i += 1
    } else if (open === null && pair === '*/') {
      strayCloses.push(line)
      i += 1
    }
  }

  return { strayCloses, unterminatedAt: open }
}

describe('marketing.css', () => {
  it('has no comment that closes twice or never closes', () => {
    const { strayCloses, unterminatedAt } = scanComments(readFileSync(CSS, 'utf8'))

    expect(strayCloses, `\`*/\` closing nothing on line(s) ${strayCloses.join(', ')}`).toEqual([])
    expect(unterminatedAt, `comment opened on line ${unterminatedAt} never closes`).toBeNull()
  })
})
