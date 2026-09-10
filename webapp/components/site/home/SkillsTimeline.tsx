'use client'

import {
  CircleCheck,
  CircleCheckBig,
  CirclePlus,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  ListCheck,
  NotebookPen,
  Rocket,
  ScanSearch,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { MAGIC_COMMANDS, type MagicCommandIcon, type MagicCommandId } from '@/lib/commands'
import { commandLabel } from '@/lib/features'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { GithubMark } from '../features/TasksModalMockup'
import { JiraMark } from '../features/TicketCardMockup'

/**
 * The visual in the skills card: one ticket's whole life as a CONVEYOR, ten stops sliding
 * right to left along a still rail, looping forever.
 *
 * WHY IT MOVES. It was a static row cut by the card's right edge, and the crop was doing
 * the arguing: a line that leaves the frame says the sequence keeps going. That worked for
 * four stops and broke at ten — the six the reader could not see were the six that make
 * the claim ("the whole cycle, closed"), and a crop cannot show them. So the row travels
 * instead.
 *
 * THE RAIL TRAVELS WITH THE BEADS and is exactly as long as the row: it starts at the
 * FIRST bead's centre and ends at the LAST one's, so there is no rail before `Plan` and
 * none after `Done`. It used to be hung across the viewport instead, still, while the
 * beads slid along it — which read well as a conveyor and was wrong for a row with a
 * beginning and an end: a rail running out of the card past the final stop says the
 * sequence continues, and the whole point of halting on the merge is that it does not.
 *
 * IT IS DRAWN AS SEGMENTS, one per stop, and the last stop draws none. Each segment runs
 * from its own bead's centre (`left-5`, half a 40px bead) for the width of its own column
 * (`w-full`) — which lands exactly on the NEXT bead's centre, because that bead is also
 * half a bead into its own column and the columns are flush. So the rail begins on `Plan`
 * and ends on `Done` by construction.
 *
 * IT USED TO BE ONE BAR with `left-4 right-56` measured off a uniform pitch, and that only
 * worked while every column was the same width. It is not a refactor: with columns sized
 * to their own labels there is no single number that reaches the last bead any more, and a
 * bar spanning the track would run past `Done` by whatever the last column happens to be.
 *
 * IT IS NOT A SEAMLESS LOOP, and that is the point rather than a limitation. It RUNS to
 * the merge, STOPS DEAD there, and then SNAPS BACK to the plan — the four beats are
 * spelled out on `timeline-run` in `tailwind.config.ts`. The halt is the beat the drawing
 * is built around: a merged pull request is where a ticket's story lands, so the row holds
 * still on it for a fifth of the cycle before the rewind takes it home for the next idea.
 *
 * THE LIST IS RENDERED ONCE. It used to be rendered twice, because a marquee needs a
 * duplicate to slide into seamlessly — the rewind replaces that, and a second copy would
 * now be visible sliding in behind the first during the run.
 *
 * TEN STOPS, and they are not the eight commands. Five of the eight are here; `continue`
 * is absent because you continue a task only if you left it, and the other two stops are
 * not commands at all:
 *
 *   • `validation` is the HUMAN beat between planning and building — somebody reads the
 *     plan and says yes. It is on the rail because a row of nine machine steps would tell
 *     the reader the product runs without them.
 *   • `merged` is the other one nothing runs: somebody clicks the button. It sits between
 *     `pr` and `done` because that is where the WAIT is, and a row that jumped from
 *     opening a pull request to closing the ticket would be claiming the review is ours
 *     to skip.
 *
 * ── THE NAMES ────────────────────────────────────────────────────────────────────
 *
 * THE COMMAND STOPS TAKE THEIR NAME FROM `commandLabel`, `lib/features.ts`'s accessor for
 * exactly this — its own doc calls it "the prose name for a command title, for whoever is
 * drawing it" — so a rename lands here without an edit. `pr` is the one command stop that
 * overrides it: `COMMAND_LABELS` says "PR", which is right in a grid of eight commands,
 * and on a timeline of a ticket's life the step is the artefact ("Pull request"). The
 * three stops with a `label` therefore win over their `command`, and `pr` keeps the
 * command's GLYPH while wearing the artefact's name.
 *
 * `Start PROJ-123` carries a ticket id because `/magic:start` is the one stop that takes an
 * argument — you start A ticket — and the id is what makes the row read as one journey
 * rather than as a menu. It is a literal: an invented id is product output in every
 * language. It does not match the ids elsewhere on the page (`PAY-318` in the app window
 * below, `PROJ-142` in `StartTerminal` beside this card); that was the owner's number, and
 * aligning the three is a call nobody has made.
 *
 * ── THE GLYPHS ───────────────────────────────────────────────────────────────────
 *
 * EVERY BEAD CARRIES ONE, and the seven command stops do not choose theirs here:
 * `lib/commands.ts` already declares an icon per command, so this row reads the name off
 * `MAGIC_COMMANDS` and resolves it through `COMMAND_GLYPHS`. The owner asked for a rocket
 * on start and a notebook-pen on plan, which are exactly the two that list already held —
 * deriving them was the way to get what was asked AND have it stay true after a change
 * there.
 *
 * THE LOOKUP IS LOCAL, and that is a bundle decision rather than a preference.
 * `FeaturesContent.tsx` holds the site's full `FeatureIcon` → component map, but `glyphFor`
 * is private to that file and importing from it drags the features page's 28 mockups onto
 * the homepage. `COMMAND_GLYPHS` is keyed by `MagicCommandIcon`, so the canonical NAME
 * still decides and only the component resolution is duplicated.
 *
 * COLOUR IS SPENT ON TWO STOPS AND NO MORE: `validation` is green, `tickets` is brand
 * blue, and the eight others are `ink` on their white bead. Green because green is how
 * this product says "finished" (`tone-mint` carries the same reasoning in the Tailwind
 * config); blue because it ties the tickets stop to Jira's mark on its own label. A colour
 * that also decorates is a colour that no longer signals.
 *
 * TWO STOPS ALSO CARRY A MARK BESIDE THEIR TEXT. `validation` gets `ListCheck` in the same
 * green as its bead — two glyphs on one stop, which is deliberate: the bead says the beat
 * happened, the mark says what was read. `tickets` gets Jira's own mark, from
 * `features/TicketCardMockup`, which `AppWindowMockup` already imports for the window
 * below — so it costs the homepage bundle nothing. It keeps Jira's blues (#0052CC →
 * #2684FF) on a near-black card, and the darker of the two is close in value to the
 * `midnight` ground: a vendor's mark recoloured to suit our card is no longer their mark,
 * so if it ever reads muddy the fix is a white tile under it, not a repaint.
 *
 * EVERY GLYPH SITS INSIDE its bead with padding — 40px of bead, 8px of white on each side,
 * a 24px glyph — and the bead is opaque, which is also what hides the rail behind it.
 *
 * THE WHOLE ROW IS DRAWN ONE NOTCH LARGER than it was, at the owner's request, and the
 * five numbers that carry the zoom move together: the bead 32 → 40, its padding 6 → 8, the
 * labels 18px → 20px, the marks 20 → 24, and the rail 12 → 16. Half of the bead follows
 * into `left-5` and `top-5`, since that is where the rail has to meet it. The GAP did not
 * have to move: it is the label's own width plus 50, so bigger type spaces itself out.
 *
 * ── THE GEOMETRY ─────────────────────────────────────────────────────────────────
 *
 * THERE IS NO PITCH ANY MORE. Every column is as wide as ITS OWN label plus 50px, which
 * the owner asked for and which is the right answer to a problem the uniform pitch could
 * not solve: one label sets the spacing for all eleven. `Pull request approuvée` was the
 * longest and forced a 240px pitch, so `Done` sat in a 240px column with 200px of empty
 * rail beside it. The row read as sparse in nine places to keep one from colliding.
 *
 * HOW IT IS DONE, and there is no measuring: the column has NO width class and carries
 * `pr-[50px]`. A flex item with no width sizes to its content, its widest child is the
 * label (`whitespace-nowrap`, so the label is one line and as wide as its text), and the
 * padding adds the 50. The gap is therefore correct for every stop without JavaScript, and
 * it stays correct when a label is translated into a longer word.
 *
 * 50px AND NOT 30. It shipped at 30 for one round and the labels read as crowded — which
 * is the thing a per-label gap gets wrong that a uniform pitch got right by accident: at
 * 240px of pitch even the short names had air around them, and sizing to the text alone
 * takes ALL of it away at once. 50 is the number the owner settled on.
 *
 * COLLISION IS SATISFIED BY CONSTRUCTION now rather than by arithmetic — 50px of gap is
 * 50px of gap whatever the neighbours are — which is what retires the pitch and the note
 * that used to justify it. For the record it was 128, then 176, then 240, each forced by
 * something different: a static row that had to fit `Start PROJ-123` inside the card, then
 * the type going back up to 18px, then the longest label coming down onto the rail.
 *
 * `whitespace-nowrap` on the labels is load-bearing: a label is a flex item in a 240px
 * column, and without it the browser wraps anything wider and spills it out of its
 * fixed-height slot. Overflowing sideways is what this row wants.
 *
 * ── THE REST ─────────────────────────────────────────────────────────────────────
 *
 * EVERYTHING IS WHITE apart from those two glyphs, because the card is `midnight` and its
 * own title and body flip to white on that tone (`CARD_TONES.midnight`). Full-strength
 * white rather than the `onink` ramp the body uses: that ramp is for prose sitting BEHIND a
 * heading, and this drawing is the card's loudest element by design.
 *
 * THE LABELS ARE CERA PRO at `font-semibold`, by request. Cera Pro has no 600 face — the
 * webapp serves the same six the app bundles (300, 400 italic, 500, 700, 900, 900 italic)
 * — so 600 resolves by CSS weight matching to the 700 Bold face. The class is what was
 * asked for; the glyphs a visitor sees are Bold. `font-medium` would land on a real 500
 * face and read lighter than intended, so this is the closer of the two. Nothing is in
 * mono: `Eyebrow`'s monospace is for slash COMMANDS, and "Plan" is a word.
 *
 * `motion-reduce:animate-none` parks the track at the first stop — a readable still of the
 * same row, which is the rule `features/useLoopStep.ts` states for a clock that never
 * starts.
 *
 * `aria-hidden`, like every other drawing on this site. The stops are named in prose in
 * the card's own description, in the reader's language.
 */

/** The ticket the row follows. Invented, and product output in every language. */
const TICKET = 'PROJ-123'

/**
 * The lucide component behind each icon NAME `lib/commands.ts` declares, for the seven
 * commands this row draws. Keyed by `MagicCommandIcon`, so a name that file stops using
 * stops resolving here rather than silently drawing the old picture.
 *
 * `Partial`, because `Play` belongs to `/magic:continue`, which is off this rail.
 * `GitCommitHorizontal` for `GitCommit`: lucide renamed the vertical one, and the
 * horizontal is the mark a commit is drawn with everywhere else on this site.
 * `CircleCheckBig` for `CheckCircle`: that is `done`'s declared name and lucide's own alias
 * for `CircleCheck`, the glyph `validation` already wears — two identical checks on one
 * rail would say the same beat happened twice, so the ending gets the heavier draw.
 */
const COMMAND_GLYPHS: Partial<Record<MagicCommandIcon, LucideIcon>> = {
  NotebookPen,
  Rocket,
  GitCommit: GitCommitHorizontal,
  GitPullRequest,
  ScanSearch,
  Wrench,
  CheckCircle: CircleCheckBig,
}

/** The glyph a command stop wears, read off the canonical list. */
function glyphForCommand(id: MagicCommandId): LucideIcon | undefined {
  const name = MAGIC_COMMANDS.find((c) => c.id === id)?.icon
  return name ? COMMAND_GLYPHS[name] : undefined
}

/**
 * The ten stops, in the order a ticket meets them.
 *
 * A stop names itself with `label` if it has one and with its `command` otherwise, and
 * `pr` sets both on purpose: the label is the artefact's name, the command is what its
 * bead draws. `above`, `glyph` and `mark` are fields rather than special cases in the
 * render because that is where a second of each would go.
 */
const STOPS: readonly {
  id: string
  command?: MagicCommandId
  label?: MessageKey
  suffix?: string
  /** Overrides the command's own glyph. Set only where there is no command to read. */
  glyph?: LucideIcon
  glyphClass?: string
  /** A glyph to the LEFT of the text. The two named ones are not lucide icons. */
  mark?: 'jira' | 'github' | LucideIcon
  markClass?: string
}[] = [
  { id: 'plan', command: 'plan' },
  {
    id: 'validation',
    label: 'site.pillars.timelineValidation',
    glyph: CircleCheck,
    glyphClass: 'text-green',
    mark: ListCheck,
    markClass: 'text-green',
  },
  {
    id: 'tickets',
    label: 'site.pillars.timelineTickets',
    glyph: CirclePlus,
    glyphClass: 'text-brand',
    mark: 'jira',
  },
  { id: 'start', command: 'start', suffix: TICKET },
  { id: 'commit', command: 'commit' },
  // THE PULL REQUEST BEING OPENED, and it wears `CirclePlus` in `brand` rather than its
  // command's `GitPullRequest` — the same glyph as the tickets stop, for the same reason:
  // both are the moment a THING IS CREATED, one in Jira and one on GitHub, and drawing
  // them alike is what makes the pair read as the two artefacts of one ticket. It keeps
  // GitHub's mark on the label, so the plus says WHAT happens and the mark says where.
  //
  // Its label is the longest on the row now, which costs nothing: the gap is each label's
  // own width plus 50px, so the column simply grows with it.
  {
    id: 'pr',
    command: 'pr',
    label: 'site.pillars.timelinePr',
    glyph: CirclePlus,
    glyphClass: 'text-brand',
    mark: 'github',
  },
  { id: 'review', command: 'review' },
  { id: 'resolve', command: 'resolve' },
  // The SECOND human beat, and it comes after `resolve`: a reviewer approves once the
  // comments they left have been answered. Green like `validation` — the two stops that
  // nothing automates are the two that wear the colour.
  {
    id: 'approved',
    label: 'site.pillars.timelineApproved',
    glyph: CircleCheck,
    glyphClass: 'text-green',
    mark: 'github',
  },
  { id: 'merged', label: 'site.pillars.timelineMerged', glyph: GitMerge },
  { id: 'done', command: 'done' },
]

/** The copy on a stop. An explicit label wins over the command's own name. */
function textOf(stop: (typeof STOPS)[number], t: (key: MessageKey) => string): string {
  if (stop.label) return t(stop.label)
  if (stop.command) {
    return [commandLabel(`/magic:${stop.command}`), stop.suffix].filter(Boolean).join(' ')
  }
  return ''
}

/** The glyph in a stop's bead: its own if it asks for one, else its command's. */
function beadGlyph(stop: (typeof STOPS)[number]): LucideIcon | undefined {
  return stop.glyph ?? (stop.command ? glyphForCommand(stop.command) : undefined)
}

/** The mark ahead of a stop's text, where it has one. */
function Mark({ stop }: { stop: (typeof STOPS)[number] }) {
  if (!stop.mark) return null
  if (stop.mark === 'jira') return <JiraMark className="h-6 w-6 shrink-0" />
  if (stop.mark === 'github') return <GithubMark className="h-6 w-6 shrink-0" />
  const Glyph = stop.mark
  return <Glyph className={`h-6 w-6 shrink-0 ${stop.markClass ?? ''}`} strokeWidth={2.25} />
}

/** One stop's name. A flex row, because two of them carry a mark ahead of the text. */
const LABEL =
  'flex items-center gap-2 whitespace-nowrap font-display text-xl font-semibold text-white'

export function SkillsTimeline() {
  const { t } = useT()

  return (
    // THE VIEWPORT, at the CARD's width rather than the track's, which is what turns the
    // track's slide into stops arriving and leaving.
    //
    // THE PADDING IS WHAT PLACES THE DRAWING, and all three numbers are corrections to a
    // composition the owner rightly called broken:
    //
    //   `pl-6` — WITHOUT IT THE FIRST BEAD IS SLICED IN HALF by the card's left edge. It
    //     was dropped on the theory that a conveyor should bleed on both sides, and that
    //     was wrong at REST: the row sits still at the start for a fifth of the cycle, and
    //     that is the frame a reader arrives on and a screenshot catches. The rail is
    //     unaffected — an absolutely positioned `inset-x-0` resolves against the padding
    //     BOX, so it still runs the card's full width and the beads still slide out
    //     through both edges once the run starts.
    //   `pt-20` — `ToneCard` hands its visual `mt-auto`, so a short drawing gets shoved
    //     against the card's bottom edge and leaves ~250px of empty ground in the middle.
    //     The panel in the card beside this one is 224px tall and fills that room; this
    //     row does not. The top padding is what makes up the difference, so the rail lands
    //     in the free band rather than on the card's floor. It went 20 → 24 when the slot
    //     above the beads was removed, and back to 20 when the zoom gave the row 20px of
    //     its own height back: the drawing's total is ~196px either way, which is what the
    //     card has room for.
    //   `pb-10` — 40px under the labels, against the 16px it had. At 16 the labels read as
    //     resting on the card's edge; the crop above showed exactly that.
    <div aria-hidden className="relative pb-10 pl-6 pt-20">
      {/* THE TRACK. `w-max` so it is as wide as its content and never shrinks to the card,
          and `relative` so the rail can be measured against it. */}
      <div className="relative flex w-max animate-timeline-run motion-reduce:animate-none">
        {STOPS.map((stop, i) => {
          // Capitalised, because JSX reads a lowercase tag as an HTML element.
          const BeadGlyph = beadGlyph(stop)
          return (
            // NO WIDTH CLASS, on purpose: the column sizes to its own label and
            // `pr-[50px]` is the gap to the next stop. `shrink-0` keeps a flex parent from
            // squeezing them together. See the geometry note above.
            <div key={stop.id} className="relative shrink-0 pr-[50px]">
              {/* THE RAIL'S SEGMENT for this stop, from its bead's centre to the next
                  one's. `w-full` is the column's own width, which is exactly that
                  distance. The LAST stop draws none, which is what makes the rail end on
                  `Done` rather than run out past it. */}
              {i < STOPS.length - 1 && (
                <div className="absolute left-5 top-5 h-4 w-full -translate-y-1/2 bg-white" />
              )}
              {BeadGlyph ? (
                // `relative` so the bead paints ABOVE its own rail segment: a
                // positioned element outranks a static one, and the segment is
                // positioned, so a static bead would be drawn under it.
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white p-2">
                  {/* `h-full w-full`, so the two numbers deciding how big the glyph looks
                      are the bead's `h-10` and that `p-2` — one place, not three. */}
                  <BeadGlyph
                    className={`h-full w-full ${stop.glyphClass ?? 'text-ink'}`}
                    strokeWidth={2.25}
                  />
                </span>
              ) : (
                // Nothing reaches this today. It is the fallback for a stop with neither a
                // command nor a glyph, and it is one line.
                <span className="relative block h-10 w-10 rounded-full bg-white" />
              )}

              {/* THE NAME, under its bead — every stop's is here now. See the geometry
                  note above for what bringing the longest one down cost the pitch. */}
              <span className={`mt-2 block h-7 ${LABEL}`}>
                <Mark stop={stop} />
                {textOf(stop, t)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
