import type { AnimationEvent } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Text, TEXT_FACE, TEXT_WEIGHTS } from './Text'

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
 * WHAT IT REPLACED: a 2.4MB illustration filling the top of the panel, a hand-rolled
 * close button on a `bg-black/30` square in its corner, a raw `BTN_PRIMARY` string at the
 * bottom, and the release notes injected as HTML and dressed by nine
 * `.whats-new-content` rules in the app's stylesheet. Three of those four are components
 * now — `ButtonIcon`, `Button`, `Text` — and the fourth is this component's own markup,
 * because a dialog whose body is `dangerouslySetInnerHTML` cannot be in a design system:
 * there is nothing to type and nothing to compose.
 *
 * SO THE NOTES ARRIVE PARSED. `categories`, each with its entries, is exactly the shape
 * `CHANGELOG.md` has and the shape the webapp's own changelog reads. Turning GitHub's
 * release HTML into it is the APP's job, in `WhatsNewModal.tsx`, next to the DOM parser
 * that was already there.
 *
 * AND THE DATE ARRIVES FORMATTED, for the reason every date in this folder does: "16
 * September 2026" and "16 septembre 2026" are one `toLocaleDateString` call with a locale
 * this component has no way to know.
 *
 * IT IS THE ONE SURFACE IN THE APP THAT IGNORES THE THEME, and that is the whole reason
 * it has tokens of its own. The band is the site's `tone-sky` — the ground `/features`
 * sets the context card on, declared as `bg-release-mesh` — and the panel under it is
 * `release-paper` with `release-ink`: a white page with near-black type, which is what the
 * public `/changelog` is. A release read on `midnight` and the same release read on
 * `light` are the same document, so they are printed the same way. The three configs'
 * notes say the rest.
 *
 * TWO THINGS INSIDE IT STILL FOLLOW THE THEME, deliberately: the category dots and the
 * one button. Those are where colour carries MEANING rather than surface — they are the
 * app's own green, accent and yellow — and all of them are saturated enough to read on
 * white under every theme.
 *
 * ONE WAY OUT AND NOT TWO. There was a close button in the corner of the band, and it is
 * gone: nothing here has to be decided, nothing is lost by reading on, and a cross on a
 * dialog whose only action is "Got it" was a second answer to a question with one. Escape
 * and a click on the ground still work — both are the app's, through `Modal`.
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
   * THE COVER'S ONE WORD — "What's New". Translated.
   *
   * It is the dialog's heading, in the ordinary sense and in the accessible one: the band
   * was a picture with nothing in it, so the first thing a reader met was a version
   * number with no sentence saying what it was doing on their screen. This is that
   * sentence, and it is what `aria-labelledby` points at.
   *
   * IT IS THE SAME EVERY TIME, which is exactly why it belongs on the cover rather than
   * in the body: what CHANGES — the version, the date, the notes — is underneath, and a
   * cover is the one place a fixed word earns its space.
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
  /** The release, parsed. Empty draws the dialog with nothing between the date and the button. */
  categories: WhatsNewCategory[]
  /** The word on the one button. Translated. */
  confirmLabel: string
  /** What the button, Escape and a click on the ground all call. */
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
  confirmLabel,
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
      // `overflow-hidden` is what makes the band meet the panel's own top corners: it is
      // a full-bleed rectangle, and without it the mesh paints square over them.
      // `max-h-[85vh]` with the scroll on the BODY and not here, so the band and the
      // button stay put while a long release scrolls between them.
      className={`mx-4 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden ${className}`.trim()}
    >
      {/* THE COVER. 160px, the height the illustration it replaces was capped at, so the
          dialog opens at the proportion people already know. `shrink-0` because it is a
          sibling of a scroller in a flex column, and a fixed height in that position is a
          suggestion without it.

          NOT A `Text`, AND THAT IS THE ONE DECISION WORTH READING HERE. `Text`'s ladder is
          `ComponentSize` — the same seven rungs `Button`, `Label` and `Status` stand on —
          and it tops out at `2xl`, which is 24px. That ladder is for type IN a row: a
          label beside a button, a title in a card. This is DISPLAY type, the one line on a
          cover with nothing beside it to be in step with, and 36px is simply not a rung
          that ladder has any business growing for one call site.
          
          So the face and the weight come from the module and the SIZE is spelled here.
          Passing `text-4xl` to `Text`'s `className` would have been the other way to get
          it and it is the trap this folder warns about in five places: two utilities from
          one group on one element are settled by the order Tailwind emitted them in, not
          by the order they were written, so `text-2xl` and `text-4xl` would race and the
          winner would be whichever the scanner happened to write first.

          `black` is the heaviest of the four faces Cera Pro actually ships — see `Text`'s
          note, which measured them: there are four names for four drawings, not eight for
          four. `tracking-tight` because display type set at its natural tracking reads
          loose; every headline on the public site carries the same.

          `release-ink` AND NOT THE THEME'S: the mesh is a fixed light ground, so the type
          on it is the fixed dark one, exactly as the page below it is. */}
      <div className="flex h-40 shrink-0 items-center justify-center bg-release-mesh px-5">
        <h2
          id="whats-new-title"
          className={`${TEXT_FACE} ${TEXT_WEIGHTS.black} text-center text-4xl leading-tight tracking-tight text-release-ink`}
        >
          {title}
        </h2>
      </div>

      {/* THE BODY, and it is the one thing here that scrolls. `min-h-0` is what makes
          `overflow-y-auto` real in a flex column: a flex child defaults to its content's
          minimum size, so without it a long release pushes the button off the bottom
          instead of scrolling under it. */}
      {/* THE PAPER IS ON THE BODY AND THE FOOT, not on `Modal`'s panel, and that is a
          mechanical reason rather than a taste one: the panel already carries
          `bg-bg-secondary`, and two background utilities on one element are settled by the
          order Tailwind emitted them in — not by the order they were written. The band,
          this and the foot tile the panel completely, so the theme's ground is never seen.

          `text-release-ink` HERE AND `tone="inherit"` ON EVERY `Text` BELOW: one colour
          declared once, and the four strengths spelled as opacity on the elements that
          want them. `Text`'s own `ink` and `secondary` are theme tokens and would each be
          a second answer to what colour this page is. */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-release-paper px-5 pb-5 pt-5 text-release-ink">
        {/* WHICH RELEASE THIS IS — the number, then the day it shipped. The changelog
            gives this pair a column of its own and pins it; a dialog is one screen, so
            here it is simply the first two lines under the cover. */}
        <Text size="lg" weight="bold" tone="inherit">
          {version}
        </Text>
        {date && (
          <Text size="xs" tone="inherit" className="mt-1 block opacity-60">
            {date}
          </Text>
        )}

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
                    tone="inherit"
                    weight="bold"
                    className="uppercase tracking-[0.08em] opacity-50"
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
                        className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-release-ink/30"
                      />
                      {/* TWO `Text`s AND NOT ONE WITH A SPAN IN IT, because `Text` takes
                          a STRING — its own rule, and the reason a scope had to be a prop
                          rather than markup the caller passes in. Both render a `<span>`,
                          so they flow as one line and the scope keeps its own weight and
                          its own ink: full strength against the sentence's secondary, so
                          a column of them can be scanned without reading the lines. */}
                      <span className="min-w-0 leading-relaxed">
                        {entry.scope && (
                          <Text size="sm" weight="bold" tone="inherit">{`${entry.scope} : `}</Text>
                        )}
                        <Text size="sm" tone="inherit" className="opacity-70">
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

      {/* THE ONE ACTION, CENTRED AND AT THE TOP RUNG. It was `lg` at the right edge,
          which is where a dialog puts the last of several buttons — and there are not
          several. A single button aligned right reads as the survivor of a row; centred
          at `2xl` it reads as the thing the dialog is asking you to do, which is the one
          case `Button`'s own note says that rung is for.

          `accent`, and it keeps its shadow. That shadow is the TONE's, not this dialog's
          — `shadow-md shadow-accent/30`, tinted with the plate's own colour, and
          `Button`'s header is explicit that it is what makes a filled button read as an
          object sitting on the page rather than a rectangle painted on it. Stripping it
          here would make this the one accent button in the app that is flat. */}
      <div className="flex shrink-0 justify-center bg-release-paper px-5 pb-6">
        <Button tone="accent" size="2xl" onClick={onClose}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
