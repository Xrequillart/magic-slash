'use client'

import { ChevronRight } from 'lucide-react'
import { ButtonNavLink, ToneCard, type CardTone } from '@/components/ui'
import { PAGE_CHROME } from '@/lib/features'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { HomeHeading, HomeSection } from './Shell'
import {
  MacNativeArt,
  MakeItYoursArt,
  ShortcutsArt,
  SpotlightArt,
  TasksArt,
} from './BuiltForArt'

/**
 * The band under the app's own window: WHO THE APP IS FOR, in five coloured cards.
 *
 * WHY IT IS HERE, directly after `AppSection` and nowhere else. That band shows the
 * window — drawn faithfully, beside a paragraph about it — and a window is a thing a
 * reader looks at rather than a thing they are told about. (It showed it larger, with
 * four claims under it, until that composition moved to `/desktop`; the picture got
 * smaller and this band's reason for following it did not change.) What it cannot say
 * is what living in that window is LIKE: that the backlog is in it, that you never have
 * to touch the mouse, that it is a Mac app and not a browser in a frame, that it bends to
 * you, and that it comes to you from whatever you were doing. Five claims, one card each,
 * and every one of them is about the app the band above just showed. Put anywhere else on
 * the page they would be five features floating free of the thing they are features of.
 *
 * THE HEADLINE IS THE PRODUCT OWNER'S BRIEF, near enough verbatim: "un block qui parle de
 * l'application et le fait que ça soit build pour le developer mais pas que." The claim
 * is deliberately two-sided rather than one — a developer reads "built for developers"
 * and stops worrying about it being a toy; everyone else reads the second half and
 * discovers the page was talking to them too. Both halves matter, because this product's
 * buyer and this product's user are frequently not the same person, and the five cards
 * below are chosen to hold that line: Tasks and Spotlight are about the WORK, and
 * shortcuts, the Mac and the switches are about the CRAFT.
 *
 * ── THE GRID ──────────────────────────────────────────────────────────────────────
 *
 * Three columns at `lg`, and the layout is the owner's: Tasks two wide, keyboard
 * navigation beside it, then the Mac card, the switches and Spotlight across the bottom.
 * Two at `md`, where the wide card takes the whole row and the other four pair up
 * beneath it; one below that. `md:col-span-2` serves BOTH rungs — two of two at `md`,
 * two of three at `lg` — which is why there is only one span class in the file.
 *
 * THE SPAN IS ON THE `Reveal` AND NOT ON THE CARD, which is easy to get wrong and renders
 * as a grid that ignores it: `Reveal` is a `div`, so IT is the grid item and the card is
 * its child. The same arrangement `WorkflowSection` and `PillarsSection` use, and the
 * card takes `h-full` so it fills whatever the row's tallest member settles on.
 *
 * EVERY CARD IS `stacked`, INCLUDING THE WIDE ONE, and it was not always. Tasks shipped
 * `beside` — copy in a 24rem column, the window in the space left over — which is what
 * `ToneCardLayout` recommends for a card two columns across. The product owner moved it:
 * "mets la description en 100% en haut", with the window under it. What that buys is
 * written up in `TasksArt`, and the short version is that a side-by-side split left the
 * window about 330px wide, so its crop fell through the middle of every ROW instead of
 * past the end of the list. `beside` is still the right default for a wide card carrying a
 * small drawing; this card carries a screen.
 *
 * WHICH MAKES THE FIRST ROW TALL, and deliberately so. A full-width window plus its copy
 * runs to roughly 460px, and the grid stretches the keyboard card beside it to match —
 * which is why that card's sheet went from three rows to seven. The two changes arrived in
 * the same round and are the same change: the anchor card sets the height and its
 * neighbour has to have something to say for the whole of it.
 *
 * ── THE TONES ─────────────────────────────────────────────────────────────────────
 *
 * Not `CARD_TONE_CYCLE`, and that is a decision rather than an oversight. The cycle deals
 * four tones by POSITION, which is right for a grid whose cards mean nothing in
 * particular; two of these five have a ground their own drawing decided — the Mac card is
 * `midnight` because a glowing tile needs a dark night to glow into, and Tasks is `sky`
 * because a near-black window needs a saturated plate under it. A positional cycle would
 * have overwritten both. Each card names its tone.
 *
 * TASKS MOVED TO `sky` AND THE SWITCH FOLLOWED IT THERE, in two rounds, and the first is
 * the one with the reasoning in it. Tasks opened on `mist`, the palest tone, on the
 * argument that a light list reads best on almost-white — and then the product owner asked
 * for the app's real screen, in dark, which inverts the requirement completely:
 * `TasksModalMockup` says outright that "a near-black window dropped straight onto white
 * reads as a hole cut in the section", and `mist` is white with a hint. It uses
 * `tone-indigo` as its own plate on `/features` for that reason; `sky` is this band's
 * equivalent — saturated enough at its deep end to hold a dark window, light enough that
 * the four cards around it still read as one set.
 *
 * `mist` then went to the switch, and the owner has since asked for that card to take
 * Tasks' ground too. So TWO of the five are `sky` now, and they touch: Tasks spans the
 * first two columns of the top row and the switch sits under its right half. That is the
 * one place the "no two neighbours at the same weight" rule below is knowingly broken —
 * it buys a band that reads as one family rather than as five samples, and the two are
 * separated by the drawings on them, one a near-black window and the other a white knob on
 * a coloured track.
 *
 * "MAKE IT YOURS" WORE A NINTH TONE FOR A ROUND, and the round is worth recording because
 * the idea was the product owner's own and it worked. `flick` made the CARD answer its
 * switch — dark while on, light while off, with both ink tiers travelling so the type
 * stayed readable through the turn — on the argument that it was the one card here that
 * demonstrated its claim instead of stating it. They saw it and cut it: "retire le
 * changement de background sur À votre main". Not a bug, a volume decision — a card that
 * repaints itself twice every five seconds is louder than a grid of five wants, and the
 * switch is already the thing that moves. The tone, its three keyframes and the test that
 * pinned them are gone with it; `mist` is back, chosen for the reason it was first time.
 *
 * `rose` AND `lemon` GET THEIR FIRST USE HERE. `components/ui.tsx` declares eight tones
 * and says of those two that they are "grounds the palette offers and nothing names yet";
 * this band names them. They are the two cards with the least to prove — Spotlight and
 * the shortcut sheet, both of which are one small object on a large ground — which is the
 * right place for a colour to make its first appearance.
 *
 * WHAT THE ROWS READ AS: blue, warm / dark, blue, pink. The weights alternate everywhere
 * that matters — down the first column, where `sky` sits over `midnight`, and across both
 * rows — with the one exception the paragraph above names and accepts. That alternation is
 * the property `CARD_TONE_CYCLE` exists to guarantee, and it has had to be checked by hand
 * ever since the cycle was set aside.
 *
 * ── THE BUTTON ────────────────────────────────────────────────────────────────────
 *
 * The band closes on `/features`, and it is the page BODY's second link out there — the
 * workflow band's button opens `/workflow`, which links on to `/features#workflow`, one
 * hop further. This one is direct, which is what a reader who has just been shown five
 * features and told there are more actually wants.
 *
 * `variant="link"`, the rung added to `components/ui.tsx` for exactly this: a ghost's
 * shape carrying the brand blue. The owner asked for "un bouton ghost texte en bleu", and
 * a `className="text-brand"` on `variant="ghost"` would have been two colour utilities
 * racing in the emitted stylesheet — see that variant's own note.
 *
 * THE CHEVRON TRAILS, so it is a CHILD and not the `icon` prop. `Button`'s `icon` slot is
 * left-side only and deliberately so ("the only side it goes on, so that a column of
 * buttons has its glyphs on one axis"); a glyph that points at where the link goes belongs
 * after the label, and the base is a flex row with a `gap-2`, so a child renders exactly
 * where it should. `ProfileWizard`'s trailing chevron is the precedent.
 *
 * THE LABEL IS `site.nav.allFeatures`, the string the header bar and the footer already
 * use for this destination. A third wording for one page is how a site ends up calling
 * the same place three things.
 */

/** The five cards, in the order the owner laid them out. */
const CARDS: readonly {
  id: string
  tone: CardTone
  title: MessageKey
  description: MessageKey
  /** The two-column card. See THE GRID above. */
  wide?: true
  /**
   * Centre the drawing in the height the copy leaves, instead of pinning it to the
   * bottom edge. For the two cards whose visual is a complete OBJECT rather than a
   * cropped panel — the switch and the Quick Launch bar. See `ToneCardVisual` in
   * `components/ui.tsx`.
   */
  centred?: true
  Art: () => React.JSX.Element
}[] = [
  {
    id: 'tasks',
    tone: 'sky',
    title: 'site.builtFor.tasksTitle',
    description: 'site.builtFor.tasksDesc',
    wide: true,
    Art: TasksArt,
  },
  {
    id: 'shortcuts',
    tone: 'lemon',
    title: 'site.builtFor.shortcutsTitle',
    description: 'site.builtFor.shortcutsDesc',
    Art: ShortcutsArt,
  },
  {
    id: 'mac',
    tone: 'midnight',
    title: 'site.builtFor.macTitle',
    description: 'site.builtFor.macDesc',
    Art: MacNativeArt,
  },
  {
    id: 'yours',
    // THE SAME GROUND AS TASKS, at the product owner's request — "peux-tu prendre pour la
    // card À votre main le même thème que tasks". It was `mist`, the palest tone, chosen
    // so the track's flick to full `brand` had near-white to land against; `sky` is a step
    // more saturated, so the switch reads a little quieter and the band a little more of a
    // piece. That is the trade, and it was the owner's to make.
    tone: 'sky',
    title: 'site.builtFor.yoursTitle',
    description: 'site.builtFor.yoursDesc',
    centred: true,
    Art: MakeItYoursArt,
  },
  {
    id: 'spotlight',
    tone: 'rose',
    title: 'site.builtFor.spotlightTitle',
    description: 'site.builtFor.spotlightDesc',
    centred: true,
    Art: SpotlightArt,
  },
]

export function BuiltForSection() {
  const { t } = useT()

  return (
    <HomeSection>
      <Reveal order={1}>
        {/* `titleKey` AND NOT `title`: the headline strikes "developers" through, so it
            carries an `<em>` and has to be RENDERED rather than translated into a string.
            See `HomeHeading` and `STRUCK_WORD` in `Shell.tsx`. */}
        <HomeHeading titleKey="site.builtFor.title" subtitle={t('site.builtFor.subtitle')} />
      </Reveal>

      {/* `grid-cols-1` AND `min-w-0` ARE BOTH LOAD-BEARING, and neither is decoration.
          The Tasks panel is `min-w-[28rem]` on purpose — that is what gives the card's
          right edge something to crop — and a grid track sized `auto` grows to its
          content's MINIMUM, so on a phone a bare `grid` would have widened this column to
          448px and taken the document with it. `grid-cols-1` makes the track
          `minmax(0, 1fr)`, which is capped by the container; `min-w-0` does the same for
          the item inside it, whose automatic minimum in a grid is otherwise its
          min-content. With both, the panel is clipped by `ToneCard`'s `overflow-hidden`
          rather than pushing the page sideways. */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, index) => (
          <Reveal
            key={card.id}
            order={index + 2}
            className={`min-w-0 ${card.wide ? 'md:col-span-2' : ''}`}
          >
            <ToneCard
              tone={card.tone}
              visual={card.centred ? 'center' : 'end'}
              title={t(card.title)}
              description={t(card.description)}
              className="h-full"
            >
              <card.Art />
            </ToneCard>
          </Reveal>
        ))}
      </div>

      {/* CENTRED UNDER THE GRID rather than set beside the heading, which is where the
          workflow band puts its own button. Two bands with a button on the same top-right
          corner read as one band repeating; and this one is a FOOTER by intent — the
          owner asked for it "en footer de ce block" — so it lands after the reader has
          seen all five cards rather than before. */}
      <Reveal order={CARDS.length + 2} className="mt-12 flex justify-center">
        <ButtonNavLink href="/features" variant="link" size="lg">
          {t(PAGE_CHROME.allFeatures)}
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </ButtonNavLink>
      </Reveal>
    </HomeSection>
  )
}
