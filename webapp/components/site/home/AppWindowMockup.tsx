'use client'

import {
  AlertTriangle,
  Archive,
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock,
  Copy,
  Cpu,
  DollarSign,
  Edit2,
  FolderGit2,
  Gauge,
  GitBranch,
  ListTodo,
  MessageCircleQuestion,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { GithubMark } from '../features/TasksModalMockup'
import { JiraMark } from '../features/TicketCardMockup'

/**
 * THE WHOLE DESKTOP WINDOW, redrawn — titlebar, agent list, terminal, info panel — for
 * the band directly under the hero.
 *
 * WHY A WHOLE WINDOW WHEN `/features` DELIBERATELY DRAWS ZOOMS. The drawings on
 * `/features` each argue one row of a list, and the note at the top of
 * `features/AgentsSidebarMockup.tsx` is right that a half-drawn terminal beside a
 * faithful sidebar invites a comparison it would lose. This band argues something else:
 * that several agents run side by side in ONE window, which is a claim about the whole
 * layout and cannot be made by a crop of any part of it. So every region is drawn, and
 * every region is drawn properly — the discipline is the same, the subject is bigger.
 *
 * DRAWN AT THE APP'S OWN PIXELS AND THEN SCALED, which is `AgentsSidebarMockup`'s
 * technique and the reason this is a reproduction rather than an illustration: the
 * sidebar is 230px because the app's is, the panel is 500px because the app's is, the
 * titlebar is `h-10` and the terminal ground is `p-2`. Not one of those may be nudged to
 * make the page fit — `DesktopSection.tsx` applies a uniform `scale` instead, so the
 * proportions survive exactly and only the viewing distance changes.
 *
 * ── TYPE: THE APP'S OWN FAMILY, AT THE APP'S OWN WEIGHTS ──────────────────────────
 *
 * `font-display` ON THE WHOLE WINDOW, and that is a FIX rather than a preference. This
 * drawing wore `font-sans`, which in the APP's config is Cera Pro
 * (`desktop/tailwind.config.cjs:80`, and `index.css:99` sets the same family on `body`) —
 * but on this site `font-sans` is AVENIR and `font-display` is the handle on Cera Pro
 * (`tailwind.config.ts` `fontFamily`). Copying the app's class therefore changed the
 * family, and because `app/globals.css` serves Avenir at 400 and 900 ONLY, it changed
 * every weight with it: CSS weight matching sent each `font-medium` (500) DOWN to Avenir
 * Book 400 and each `font-semibold` (600) UP to Avenir Black 900. The window read thin,
 * with a few labels shouting — which is what the product owner saw.
 *
 * THE FAMILY IS THE WHOLE FIX, because neither the app nor this site ships a Cera Pro
 * REGULAR: both declare 300 / 500 / 700 / 900 upright plus two italics, off the same six
 * `.otf` files (`desktop/src/renderer/index.css:6-47`, `app/globals.css:34-78`). So an
 * unweighted 400 resolves to the MEDIUM face in the app and here alike, by the same rule
 * on the same faces, and a `font-semibold` 600 — which neither declares — resolves to
 * Bold 700 in both. Nothing below had to be bolded to compensate for the family, and
 * nothing below should be.
 *
 * WEIGHT BY WEIGHT, read off the source rather than judged by eye. `font-medium`: the
 * four top actions and the agent rows (Sidebar.tsx:267, :82), the attention banner
 * (Sidebar.tsx:46), the repository name and the two branch labels
 * (RepositoryCard.tsx:74, :122, :135), the Uncommitted and Commits headings
 * (RepositoryCard.tsx:160, :227), the model pill, the context percent and the cost
 * (UsageCard.tsx:110, :135, :160), the status pill (StatusPill.tsx:99).
 * `font-semibold`: the ticket id (TicketHeader.tsx:43), the ticket title
 * (AgentIdentityFields.tsx:65), the two usage percentages (SidebarUsageCard.tsx:46) and
 * the three dashed controls of the repository card (RepositoryCard.tsx:82, :91,
 * ScriptsDropdown.tsx:161).
 *
 * EVERYTHING ELSE SETS NO WEIGHT IN THE APP, so it sets none here: the titlebar's agent
 * title and its Archive pill (TitleBar.tsx:195, :231), the AGENTS label
 * (Sidebar.tsx:326), the version line (Sidebar.tsx:429), the usage card's own labels and
 * reset countdowns (SidebarUsageCard.tsx:40-44), the file and commit rows
 * (RepositoryCard.tsx:207, :237), the ticket description (AgentIdentityFields.tsx:114),
 * the session heading and the duration (UsageCard.tsx:99, :167) and the add-repository
 * box (AgentInfoSidebar.tsx:539). Those are 400 — the Medium face, by the matching above
 * — and they are the app being even, not oversights waiting to be bolded.
 *
 * ── WHAT IS REPRODUCED, BAND BY BAND ──────────────────────────────────────────────
 *
 *   1. THE TITLEBAR — `desktop/src/renderer/components/TitleBar.tsx`. `h-10 px-3` on the
 *      sunken ground, with a `w-16` spacer holding the 64px gutter macOS's traffic lights
 *      occupy (TitleBar.tsx:120-124), then the left-sidebar toggle as a `p-[5px]
 *      rounded-full bg-surface` pill carrying `LeftSidebarOpenIcon` — the inline SVG at
 *      TitleBar.tsx:11-19, path for path. The centre is BARE TEXT at `text-sm
 *      text-text-secondary` (TitleBar.tsx:195-199) and it is the AGENT'S TITLE, not a
 *      ticket id: there is no status dot, no eyebrow and no window title. On the right,
 *      the Archive pill that closes the agent (TitleBar.tsx:239-250) and the
 *      right-sidebar toggle, `RightSidebarOpenIcon` being the same SVG rotated 180°.
 *
 *      THE THREE LIGHTS ARE DRAWN HERE AND ARE NOT IN THE APP, which is the one place
 *      this window has to add something rather than copy it: macOS draws them, so the
 *      app's markup only leaves the 64px hole. A web page has no native chrome to fill
 *      it, and an empty notch top-left reads as a rendering fault. So the lights are
 *      drawn INSIDE that gutter at their real geometry — 12px discs on a 20px pitch from
 *      x=16 — and the app's own spacer keeps every other element exactly where it is.
 *
 *   2. THE LEFT SIDEBAR — `Sidebar.tsx`, at its declared `SIDEBAR_WIDTH` of 230 and not
 *      resizable, for the reason that file gives. Four top actions in a `px-2 pt-3` /
 *      `gap-1` column, each `w-full flex items-center gap-2 px-2 py-2 text-xs font-medium
 *      rounded-lg` with a `w-3.5` glyph and its shortcut pushed right at `opacity-50`;
 *      the fourth is `SidebarAccount.tsx`, which is the person's own name and carries ⌘,
 *      because it opens Settings. Then the AGENTS header at `pl-2 pt-3 pb-2` — padding on
 *      the LEFT only, which is what keeps the label on the same 16px line as the rows
 *      while the controls stay flush right — with the sort control BEFORE the `+`,
 *      because the one that changes the list reads before the one that adds to it. Then
 *      the attention banner, which is a COUNT and not a group: the one agent it counts
 *      stays exactly where it is in the list, and at zero the banner is not there at all.
 *      Then the rows, `px-2 py-2 text-xs rounded-lg` in a `gap-1` column.
 *
 *      THE ACTIVE ROW WEARS ITS OWN STATE'S COLOUR, `stateBgColors` in
 *      `utils/stateColors.ts` — `bg-accent/20` for an agent at work, `bg-orange/20` for
 *      one asking a question — never a neutral highlight. That is what makes a list of a
 *      dozen readable at a glance, and it is why there are no repository dots on a row:
 *      the row's own colour is already saying something.
 *
 *      AND THE FOOTER IS HERE, unlike the `/features` zoom which cuts it: the usage card
 *      from `SidebarUsageCard.tsx` (expanded branch, `mx-2 mb-2` on the subtle surface)
 *      and the version line from Sidebar.tsx:390-392 — `v0.88.0` at `opacity-60` and
 *      NOTHING ELSE. No Docs, no Changelog, no GitHub, no dot separators; that footer had
 *      links once and does not now.
 *
 *   3. THE TERMINAL — `TerminalView.tsx`. `w-full h-full bg-surface-sunken p-2`
 *      (TerminalView.tsx:394), 8px of uniform padding and xterm transparent on top of it,
 *      at `'Hack', monospace` 14px with `lineHeight: 1.0` (TerminalView.tsx:154-156).
 *      Hack is bundled with the app and not with this site, so the stack here is the
 *      generic monospace one the app itself falls back to.
 *
 *      NO TAB BAR AND NO HEADER ABOVE IT. There is nothing between the titlebar and the
 *      terminal in this app — everything contextual lives in the right panel — and a
 *      drawn tab strip would be the single most misleading thing this window could show.
 *
 *      AND IT HOLDS AN EMPTY CLAUDE CODE, at the product owner's request. It held a
 *      46-line `/magic:start PAY-318` transcript before, and a transcript is a claim
 *      about what one agent DID; this band's claim is about the window, and a session
 *      waiting for its first prompt makes it without asking the reader to read a log.
 *      `WELCOME` below is what the three banner lines are grounded on.
 *
 *      EVERYTHING INSIDE IT IS STILL CLAUDE CODE'S OWN OUTPUT, which is the distinction
 *      the whole band rests on. The banner, the boxed composer and the `⏵⏵ accept edits
 *      on` mode line are printed by Claude Code into the pty — the app draws NONE of
 *      them, and it never draws an input of its own. So they are drawn as terminal text
 *      in the monospace stack and in the colours the dark theme hands xterm
 *      (`desktop/src/themes.ts`), never as app chrome. See `ANSI` below.
 *
 *   4. THE RIGHT PANEL — `AgentInfoSidebar.tsx` at its `DEFAULT_WIDTH` of 500, a `p-4
 *      space-y-4` column in Cera Pro (AgentInfoSidebar.tsx:445), holding
 *      `agent-info-sidebar/UsageCard.tsx`, `TicketHeader.tsx`, `RepositoryCard.tsx` and
 *      the dashed add-repository box (AgentInfoSidebar.tsx:537-540), in that order.
 *
 *      THE REPOSITORY CARD'S ACTION ROW IS ALL FOUR OF ITS CONTROLS, Scripts included —
 *      `ScriptsDropdown`, then VSCode, then GitHub, then the remove X
 *      (RepositoryCard.tsx:77-105). Scripts reads FIRST because that is where the app
 *      puts it, and it is the only one of the four that is a dropdown: see 4c for its
 *      closed state.
 *
 *      AND IT HAS NO HEADER, which is worth stating because every earlier version of this
 *      panel did. There is no title, no agent name and no close X at the top of it: the
 *      close action moved to the titlebar precisely because it belongs to the agent and
 *      not to a panel that may be collapsed (see the note in TitleBar.tsx).
 *
 * ── WHAT IS DELIBERATELY NOT DRAWN ────────────────────────────────────────────────
 *
 * NO DIVIDERS AND NO BORDERS between the four regions. The app's window is transparent
 * with native vibrancy and every region paints the same `surface-sunken`
 * (`rgba(0,0,0,0.3)`), so nothing separates them but the change of content. A hairline
 * between the sidebar and the terminal is the first thing a person drawing this from
 * memory adds, and the app has never had one.
 *
 * NO SPLIT-VIEW TOGGLE and no coder/planner switcher in the titlebar: both are
 * conditional (TitleBar.tsx:106, :210) and neither is showing for a single coding agent
 * on a window this wide. NO PANE CHIP on the agents header — it stays mounted at
 * `opacity-0` outside split mode, so it is invisible in the state drawn here.
 *
 * NO PR CARD on the repository card: the agent has opened no pull request yet, which is
 * what `in progress` means, and `PRWatchCard.tsx` renders nothing without one. NO
 * RUNNING-SCRIPTS STRIP under the action row either (`RunningScripts.tsx`, mounted at
 * RepositoryCard.tsx:110) — nothing is running. The SCRIPTS TRIGGER itself IS drawn: the
 * product owner asked for it, and it belongs in the drawing on its own merits, because it
 * is a permanent control of the card rather than a state the card can be caught without.
 *
 * IDLE DRAWS NOTHING. `AgentStateBadge.tsx` returns `null` for it, so the fifth agent in
 * the list below has an empty glyph slot — that is the app being quiet, not a gap.
 *
 * ── COLOUR ────────────────────────────────────────────────────────────────────────
 *
 * The app runs its theme off CSS variables and every theme it ships is dark; this site
 * has one light palette. The translation is the one the `/features` reproductions use,
 * through the tokens declared for them in `tailwind.config.ts`: `appbg` for the window
 * ground, the white-alpha ramp for `surface` / `surface-subtle` / `surface-strong`,
 * `bg-black/30` for `surface-sunken`, `appink` / `appink-icon` / `appink-muted` for the
 * three inks, `appline` for `border`, and the declared status tones for the rest.
 *
 * ONE THING IS MORE FAITHFUL HERE THAN ON `/features`: the `waiting` state keeps its own
 * `orange`. `AgentsSidebarMockup` substitutes `yellow` because orange was not a declared
 * token when it was written; it is one now (declared for the context gauge), so there is
 * no substitution left to make and this drawing does not make one.
 *
 * `aria-hidden`, and the whole window: it is a drawing, and a button that cannot be
 * pressed should be announced to nobody. Every string in it is either the app's own
 * chrome — which the catalogues already hold — or product log output, which stays an
 * English literal for the reason the retired `AppMockup.tsx` gave: it is what the real
 * product prints, and the real product prints English.
 */

/**
 * THE WINDOW'S OWN GEOMETRY. 800 tall is the app's default height; 1280 wide is a real
 * window rather than the 1200 default, and it is the one number here chosen for the page.
 *
 * The two side columns are FIXED at any width — 230 and 500, neither resizable — so the
 * window's width is spent entirely on the terminal between them. At the 1200 default that
 * leaves 470px, which is narrower than anyone actually works in and would have wrapped
 * Claude Code's own output in a way the real thing does not. 1280 leaves 550, and the
 * only thing that differs from the default is the middle column's share.
 */
const WINDOW = { width: 1280, height: 800 } as const

/** `SIDEBAR_WIDTH` in `Sidebar.tsx`. Fixed, and deliberately not resizable. */
const SIDEBAR_WIDTH = 230

/** `DEFAULT_WIDTH` in `AgentInfoSidebar.tsx` — the width for an implementation agent. */
const PANEL_WIDTH = 500

/**
 * The repository's colour, `PROJECT_COLORS[0]` in `utils/projectColors.ts`. Inline rather
 * than a token because the app derives it per repository and tints both the tile's ground
 * and its glyph from the one value — the same call `features/RepoCardMockup.tsx` makes.
 */
const REPO_COLOR = '#3B82F6'

/**
 * The version the footer prints. A literal, bumped at release like the app's own — see
 * Sidebar.tsx:391, which holds the same string the same way.
 */
const VERSION = 'v0.88.0'

/**
 * THE AGENT ON SCREEN, and the same invented project every other drawing on this site
 * uses: PAY-318, the invoice VAT ticket the Tasks list shows and the Agents sidebar runs.
 * The titlebar prints `metadata.title`, which is this string, so the two agree by
 * construction rather than by anyone remembering to keep them in step.
 */
const AGENT_TITLE = 'PAY-318 · invoice VAT'

/**
 * The four states with a glyph. `idle` is the fifth and has none — see the note above.
 */
type AgentState = 'working' | 'waiting' | 'completed' | 'error' | 'idle'

/** `stateBgColors` in `utils/stateColors.ts`: the tint an ACTIVE row wears, by state. */
const STATE_TINT: Record<AgentState, string> = {
  idle: 'bg-appink/20',
  working: 'bg-accent/20',
  waiting: 'bg-orange/20',
  completed: 'bg-green/20',
  error: 'bg-red/20',
}

/** `stateColors`: the colour the state's own glyph is drawn in. */
const STATE_TONE: Record<AgentState, string> = {
  idle: 'text-appink',
  working: 'text-accent',
  waiting: 'text-orange',
  completed: 'text-green',
  error: 'text-red',
}

/**
 * The list, newest first — `useOrderedTerminals`' default, so a row stays where the user
 * last saw it. Five agents in four different states, one of them idle, which is what the
 * band is actually claiming: several of these run at once, each in its own worktree.
 *
 * The names are what the app shows — an agent's title, or the ticket it was started on —
 * so they are literals on the same invented project as the rest of the site.
 */
const AGENTS: readonly { name: string; state: AgentState; active?: boolean }[] = [
  { name: AGENT_TITLE, state: 'working', active: true },
  { name: '#409 · rate limits', state: 'working' },
  { name: 'PAY-311 · card change', state: 'waiting' },
  { name: '#404 · empty basket', state: 'completed' },
  { name: 'PAY-296 · dunning emails', state: 'idle' },
]

/**
 * `gaugeColors` in `agent-info-sidebar/LimitGauge.tsx`, thresholds included: green below
 * 65%, yellow from 65, red from 85. The session gauge is on the far side of the first
 * threshold here, so the card is caught having changed colour.
 */
function gaugeColors(pct: number) {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

/** `contextColors` in `agent-info-sidebar/utils.ts`: red from 70, orange from 40. */
function contextColors(pct: number) {
  if (pct >= 70) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 40) return { bar: 'bg-orange', text: 'text-orange' }
  return { bar: 'bg-green', text: 'text-green' }
}

/** The two account rate limits, and the agent's own context — the figures the cards show. */
const SESSION_PCT = 72
const WEEKLY_PCT = 38
const CONTEXT_PCT = 54

/** The files the agent has touched since its last commit, as `git diff --numstat` has them. */
const FILES: readonly { file: string; added: number; removed: number }[] = [
  { file: 'vat.ts', added: 4, removed: 1 },
  { file: 'vat.test.ts', added: 14, removed: 0 },
]

/** The commits already on the branch, newest first, as `git log` hands them over. */
const COMMITS: readonly { subject: string; age: string; hash: string }[] = [
  { subject: 'fix(billing): round the VAT once, on the total', age: '2m', hash: 'a3f1c92' },
  { subject: 'test(billing): cover the two-line invoice', age: '9m', hash: '7b40e18' },
  { subject: 'refactor(billing): lift applyVat out of the PDF', age: '14m', hash: 'c1d8a05' },
]

const BASE_BRANCH = 'main'
const BRANCH = 'feature/PAY-318-invoice-vat'

/**
 * THE SIXTEEN COLOURS, or the nine of them this session uses.
 *
 * `themes.ts`'s dark `terminal` block is what xterm is handed, and every value in it is
 * already a token of this site's palette — which is not a coincidence: both come from the
 * same Tailwind-derived scale. So the mapping is exact rather than approximate, and it is
 * written out here so a future edit reaches for a NAME instead of guessing:
 *
 *   foreground  #ffffff  →  text-white
 *   brightBlack #a1a1aa  →  text-appink        (a tool's result, a dimmed label)
 *   green       #22c55e  →  text-green
 *   yellow      #eab308  →  text-yellow
 *   red         #ef4444  →  text-red
 *   blue        #6366f1  →  text-accent
 *   brightBlue  #818cf8  →  text-accent-hover
 *   magenta     #a855f7  →  text-purple        (Claude Code's own spinner glyph)
 *   brightCyan  #22d3ee  →  text-cyan
 *
 * `cyan` (#06b6d4) is the one slot with no token of this site, and nothing below reaches
 * for it: an approximation inside a palette this exact would be worse than not using the
 * colour at all.
 *
 * AND ONE COLOUR HERE IS NOT ONE OF THE SIXTEEN, which is worth saying out loud rather
 * than leaving as the exception nobody documented: Claude Code prints its welcome mark in
 * its own brand orange as a truecolour escape, which bypasses the palette xterm was
 * handed entirely. So `logo` is the declared `orange` (#f97316, declared for the app's
 * context gauge) — the nearest token this site has, named rather than pasted, and the
 * only line in the terminal whose colour did not come out of `themes.ts`.
 *
 * The object holds the four slots this empty session actually uses. The table above is
 * the whole mapping, so the next line added here reaches for a NAME instead of guessing.
 */
const ANSI = {
  fg: 'text-white',
  dim: 'text-appink',
  blue: 'text-accent',
  logo: 'text-orange',
} as const

/**
 * THE FRESH SESSION'S BANNER — Claude Code's own three lines: the block mark on the left,
 * and the build, the model and the working directory beside it.
 *
 * GROUNDED RATHER THAN INVENTED, as far as this repository can ground it. Nothing in the
 * tree captures the welcome output — not `skills/`, not the evals, not a fixture under
 * `desktop/` — so the SHAPE here is the canonical banner, and every VALUE in it is read
 * off something that is:
 *
 *   • `v2.1.223` is the build this repository last measured a live TUI against —
 *     `desktop/src/main/questions/answer-keys.ts:51`, which captured a multiSelect
 *     question off it on 2026-08-06. A version invented here would be the one number on
 *     the page nobody could check.
 *   • `Fable 5.1` is the model the panel's own pill shows two columns to the right, so
 *     the terminal and the panel agree by construction rather than by anyone remembering
 *     to keep them in step — the same call `AGENT_TITLE` makes for the titlebar.
 *   • THE DIRECTORY IS THE WORKTREE, not the repository. `magic-start` and
 *     `magic-continue` both create `../${REPO_NAME}-$TICKET_ID`
 *     (`skills/magic-start/SKILL.md:404`), which beside a card titled `magic-pay` is
 *     `magic-pay-PAY-318` — the exact shape `ScriptsDropdown.tsx`'s own header note calls
 *     out. An agent's terminal opens in its worktree, so that is what the banner prints.
 *
 * AN EMPTY SESSION ON A BRANCH THAT ALREADY HAS COMMITS IS COHERENT, and worth saying
 * before it reads as a contradiction with the panel: the repository card reads GIT, which
 * has the branch and its three commits whatever the terminal holds. A window reopened on
 * an existing worktree — `/magic:continue`'s whole job — looks exactly like this.
 *
 * EVERY LINE UNDER ~60 CHARACTERS, which is the same constraint the retired transcript
 * carried: the terminal is 550px less 8px of padding, and at 14px monospace that is ~63
 * columns. The longest line here is the directory, at 47.
 *
 * THE MARK'S THREE ROWS ARE PADDED TO 11 COLUMNS each, so the text beside them lands on
 * one axis. Padding inside the coloured span rather than a second element: the mark and
 * the line it heads are one printed line in the pty, and `whitespace-pre` on the terminal
 * is what keeps the spaces.
 */
const WELCOME = {
  logo: [' ▐▛███▜▌   ', '▝▜█████▛▘  ', '  ▘▘ ▝▝    '],
  version: 'Claude Code v2.1.223',
  model: 'Fable 5.1 · Claude Max',
  cwd: '/Users/camille/dev/magic-pay-PAY-318',
} as const

/**
 * The hint the empty composer carries, which Claude Code prints greyed where the first
 * character will go.
 *
 * A TASK IN PLAIN LANGUAGE, AND NOT A SLASH COMMAND, which is the correction worth
 * recording. This read `Try "/magic:continue PAY-318"` first, chosen to match the state
 * the rest of the window is in — and it was wrong twice over. Claude Code's own hints
 * are natural-language tasks, so a slash command there is this drawing inventing a
 * placeholder the product does not print; and a marketing shot whose one editable field
 * tells the reader to type a command they have never seen sells the command instead of
 * the work. A sentence a person would actually say needs no glossary.
 *
 * IT IS THE TICKET IN THE PANEL, said out loud: `site.infoSidebar.ticketTitle` is "VAT
 * rounded twice on the PDF invoice", and this is what you would ask for about it. The two
 * halves of the window therefore describe one job rather than two, which is the whole
 * reason the panel and the terminal sit side by side in the real app.
 *
 * A LITERAL, not a catalogue key — it is product output, and the product prints English.
 * 45 characters, inside the ~60 the terminal's 550px affords at 14px monospace.
 */
const COMPOSER_HINT = 'Try "round the VAT once, on the invoice total"'

/* ── The two inline SVGs from `TitleBar.tsx` ─────────────────────────────────────── */

/**
 * `LeftSidebarOpenIcon`, TitleBar.tsx:11-19 — the four paths verbatim. A custom vector and
 * not a lucide glyph, which is why it is copied rather than imported: nothing in
 * `lucide-react` draws a panel with three rules down its left edge.
 */
function LeftSidebarOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * `RightSidebarOpenIcon`, TitleBar.tsx:31-39 — the same four paths under the same 180°
 * rotation the app applies as an inline style, so the three rules land on the right edge.
 */
function RightSidebarOpenIcon() {
  return (
    <span className="flex rotate-180">
      <LeftSidebarOpenIcon />
    </span>
  )
}

/**
 * The three macOS window buttons, at their real geometry inside the app's own 64px gutter:
 * 12px discs on a 20px pitch, the first at x=16, vertically centred in the 40px bar.
 *
 * ABSOLUTE, so they cost the titlebar's flex row nothing: the `w-16` spacer beside them is
 * the app's, and the toggle after it has to land exactly where the app puts it. Their three
 * colours are declared in `tailwind.config.ts` under `macos`, beside the notification
 * banner's — somebody else's UI, so a value read off a screenshot gets a name rather than
 * being pasted at a call site where nobody could later tell whether it was chosen.
 */
function TrafficLights() {
  return (
    <span className="absolute left-4 top-3 flex gap-2">
      <span className="h-3 w-3 rounded-full bg-macos-close" />
      <span className="h-3 w-3 rounded-full bg-macos-minimize" />
      <span className="h-3 w-3 rounded-full bg-macos-zoom" />
    </span>
  )
}

/**
 * `WaveLoader.tsx`: three parallel bars, the middle one tallest, with a wave travelling
 * across them. Colourless on purpose — the bars are `currentColor`, so whatever wraps it
 * decides, which in the sidebar is the agent's own state colour.
 *
 * The stagger is an `animation-delay` per bar rather than three keyframes, exactly as the
 * app does it. `motion-reduce:animate-none` freezes them at their resting heights, which
 * is a legible shape rather than a mid-animation one.
 */
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

/** `AgentStateBadge.tsx`, state for state — and `idle` returns nothing, as it does there. */
function AgentStateGlyph({ state }: { state: AgentState }) {
  switch (state) {
    case 'working':
      return <WaveLoader />
    case 'waiting':
      // The question bubble ARRIVES rather than gestures: that state is the agent asking
      // you something, not the agent being slow.
      return <MessageCircleQuestion className="h-4 w-4 animate-ask-arrive motion-reduce:animate-none" />
    case 'completed':
      return <Check className="h-4 w-4" />
    case 'error':
      return <XCircle className="h-4 w-4" />
    case 'idle':
      return null
  }
}

/** A top action of the sidebar, in the geometry all four share. */
function Action({
  icon: Icon,
  label,
  shortcut,
}: {
  icon: typeof ListTodo
  label: string
  shortcut: string
}) {
  return (
    <div className="flex w-full items-center justify-start gap-2 rounded-lg px-2 py-2 text-xs font-medium text-appink">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs opacity-50">{shortcut}</span>
    </div>
  )
}

/** One `UsageBar` of `SidebarUsageCard.tsx`: label, reset countdown, percent, then a track. */
function UsageBar({ label, reset, percent }: { label: string; reset: string; percent: number }) {
  const colors = gaugeColors(percent)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-appink/60">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-appink/35">{reset}</span>
          <span className={`font-semibold ${colors.text}`}>{percent}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

/**
 * THE REPOSITORY CARD'S THREE DASHED CONTROLS — Scripts, VSCode and GitHub — which wear
 * one recipe in the app and get one here: `flex items-center gap-1 px-1.5 py-0.5
 * text-[10px] font-semibold` in icon ink inside a dashed filet at 40%
 * (RepositoryCard.tsx:82 and :91, ScriptsDropdown.tsx:161, character for character).
 *
 * Shared rather than repeated three times, because in the app it IS the same string in
 * three places: a fourth control added there would wear it too.
 */
const DASHED_BUTTON =
  'flex items-center gap-1 rounded border border-dashed border-appline/40 px-1.5 py-0.5 text-[10px] font-semibold text-appink-icon'

/** A branch pill of the branch row: `px-2 py-1.5` on the raised surface, inside a subtle filet. */
function BranchPill({ name, tone }: { name: string; tone: 'base' | 'current' }) {
  const ink = tone === 'current' ? 'text-green' : 'text-appink'
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.06] px-2 py-1.5 ${
        tone === 'current' ? 'flex-1' : 'self-stretch'
      }`}
    >
      <GitBranch className={`h-3.5 w-3.5 shrink-0 ${ink}`} />
      <span className={`truncate text-xs font-medium ${ink}`}>{name}</span>
      {tone === 'current' ? (
        <span className="ml-auto shrink-0 rounded p-1">
          <Copy className="h-3 w-3 text-appink-icon" />
        </span>
      ) : null}
    </div>
  )
}

export function AppWindowMockup() {
  const { t } = useT()

  const added = FILES.reduce((n, f) => n + f.added, 0)
  const removed = FILES.reduce((n, f) => n + f.removed, 0)
  const ratio = added / (added + removed || 1)
  const context = contextColors(CONTEXT_PCT)
  // One agent is waiting on an answer, so the banner reads 1. Counted rather than
  // written, so the number and the list can never disagree — `AttentionBanner` counts
  // `waiting` and `error`, and the rows it counts stay where they are.
  const needsAttention = AGENTS.filter((a) => a.state === 'waiting' || a.state === 'error').length

  return (
    // `bg-appbg` is #0a0a0b, `themes.ts`'s dark window ground. In the app it is the
    // vibrancy behind a transparent window; here it is what that vibrancy resolves to over
    // a dark desktop, and every region paints its own `bg-black/30` on top of it exactly as
    // the app's four do — which is why there is no visible boundary between any of them.
    //
    // `rounded-xl` ON ALL FOUR CORNERS, which it was not: this window used to be cropped
    // by its band and only ever showed a top edge, so the two bottom corners were left
    // square on the argument that nobody would see them. The product owner asked to see
    // the whole app, so they are seen — see the note at the top of `DesktopSection.tsx`.
    // 12px is the radius macOS gives a window, and the app asks for no other: it is
    // `titleBarStyle: 'hidden'` over `transparent` with `vibrancy` (main/index.ts:200-203)
    // and leaves `roundedCorners` at its default, so the platform's own curve is the one
    // to read as. At this band's largest scale (0.85) it lands at ~10px on the page.
    // `overflow-hidden` is what makes the radius cut the four regions' own grounds.
    //
    // `ring-1 ring-inset ring-white/10` is the hairline edge over the aura — a ring
    // rather than a border, so the 1px costs the layout nothing and every measurement
    // inside stays the app's (the same call `components/Flag.tsx` makes), and being inset
    // it follows the radius all the way round. `shadow-lift` is the top rung of the
    // declared elevation scale; the aura behind the window is `DesktopSection`'s, built
    // out of blurred blobs for the reason that file gives.
    //
    // `font-display` and NOT `font-sans` — see the TYPE section at the top of this file.
    // On this site `font-sans` is Avenir; the app is Cera Pro, and this class is the
    // site's handle on it.
    <div
      aria-hidden
      className="flex flex-col overflow-hidden rounded-xl bg-appbg font-display shadow-lift ring-1 ring-inset ring-white/10"
      style={{ width: WINDOW.width, height: WINDOW.height }}
    >
      {/* ── 1. THE TITLEBAR ──────────────────────────────────────────────────────── */}
      <div className="relative flex h-10 shrink-0 select-none items-center justify-between bg-black/30 px-3">
        <TrafficLights />

        <div className="flex items-center gap-2">
          {/* The app's own gutter for the traffic lights (TitleBar.tsx:124). The lights
              above are absolute, so this spacer is the only thing deciding where the
              toggle beside it lands — as it is in the app. */}
          <div className="w-16 shrink-0" />
          <span className="flex items-center gap-1">
            <span className="rounded-full bg-white/[0.06] p-[5px] text-white">
              <LeftSidebarOpenIcon />
            </span>
          </span>
        </div>

        {/* BARE TEXT, absolutely positioned and capped at 36% so it stays clear of the
            controls on both sides. No status dot, no eyebrow, no window title: it is the
            active agent's own title and nothing else. */}
        <div className="absolute left-1/2 max-w-[36%] -translate-x-1/2 truncate text-sm">
          <span className="text-appink">{AGENT_TITLE}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-appink">
            <Archive className="h-3.5 w-3.5 shrink-0" />
            {t('site.desktop.archiveAgent')}
          </span>
          <span className="rounded-full bg-white/[0.06] p-[5px] text-white">
            <RightSidebarOpenIcon />
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── 2. THE LEFT SIDEBAR ────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col bg-black/30" style={{ width: SIDEBAR_WIDTH }}>
          <div className="flex flex-col gap-1 px-2 pt-3">
            <Action icon={ListTodo} label={t('site.agentsCard.tasks')} shortcut="⌘J" />
            <Action icon={Users} label={t('site.agentsCard.team')} shortcut="⌘T" />
            <Action icon={Sparkles} label={t('site.agentsCard.skills')} shortcut="⌘;" />
            {/* `SidebarAccount`, signed in: the person's own name, and ⌘, because the row
                opens Settings rather than saying so. */}
            <Action icon={CircleUserRound} label="Camille" shortcut="⌘," />
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
            {/* `pl-2` and no `pr`: the label lines up with everything above and below it,
                and the two controls stay flush against the right edge. Sort BEFORE the
                plus — the one that changes the list reads before the one that adds to it. */}
            <div className="flex items-center gap-1 pb-2 pl-2 pt-3">
              <div className="mr-auto text-xs uppercase tracking-wider text-appink/50">
                {t('site.agentsCard.agents')}
              </div>
              <span className="p-1.5 text-appink-icon">
                <ArrowDownUp className="h-4 w-4" />
              </span>
              <span className="p-1.5 text-appink-icon">
                <Plus className="h-4 w-4" />
              </span>
            </div>

            {/* A COUNT, NOT A GROUP — and absent entirely at zero, so a calm list stays
                calm. `text-orange`, the app's own tone for it. */}
            {needsAttention > 0 ? (
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-orange">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">{t('site.agentsCard.attention')}</span>
                <span className="ml-auto">{needsAttention}</span>
              </div>
            ) : null}

            <div className="mt-1 flex flex-col gap-1">
              {AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs ${
                    agent.active ? `${STATE_TINT[agent.state]} text-white` : 'text-appink'
                  }`}
                >
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate font-medium">{agent.name}</div>
                  </div>
                  {/* A FIXED SLOT at the end of the row, so the labels above and below an
                      idle agent do not shift by the width of a glyph it does not draw. */}
                  <span className={`flex h-4 w-4 items-center justify-center ${STATE_TONE[agent.state]}`}>
                    <AgentStateGlyph state={agent.state} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── THE FOOTER: the usage card, then the version line ─────────────────── */}
          <div className="mx-2 mb-2 rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-appink-icon">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">Camille</span>
              </span>
              <span className="shrink-0 rounded p-0.5 text-appink-icon">
                <Minus className="h-3 w-3" />
              </span>
            </div>
            <div className="space-y-2">
              <UsageBar
                label={t('site.usageCard.session')}
                reset={t('site.usageCard.resetSession')}
                percent={SESSION_PCT}
              />
              <UsageBar
                label={t('site.usageCard.weekly')}
                reset={t('site.usageCard.resetWeekly')}
                percent={WEEKLY_PCT}
              />
            </div>
          </div>

          {/* THE VERSION AND NOTHING ELSE. No Docs, no Changelog, no GitHub, no dots. */}
          <div className="flex items-center justify-start gap-2 px-4 py-2 text-xs text-appink">
            <span className="opacity-60">{VERSION}</span>
          </div>
        </div>

        {/* ── 3. THE TERMINAL ────────────────────────────────────────────────────── */}
        {/* `p-2` and nothing else — 8px of uniform padding, xterm transparent on the
            sunken ground. `font-mono` is the generic stack the app itself falls back to
            when Hack is not there; `text-[14px] leading-none` is `fontSize: 14` with
            `lineHeight: 1.0`, and both numbers are the app's rather than the page's.
            `overflow-hidden` because a terminal clips: a line longer than the grid is cut
            by the right edge in the real thing too, never wrapped into the column. */}
        <div className="min-w-0 flex-1 bg-black/30 p-2">
          {/* THE COLUMN STARTS AT THE TOP AND STOPS, which is what an empty session looks
              like: Claude Code prints its banner and its box on the first rows and leaves
              the rest of the grid alone. Nothing is pushed to the bottom — there is no
              scrollback yet to push it there. */}
          <div className="flex h-full flex-col overflow-hidden whitespace-pre font-mono text-[14px] leading-none">
            {/* THE BANNER. The mark in Claude Code's own orange — the one colour here
                that is not a slot of the theme's palette, see `ANSI` — then the build in
                full white and the model and directory in the dimmed ink beside it. */}
            <div>
              <span className={ANSI.logo}>{WELCOME.logo[0]}</span>
              <span className={ANSI.fg}>{WELCOME.version}</span>
            </div>
            <div>
              <span className={ANSI.logo}>{WELCOME.logo[1]}</span>
              <span className={ANSI.dim}>{WELCOME.model}</span>
            </div>
            <div>
              <span className={ANSI.logo}>{WELCOME.logo[2]}</span>
              <span className={ANSI.dim}>{WELCOME.cwd}</span>
            </div>

            {/* A non-breaking space, not an empty element: a blank line in a terminal
                still occupies a row, and an empty `div` at `leading-none` occupies none. */}
            <div>&nbsp;</div>

            {/* CLAUDE CODE'S COMPOSER, and it is TERMINAL TEXT. The app draws no input of
                its own — this box is printed into the pty with the same box-drawing
                characters a real session prints, and the mode line under it is Claude
                Code's too.

                THE FRAME IS A THREE-PART FLEX ROW rather than a counted run of `─`,
                which is the one concession to the medium: the character count that fills
                550px depends on which monospace face the visitor's machine resolves, and
                a run one character too long would be clipped mid-border while one too
                short would leave the corner floating. A corner, a filling rule and a
                corner land on the edges at any metric. */}
            <div className={`flex ${ANSI.dim}`}>
              <span>╭</span>
              <span className="min-w-0 flex-1 overflow-hidden">
                ──────────────────────────────────────────────────────────────────────────
              </span>
              <span>╮</span>
            </div>
            <div className={`flex ${ANSI.dim}`}>
              <span>│ </span>
              <span className="flex min-w-0 flex-1 items-center overflow-hidden">
                <span className={ANSI.dim}>&gt;&nbsp;</span>
                {/* The block caret, blinking on the app's own 1.1s step, and the greyed
                    hint sitting where the first character will land. */}
                <span className="inline-block h-3.5 w-2 animate-caret-blink bg-white/70 motion-reduce:animate-none" />
                <span className={`${ANSI.dim} pl-1`}>{COMPOSER_HINT}</span>
              </span>
              <span>│</span>
            </div>
            <div className={`flex ${ANSI.dim}`}>
              <span>╰</span>
              <span className="min-w-0 flex-1 overflow-hidden">
                ──────────────────────────────────────────────────────────────────────────
              </span>
              <span>╯</span>
            </div>
            {/* THE MODE LINE STAYS, empty session or not: the app launches `claude` with
                `--permission-mode` whenever the configured launch mode is not the default
                (`pty/terminal-manager.ts:507`), so Claude Code prints the mode from its
                very first frame. */}
            <div className="flex">
              <span className={`${ANSI.blue} pl-2`}>⏵⏵ accept edits on</span>
              <span className={`${ANSI.dim} ml-auto`}>shift+tab to cycle</span>
            </div>
          </div>
        </div>

        {/* ── 4. THE RIGHT PANEL ─────────────────────────────────────────────────── */}
        {/* NO HEADER. No title, no agent name, no close X — the close action is the
            Archive pill in the titlebar, because it belongs to the agent and not to a
            panel that may be collapsed. `font-display` again, kept on the column even
            though the window root now carries it: this is the one region whose family the
            app sets EXPLICITLY, as an inline `fontFamily` on the scrolling container
            (AgentInfoSidebar.tsx:445), and dropping the class here would hide that. */}
        <div
          className="shrink-0 space-y-4 bg-black/30 p-4 font-display"
          style={{ width: PANEL_WIDTH }}
        >
          {/* ── 4a. THE SESSION CARD (`UsageCard.tsx`) ────────────────────────────── */}
          <div className="space-y-3 rounded-xl bg-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-appink/50">
                  {t('site.infoSidebar.session')}
                </span>
                <span className="flex items-center gap-1 text-[11px] normal-case tracking-normal text-appink-icon">
                  <RefreshCw className="h-3 w-3" />
                  {t('site.infoSidebar.justNow')}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 rounded-md bg-purple/15 px-1.5 py-0.5 text-[11px] font-medium text-purple">
                  <Cpu className="h-3 w-3" />
                  Fable 5.1
                </span>
                <span className="flex shrink-0 items-center justify-center self-stretch rounded-md px-1 text-appink-icon">
                  <Minus className="h-3 w-3" />
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-appink">
                  <Gauge className="h-3.5 w-3.5" />
                  {t('site.infoSidebar.context')}
                </span>
                <span className={`font-medium ${context.text}`}>{CONTEXT_PCT}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                <div className={`h-full rounded-full ${context.bar}`} style={{ width: `${CONTEXT_PCT}%` }} />
              </div>
              <div className="text-[11px] tabular-nums text-appink/70">540.0k / 1.00M tokens</div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-appink">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums text-white">$3.13</span>
              </span>
              <span className="flex items-center gap-1.5 text-appink">
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums">24m 18s</span>
              </span>
            </div>
          </div>

          {/* ── 4b. THE TICKET CARD (`TicketHeader.tsx`) ──────────────────────────── */}
          <div className="rounded-xl bg-white/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between">
              {/* The mark hangs off the ticket ID rather than off the link: it says which
                  tracker the ID belongs to, which is worth showing whether or not a URL
                  could be built for it. */}
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <JiraMark className="h-3.5 w-3.5 shrink-0" />
                PAY-318
              </span>
              {/* `in progress` — `bg-yellow/20 text-yellow`, `STATUS_OPTIONS`' own pair for
                  it. An agent mid-implementation is exactly what this status means, and
                  the terminal beside it is showing that implementation. */}
              <span className="flex items-center gap-1.5 rounded-full bg-yellow/20 px-2.5 py-1 text-xs font-medium text-yellow">
                {t('site.status.inProgress')}
                <ChevronDown className="h-3 w-3" />
              </span>
            </div>

            <div className="flex items-start gap-2">
              <h2 className="flex-1 break-words text-sm font-semibold leading-tight text-white">
                {t('site.infoSidebar.ticketTitle')}
              </h2>
              <Edit2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-appink-muted" />
            </div>
            <div className="mt-3 flex items-start gap-2">
              <div className="flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/60">
                {t('site.infoSidebar.ticketDescription')}
              </div>
              <Edit2 className="mt-0.5 h-3 w-3 shrink-0 text-appink-muted" />
            </div>
          </div>

          {/* ── 4c. THE REPOSITORY CARD (`RepositoryCard.tsx`) ────────────────────── */}
          {/* A `space-y-3` LIST, because an agent can carry several repositories — this
              one carries one, and the list is what makes the second one cost no layout. */}
          <div className="space-y-3">
            <div className="rounded-xl bg-white/[0.06] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${REPO_COLOR}1f`, color: REPO_COLOR }}
                >
                  <FolderGit2 className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-sm font-medium text-white/90">magic-pay</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {/* SCRIPTS, and it reads FIRST — `ScriptsDropdown` is the first child of
                      this row in the app (RepositoryCard.tsx:78), before VSCode, GitHub
                      and the remove X. Drawn CLOSED, which is its resting state, and the
                      chevron is part of that state rather than a hint that something is
                      open: the trigger carries `Play`, the label and a `w-2.5` chevron at
                      all times (ScriptsDropdown.tsx:163-165), and the panel it opens is
                      portalled to `<body>` and absent until it is clicked. */}
                  <span className={DASHED_BUTTON}>
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

              {/* The branch row: where the work came from, an arrow, where it is now. The
                  current branch is green in both its glyph and its label. */}
              <div className="mb-2 flex items-center gap-1.5">
                <BranchPill name={BASE_BRANCH} tone="base" />
                <ArrowRight className="h-3 w-3 shrink-0 text-appink-muted" />
                <BranchPill name={BRANCH} tone="current" />
              </div>

              {/* Uncommitted changes, with the six-square gauge: each square is green when
                  the additions' share of the diff clears `(i + 1) / 6`, so the row reads as
                  a proportion rather than as a number. */}
              <div className="mb-2 rounded-md border border-white/5 bg-white/[0.06] p-2">
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <span className="font-medium text-appink/70">{t('site.infoSidebar.uncommitted')}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-appink/50">
                      {t('site.infoSidebar.files', { count: FILES.length })}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-green">+{added}</span>
                      <span className="text-red">-{removed}</span>
                    </span>
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-1.5 rounded-sm ${
                            ratio >= (i + 1) / 6 ? 'bg-green' : 'bg-red'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {FILES.map((file) => (
                    // The BASENAME only, which is what the app shows: the full path is the
                    // row's title attribute there, and at this width a path is a truncation.
                    <div key={file.file} className="flex items-center gap-1.5 py-0.5 text-xs">
                      <span className="flex-1 truncate font-mono text-appink/60">{file.file}</span>
                      <span className="shrink-0 text-[10px] text-appink/40">
                        <span className="text-green">+{file.added}</span>
                        {file.removed > 0 ? <span className="text-red"> -{file.removed}</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* The commits already on the branch. "N ahead of main" is the app's own
                  literal (RepositoryCard.tsx:227) — git's phrasing, in every language. */}
              <div className="rounded-md border border-white/5 bg-white/[0.06] p-2">
                <div className="mb-1.5 flex items-center text-xs">
                  <span className="font-medium text-appink/70">{t('site.infoSidebar.commits')}</span>
                  <span className="ml-auto text-appink/50">
                    {COMMITS.length} ahead of {BASE_BRANCH}
                  </span>
                </div>
                <div className="space-y-1">
                  {COMMITS.map((commit) => (
                    <div key={commit.hash} className="flex items-center gap-2 py-0.5 text-xs">
                      <span className="flex-1 truncate text-appink/60">{commit.subject}</span>
                      <span className="shrink-0 text-xs text-appink/40">{commit.age}</span>
                      <span className="flex shrink-0 items-center gap-1 rounded border border-appline/30 bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-appink-icon">
                        {commit.hash}
                        <Copy className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4d. THE ADD-REPOSITORY BOX ────────────────────────────────────────── */}
          <div className="w-full rounded-lg border border-dashed border-appline/50 py-4 text-center">
            <div className="text-xs text-appink/50">Add a repository</div>
          </div>
        </div>
      </div>
    </div>
  )
}
