'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  CircleStop,
  ExternalLink,
  FolderGit2,
  Globe,
  X,
} from 'lucide-react'
import {
  BranchCard,
  CommitCard,
  HeaderRepoCard,
  RepositoryCard,
  ScriptCard,
  UnCommittedChangesCard,
} from '@ds/desktop'
import { Github, Play, VSCode } from '@ds/desktop/icons'
import { useT } from '@/lib/i18n/useLanguage'
import { SCRIPT_GROUPS } from './InfoSidebarMockup'
import { AppGround } from '../AppGround'

/** Nothing is listening: these are drawings, and a hash nobody can copy is still a hash. */
const noop = () => undefined
import { Pointer } from '../Pointer'
import { GithubMark } from './TasksModalMockup'
import { useLoopStep } from './useLoopStep'

/**
 * The info sidebar's repository card — `RepositoryCard.tsx` — redrawn: at rest, with
 * commits on the branch and files changed since (`RepoCardMockup`), and telling one
 * story, a dev server started from the Scripts menu (`DevServerMockup`).
 *
 * DRAWN CLASS FOR CLASS from `agent-info-sidebar/RepositoryCard.tsx`, `RunningScripts.tsx`
 * and `ScriptsDropdown.tsx`:
 *
 *   1. THE HEADER, `flex items-center gap-2 mb-2`: the repo's `w-6 h-6 rounded-lg` tile,
 *      tinted with its project colour at 12% and carrying a `w-3.5` folder; the name at
 *      `text-sm font-medium` at 90% ink; and on the right the three dashed buttons —
 *      Scripts with its play and `w-2.5` chevron, Open in the editor, Open on GitHub —
 *      each `px-1.5 py-0.5 text-[10px] font-semibold` in icon ink, then the `w-3.5` cross.
 *   2. THE RUNNING SCRIPTS, straight under the header and absent until one runs: a filled
 *      `ScriptCard`, the component — the purple bar, its loader, the worded Stop chip
 *      and the address row that hangs off it once the server prints one. What was drawn
 *      here instead included a hand-built copy of the app's wave loader, which the
 *      design system had already had for a while.
 *   3. THE BRANCH, one `px-2 py-1.5` pill on the raised surface: a green branch glyph, the
 *      name in green at `text-xs font-medium`, the copy button pushed right.
 *   4. THE UNCOMMITTED BLOCK, `p-2` on the raised surface: the label, the file count, the
 *      `+/-` totals, six `w-1.5 h-1.5` squares green in proportion to the additions, then
 *      one `py-0.5` row per file — the basename in mono at 60%, its own `+/-` at 10px.
 *   5. THE COMMITS BLOCK, the same surface: the label and "N ahead of main", then one row
 *      per commit — subject at 60%, age at 40%, the short hash in a mono pill with a copy
 *      glyph.
 *   6. THE SCRIPTS MENU (`ScriptsDropdown`'s portal), 280px wide on the secondary
 *      background with a 50% border and a lifted shadow, hung 4px under the trigger and
 *      right-aligned to it: a `GroupHeader` per category — `px-3 py-1.5 text-[10px]
 *      uppercase tracking-wider font-semibold` at 40% on the tertiary background at 30% —
 *      and a `ScriptRow` per script — a `w-3` accent play, the name at `text-xs
 *      font-medium`, and `pnpm <name>` at 10px pushed right.
 *
 * THE CARD AT REST SHOWS BOTH BLOCKS AT ONCE — three commits already on the branch and
 * two files changed since — because that is what a card looks like mid-task, and it is
 * the state that says the most in one glance. The server story is a STORYBOARD: a
 * handful of beats on one loop, each a state of the card, through `useLoopStep` — the
 * menu opens, the `dev` row is hovered and clicked, the menu closes on a purple running
 * bar, then the address arrives under it.
 *
 * THE POINTER in the server story is measured, not placed: the Scripts button and the
 * `dev` row are refs, and the arrow is positioned off their boxes when the beat that aims
 * at them arrives.
 *
 * COLOURS ARE THE APP'S, through the tokens the Tailwind config declares for these
 * reproductions: `appbg` for its three backgrounds, `appline` for `border`, `blue` for the
 * project tile (`PROJECT_COLORS[0]`), `purple` for a running script, and the white-alpha
 * ramp for `surface`, `surface-strong` and `line-subtle`.
 *
 * `aria-hidden`: they are drawings, and a Stop button that stops nothing should be
 * announced to nobody.
 */

const REPO_COLOR = '#3B82F6'

/** The two files the agent has touched since its last commit. */
const FILES: readonly { file: string; added: number; removed: number }[] = [
  { file: 'vat.ts', added: 4, removed: 1 },
  { file: 'vat.test.ts', added: 14, removed: 0 },
]

/** The three commits already on the branch, newest first, as `git log` hands them over. */
const COMMITS: readonly { subject: string; age: string; hash: string }[] = [
  { subject: 'fix(billing): round the VAT once, on the total', age: '2m', hash: 'a3f1c92' },
  { subject: 'test(billing): cover the two-line invoice', age: '9m', hash: '7b40e18' },
  { subject: 'refactor(billing): lift applyVat out of the PDF', age: '14m', hash: 'c1d8a05' },
]


/**
 * The scripts menu's contents, in `SelectIcon`'s shape. Imported from
 * `InfoSidebarMockup` rather than respelled: the two drawings are the same repository
 * card, and two copies of one menu is how they come to disagree about it.
 */
type ServerState = 'none' | 'running' | 'serving'

/** The card itself, in a given state. Shared by the two stories below. */
function RepoCard({ server, menuOpen }: { server: ServerState; menuOpen: boolean }) {
  const { t } = useT()
  /**
   * Where `SelectIcon` hangs its panel: an empty node INSIDE this card's own
   * `AppGround`, so the menu resolves the app's variables rather than painting a
   * transparent ground on the body — `SelectIcon`'s own `portalTo` note says why.
   * State and not a `useRef`, because the target has to EXIST on the render that opens
   * the panel, and a ref's `.current` is still null then.
   */
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const files = FILES
  const commits = COMMITS
  const added = files.reduce((n, f) => n + f.added, 0)
  const removed = files.reduce((n, f) => n + f.removed, 0)

  return (
    /* ONE `AppGround` AROUND THE WHOLE CARD, not one per block. `RepositoryCard` from
       `design-system/desktop/` is the plate, the padding, the air between the blocks and
       the ORDER they are read in — what was here was a copy of all four, and every block
       inside had to carry its own patch of the app's theme. */
    <AppGround paint={false} className="relative">
      <div ref={setPortal} />
      <RepositoryCard
        /* THE CARD DRAWS ITS OWN BLOCKS NOW, so this passes their DATA. The coloured tile
           and the name are `HeaderRepoCard`'s `Label`, Scripts its `SelectIcon`, the last
           three its `ButtonIcon`s. What that changed on screen: three buttons that carried
           WORDS — "Scripts", "Open", "Open" — on dashed outlines. The app gave those up
           because written out they ran to some 270px of a 288px sidebar; the marks carry
           the meaning and the tooltips the names. */
        header={{
          name: 'magic-pay',
          color: REPO_COLOR,
          scripts: {
            icon: Play,
            title: t('site.infoSidebar.scripts'),
            groups: SCRIPT_GROUPS(t),
            onSelect: noop,
            /* The component's own panel, opened from the storyboard's clock through
               `SelectIcon`'s controlled `open`. What hung here before was a second menu
               drawn by hand at an offset measured against the trigger. */
            open: menuOpen,
            portalTo: portal,
          },
          editor: { icon: VSCode, title: t('site.infoSidebar.open'), onClick: noop },
          remote: { icon: Github, title: t('site.infoSidebar.open'), onClick: noop },
          remove: { title: t('site.infoSidebar.open'), onClick: noop },
        }}
        /* STILL A NODE, and one of the two the card cannot own: a running script is a live
           process with a terminal behind it. `RunningScripts` is the app's own component and
           lives in the renderer — it reads the store and the pty — so what stands in for it
           here is `ScriptCard`, whose purple bar, loader, stop chip and address row are all
           its own. The slot is what puts it straight under the row that launched it. */
        activity={
          server !== 'none' ? (
            <ScriptCard
              name="dev"
              state="running"
              stop={{ label: t('site.infoSidebar.stop'), title: t('site.infoSidebar.stop'), onStop: noop }}
              urls={
                server === 'serving'
                  ? [{ url: 'http://localhost:3000', label: 'localhost:3000', title: 'localhost:3000' }]
                  : []
              }
              onOpenUrl={noop}
            />
          ) : undefined
        }
        /* The RELATION between the two branches is `BranchCard`'s whole subject. The chip
           drawn here before carried no base and no arrow, so it said "a branch" where the
           app says "this one goes back to that one". */
        branch={{
          branch: 'feature/pay-318-invoice-vat',
          base: 'main',
          copy: { label: 'feature/pay-318-invoice-vat', onCopy: noop },
        }}
        changes={
          files.length > 0
            ? {
                label: t('site.infoSidebar.uncommitted'),
                summary: t(files.length === 1 ? 'site.infoSidebar.fileOne' : 'site.infoSidebar.files', { count: files.length }),
                additions: added,
                deletions: removed,
                files: files.map((f) => ({
                  path: f.file,
                  name: f.file,
                  additions: f.added,
                  deletions: f.removed,
                })),
                /* A handler, even though nothing opens: without one the rows are inert and
                   the filenames do not lift under the cursor, which is a card this drawing
                   is not a picture of. */
                onOpenFile: noop,
              }
            : undefined
        }
        commits={
          commits.length > 0
            ? {
                label: t('site.infoSidebar.commits'),
                summary: `${commits.length} ahead of main`,
                commits: commits.map((c) => ({
                  hash: c.hash,
                  shortHash: c.hash,
                  subject: c.subject,
                  relativeDate: c.age,
                  copyLabel: c.hash,
                })),
                onCopyHash: noop,
              }
            : undefined
        }
      />
    </AppGround>
  )
}

/** The sidebar's ground around a card, centred on a tone plate. */
function Plate({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    // A FIXED HEIGHT, because the card's own changes as its story runs — a block appears,
    // another empties — and a plate that grew with it would move the whole page under
    // the reader every two seconds. Tall enough for the tallest state, card centred.
    <div aria-hidden className={`flex h-[440px] items-center justify-center overflow-hidden rounded-2xl ${tone} px-6 sm:h-[480px]`}>
      <div className="relative w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">{children}</div>
    </div>
  )
}

/** The card at rest: three commits on the branch, two files changed since. */
export function RepoCardMockup() {
  return (
    <Plate tone="bg-tone-sky">
      <RepoCard server="none" menuOpen={false} />
    </Plate>
  )
}

/**
 * A dev server, started from the card: the pointer opens Scripts, hovers `dev`, clicks;
 * the menu closes on a purple running bar; the address arrives under it.
 */
const SERVER_AT = [0, 900, 1400, 2400, 3000, 3300, 5200] as const
const SERVER_LOOP = 11000

/**
 * WHAT THE POINTER AIMS AT, as a SELECTOR rather than as a ref.
 *
 * Both targets live inside design-system components now — the trigger is `SelectIcon`'s
 * own button, the `dev` row is an item in the panel it portals — and neither hands a ref
 * out. Asking the DOM is what is left, and it is honest here: this is a drawing measuring
 * a drawing, in an effect that already runs after every paint.
 *
 * The trigger is found by its ARIA role, which is the component's contract rather than a
 * class that could be restyled. The row is found by its label, which is a package.json
 * key and therefore never translated.
 */
const SCRIPTS_TRIGGER = 'button[aria-haspopup="menu"]'

export function DevServerMockup() {
  const step = useLoopStep(SERVER_AT, SERVER_LOOP)
  const frameRef = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  // 0 rest · 1 aim Scripts · 2 click · 3 menu open, aim dev · 4 hover dev · 5 click, menu
  // closes, running · 6 serving.
  const menuOpen = step >= 3 && step < 5
  const server: ServerState = step >= 6 ? 'serving' : step >= 5 ? 'running' : 'none'
  const pressed = step === 2 || step === 5
  const aim = step >= 1 && step < 3 ? 'trigger' : step >= 3 && step < 6 ? 'dev' : null

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || !aim) {
      setPointer(null)
      return
    }
    const el =
      aim === 'trigger'
        ? frame.querySelector(SCRIPTS_TRIGGER)
        : [...frame.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith('dev'))
    if (!el) {
      setPointer(null)
      return
    }
    const a = frame.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    setPointer({ x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 })
  }, [aim, step])

  return (
    <div aria-hidden className="flex h-[440px] items-center justify-center rounded-2xl bg-tone-mist px-6 sm:h-[480px]">
      <div ref={frameRef} className="relative w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">
        <RepoCard server={server} menuOpen={menuOpen} />
        {pointer ? (
          <div
            className="pointer-events-none absolute z-30 transition-[left,top] duration-500 ease-in-out"
            style={{ left: pointer.x, top: pointer.y }}
          >
            <Pointer pressed={pressed} className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
