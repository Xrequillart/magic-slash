'use client'

import { ChevronDown, ChevronsUp, ListTodo, RefreshCw, Search, X } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { GithubMark } from '../features/TasksModalMockup'
import { JiraMark } from '../features/TicketCardMockup'

/**
 * The five drawings inside `BuiltForSection`'s five cards.
 *
 * ONE FILE AND NOT FIVE, for `WorkflowArt.tsx`'s reason and with the same caveat: what
 * these share is the light panel — `ART_PANEL` / `PANEL_GROUND` below, stated once — and
 * three of them deliberately do not use it. Tasks is a DARK window, and the Mac and switch
 * cards are not panels at all. Splitting the file to keep one constant pure would have put
 * three short components in files of their own for the sake of a string two of them read.
 *
 * WHAT THEY ARE NOT: five reproductions of the app. `/features` measures its mockups off
 * `desktop/src/renderer/` file by file because that page's promise is "this is the
 * product". This band's promise is "the app is built for you, whoever you are", and five
 * faithful crops of one window would say the opposite of that — a wall of the same grey
 * screen. So each drawing shows ONE thing, at the fidelity that one thing needs: the Tasks
 * window is the real screen because a backlog has to look like a backlog; the switch is a
 * switch with nothing around it, because a preference is an idea and not a settings pane.
 *
 * THE LITERALS ARE ENGLISH IN BOTH LANGUAGES and they are not catalogue keys — the GitHub
 * logins and labels, the Jira statuses, epics and priorities, the repository slugs, the
 * key names on the keycaps. Same rule the whole site follows (`CommitsCardMockup.tsx`
 * states it): a string the TOOL or the PLATFORM prints stays in the language it is printed
 * in. A Jira status is the word a site's own board column is called and the app translates
 * none of them, so a French reader sees exactly what the French app would show them. And
 * macOS names its modifiers with glyphs (⌘, ⌃) rather than with words in either language.
 *
 * THE SHORTCUTS ARE THE REAL ONES, which is the one thing on this band that could quietly
 * become a lie. ⌘N is `pages/Terminals/index.tsx`, ⌘↓ is the Command+Arrow handler beside
 * it, and ⌘/ is `App.tsx`'s split-view toggle. Their labels mirror the app's own
 * `settings.shortcuts.*` strings in both languages rather than paraphrasing them, so the
 * site and the Settings pane name the same key the same way.
 *
 * `aria-hidden` ON EVERY ONE OF THEM, at the outermost node. Each paraphrases the
 * description directly above it in its card; a screen reader walking into this would hear
 * the same claim twice, the second time as a handful of disconnected fragments.
 */

/**
 * The panel the two light drawings stand on — `WorkflowArt`'s recipe, restated here rather
 * than exported from there.
 *
 * NOT AN IMPORT, and it is worth being explicit because the duplication is two short
 * strings. `WorkflowArt`'s panels are cropped by their cards and are all light; three of
 * these are neither, so the constant those five share is not the constant these five
 * share. Reaching across for it would have made one band's chrome the other band's
 * dependency, and the first drawing that needed a different ground would have added a prop
 * to a file it does not belong to.
 */
const ART_PANEL = 'overflow-hidden rounded-xl border border-hairline shadow-lift'

/** `canvas`, the site's off-white: page → coloured card → panel, three distinct steps. */
const PANEL_GROUND = 'bg-canvas'

/* ── ① Tasks ────────────────────────────────────────────────────────────────────── */

/**
 * The Tasks window, IN DARK, cropped by the card's bottom edge.
 *
 * IT IS `/features`'s OWN MOCKUP, ADAPTED, which the product owner asked for outright —
 * "reprendre la mockup tasks présente dans all features et tu l'adaptes pour la même dans
 * la card tasks, mets-la en dark mode comme dans la page all features". What replaced the
 * light three-row list that shipped first: the app's real screen, band for band, at the
 * size a card can hold.
 *
 * WHY DARK IS THE RIGHT CALL and not merely the one asked for. Every theme the app ships
 * is dark (`desktop/src/themes.ts`), so a light Tasks list was a screen the product does
 * not have — the one drawing in this band that was inventing rather than reproducing. It
 * now uses the same stand-in `TasksModalMockup` uses: `bg-ink` with the declared
 * white-alpha ramp (`onink-body`, `onink-dim`, `onink-faint`, `onink-rule`, `onink-tint`),
 * because this webapp has one light palette and the app runs its themes off CSS variables.
 *
 * ADAPTED AND NOT IMPORTED, and the difference is what the two surfaces are for.
 * `TasksModalMockup` is a full-width block on a page whose promise is completeness: it
 * draws the whole modal at the app's own pixel values, both repository cards with three
 * rows each, the four-control filter bar, and a legend under it. Dropped into a card two
 * columns wide it would be a 40% crop of a screenshot. So the same screen is drawn again
 * at card scale — the chrome, the section line, the filter bar, one GitHub card and one
 * Jira card — and everything that survived kept the source's geometry rather than being
 * re-eyeballed.
 *
 * BOTH TRACKERS, AND THAT IS WHY THE SECOND CARD IS HERE AT ALL. The card's description
 * claims GitHub and Jira in one list; a drawing with three GitHub rows would leave the
 * reader to take half of it on trust. A GitHub row carries `#number`, an `@login` and its
 * labels; a Jira row carries a `PROJ-123` key, a status pill and the epic it hangs off.
 * Two different second lines, and showing one of them is showing half the screen.
 *
 * THE COPY IS `site.tasksCard.*`, reused entirely — the chrome the app translates, and the
 * six invented ticket titles `/features` already had. Not one new catalogue entry, which
 * is the point of the family existing: two drawings of one screen, one set of words.
 *
 * CROPPED AT THE BOTTOM, and that took the card's whole layout with it. It shipped
 * `beside` — copy in a 24rem column, the window in the space left over, cut by the card's
 * right edge — and the product owner moved it: "pour les tâches tu peux mettre
 * l'illustration en bas ? et faire un crop en bas de l'illustration ? mets la description
 * en 100% en haut."
 *
 * IT IS THE BETTER SHAPE FOR THIS PARTICULAR DRAWING, and the reason is what a side crop
 * was costing. `beside` gave the window about 330px, which is less than half the modal —
 * so the cut fell through the middle of every ROW, taking the row links, the per-card
 * counts and the tail of each title. Stacked, the window gets the card's full width and
 * the crop moves to the bottom, where what it takes is the LAST ROW: a list that runs off
 * the frame rather than a screenshot sliced down its spine. That is `TasksModalMockup`'s
 * own crop, arrived at from the same direction — "a list that ends inside its own picture
 * is a list you have seen all of, and a backlog is never that".
 *
 * SO THERE IS NO `min-w-` LEFT. The panel is as wide as the card, and the negative bottom
 * margin is the only crop; the earlier `min-w-[28rem]` existed solely to give a horizontal
 * cut something to bite on and would now do nothing but re-introduce one.
 */
const GITHUB_ROWS: readonly {
  number: string
  title: MessageKey
  author: string
  labels: readonly string[]
  agent?: true
}[] = [
  { number: '#412', title: 'site.tasksCard.gh1', author: 'lmartel', labels: ['bug', 'payments'] },
  { number: '#409', title: 'site.tasksCard.gh2', author: 'nadia-b', labels: ['enhancement'], agent: true },
  { number: '#404', title: 'site.tasksCard.gh3', author: 'lmartel', labels: ['bug'] },
]

const JIRA_ROWS: readonly {
  key: string
  title: MessageKey
  status: string
  statusTone: string
  epic: string
  epicColor: string
  priority?: string
}[] = [
  {
    key: 'PAY-318',
    title: 'site.tasksCard.jira1',
    status: 'In Progress',
    statusTone: 'bg-accent/20 text-accent-hover',
    epic: 'Checkout',
    epicColor: '#a855f7',
    priority: 'Highest',
  },
  {
    key: 'PAY-311',
    title: 'site.tasksCard.jira2',
    status: 'To Do',
    statusTone: 'bg-onink-tint text-onink-dim',
    epic: 'Checkout',
    epicColor: '#a855f7',
  },
]

/** `rowActivation`'s geometry, tightened one step for a card: the source's `py-2.5 px-4`. */
const TASK_ROW = 'flex items-center gap-2.5 border-t border-onink-rule px-3 py-2'

/** The card a tracker's rows sit in — `TasksModalMockup`'s `CARD`, on the same tokens. */
const TASK_CARD = 'overflow-hidden rounded-lg border border-onink-rule bg-onink-tint'

/**
 * The tracker's mark on a tile of its own. The app's `sm` tile is `w-8 h-8`; this is one
 * step down for a card. Jira's ground is its brand blue at 14%, spelled as an inline style
 * here as it is in the app and in `TasksModalMockup`: it is the BRAND's blue, not a token.
 */
function TrackerTile({ tracker }: { tracker: 'github' | 'jira' }) {
  const jira = tracker === 'jira'

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
        jira ? '' : 'bg-onink-selected text-white'
      }`}
      style={jira ? { backgroundColor: 'rgba(38, 132, 255, 0.14)' } : undefined}
    >
      {jira ? <JiraMark className="h-3.5 w-3.5" /> : <GithubMark className="h-3.5 w-3.5" />}
    </span>
  )
}

/** The ticket's id, in `TicketBadge`'s accent tokens. */
function TicketBadge({ id }: { id: string }) {
  return (
    <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[11px] text-accent-hover">
      {id}
    </span>
  )
}

/** A repository card's own header: the chevron, its colour, its name and its tracker. */
function RepoHeader({ color, name, tracker }: { color: string; name: string; tracker: string }) {
  return (
    <div className="flex w-full items-center gap-2 px-3 py-2">
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-onink-dim" />
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate text-xs font-medium text-white">{name}</span>
      {/* Untranslated in the app on purpose: "GitHub" and "Jira" are product names. */}
      <span className="shrink-0 text-[11px] text-onink-faint">· {tracker}</span>
    </div>
  )
}

export function TasksArt() {
  const { t } = useT()

  return (
    // `-mb-10` runs the window 40px past the card's bottom edge, where `ToneCard`'s
    // `overflow-hidden` cuts it. The side gutters stay, so the crop reads as ONE edge:
    // a window seen from the top down, not a panel trimmed on three sides.
    <div aria-hidden className="-mb-10 px-7">
      {/* `bg-ink` is this site's stand-in for the app's darkest ground and `shadow-lift`
          — the scale's loudest rung — is what lifts the window off the card. The border is
          `onink-rule`, the inverse filet: `border-hairline` is 8% INK and would vanish
          here. Exactly `TasksModalMockup`'s three choices. */}
      <div className="overflow-hidden rounded-xl border border-onink-rule bg-ink shadow-lift">
        {/* THE CHROME. `PageModal.tsx`: a fixed-height bar, title left, close right. */}
        <div className="flex h-10 items-center justify-between border-b border-onink-rule px-3">
          <span className="text-xs font-semibold text-white">{t('site.tasksCard.title')}</span>
          <X className="h-3.5 w-3.5 text-onink-dim" />
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          {/* THE SECTION LINE: the list's icon, its name, then the page total and Reload
              pushed to the far end. All of it survives now that the crop is at the bottom
              rather than at the right — which is the second thing the layout change
              bought, after the rows. */}
          <div className="flex items-center gap-2 text-xs text-onink-body">
            <ListTodo className="h-3.5 w-3.5 shrink-0" />
            <span>{t('site.tasksCard.section')}</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-onink-faint">
                {t('site.tasksCard.total')}
              </span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-onink-rule px-1.5 py-0.5 text-[11px] font-medium text-onink-dim">
                <RefreshCw className="h-3 w-3" />
                {t('site.tasksCard.reload')}
              </span>
            </span>
          </div>

          {/* THE FILTER BAR, at three controls rather than the source's four: the search
              box takes the width, then the repository picker and the sort at their
              declared 176px and 152px, scaled for a card. The fourth — the tracker filter
              — is the one this width genuinely cannot hold. */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-onink-faint" />
              <div className="w-full truncate rounded-lg border border-onink-rule bg-onink-tint py-1 pl-7 pr-2 text-[11px] text-onink-faint">
                {t('site.tasksCard.search')}
              </div>
            </div>
            <div className="flex w-32 shrink-0 items-center gap-1 rounded-lg border border-onink-rule bg-onink-tint px-2 py-1 text-[11px] text-white">
              <span className="truncate">{t('site.tasksCard.allRepos')}</span>
              <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-onink-dim" />
            </div>
            <div className="hidden w-28 shrink-0 items-center gap-1 rounded-lg border border-onink-rule bg-onink-tint px-2 py-1 text-[11px] text-white sm:flex">
              <span className="truncate">{t('site.tasksCard.sortRecent')}</span>
              <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-onink-dim" />
            </div>
          </div>

          {/* ── The GitHub card ──────────────────────────────────────────────────── */}
          <div className={TASK_CARD}>
            <RepoHeader color="#6366f1" name="acme/checkout-api" tracker="GitHub" />
            {GITHUB_ROWS.map((row) => (
              <div key={row.number} className={TASK_ROW}>
                <TrackerTile tracker="github" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <TicketBadge id={row.number} />
                    <span className="truncate text-xs text-white">{t(row.title)}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[11px] text-onink-dim">@{row.author}</span>
                    {/* A label always renders in the NEUTRAL tokens, which is faithful
                        rather than lazy: `StatusPill` only colours the `/magic:*`
                        workflow's own statuses, and a repository's own labels miss that
                        table. A red "bug" here would be a colour the app never gives it. */}
                    {row.labels.map((label) => (
                      <span
                        key={label}
                        className="shrink-0 rounded-full bg-onink-tint px-1.5 py-0.5 text-[11px] text-onink-dim"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                {/* THE ROW THAT IS ALREADY TAKEN, and it is the one thing in this drawing
                    a reader could not infer: the list is not the sprint. `taskRows.ts`
                    only lists an In Progress ticket when an agent is on it, marked. */}
                {row.agent && (
                  <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-onink-dim">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                    {t('site.tasksCard.agent')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── The Jira card ────────────────────────────────────────────────────── */}
          <div className={TASK_CARD}>
            <RepoHeader color="#22c55e" name="acme/billing-web" tracker="Jira" />
            {JIRA_ROWS.map((row) => (
              <div key={row.key} className={TASK_ROW}>
                <TrackerTile tracker="jira" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <TicketBadge id={row.key} />
                    <span className="truncate text-xs text-white">{t(row.title)}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] ${row.statusTone}`}
                    >
                      {row.status}
                    </span>
                    {/* The epic: a neutral pill with the colour spent entirely on the dot,
                        because the status and the priority either side of it are coloured
                        to be read as a scale and an epic is neither a state nor a degree. */}
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-onink-tint px-1.5 py-0.5 text-[11px] text-onink-dim">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.epicColor }}
                      />
                      {row.epic}
                    </span>
                    {/* The priority leads with an ARROW, which is Jira's own vocabulary
                        and not an invention: a direction survives being skimmed down a
                        column in a way a word never does. */}
                    {row.priority && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-red/20 py-0.5 pl-0.5 pr-1.5 text-[11px] text-red">
                        <ChevronsUp className="h-3 w-3 shrink-0" />
                        {row.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ② Keyboard navigation ──────────────────────────────────────────────────────── */

/**
 * A keycap. `min-w-` and not a fixed width, because ⌘ and ↓ are one glyph and a word is
 * several: a square that fitted the widest would leave the modifiers swimming, and one
 * that fitted ⌘ would clip the word.
 *
 * WHITE ON A HAIRLINE WITH A SHADOW, which is what makes it a KEY rather than a code span.
 * The shadow is the one detail doing that work — a key is a thing standing off the board,
 * and a flat rounded rectangle with monospace in it is a token. `shadow-button` is the
 * declared rung for exactly that (a control at rest); nothing here invents a shadow.
 */
function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-md border border-hairline bg-white px-1.5 py-1 font-mono text-xs font-semibold text-ink shadow-button">
      {children}
    </span>
  )
}

/**
 * Three rows of the app's own shortcut sheet: what it does on the left, the keys on the
 * right.
 *
 * THE SHEET AND NOT A FLOATING PAIR OF KEYCAPS, which was the first sketch. Two big caps
 * on a coloured ground are a nice object and say nothing — a reader sees "keyboard" and
 * learns no more than the title told them. The rows say which moves have keys, and three
 * of them is enough to imply the rest without turning the card into documentation.
 *
 * SEVEN, AND IT WAS THREE. The product owner asked for more — "tu peux mettre plus de key
 * words pour agrandir l'illustration" — and the request came with the layout change next
 * door: the Tasks card beside this one is now a full-width window and grew a good deal
 * taller, so a three-row sheet left this card as a headline over a strip of nothing.
 *
 * SEVEN IS ALSO THE HONEST NUMBER. These are every chord in the app that MOVES you — a new
 * agent, the next, the previous, the split, the two sidebars, and closing one — which is
 * what the card's title claims since the owner renamed it from "Keyboard shortcuts" to
 * "Keyboard navigation". ⌘D (duplicate an agent) is the one the app has that is not here,
 * because duplicating is not navigating; the Settings pane lists all eight.
 *
 * THE LAST ROW IS CUT BY THE CARD, and the list is ordered so that the row losing its
 * bottom half is the least load-bearing of the seven. A sheet that ends neatly is a sheet
 * you have read all of, which is the wrong thing to say about a set of shortcuts.
 *
 * TWO OF THE LABELS ARE SHORTER THAN THE APP'S OWN, which is a deliberate break from this
 * file's rule that a label mirrors `settings.shortcuts.*` word for word. The app says
 * "Toggle agents list" and "Toggle agent info" — 34 characters in French
 * ("Afficher/masquer la liste des agents") against a keycap pair on a third-width card, so
 * they wrap to three lines and the sheet stops being a sheet. "Agents list" and "Agent
 * info" name the same thing and are what anyone would say out loud. The other five are
 * verbatim.
 *
 * THE LABELS CARRY `font-semibold text-ink`, at the owner's request and it reads better
 * for it: they went in at `font-medium text-ink/80`, which is the weight a caption takes,
 * and against a keycap — white, edged, shadowed — a caption loses. A shortcut sheet is two
 * columns of equal standing, so the left one has to hold its own.
 */
const SHORTCUTS = [
  { id: 'new', label: 'site.builtFor.shortcutNew', keys: ['⌘', 'N'] },
  { id: 'next', label: 'site.builtFor.shortcutNext', keys: ['⌘', '↓'] },
  { id: 'prev', label: 'site.builtFor.shortcutPrev', keys: ['⌘', '↑'] },
  { id: 'split', label: 'site.builtFor.shortcutSplit', keys: ['⌘', '/'] },
  { id: 'agents', label: 'site.builtFor.shortcutAgents', keys: ['⌘', 'B'] },
  { id: 'info', label: 'site.builtFor.shortcutInfo', keys: ['⌘', 'I'] },
  { id: 'close', label: 'site.builtFor.shortcutClose', keys: ['⌘', 'W'] },
] as const

export function ShortcutsArt() {
  const { t } = useT()

  return (
    // Cropped at the BOTTOM rather than at the side: the rows are a list, and a list
    // running off the bottom edge says there are more of them — which is true, and is the
    // claim the card makes in one line. The wrapper's negative bottom margin pulls the
    // panel past the card's own edge and `ToneCard`'s `overflow-hidden` does the cutting.
    <div aria-hidden className="-mb-6 px-7">
      <div className={`${ART_PANEL} ${PANEL_GROUND} p-3`}>
        <ul className="space-y-1">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-white"
            >
              <span className="min-w-0 truncate text-xs font-semibold text-ink">
                {t(shortcut.label)}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <Keycap key={key}>{key}</Keycap>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ── ③ Truly Mac-native ─────────────────────────────────────────────────────────── */

/**
 * Apple's mark, filled with a gradient, glowing on the card's own dark ground.
 *
 * ── HOW THIS CARD GOT HERE, in three rounds, because each one was a real correction ──
 *
 * It shipped as a dark tile with a gradient LIGHTNING BOLT in it, drawn to a reference the
 * product owner supplied. They asked for the style to be revisited — "je ne suis pas fan
 * de l'éclair" — and a bolt is indeed a stock glyph for "fast", which is one third of what
 * this card claims. It was replaced with the real macOS menu-bar capture, on the argument
 * that "truly Mac-native" is the one claim here a DRAWING cannot make.
 *
 * The owner then settled it: keep the composition of the first reference — the glow, the
 * gradient — and put APPLE'S OWN MARK in it. That is the right answer and it beats both
 * previous ones, because it says the whole claim in one glyph. The bolt said "fast" and
 * invented a symbol the product does not own; the menu-bar photograph said "it runs on a
 * Mac" but buried it in a 376px capture where the app's icon is 20px across. This says
 * "Mac" at the size of the card, instantly, from across the room.
 *
 * THE MARK IS NOMINATIVE, which is worth stating once. It appears here to name the
 * PLATFORM the app is built for — the same use every Mac app's download page makes of it —
 * and nowhere near this site's own branding, our logo, or anything that could read as
 * Apple having made or endorsed this. It is not in the header, the footer or the favicon.
 *
 * IT IS A BITMAP UNDER A MASK, not an SVG path, and that is deliberate. The mark has an
 * exact silhouette that a hand-traced path gets subtly wrong, and the owner supplied the
 * file; `public/img/apple-mark.png` is it, 512px and 5.6KB, black on transparent. The
 * transparency is what makes the mask work: an alpha mask over a div wearing the gradient,
 * so the COLOUR is ours and only the shape is the file's. `mask-*` goes through `style`
 * rather than through arbitrary Tailwind — it needs the `-webkit-` twin, and a four-line
 * arbitrary-value class list is exactly the hardcoded value the design brief rules out.
 *
 * THE GRADIENT IS `mark-apple` in `tailwind.config.ts`, declared beside the card tones
 * rather than spelled here: three cool stops, the first reference's own sweep. See the
 * note there for why it is neither a tone nor a plate.
 *
 * THE AURA IS FOUR BLURRED DISCS, `DesktopSection`'s own `Aura` in miniature and for its
 * reason: one colour at two strengths reads as a glow somebody applied, four hues laid
 * across each other read as light. They are `purple`, `red`, `accent` and `blue` — palette
 * tokens, not arbitrary hexes — and they sit BEHIND the tile in the stacking order, so the
 * tile stays solid rather than being tinted by its own halo.
 */
export function MacNativeArt() {
  return (
    // `h-52 pb-8`: 208px for the tile and its glow, then 32px of nothing under it. The
    // padding is the owner's second ask on this card — "qu'il y ait plus d'espace en bas de
    // la card" — and a stacked visual is `mt-auto`, flush with the card's bottom edge, so
    // the air has to be asked for. It is not a crop: the tile is a complete object and an
    // object touching the frame reads as having slipped down rather than as being placed.
    <div aria-hidden className="relative flex h-52 items-center justify-center pb-8">
      {/* THE WASH. `inset-0` and a blur, so the colour ends inside the card rather than at
          its edge — the reference's light falls off well before the corners, which is what
          stops it reading as a second background.

          CENTRED ON 42% AND NOT ON 50%, because `inset-0` spans the padding too: the tile
          sits in the 208px above the `pb-8`, so a halo centred on the wrapper would hang
          32px below the thing it is supposed to be coming from. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[42%] h-40 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/40 blur-2xl" />
        <div className="absolute left-1/2 top-[52%] h-32 w-44 -translate-x-1/2 rounded-full bg-red/30 blur-2xl" />
        <div className="absolute left-1/2 top-[20%] h-32 w-44 -translate-x-1/2 rounded-full bg-accent/40 blur-2xl" />
        <div className="absolute left-[36%] top-[42%] h-24 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue/30 blur-2xl" />
      </div>

      {/* THE TILE, at 128px and it was 96. The product owner asked for both it and the
          mark to take more of the card — "augmente la taille du logo Apple et de la puce
          Apple, j'aimerais qu'elle prenne plus de place" — and the two numbers had to move
          together: a bigger mark inside the old square would have filled it corner to
          corner and stopped reading as an icon.

          `rounded-[28px]` rather than `rounded-3xl`, and it is the one arbitrary radius in
          this file. macOS icons round at ~22% of their box; at 96px `rounded-3xl` (24px)
          was that number, at 128px it is 19% and the tile starts to look like a square
          with the corners knocked off. 28px puts it back on the curve. The alternative was
          a declared radius used exactly once, which is a token nobody would ever reach for
          again.

          `bg-appbg` is the app's own near-black, so the square reads as a product tile
          rather than as a hole in the card. The filet is `onink-rule`, the inverse
          hairline: `border-hairline` is 8% INK and would disappear on this ground. */}
      <div className="relative flex h-32 w-32 items-center justify-center rounded-[28px] border border-onink-rule bg-appbg shadow-lift">
        {/* THE MARK, at 64px in a 128px tile — half the box, where it was 46% before, so it
            grew by rather more than the tile did. `contain` and `center` so the glyph keeps
            its proportions inside the box whatever the box becomes, and `no-repeat` because
            a mask that tiles fills the tile with apples.

            The div carries the gradient; the PNG is only its alpha. */}
        <div
          className="h-16 w-16 bg-mark-apple"
          style={{
            WebkitMaskImage: 'url(/img/apple-mark.png)',
            maskImage: 'url(/img/apple-mark.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      </div>
    </div>
  )
}

/* ── ④ Make it yours ────────────────────────────────────────────────────────────── */

/**
 * One big switch, clicking itself on and off, with the pointer pressing it.
 *
 * THE PRODUCT OWNER'S REFERENCE, cursor kept — "garde le cursor juste change le wording" —
 * and then animated at their request: "peux-tu animer le switch avec une animation de
 * click". The still version read as a screenshot of a settings row; the click is what
 * turns it into the card's actual claim, which is that these things are yours to move.
 *
 * NO PANEL, and that is the decision. A switch inside a settings row would be a drawing of
 * the Settings PANE, and the app has eleven tabs of those — picking one to photograph
 * would say "this preference" where the card says "your preferences". A switch with
 * nothing around it is the preference as an idea.
 *
 * THE CARD ANSWERED THE CLICK FOR ONE ROUND, and it does not any more. The product owner
 * asked for the ground to go dark while the switch was on — "ça peut être funny" — which
 * it was; it shipped as `CARD_TONES.flick`, a ninth tone whose ground and both ink tiers
 * animated together. They then cut it: "retire le changement de background sur À votre
 * main". Worth a paragraph rather than a silent deletion, because nothing about it was
 * broken — a card that repaints itself twice every five seconds is simply louder than a
 * grid of five wants, and this drawing already has something moving in it.
 *
 * THE ANIMATION IS THREE DECLARED KEYFRAMES AND NO JAVASCRIPT — `switch-knob`,
 * `switch-track` and `switch-cursor` in `tailwind.config.ts`, sharing one 4.8s cycle and
 * one set of beats. A CSS loop has no mount cost, nothing to clean up on unmount, and it
 * keeps its phase while the tab is backgrounded; the same call every animated drawing on
 * this site makes.
 *
 * THE ON IS FASTER THAN THE OFF, deliberately and at the owner's prompting — "l'animation
 * de l'activation est trop lente". What was actually wrong was not the duration but the
 * easing: a timing function declared inside a keyframe governs the segment that STARTS
 * there, so the overshoot curve sat on the wrong keyframe and only the move OFF had any
 * snap. It is fixed where the keyframes are, and the two moves are now asymmetric on
 * purpose: ~145ms on, ~240ms off.
 *
 * THREE ELEMENTS MOVE SEPARATELY AND ARE ONE GESTURE, which is the thing to keep true when
 * touching any end of it: the knob travels `3rem`, which is this track's `w-28` minus two
 * `p-2` insets minus the knob's own `w-12`. Change the track's width here and the
 * keyframe's translate is wrong, with nothing to catch it.
 *
 * THE ARROW IS AN INLINE SVG because macOS's pointer is a specific silhouette — a black
 * arrow with a white keyline, which is what keeps it legible on any ground — and no icon
 * set ships it.
 *
 * ITS SHADOW IS A SECOND COPY OF THE PATH, offset and faint, rather than a CSS filter, and
 * that is not a workaround: `lib/designTokens.test.ts` refuses any arbitrary shadow value
 * in this tree — a `drop-shadow` utility with brackets is caught by the same rule, being
 * the same arbitrary value wearing a different prefix — and the elevation scale it points
 * you at is a `boxShadow` scale, so no declared rung would apply to a path anyway. A
 * duplicated path is what an illustrator would draw, needs no token, and moves with the
 * shape.
 */
export function MakeItYoursArt() {
  return (
    <div aria-hidden className="relative flex h-44 items-center justify-center">
      {/* THE TRACK, at ~4× the size of a real switch. Its colour is the ANIMATION's, not a
          class: `switch-track` holds ink-at-12% for the off beats and `brand` for the on
          ones. The `bg-ink/10` below is only what renders before the first frame and for
          anyone the animation never reaches, which is why it is the OFF value: a browser
          that plays nothing shows a switch at rest rather than one stuck mid-flick. */}
      <div className="relative flex h-16 w-28 animate-switch-track items-center rounded-full bg-ink/10 p-2 shadow-lift">
        {/* `h-12 w-12` against the track's `h-16` and `p-2` — 64 less two 8px insets is
            exactly 48, so the knob fills the track's height rather than floating in it.
            Written as the numbers that add up rather than as an arbitrary one: a knob that
            does not touch top and bottom reads as a dot on a pill.

            NO `ml-auto`. The knob is at the LEFT and the keyframe moves it, so the two
            cannot disagree — pinned right, a translate would have taken it off the end. */}
        <div className="h-12 w-12 animate-switch-knob rounded-full bg-white shadow-button" />
      </div>

      {/* THE POINTER, over the track's right half — where a thumb lands on a switch that
          is about to go on. It does NOT travel with the knob: a cursor following the thing
          it just switched is a DRAG, and a switch is not dragged. `left`/`top` in
          percentages of the wrapper so it holds its place at every card width. */}
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-[52%] top-[52%] h-11 w-11 animate-switch-cursor"
        role="presentation"
      >
        {/* The shadow: the same path, half a unit down and to the right, at 20% ink. */}
        <path
          d="M5.5 2.5 18 14.2h-6.1l3.2 6.6-2.6 1.2-3.2-6.7-3.8 3.9z"
          fill="rgba(10, 10, 10, 0.2)"
          transform="translate(0.6 0.8)"
        />
        <path
          d="M5.5 2.5 18 14.2h-6.1l3.2 6.6-2.6 1.2-3.2-6.7-3.8 3.9z"
          fill="#0a0a0a"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/* ── ⑤ Spotlight ────────────────────────────────────────────────────────────────── */

/**
 * Quick Launch: the bar, and nothing else.
 *
 * THE PANEL IS THE APP'S OWN, and `SpotlightBarMockup` on `/features` is where this shape
 * was settled — Quick Launch has no chrome, no title and no edges, so a dark rounded bar
 * floating on a ground is not a simplification of that window, it IS that window.
 *
 * NOT REUSED, though, and the reason is one line inside it: that component hard-codes
 * `bg-tone-sky` as its own plate, because on `/features` it is a drawing beside a row
 * rather than a visual inside a coloured card. Dropping it in here would put a blue
 * rectangle inside a pink one. Adding a ground prop to serve one call site is the caller
 * dressing a component, which is the conflict `components/ui.tsx`'s header warns about —
 * so the bar is drawn again, at that component's own type sizes, and the PLACEHOLDER is
 * shared instead (`site.spotlightCard.placeholder`, a ticket id and a command, identical
 * in both catalogues).
 *
 * IT HAD KEYCAPS ABOVE IT — ⌃ Space, the real global shortcut — and the product owner cut
 * them: "tu peux supprimer le raccourci clavier ^ Space dans l'illustration Spotlight et
 * mettre l'input en plus gros". The right call, and not only for the room it buys. The
 * card next door but one is now titled "Keyboard navigation" and IS a sheet of keycaps, so
 * this card was answering a question the band had already answered — and doing it in the
 * two smallest objects on the screen. The bar at full size is one thing said once, and the
 * global shortcut is still in the card's own sentence where a shortcut can be named.
 *
 * `text-3xl` AND A `w-7` MAGNIFIER, one step past Quick Launch's own `text-2xl`, and the
 * step up is the owner's second pass — "peux-tu agrandir l'input mockup du spotlight pour
 * qu'il soit plus centré dans la card". Drawn at the app's literal size the bar was a
 * third of the height of the space it had, and the difference between a small object with
 * air around it and a big one is whether the card reads as having something IN it.
 *
 * CENTRED RATHER THAN PINNED TO THE BOTTOM, which is the other half of the same note and
 * needed a slot in `ToneCard` rather than a class here: a stacked visual is `mt-auto` by
 * default, so no amount of padding at this end would lift it off the bottom edge. `visual`
 * is that slot — see `ToneCardVisual`, which sets out why an OBJECT centres and a cropped
 * panel does not.
 *
 * THE CROP WENT AND CAME BACK, which is the one thing here that changed twice. Enlarging
 * the bar meant centring it, and a centred object cropped on one side reads as an object
 * that has slipped — so the `-mr-10` was dropped. The product owner put it back: "peux-tu
 * faire en sorte que le spotlight l'input soit croppé sur la droite". They are right, and
 * the argument against it was the wrong one. This is not an object like the switch next
 * door; it is a WINDOW, and Quick Launch is the one window on this site with no edges of
 * its own — running it off the card is the only thing that says so. An input that ends
 * neatly inside its own picture is also one you have already filled, where a cut one has
 * room in it. Centred vertically, cropped horizontally: the two are not in tension, they
 * answer different questions.
 */
export function SpotlightArt() {
  const { t } = useT()

  return (
    // `overflow-hidden` here rather than relying on the card's: this wrapper has a left
    // gutter and the card does not, so cutting at this box keeps the bar's overhang the
    // same 40px whatever the card's own padding is.
    <div aria-hidden className="overflow-hidden px-7">
      {/* `-mr-10` past the wrapper's own padding, cut by the `overflow-hidden` above.
          `whitespace-nowrap` and not `truncate`: the placeholder has to leave the frame
          sideways, and an ellipsis is the drawing admitting the text did not fit. */}
      <div className="-mr-10 flex items-center gap-4 rounded-2xl bg-ink px-5 py-5 shadow-lift">
        <Search className="h-7 w-7 shrink-0 text-appink" />
        {/* The PLACEHOLDER tier, not typed text: the app draws it in `zinc-600`, which on
            black is dark enough to disappear at this size on a page nobody is focused on.
            `appink-icon` is the nearest declared ink that still reads. */}
        <span className="whitespace-nowrap font-display text-3xl font-medium text-appink-icon">
          {t('site.spotlightCard.placeholder')}
        </span>
      </div>
    </div>
  )
}
