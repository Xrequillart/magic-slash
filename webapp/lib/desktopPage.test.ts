import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AGENTS_POINTS,
  ALL_FEATURES_PATH,
  AROUND_CARDS,
  DESKTOP_BANDS,
  GUARDRAILS,
  SIDEBAR_TOUR,
  STATUS_STEP_TITLE,
  TASKS_POINTS,
  pick,
} from './desktopPage'
import { FEATURE_FAMILIES, isLiteralTitle } from './features'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'

/**
 * What `/desktop` says under its hero, pinned from the root suite — the shape
 * `skillsBand.test.ts` has, for the same reason: the components that render this cannot
 * be compiled here, so the data they render is what gets checked.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

/** Every catalogue key the page reaches, from its own family and from the rows it picks. */
function everyKey(): string[] {
  const keys: string[] = [STATUS_STEP_TITLE]
  for (const band of Object.values(DESKTOP_BANDS)) keys.push(band.title, band.subtitle)
  for (const point of [...TASKS_POINTS, ...AGENTS_POINTS]) keys.push(point.label)
  for (const feature of AROUND_CARDS) {
    if (!isLiteralTitle(feature.title)) keys.push(feature.title)
    keys.push(feature.description)
  }
  for (const step of SIDEBAR_TOUR) {
    if (step.kind === 'card') {
      if (!isLiteralTitle(step.feature.title)) keys.push(step.feature.title)
      keys.push(step.feature.description)
    } else if (step.kind === 'status') {
      keys.push(step.statusLabel, step.description)
    } else {
      keys.push(step.title, step.description)
    }
    keys.push(...step.points.map((point) => point.label))
  }
  for (const row of GUARDRAILS) keys.push(row.title, row.description)
  return keys
}

describe('the /desktop bands', () => {
  it('names keys the catalogues actually carry, in both languages', () => {
    for (const key of everyKey()) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }
  })

  it('opens no band on an eyebrow', () => {
    // The product owner cut the blue monospace labels from this page; a band's chrome is
    // a title and a subtitle and nothing above them.
    for (const band of Object.values(DESKTOP_BANDS)) {
      expect(Object.keys(band).sort()).toEqual(['subtitle', 'title'])
    }
    expect(Object.keys(marketingEn).filter((key) => /^site\.desktopPage\..*Eyebrow$/.test(key))).toEqual([])
  })

  it('shows no em dash anywhere on the page, in either language', () => {
    // The product owner's standing rule for site copy ("c'est typique de Claude Code, je
    // n'aime pas"): a sentence ends or a colon opens, an em dash does neither. It covers
    // every key the page reaches, the rows borrowed from `/features` included, and the
    // legend the Tasks window carries under itself.
    const legend = [
      'site.tasksCard.legendFiltersDesc',
      'site.tasksCard.legendFieldsDesc',
      'site.tasksCard.legendAvailableDesc',
      'site.tasksCard.legendTrackersDesc',
    ]
    for (const key of [...everyKey(), ...legend]) {
      expect(site(key), `en.${key}`).not.toContain('—')
      expect(siteFr(key), `fr.${key}`).not.toContain('—')
    }
  })

  it('makes three claims under each split band', () => {
    expect(TASKS_POINTS).toHaveLength(3)
    expect(AGENTS_POINTS).toHaveLength(3)
  })

  it('claims the agent count the inventory claims', () => {
    // `site.features.desktopDesc` spells the number out; so does the claim under the band.
    expect(site(AGENTS_POINTS[1].label)).toContain('twelve')
    expect(site('site.features.desktopDesc')).toContain('twelve')
  })

  it('tours the info sidebar in the panel’s own order, and walks the status forward', () => {
    const insights = FEATURE_FAMILIES.find((family) => family.id === 'insights')
    expect(insights).toBeDefined()
    for (const step of SIDEBAR_TOUR) {
      if (step.kind === 'card') expect(insights!.features).toContain(step.feature)
    }

    // The panel top to bottom, and each card's parts in the order the card stacks them.
    expect(SIDEBAR_TOUR.map((step) => step.part)).toEqual([
      'session',
      'ticket', 'ticketId', 'status', 'status', 'status', 'status',
      'repository', 'scripts', 'branches', 'files', 'commits',
      'pr', 'prChecks', 'prComments', 'prHeader',
    ])
    // The tour ends on a merged ticket.
    expect(SIDEBAR_TOUR[SIDEBAR_TOUR.length - 1].status).toBe('prMerged')

    // The status never goes backwards, and the PR card exists from "PR created" on.
    const order = ['inProgress', 'committed', 'prCreated', 'inReview', 'prMerged']
    let last = -1
    for (const step of SIDEBAR_TOUR) {
      const rank = order.indexOf(step.status)
      expect(rank, step.id).toBeGreaterThanOrEqual(last)
      last = rank
      expect(step.pr !== null, `${step.id} has a PR card`).toBe(rank >= order.indexOf('prCreated'))
    }
    expect(new Set(SIDEBAR_TOUR.map((step) => step.id)).size).toBe(SIDEBAR_TOUR.length)
  })

  it('gives every step three key points, each with a glyph of its own', () => {
    for (const step of SIDEBAR_TOUR) {
      expect(step.points, step.id).toHaveLength(3)
      expect(new Set(step.points.map((point) => point.icon)).size, step.id).toBe(3)
    }
  })

  it('keeps a status placeholder in the status heading, in both languages', () => {
    expect(site(STATUS_STEP_TITLE)).toContain('{status}')
    expect(siteFr(STATUS_STEP_TITLE)).toContain('{status}')
  })

  it('shows the desktop family’s showcase rows around the window', () => {
    for (const feature of AROUND_CARDS) {
      expect(feature.shape, feature.id).toBe('showcase')
    }
    expect(AROUND_CARDS).toHaveLength(4)
  })

  it('heads every guardrail with a catalogue key', () => {
    for (const row of GUARDRAILS) {
      expect(isLiteralTitle(row.title as never), row.id).toBe(false)
    }
    expect(new Set(GUARDRAILS.map((row) => row.id)).size).toBe(GUARDRAILS.length)
  })

  it('refuses a row the inventory does not declare', () => {
    expect(() => pick('desktop', 'nope')).toThrow(/does not declare/)
    expect(() => pick('nope', 'splitView')).toThrow(/does not declare/)
  })

  it('points its button at a route the public site owns, and at an anchor that exists', () => {
    const [path, anchor] = ALL_FEATURES_PATH.split('#')

    const routing = readFileSync(webapp('./hostRouting.ts'), 'utf8')
    expect(routing, `${path} in PUBLIC_PATHS`).toContain(`'${path}',`)

    expect(existsSync(webapp(`../app/(marketing)${path}/page.tsx`))).toBe(true)

    expect(FEATURE_FAMILIES.map((family) => family.anchor)).toContain(anchor)
  })
})
