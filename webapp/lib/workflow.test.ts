import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MAGIC_COMMANDS } from './commands'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import {
  COMMAND_DESCRIPTIONS,
  WORKFLOW_CHROME,
  WORKFLOW_PATH,
  WORKFLOW_STEPS,
} from './workflow'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/workflow.ts` may import nothing but `./commands` and `./i18n` — see the note on
 * that file. THIS TEST EXISTING IS WHAT KEEPS THAT TRUE: add a `react`, a `next/*` or a
 * `lucide-react` import over there and this fails to RESOLVE rather than shipping a
 * bundle dragged into a list of five strings.
 *
 * The other half of its job is the one a type cannot do here. `tsc` never runs on
 * `webapp/` in CI (`.github/workflows/ci.yml` typechecks `desktop/` only), so the
 * `MessageKey` unions over there guarantee nothing — and `t()` has no per-key fallback, so
 * a key that does not exist renders as an EMPTY element rather than as an error. On a
 * coloured card that failure is a title with a hole under it, which looks like a design
 * decision. Every key is therefore looked up in both catalogues for real.
 *
 * Same shape and same reasoning as `faq.test.ts` and `changelogPage.test.ts` next door.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

describe('the workflow band and its page', () => {
  it('names keys the catalogues actually carry', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.workflow.planDesc", which does not say who wanted it. Here it
    // does.
    for (const key of Object.values(WORKFLOW_CHROME)) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }

    for (const step of WORKFLOW_STEPS) {
      expect(site(step.title), `en.${step.title} (${step.id})`).toBeTruthy()
      expect(siteFr(step.title), `fr.${step.title} (${step.id})`).toBeTruthy()
      expect(site(step.description), `en.${step.description} (${step.id})`).toBeTruthy()
      expect(siteFr(step.description), `fr.${step.description} (${step.id})`).toBeTruthy()
    }

    // The per-command descriptions the `/workflow` page prints under each step. These are
    // `/features`'s own keys, reached through this module's own copy of the table — see
    // the note on `COMMAND_DESCRIPTIONS` for why it is a copy — so a rename over there
    // fails here rather than emptying five rows on a page nobody was looking at.
    for (const [id, key] of Object.entries(COMMAND_DESCRIPTIONS)) {
      expect(site(key), `en.${key} (${id})`).toBeTruthy()
      expect(siteFr(key), `fr.${key} (${id})`).toBeTruthy()
    }
  })

  it('walks the eight commands in cycle order, and skips only `continue`', () => {
    // `MAGIC_COMMANDS` is in CYCLE order and that order IS the content (see its header),
    // so the five steps have to read the same way — a band that showed `commit` before
    // `start` would be describing a workflow nobody runs.
    //
    // AN EXACT LIST AND NOT A `toContain`, because the interesting failure is a command
    // that quietly stops being on the page. `continue` is absent on purpose — it is how
    // you re-enter a loop, not a stage of one — and that decision is worth a line here
    // precisely because it looks identical, in a diff, to having forgotten one.
    const covered = WORKFLOW_STEPS.flatMap((step) => step.commands)
    const cycle = MAGIC_COMMANDS.map((command) => command.id)

    expect(covered).toEqual(cycle.filter((id) => id !== 'continue'))
  })

  it('gives exactly one step the wide card', () => {
    // The grid is four-and-two then three twos. Two wide steps overflow the first row and
    // none of them leaves a hole in it, and both failures are a one-word edit away with
    // nothing on screen to argue with them.
    expect(WORKFLOW_STEPS.filter((step) => step.wide).map((step) => step.id)).toEqual(['plan'])
  })

  it('names a card ground that the design system actually declares', () => {
    // `WorkflowTone` is a union here and `CARD_TONES` is the authority over there, and
    // the two cannot be one type: `components/ui.tsx` imports React, so this module would
    // stop resolving in the root suite the moment it imported from it. Read as TEXT
    // instead — the same trick `features.test.ts` and `designTokens.test.ts` use on the
    // same file — so the duplication is checked rather than merely regretted.
    const ui = readFileSync(webapp('../components/ui.tsx'), 'utf8')

    for (const step of WORKFLOW_STEPS) {
      expect(ui, `${step.id} → tone "${step.tone}"`).toContain(
        `${step.tone}: { surface: 'bg-tone-${step.tone}'`,
      )
    }
  })

  it('keeps five different grounds under five different steps', () => {
    // The band's whole argument for naming a ground per card rather than cycling four
    // across them is that the colour says which step you are on. Two steps on one tone
    // would leave that argument standing with nothing behind it.
    const tones = WORKFLOW_STEPS.map((step) => step.tone)
    expect(new Set(tones).size).toBe(tones.length)
  })

  it('points its button at a route the public site owns and actually renders', () => {
    // THE TWO HALVES A BROKEN CTA NEEDS, and neither is visible in a diff on its own.
    //
    // `PUBLIC_PATHS` in `lib/hostRouting.ts` enumerates the paths the apex answers;
    // everything absent from it belongs to the app host. So a `/workflow` the band links
    // to but that list does not know about does not 404 on production — it 307s the
    // reader to a login form on `app.magic-slash.io`, and a landing page whose CTA
    // appears to sign you out is worse than one whose CTA is missing. Read as text for
    // the purity reason above: that module imports nothing, but this assertion is about
    // what the file SAYS, and a literal in a `Set` is not reachable any other way.
    const routing = readFileSync(webapp('./hostRouting.ts'), 'utf8')
    expect(routing, `${WORKFLOW_PATH} in PUBLIC_PATHS`).toContain(`'${WORKFLOW_PATH}',`)

    // And the route has to exist, which is the half `PUBLIC_PATHS` cannot check: a listed
    // path with no page behind it is a clean 404, which is honest and still a dead button
    // on the homepage. `existsSync` is what `features.test.ts` uses to pin a visual to a
    // component, and it is the same idea — the file, or the reason it is missing.
    expect(existsSync(webapp(`../app/(marketing)${WORKFLOW_PATH}/page.tsx`))).toBe(true)
  })
})
