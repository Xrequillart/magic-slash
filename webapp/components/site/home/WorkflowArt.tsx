'use client'

import { CheckCircle2, Circle, GitMerge } from 'lucide-react'
import { MAGIC_COMMANDS, type MagicCommandId } from '@/lib/commands'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { WORKFLOW_CHROME } from '@/lib/workflow'
import { GithubMark } from '../features/TasksModalMockup'

/**
 * The five drawings inside the workflow band's five cards — one per step of the loop.
 *
 * ONE FILE AND NOT FIVE, which is the opposite of what `components/site/features/` does,
 * and the reason is what they SHARE rather than how big they are. Every drawing here is
 * the same object: a light panel with a hairline and a `shadow-lift`, carrying the
 * command that produced it in the monospace signature, cut by the card's own edge. That
 * recipe is `ART_PANEL` / `ArtHeader` below, stated once. Five files would have restated
 * it five times and drifted — which is exactly what happened on `/features`, where thirty
 * panels each spell their own chrome and no two of them round the same corner.
 *
 * WHAT THEY ARE NOT: reproductions of the app. `/features`'s mockups are measured off
 * `desktop/src/renderer/` file by file, and they are right to be — that page's promise is
 * "this is the product". This band's promise is different: it is the SHAPE of the loop,
 * five steps in one screen, and a reader gets that from a drawing that says one thing per
 * card. So these are diagrams in the design system's tokens: a spec becoming stories, a
 * ticket becoming an agent, commits becoming a pull request, a thread being answered, a
 * branch being cleaned up. Recognisable, and none of them pretending to be a screenshot.
 *
 * NOTHING HERE IS REUSED FROM `/features` AND NOTHING THERE IS REUSED HERE, which was a
 * deliberate call rather than an oversight — `PillarsSection` above does reuse
 * `StartTerminal` verbatim, and the difference is worth stating. That panel was borrowed
 * because a SECOND drawing of the same terminal run would be the copy that drifts. These
 * five are not second drawings of anything: `/features` has no "the loop in five cards"
 * band to lend one, and each of its per-command panels is a faithful reproduction sized
 * for a full-row card. Dropping five of those into a three-column grid would have shown
 * five crops of the app at 40% scale, which is a wall rather than a diagram.
 *
 * THE ONE THING THAT IS BORROWED IS THE COPY, and that matters more than the pixels:
 * `site.doneCard.*` and `site.startCard.*` are reused as they are, word for word. Those
 * lines were written against `skills/magic-done/SKILL.md` and `magic-start/SKILL.md` and
 * vetted line by line (`DoneChecklistMockup.tsx`'s header has the audit), so writing new
 * ones here would have been a second chance to promise a cleanup the tool does not do.
 *
 * THE LITERALS ARE ENGLISH IN BOTH LANGUAGES and they are not catalogue keys — commit
 * subjects, branch names, file paths, a reviewer's comment, `Merged`, `Resolved`. Every
 * one of them is a string the TOOL or the platform prints, in the repository's own
 * language, and this repository commits in English (CLAUDE.md's conventions, enforced by
 * commitlint). Translating them would show something the product does not produce — the
 * rule `CommitsCardMockup.tsx` states and every drawing on the site follows.
 *
 * `aria-hidden` ON EVERY ONE OF THEM, at the outermost node. They are drawings, and each
 * one paraphrases the description sitting directly above it in the card; a screen reader
 * that walked into this would hear the same step twice, the second time as forty
 * disconnected fragments.
 */

/**
 * The eight commands, by id → what you type. `MAGIC_COMMANDS` is the canonical list and
 * the template-literal type on `command` is what makes this safe: `/magic:pln` does not
 * compile, where a literal typed into the markup below would have rendered a command that
 * does not exist.
 *
 * IN THE DRAWINGS RATHER THAN IN THE COPY, which is the division this band is built on.
 * A card's description is prose in two languages; the command is a token the product
 * defines, so it belongs to the picture and not to the catalogue — nothing a translator
 * touches can rename it, and it is spelled from the source of truth on every render.
 */
type MagicCommand = (typeof MAGIC_COMMANDS)[number]['command']

const COMMAND = Object.fromEntries(MAGIC_COMMANDS.map((c) => [c.id, c.command])) as Record<
  MagicCommandId,
  MagicCommand
>

/**
 * The panel every drawing here is built on.
 *
 * `rounded-xl` and a hairline, like every panel on the site; `shadow-lift`, the top rung
 * of the declared elevation scale, because this is a panel sitting ON a coloured card and
 * not a region of it — the same call `StartTerminal` and `CommitsCardMockup` make.
 *
 * `overflow-hidden` so a long subject, or a French label a third longer than its English,
 * is clipped INSIDE the panel rather than spilling out of it. The CARD does its own
 * clipping too (`ToneCard` is `overflow-hidden`), and the two are not the same cut: this
 * one keeps the panel's corner honest, that one is the crop.
 *
 * NO MINIMUM WIDTH, AND IT HAD ONE — `min-w-96`, 24rem, on the argument that these are
 * cropped drawings and a panel that shrank with its column would stop being cropped and
 * start being a small diagram. It rendered, and looking at it settled the question the
 * other way: on a third-width card that minimum is ~90px wider than the box, so the CUT
 * LANDED ON THE RIGHT-HAND COLUMN of every row — a commit hash sliced down the middle of
 * its first character, "3 ahead of main" ending at "3 ahead o", a branch name at
 * `feature/142-spli`. A crop through the middle of a glyph does not read as a panel
 * continuing past the frame; it reads as text that failed to fit.
 *
 * So the panels fit their box, and the crop each drawing keeps is stated at its own
 * wrapper — a few pixels off the right edge to prove the panel is a surface and not a
 * tile, and the bottom for the three that stand at `h-56`. The one panel that is still
 * DELIBERATELY wider than its card is the plan card's, which is the wide one: it hangs
 * `-mr-14` off the edge and everything in the cut zone is the tail of a truncated story
 * title, which is the half that carries no meaning.
 */
const ART_PANEL = 'overflow-hidden rounded-xl border border-hairline shadow-lift'

/**
 * The ground every panel here stands on: `canvas` (#F4F7FE), the site's declared
 * off-white.
 *
 * ONE VALUE, AND IT WAS A TABLE — `{ light: 'bg-white', dark: 'bg-canvas' }`, on the rule
 * that a panel has to clear its own CARD: pure white was a clear step off the three light
 * tones, and on the two dark ones it was the thing that read as a hole punched through the
 * page. Both halves of that were true and the product owner asked for the off-white
 * throughout — "peux-tu mettre le mockup en blanc cassé pour avoir une diff entre le
 * background de la page et les cards de couleur" — which is the better call for a reason
 * the table missed: three levels need three values, and pure white gave the band only two.
 * Page, card, panel now step canvas → colour → off-white, and the panel is a SURFACE on a
 * coloured card rather than the brightest thing on the screen.
 *
 * IT IS THE PAGE'S OWN GROUND AND THAT IS NOT A HOLE, which is the objection to answer
 * because `CommitsCardMockup` raises exactly it: over on `/features` a WHITE panel "read as
 * the same surface as the page rather than as a thing on a card", and that page is white.
 * The homepage is `canvas`, so this is the mirror of that situation — but the reading only
 * happens when the matching colour SURROUNDS the panel, and here what surrounds it is the
 * card's own saturated ground on every side. The page never touches it.
 */
const PANEL_GROUND = 'bg-canvas'

/**
 * The panel's header: the command on the left, whatever the drawing wants on the right.
 *
 * THE COMMAND IS THE `Eyebrow` SIGNATURE, restated here rather than imported. `Eyebrow`
 * in `components/ui.tsx` is `font-mono text-xs font-medium tracking-tight text-brand`
 * plus a margin slot, and it is documented as "typography, never a control" — which is
 * exactly this. What it is not is a header ROW: it owns a bottom margin and no layout, so
 * using it here would mean passing `spacing=""` at five call sites to defeat the one
 * thing it brings. The type is copied to the class; the pairing (monospace, `brand`, a
 * slash command) is the through-line it exists to carry.
 *
 * THE TRAILING SLOT SITS BESIDE THE COMMAND AND NOT AT THE FAR EDGE, which is the second
 * thing the first render corrected. It was `ml-auto`, and on a cropped panel `ml-auto`
 * puts a chip or a ticket id exactly where the card's edge cuts: the plan panel's
 * `approved` chip came out as a sliver of green and the start panel's `#142` was gone
 * altogether. Everything a drawing means to be READ is now left-anchored, and the crop
 * only ever takes empty ground or the tail of something truncated.
 */
function ArtHeader({ command, children }: { command: MagicCommand; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-2.5">
      <span className="shrink-0 font-mono text-xs font-medium tracking-tight text-brand">
        {command}
      </span>
      {children ? <span className="flex min-w-0 items-center gap-1.5">{children}</span> : null}
    </div>
  )
}

/** A ticket id beside its tracker's mark, the way every panel on this site writes one. */
function TicketRef({ id }: { id: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink/70">
      <GithubMark className="h-3 w-3" />
      {id}
    </span>
  )
}

/**
 * ── ① `/magic:plan` ───────────────────────────────────────────────────────────────
 *
 * The spec, and the epic and stories it becomes.
 *
 * WHY THE STORIES AND NOT THE IDEA. `/features`'s own plan card draws the top of the spec
 * document — the repository, the tracker, the `## Idea` block — because that page is
 * showing the PANEL. Here the card has one sentence to make a point with, and the point
 * of `/magic:plan` is not that it writes a document: it is that the document turns into
 * tickets somebody can start. So the drawing keeps four lines of the spec and spends the
 * rest on the epic and its three stories, which is the skill's actual output
 * (`skills/magic-plan/SKILL.md` — a spec, reviewed, then an epic and its stories).
 *
 * THE THREE STORIES DO NOT ARRIVE, and they did for one round. They were on `status-1` …
 * `status-3`, the `/features` start card's own keyframes, on the reasoning that three
 * things appearing one after another is the same motion and deserves no fourth keyframe
 * family. What that reasoning missed is where those keyframes START: `statusIn` opens at
 * `opacity: 0` and holds there for the first fifth of an 11s loop, and these three rows
 * are a THIRD OF THE PANEL. So for two seconds of every eleven the drawing was a spec
 * with an empty box under it and a rail pointing at nothing — which does not read as
 * "about to happen", it reads as a component that failed to render.
 *
 * A row arriving late is fine when the panel is already legible without it (the start
 * card's status lines are, and they keep the motion). A row that IS the point of the
 * drawing has to be there when you look. So the stories are static, which puts this card
 * in the same position `CommitsCardMockup` argued itself into for the same reason: what
 * `/magic:plan` produces is a RECORD, already true when you see it.
 *
 * CROPPED ON THE RIGHT ONLY. This is the band's one wide card, so the panel sits BESIDE
 * the copy (`ToneCard`'s `beside` slot) and has the full height of the card to fill —
 * there is nothing to cut at the bottom. The right edge is where the story titles run
 * out, which is the half that carries no meaning.
 */
const STORIES = [
  { id: '#143', title: 'Split the terminal pane' },
  { id: '#144', title: 'Persist the pane sizes' },
  { id: '#145', title: 'Cover the resize guard' },
]

export function PlanSpecArt() {
  const { t } = useT()

  return (
    // `-mr-14` pulls the panel well past the card's right edge, which is the crop.
    // Symmetrical padding top and bottom: the card CENTRES this one, so a heavier bottom
    // inset would push it off its own axis.
    <div aria-hidden className="-mr-14 py-7 pl-7">
      {/* THE ONE PANEL THAT KEEPS A MINIMUM WIDTH. See `ART_PANEL`: the other four fit
          their box, and this one is deliberately ~90px wider than the wide card's visual
          column so the `-mr-14` above has something to cut. Everything in that cut zone
          is the tail of a truncated story title. */}
      <div className={`${ART_PANEL} ${PANEL_GROUND} min-w-96`}>
        <ArtHeader command={COMMAND.plan}>
          {/* The status the spec is IN, not a control. `/magic:plan` asks for approval
              before it opens a single ticket, and this is the moment after that: the
              document is agreed, the tickets below it exist because of it. */}
          <span className="rounded-md bg-green/10 px-1.5 py-0.5 text-xs font-medium text-green">
            approved
          </span>
        </ArtHeader>

        <div className="p-4">
          {/* THE SPEC, in four lines. `site.planCard.specTitle` is the idea `/features`
              plans against — reused so the two pages are planning the same feature rather
              than each inventing a product. The field names stay English in both
              languages: `spec-template.md` §3 freezes them, so translating them here would
              show a document the skill does not write. */}
          <p className="font-display text-sm font-bold text-ink">Spec — {t('site.planCard.specTitle')}</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
            <li>- Repository: magic-slash</li>
            <li>- Tracker: GitHub</li>
          </ul>

          {/* THE EPIC, behind its own rule — the join between the document and the
              tickets, which is the whole subject of the drawing. */}
          <div className="mt-3.5 flex items-center gap-2 border-t border-hairline pt-3.5">
            <TicketRef id="#142" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink/80">
              {t('site.planCard.specTitle')}
            </span>
            <span className="shrink-0 rounded-md bg-purple/10 px-1.5 py-0.5 text-xs font-medium text-purple">
              epic
            </span>
          </div>

          {/* THE THREE STORIES, indented under it. `pl-5` and a rail: the indent alone
              reads as a list, the rail says these BELONG to the row above. */}
          <ol className="relative mt-2.5 space-y-1.5 pl-5">
            <span className="absolute bottom-2 left-1 top-0 w-px bg-ink/10" />
            {STORIES.map((story) => (
              <li key={story.id} className="flex items-center gap-2 text-xs">
                {/* The tick on the rail, `-left-5` back under it: a story `/magic:plan`
                    has actually created, which is what makes the rail read as parentage
                    rather than as decoration. */}
                <span className="relative flex items-center">
                  <span className="absolute -left-5 h-2 w-2 rounded-full border-2 border-ink/20 bg-canvas" />
                  <span className="font-mono text-ink/50">{story.id}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-ink/70">{story.title}</span>
              </li>
            ))}
          </ol>

          {/* THE OUTCOME LINE, which the product owner asked for and which the drawing was
              missing: the mark of the tracker, what happened, and a tick.
              "un logo github avec Issues created ! et un check vert à côté."

              WHY IT EARNS ITS ROW. Everything above it is a DOCUMENT — a spec, an epic, three
              stories — and a reader can look at all of that and still not know whether any of
              it left the page. This says the tickets exist on GitHub now, which is the one
              claim `/magic:plan` makes that a picture of a document cannot.

              IT IS THE LAST THING IN THE PANEL and it is deliberately NOT in the header
              beside the `approved` chip, though both are statuses. `approved` is a state of
              the SPEC and belongs to it; this is what happened AFTER the spec was agreed, so
              it reads in the order the work happened: document, tickets, done.

              THE TICK SITS NEXT TO THE LABEL, NOT AT THE END OF THE ROW, and the first
              render is why. It went in as `flex-1` on the label with the tick pushed to the
              right — the obvious way to set a footer row — and this is the panel that hangs
              `-mr-14` off the card's edge, so the tick landed squarely in the cut and the
              row shipped as a mark and a label with nothing to close it. It is the same
              mistake `ArtHeader` records one screen up, made again on the one row that had
              a reason to want the far edge. On a cropped panel there IS no far edge.

              `GithubMark` AND NOT `TicketRef`, because there is no id to show. The mark alone
              is the tracker saying it received them. */}
          <div className="mt-3.5 flex items-center gap-2 border-t border-hairline pt-3.5">
            <GithubMark className="h-3.5 w-3.5 shrink-0 text-ink/70" />
            <span className="shrink-0 text-xs font-medium text-ink/80">
              {t(WORKFLOW_CHROME.planIssuesCreated)}
            </span>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ── ② `/magic:start` ──────────────────────────────────────────────────────────────
 *
 * The ticket, and the agent it becomes.
 *
 * NOT A TERMINAL, and that is the one decision in this drawing. `/magic:start` is a
 * command you type, so a terminal is the obvious picture — and there is already one on
 * this page, two bands up: `PillarsSection` carries `StartTerminal`, which animates this
 * exact run. A second terminal 800px below the first, showing the same command, would
 * read as the page repeating itself rather than as a step of a loop.
 *
 * So the drawing shows the TRANSFORMATION instead, which is also the more honest account
 * of what the command does: a ticket goes in (its id, its title, its labels) and an agent
 * comes out (a worktree, a branch, a session with the ticket already read). The rule
 * across the middle is the moment the command runs.
 *
 * THE TWO STATUS LINES ARE `site.startCard.*`, reused word for word from the `/features`
 * start card — those lines were written against `skills/magic-start/SKILL.md` and they are
 * the two that survive a crop. STATIC, for the reason the plan card's stories are: they
 * were on `status-1` / `status-2`, the keyframes they were written for, and the first
 * render showed what that costs here. `statusIn` holds at `opacity: 0` for the first fifth
 * of an 11s loop, so for over two seconds of every eleven the bottom third of this panel
 * was blank white — and unlike on `/features`, where those lines are the whole drawing and
 * a terminal filling up is the point, here they sit under a rule in a panel that is
 * otherwise finished. An empty strip under a finished panel does not read as "still
 * working". It reads as a panel that stopped.
 *
 * THE LABEL CHIPS ARE GONE, and losing them is what buys the second status line. The card
 * carried `feat` and `webapp` under the title — decoration, and 30px of it — while the two
 * lines that actually CLAIM something (the ticket read, the plan written) came to 56px in a
 * panel with 48px left. One of them was landing half under the crop. Measured against
 * `h-56` less the `-mb-6`: header 38, then 16 + 20 + 28 + 20 for the body down to the agent
 * row, which leaves both lines inside the visible 200px with room to spare.
 *
 * CROPPED BOTTOM, AND ONLY A FEW PIXELS OFF THE RIGHT. The panel stands at `h-56` — 224px,
 * the height all four narrow panels stand at, so they line up across the grid instead of
 * each finding its own — and `-mb-6` cuts the last strip of it, which is empty panel rather
 * than a row of type. `-mr-4` is the right edge: enough that the panel is visibly a surface
 * running past the frame, not enough to reach anything worth reading. See `ART_PANEL` for
 * the round where it was `-mr-10` and took the ticket id with it.
 */
const START_STATUS: readonly MessageKey[] = ['site.startCard.ticket', 'site.startCard.plan']

export function StartAgentArt() {
  const { t } = useT()

  return (
    <div aria-hidden className="-mb-6 -mr-4 pl-7 pt-6">
      <div className={`${ART_PANEL} ${PANEL_GROUND} h-56`}>
        <ArtHeader command={COMMAND.start}>
          <TicketRef id="#142" />
        </ArtHeader>

        <div className="p-4">
          {/* THE TICKET as it arrives. Same feature as the plan card's epic — this band
              draws ONE piece of work travelling through five cards, and a different ticket
              per card would have made it five products. */}
          <p className="truncate text-sm font-medium text-ink/90">{t('site.planCard.specTitle')}</p>

          {/* THE AGENT, behind the rule the command draws. The green dot is the app's own
              "running" state and the mono name is the worktree's own directory name —
              `{repo}-{ticket}`, which is the shape `/magic:start` creates and the desktop
              sidebar lists. The branch goes UNDER it rather than beside it: the two on one
              row needed `ml-auto`, which is the arrangement that put the branch name in the
              cut. */}
          <div className="mt-3.5 border-t border-hairline pt-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green" />
              <span className="truncate font-mono text-xs font-medium text-ink/80">magic-slash-142</span>
              <span className="shrink-0 font-mono text-xs text-ink/35">feature/142</span>
            </div>

            <ul className="mt-2.5 space-y-1.5">
              {START_STATUS.map((key) => (
                <li key={key} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green" />
                  <span className="min-w-0 flex-1 truncate text-ink/60">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ── ③ `/magic:commit` + `/magic:pr` ───────────────────────────────────────────────
 *
 * The commits, on a rail, and the pull request they become.
 *
 * TWO COMMANDS ON ONE CARD, which is the card's own argument and not a shortcut: the
 * commits and the pull request are one motion — you never run `/magic:commit` without
 * `/magic:pr` behind it — and the drawing is what makes that legible. `/magic:commit` is
 * the header, the graph is its output, and the PR row at the bottom is `/magic:pr`
 * labelled where it happens.
 *
 * THE SUBJECTS ARE THIS REPOSITORY'S OWN SHAPE — `type(scope): subject`, the scopes
 * CLAUDE.md lists, the format commitlint enforces. Invented subjects would have been the
 * one thing in this drawing a reader could catch out. They are also the atomic split
 * `/magic:commit` actually produces: a feature, its test, a fix. Three and not five,
 * because three is what fits above the PR row without the graph becoming the card.
 *
 * NO ANIMATION, deliberately. A commit list is a RECORD — it is already true when you
 * look at it — where a terminal is a thing happening. Typing commits in one by one would
 * suggest the skill streams them, and it does not: it splits a working tree into atomic
 * commits and they land together. `CommitsCardMockup` makes the same call for the same
 * reason.
 *
 * THE DIFF STAT IS `green` AND `red`, the palette's two status colours, which is the one
 * place on this page they appear as themselves. They are exactly what a diff's additions
 * and deletions mean everywhere else in the product.
 *
 * NO HASH COLUMN, which `/features`'s commits panel does draw and this one cannot. That
 * panel is a full-row card with ~380px of usable width; this is a third of a row, and a
 * right-hand column there is a column standing exactly where the card's edge falls — the
 * first render came out with three hashes sliced down the middle of their first character
 * (see `ART_PANEL`). Dropping it also gives the subjects the width to be read, which is
 * the half of a commit that says what happened. The hash survives on the review card,
 * where it is cited by a reply and is the point of the row rather than metadata.
 */
const COMMITS = [
  'feat(desktop): add the split view toggle',
  'test(desktop): cover the pane resize guard',
  'fix(desktop): keep the divider inside its track',
]

export function CommitPrArt() {
  return (
    <div aria-hidden className="-mb-6 -mr-4 pl-7 pt-6">
      <div className={`${ART_PANEL} ${PANEL_GROUND} h-56`}>
        <ArtHeader command={COMMAND.commit}>
          {/* The app's own count, beside the command rather than pushed to the far edge —
              which is where the crop lands. See `ArtHeader`. */}
          <span className="truncate font-mono text-xs text-ink/40">3 ahead of main</span>
        </ArtHeader>

        <div className="p-4">
          {/* THE RAIL IS DRAWN ONCE, on the list, rather than per row: a segment per row
              has to reach across the row gap to the next dot, and every way of spelling
              that is a hand-computed height that breaks the day the spacing changes. One
              line from the first dot to the last cannot. `bottom-2` stops it at the last
              dot's centre instead of running past it into nothing. */}
          <ol className="relative space-y-2.5 pl-5">
            <span className="absolute bottom-2 left-1 top-2 w-px bg-ink/15" />
            {COMMITS.map((subject) => (
              <li key={subject} className="relative flex items-center text-xs">
                {/* `bg-canvas` inside the ring, matching the panel: the dot has to cover
                    the rail it sits on, or the line shows through the middle of it and the
                    graph reads as a dashed rule. */}
                <span className="absolute -left-5 h-2 w-2 rounded-full border-2 border-brand bg-canvas" />
                <span className="truncate font-mono text-ink/70">{subject}</span>
              </li>
            ))}
          </ol>

          {/* THE PULL REQUEST the three of them become. Its own rule above it, and the
              second command named on the row where it runs. */}
          <div className="mt-3.5 flex items-center gap-2 border-t border-hairline pt-3.5">
            <GitMerge className="h-3.5 w-3.5 shrink-0 text-purple" />
            <span className="shrink-0 font-mono text-xs font-medium tracking-tight text-brand">
              {COMMAND.pr}
            </span>
            {/* The diff stat, left-anchored with the rest of the row for the crop's sake. */}
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
              <span className="text-green">+248</span>
              <span className="text-red">-96</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ── ④ `/magic:review` + `/magic:resolve` ──────────────────────────────────────────
 *
 * One review thread, and the answer under it.
 *
 * TWO COMMANDS AGAIN, and the pairing is the same shape as the commit card's: `/magic:review`
 * reads the diff and leaves the comment, `/magic:resolve` fixes the code and replies in
 * the thread. What makes this card work is that the two halves are VISIBLY the same
 * conversation — the reply is indented under the comment, on the same rail idiom the plan
 * card uses for its stories.
 *
 * THE COMMENT IS A REAL ONE. It is this repository's own house rule, the conflicting-
 * utility argument `components/ui.tsx` and `Shell.tsx` both spend paragraphs on — a
 * `className` racing a recipe, decided by stylesheet order. A generic "please fix this"
 * would have been the drawing admitting it had nothing to say; a comment a reader can
 * evaluate is the one that says a review happened.
 *
 * THE REPLY CITES A HASH, and it is `a3f1c92` — the first commit on the card to the left.
 * The same piece of work travels through all five drawings, so the fix lands on the commit
 * the previous card created.
 *
 * `Resolved` IS STATIC, and it was the card's one moving part — arriving last, on
 * `status-3`, with the thread and its answer already in place. It is the same lesson the
 * other two drawings learned on the first render, in its sharpest form: `statusIn` starts
 * hidden and holds there for a fifth of an 11s loop, and what was hidden here was the
 * PUNCHLINE. A review card whose only claim is that the thread got closed spent two
 * seconds in eleven as a review card that shows a comment and no answer.
 *
 * The band keeps exactly one moving element and it is the done card's checklist, which can
 * afford it: `done-N` opens at 6% of a 5s loop, so those rows are struck through ~300ms in
 * and stay that way — a cleanup that runs again rather than a panel with a hole in it.
 *
 * CROPPED LIKE ITS TWO NEIGHBOURS — `h-56`, `-mb-6`, `-mr-4` — and it started the other
 * way round: cut on the RIGHT and not at the bottom, on the argument that a comment is
 * prose and prose reads badly with its bottom cut off. That argument was right about
 * prose and wrong about which edge. A paragraph in a panel 90px wider than its card wraps
 * to the PANEL's width, so the right-hand cut fell inside the sentence — every line of the
 * comment lost its last two words, which is the one thing worse than a paragraph ending
 * early. Now the panel fits the card, the comment wraps where the reader can see it, and
 * the only cut is the bottom strip of empty panel the other two lose as well.
 */
export function ReviewResolveArt() {
  return (
    <div aria-hidden className="-mb-6 -mr-4 pl-7 pt-6">
      <div className={`${ART_PANEL} ${PANEL_GROUND} h-56`}>
        <ArtHeader command={COMMAND.review}>
          <TicketRef id="#142" />
        </ArtHeader>

        <div className="p-4">
          {/* THE FILE AND THE LINE, in mono: what a review comment is anchored to, and
              the first thing anybody reads on one. */}
          <p className="truncate font-mono text-xs text-ink/45">
            webapp/components/site/home/Shell.tsx:42
          </p>

          <div className="mt-2.5 flex items-start gap-2.5">
            {/* The reviewer, as the app draws an author: an initial on a tinted disc.
                `accent` and not `brand` — this is a decorative tile, not a control, which
                is the split `tailwind.config.ts` spends its longest note on. */}
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-semibold text-accent">
              R
            </span>
            <p className="min-w-0 text-xs leading-relaxed text-ink/70">
              This padding races the recipe — pass it through the slot instead.
            </p>
          </div>

          {/* THE ANSWER, indented under the comment on the plan card's rail idiom: the
              indent makes it a reply, the rail makes it the SAME thread. */}
          <div className="relative mt-3 pl-5">
            <span className="absolute bottom-3 left-1 top-0 w-px bg-ink/10" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-medium tracking-tight text-brand">
                {COMMAND.resolve}
              </span>
              <span className="truncate font-mono text-xs text-ink/45">a3f1c92</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green" />
              <span className="text-xs font-medium text-green">Resolved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ── ⑤ `/magic:done` ──────────────────────────────────────────────────────────────
 *
 * The merge, and the three things that disappear behind it.
 *
 * THE BADGE IS THE CARD. `Merged` in purple is the one state in this whole loop that a
 * developer recognises at a glance from across a room, and the three cleanup rows under it
 * only mean anything once it is true — which is also the skill's own order: it CONFIRMS
 * the merge first and does nothing at all if it cannot (`skills/magic-done/SKILL.md`, and
 * `DoneChecklistMockup.tsx`'s header audits the rest of it line by line).
 *
 * THREE ROWS AND NOT FIVE. `/features`'s done card draws all five things the skill closes
 * out, because that page is where the promise is made in full. Here the merge is the badge
 * and the agent line does not fit a card this size, so what is left is the three the
 * reader came for: the branch, the worktree, the ticket. All three are `site.doneCard.*`
 * word for word — see this file's header for why they are borrowed rather than rewritten.
 *
 * THEY STRIKE THROUGH AS THEY GO, reusing `done-1` … `done-3` and `strike-1` … `strike-3`.
 * That is the /features done card's motion — a tick landing on an empty box, and a bar
 * whose WIDTH grows across the label rather than an opacity that fades in, because a line
 * that fades has already crossed the word before you see it. It is the right motion for
 * this card too and there is no case for a fourth family of keyframes: `tailwind.config.ts`
 * documents the pair, and both rest on the finished state so reduced motion shows three
 * things done rather than three things pending.
 *
 * CROPPED AT THE BOTTOM, like the other three narrow panels, and the cut falls just under
 * the last row rather than through it: header 38, then 16 + 26 + 28 for the badge and its
 * rule, then three 20px rows with 10px between them comes to 188 of the visible 200.
 */
const CLEANUP: readonly { key: MessageKey; tick: string; strike: string }[] = [
  { key: 'site.doneCard.branch', tick: 'animate-done-1', strike: 'animate-strike-1' },
  { key: 'site.doneCard.worktree', tick: 'animate-done-2', strike: 'animate-strike-2' },
  { key: 'site.doneCard.ticket', tick: 'animate-done-3', strike: 'animate-strike-3' },
]

export function MergeCleanArt() {
  const { t } = useT()

  return (
    <div aria-hidden className="-mb-6 -mr-4 pl-7 pt-6">
      <div className={`${ART_PANEL} ${PANEL_GROUND} h-56`}>
        <ArtHeader command={COMMAND.done}>
          <TicketRef id="#142" />
        </ArtHeader>

        <div className="p-4">
          {/* THE MERGED BADGE. `purple` is the palette's own — the same token the commit
              card's `GitMerge` glyph wears, and the colour every git host has agreed
              means merged. A filled pill rather than an outlined one: this is the only
              thing on the card that is a STATE rather than a step. */}
          <div className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-purple px-2.5 py-1 text-xs font-semibold text-white">
              <GitMerge className="h-3.5 w-3.5" />
              Merged
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-ink/50">{t('site.doneCard.merged')}</span>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2.5 border-t border-hairline pt-3.5">
            {CLEANUP.map((row) => (
              <li key={row.key} className="flex items-center gap-2.5">
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  {/* The empty box is always there and the tick lands ON it: `CheckCircle2`
                      is that same circle plus a polyline, so one opacity is enough and
                      there is nothing to crossfade. */}
                  <Circle className="absolute h-4 w-4 text-ink/20" />
                  <CheckCircle2
                    className={`absolute h-4 w-4 text-green ${row.tick} motion-reduce:animate-none`}
                  />
                </span>
                {/* `relative w-fit` so the bar spans the TEXT and not the row — a line
                    running to the panel's edge past the end of a short label reads as a
                    rule rather than as a strike-through. */}
                <span className="relative min-w-0 max-w-full">
                  <span className="block truncate text-xs text-ink/70">{t(row.key)}</span>
                  <span
                    className={`absolute left-0 top-1/2 h-px w-full bg-ink/40 ${row.strike} motion-reduce:animate-none`}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
