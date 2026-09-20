import type { AnimationEvent } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { X } from './icons'
import { Modal } from './Modal'
import { Text, TEXT_FACE, TEXT_WEIGHTS } from './Text'
import { WhatsNewArt } from './WhatsNewArt'

/**
 * WHAT THE VERSION YOU JUST INSTALLED BROUGHT — the dialog the app opens once, on the
 * first launch after an update.
 *
 * IT IS A CHANGELOG PAGE THE SIZE OF A DIALOG, and that is the whole of its typography:
 * the version and the day it shipped at the top, then the release's categories, each a
 * coloured dot and an uppercase label over a list of entries with a hanging indent and a
 * bold scope in front of them. Every one of those decisions is the public `/changelog`'s,
 * and it is worth naming why rather than inventing a second look: the two are the same
 * document. A person reads this after an update and reads that page when they want the
 * history, and a release that looked like two different things in two places is a release
 * you cannot recognise across them.
 *
 * THE PAGE FOLLOWS THE THEME AND THE COVER DOES NOT, and that line is the one decision
 * worth reading in this file.
 *
 * NONE OF IT USED TO. The band was a 2.4MB raster baked against a pale ground, and a
 * raster baked against a pale ground can only be shown on one — so the panel under it had
 * to be pale too, and a fixed white page with fixed near-black ink is what the WHOLE
 * dialog became, eight themes or not. `WhatsNewArt` is what unpicks that: it is two-tone
 * line work on `currentColor`, so what it is drawn on is now a choice rather than a
 * constraint.
 *
 * AND THE CHOICE IS SPLIT, because the two halves are different kinds of thing. Below the
 * band is a DOCUMENT — a release, typeset — and a document is read in the app's own
 * colours like every other page in it. The band is a PICTURE, and a picture is the one
 * part of a product that is allowed to be itself: it is `release-paper` with
 * `release-ink`, the white it was drawn on, and it does not move. Switch from `light` to
 * `midnight` and the page turns over underneath a cover that stays where it is.
 *
 * NOTHING PINS AND NOTHING SCROLLS INSIDE IT. The dialog is the height of its content,
 * which is what the missing footer makes possible: there was a "Got it" button holding
 * the bottom, a capped panel, and a scroller between them, and a page that scrolls behind
 * its own chrome stops reading like a page. The overflow moved out to the ground instead
 * — see `scrollableGround` on `Modal` — so a release long enough to pass the window
 * scrolls whole, behind the dim.
 *
 * THE CROSS IS THE WAY OUT, and it is the only control here. That is the point: nothing
 * in this dialog has to be DECIDED, so an accent button at the foot was an action where
 * there is no action — it said "confirm" about a page you had merely finished reading.
 * A cross says "close", which is the truth. Escape and a click on the ground still work,
 * both through `Modal`.
 *
 * SO THE NOTES ARRIVE PARSED. `categories`, each with its entries, is exactly the shape
 * `CHANGELOG.md` has and the shape the webapp's own changelog reads. Turning GitHub's
 * release HTML into it is the APP's job, in `WhatsNewModal.tsx`, next to the DOM parser
 * that was already there.
 *
 * AND THE DATE ARRIVES FORMATTED, for the reason every date in this folder does: "16
 * September 2026" and "16 septembre 2026" are one `toLocaleDateString` call with a locale
 * this component has no way to know.
 */

/** A category's colour, and the four are the changelog's own three plus the fallback. */
export type WhatsNewHue = 'green' | 'accent' | 'yellow' | 'neutral'

/**
 * A DOT AND NOT A TINTED WORD, which is the public changelog's own call and is worth
 * repeating here for the same reason it gives: a hue on a 10% wash of itself is 2:1
 * against the ground at 11px, and on this list the label is the only thing naming the
 * group — there is no mark beside it and no heading above it. So the DOT carries the
 * colour, which is what the eye scans by, and the LABEL is ink, which is what gets read.
 * A 6px dot is not text and is not held to a text contrast ratio.
 */
const DOTS: Record<WhatsNewHue, string> = {
  green: 'bg-green',
  accent: 'bg-accent',
  yellow: 'bg-yellow',
  /** A heading this build does not recognise. It still renders, under a neutral mark. */
  neutral: 'bg-ink/25',
}

/**
 * One line of the release.
 *
 * `scope` IS SPLIT OUT rather than left in the sentence, because the source has it split:
 * every entry in `CHANGELOG.md` opens `**Desktop**: …`, and a column of bold scopes is
 * what lets a reader find the three lines about the part of the app they care about
 * without reading the other twenty. Absent is a legitimate entry — a release note with no
 * scope is a sentence, and it is drawn as one.
 */
export interface WhatsNewEntry {
  scope?: string
  text: string
}

export interface WhatsNewCategory {
  /** Stable across renders — the heading's own text, not an index. */
  id: string
  /** "Added" / "Ajouts". Translated: this folder has no dictionary. */
  label: string
  hue: WhatsNewHue
  entries: WhatsNewEntry[]
}

export interface WhatsNewDialogProps {
  /**
   * THE HEADING — "What's New". Translated.
   *
   * It is the dialog's heading in the ordinary sense and in the accessible one: what
   * `aria-labelledby` points at. It sat on the band while the band was a coloured plate
   * with nothing in it; the band is a drawing now, so it opens the page instead, over the
   * version and the date it names.
   */
  title: string
  /**
   * The version, SPELLED BY THE CALLER — "v0.96.2". Verbatim, for the reason `Sidebar`'s
   * own version line and `UpdateDialog` both give: which prefix a version wears is not
   * this dialog's question.
   */
  version: string
  /**
   * The day it shipped, ALREADY FORMATTED — "16 September 2026". Optional, because a
   * release the app learned about from a source with no date is a real case, and a line
   * reading "Invalid Date" under the version is worse than no line.
   */
  date?: string
  /** The release, parsed. Empty draws the dialog as a band, a title and a version. */
  categories: WhatsNewCategory[]
  /**
   * The name of the cross. REQUIRED, and it is the accessible name of the only control
   * in the dialog — see `ButtonIcon`, which will not take a mark without one. Translated.
   */
  closeLabel: string
  /** What the cross, Escape and a click on the ground all call. */
  onClose: () => void
  /** The caller's enter and exit animation — see `Modal`, which owns neither. */
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Passed straight to `Modal` — see its note on why a drawing of the app needs it. */
  portalTo?: HTMLElement | null
}

export function WhatsNewDialog({
  title,
  version,
  date,
  categories,
  closeLabel,
  onClose,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: WhatsNewDialogProps) {
  return (
    <Modal
      labelledBy="whats-new-title"
      onClose={onClose}
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      // THE GROUND TAKES THE OVERFLOW, not this panel — see `Modal`. Which is what lets
      // the box be a plain `w-full max-w-xl` with no height in it at all: no `max-h`, no
      // flex column, no `min-h-0` under a scroller. The dialog is as tall as the release.
      //
      // `overflow-hidden` STAYS, and it is the one measurement left: the band is a
      // full-bleed plate and it paints square over the panel's own top corners without
      // it.
      scrollableGround
      className={`w-full max-w-xl overflow-hidden ${className}`.trim()}
    >
      {/* THE COVER, AND IT IS THE ONE THING HERE THAT DOES NOT MOVE. `relative` for the
          cross, which is the only thing in the dialog that floats rather than flows.

          `release-paper` AND `release-ink` — the fixed white and the fixed near-black,
          which is what the drawing was exported as and what it is kept on. It followed
          the theme for one commit and the reason to stop is that a cover is a PICTURE: it
          is the one part of this dialog that is not a document being typeset, and a
          picture that restated whichever of the eight grounds the app happens to be
          wearing is a picture saying nothing. The page under it still moves — that is the
          whole point of the split, and it is why the pair has to be spelled on this
          element rather than on the panel.

          `text-release-ink` IS THE DRAWING'S COLOUR, through `currentColor` — see
          `WhatsNewArt`. Full strength and not a wash: it is line work at about a quarter
          of a pixel per unit, and a 60% ink reads as a drawing that failed to load.

          THE HEIGHT IS THE BAND'S AND THE WIDTH FOLLOWS. `h-60` with `py-5` leaves the
          drawing 200px, a shade over the 160px the old raster was capped at — which it
          earns by being line work rather than a photograph. The art is `h-full w-auto`,
          so it is sized by what that padding leaves and centred in whatever width the
          dialog has. The other way round, with the width leading, the band would be 440px
          tall here, which is most of a window.

          THE PADDING IS THE WHOLE REASON THE BAND IS TALLER THAN THE DRAWING. Sized to
          fit exactly, the art's own box touches both edges — the sheet of paper at the
          top and the desk at the bottom land ON the seams, which reads as a picture that
          was cropped to fit rather than one that was placed. */}
      <div className="relative flex h-60 items-center justify-center bg-release-paper px-5 py-5">
        <WhatsNewArt aria-hidden className="h-full w-auto text-release-ink" />
        {/* `paper`, which is the tone `ButtonIcon` has for exactly this: a control on one
            of the app's fixed-light surfaces. The theme's own `text-icon` is mixed
            against the theme's ground, so on `midnight` a `neutral` or `ghost` cross here
            would be a pale mark on white — the one control in the dialog, invisible. This
            tone is mixed from `release-ink` instead, the same fixed near-black the
            drawing beside it is in. */}
        <div className="absolute right-3 top-3">
          <ButtonIcon icon={X} title={closeLabel} onClick={onClose} tone="paper" />
        </div>
      </div>

      <div className="px-5 pb-6 pt-5">
        {/* NOT A `Text`, AND THAT IS THE ONE DECISION WORTH READING HERE. `Text`'s ladder
            is `ComponentSize` — the same seven rungs `Button`, `Label` and `Status` stand
            on — and it tops out at `2xl`, which is 24px. That ladder is for type IN a
            row: a label beside a button, a title in a card. This is the one line that
            opens a page, and 30px is not a rung that ladder has any business growing for
            one call site.

            So the face and the weight come from the module and the SIZE is spelled here.
            Passing `text-3xl` to `Text`'s `className` would have been the other way to
            get it and it is the trap this folder warns about in five places: two
            utilities from one group on one element are settled by the order Tailwind
            emitted them in, not by the order they were written, so `text-2xl` and
            `text-3xl` would race and the winner would be whichever the scanner happened
            to write first.

            `black` is the heaviest of the four faces Cera Pro actually ships — see
            `Text`'s note, which measured them. `tracking-tight` because display type set
            at its natural tracking reads loose; every headline on the public site carries
            the same. */}
        <h2
          id="whats-new-title"
          className={`${TEXT_FACE} ${TEXT_WEIGHTS.black} text-3xl leading-tight tracking-tight text-ink`}
        >
          {title}
        </h2>

        {/* WHICH RELEASE THIS IS, ON ONE LINE. The changelog gives the number and the day
            a column of their own and pins it; a dialog is one screen, and under a heading
            that already says what the page is, two stacked lines of metadata are two
            lines of furniture. The separator is drawn here rather than folded into either
            string so that a release with no date is a version and nothing else. */}
        <Text size="xs" tone="secondary" className="mt-1.5 block">
          {date ? `${version} · ${date}` : version}
        </Text>

        {/* `gap-6` between categories against `gap-2` between entries: three groups of
            one-line items only read as three groups if the space between them is several
            times the space inside them. The changelog's own two numbers. */}
        {categories.length > 0 && (
          <div className="mt-6 flex flex-col gap-6">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[category.hue]}`}
                  />
                  {/* The shape of a LABEL rather than of a line of prose, which is what
                      keeps it from reading as the first entry of the list under it. The
                      quietest thing in the column, because it is the only thing there a
                      reader already knows. */}
                  <Text
                    size="xs"
                    tone="secondary"
                    weight="bold"
                    className="uppercase tracking-[0.08em]"
                  >
                    {category.label}
                  </Text>
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                  {category.entries.map((entry, index) => (
                    // Index is a legitimate key: this is one release's notes, parsed
                    // once, never reordered, inserted into or filtered.
                    <li key={index} className="flex gap-2.5">
                      {/* A DRAWN BULLET, not `list-disc`. The marker a browser draws sits
                          on the first line's baseline and is styled with the text, so a
                          wrapped entry hangs under its own bullet rather than beside it.
                          A flex row with a dot of its own gives the whole entry one
                          hanging indent, which is what a list of sentences this long
                          needs. `mt-[0.6em]` and not a pixel offset: the dot sits on the
                          CAP height of the line beside it, and that is a share of the
                          font size rather than a distance. */}
                      <span
                        aria-hidden
                        className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink/30"
                      />
                      {/* TWO `Text`s AND NOT ONE WITH A SPAN IN IT, because `Text` takes
                          a STRING — its own rule, and the reason a scope had to be a prop
                          rather than markup the caller passes in. Both render a `<span>`,
                          so they flow as one line and the scope keeps its own weight and
                          its own ink: `ink` against the sentence's `secondary`, so a
                          column of them can be scanned without reading the lines. */}
                      <span className="min-w-0 leading-relaxed">
                        {entry.scope && (
                          <Text size="sm" weight="bold" tone="ink">{`${entry.scope} : `}</Text>
                        )}
                        <Text size="sm" tone="secondary">
                          {entry.text}
                        </Text>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
