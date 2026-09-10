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
 * ── ③ `/magic:commit` + `/magic:pr` ──────────────────────────────────────────────
 *
 * A GIT GRAPH ON THE CARD ITSELF, RUNNING DOWN IT: the branch, three commits with their
 * hashes, and a green label where the pull request opened.
 *
 * NO PANEL. This is the only drawing in the band without the off-white plate, at the
 * product owner's word ("supprime le cadre blanc enfaite"), and the shape is
 * `CommitGuardArt`'s from the security band — a line, dots on it, and one node at the end
 * that says what happened.
 *
 * VERTICAL, WHICH IS THE SECOND PASS. It was horizontal first, exactly like the card it
 * copies, and the owner asked for the axis turned. That is the better call for this card
 * and the reasons are the card's own rather than a matter of taste:
 *
 *   • THE CARD IS A THIRD OF A ROW AND TALL. A horizontal graph used ~310px of width and
 *     88 units of height, which left the bottom half of a `stacked` card carrying a
 *     30px strip; the vertical one fills the space the copy does not.
 *   • A VERTICAL GRAPH IS WHAT A GIT CLIENT DRAWS. `git log --graph`, every desktop
 *     client and the app's own info sidebar run their commits down the page with the ref
 *     at the top — so the axis is the one a developer reads without being told.
 *   • THE HASHES SIT BESIDE THEIR DOTS rather than above them, which is where a log puts
 *     them, and there is room for a seven-character hash at every rung. On the horizontal
 *     version they were centred over each dot, which works and is not what a log does.
 *
 * WHAT WENT WITH THE PANEL, said plainly rather than left to be noticed:
 *
 *   • THE COMMAND. `/magic:commit` was in the panel's `ArtHeader`, and this card no
 *     longer draws a command anywhere — the reference's own arrangement, since the
 *     security band's cards name no skill either. What stands in its place is the REF: a
 *     `feature/142` chip at the top of the line, which is what makes three dots read as a
 *     git graph rather than as three steps. The card's title says "Commit and open the PR"
 *     two inches above, so nothing is unclear; it is simply not spelled in mono.
 *   • THE SUBJECTS. `feat(desktop): …` and its two neighbours are gone; the HASHES replace
 *     them, and they are `AppWindowMockup`'s own three (`a3f1c92`, `7b40e18`, `c1d8a05`,
 *     in that order) — the app's info sidebar prints exactly those, so the two drawings on
 *     this page are the same three commits. THE AXIS COULD CARRY SUBJECTS AGAIN, which the
 *     horizontal one could not: there are ~200 units of width beside each hash. They are
 *     left out because the drawing now says one thing per row and reads in a glance.
 *   • THE `3 ahead of main` COUNT, which three dots say by being three.
 *
 * ── AND THE ONE THING THE VERTICAL AXIS GIVES UP ──────────────────────────────────
 *
 * THE CROP. `CommitGuardArt`'s line runs off the card's LEFT edge, and that note is
 * emphatic about why: a line that begins inside the frame claims the branch starts there,
 * and no branch does. A vertical line cannot do that here — the top of this drawing is
 * where the card's copy ends, not where the card ends, so a line reaching the box's top
 * edge would start abruptly under a paragraph rather than come from off-frame.
 *
 * SO THE CHIP CARRIES IT INSTEAD. The line starts at the ref's bottom edge, which is
 * exactly what `git log` prints first — `HEAD -> feature/142`, then the commits under it
 * — and a ref at the top of a graph says "this is the branch you are on" rather than
 * "history begins here". The claim survives; the technique changed with the axis.
 */

/**
 * The two hashes, in the order the app's own sidebar lists them — see the header for why
 * they are its hashes and not invented ones.
 *
 * TWO, WHERE IT WAS THREE, at the owner's ask. `CommitGuardArt` made the same cut for the
 * same reason and wrote down the principle: "a drawing gets bigger either by growing its
 * contents or by having fewer of them, and doing both at once is what keeps the graph
 * from running out of card". Three rungs at this zoom put the box at 264 units, which
 * grew the whole second row of the grid; two bring it back to 216 and give that height
 * back to the cards beside it.
 *
 * IT ALSO STILL READS AS A SERIES, which is the thing to check when cutting a rung: two
 * dots between a ref and a pull request are two commits ON a branch, where two dots alone
 * would be a pair. The chip above and the capsule below are what carry the sequence, so
 * the third rung was paying for a rhythm the ends already establish.
 *
 * THE ATOMIC SPLIT IS STILL THE CLAIM, and the card's copy says "atomic commits" in the
 * plural — two is a plural. `c1d8a05`, the refactor, is the one that goes: of the app's
 * three it is the one whose absence changes nothing about what the drawing says.
 */
const COMMITS = ['a3f1c92', '7b40e18']

/**
 * WHERE THE GRAPH SITS IN ITS 284×216 BOX, as the one table the drawing is built on.
 *
 * The viewBox is ~284 units against the ~284px of card the drawing gets at `lg`, so a
 * unit is about a pixel and every number below can be read as one. `w-full` does the work
 * at every other width, where the graph scales with the card rather than reflowing.
 *
 * ── EVERY NUMBER WENT UP BY HALF, AT THE OWNER'S ASK ─────────────────────────────
 *
 * "Zoom un peu beaucoup plus sur l'illustration, j'aimerai qu'elle soit beaucoup plus
 * grosse." The dial is NOT the viewBox here, which is the trick `CommitGuardArt` uses
 * (fewer units across the same pixels): that card is one wide object and its box IS its
 * drawing, where this one has a fixed ~284px column and a height that follows its
 * contents. Shrinking the box would have zoomed the width it does not have to spare and
 * cropped the label.
 *
 * SO THE CONTENTS GREW INSTEAD, all of them by ~1.5: the dots are 20 units across where
 * they were 14, the line is 4 where it was 3, the type is 14 where it was 10, and the
 * label is 46 tall where it was 32. The box grew with them, 196 units to 264 — and then
 * back to 216 when the third commit went (see `COMMITS`), which is the trade the guard
 * rail's own note predicts: fewer rungs is how a drawing gets bigger without taking the
 * height from the cards beside it.
 *
 * THE PITCH GREW LESS THAN THE DOTS — 42 to 52, a quarter against a half — which is the
 * one place the scale is deliberately not uniform. `CommitGuardArt` records the same
 * tension: at a uniform 1.5 the commits would have spanned 63 units apiece and the graph
 * would have run out of card. Tighter spacing on bigger dots also reads as one branch
 * rather than a column of marks, which is what a git graph should look like.
 *
 * `AXIS` IS THE LINE'S x AND EVERYTHING HANGS OFF IT: the dots' centres, the chip's own
 * left inset and where the label's top edge meets the line. Moving the graph left or
 * right is one number rather than eight.
 */
/**
 * THE LINE'S x, AND IT IS NOW THE BOX'S OWN CENTRE LINE.
 *
 * Every horizontal number is derived from it — the ref chip and the capsule are CENTRED on
 * it, the hashes sit 26 units to its right — so the graph moves as one object by this one
 * number, and at 142 of 284 it is the middle of the box.
 *
 * ── THE THREE ROUNDS THIS NUMBER TOOK, because each was wrong in a way the next fixed ──
 *
 *   1. 26 — the graph against the left edge of its box, with the two pills hanging off the
 *      line to the right of it. Fine while the drawing was a crop and wrong once it was an
 *      object in a card.
 *   2. 84 — the CAPSULE centred in the box (`(284 - 162) / 2 + 23`), which is centred by
 *      arithmetic and read left all the same: the drawing's weight is the axis itself, an
 *      opaque bar and its discs, and those still stood at 30% of the width.
 *   3. 104 — a compromise that could not be one for long, since the pills reached far to
 *      the right of a line that was still left of centre.
 *
 * WHICH THE OWNER SETTLED BY ASKING FOR THE PILLS THEMSELVES TO BE CENTRED ("centre aussi
 * le point PR et le nom de la branche"), and that is the arrangement that has no
 * compromise in it: with both of them centred ON the axis, centring the axis centres the
 * ref, the branch, the commits and the pull request at once. The hashes are the one thing
 * left of it — they sit beside their dots, where a log puts them — and 26 + ~93 units of
 * them fits inside the box's right half with room to spare.
 *
 * IT IS AN OFFSET AND NOT PADDING, which is what the owner asked for by mechanism one
 * round earlier ("met plus de padding left") and the one thing that would have cost
 * something: the svg is `w-full`, so left padding both shifts the box right AND narrows
 * it — 28px of it takes 10% off a drawing that has twice been asked to be bigger. Moving
 * the axis inside the viewBox is the same shift for free, and the wrapper stays `px-7`.
 */
const AXIS = 142

/**
 * The two commits' y, at the same 52-unit pitch the three used. Dropping a rung shortened
 * the box rather than spreading what was left: a pitch stretched to fill the old height
 * would have put 78 units between two dots, which reads as two unrelated marks on a line.
 */
const DOTS = [78, 130]

/**
 * The ref chip's box. 118 × 28 at `fontSize` 14 is eleven characters of monospace (~93
 * units, measured) with thirteen either side — see the chip's own note in the markup.
 *
 * ITS WIDTH IS A CONSTANT because the centring needs it: `AXIS - CHIP.w / 2`. It was a
 * literal in the `rect` while the chip hung off the axis and nothing else read it.
 */
const CHIP = { w: 118 }

/**
 * WHAT THE GREEN CAPSULE SAYS, and it is the app's own ticket status rather than a phrase
 * written for this drawing.
 *
 * `site.status.prCreated` IS LIVE COPY: `/features`'s `TicketCardMockup` draws the
 * product's nine statuses and this is one of them — in `bg-green/20 text-green`, the same
 * green this capsule is filled with. So the words, both languages of them and the colour
 * were already decided; borrowing the key means the card and the product cannot come to
 * call one state two things. `START_STATUS` above borrows `site.startCard.*` from the
 * same page for the same reason, and `features.test.ts` pins it from that side — which is
 * why this one needs no entry in `WORKFLOW_CHROME`, unlike the plan card's own line.
 *
 * IT WAS THE LITERAL `'PR created'` until the owner asked for it to follow the reader's
 * language, and adding a `site.workflow.prCreated` pair was the first thing tried: a twin
 * of a key that already existed, in both languages, three files away.
 */
const PR_CREATED: MessageKey = 'site.status.prCreated'

/**
 * THE LABEL'S FIXED GEOMETRY, and everything about it that the WORDS do not decide.
 *
 * `y` and `h` place it on the branch; `pad`, `glyph` and `gap` lay out its contents; the
 * WIDTH is not here, because it depends on a string that is not known until a language
 * is. See `labelBox` below.
 */
const LABEL = { y: 164, h: 46, size: 16, pad: 18, glyph: 20, gap: 10 }

/**
 * THE CAPSULE'S BOX FOR A GIVEN LABEL: how wide it is, and where it starts.
 *
 * A FUNCTION AND NOT A CONSTANT, WHICH IS WHAT TRANSLATION COST. There is no layout
 * inside an `svg` — a `rect` has a `width` and nothing measures its contents — so the box
 * has to be arithmetic, and the arithmetic now runs per render because the string is
 * `t()`'s and not this file's. "PR created" is ten characters and "PR créée" is eight, so
 * the French capsule is 19 units narrower; both stay centred because `x` is derived from
 * the width rather than typed.
 *
 * `CHAR` IS THE ADVANCE OF ONE GLYPH at `LABEL.size`, and 0.6em is MEASURED rather than
 * assumed: `getComputedTextLength()` on the rendered English label returns 96.28 units
 * for its ten characters at 16, which is 9.628 apiece against the 9.6 this computes — a
 * third of a unit over the whole word. That is the one number here that is not exact, so
 * it is the one to re-measure if the mono family ever changes: too small and the right
 * padding closes up, too large and it gapes.
 *
 * `normalize('NFC')` BEFORE COUNTING, and it is not decoration: "créée" written with
 * combining accents is eight code points where it is six glyphs, and a monospace advance
 * is per GLYPH. The French catalogue is precomposed today; this is what keeps the box
 * right if a future entry is not.
 *
 * WHICH MAKES THE PADDING SYMMETRICAL BY CONSTRUCTION rather than by eye: the box is
 * `pad + glyph + gap + text + pad`, so the gap before the glyph and the gap after the last
 * character are the same 18 units in every language.
 *
 * THE GLYPH'S OWN BEARING IS WHY THE TWO SIDES CAN STILL LOOK UNEQUAL. The mark occupies a
 * 20-unit box but its ink starts a unit or two inside it, so the VISIBLE gap on the left
 * reads a little wider than the one after the last character. That is optical and not
 * arithmetic; correcting it would mean pulling the box off its own padding, which is the
 * kind of nudge that is wrong again the next time the label is reworded.
 */
function labelBox(text: string) {
  const CHAR = LABEL.size * 0.6
  const w =
    LABEL.pad + LABEL.glyph + LABEL.gap + text.normalize('NFC').length * CHAR + LABEL.pad
  return { w, x: AXIS - w / 2 }
}

export function CommitPrArt() {
  const { t } = useT()
  // THE WORDS FIRST, THEN THE BOX. `labelBox` needs the resolved string, so the capsule's
  // width and its x are per-render values now — the one thing the translation changed
  // about this drawing besides the copy itself.
  const prCreated = t(PR_CREATED)
  const label = labelBox(prCreated)

  return (
    // `px-7` — THE CARD'S OWN PADDING, EQUAL ON BOTH SIDES. The other four drawings in
    // this band add `pl-7` and pull their right and bottom edges out, because they are
    // panels that bleed; this one is an OBJECT and respects the card's margins.
    //
    // IT WAS `pl-11 pr-7` FOR ONE ROUND, deepening the left inset so the graph sat in from
    // the copy above it. That reading was right while the drawing hugged the left edge of
    // its box and wrong the moment it was centred: an asymmetric box puts a centred
    // drawing 8px off the card's own middle, which is a near-miss rather than a margin.
    //
    // EVERY HORIZONTAL SHIFT SINCE LIVES IN `AXIS` INSTEAD, for the reason stated there:
    // padding on a `w-full` svg buys a shift by spending size.
    //
    // The horizontal version had no left padding at all, so its branch could reach the
    // card's edge and be cut there; see the header for why the vertical axis cannot use
    // that and what replaced it.
    <div aria-hidden className="px-7 py-2">
      <svg viewBox="0 0 284 216" className="h-auto w-full" fill="none">
        {/* THE REF, AS A CHIP, AND IT IS THE TOP OF THE LINE: `feature/142`, the branch
            the three commits are on and the one the start card two along already prints
            beside its worktree. The line begins at its bottom edge, which is how `git
            log` opens — the ref, then the commits under it.

            NO PADLOCK, unlike the chip this borrows its shape from: that one is `master`
            on the card about a protected branch, where the lock IS the claim. Nothing
            about a feature branch is protected, and a lock here would be decoration
            wearing a meaning.

            `rx=6` on a 20-unit box — a ref chip, not a capsule. The note on
            `CommitGuardArt`'s own chip argues that at length: a pill reads as a status
            badge, something the branch IS, where this says what it is CALLED.

            WHITE AT THREE STRENGTHS, the `midnight` mirror of that card's three inks: 6%
            for the fill, 16% for the border, 60% for the name. The geometry is measured
            off the type — eleven characters of monospace at `fontSize` 10 is ~66 units,
            plus seven either side, so the chip is 80 wide. Rename the branch and this
            number moves.

            IT IS CENTRED ON THE LINE, at the owner's ask along with the capsule ("centre
            aussi le point PR et le nom de la branche"). It hung off the axis to the right
            for two rounds, on the reading that a ref hangs off the TIP of a branch and a
            chip the line bisects reads as a node — which is true of a ref annotation
            beside a horizontal graph, and beside the point here: at the top of a vertical
            line the chip is a HEADER, and a header sits over its column.
            
            IT ALSO SETTLES THE JOINT. Hanging right, the bar left the chip's bottom edge
            three units past the end of an `rx=8` corner — clear of the curve, but only
            just, and only at this radius. Centred, it leaves from the middle of a
            118-unit edge, where nothing can crowd it.

            `textAnchor="middle"` ON THE NAME rather than a computed left inset, so the
            text is centred on the same axis as the box around it: rename the branch and
            only the chip's own width has to move.

            118 × 28 AT `fontSize` 14, which is the zoomed round of the same arithmetic:
            eleven characters of monospace at 14 is ~92 units, plus thirteen either side.
            The type is the one thing that did NOT grow by half — 10 to 14 rather than to
            15 — for the reason that card's own chip records at every rescale: a mono ref a
            hair above the body copy reads as deliberate, one level with a heading reads as
            a heading nobody asked for. */}
        <g>
          <rect
            x={AXIS - CHIP.w / 2}
            y="6"
            width={CHIP.w}
            height="28"
            rx="8"
            fill="#FFFFFF"
            fillOpacity="0.06"
            stroke="#FFFFFF"
            strokeOpacity="0.16"
            strokeWidth="1"
          />
          <text
            x={AXIS}
            y="20"
            textAnchor="middle"
            dominantBaseline="central"
            className="font-mono"
            fontSize="14"
            fill="#FFFFFF"
            fillOpacity="0.6"
          >
            feature/142
          </text>
        </g>

        {/* THE BRANCH, from the ref's bottom edge to the label's top edge. One path and
            not a segment per gap: a segment per gap is a hand-computed length that breaks
            the day the pitch changes, and this one is two numbers that already exist.

            WHITE AT 85%, the same value as the dots, on `CommitGuardArt`'s own argument:
            the branch and its commits are one object, and a line paler than the dots it
            carries reads as a rule they were placed on. */}
        {/* SIX UNITS WIDE, up from four at the owner's ask ("j'aimerai que la bar qui
            relit tout les points soit plus large"). At 20-unit dots that is a bar the
            commits sit ON rather than a rule they were placed against, which is the
            reading `CommitGuardArt` argues for when it paints its own line in the dots'
            colour — one object, not marks on a hairline.
            
            AND IT IS FULL WHITE, like the dots: both were at 85% and both are now opaque,
            same ask ("j'aimerai que les point ne soit pas transparent"). On `midnight` the
            15% it gave up was reading as grey rather than as depth.

            IT ENDS EIGHT UNITS INSIDE THE CAPSULE, not on its edge. The capsule is opaque,
            so the overlap is invisible and it is what guarantees there is no hairline of
            card showing between the two at any device pixel ratio — a line that stops
            exactly on an arc leaves antialiasing to decide whether they touch. */}
        <path d={`M${AXIS} 34V${LABEL.y + 8}`} stroke="#FFFFFF" strokeWidth="6" />

        {DOTS.map((y, index) => (
          <g key={COMMITS[index]}>
            {/* FLAT WHITE, where the reference gives its commits a two-stop gradient "to
                keep three dots from looking like three dots". These three have a hash
                beside each, so they are already three distinct things — and a gradient on
                a 20-unit white disc against near-black is a fraction of the modelling it
                gets against `sky`.
                
                OPAQUE, where both the dots and their line spent a round at 85%: on this
                ground that alpha read as grey paint rather than as a lighter black, which
                is the opposite of what it was for. */}
            <circle cx={AXIS} cy={y} r="10" fill="#FFFFFF" />
            {/* THE HASH, beside its dot and on its axis. `dominantBaseline="central"`
                sits it on the dot's centre rather than on its own baseline, which is what
                lets a 10-unit label and a 14-unit disc share one y.

                AT 40% WHITE, a third of the graph's own strength: a hash is what a dot IS,
                not what the drawing is about, so the eye lands on the line and the label
                first and reads the hashes second. */}
            <text
              x={AXIS + 26}
              y={y}
              dominantBaseline="central"
              className="font-mono"
              fontSize="14"
              fill="#FFFFFF"
              fillOpacity="0.4"
            >
              {COMMITS[index]}
            </text>
          </g>
        ))}

        {/* THE PULL REQUEST, as the graph's last node.
            
            A CAPSULE — `rx` IS HALF THE HEIGHT, so each end is a true semicircle. It was
            `rx=10` on a 46-unit box for one round, on the argument this file's other chip
            still makes: a pill reads as a status BADGE, something a thing IS, where a
            softly rounded rectangle reads as a name. The owner asked for the capsule
            ("j'aimerai que le dernier point PR soit bien arrondi ! et pas seulement de
            quelque pixel. vraiment comme un demi-cercle sur chaque côté") and it is the
            right call here, which is worth saying rather than merely complying: "PR
            created" IS a state, not a name — and the band's other filled state chip, the
            `done` card's `Merged`, is `rounded-full` for exactly that reason. The ref chip
            above keeps `rx=8` because `feature/142` is a name.
            
            IT IS ALSO A NODE ON THE LINE, which is what a capsule says better than a
            rounded box did: a circle at each end, one of them exactly where the branch
            arrives.
            its round end is CENTRED on the line — see `labelBox` for why the whole capsule
            is, and for the joint that arrangement retires.
            
            ITS WIDTH IS `labelBox`'s, measured off the translated words, and its `x`
            comes from the same call so it stays centred in every language — see that
            function for the arithmetic and for what translation cost.

            IT IS 2.3× THE COMMITS, near enough the ratio `CommitGuardArt`'s refusal disc
            keeps against its own dots — this is the thing on the card a reader should
            catch without looking for it, and unlike a disc it can carry a glyph and two
            words.

            AND IT IS GREEN WHERE THAT ONE IS RED, at the same position in the same graph:
            there the last node is a commit that was REFUSED, here it is a pull request
            that OPENED. `green` is the declared status token, #22C55E, spelled as a
            literal for the reason every colour in an SVG here is — a `fill` cannot take a
            Tailwind class.

            SOLID, AT THE OWNER'S ASK ("j'aimerai que le point vert ne soit pas
            transparent mais vert plein"), and the change is three things rather than one:
            
              • THE FILL IS THE FULL TOKEN. It was 16% over `midnight`, which read as a
                tinted outline — the shape of a chip rather than a node ON the line. At
                full strength it is the only saturated surface on the card, which is what
                a terminal node should be.
              • THE BORDER GOES. A 45% ring existed to give a translucent fill an edge; a
                solid one is its own edge, and a ring in the fill's own colour on top of it
                is a seam.
              • THE INK FLIPS TO WHITE. Green-on-green is unreadable, so the glyph and the
                words are white — which is exactly what the `done` card's `Merged` badge
                does with `purple`, the band's other filled state chip. That badge is the
                precedent for the whole shape, and the two now read as the same kind of
                object two cards apart. */}
        <g>
          <rect
            x={label.x}
            y={LABEL.y}
            width={label.w}
            height={LABEL.h}
            rx={LABEL.h / 2}
            fill="#22C55E"
          />
          {/* LUCIDE'S OWN `GitPullRequest`, PATH FOR PATH, on its own 24-unit grid inside a
              `transform` rather than redrawn at this size. That is what keeps it the same
              mark the rest of the site draws: the icon component cannot be placed at an
              `x`/`y` inside an `svg`, and retracing it by hand is how a glyph drifts. The
              scale is `LABEL.glyph / 24`, so the mark is exactly as many units as the
              table says and its `strokeWidth={2}` comes down with it — proportions survive
              a transform, which is the property `AppWindowMockup` relies on at the other
              end of the page. Both it and the text are positioned off `LABEL`'s own
              paddings, so nothing here needs moving when the label is reworded.

              A PULL REQUEST AND NOT A MERGE, which is what the row this card used to end
              on drew: nothing is merged here, that is the `done` card two along. */}
          <g
            transform={`translate(${label.x + LABEL.pad} ${LABEL.y + (LABEL.h - LABEL.glyph) / 2}) scale(${LABEL.glyph / 24})`}
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <path d="M6 9v12" />
          </g>
          <text
            x={label.x + LABEL.pad + LABEL.glyph + LABEL.gap}
            y={LABEL.y + LABEL.h / 2}
            dominantBaseline="central"
            className="font-mono"
            fontSize={LABEL.size}
            fontWeight="500"
            fill="#FFFFFF"
          >
            {prCreated}
          </text>
        </g>
      </svg>
    </div>
  )
}

/**
 * ── ④ `/magic:review` + `/magic:resolve` ──────────────────────────────────────────
 *
 * A BLACK TERMINAL RUNNING `/magic:resolve`, and it lives in
 * `components/site/home/ResolveRunTerminal.tsx` rather than here.
 *
 * WHY IT MOVED OUT of this file, where the other four drawings are: it is the only one
 * with STATE. It types a command, walks five steps through a spinner and a check apiece,
 * and loops while it is on screen — which needs `'use client'`, two hooks and a shared
 * run engine (`./terminalRun`, extracted from the skills band's own terminal for it). The
 * other four are static markup this module can hold in twenty lines each.
 *
 * WHAT IT REPLACED, and the argument is worth keeping because it was made at length here:
 * this card used to draw a review THREAD — the file and line, a real comment about a
 * `className` racing a recipe, and a reply indented under it on the plan card's rail
 * idiom. Every part of that was static, and the paragraph that stood here explained why:
 * `Resolved` had been the card's one moving part, arriving on `status-3`, and a punchline
 * that is hidden for the first fifth of an 11s loop is a review card claiming a thread was
 * answered while showing no answer.
 *
 * THE TERMINAL SETTLES THAT RATHER THAN INHERITING IT. In a played-back session every line
 * is either running or finished, and the resting state — no JavaScript, reduced motion, or
 * simply not scrolled to yet — IS the finished transcript. There is no frame of it that
 * reads as a panel with a hole in it, which is the exact failure the static version was
 * pinned in place to avoid. The product owner asked for the terminal and for the skills
 * band's animation; those two turn out to be the same request.
 *
 * ONE MOVING DRAWING IN THE BAND BECAME TWO. The other is the done card's checklist, whose
 * rows strike through on `done-N`, and the note there still holds: a row that arrives ~300ms
 * into a 5s loop is a cleanup running again rather than a panel waiting to render. Nothing
 * else in this file animates.
 */

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
          {/* THE MERGED BADGE. `purple` is the palette's own, and the colour every git
              host has agreed means merged — it is now the band's ONLY merge glyph, the
              commit card having traded its own for lucide's `GitPullRequest`, drawn as
              paths inside its graph (nothing is merged two cards early). A filled pill rather than an outlined one: this is the only
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
