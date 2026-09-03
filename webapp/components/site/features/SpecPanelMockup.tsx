'use client'

import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { GithubIcon } from '../icons'

/**
 * The visual inside the `/magic:plan` card: the app's own spec panel, redrawn, CROPPED on
 * the right.
 *
 * DRAWN FROM THE REAL COMPONENT, not from an idea of it. Every measurement below is
 * lifted from `desktop/src/renderer/components/agent-info-sidebar/SpecPanel.tsx` and
 * `agent-info-sidebar/StatusPill.tsx`: the `rounded-xl` card, the `p-4` header, the
 * `mb-3` under its row, `gap-1.5` between the controls, the heading as
 * `text-sm font-medium text-ink/90 truncate`, the ticket as `text-xs font-semibold` next
 * to its provider mark, and the body behind a
 * `border-t` with its own `rounded-b-xl`. The pill and the expand button that sit beside
 * the ticket in the app are deliberately NOT drawn — see the note at the header row.
 *
 * TWO TOKENS HAD TO BE SUBSTITUTED, and they are the only liberties taken. The desktop app
 * runs its own Tailwind theme off CSS variables, and neither `surface` nor `line` exists in
 * this webapp's config — so the panel's ground is `white` and its rule is `hairline`.
 * Reaching for the real values would have meant hex literals in a component, which is
 * exactly the unfindable value `lib/designTokens.test.ts` exists to prevent.
 *
 * THE CONTENT IS THE REAL SPEC FORMAT too — `skills/magic-plan/references/spec-template.md`
 * §4, which is frozen: `# Spec — {idea title}`, then the Repository / Tracker / Created /
 * Status list, then `## Idea` and the idea as the user stated it. Only the idea's TITLE and
 * its first sentences go through the catalogues; the headings and field names stay English
 * in both languages because §3 of that template says they must ("the section headings stay
 * verbatim and in English"), so translating them here would have shown something the
 * product does not produce.
 *
 * CROPPED ON THE RIGHT rather than the bottom, unlike the start card's terminal. The spec
 * panel is a tall narrow column in the app — `SpecPanel`'s own widths are 500px, or 720px
 * while planning — and what a reader needs to recognise is its head: the repository, the
 * ticket, the status, and the first lines of the document. Cutting the right edge keeps
 * all of that and throws away the wrapping, which is the half that carries no meaning.
 *
 * AND IT SITS BESIDE THE COPY, not under it, because the `plan` card is a full row: the
 * card asks for that through `ToneCard`'s `layout="beside"` slot and this component knows
 * nothing about it. Which is the point — its own padding is symmetrical top and bottom
 * precisely so it reads correctly wherever the card decides to put it.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and its words paraphrase the card's
 * own description sitting directly above it.
 */

/** The two strings that are language rather than format. See the note above. */
const SPEC: { title: MessageKey; idea: MessageKey } = {
  title: 'site.planCard.specTitle',
  idea: 'site.planCard.specIdea',
}

export function SpecPanelMockup() {
  const { t } = useT()

  return (
    // `-mr-14` pulls the panel well past the card's right edge, which is the crop.
    // Nothing negative on the bottom: this one is cut on ONE side, so the card's own
    // ground still closes underneath it. `py-7` and not the asymmetric pair it had —
    // the card centres this now, so a heavier bottom inset would push it off centre.
    <div aria-hidden className="-mr-14 py-7 pl-7">
      {/* NO SHADOW. It carried `shadow-lift` and does not any more: the panel is not
          meant to hover over the card, it is meant to be the document lying in it.

          `bg-white`, AND THE GROUND IT SITS ON IS WHY. A panel has to clear its own
          CARD, not the page — and this card is `tone-mist`, which runs #E8F0FF to
          #F7FAFF. `canvas` (#F4F7FE) sits inside that range, so the panel and the card
          were the same colour and the filet was doing all the work. The two panels on
          dark cards go the other way and are `canvas`, because there pure white was the
          thing that read as a hole in the page. Same rule, opposite answer.

          `border-hairline` still holds the edge, and it is the house convention rather
          than a substitute invented here: `SURFACE` in `components/ui.tsx` is
          `rounded-2xl border border-black/5 bg-white`, so every unelevated white surface
          on this site wears a filet. The app's own panel has neither, because it sits on
          a darker ground than this card does.

          `min-w-96` (24rem) is the panel's own measure rather than the card's: the spec
          panel is a fixed column in the app (500px, or 720px while planning), so letting
          it shrink with the card would have made it look like a different component. */}
      <div className="min-w-96 rounded-xl border border-hairline bg-white">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            {/* The repository name is this card's heading in the app — the repository
                CARDS are gone for a planning agent, and which repository is being
                planned against is the one thing they said that was worth keeping. */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate text-sm font-medium text-ink/90">magic-slash</span>
            </div>

            {/* THE TICKET AND NOTHING ELSE. The real header carries three more
                controls to its right — `StatusPill` at `planned`, and a `Maximize2` that
                expands the document — and both are gone from this drawing.
                They were the two things in it that looked pressable, and a control that
                cannot be pressed is worse in a marketing illustration than an absent
                one: a reader who tries the chevron learns the picture is a picture.
                The ticket id is a fact, so it stays.

                `TicketMark` in the app, which draws the provider. The site already owns
                that mark — the footer and the documentation rail use it — so this is the
                same glyph rather than a second copy. */}
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">
              <GithubIcon size={12} />
              #142
            </span>
          </div>
        </div>

        {/* The document, behind the rule. `rounded-b-xl` so the body's own corner
            matches the card's — the app puts it here for the same reason. */}
        <div className="rounded-b-xl border-t border-hairline p-4">
          <p className="font-display text-sm font-bold text-ink">Spec — {t(SPEC.title)}</p>
          <ul className="mt-2 space-y-0.5 text-xs text-muted">
            <li>- Repository: magic-slash</li>
            <li>- Tracker: GitHub</li>
            <li>- Status: drafting</li>
          </ul>
          <p className="mt-3 font-display text-xs font-bold text-ink">Idea</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t(SPEC.idea)}</p>
        </div>
      </div>
    </div>
  )
}
