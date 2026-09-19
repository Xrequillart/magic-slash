/* eslint-disable @next/next/no-img-element */

/**
 * THE DRAWN SKILL CARDS — the eight rows on `/features` that show an idea instead of a
 * screenshot.
 *
 * ── WHY THESE EIGHT AND NOT THE OTHER TWENTY-TWO ──────────────────────────────────
 *
 * Every other card on the page draws a MOCKUP: a reproduction of the panel the feature
 * lives in, with real-looking data in it. For those rows that is right — they are about a
 * panel, and the fastest way to say what a panel does is to draw it.
 *
 * These eight are the SKILLS, one per command, and they are about what a command is FOR
 * rather than what it renders. A command is a thing that happens over a few minutes, and
 * a screenshot of whichever window it happens to end in shows the container instead of
 * the work. They are also the page's spine: the grid of eight is what a reader comes to
 * this page to understand, and the twenty-two rows under it are the detail.
 *
 * That split is the whole rule, and it is worth keeping: a page of thirty drawings would
 * say nothing about the product, and a page of thirty screenshots is what this was.
 *
 * ── NOTHING WAS DELETED TO MAKE ROOM ──────────────────────────────────────────────
 *
 * Two of the mockups these replaced are still drawn elsewhere, by a direct import rather
 * than through the `VISUALS` table — `SpecPanelMockup` on `/workflow`, `StartTerminal` on
 * the homepage's pillars card — so those pages part company with this one on purpose.
 *
 * The other six have no caller left: `ContinueTaskMockup`, `CommitsCardMockup`,
 * `PRWatchCardMockup`, `ReviewThreadsMockup`, `ResolvedThreadsMockup` and
 * `DoneChecklistMockup`. They are KEPT rather than removed, and that is a decision rather
 * than an oversight: a mockup is expensive to write, several are audited line by line in
 * their own headers, and deciding to delete them is a separate question from deciding to
 * stop showing them here. Whoever answers it should answer it for all six at once.
 *
 * ── THE DRAWING ───────────────────────────────────────────────────────────────────
 *
 * NO PLATE, and the drawing sits straight on the card's own ground. The mockups all bring
 * one (`bg-tone-mist` and its kind) because a screenshot needs a surface to be
 * photographed against. These are line art on transparency: a plate behind one would be a
 * second rectangle inside a card that is already one.
 *
 * THESE FILES ARE PURE BLACK ON TRANSPARENCY — no `fill` attribute anywhere, so every
 * path takes the default — WHICH MEANS EVERY CARD GROUND THEY LAND ON HAS TO BE LIGHT.
 * That holds today by construction: `CARD_TONES` has six grounds and all six are light,
 * because the two dark ones were removed.
 *
 * IT DID NOT ALWAYS HOLD. Three of these cards were `indigo` or `midnight` for one round,
 * and black ink on those is a drawing nobody can see — it shipped that way and had to be
 * fixed with a `filter: invert()` driven off the card's own ink. That machinery is gone
 * with the dark tones, and this paragraph is what is left of it: anyone adding a dark
 * ground back to `CARD_TONES` has to bring the inversion back with it, or these eight
 * drawings vanish and nothing will fail to tell them.
 *
 * CAPPED BY HEIGHT AND NOT BY WIDTH, which is the one sizing decision worth reading. The
 * eight files have quite different proportions — 950×779 for the checkmark, 647×950 for
 * the crown — so a shared `max-w` would have drawn the widest one nearly twice the size
 * of the narrowest. `max-h-64` puts all eight at 256px tall and lets each take the width
 * it needs, which is what makes them read as one series rather than as eight unrelated
 * pictures. 256 plus the padding also stays inside `TONE_HEIGHT`'s 320px, so a drawn card
 * is exactly as tall as the mockup cards beside it.
 *
 * `md:py-4` gives the vertical padding back on a wide card: `p-7` on all four sides is
 * right when the drawing sits under the copy, and too much when it sits beside it.
 *
 * `aria-hidden` AND an empty `alt`: each says nothing the title and description beside it
 * have not, and a screen reader walking thirty feature rows wants to get through them.
 */
function FeatureArt({ src }: { src: string }) {
  return (
    <div className="flex justify-center p-7 md:py-4">
      <img
        src={src}
        alt=""
        aria-hidden
        className="max-h-64 w-auto max-w-full"
      />
    </div>
  )
}

/** `plan` — somebody at a desk, sketching, with a lightbulb over their head. */
export function PlanSketchArt() {
  return <FeatureArt src="/img/illustration-sketch.svg" />
}

/** `start` — a rocket leaving the ground, and the hand that pressed the button. */
export function StartLiftoffArt() {
  return <FeatureArt src="/img/illustration-liftoff.svg" />
}

/** `review` — a magnifier held up to a wall of code. */
export function ReviewSearchArt() {
  return <FeatureArt src="/img/illustration-search.svg" />
}

/** `continue` — picking a line back up, with a pencil bigger than the person holding it. */
export function ContinuePencilArt() {
  return <FeatureArt src="/img/illustration-pencil.svg" />
}

/** `commit` — sitting on the tick, laptop open, the work behind them. */
export function CommitCompleteArt() {
  return <FeatureArt src="/img/illustration-complete.svg" />
}

/** `pr` — climbing a staircase made of books, pages flying. */
export function PrClimbArt() {
  return <FeatureArt src="/img/illustration-climb.svg" />
}

/** `resolve` — carrying the piece that makes the puzzle whole. */
export function ResolvePuzzleArt() {
  return <FeatureArt src="/img/illustration-puzzle.svg" />
}

/** `done` — a tick, and somebody wearing a crown about it. */
export function DoneApprovedArt() {
  return <FeatureArt src="/img/illustration-approved.svg" />
}
