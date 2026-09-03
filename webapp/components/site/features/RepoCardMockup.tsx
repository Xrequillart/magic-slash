'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  CircleStop,
  Copy,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Globe,
  Play,
  X,
} from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
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
 *      `bg-purple` bar at `px-2 py-1.5 text-xs` with the app's `WaveLoader`, the script's
 *      name, and a worded Stop button on a 15% white pill. When the server prints its
 *      address the bar loses its bottom corners and a URL row hangs off it: `px-3 py-2.5
 *      text-sm`, a purple globe, the address with its scheme stripped, an external-link
 *      glyph at 60%.
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

/** `WaveLoader`, as the Agents drawing has it: three bars, the middle tallest, waving. */
function WaveLoader() {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center gap-[2px]">
      {[0, 0.15, 0.3].map((delay, index) => (
        <span
          key={delay}
          className="w-[2px] animate-wave-bar rounded-[1px] bg-current motion-reduce:animate-none"
          style={{ height: index === 1 ? 13 : 6, animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  )
}

/** A macOS arrow pointer, black with a white edge so it reads on the dark card. */
function Pointer({ pressed }: { pressed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 drop-shadow-md transition-transform duration-150 ${pressed ? 'scale-[0.82]' : 'scale-100'}`}
      style={{ transformOrigin: '4px 3px' }}
    >
      <path d="M5 3l12 10.5h-6.6l3.9 8-2.8 1.2-3.9-8L5 19.5z" fill="#000" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const DASHED_BUTTON =
  'flex items-center gap-1 rounded border border-dashed border-appline/40 px-1.5 py-0.5 text-[10px] font-semibold text-appink-icon'

type ServerState = 'none' | 'running' | 'serving'

/** The card itself, in a given state. Shared by the two stories below. */
function RepoCard({
  server,
  menuOpen,
  menuHover,
  scriptsRef,
  devRowRef,
}: {
  server: ServerState
  menuOpen: boolean
  menuHover: boolean
  scriptsRef?: React.Ref<HTMLSpanElement>
  devRowRef?: React.Ref<HTMLDivElement>
}) {
  const { t } = useT()
  const files = FILES
  const commits = COMMITS
  const added = files.reduce((n, f) => n + f.added, 0)
  const removed = files.reduce((n, f) => n + f.removed, 0)
  const ratio = added / (added + removed || 1)

  return (
    <div className="relative rounded-xl bg-white/[0.06] p-3">
      {/* ── 1. THE HEADER ─────────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${REPO_COLOR}1f`, color: REPO_COLOR }}
        >
          <FolderGit2 className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-sm font-medium text-white/90">magic-pay</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span ref={scriptsRef} className={`${DASHED_BUTTON} ${menuOpen ? 'border-accent/50 bg-accent/5 text-accent' : ''}`}>
            <Play className="h-3 w-3" />
            {t('site.infoSidebar.scripts')}
            <ChevronDown className="h-2.5 w-2.5" />
          </span>
          <span className={DASHED_BUTTON}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/vscode-logo.png" alt="" className="h-3 w-3 object-contain" />
            {t('site.infoSidebar.open')}
          </span>
          <span className={DASHED_BUTTON}>
            <GithubMark className="h-3 w-3" />
            {t('site.infoSidebar.open')}
          </span>
          <span className="flex items-center justify-center rounded p-1 text-appink-icon">
            <X className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* ── 6. THE SCRIPTS MENU, hung under its trigger ───────────────────── */}
      {menuOpen ? (
        <div
          className="absolute right-[calc(0.75rem+7.75rem)] top-[calc(0.75rem+1.5rem+4px)] z-20 w-[280px] overflow-hidden rounded-lg border border-appline/50 bg-appbg-secondary shadow-lift"
        >
          <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
            {t('site.infoSidebar.scriptsDev')}
          </div>
          <div
            ref={devRowRef}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${menuHover ? 'bg-white/[0.06]' : ''}`}
          >
            <Play className="h-3 w-3 shrink-0 text-accent" />
            <span className="truncate text-xs font-medium text-white/90">dev</span>
            <span className="ml-auto truncate text-[10px] text-appink/40">pnpm dev</span>
          </div>
          <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
            {t('site.infoSidebar.scriptsBuild')}
          </div>
          <div className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
            <Play className="h-3 w-3 shrink-0 text-accent" />
            <span className="truncate text-xs font-medium text-white/90">build</span>
            <span className="ml-auto truncate text-[10px] text-appink/40">pnpm build</span>
          </div>
          <div className="truncate bg-appbg-tertiary/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-appink/40">
            {t('site.infoSidebar.scriptsTest')}
          </div>
          <div className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
            <Play className="h-3 w-3 shrink-0 text-accent" />
            <span className="truncate text-xs font-medium text-white/90">test</span>
            <span className="ml-auto truncate text-[10px] text-appink/40">pnpm test</span>
          </div>
        </div>
      ) : null}

      {/* ── 2. THE RUNNING SCRIPT ─────────────────────────────────────────── */}
      {server !== 'none' ? (
        <div className="mb-2 flex flex-col gap-1">
          <div className="flex flex-col">
            <div
              className={`flex w-full items-center gap-2 bg-purple px-2 py-1.5 text-xs text-white ${
                server === 'serving' ? 'rounded-t-lg' : 'rounded-lg'
              }`}
            >
              <span className="shrink-0 text-white">
                <WaveLoader />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-medium">dev</div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/15 py-1 pl-1.5 pr-2">
                <CircleStop className="h-3.5 w-3.5 text-white" />
                <span className="text-[11px] font-semibold text-white">{t('site.infoSidebar.stop')}</span>
              </span>
            </div>
            {server === 'serving' ? (
              <div className="flex w-full items-center gap-2.5 rounded-b-lg border border-t-0 border-white/5 bg-white/[0.06] px-3 py-2.5 text-sm text-appink">
                <Globe className="h-4 w-4 shrink-0 text-purple" />
                <span className="flex-1 truncate text-left font-medium">localhost:3000</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 3. THE BRANCH ─────────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.06] px-2 py-1.5">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-green" />
          <span className="truncate text-xs font-medium text-green">feature/pay-318-invoice-vat</span>
          <span className="ml-auto shrink-0 rounded p-1">
            <Copy className="h-3 w-3 text-appink-icon" />
          </span>
        </div>
      </div>

      {/* ── 4. THE UNCOMMITTED BLOCK ──────────────────────────────────────── */}
      {files.length > 0 ? (
        <div className="mb-2 rounded-md border border-white/5 bg-white/[0.06] p-2">
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="font-medium text-appink/70">{t('site.infoSidebar.uncommitted')}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-appink/50">
                {t(files.length === 1 ? 'site.infoSidebar.fileOne' : 'site.infoSidebar.files', { count: files.length })}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green">+{added}</span>
                <span className="text-red">-{removed}</span>
              </span>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-1.5 w-1.5 rounded-sm ${ratio >= (i + 1) / 6 ? 'bg-green' : 'bg-red'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-0.5">
            {files.map((f) => (
              <div key={f.file} className="-mx-1 flex items-center gap-1.5 rounded px-1 py-0.5 text-xs">
                <span className="flex-1 truncate font-mono text-appink/60">{f.file}</span>
                <span className="shrink-0 text-[10px] text-appink/40">
                  {f.added > 0 ? <span className="text-green">+{f.added}</span> : null}
                  {f.added > 0 && f.removed > 0 ? ' ' : null}
                  {f.removed > 0 ? <span className="text-red">-{f.removed}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── 5. THE COMMITS BLOCK ──────────────────────────────────────────── */}
      {commits.length > 0 ? (
        <div className="mb-2 rounded-md border border-white/5 bg-white/[0.06] p-2">
          <div className="mb-1.5 flex items-center text-xs">
            <span className="font-medium text-appink/70">{t('site.infoSidebar.commits')}</span>
            <span className="ml-auto text-appink/50">{commits.length} ahead of main</span>
          </div>
          <div className="space-y-1">
            {commits.map((c) => (
              <div key={c.hash} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="flex-1 truncate text-appink/60">{c.subject}</span>
                <span className="shrink-0 text-xs text-appink/40">{c.age}</span>
                <span className="flex shrink-0 items-center gap-1 rounded border border-appline/30 bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-appink-icon">
                  {c.hash}
                  <Copy className="h-3 w-3" />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
      <RepoCard server="none" menuOpen={false} menuHover={false} />
    </Plate>
  )
}

/**
 * A dev server, started from the card: the pointer opens Scripts, hovers `dev`, clicks;
 * the menu closes on a purple running bar; the address arrives under it.
 */
const SERVER_AT = [0, 900, 1400, 2400, 3000, 3300, 5200] as const
const SERVER_LOOP = 11000

export function DevServerMockup() {
  const step = useLoopStep(SERVER_AT, SERVER_LOOP)
  const scriptsRef = useRef<HTMLSpanElement>(null)
  const devRowRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  // 0 rest · 1 aim Scripts · 2 click · 3 menu open, aim dev · 4 hover dev · 5 click, menu
  // closes, running · 6 serving.
  const menuOpen = step >= 3 && step < 5
  const menuHover = step === 4
  const server: ServerState = step >= 6 ? 'serving' : step >= 5 ? 'running' : 'none'
  const pressed = step === 2 || step === 5
  const target = step >= 1 && step < 3 ? scriptsRef : step >= 3 && step < 6 ? devRowRef : null

  useLayoutEffect(() => {
    const frame = frameRef.current
    const el = target?.current
    if (!frame || !el) {
      setPointer(null)
      return
    }
    const a = frame.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    setPointer({ x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 })
  }, [target, step])

  return (
    <div aria-hidden className="flex h-[440px] items-center justify-center rounded-2xl bg-tone-mist px-6 sm:h-[480px]">
      <div ref={frameRef} className="relative w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">
        <RepoCard
          server={server}
          menuOpen={menuOpen}
          menuHover={menuHover}
          scriptsRef={scriptsRef}
          devRowRef={devRowRef}
        />
        {pointer ? (
          <div
            className="pointer-events-none absolute z-30 transition-[left,top] duration-500 ease-in-out"
            style={{ left: pointer.x, top: pointer.y }}
          >
            <Pointer pressed={pressed} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
