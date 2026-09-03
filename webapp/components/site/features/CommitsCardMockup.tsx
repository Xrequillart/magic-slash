'use client'

import { Copy } from 'lucide-react'
import { GithubIcon } from '../icons'

/**
 * The visual inside the `/magic:commit` card: the app's own commits panel, redrawn,
 * CROPPED on the right and at the bottom.
 *
 * DRAWN FROM THE REAL COMPONENT, not from an idea of it. Every measurement is lifted from
 * the `hasCommits` block of
 * `desktop/src/renderer/components/agent-info-sidebar/RepositoryCard.tsx`: the panel as
 * `rounded-md border p-2`, its header row as `flex items-center text-xs mb-1.5` with the
 * label `font-medium` on the left and the ahead-count pushed right by `ml-auto`, the list
 * as `space-y-1`, each row as `flex items-center gap-2 text-xs py-0.5` holding a
 * `truncate flex-1` subject, then a relative date, then the short hash as a
 * `flex items-center gap-1 px-1.5 py-0.5 border rounded font-mono text-xs` button with a
 * `w-3 h-3` `Copy` beside it, and — only on a pushed commit — a `p-1 border rounded`
 * button carrying the GitHub mark at the same size.
 *
 * THE THREE SUBSTITUTED TOKENS are the same story as the spec panel's: the desktop app
 * dresses this in `surface`, `line-subtle`, `border` and a `text-secondary` ramp read off
 * CSS variables, and none of those exist in this webapp. So the ground is `white`, the
 * rules are `hairline`, and the app's `text-secondary/70`, `/60`, `/50` and `/40` tiers
 * become `ink/60`, `ink/50` and `ink/40` — the same idea (one ink at falling alphas) in
 * the tokens this page already uses everywhere else.
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
  { subject: 'chore(deps): bump electron to 28.3.1', age: '18m', hash: 'd9c4160', pushed: false },
]

/**
 * FIVE ROWS AND A COUNT, because that is exactly what the app renders: `RepositoryCard`
 * does `commits.slice(0, 5)` and then, when there are more, a
 * `text-xs py-0.5` line reading `+{n} more commits`. Drawing six rows would have shown a
 * list the component cannot produce.
 */
const MORE = 2

export function CommitsCardMockup() {
  return (
    // `-mr-8` and `-mb-6` pull the panel past the card's padding on two sides, which is
    // the crop. WHERE it sits is `ToneCard`'s business, not this component's.
    <div aria-hidden className="-mb-6 -mr-8 pl-7 pt-6">
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
      <div className="h-56 min-w-96 overflow-hidden rounded-md border border-hairline bg-canvas p-2 shadow-lift">
        <div className="mb-1.5 flex items-center text-xs">
          <span className="font-medium text-ink/60">Commits</span>
          <span className="ml-auto text-ink/50">3 ahead of main</span>
        </div>

        <div className="space-y-1">
          {COMMITS.map((commit) => (
            <div key={commit.hash} className="flex items-center gap-2 py-0.5 text-xs">
              <span className="flex-1 truncate text-ink/60">{commit.subject}</span>
              <span className="shrink-0 text-ink/40">{commit.age}</span>
              {/* The hash is a BUTTON in the app — it copies the full sha — so it is
                  drawn as one. Static: nothing here can be pressed, and a hover state
                  would be a promise the drawing cannot keep. */}
              <span className="flex shrink-0 items-center gap-1 rounded border border-hairline px-1.5 py-0.5 font-mono text-xs text-ink/50">
                {commit.hash}
                <Copy className="h-3 w-3" />
              </span>
              {/* Only on a pushed commit, exactly as in the app: the button opens the
                  commit on GitHub, so a local one has nothing to open. Drawing it on all
                  three would have flattened the one detail in this panel that carries
                  information. */}
              {commit.pushed ? (
                <span className="flex shrink-0 items-center rounded border border-hairline p-1 text-ink/50">
                  <GithubIcon size={12} />
                </span>
              ) : null}
            </div>
          ))}
          {/* The app's own overflow line, verbatim in shape: `text-xs py-0.5` in the
              faintest tier. It is the one thing in this panel that says the list is a
              window onto something longer, which is also what the crop is saying. */}
          <div className="py-0.5 text-xs text-ink/40">+{MORE} more commits</div>
        </div>
      </div>
    </div>
  )
}
