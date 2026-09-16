'use client'

import { CommitCard } from '@ds/desktop'
import { Github } from '@ds/desktop/icons'
import { AppGround } from '../AppGround'

/**
 * The visual inside the `/magic:commit` card: the app's own commits panel, redrawn,
 * CROPPED on the right and at the bottom.
 *
 * IT IS THE COMPONENT NOW, not a drawing of one. `CommitCard` comes from
 * `design-system/desktop/`, the same file the Electron renderer compiles, on a patch of
 * the app's own LIGHT theme (`AppGround`). Change the card and this illustration changes
 * with it.
 *
 * WHAT THAT REPLACED: every measurement of the `hasCommits` block copied out by hand —
 * the panel's padding, the header's `ml-auto`, each row's `py-0.5`, the hash chip's
 * border and its `w-3` copy glyph — under a note listing all of them. The card has since
 * grown a YELLOW RAIL down its gutter, which says the commits are one branch in order,
 * and this drawing knew nothing about it. A drawing that IS the component cannot fall
 * behind one.
 *
 * THE THREE SUBSTITUTED TOKENS ARE GONE WITH IT. The note here used to explain that the
 * app dresses this in `surface`, `line-subtle` and a `text-secondary` ramp read off CSS
 * variables, none of which exist in this webapp — so the ground became `white`, the rules
 * `hairline`, and the four alpha tiers three of `ink`. `AppGround` hands the component
 * the real variables instead, and there is nothing left to substitute.
 *
 * `theme="light"` AND `paint={false}`, which is two decisions. Light because this panel
 * stands on a coloured card in a light grid, and the app's dark theme here would be a
 * hole punched through the page. `paint={false}` because the wrapper already has a
 * ground and keeps it: `canvas` (#F4F7FE), the site's declared off-white, chosen over
 * pure white so the panel clears the page rather than reading as the same surface. The
 * variables still land, which is all a real component needs.
 *
 * NO ANIMATION, deliberately, and not for lack of one to write. A commit list is a
 * RECORD: it is the thing that is already true when you look at it, where the start
 * card's terminal is a thing happening. Typing commits into it one by one would have
 * suggested `/magic:commit` streams them, and it does not — it splits a working tree into
 * atomic commits and they land together.
 *
 * CROPPED ON TWO SIDES, like the start card's terminal and unlike the spec panel. A
 * commit row is wide and repetitive: the subject, the age, the hash. What a reader needs
 * is to recognise the shape, and the shape is complete after three rows and the left half
 * of each. Cutting both edges says "there is more of this" without spending card on
 * proving it.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and its words paraphrase the card's
 * own description sitting directly above it.
 */

/**
 * Three commits, and they are this repository's own conventional-commit shape — the
 * `type(scope): subject` that `commitlint` enforces here, with the scopes CLAUDE.md
 * actually lists. Invented subjects would have been the one thing in this drawing a
 * reader could catch out.
 *
 * NOT catalogue keys. A commit subject is written in the repository's commit language,
 * which for this project is English in both catalogues; translating them would show
 * something the tool does not produce.
 */
const COMMITS = [
  { subject: 'feat(desktop): add the split view toggle', age: '2m', hash: 'a3f1c92', pushed: true },
  { subject: 'test(desktop): cover the pane resize guard', age: '2m', hash: '7b40e18', pushed: true },
  { subject: 'refactor(desktop): lift the pane state out of the view', age: '5m', hash: 'c1d8a05', pushed: true },
  { subject: 'fix(desktop): keep the divider inside its track', age: '11m', hash: '5e2f7b3', pushed: true },
  // THE THREE THE TAIL IS COUNTING, and they are here rather than implied because the
  // card holds what it hides now: the "+3 more commits" line opens onto these.
  { subject: 'feat(desktop): remember the divider position per agent', age: '14m', hash: '9c07e4a', pushed: true },
  { subject: 'chore(desktop): drop the unused pane reducer', age: '20m', hash: '2fb61d9', pushed: false },
  { subject: 'docs(desktop): note why the divider is not a range input', age: '26m', hash: 'e84a3c7', pushed: false },
]

/**
 * FOUR ROWS AND A COUNT, and the fourth went to the rail.
 *
 * It was five — `RepositoryCard` slices at five, so five is what the component can
 * produce — and five fitted the panel's 224px while each row was `py-0.5`. `CommitCard`
 * gives every row `py-1` instead, because the rail is drawn edge to edge per row and any
 * gap between them would show as a broken trail. Measured after the swap: the card came
 * to 230px in a 224px panel, so the crop this drawing takes at the bottom landed
 * THROUGH the "+N more" line rather than on the strip of empty panel it is meant to cut.
 * A crop through the middle of type does not read as a panel continuing past the frame;
 * it reads as text that failed to fit — which is the same lesson `WorkflowArt` records
 * about its own minimum width.
 *
 * Four rows is not a claim about the component: this drawing is a CROP, and the count
 * line below is what says the list is a window onto something longer. Seven commits
 * either way — and the other three are real rows now rather than a number, because the
 * tail OPENS them. `MORE` is arithmetic on the list rather than a literal, so the line
 * cannot claim a count the card does not hold.
 */
const SHOWN = 4
const MORE = COMMITS.length - SHOWN

/** Nothing is listening: a hash nobody can copy is still a hash. */
const noop = () => undefined

export function CommitsCardMockup() {
  return (
    // `-mr-8` and `-mb-6` pull the panel past the card's padding on two sides, which is
    // the crop. WHERE it sits is `ToneCard`'s business, not this component's.
    /* `inert` ALONGSIDE `aria-hidden`, which it did not need until the tail became a
       button: a decorative panel holding a real control is one a reader can Tab into and
       press, on a page where nothing is listening. It reaches the DOM as a STRING — React
       18 does not know the attribute and drops a boolean `true` with a warning — hence the
       cast, the same one `components/ui.tsx` makes for its closed panels. */
    <div
      aria-hidden
      {...({ inert: '' } as unknown as React.HTMLAttributes<HTMLDivElement>)}
      className="-mb-6 -mr-8 pl-7 pt-6"
    >
      {/* `shadow-lift`, the top rung of the declared scale — the same call the start
          card's terminal makes, and for the same reason: this is a panel sitting ON a
          coloured card, not a region of it.

          `h-56` — the same 224px the start card's terminal stands at, so the panels line
          up across the grid instead of each finding its own height. Five rows and the
          count come to ~190px, which leaves the wrapper's `-mb-6` a strip of empty panel
          to cut rather than a row of type.

          `overflow-hidden` so a longer subject or a longer translation is clipped INSIDE
          the white ground rather than spilling out of it.

          `bg-canvas` and not `bg-white`: the page's own ground is white, so a white panel
          read as the same surface as the page rather than as a thing on a card.
          `canvas` (#F4F7FE) is the site's declared off-white. */}
      <AppGround
        theme="light"
        paint={false}
        className="h-56 min-w-96 overflow-hidden rounded-md border border-hairline bg-canvas p-2 shadow-lift"
      >
        <CommitCard
          label="Commits"
          summary="3 ahead of main"
          commits={COMMITS.map((commit) => ({
            hash: commit.hash,
            shortHash: commit.hash,
            subject: commit.subject,
            relativeDate: commit.age,
            copyLabel: commit.hash,
            openable: commit.pushed,
          }))}
          more={{ shown: SHOWN, label: `+${MORE} more commits`, lessLabel: 'Show fewer' }}
          onCopyHash={noop}
          /* Only on a pushed commit, exactly as in the app: the button opens the commit
             on GitHub, so a local one has nothing to open. `openable` per row is what
             carries that, and it is the one detail in this panel with information in it. */
          open={{ label: 'View on GitHub', icon: Github, onOpen: noop }}
        />
      </AppGround>
    </div>
  )
}
