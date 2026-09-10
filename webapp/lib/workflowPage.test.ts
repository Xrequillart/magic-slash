import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isLiteralTitle } from './features'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import { COMMAND_DESCRIPTIONS, WORKFLOW_STEPS } from './workflow'
import {
  ART_COPY,
  CONTROL_FACTS,
  DAY_FACTS,
  STEP_CLAIMS,
  WORKFLOW_BANDS,
  WORKFLOW_PAGE_CHROME,
  stepAnchor,
} from './workflowPage'

/**
 * What `/workflow` says around its five steps, pinned from the root suite. The shape and
 * the reasons are `desktopPage.test.ts`'s: `tsc` never runs on `webapp/` in CI, `t()` has
 * no per-key fallback, so every key the page reaches is looked up in both catalogues for
 * real, and the module under test may import nothing that would stop it resolving here.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

/** Every key the page prints, this module's and the steps' it borrows. */
function everyKey(): string[] {
  const keys: string[] = [
    ...Object.values(WORKFLOW_PAGE_CHROME),
    ...Object.values(ART_COPY),
    // The hero reuses the download call and the reassurance line the other product page
    // opens on, so a rename over there would empty a button here.
    'site.hero.downloadCta',
    'site.desktop.reassureFree',
    'site.desktop.reassureMac',
    'site.desktop.reassureTrackers',
  ]
  for (const band of Object.values(WORKFLOW_BANDS)) keys.push(band.title, band.subtitle)
  for (const step of WORKFLOW_STEPS) {
    keys.push(step.title, step.description)
    for (const claim of STEP_CLAIMS[step.id]) keys.push(claim.label)
  }
  for (const fact of [...DAY_FACTS, ...CONTROL_FACTS]) {
    if (!isLiteralTitle(fact.title)) keys.push(fact.title)
    keys.push(fact.description)
  }
  return keys
}

describe('the /workflow page', () => {
  it('names keys the catalogues actually carry', () => {
    for (const key of everyKey()) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }
  })

  it('shows no em dash anywhere on the page, in either language', () => {
    // The product owner's standing rule for site copy: a sentence ends or a colon opens,
    // an em dash does neither. It covers the steps' own sentences too, which the homepage
    // band shares, so a dash slipped into one of those fails here as well as there.
    for (const key of everyKey()) {
      expect(site(key), `en.${key}`).not.toContain('—')
      expect(siteFr(key), `fr.${key}`).not.toContain('—')
    }
  })

  it('names no command in its copy', () => {
    // The `/magic:…` strings are printed from `lib/commands.ts`, whose type makes a typo a
    // compile error. In a catalogue they would be strings nothing can check.
    for (const key of everyKey()) {
      expect(site(key), `en.${key}`).not.toContain('/magic:')
      expect(siteFr(key), `fr.${key}`).not.toContain('/magic:')
    }
  })

  it('does not print the per-command descriptions any more', () => {
    // The old page listed `site.commands.*` under each step; the claims replaced them, and
    // two of those descriptions carry an em dash the rule above would refuse. This pins
    // that the page reaches none of them, so nobody wires the table back in by habit.
    const used = new Set(everyKey())
    for (const key of Object.values(COMMAND_DESCRIPTIONS)) expect(used.has(key), key).toBe(false)
  })

  it('makes three claims under every step, and a claim for every step', () => {
    expect(Object.keys(STEP_CLAIMS).sort()).toEqual(WORKFLOW_STEPS.map((step) => step.id).sort())
    for (const step of WORKFLOW_STEPS) {
      expect(STEP_CLAIMS[step.id], step.id).toHaveLength(3)
    }
  })

  it('heads every fact with a catalogue key', () => {
    // A fact is a sentence, not a product name; a literal title here would mean a command
    // or a product had been filed as a fact about the loop.
    for (const fact of [...DAY_FACTS, ...CONTROL_FACTS]) {
      expect(isLiteralTitle(fact.title), fact.id).toBe(false)
    }
    const ids = [...DAY_FACTS, ...CONTROL_FACTS].map((fact) => fact.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names glyphs the page can actually draw', () => {
    // The claims and the facts name lucide icons as strings, resolved through
    // `desktop/icons.ts`. A name missing there is a `tsc` error only on a Vercel build, so
    // the map is read as TEXT here, the trick `desktopPage.test.ts` uses on the same file.
    const icons = readFileSync(webapp('../components/site/desktop/icons.ts'), 'utf8')

    for (const step of WORKFLOW_STEPS) {
      for (const claim of STEP_CLAIMS[step.id]) {
        expect(icons, `${claim.icon} imported`).toContain(`  ${claim.icon},\n`)
      }
    }
    for (const fact of [...DAY_FACTS, ...CONTROL_FACTS]) {
      expect(icons, `${fact.icon} imported`).toContain(`  ${fact.icon},\n`)
    }
  })

  it('anchors each step where the hero sends the reader', () => {
    // The rail and the secondary button link to `#step-{id}`, and the band carries the
    // same id through the same function, so the two cannot disagree. Pinned anyway, so a
    // refactor that spells one of them by hand shows up here.
    expect(stepAnchor('plan')).toBe('step-plan')
    const bands = readFileSync(webapp('../components/site/workflow/StepBand.tsx'), 'utf8')
    const hero = readFileSync(webapp('../components/site/workflow/WorkflowHero.tsx'), 'utf8')
    expect(bands).toContain('id={stepAnchor(step.id)}')
    expect(hero).toContain('stepAnchor(WORKFLOW_STEPS[0].id)')
  })

  it('names the trackers as chips, in both languages', () => {
    // The plan step's third claim carries `{jira}` and `{github}`, which `withChips`
    // (`components/site/home/AppSection.tsx`) turns into the tracker plates the homepage's
    // app band draws. A translation that spelled the names out instead would render as
    // plain words beside a row that draws marks, and nothing but this would say so.
    for (const catalogue of [site, siteFr]) {
      const claim = catalogue('site.workflowPage.planClaimTickets')
      expect(claim).toContain('{jira}')
      expect(claim).toContain('{github}')
    }
  })

  it('draws every control card', () => {
    // The cards' visuals are keyed by fact id in `ControlBand`. A fact added to
    // `CONTROL_FACTS` without an entry there renders no card at all, which is silent; this
    // is not.
    const band = readFileSync(webapp('../components/site/workflow/ControlBand.tsx'), 'utf8')
    for (const fact of CONTROL_FACTS) {
      expect(band, `${fact.id} in CARD`).toContain(`  ${fact.id}: {`)
    }
  })

  it('claims the agent count the inventory claims', () => {
    // The day band spells the parallel-agent figure out, as `/features` and `/desktop` do.
    expect(site('site.workflowPage.dayParallelDesc')).toContain('twelve')
    expect(site('site.features.desktopDesc')).toContain('twelve')
  })
})
