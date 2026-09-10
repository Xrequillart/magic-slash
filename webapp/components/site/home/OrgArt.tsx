'use client'

import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ClipboardList,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Languages,
  ListTodo,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Settings2,
  Ticket,
  X,
} from 'lucide-react'
import { useId } from 'react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { GithubMark } from '../features/TasksModalMockup'

/**
 * The four drawings inside `OrgSection`'s four cards.
 *
 * ONE FILE AND NOT FOUR, on `BuiltForArt.tsx`'s reasoning: what these share is the DARK
 * WINDOW — `WINDOW`, `GROUP_TITLE`, `ROW`, `SELECT` and the rest below, stated once — and
 * the two that are not windows deliberately do not touch it. Splitting the file to keep
 * one constant pure would have put two short components in files of their own for the
 * sake of a string the other two read.
 *
 * ── TWO OF THE FOUR ARE THE APP'S OWN SCREENS, AND TWO ARE NOT ────────────────────
 *
 * That split is the band's argument rather than a shortcut, and it is worth stating
 * before any of the measurements below make sense.
 *
 * `SharedConfigArt` and `TeamTasksArt` are REPRODUCTIONS: the repository's General tab
 * and the Tasks modal, measured off `desktop/src/renderer/` the way `/features` measures
 * its mockups. The band's claim is that configuration and a backlog stop belonging to one
 * laptop, and both of those claims are settled by a screen a reader recognises — the
 * Scope row that says "Team — Poppins" and the repository filter closed on one repository
 * are the product ACTUALLY DOING IT, and a paraphrase of either would be the site
 * promising something the app does not show.
 *
 * `OrgTeamArt` and `PlanSharingArt` are DIAGRAMS, because what they describe has no
 * single screen. An organisation is people and repositories in a relationship; a plan
 * being shared is a document arriving somewhere else. Drawing the members table for the
 * first and the plan pane for the second would answer a question nobody asked ("what does
 * the table look like") in place of the one the card is making.
 *
 * ── WHAT IS TRANSLATED AND WHAT IS NOT ────────────────────────────────────────────
 *
 * The same rule the rest of the site follows, `BuiltForArt.tsx` and
 * `CommitsCardMockup.tsx` both state it: a string the APP prints goes through the
 * catalogue with the app's own sentence, and a string a TOOL or a PLATFORM prints stays
 * in the language it is printed in. So the settings labels, the tab names, the Tasks
 * chrome and the Scope row are keys; the repository slugs, the `@logins`, the GitHub
 * labels, the branch names and the organisation's own name are literals, and a French
 * reader sees exactly what the French app would show them.
 *
 * THE SETTINGS LABELS ARE `site.repoCfg.*`, WHICH WAS AN ORPHANED FAMILY. Fifty-odd keys
 * covering the whole repository page — scope, general, branches, worktree, commit,
 * resolve, pull request, issues, the danger zone — translated in both catalogues and
 * rendered by nothing since the band that used them was cut (`app/(marketing)/page.tsx`
 * keeps that history). `SharedConfigArt` is drawn from the same page, so it reads them
 * rather than minting a second spelling of "Discussion Language", and the family has a
 * consumer again. The three it was missing — the TEAM half of the Scope row — are added
 * beside it and mirror the app's own `repo.scope.*`.
 *
 * `aria-hidden` ON EVERY ONE OF THEM, at the outermost node, for `BuiltForArt`'s reason:
 * each one paraphrases the sentence on the card beside it, and a screen reader that
 * walked into a settings pane made of `span`s would be read a form it cannot use.
 */

/* ── The shared dark-window vocabulary ─────────────────────────────────────────────── */

/**
 * The window itself. `bg-ink` is this site's stand-in for the app's darkest ground,
 * `onink-rule` is the inverse filet (`border-hairline` is 8% INK and would vanish on it),
 * and `shadow-lift` — the scale's loudest rung — is what lifts the panel off the card.
 * `TasksModalMockup` makes exactly those three choices and `TasksArt` repeats them; this
 * is the third drawing to need them and the first to write them down.
 *
 * `min-w-[26rem]` FOR THE REASON `TasksArt`'s CARD DOCUMENTS: a grid track sized `auto`
 * grows to its content's minimum, so a panel with no floor collapses on a phone and every
 * row inside it wraps into three. 416px is the width at which a settings row still has a
 * label beside its control, and the card's `overflow-hidden` crops whatever that costs.
 */
const WINDOW =
  'min-w-[26rem] overflow-hidden rounded-xl border border-onink-rule bg-ink shadow-lift'

/** The app's group heading — `h2` at `text-xs uppercase tracking-wider`, one step down. */
const GROUP_TITLE = 'mb-2 text-[10px] font-medium uppercase tracking-wider text-onink-faint'

/** The `fieldset` a group's rows sit in. `RepoConfigMockup`'s `Group`, at card scale. */
const GROUP_BOX = 'rounded-lg border border-onink-rule bg-onink-tint px-3'

/** `SettingRow`'s geometry: the border falls between rows and never after the last. */
const ROW = 'flex items-center justify-between gap-4 border-b border-onink-rule py-3 last:border-b-0'

/**
 * `SELECT` from the app's `theme/controls.ts`. The page takes it at `w-52`; a card two
 * columns wide cannot spend 208px on a control and still have a label, so it is `w-36`
 * here and the value inside truncates rather than wrapping.
 */
const SELECT =
  'w-36 shrink-0 rounded-lg border border-onink-rule bg-onink-tint px-2.5 py-1 pr-7 text-[11px] text-white'

/** `INPUT`, at the same reduction. The page takes it at `w-72`. */
const INPUT =
  'w-36 shrink-0 truncate rounded-lg border border-onink-rule bg-onink-tint px-2.5 py-1 text-[11px] text-white'

/**
 * The repository both windows are of, and it is the SAME one on purpose: the config card
 * shares a repository with the organisation, and the Tasks card filters the backlog down
 * to it. Two drawings of two different repositories would have the band making its point
 * about two projects that never meet. The colour is the one the app's sidebar gives it.
 */
const REPO = { name: 'checkout-api', slug: 'acme/checkout-api', color: '#6366f1' }

/** The organisation the repository is shared with. A name, so a literal in both. */
const ORG = 'Poppins'

/** The label-and-help half of a settings row, and the control beside it. */
function Row({
  label,
  help,
  children,
}: {
  label: MessageKey
  help: MessageKey
  children: React.ReactNode
}) {
  const { t } = useT()

  return (
    <div className={ROW}>
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-white">{t(label)}</span>
        <p className="mt-0.5 text-[10px] leading-snug text-onink-faint">{t(help)}</p>
      </div>
      {children}
    </div>
  )
}

/** `EnumSelect`'s box and its chevron, closed on the value the repository is set to. */
function Select({ value }: { value: string }) {
  return (
    <div className="relative shrink-0">
      <div className={SELECT}>
        <span className="block truncate">{value}</span>
      </div>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-onink-dim" />
    </div>
  )
}

/* ── ① The configuration a team shares ────────────────────────────────────────────── */

/**
 * `REPO_TABS`, in the app's order and with the app's glyphs — the same table
 * `RepoConfigMockup` keeps, and the same rule for its labels: a catalogue key where the
 * two languages differ, a literal where they do not.
 *
 * ALL EIGHT ARE RENDERED AND THE STRIP IS CROPPED, which is the app's own behaviour
 * (`TabStrip` is a scroll box) and the honest thing for a card to show: there are eight
 * tabs to a repository, this drawing is of the first, and a strip trimmed to the four that
 * fit would quietly claim the page is smaller than it is. The live pill is the leftmost,
 * so nothing load-bearing is what falls off the right edge — `RepoConfigMockup` needs a
 * scroll effect to centre its pill precisely because the tab IT draws is the fifth.
 */
const TABS: readonly {
  id: string
  label: MessageKey | { literal: string }
  icon: typeof Settings2
}[] = [
  { id: 'general', label: 'site.repoPage.tabGeneral', icon: Settings2 },
  { id: 'repository', label: { literal: 'Repository' }, icon: GitBranch },
  { id: 'tickets', label: { literal: 'Tickets' }, icon: Ticket },
  { id: 'languages', label: 'site.repoPage.tabLanguages', icon: Languages },
  { id: 'plan', label: 'site.repoPage.tabPlan', icon: ClipboardList },
  { id: 'commit', label: { literal: 'Commit' }, icon: GitCommitHorizontal },
  { id: 'pr', label: { literal: 'Pull Request' }, icon: GitPullRequest },
  { id: 'resolve', label: { literal: 'Resolve' }, icon: MessageSquare },
]

/**
 * The repository's General tab, in dark, cropped at the bottom.
 *
 * DRAWN FROM `desktop/src/renderer/pages/Config/RepoPage.tsx`, band for band, and the
 * order is that file's rather than a composition: under `tab === 'general'` it renders the
 * SCOPE section first and the General section under it. Which is the luckiest thing about
 * this card — the app already leads its configuration page with the row that says who the
 * configuration belongs to, so a faithful drawing of the top of that page IS the drawing
 * this card needed.
 *
 *   1. THE HEADER. The `p-1.5` back arrow, the repository's tile (`w-10 h-10 rounded-xl`,
 *      its own colour at 12% behind a folder), the name at `text-2xl font-semibold`, and
 *      the subtitle under the row. One step down at each rung for a card.
 *   2. THE STRIP. `TabStrip`: `inline-flex gap-1 rounded-full p-1` on the subtle ground,
 *      a `w-3.5` glyph per pill, the live one on the strong surface. See `TABS`.
 *   3. THE SCOPE ROW. The `bg-surface border border-line-strong rounded-xl p-4` box, the
 *      state as a chip — `bg-accent/15 text-accent` with a `Building2` when the repository
 *      belongs to an organisation, `bg-surface-strong` with a padlock when it does not —
 *      the help line under it, and the escape hatch in the `w-72` fieldset on the right.
 *      Drawn in the TEAM state, which is the whole point of the card.
 *   4. THE GENERAL GROUP. The `h2` at `text-xs uppercase tracking-wider`, the bordered
 *      fieldset under it, and `SettingRow`'s rows: label, help, control.
 *
 * WHICH THREE SETTINGS, out of the General tab's six. Name and Keywords are what the app
 * detects a repository BY, and the discussion language is the one setting on the tab that
 * a reader can immediately picture being wrong for a colleague — an English-speaking
 * teammate on a French project. The colour picker is the sixth and it is the one that
 * survives being cropped, so it is what the bottom edge takes.
 *
 * CROPPED AT THE BOTTOM AND NOT AT A SIDE, for `TasksModalMockup`'s reason: a settings
 * page runs DOWN and the meaning of a row runs ACROSS it, so cutting a side would take the
 * control off every row at once while cutting the bottom takes one more setting — which is
 * exactly the right thing to lose. The page is longer than the frame, and saying so costs
 * no frame.
 */
export function SharedConfigArt() {
  const { t } = useT()

  return (
    // `-mb-14` runs the window 56px past the card's bottom edge, where `ToneCard`'s
    // `overflow-hidden` cuts it — the amount that lands the cut on the empty band the
    // last group opens with, rather than through a line of type. See ⑤ below. The side
    // gutters stay, so the crop reads as ONE edge: a page seen from the top down, not a
    // panel trimmed on three sides. `TasksArt`'s arrangement, and this card is in the
    // same grid.
    <div aria-hidden className="-mb-14 px-7">
      <div className={WINDOW}>
        {/* ① THE HEADER. */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2.5">
            <ArrowLeft className="h-4 w-4 shrink-0 text-onink-dim" />
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${REPO.color}1f`, color: REPO.color }}
            >
              <FolderGit2 className="h-4 w-4" />
            </span>
            <span className="truncate text-base font-semibold text-white">{REPO.name}</span>
          </div>
          <p className="mt-1 text-[11px] text-onink-dim">{t('site.repoCfg.subtitle')}</p>
        </div>

        {/* ② THE STRIP. The bordered pill row IS the clip box — `TabStrip`'s own
            arrangement, and `RepoConfigMockup` records what splitting the two costs: the
            border travels with the pills and the strip reads as a band cut at both ends.
            `overflow-hidden` rather than that file's `overflow-x-auto` because nothing
            here scrolls to a pill — see `TABS` for why the live one is already in view. */}
        <div className="px-4 pt-3">
          <div className="inline-flex max-w-full gap-1 overflow-hidden rounded-full border border-onink-rule bg-onink-tint p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const live = tab.id === 'general'
              const label = typeof tab.label === 'string' ? t(tab.label) : tab.label.literal

              return (
                <span
                  key={tab.id}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    live ? 'bg-onink-selected text-white' : 'text-onink-dim'
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                </span>
              )
            })}
          </div>
        </div>

        {/* ③ THE SCOPE ROW, in the team state. The chip wears `accent` at 15% because that
            is what the app gives an organisation-owned repository, and `accent-hover` is
            this site's readable step of that blue on a dark ground — `TicketBadge` next
            door makes the same substitution. */}
        <div className="px-4 pt-4">
          <h3 className={GROUP_TITLE}>{t('site.repoCfg.scope')}</h3>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-onink-rule bg-onink-tint p-3">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-hover">
                <Building2 className="h-3 w-3 shrink-0" />
                {t('site.repoCfg.teamNamed', { name: ORG })}
              </span>
              <p className="mt-1 text-[10px] leading-snug text-onink-faint">
                {t('site.repoCfg.teamHelp')}
              </p>
            </div>
            {/* The way BACK, and it is drawn because the app draws it: a repository shared
                with an organisation can be made personal again in one click. A card that
                showed only the door in would be selling a one-way trip. */}
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-onink-rule px-2 py-1 text-[11px] text-onink-dim">
              <Lock className="h-3 w-3 shrink-0" />
              {t('site.repoCfg.makePersonal')}
            </span>
          </div>
        </div>

        {/* ④ THE GENERAL GROUP, whole. */}
        <div className="px-4 pt-4">
          <h3 className={GROUP_TITLE}>{t('site.repoCfg.general')}</h3>
          <div className={GROUP_BOX}>
            <Row label="site.repoCfg.name" help="site.repoCfg.nameHelp">
              <span className={INPUT}>{REPO.name}</span>
            </Row>
            <Row label="site.repoCfg.discussionLang" help="site.repoCfg.discussionLangHelp">
              {/* A LANGUAGE NAME IN ITS OWN LANGUAGE, which is how the app's own picker
                  lists them and how `lib/i18n/languages.ts` labels them here: "Français"
                  is the option a reader of either catalogue sees on that menu. */}
              <Select value="Français" />
            </Row>
          </div>
        </div>

        {/* ⑤ THE GROUP THE CARD CUTS, and it is a WHOLE GROUP rather than one more row
            because of where the cut lands. A fixed crop through a stack of rows whose
            heights vary lands wherever it lands, and the first version of this drawing
            put it straight through a label — a horizontal cut across a line of type
            reads as a rendering fault, not as a frame. Ending on a heading and the top
            border of its fieldset gives the crop a band with no type in it to fall
            through, and it says "the page continues" better than half a word does.
            `TasksArt` gets away with a row because its rows are one height.

            IT IS `Branches` AND NOT ANY OTHER GROUP because the card's own copy names the
            development branch FIRST among the four settings it promises. Which is also
            why the keywords row above it went: the copy does not mention keywords, and
            two rows plus a group beats three rows and no group at showing that this page
            has sections. */}
        <div className="px-4 pt-4">
          <h3 className={GROUP_TITLE}>{t('site.repoCfg.branches')}</h3>
          <div className={GROUP_BOX}>
            <Row label="site.repoCfg.development" help="site.repoCfg.developmentHelp">
              {/* A branch name, so a literal — it is what the repository calls its own
                  trunk and the app never translates it. */}
              <Select value="main" />
            </Row>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ② The organisation ───────────────────────────────────────────────────────────── */

/**
 * THE HEIGHT EVERY OBJECT ON A RAIL SHARES, and it is a constant because the product owner
 * asked for it directly: "j'aimerai que les tête et les label repository et config soit de
 * la même height". A face and a label used to be two different heights — a circle sized by
 * its own diameter, a pill sized by its type and padding — and a rail of mismatched objects
 * reads as a diagram assembled from two kits. One number, and the wire has a single
 * silhouette running through it.
 *
 * IT IS THE FULL SIZE AND NOT THE PHOTOGRAPH'S. The faces are `h-full w-full` inside a
 * white disc of exactly this height (see `Member`), so what is equal is the OBJECT — which
 * is what the eye actually measures.
 *
 * 56px BELOW `lg`, AND THE BREAKPOINT IS THE INTERESTING HALF OF THAT.
 *
 * WHAT HAS TO BE PROTECTED: the rails are CENTRED groups, so whatever overruns the card is
 * split between the two ends. Rail one has a face at each end and can afford it — a cropped
 * face is the drawing SAYING the wire continues. Rail two has `Configuration` at its left
 * end, and a pill cropped at 80px comes back with its icon and half a word gone, which is
 * not a frame, it is a fault. So the scale is set by the narrowest card this band ever has.
 *
 * AND THAT CARD IS NOT ON A PHONE, which is the trap. Card width does not rise with the
 * viewport here — it jumps back down at `md`, where the grid becomes two columns:
 *
 *     viewport   grid       card
 *     390px      1 column   342px   ← the phone
 *     767px      1 column   719px
 *     768px      2 columns  348px   ← the real floor, and it is WIDER than the phone by 6px
 *     1024px     2 columns  476px
 *     1440px     2 columns  538px
 *
 * A `sm:` step-up therefore put 80px objects into a 348px card between 768 and 1023 — a
 * WORSE crop than the phone it was written to fix, and the one that sheared the pill. `lg:`
 * is the first rung where the card can hold the large scale, so every size in this drawing
 * steps there and nowhere else. Measured at each rung above rather than reasoned about:
 * both rails now clear the card at every width, the only cut being a few pixels of the top
 * rail's right-hand face at 1024, which is the graze `OrgTeamArt` wants anyway.
 *
 * THE TRAIL OF SIZES, because each step was asked for and the reasons do not repeat: 48px
 * first, which read as tokens on a diagram rather than as people; 64px next; then 80px,
 * when the owner said the drawing sat "trop loin" — too far away.
 */
const RAIL_H = 'h-14 lg:h-16'

/**
 * A member's photograph, on a white disc of its own.
 *
 * THE DISC IS A REAL ELEMENT AND NOT A `ring`, which is the whole point of this component
 * having a wrapper at all. It was `ring-4 ring-white shadow-card` on the `img` for two
 * rounds, and the product owner was right that the shadow had gone missing ("ajoute un
 * box-shadow au personne aussi") — Tailwind writes a ring and a shadow into ONE
 * `box-shadow` list as `ring, shadow`, and an earlier shadow in that list paints over a
 * later one. So an opaque 4px white ring sat directly on top of the inner reaches of
 * `shadow-card`, whose own spread is `-12px`: what was left of it was a smudge. A white
 * disc with `p-1` casts the shadow from its own edge instead, and the photograph inside is
 * clipped by it. Which is also exactly how the pills beside it are built — a white
 * surface with `shadow-card` — so the two now carry the same shadow because they ARE the
 * same construction, not because two class lists were kept in step by hand.
 *
 * `rounded-full` ON BOTH THE DISC AND THE IMAGE. The source files are already masked to a
 * circle, and relying on that mask would leave the disc tracing a square behind a
 * photograph that is not.
 *
 * `loading="lazy"` because this band is well below the fold and three photographs are the
 * heaviest thing on it. A bare `<img>` and not `next/image`, which is used nowhere on
 * this site (`FeaturesContent.tsx` states that call).
 */
function Member({ src }: { src: string }) {
  return (
    <span
      className={`relative z-20 aspect-square shrink-0 rounded-full bg-white p-1 shadow-card ${RAIL_H}`}
    >
      <img
        src={src}
        alt=""
        width={144}
        height={144}
        loading="lazy"
        className="h-full w-full rounded-full bg-white object-cover"
      />
    </span>
  )
}

/**
 * A thing the organisation holds, as a white pill on the rail: a repository, its
 * configuration. The reference puts its two capabilities in exactly this shape — a glyph
 * and a word, in white, straddling the dashed line.
 *
 * `RAIL_H` RATHER THAN VERTICAL PADDING, so it matches the faces exactly — see that
 * constant. A capsule this tall has a 40px radius, which is why the horizontal padding
 * went up with it: at the old `px-5` the glyph sat inside the curve.
 *
 * `shadow-card` AND NOT `shadow-lift`: a pill is a label sitting on a line, not a window
 * standing off a card, and the loud rung would have every object in this drawing claiming
 * to be the nearest one to the reader.
 */
function RailPill({ icon: Icon, children }: { icon: typeof Settings2; children: React.ReactNode }) {
  return (
    <span
      className={`relative z-20 flex shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink shadow-card lg:gap-2.5 lg:px-9 lg:text-base ${RAIL_H}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-brand lg:h-5 lg:w-5" />
      <span className="truncate">{children}</span>
    </span>
  )
}

/**
 * One rail: a dashed line running the full width of the card, with the objects on it.
 *
 * THE LINE IS A SIBLING AND NOT A BORDER ON THE ROW, because it has to run edge to edge
 * while the objects stay inside a gutter — a `border-t` on the flex row would have started
 * and stopped with the padding, and the rail would read as a rule somebody drew between
 * two pills rather than as a wire passing through the card. So the line is absolutely
 * placed at `top-1/2` across the full width and `ToneCard`'s `overflow-hidden` is what
 * gives it its two cut ends.
 *
 * THE LINE IS BEHIND EVERY OBJECT ON THE RAIL, and this went both ways before it settled.
 * The product owner first asked for it in FRONT of the photographs ("met devant les photo
 * de membre de l'équipe"); seeing it, they reversed ("j'aimerai aussi que les photo des
 * personne de l'équipe soit au dessus du trail dashed... il y a le trail qui passe au
 * dessus"). Which is the reference's own arrangement, and on the evidence the right one: a
 * 3px dashed rule across a face crosses the eyes at exactly the height it enters the
 * capsule, and a wire that disappears behind an object and comes out the other side reads
 * as passing THROUGH it — the same thing the drawing was after, without defacing anyone.
 * The pills never took the line either, for the legibility reason the middle round found:
 * it lands straight through `acme/checkout-api` at its x-height.
 *
 * SO EVERY OBJECT CARRIES `relative z-20` AND THE LINE CARRIES `z-10`. It has to be stated
 * on each rather than left to DOM order: the line is absolutely positioned, and a
 * positioned element paints above unpositioned siblings whatever their order.
 *
 * `border-t-[3px]` AND NOT `border-t`, also the owner's call ("mettre en plus gros les
 * trail dashed"). A dashed border's dash LENGTH is derived from its width, so this is the
 * one property that makes the dashes bigger — 1px gave 3px dashes that vanished against
 * the wash, 3px gives roughly 9px of dash to 9px of gap. `border-ink/25` rather than
 * `/20`: a heavier line at the old alpha read as grey mush at this dash size.
 *
 * `justify-center` AND NOT `justify-between`, which is half of the zoom the owner asked
 * for. Spread across the full width, the objects sat at the card's two edges with a lake
 * between them; centred with a real gap, they read as a group standing together on a wire
 * that continues past both edges.
 *
 * AND TRULY CENTRED, WITH NOTHING NUDGING THEM. Each rail wore an opposed `translate-x`
 * for a round — the top one right, the bottom one left — to interlock the pair so two
 * centred groups would not read as a column. The product owner saw the cost immediately
 * ("centrer la première ligne de l'illustration, il y a plus de marge à gauche que à
 * droite"), and they were right: an offset that is meant to be felt is also an offset that
 * is visible as a mistake, and at 1440 it left 71px of ground on the left against 23px on
 * the right. The two rails hold different objects in a different order and measure 40px
 * apart in width, which turns out to be all the difference they needed — the reason the
 * interlock existed is answered by the content rather than by a nudge.
 *
 * `-inset-x-10` STAYS, though the offsets it was written for are gone. It costs nothing —
 * the overrun is cut by the card either way — and it is what keeps the line reaching both
 * edges if anything ever shifts a rail again.
 */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center gap-4 lg:gap-7">
      <span className="pointer-events-none absolute -inset-x-10 top-1/2 z-10 border-t-[3px] border-dashed border-ink/25" />
      {children}
    </div>
  )
}

/**
 * The organisation as two rails: the people on one side of a repository and its
 * configuration, and the same people on the other side of it.
 *
 * THE SHAPE IS THE PRODUCT OWNER'S, given as a reference image — dashed wires running
 * through the card, white capability pills straddling them, and photographs of people
 * threaded along the same lines. What that composition says, and the reason it was the
 * right one to borrow: the pills and the faces are ON THE SAME WIRE. A diagram with the
 * team on one side and the repository on the other would be an org chart; this one has
 * them in a single circuit, which is the claim — the configuration and the people are not
 * two lists that happen to be adjacent.
 *
 * WHAT IS ON THE RAILS IS THIS BAND'S SUBJECT AND NOT THE REFERENCE'S. The reference
 * carries SSO and SCIM, which is a different product's enterprise story; the owner asked
 * for "un label un repository / config", so the pills are the repository and its
 * configuration — the two things an organisation actually holds here, and the two the
 * configuration card has just drawn in full.
 *
 * TWO RAILS AND SIX OBJECTS. Three photographs and a counter, because three is how many
 * the owner supplied and a fourth face would have to be invented. The counter is what
 * stops the drawing claiming the organisation is exactly three people: `+2` is a number,
 * so it needs no catalogue entry and reads the same in both languages.
 *
 * BOTH RAILS ARE CENTRED AND NEITHER IS NUDGED, which is a reversal — see `Rail` for the
 * offsets that were here and why they went. What stops the pair reading as a column is
 * that they are not the same row twice: the top one runs face, label, face and the bottom
 * one label, face, counter, and they measure 40px apart in width. The wire is what they
 * have in common, which is the point of the drawing.
 */
export function OrgTeamArt() {
  const { t } = useT()

  return (
    // `gap-14`, up from `gap-10`, at the owner's request ("met plus d'espace entre les
    // block dans cette illustration") — which the horizontal `gap-7` in `Rail` is the
    // other half of. Both went up together on purpose: opening one axis and not the other
    // turns a group of objects into a row of them.
    <div aria-hidden className="flex flex-col gap-14 py-8">
      <Rail>
        <Member src="/img/team-1.png" />
        <RailPill icon={FolderGit2}>{REPO.slug}</RailPill>
        <Member src="/img/team-2.png" />
      </Rail>

      <Rail>
        <RailPill icon={Settings2}>{t('site.orgTeam.config')}</RailPill>
        <Member src="/img/team-3.png" />
        {/* The members the rails have no room for. The same white disc the faces sit on,
            at the same height and on the same shadow, so it reads as one more object on
            the wire rather than as a badge stuck to the card. */}
        <span
          className={`relative z-20 flex aspect-square shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-ink shadow-card lg:text-lg ${RAIL_H}`}
        >
          +2
        </span>
      </Rail>
    </div>
  )
}

/* ── ③ Plan sharing ───────────────────────────────────────────────────────────────── */

/**
 * The graph's geometry, and the numbers are laid out here rather than inline because six
 * of them have to agree: every wire has to start on the sheet's edge and end on a node's
 * edge, or the drawing shows a wire floating off a circle.
 *
 * THE COMPOSITION IS THE PRODUCT OWNER'S SECOND ONE, and it replaced a fan: one sheet on
 * the left with three people on the right, all three of them receiving. The brief for this
 * one is a sentence — "une personne à gauche qui écrit le plan et qui fait circuler le
 * plan aux deux autres personnes" — and it is a better drawing for a reason worth keeping:
 * the fan said a plan gets shared and left out WHO WROTE IT, which is half of what
 * `/magic:plan` actually does. An author, a sheet, and two people picking it up reads left
 * to right in the order the thing happens.
 *
 * WHICH IS ALSO WHY THE SHEET IS IN THE MIDDLE NOW. It was the left-hand anchor before,
 * with nothing to its left; here it is the hinge, with one wire coming in and two going
 * out — the shape of the claim rather than a diagram of it.
 */
const SHEET = { x: 92, y: 38, w: 80, h: 104 }

/** The three faces. `author` writes; the other two pick a story up. */
const AUTHOR = { cx: 28, cy: 90, photo: '/img/team-1.png' }
const RECIPIENTS = [
  { cx: 252, cy: 44, photo: '/img/team-2.png' },
  { cx: 252, cy: 136, photo: '/img/team-3.png' },
]
const NODE_R = 26

/**
 * EVERY WIRE IS DRAWN FROM THE SHEET OUTWARDS, without exception, and that convention is
 * load-bearing rather than tidy: `offset-distance` is measured from a path's start, so
 * "0%" means AT THE SHEET on all three of them. The incoming beat is then simply
 * `100% → 0%` and the outgoing beats `0% → 100%`, which is why `plan-arrive` and
 * `plan-share` in `tailwind.config.ts` are each one keyframe rather than one per wire.
 *
 * Each `d` is used TWICE — once as the `<path>` that draws the wire, once as the
 * `offset-path` a dot travels — and that is the whole fix for the bug the product owner
 * spotted in the first version ("il y a un bug sur les point... Il ne sont pas sur les
 * trail ?"). The dots were three hard-coded `cx`/`cy` pairs eyeballed near the curves, and
 * a curve's own string cannot be off its own curve.
 *
 * THE AUTHOR'S WIRE IS STRAIGHT and the recipients' are curved, which is not an
 * inconsistency: one idea goes in on one line, and two stories come out along two paths
 * that have to separate. A curve on the incoming run would have implied it came from
 * somewhere other than the person at the end of it.
 */
const IN_WIRE = `M ${SHEET.x} ${AUTHOR.cy} L ${AUTHOR.cx + NODE_R} ${AUTHOR.cy}`

const OUT_WIRES = RECIPIENTS.map(
  (person) =>
    `M ${SHEET.x + SHEET.w} ${AUTHOR.cy} C ${SHEET.x + SHEET.w + 28} ${AUTHOR.cy} ${
      person.cx - NODE_R - 26
    } ${person.cy} ${person.cx - NODE_R} ${person.cy}`,
)

/**
 * The sheet's four rules, in the order they are written. `d` draws it, `delay` places it
 * in the run, and `bullet` is the marker a story gets and the title does not.
 *
 * 0.4s APART, which is the one number here chosen by eye. Faster and the four arrive as
 * one flicker; slower and the writing beat outgrows the 9s loop the three beats share (see
 * `tailwind.config.ts`). Four rules and not six: a title, then three stories, is the
 * shape `/magic:plan` actually leaves behind — a spec, an epic, and the stories under it.
 */
const RULES: readonly { d: string; delay: string; bullet?: { cx: number; cy: number } }[] = [
  { d: 'M 108 62 h 42', delay: '0s' },
  { d: 'M 120 86 h 34', delay: '0.4s', bullet: { cx: 110, cy: 86 } },
  { d: 'M 120 106 h 26', delay: '0.8s', bullet: { cx: 110, cy: 106 } },
  { d: 'M 120 126 h 38', delay: '1.2s', bullet: { cx: 110, cy: 126 } },
]

/** A face on the graph: the photograph, clipped to its node, with the ring over the clip. */
function GraphFace({
  cx,
  cy,
  photo,
  clipId,
}: {
  cx: number
  cy: number
  photo: string
  clipId: string
}) {
  return (
    <g>
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={NODE_R} />
      </clipPath>
      <image
        href={photo}
        x={cx - NODE_R}
        y={cy - NODE_R}
        width={NODE_R * 2}
        height={NODE_R * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      {/* THE RING IS STROKED OVER THE PHOTOGRAPH and not around it, so it trims the clip's
          edge — a clipped raster against a saturated ground shows a hairline of the
          photograph's own background otherwise, which on `indigo` reads as a halo. */}
      <circle cx={cx} cy={cy} r={NODE_R} strokeWidth="2.5" />
    </g>
  )
}

/**
 * The share graph: the person who wrote the plan, the plan writing itself, and the plan
 * going out to two people who did not.
 *
 * WHY IT IS DRAWN AND NOT A LUCIDE GLYPH, which was the product owner's brief in as many
 * words — "un icon de partage un peu plus complexe qu'une simple icon lucide". `Share2` is
 * three dots and two lines at 24px, and at the size this card gives it that reads as a
 * placeholder somebody meant to replace. The reason a real drawing earns the room: a share
 * glyph says "this goes somewhere" and stops, while a graph can say WHAT goes, FROM whom
 * and TO whom — and all three are the card's claim.
 *
 * IT IS A SEQUENCE AND NOT A LOOP OF DECORATION, which is the thing to understand before
 * touching any number in this file. The owner specified the running order — an author, the
 * plan written live, then the plan shared — and the three keyframes that play it share one
 * 9s period so the beats cannot drift apart. `tailwind.config.ts` carries the whole
 * timeline in one comment; each beat's own keyframe explains only its own share of it.
 *
 * THE THREE NODES CARRY THE REAL PHOTOGRAPHS, at the owner's request ("tu peux mettre des
 * vrai photo dans l'illustration"), and it is the same three faces the organisation card
 * puts on its rails — in the same order, so `team-1` is the author here and the first
 * person on the top rail there. Which is worth more than it costs: those two cards are the
 * band's two DIAGRAMS, and the same three people appearing in both is what makes them read
 * as one organisation described twice rather than as two unrelated schematics.
 *
 * THE `clipPath` IDS ARE BUILT OFF `useId`, because two of these cards on one page — or
 * this card beside any other drawing that clips — would otherwise collide on a
 * document-wide id. The same call `TasksModalMockup` and `RepoConfigMockup` make.
 *
 * THE DOTS ARE CLIPPED TO THE WIRE FIELD, which is a safety net rather than composition.
 * `offset-path` positions an element by TRANSFORM, so the circles are authored at the
 * origin and a browser that does not support motion path leaves all three sitting in the
 * viewBox's top-left corner. The clip excludes everything left of the author's own node,
 * where no point on any wire ever is, so that failure renders as nothing at all instead of
 * as three dots in a corner.
 *
 * WHAT `motion-reduce` LEAVES ON SCREEN, and it is a deliberate resting state rather than
 * whatever fell out. The dots carry `opacity-0` as their base class, so they vanish. The
 * rules carry NO opacity class, and `stroke-dashoffset` defaults to 0 against their
 * `stroke-dasharray="1"` — so they are fully drawn. Someone who asked for less motion gets
 * the finished picture: an author, a written plan, two people. Three dots frozen mid-wire
 * would have been a diagram with stray marks on it.
 *
 * DRAWN IN `currentColor`, so the card's ink owns it. This one is on `indigo`, which
 * `components/ui.tsx` pairs with white type, and every stroke here is therefore white
 * without the file naming a colour — the arrangement that lets the drawing survive its
 * card being re-toned. The fills are `currentColor` at low alpha for the same reason.
 *
 * `max-w-[26rem]` AND THE CAP WENT UP WHEN THE COMPOSITION WIDENED. The svg takes the
 * width its card gives it and keeps its ratio, capped so it stays an OBJECT rather than
 * becoming a mural — which is also why this card is `visual="center"` in `OrgSection` and
 * not `end`: a complete object pinned to the bottom edge leaves a pool of ground above it
 * that reads as a mistake. The fan this replaced fitted a 240×200 box; an author, a sheet
 * and two recipients needs 280×180, a good deal wider and shorter — so the old 22rem cap
 * rendered every face a third smaller and the card read as a headline over a spot
 * illustration. 26rem in a 482px column puts a face at about 70px, within a few pixels of
 * the objects on the organisation card's rails. The two DIAGRAMS of this band now draw a
 * person at the same size, which is most of what makes them read as a pair.
 */
export function PlanSharingArt() {
  const uid = useId()

  return (
    <div aria-hidden className="flex justify-center px-7 py-8 text-white">
      <svg
        viewBox="0 0 280 180"
        role="presentation"
        className="h-auto w-full max-w-[26rem]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          {/* See THE DOTS ARE CLIPPED TO THE WIRE FIELD above. */}
          <clipPath id={`${uid}-dots`}>
            <rect x={AUTHOR.cx + NODE_R - 2} y="0" width="280" height="180" />
          </clipPath>
        </defs>

        {/* THE WIRES, behind everything, so a node covers the end of its own run and no
            stroke shows through a photograph. Dashed at 5/6 — long enough to read as
            dashes at this size, tight enough that a curve does not turn into four
            separate marks. */}
        <g stroke="currentColor" strokeOpacity="0.45" strokeDasharray="5 6">
          <path d={IN_WIRE} />
          {OUT_WIRES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {/* THE DOTS. Authored at the origin and placed entirely by `offset-path` — see the
            note above for why `cx`/`cy` must be 0 and what the clip is guarding.
            `transformBox: 'fill-box'` is what makes the anchor the circle's own centre
            rather than the centre of the viewBox.

            BEFORE THE SHEET IN THE DOM, so the incoming dot's last frames pass UNDER it
            rather than over it — arriving beneath the paper is what makes it read as
            going IN. The outgoing pair leave from the same edge and are covered for a
            frame or two on the way out, which is the same effect in reverse. */}
        <g fill="currentColor" stroke="none" clipPath={`url(#${uid}-dots)`}>
          <circle
            cx="0"
            cy="0"
            r="4"
            className="animate-plan-arrive opacity-0 motion-reduce:animate-none"
            style={{ offsetPath: `path("${IN_WIRE}")`, transformBox: 'fill-box', offsetAnchor: 'center' }}
          />
          {OUT_WIRES.map((d, index) => (
            <circle
              key={d}
              cx="0"
              cy="0"
              r="4"
              className="animate-plan-share opacity-0 motion-reduce:animate-none"
              style={{
                offsetPath: `path("${d}")`,
                transformBox: 'fill-box',
                offsetAnchor: 'center',
                // The second story leaves half a second after the first, so the pair reads
                // as two people taking one each rather than as a single wide pulse.
                animationDelay: index === 0 ? '0s' : '0.5s',
              }}
            />
          ))}
        </g>

        {/* THE SHEET. Its outline is STATIC — the paper exists before anything is on it,
            which is what lets the rules read as being written rather than as the whole
            document flashing in. */}
        <rect
          x={SHEET.x}
          y={SHEET.y}
          width={SHEET.w}
          height={SHEET.h}
          rx="14"
          fill="currentColor"
          fillOpacity="0.12"
        />

        {/* WHAT IS WRITTEN ON IT. `pathLength="1"` with `stroke-dasharray="1"` normalises
            every rule's length to one unit, so the single `plan-write` keyframe draws a
            26px line and a 42px line at the same rate — see that keyframe. The title is
            the one line that is not a story, so it is heavier and takes no bullet. */}
        {RULES.map((rule) => (
          <g key={rule.d}>
            {rule.bullet && (
              <circle
                cx={rule.bullet.cx}
                cy={rule.bullet.cy}
                r="2.5"
                fill="currentColor"
                stroke="none"
                className="animate-plan-write motion-reduce:animate-none"
                style={{ animationDelay: rule.delay }}
              />
            )}
            <path
              d={rule.d}
              pathLength="1"
              strokeDasharray="1"
              strokeWidth={rule.bullet ? 2 : 3.5}
              className="animate-plan-write motion-reduce:animate-none"
              style={{ animationDelay: rule.delay }}
            />
          </g>
        ))}

        {/* THE AUTHOR, then the two who pick it up. */}
        <GraphFace {...AUTHOR} clipId={`${uid}-author`} />
        {RECIPIENTS.map((person, index) => (
          <GraphFace key={person.photo} {...person} clipId={`${uid}-r${index}`} />
        ))}
      </svg>
    </div>
  )
}

/* ── ④ One backlog, everyone's tickets ────────────────────────────────────────────── */

/**
 * The rows, in the order the app sorts them. `agent` is the one fact in this drawing a
 * reader could not infer, and it is the reason the card exists: `taskRows.ts` only lists an
 * In Progress ticket when an agent is actually on it, and it marks that row.
 *
 * THE LOGINS ARE THREE DIFFERENT PEOPLE, which is the difference between this drawing and
 * `TasksArt`'s. That one shows a backlog; this one shows a backlog with a team in it, and
 * three names on three rows is what says so without a word of copy.
 *
 * THE LABELS ARE LITERALS and always render in the NEUTRAL tokens, faithfully rather than
 * lazily: `StatusPill` colours only the `/magic:*` workflow's own statuses, and a
 * repository's own labels miss that table. A red "bug" here would be a colour the app
 * never gives it. `BuiltForArt` records the same call.
 */
const ROWS: readonly {
  number: string
  title: MessageKey
  author: string
  labels: readonly string[]
  agent?: true
}[] = [
  {
    number: '#482',
    title: 'site.tasksCard.gh3',
    author: 'marchand',
    labels: ['bug', 'checkout'],
    agent: true,
  },
  { number: '#476', title: 'site.tasksCard.gh1', author: 'lgarnier', labels: ['bug'] },
  { number: '#471', title: 'site.tasksCard.gh2', author: 'sofia-b', labels: ['enhancement'] },
]

/**
 * The Tasks modal with the repository filter CLOSED ON ONE REPOSITORY: the shared backlog,
 * narrowed to the project the rest of this band has been about, with three people's
 * tickets in it and one of them already taken.
 *
 * THE SECOND DRAWING OF THIS WINDOW ON THE PAGE, and that is a decision the product owner
 * made knowingly when this band was added: `BuiltForArt`'s `TasksArt`, two bands above,
 * draws the same modal. Two drawings of one window earn their place only if they are
 * FRAMED DIFFERENTLY, so the differences here are deliberate and each one is the team half
 * of the claim:
 *
 *   • THE FILTER IS LIT. `TasksArt` shows the picker on "All repositories", which is the
 *     personal backlog — everything you have, in one list. This one shows it closed on
 *     `acme/checkout-api`, in the accent tokens the app gives an active filter, which is
 *     what someone working inside a team actually does with that control. It is the
 *     single most load-bearing pixel in the drawing.
 *   • ONE REPOSITORY CARD, NOT TWO. That is what a lit filter MEANS, so drawing two would
 *     contradict the control above it. `TasksArt` needs both because its point is that
 *     GitHub and Jira arrive in the same list; this one's point is a single shared
 *     project, and the trackers have already had their say two bands above.
 *   • THREE AUTHORS AND A TAKEN ROW. See `ROWS`.
 *   • THE COUNTS AGREE WITH THE FILTER. `site.tasksCard.countGithub` in both places
 *     rather than the unfiltered `total` — nine to do in this repository, and the same
 *     nine on the card's own header. A filtered list with a total from before the filter
 *     is the kind of detail that makes a mockup read as a mockup.
 *
 * The chrome, the section line, the filter bar and the rows are otherwise `TasksArt`'s
 * measurements, which are `TasksModalMockup`'s, which are the app's. Not imported from
 * either: both are internal to their files, and lifting them into a shared module to share
 * three flex rows would put a component between two drawings that are deliberately
 * diverging.
 */
export function TeamTasksArt() {
  const { t } = useT()

  return (
    <div aria-hidden className="-mb-10 px-7">
      <div className={WINDOW}>
        {/* THE CHROME. `PageModal.tsx`: a fixed-height bar, title left, close right. */}
        <div className="flex h-10 items-center justify-between border-b border-onink-rule px-3">
          <span className="text-xs font-semibold text-white">{t('site.tasksCard.title')}</span>
          <X className="h-3.5 w-3.5 text-onink-dim" />
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          {/* THE SECTION LINE: the list's glyph, its name, then the count and Reload
              pushed to the far end. */}
          <div className="flex items-center gap-2 text-xs text-onink-body">
            <ListTodo className="h-3.5 w-3.5 shrink-0" />
            <span>{t('site.tasksCard.section')}</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-onink-faint">
                {t('site.tasksCard.countGithub')}
              </span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-onink-rule px-1.5 py-0.5 text-[11px] font-medium text-onink-dim">
                <RefreshCw className="h-3 w-3" />
                {t('site.tasksCard.reload')}
              </span>
            </span>
          </div>

          {/* THE FILTER BAR, with the repository picker LIT. The accent border and tint
              are what the app gives a control holding a value against the neutral
              `onink-rule` of one that is not — so the difference between this drawing and
              `TasksArt`'s is visible before a word of either is read. */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-onink-faint" />
              <div className="w-full truncate rounded-lg border border-onink-rule bg-onink-tint py-1 pl-7 pr-2 text-[11px] text-onink-faint">
                {t('site.tasksCard.search')}
              </div>
            </div>
            <div className="flex w-44 shrink-0 items-center gap-1 rounded-lg border border-accent/40 bg-accent/15 px-2 py-1 text-[11px] font-medium text-accent-hover">
              <span className="truncate">{REPO.slug}</span>
              <ChevronDown className="ml-auto h-3 w-3 shrink-0" />
            </div>
          </div>

          {/* THE REPOSITORY CARD. `TasksModalMockup`'s `CARD`, on the same tokens. */}
          <div className="overflow-hidden rounded-lg border border-onink-rule bg-onink-tint">
            <div className="flex w-full items-center gap-2 px-3 py-2">
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-onink-dim" />
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: REPO.color }}
              />
              <span className="truncate text-xs font-medium text-white">{REPO.slug}</span>
              {/* Untranslated in the app on purpose: "GitHub" is a product name. */}
              <span className="shrink-0 text-[11px] text-onink-faint">· GitHub</span>
              <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-onink-faint">
                {t('site.tasksCard.countGithub')}
              </span>
            </div>

            {ROWS.map((row) => (
              <div
                key={row.number}
                className="flex items-center gap-2.5 border-t border-onink-rule px-3 py-2"
              >
                {/* The tracker's mark on its own tile — the app's `sm` tile, one step
                    down for a card. */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-onink-selected text-white">
                  <GithubMark className="h-3.5 w-3.5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[11px] text-accent-hover">
                      {row.number}
                    </span>
                    <span className="truncate text-xs text-white">{t(row.title)}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[11px] text-onink-dim">@{row.author}</span>
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
                {row.agent && (
                  <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-onink-dim">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                    {t('site.tasksCard.agent')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
