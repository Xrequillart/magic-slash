'use client'

import { ToneCard } from '@/components/ui'
import { SECURITY_CARDS, SECURITY_CHROME, type SecurityArt } from '@/lib/security'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { CommitGuardArt, GdprArt, PrivateRepoArt, SecretsArt } from './SecurityArt'
import { HomeHeading, HomeSection } from './Shell'

/**
 * THE BAND AFTER "built for developers, and not only": what the product does and does not
 * do with your code, in four coloured cards.
 *
 * WHY IT IS HERE AND NOT EARLIER. Everything above this band is an argument that you
 * should hand a coding agent your repository and let it commit, push, review and merge —
 * which is, read coldly, a request for an unusual amount of trust. The objection that
 * follows is always the same, and it is never raised until the reader has understood the
 * offer: *what does this thing do with my code?* Put above the workflow band it would have
 * been an answer to a question nobody had asked yet; put below the FAQ it would have
 * arrived after the reader had already decided. Directly under the band that says who the
 * app is for is where that question actually forms.
 *
 * IT IS THE LAST BAND BEFORE THE FAQ, and the two are doing related jobs in the right
 * order: this one answers the objection everybody has, and `FaqSection` answers the five
 * that are specific to the reader. `app/(marketing)/page.tsx` holds the running argument
 * for the page's order.
 *
 * ── WHY THE COPY IS SHORT AND THE VERIFICATION IS LONG ────────────────────────────
 *
 * `lib/security.ts` records, card by card, which file each claim was checked against, and
 * its header sets out the two things this band deliberately does NOT say: "your code never
 * leaves your machine" (false — Claude Code sends it to Anthropic) and any statement of
 * compliance or hosting (the company's to make, not a landing page's). That is the file to
 * read before rewording anything here. A security band that overstates by one sentence is
 * worse for the product than no security band at all, because it is the one page a
 * sceptical reader will actually check.
 *
 * ── THE GRID ──────────────────────────────────────────────────────────────────────
 *
 * THREE COLUMNS, TWO CARDS A ROW: one card of two columns beside one of one, twice over.
 * That is the product owner's layout — "un card 2 block de longueur et un card 1 block de
 * longueur par ligne" — with the commit guard leading row one and the secrets table row two.
 * Four cards, two rows, and both fill exactly.
 *
 * WHY THE LONG SLOT GOES TO THOSE TWO and not by preference: they are the cards carrying a
 * WIDE drawing, and neither works narrow. A branch graph is a horizontal object, and a table
 * cropped at its right edge needs width to have something to crop. The padlock and the seal
 * are 128px objects that look the same at any card width.
 *
 * IT WAS THREE-THEN-TWO ON SIX COLUMNS, which was the owner's earlier brief back when the
 * band had three cards ("tout sur la même ligne") and then five. The same move that changed
 * the grid cut a card; `lib/security.ts` records which and what it cost.
 *
 * THE SPAN STARTS AT `lg`, AND IT SHIPPED AT `md` FIRST — which was wrong and worth
 * recording, because the arithmetic said it was fine. A third of the column at 860px is
 * 271px, leaving ~215px of measure inside `ToneCard`'s `p-7`, comfortably above the ~144px
 * `tailwind.config.ts` calls the floor. Rendered, the two SHORT cards ran their copy to
 * nine lines beside a long card running three, and the rows went tall and lopsided. The
 * floor tells you when type becomes unreadable, not when a row stops looking like a row.
 *
 * SO `md` IS TWO EQUAL COLUMNS, no spans, ~350px of measure each — and the long/short
 * rhythm waits for `lg`, where the long card has 725px and the short one 350px. One column
 * below `md`, where nothing is beside anything.
 *
 * THE SPAN IS ON THE `Reveal` AND NOT ON THE CARD, which is easy to get wrong and renders
 * as a grid that ignores every span: `Reveal` is a `div`, so IT is the grid item and the
 * card is its child. The same arrangement `WorkflowSection` and `BuiltForSection` use, and
 * the card takes `h-full` to fill whatever the row's tallest member settles on.
 *
 * `visual="center"` ON THREE OF THE FOUR, and it is the slot's own case: those drawings sit
 * complete in themselves and narrower than the space they are given, where `ToneCard`'s
 * default `end` is for a panel that runs off the card's edge. Its note puts it exactly:
 * "pinned to the bottom, an object leaves a pool of empty ground above it that reads as a
 * mistake rather than as air".
 *
 * THE FOURTH IS THE CROP, and it takes `end` for the mirror-image reason: the secrets table
 * is a panel cut by the card's bottom-right corner, and a crop centred in the leftover
 * height is a panel with a gap under it — which is not a crop at all. `crop` in
 * `lib/security.ts` is the flag, and `SecretsArt` holds the argument for the technique.
 *
 * NO BUTTON. The band above it closes on a link to `/cloud` and the band below opens the
 * FAQ; there is no security page to send anybody to, and a third button in three
 * consecutive bands is a page that cannot stop asking. If the claims here ever need
 * evidence a card cannot hold, the honest destination is a document and not a landing-page
 * section.
 */

/**
 * The four drawings, by the name `lib/security.ts` carries.
 *
 * THE MAP IS HERE AND THE NAMES ARE THERE, the arrangement `lib/commands.ts` documents:
 * that module must not import `lucide-react` or a component (the root vitest suite runs on
 * the root `node_modules`, and CI never installs `webapp/`'s dependencies), so it names a
 * drawing and whoever renders it resolves the name. The union makes this record exhaustive,
 * so a sixth card is a compile error here rather than a blank space on the page.
 *
 * `gdpr` IS THE ONE THAT TAKES AN ARGUMENT, which is why the values are elements rather
 * than components: the badge sets the regulation's acronym inside the European emblem, and
 * that acronym is the one string in the drawing that is not English in both languages.
 */
function art(id: SecurityArt, mark: string) {
  const DRAWING: Record<SecurityArt, React.ReactNode> = {
    privateRepo: <PrivateRepoArt />,
    gdpr: <GdprArt label={mark} />,
    commitGuard: <CommitGuardArt />,
    secrets: <SecretsArt />,
  }
  return DRAWING[id]
}

/**
 * The grid span, per card, as the two literal class lists the grid deals in.
 *
 * LITERAL AND NOT COMPUTED. Tailwind can only emit classes it can SEE in the source, so a
 * `lg:col-span-${n}` built from a number compiles to nothing at all and the card silently
 * takes one column of six. The same rule that keeps `Reveal`'s delay an inline style, and
 * the same table `WorkflowSection` keeps for the same reason.
 */
const SPAN = { wide: 'lg:col-span-2', short: '' } as const

export function SecuritySection() {
  const { t } = useT()

  return (
    <HomeSection>
      <Reveal order={1}>
        <HomeHeading
          title={t(SECURITY_CHROME.title)}
          subtitle={t(SECURITY_CHROME.subtitle)}
        />
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SECURITY_CARDS.map((card, index) => (
          <Reveal
            key={card.id}
            order={index + 2}
            className={`min-w-0 ${card.wide ? SPAN.wide : SPAN.short}`}
          >
            <ToneCard
              tone={card.tone}
              visual={card.crop ? 'end' : 'center'}
              title={t(card.title)}
              description={t(card.description)}
              className="h-full"
            >
              {art(card.id, t(SECURITY_CHROME.gdprMark))}
            </ToneCard>
          </Reveal>
        ))}
      </div>
    </HomeSection>
  )
}
