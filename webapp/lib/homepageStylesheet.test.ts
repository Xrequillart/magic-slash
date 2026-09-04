import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Two LINT RULES wearing a test costume, in the shape `marketingCss.test.ts` and
 * `designTokens.test.ts` established: read the source as text, assert what it says.
 *
 * Both guard the same thing from two directions — that the homepage is genuinely OFF
 * `marketing.css` and stays off it — and both are here because breaking either fails
 * SILENTLY. `tsc`, ESLint and `next build` all pass either way, and the page still
 * renders: it just quietly goes back to being dressed by ~5,000 lines of the old static
 * site's stylesheet, which is the debt the rebuild paid off.
 *
 *   1. `app/(marketing)/layout.tsx` MUST NOT import `marketing.css`. One line re-adding
 *      it — a merge resolving the wrong way, someone fixing `/story` — hands every
 *      element on the homepage a second, older opinion about how it looks, and nothing
 *      announces it. That import's absence is acceptance criterion 3 of the rebuild.
 *
 *   2. NO `marketing.css` BUTTON CLASS may reappear on the homepage. That stylesheet
 *      holds eleven rival button definitions; the rebuild replaced all of them with the
 *      single `Button` / `ButtonLink` recipe in `components/ui.tsx`. A pasted
 *      `className="btn-get-started"` would look right — the class is still on disk — so
 *      this is the only thing standing between the homepage and a twelfth button.
 *      Acceptance criterion 4.
 *
 * NOTHING IMPORTS `marketing.css` ANY MORE, which is new and changes what rule 1 is
 * guarding. `app/(docs)/layout.tsx` was the last importer, and `/documentation` has been
 * deleted (`/faq` replaced it; see `lib/faq.test.ts`). The FILE stays on disk on purpose
 * and that is not sentiment: it defines the ~81 `mk-*` classes that dress
 * `components/site/home/AppMockup.tsx`, which issue #270 brings back scroll-driven and
 * has to bring the styling with it. `marketingCss.test.ts` still reads it. So the rule
 * is no longer "the homepage is off a stylesheet the docs still use" — it is "nothing is
 * on it, and the homepage least of all".
 *
 * TEXT, and only text. The root suite runs on the ROOT `node_modules` and CI never
 * installs `webapp/`'s dependencies, so nothing here may import `react`, `next/*`,
 * `lucide-react`, the Supabase client, or `tailwind.config.ts` — see the note in
 * `vitest.config.ts`. `node:fs` and `node:path` are what is left, and for a rule about
 * what the source SAYS they are also the honest tool.
 */

const WEBAPP = new URL('../', import.meta.url)
const path = (relative: string) => fileURLToPath(new URL(relative, WEBAPP))

const MARKETING_LAYOUT = path('app/(marketing)/layout.tsx')

/**
 * The homepage's own tree: the route, the six bands, and the chrome the layout wraps
 * them in.
 *
 * `components/site` is walked RECURSIVELY so a new band or a new shared control is
 * covered the day it is written, with ONE subtree cut out — and it is cut out because it
 * legitimately still uses these classes rather than to make the test pass:
 *   • `story/` — `/story` keeps its own `story.css`, which now carries the closing-CTA
 *     rules it used to borrow, `.btn-get-started` and `.cta-btn` among them. Those are
 *     in `StoryContent.tsx` on purpose.
 *
 * `documentation/` was the second, exempted while `app/(docs)/layout.tsx` was still
 * importing `marketing.css` for that page's typography. Both are deleted, so the
 * exemption went with them — and `faq/`, the tree that replaced it, is scanned like
 * every other.
 */
const EXCLUDED_SUBTREES = ['story']

const SCANNED_EXTENSIONS = ['.ts', '.tsx']

/**
 * Comments stripped, because BOTH rules below have a real false positive in prose.
 *
 * `SiteHeader.tsx`'s own header comment explains that `marketing.css` "hid
 * `.header-nav` and `.header-cta-btn` under 768px", and `app/(marketing)/layout.tsx`'s
 * says at length that `marketing.css` IS NO LONGER IMPORTED HERE. Both sentences exist
 * so the next reader understands the change; neither may fail the test that protects
 * it. A rule about what the code does has to read the code.
 *
 * The `(?<!:)` on the line-comment pattern keeps `https://…` whole — `links.ts` is
 * nothing but URLs, and truncating those lines at their `//` would be a quiet way to
 * stop scanning them.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/[^\n]*/g, '')
}

/** Every scanned file of the homepage tree, paired with its text, comments removed. */
function homepageSources(): [path: string, source: string][] {
  const files = [
    path('app/(marketing)/page.tsx'),
    ...readdirSync(path('components/site'), { recursive: true })
      .map(String)
      .filter((entry) => SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext)))
      .filter((entry) => !entry.split('/').some((part) => EXCLUDED_SUBTREES.includes(part)))
      .map((entry) => `${path('components/site')}/${entry}`),
  ]

  return files.map((file) => [file, stripComments(readFileSync(file, 'utf8'))])
}

/**
 * Whether a module imports `marketing.css`, however it spells the path.
 *
 * Side-effect form (`import '../(marketing)/marketing.css'`) is the one both layouts
 * use; the `from` branch and `require` are covered so a different spelling cannot slip
 * the rule.
 */
function importsMarketingCss(source: string): boolean {
  return /(?:import\s+(?:[^'"\n]*\bfrom\s*)?|require\s*\(\s*)['"][^'"]*marketing\.css['"]/.test(
    stripComments(source),
  )
}

/**
 * The eleven-way button pile from `marketing.css`, by name.
 *
 * MATCHED ON A BOUNDARY THAT TREATS `-` AS PART OF THE WORD, not as a `btn-` substring.
 * `AppMockup.tsx` is in the scanned tree (it is kept for #270 — see the note at the top
 * of that file) and it carries `mk-panel-btn--right`, which is one of ~81 `mk-*` class
 * names belonging to the animated mockup and is not a button recipe at all. A
 * `/btn-/`-style scan fails on it, and a `\b` boundary would let a hypothetical
 * `mk-status-btn` match `status-btn` for the same reason. So: no `-` and no word
 * character on either side.
 */
const MARKETING_BUTTON_CLASSES = [
  'btn-get-started',
  'btn-secondary',
  'cta-btn',
  'header-cta-btn',
  'stack-btn',
  'desktopapp-btn',
  'parallel-btn',
  'why-btn',
  'yourway-btn',
  'status-btn',
]

const BUTTON_CLASS_PATTERN = new RegExp(
  `(?<![-\\w])(?:${MARKETING_BUTTON_CLASSES.join('|')})(?![-\\w])`,
  'g',
)

describe('the homepage is off marketing.css', () => {
  it('does not import the stylesheet in the (marketing) layout', () => {
    expect(
      importsMarketingCss(readFileSync(MARKETING_LAYOUT, 'utf8')),
      '`app/(marketing)/layout.tsx` imports `marketing.css` again. The homepage is built on the design system (`components/ui.tsx` over the tokens in `tailwind.config.ts`); that stylesheet is the old static site and re-importing it dresses every element on the page a second time.',
    ).toBe(false)
  })

  it('would still notice an import if one came back', () => {
    /**
     * THE ASSERTION ABOVE IS A NEGATIVE, so it passes just as happily when the detector
     * is broken as when the code is right — a renamed file or a mangled pattern would
     * turn it green over a stylesheet that was right there.
     *
     * It used to be held up by the other half of a pair: `app/(docs)/layout.tsx` DID
     * import the file, and asserting that kept the pattern honest. `/documentation` is
     * deleted and nothing imports `marketing.css` any longer, so there is no real
     * importer left to point at — hence a synthetic one. Same tripwire, no page required.
     */
    expect(importsMarketingCss("import '../(marketing)/marketing.css'")).toBe(true)
    expect(importsMarketingCss("import styles from './marketing.css'")).toBe(true)
    expect(importsMarketingCss("require('../(marketing)/marketing.css')")).toBe(true)
    expect(importsMarketingCss("import './story.css'")).toBe(false)
  })

  it('uses none of the stylesheet’s button classes', () => {
    const sources = homepageSources()

    // A rule that scans nothing passes forever. This is the only assertion here whose
    // failure means the TEST broke rather than the code — `designTokens.test.ts` keeps
    // the same tripwire, for the same reason.
    expect(sources.length, 'nothing scanned — the homepage tree moved').toBeGreaterThan(15)

    const offenders = sources.flatMap(([file, source]) => {
      const found = [...new Set(source.match(BUTTON_CLASS_PATTERN) ?? [])]
      return found.length ? [`${file}: ${found.join(', ')}`] : []
    })

    expect(
      offenders,
      `marketing.css button class(es) back on the homepage:\n  ${offenders.join('\n  ')}\nUse \`Button\` / \`ButtonLink\` from \`components/ui.tsx\` — one recipe, four rungs — rather than a class from the stylesheet this page no longer loads.`,
    ).toEqual([])
  })
})
