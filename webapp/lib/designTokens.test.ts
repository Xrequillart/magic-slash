import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * This is a LINT RULE wearing a test costume, and it is here for the same reason
 * `marketingCss.test.ts` is: the thing it checks fails silently.
 *
 * A design system made of Tailwind classes has no compiler. Write
 * `shadow-[0_1px_2px_rgba(0,0,0,.06)]` at a call site and everything passes — `tsc`,
 * ESLint, `next build` — and the page renders. What you have lost is the ability to
 * retune the elevation of the product, because one button now carries a shadow
 * nobody will find again. Same for the button hierarchy: `primary` is the `brand`
 * fill and `secondary` is the white one, held in ONE recipe in
 * `components/ui.tsx`, and the way that gets undone is not a broken build but a
 * second hand-rolled button pasted into a page.
 *
 * So this reads the source as text and asserts:
 *   1. the elevation scale exists
 *   2. the surface rung arrives through a SLOT, so no element ends up wearing two
 *   3. primary is still the brand fill, secondary still white, both still elevated
 *   4. nowhere under `components/` or `app/` writes a shadow as an arbitrary value
 *   5. every shadow utility used there names a token that actually exists
 *
 * TEXT, deliberately. The root suite runs on the ROOT `node_modules` and CI never
 * installs `webapp/`'s dependencies, so no test here may import `react`, the Supabase
 * client, or the Tailwind config itself — see the note in `vitest.config.ts`. Reading
 * files is what is left, and for a rule about what the source SAYS it is also the
 * honest tool.
 *
 * The assertions are POSITIVE on purpose. "primary does not contain `bg-ink`" would
 * have passed for `bg-black`, for `bg-white`, for anything at all.
 */

const CONFIG = fileURLToPath(new URL('../tailwind.config.ts', import.meta.url))
const UI = fileURLToPath(new URL('../components/ui.tsx', import.meta.url))

/** The trees a design token can hide in. */
const TREES = ['../components', '../app'].map((dir) => fileURLToPath(new URL(dir, import.meta.url)))

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.css']

/**
 * Out of scope for the rebuild, and each one carries hand-tuned shadows that belong
 * to a page with its own stylesheet rather than to the app's token scale.
 */
const EXCLUDED_FILES = ['marketing.css', 'story.css', 'doc.css']

/** Tailwind's own `boxShadow` scale, which needs no declaration of ours. */
const BUILT_IN_SHADOWS = ['sm', 'md', 'lg', 'xl', '2xl', 'inner', 'none']

/**
 * Every `shadow-…` utility in a chunk of source, with its variants stripped.
 *
 * The lookbehind is what keeps `drop-shadow-xl` and the CSS `box-shadow` property
 * out: both contain the letters, neither is a `shadow-` utility. A variant prefix
 * (`hover:`, `disabled:`) ends in `:` and is allowed through.
 */
function shadowUtilities(source: string): string[] {
  return [...source.matchAll(/(?<![-\w])shadow-([A-Za-z0-9-]+(?:\/[\w.[\]]+)?)/g)].map((m) => m[1])
}

/**
 * The BODY of the object literal named `key`, whether it is a `const … = {` or a
 * `key: {` inside the Tailwind theme. Braces are counted, not parsed: a `${…}`
 * interpolation contributes one of each, so counting is enough — which is the
 * point, since this file may not import a parser.
 */
function objectLiteral(source: string, key: string): string {
  const at = source.search(new RegExp(`${key}\\s*[:=]\\s*\\{`))
  expect(at, `\`${key}\` not found — this test is reading the wrong file`).toBeGreaterThan(-1)

  const opening = source.indexOf('{', at)
  let depth = 0
  for (let i = opening; i < source.length; i++) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(opening + 1, i)
    }
  }
  throw new Error(`\`${key}\` is never closed in the source`)
}

/**
 * Keys of an object literal. Source ORDER is not load-bearing for any of them —
 * Tailwind emits the utilities sorted by class name, whatever order the config
 * declares — so these are read as a set. The anchored regex is its own comment
 * filter: a `//` or `*` line cannot start with a quote or a word character.
 */
function literalKeys(literal: string): string[] {
  return literal.split('\n').flatMap((line) => {
    const match = /^'?([A-Za-z0-9-]+)'?:/.exec(line.trim())
    return match ? [match[1]] : []
  })
}

/**
 * Every scanned file under the trees above, paired with its text — read ONCE, so
 * the two rules below cannot disagree about what they scanned.
 *
 * No `statSync` to weed out directories: the extension filter already does that,
 * and a directory somehow named `foo.tsx` would fail loudly on the read rather
 * than being skipped in silence.
 */
function scannedSources(): [path: string, source: string][] {
  return TREES.flatMap((root) =>
    readdirSync(root, { recursive: true })
      .map(String)
      .filter((entry) => SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext)))
      .filter((entry) => !entry.split('/').includes('node_modules'))
      .filter((entry) => !EXCLUDED_FILES.includes(entry.split('/').pop() ?? ''))
      .map((entry): [string, string] => {
        const path = `${root}/${entry}`
        return [path, readFileSync(path, 'utf8')]
      }),
  )
}

describe('design tokens', () => {
  const config = readFileSync(CONFIG, 'utf8')
  const declaredShadows = literalKeys(objectLiteral(config, 'boxShadow'))
  const knownShadows = [...BUILT_IN_SHADOWS, ...declaredShadows]
  const sources = scannedSources()

  it('declares the elevation scale in the Tailwind config', () => {
    expect(declaredShadows).toEqual(expect.arrayContaining(['button', 'button-hover', 'card', 'lift']))
  })

  /**
   * THE CARD TONES, held to the same rule as the shadows and for the same reason: a
   * `bg-[linear-gradient(135deg,#6366f1,#393BFF)]` at a call site renders perfectly,
   * passes `tsc`, ESLint and `next build`, and costs the ability to retune the family
   * — one card would carry a gradient nobody finds again.
   *
   * Two halves, and the second is the one that actually bites:
   *
   *   1. the four gradients are DECLARED in the config, so `bg-tone-*` resolves;
   *   2. every tone in `CARD_TONES` pairs its ground with the ink that can be read on
   *      it. That pairing is the whole point of the table — `text-ink` on `midnight`
   *      is invisible, and it renders, and nothing else here would catch it.
   */
  it('declares the four card tones in the Tailwind config', () => {
    const declaredTones = literalKeys(objectLiteral(config, 'TONES'))
    expect(declaredTones.sort()).toEqual([
      'tone-indigo',
      'tone-midnight',
      'tone-mint',
      'tone-mist',
      'tone-sky',
    ])
  })

  /**
   * THE PRODUCT PLATES, held to the same rule as the tones and for a sharper reason: the
   * five gradients here are somebody ELSE'S brand colours, and a borrowed colour pasted
   * at a call site is the one nobody dares retune later because nobody can tell whether
   * it was chosen or copied.
   *
   * Pinned as an exact set rather than a subset. A sixth plate is a sixth product, which
   * is a decision — it should not be possible to make it by adding a line to a config.
   */
  it('declares the five product plates in the Tailwind config', () => {
    const declaredPlates = literalKeys(objectLiteral(config, 'PLATES'))
    expect(declaredPlates.sort()).toEqual([
      'plate-claude',
      'plate-github',
      'plate-jira',
      'plate-magic',
      'plate-vscode',
    ])
  })

  it('keeps the plates out of the card tones, and the tones out of the plates', () => {
    // The two tables are two different KINDS of ground — a tone is a surface in a family
    // and cycles, a plate is a product's hue and is always named — and the failure this
    // guards is a plate landing in `CARD_TONE_CYCLE`, where a skill card would be dealt
    // the GitHub grey. Cheapest possible check: neither table may name the other's
    // prefix.
    const tones = literalKeys(objectLiteral(config, 'TONES'))
    const plates = literalKeys(objectLiteral(config, 'PLATES'))
    expect(tones.filter((key) => key.startsWith('plate-'))).toEqual([])
    expect(plates.filter((key) => key.startsWith('tone-'))).toEqual([])
  })

  it('gives every plate in the design system a ground the config declares', () => {
    // `PLATE_GROUNDS` in `components/ui.tsx` is what a call site names, and this config
    // is what makes those names resolve. A name in one and not the other paints a plate
    // with no ground: no error, no colour.
    const ui = readFileSync(UI, 'utf8')
    const grounds = objectLiteral(ui, 'PLATE_GROUNDS')
    const declaredPlates = literalKeys(objectLiteral(config, 'PLATES'))
    for (const plate of declaredPlates) {
      expect(grounds, `${plate} is declared but nothing names it`).toContain(`'bg-${plate}'`)
    }
  })

  it('pairs every card tone with an ink that can be read on it', () => {
    const ui = readFileSync(UI, 'utf8')
    const tones = objectLiteral(ui, 'CARD_TONES')

    // The two light grounds take the page's own ink; the two dark ones take white and
    // the declared white-on-dark body alpha. Written out rather than derived from the
    // source — deriving the expectation from the thing under test is how this stops
    // being a check.
    for (const [tone, ink] of [
      ['mist', 'text-ink'],
      ['sky', 'text-ink'],
      ['indigo', 'text-white'],
      ['midnight', 'text-white'],
      ['mint', 'text-ink'],
    ]) {
      const row = tones.split('\n').find((line) => line.trim().startsWith(`${tone}:`))
      expect(row, `CARD_TONES.${tone} is missing`).toBeTruthy()
      expect(row, `CARD_TONES.${tone}`).toContain(`bg-tone-${tone}`)
      expect(row, `CARD_TONES.${tone}`).toContain(ink)
    }

    // And the dark pair must not reach for `ink` at all, which is the mistake this
    // exists to prevent rather than merely to describe.
    for (const dark of ['indigo', 'midnight']) {
      const row = tones.split('\n').find((line) => line.trim().startsWith(`${dark}:`)) ?? ''
      expect(row, `CARD_TONES.${dark} must not use the light ink`).not.toContain('text-ink')
    }
  })

  /**
   * The rule that USED to live here asserted `lift` was declared last, on the belief
   * that Tailwind emits `boxShadow` utilities in the order of the keys, so the last
   * one wins on an element carrying two. It does not: the utilities come out sorted
   * by CLASS NAME (`npx tailwindcss -c` on a config whose last key is `aaalast`
   * emits `.shadow-aaalast` first). `shadow-lift` beat `shadow-card` only because
   * "lift" sorts after "card", and a future `shadow-airy` would have lost silently
   * with the suite green.
   *
   * So the invariant is not about order any more — it is that nothing ever wears two
   * rungs. `SURFACE` holds no shadow, and the one it used to hold arrives through
   * `Card`'s `shadow` slot, which SUBSTITUTES the class rather than appending a
   * rival to it. That is what this checks.
   */
  it('keeps the surface rung in a slot rather than in a race', () => {
    const ui = readFileSync(UI, 'utf8')

    const surface = /const SURFACE =\s*'([^']*)'/.exec(ui)?.[1]
    expect(surface, '`SURFACE` is no longer a single-quoted string').toBeTruthy()
    expect(
      shadowUtilities(surface ?? ''),
      '`SURFACE` bakes in a shadow again — a caller who wants another rung can now only append a rival to it, and which one wins is decided by Tailwind sorting the class names.',
    ).toEqual([])

    // The slot still defaults to the scale, so the ~35 surfaces that say nothing
    // keep their elevation. Without this, emptying `SURFACE` above would pass by
    // shipping unelevated cards.
    const fallback = /const SURFACE_SHADOW =\s*'([^']*)'/.exec(ui)?.[1]
    expect(fallback, "`SURFACE_SHADOW` is gone — `Card`'s slot has no default rung").toBeTruthy()
    expect(
      shadowUtilities(fallback ?? '').filter((shadow) => declaredShadows.includes(shadow)),
      '`SURFACE_SHADOW` no longer names a rung of the scale',
    ).not.toEqual([])
    expect(ui, "`Card` no longer defaults its `shadow` slot to `SURFACE_SHADOW`").toMatch(
      /shadow = SURFACE_SHADOW/,
    )
  })

  it('declares the button radius and the hairline the white button needs', () => {
    expect(literalKeys(objectLiteral(config, 'borderRadius'))).toContain('button')
    expect(config).toMatch(/^\s*hairline:/m)
  })

  it('keeps primary on the brand fill and secondary white, both elevated', () => {
    const variants = objectLiteral(readFileSync(UI, 'utf8'), 'BUTTON_VARIANTS')
    const recipe = (name: string) => new RegExp(`${name}:\\s*'([^']*)'`).exec(variants)?.[1]

    const primary = recipe('primary')
    const secondary = recipe('secondary')

    expect(primary, '`BUTTON_VARIANTS.primary` is no longer a single-quoted string').toBeTruthy()
    expect(secondary, '`BUTTON_VARIANTS.secondary` is no longer a single-quoted string').toBeTruthy()

    // The hierarchy reversed once — white was `primary` for an iteration — so both
    // ends are pinned here rather than just the loud one. Asserting only that
    // `primary` is blue would let the white recipe be deleted, and asserting only
    // that some variant is white would not notice the two swapping back.
    expect(primary).toContain('bg-brand')
    expect(primary).toContain('text-white')
    expect(secondary).toContain('bg-white')
    expect(secondary).toContain('border-hairline')

    // Neither may reserve the border only when it happens to be visible: a variant
    // whose box is 2px smaller than its neighbour's shifts the layout every time a
    // control toggles between them. `border` itself lives in `BUTTON_BASE`.
    expect(primary).toContain('border-transparent')

    // A shadow FROM THE SCALE, for both. `shadow-none` in the disabled recipe does
    // not count, and `shadow-elevated` would be a class that generates nothing at
    // all — the latter caught by the tree-wide rule below, which scans `ui.tsx` too.
    for (const [name, variant] of [
      ['primary', primary],
      ['secondary', secondary],
    ] as const) {
      const fromScale = shadowUtilities(variant ?? '').filter((shadow) => declaredShadows.includes(shadow))
      expect(fromScale, `\`${name}\` has no shadow from the elevation scale`).not.toEqual([])
    }
  })

  it('writes no shadow as an arbitrary value', () => {
    // A rule that scans nothing passes forever. This is the only assertion here
    // whose failure means the TEST broke rather than the code.
    expect(sources.length, 'nothing scanned — the trees moved').toBeGreaterThan(50)

    const offenders = sources.filter(([, source]) => /shadow-\[/.test(source)).map(([path]) => path)

    expect(
      offenders,
      `arbitrary shadow(s) in:\n  ${offenders.join('\n  ')}\nDeclare the value in tailwind.config.ts's \`boxShadow\` and use \`shadow-<token>\`.`,
    ).toEqual([])
  })

  it('uses no shadow utility that is not declared or built in', () => {
    const undeclared = new Set<string>()

    for (const [path, source] of sources) {
      for (const shadow of shadowUtilities(source)) {
        // `shadow-black/10`, `shadow-brand/[0.04]` — a shadow COLOUR, not a rung of
        // the scale. Those are documented non-CTA tints and stay.
        if (shadow.includes('/')) continue
        if (!knownShadows.includes(shadow)) undeclared.add(`${shadow} (${path})`)
      }
    }

    expect(
      [...undeclared],
      `shadow utilities naming nothing: ${[...undeclared].join(', ')}\nDeclare them in tailwind.config.ts's \`boxShadow\`.`,
    ).toEqual([])
  })
})
