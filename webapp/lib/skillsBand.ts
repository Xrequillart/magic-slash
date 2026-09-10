import type { MessageKey } from './i18n'

/**
 * THE SKILLS BAND'S COPY — the homepage band that sits between "Working with Magic Slash"
 * and the app's own window: a heading, a paragraph, three claims and one button, beside a
 * terminal running the loop's seven commands.
 *
 * A MODULE RATHER THAN SIX KEYS TYPED INTO THE COMPONENT, on `lib/workflow.ts`'s and
 * `lib/faq.ts`'s shape. The band has ONE consumer, so the "two renderings drift" argument
 * those two make does not apply here — what does apply is the other one, and it is the
 * reason this file exists at all:
 *
 *   • `tsc` NEVER RUNS ON `webapp/` IN CI (`.github/workflows/ci.yml` typechecks
 *     `desktop/` only), so a `MessageKey` union spelled inside a component guarantees
 *     nothing at all. And `t()` has no per-key fallback: a key that does not exist renders
 *     as an EMPTY element rather than as an error, so a renamed catalogue entry would ship
 *     as a band with a headline and a hole under it, silently.
 *   • Named here, every key below goes through `skillsBand.test.ts`, which runs in the
 *     ROOT vitest suite and looks each one up in both catalogues for real.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n`, and that is a hard constraint rather than a
 * preference: the root suite runs on the ROOT `node_modules` and CI never installs
 * `webapp/`'s dependencies (see the note in `vitest.config.ts`). A `react`, `next/*` or
 * `lucide-react` import at any depth from here would not FAIL the test — it would fail to
 * RESOLVE it, which reads as a broken suite instead of a broken module. Which is why the
 * icons below are lucide NAMES and not components; the band resolves them through a map of
 * its own, beside the markup that renders them.
 *
 * NOT `lib/skills.ts`, and the two are easy to confuse. That file's `TRACKED_SKILLS` is
 * the TELEMETRY vocabulary — read by `/admin` and `components/SkillStats.tsx` to bucket
 * recorded skill hours — and it imports `./supabase`. This is marketing copy. The same
 * separation `lib/commands.ts` documents, and for the same reason: importing that one from
 * a public page would drag the auth SDK into the bundle of a page that authenticates
 * nobody.
 *
 * WHAT IS DELIBERATELY NOT IN HERE IS THE TRANSCRIPT. Every line the terminal beside this
 * copy prints is an English literal living in the drawing itself — a branch name, a commit
 * subject, a ticket transition — because those are strings the TOOL prints and translating
 * them would show output the product does not produce. `SkillsRunTerminal.tsx` holds that
 * rule and the seven rows it applies to.
 *
 * AND NO COMMAND NAME IS IN THE COPY EITHER, which is the same division the workflow
 * band's catalogue entries describe: `/magic:plan` and its seven siblings are printed by
 * the DRAWING, spelled from `lib/commands.ts`, whose template-literal type makes
 * `/magic:pln` a compile error. In a catalogue they would be eight strings a translator
 * can edit and nothing can check, and the site would eventually name a command the
 * product does not have.
 */

/** The band's own chrome, as catalogue keys. */
export const SKILLS_BAND_CHROME = {
  /** The band's `h2`. */
  title: 'site.skillsBand.title',
  /** The paragraph under it. */
  subtitle: 'site.skillsBand.subtitle',
  /** The button, which opens the inventory of all eight. */
  cta: 'site.skillsBand.cta',
} as const satisfies Record<string, MessageKey>

/**
 * The route the band's button opens: the eight commands, in the `/features` inventory.
 *
 * AN ANCHOR AND NOT A PAGE OF ITS OWN, and it is the homepage body's one DIRECT link to
 * that page's command list — the workflow band directly above goes via `/workflow`, which
 * links on to this same anchor, so the two buttons in adjacent bands are one hop apart
 * rather than duplicates. `app/(marketing)/page.tsx` holds the history of how thin the
 * page's links out have been.
 *
 * HERE RATHER THAN TYPED AT THE CALL SITE, for `WORKFLOW_PATH`'s reason: the path and
 * `PUBLIC_PATHS` in `lib/hostRouting.ts` disagreeing is not a broken link, it is a 307 to
 * a login form on `app.magic-slash.io` — worse than a 404, because the reader concludes
 * the site signed them out. `skillsBand.test.ts` reads that file and pins the pair.
 *
 * `#workflow` is the anchor `lib/features.ts` gives the commands family. The id is ours to
 * rename; an anchor is in whatever URL somebody shared, which is why that field is a
 * declared string over there and not derived from a title.
 */
export const SKILLS_BAND_PATH = '/features#workflow'

/** The lucide names the three claims use, as a union — so a resolver map cannot miss one. */
export type SkillsBandIcon = 'SquareTerminal' | 'GitMerge' | 'Sparkles'

/**
 * THE THREE CLAIMS, in the order they are read.
 *
 * THREE, AND THEY ARE THE THREE THE PRODUCT OWNER ASKED FOR: how many skills there are,
 * that they cover the whole implementation cycle, and that almost nothing is asked of you.
 * A fourth is the slot somebody would have to fill, which is how every cut band on this
 * page started (`app/(marketing)/page.tsx` keeps that history).
 *
 * THE ORDER IS AN ARGUMENT rather than a list: the first row is a fact you can count, the
 * second is the span it covers, and the third is what that leaves you doing. Read in
 * reverse it is a promise followed by its evidence, which is the weaker way round.
 *
 * THE THIRD ONE NAMES WHAT YOU DO KEEP, and that is deliberate. "Almost no human
 * interaction" is the brief and it would be the wrong sentence on the page: the product
 * stops for approval twice on purpose — the spec before any ticket is opened, the plan
 * before any code is written — and a band claiming otherwise would be promising something
 * `skills/magic-plan/SKILL.md` explicitly does not do. So the row says you approve the
 * plan and the rest runs itself, which is both the smaller claim and the true one.
 */
export const SKILLS_BAND_POINTS: readonly { icon: SkillsBandIcon; label: MessageKey }[] = [
  { icon: 'SquareTerminal', label: 'site.skillsBand.pointSkills' },
  { icon: 'GitMerge', label: 'site.skillsBand.pointCycle' },
  { icon: 'Sparkles', label: 'site.skillsBand.pointHands' },
]
