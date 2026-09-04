'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { MAGIC_COMMANDS, type MagicCommandId } from '@/lib/commands'
import { useT } from '@/lib/i18n/useLanguage'
import { COMMAND_DESCRIPTIONS, WORKFLOW_CHROME, WORKFLOW_STEPS } from '@/lib/workflow'
import { Bloom } from '../home/HeroSection'
import { HomeSection } from '../home/Shell'

/**
 * The whole of `/workflow`: the same five steps the homepage's band draws as cards, set
 * out as rows with the commands each one runs.
 *
 * WHY THE PAGE EXISTS AT ALL, given that the band above it already lists the five. The
 * band is a POSTER — five cards, one sentence each, a drawing apiece — and it is placed
 * where a reader is still deciding whether this product is for them. What it cannot hold
 * is the next question, which is "yes, but what do I actually type": eight commands, seven
 * of them in these five steps, each with its own job. That is a reference, and a reference
 * on a landing page is the band that everybody scrolls past.
 *
 * SO THE SPLIT IS BY DEPTH AND NOT BY CONTENT. Both surfaces read `WORKFLOW_STEPS` from
 * `lib/workflow.ts` — the same order, the same titles, the same descriptions, so a reader
 * arriving here from the band's button finds the thing they clicked rather than a
 * rewrite of it — and this page adds the layer the cards have no room for: the commands.
 * `site.commands.*` is where those descriptions come from, which is `/features`'s own
 * copy for the same eight rows. Reused rather than rewritten, because two descriptions of
 * one command is one description that goes stale.
 *
 * ── WHAT THIS PAGE IS NOT, YET ────────────────────────────────────────────────────
 *
 * IT IS THE HONEST MINIMUM AND IT IS SAID OUT LOUD HERE so nobody mistakes it for a
 * finished page. The band's CTA needed a route on the day the band shipped — a button
 * pointing at a path `PUBLIC_PATHS` does not list 307s the reader to a login form
 * (`lib/hostRouting.ts`, and `workflow.test.ts` pins both halves) — so this page is the
 * five steps and their commands, well set, and nothing more. What a full version of it
 * would add, in the order the value is:
 *
 *   • THE DRAWINGS, one per step. `components/site/home/WorkflowArt.tsx` has five, and
 *     they are deliberately NOT here: every one of them is drawn to be cropped by a
 *     coloured card's edge, and a cropped drawing in the middle of a text column reads as
 *     a rendering bug. They would need a frame of their own, which is a design question
 *     and not a copy-paste.
 *   • ONE WORKED EXAMPLE running through all five, with the real terminal output at each
 *     step — the thing a developer actually wants and the thing this page cannot fake.
 *   • `/magic:continue`, which has no step because it is not one (see `lib/workflow.ts`)
 *     and which a page about living with the tool does owe a paragraph.
 *
 * NO SIDEBAR AND NO ANCHORS, unlike `/features`. Five rows fit on two screens; a rail to
 * navigate five things is furniture.
 */

/**
 * The command ids, in cycle order, as a lookup — so a step's `commands` can be resolved
 * to what you type without this file spelling a single `/magic:…` literal.
 *
 * `lib/commands.ts` owns the spelling and its template-literal type is what makes a typo
 * a compile error instead of a command on a public page that does not exist. Same
 * arrangement as `WorkflowArt.tsx`'s own lookup; both exist because that module is the
 * authority and neither of them should be a second one.
 */
const COMMAND = Object.fromEntries(MAGIC_COMMANDS.map((c) => [c.id, c.command])) as Record<
  MagicCommandId,
  string
>

export function WorkflowContent() {
  const { t } = useT()

  return (
    // WHITE, not `canvas`, like `/faq`, `/features` and `/changelog`: the `(marketing)`
    // layout deliberately paints no ground, so whichever page owns one paints its own.
    <div className="bg-white">
      {/* `/faq`'s opening band verbatim — `padding="hero"` because the bar is `fixed` at
          `h-16` and a page's first line owes it that, the `softblue → white` wash, and
          `Bloom` fading `to-white` so the band lands on the ground below instead of
          leaving a blue-grey step at its bottom edge. */}
      <HomeSection
        padding="hero"
        backdrop={<Bloom fadeTo="to-white" />}
        className="bg-gradient-to-b from-softblue to-white"
      >
        <div className="mx-auto max-w-3xl text-center">
          {/* THE BAND'S `h2` IS THIS PAGE'S `h1`, from the same key. A reader who
              followed the button should land on the words they pressed — the one thing a
              landing page's CTA can get wrong that nothing else on the page can. */}
          <h1 className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl">
            {t(WORKFLOW_CHROME.title)}
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/60">
            {t(WORKFLOW_CHROME.subtitle)}
          </p>
        </div>
      </HomeSection>

      <HomeSection padding="follow">
        {/* NARROWER THAN THE PAGE'S COLUMN, on `/faq`'s measure and for its reason: 48rem
            is ~75 characters, which is where a paragraph stops needing the eye to travel
            back to find the next line. `max-w-site` is 1100px and would set these
            descriptions across all of it. */}
        <ol className="mx-auto flex max-w-3xl flex-col gap-14">
          {WORKFLOW_STEPS.map((step, index) => (
            <li key={step.id} className="flex gap-5 sm:gap-7">
              {/* THE NUMBER, which is the one thing this page has that the band does not
                  need: cards in a grid are ordered by where they sit, and a column of
                  rows is ordered by nothing unless it says so. A tinted disc rather than
                  a bare figure — `accent` because this is a decorative tile and not a
                  control, the split `tailwind.config.ts` spends its longest note on. */}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-sm font-semibold text-accent">
                {index + 1}
              </span>

              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold leading-tight text-ink">
                  {t(step.title)}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-ink/60">{t(step.description)}</p>

                {/* THE COMMANDS, which is the layer the card had no room for: what you
                    type, and what it does — `/features`'s own description of the same
                    row, reached through `COMMAND_DESCRIPTIONS`.

                    NO PROSE NAME BESIDE THE COMMAND, and it was there for one round.
                    `commandLabel` in `lib/features.ts` turns `/magic:plan` into "Plan",
                    which heads the card over there — but over there the command is the
                    card's SUBTITLE, so the name is doing the work. Here the command is
                    already the row's first word, and "/magic:plan  Plan" is the same
                    word twice. Dropping it also drops this page's only reason to import
                    the 1,100-line inventory, which is the import `lib/workflow.ts` went
                    out of its way not to need. */}
                <ul className="mt-5 flex flex-col gap-4 border-l border-hairline pl-5">
                  {step.commands.map((id) => (
                    <li key={id}>
                      {/* The monospace slash-command signature — `Eyebrow`'s type, and
                          the through-line across every page on this site. */}
                      <code className="font-mono text-sm font-medium tracking-tight text-brand">
                        {COMMAND[id]}
                      </code>
                      <p className="mt-1 text-sm leading-relaxed text-ink/55">
                        {t(COMMAND_DESCRIPTIONS[id])}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        {/* THE WAY ON, and it is `/features` rather than a download: a reader who has just
            read what the eight commands do is asking what else the app has, not whether
            to install it — the page ends on `FinalCtaSection` for that. `#workflow` is
            the anchor those same eight live under over there, so the link lands on the
            inventory of the thing this page just described.

            The same shape `/faq` closes on: one grey line, one link beside it. */}
        <div className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 border-t border-hairline pt-8 text-sm">
          <span className="text-ink/60">{t(WORKFLOW_CHROME.more)}</span>
          {/* `next/link` and not a bare anchor: same origin, and every other internal
              link on this site is one. See `ButtonNavLink` in `components/ui.tsx`. */}
          <Link
            href="/features#workflow"
            className="inline-flex items-center gap-1 font-medium text-brand transition-colors hover:text-accent"
          >
            /features
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </HomeSection>
    </div>
  )
}
