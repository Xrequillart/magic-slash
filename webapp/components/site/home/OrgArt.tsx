'use client'

import type { CSSProperties } from 'react'
import { useId } from 'react'
import { RepoPageHeader, SettingsCard, TabStrip } from '@ds/desktop'
import {
  Building2,
  ClipboardList,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Languages,
  Lock,
  MessageSquare,
  Settings2,
  Ticket,
} from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { IconComponent } from '@ds/desktop/types'
import { DESKTOP_THEMES } from '@/lib/desktopTheme'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { TasksArt } from './BuiltForArt'

/**
 * The four drawings inside `OrgSection`'s four cards.
 *
 * TWO ARE THE APP'S OWN SCREENS, DRAWN WITH THE APP'S OWN COMPONENTS: the repository's
 * General tab (`SharedConfigArt`) and the Tasks board (`TeamTasksArt`). They were tracings
 * in the site's `onink` ramp, and tracings drift: the General tab had lost its Branches
 * group to the Repository tab and grown a Keywords row, and the Tasks modal had become a
 * four-column board. Both now render the design system's files — the ones
 * `desktop/src/renderer/` renders — given invented values.
 *
 * ONE IS AN ILLUSTRATION (`OrgTeamArt`), from the site's own set, where a diagram of
 * faces on rails was; one is still a DIAGRAM (`PlanSharingArt`), because a plan being
 * shared is a document arriving somewhere else and has no single screen.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT: a string the APP prints goes through the catalogue
 * with the app's own sentence (`site.repoCfg.*`, `site.repoPage.*`); the repository name,
 * the keywords and the organisation's own name are literals.
 *
 * `aria-hidden` and `inert` on the two screens, which are made of real controls.
 */

/** The app's default theme, as the variables every component under it resolves against. */
const THEME = DESKTOP_THEMES.dark

/** `inert` as the empty string, for React 18's reason — see `TasksModalMockup`. */
const INERT = { inert: '' } as unknown as { inert?: boolean }

const noop = () => undefined

/** The repository — `checkout-api`, in the colour the app hands out first. */
const REPO = { name: 'checkout-api', color: PROJECT_COLORS[0] }

/** The organisation the repository is shared with. A name, so a literal in both. */
const ORG = 'Acme'

/* ── ① The configuration a team shares ────────────────────────────────────────────── */

/**
 * `REPO_TABS`, in the app's order and with the app's glyphs, the same table
 * `RepoConfigMockup` keeps. All eight are drawn; `TabStrip` scrolls, so the ones that do not
 * fit run off its right edge, and the live one — General — is the first.
 */
const TABS: readonly { id: string; label: MessageKey | { literal: string }; icon: IconComponent }[] = [
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
 * The repository's General tab, in the app's dark theme, cropped by the card's bottom edge.
 *
 * `RepoPage.tsx`'s own order under `tab === 'general'`: the SCOPE card first — who the
 * configuration belongs to, drawn in the TEAM state with its way back ("Make personal") —
 * then the General card, name and keywords. The colour card and the danger zone are below
 * the crop, which is the right thing to lose: the page is longer than the frame.
 *
 * THE PAGE WITHOUT THE MODAL AROUND IT. The four page tabs of the overlay would take the
 * card's whole width to say "this is the app", which the Tasks card two bands up already
 * says; what this card claims is on the page. `min-w-[480px]` is where the rows stop
 * squeezing their controls: a phone crops the right edge rather than folding them. The
 * HEIGHT is fixed at 330px, which lands the cut just under the Scope card: the owner asked
 * for a shorter pair of cards on this row.
 */
export function SharedConfigArt() {
  const { t } = useT()
  const label = (value: MessageKey | { literal: string }) => (typeof value === 'string' ? t(value) : value.literal)

  return (
    <div aria-hidden {...INERT} className="h-[330px] overflow-hidden px-7">
      <div
        className="min-w-[480px] overflow-hidden rounded-2xl bg-bg-secondary p-6 text-ink shadow-lift"
        style={{ ...THEME.vars, colorScheme: THEME.appearance } as CSSProperties}
      >
        <RepoPageHeader
          name={REPO.name}
          color={REPO.color}
          subtitle={t('site.repoCfg.subtitle')}
          backLabel=""
          onBack={noop}
          className="!mb-6"
        />
        <div className="mb-6">
          <TabStrip
            ariaLabel={REPO.name}
            items={TABS.map((tab) => ({ key: tab.id, label: label(tab.label), icon: tab.icon }))}
            activeKey="general"
            onSelect={noop}
          />
        </div>
        <div className="flex flex-col gap-6">
          <SettingsCard
            title={t('site.repoCfg.scope')}
            rows={[{
              id: 'scope',
              icon: Building2,
              label: t('site.repoCfg.teamNamed', { name: ORG }),
              hint: t('site.repoCfg.teamHelp'),
              control: { kind: 'button' as const, icon: Lock, children: t('site.repoCfg.makePersonal'), onClick: noop },
            }]}
          />
          <SettingsCard
            title={t('site.repoCfg.general')}
            rows={[
              {
                id: 'name',
                label: t('site.repoCfg.name'),
                hint: t('site.repoCfg.nameHelp'),
                control: [{ kind: 'input' as const, value: REPO.name, onChange: noop, className: 'w-44' }],
              },
              {
                id: 'keywords',
                label: t('site.repoCfg.keywords'),
                hint: t('site.repoCfg.keywordsHelp'),
                layout: 'stacked' as const,
                control: {
                  kind: 'chips' as const,
                  items: ['checkout', 'payments', 'stripe'],
                  onChange: noop,
                  placeholder: 'auth',
                  addLabel: t('site.repoCfg.add'),
                  removeLabel: '',
                  id: 'org-keyword-input',
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/* ── ② The organisation ───────────────────────────────────────────────────────────── */

/**
 * AN ILLUSTRATION FROM THE SITE'S OWN SET (`illustration-vote.svg`: a team agreeing),
 * where a diagram of faces and repositories on two rails was — the owner's call. A whole
 * picture, centred by the card (`visual: 'center'` in `OrgSection`). The file's `viewBox`
 * is cropped to the drawing's measured box (`25 43 950 914`). `alt=""`: the title says it.
 */
export function OrgTeamArt() {
  return <img src="/img/illustration-vote.svg" alt="" className="mx-auto w-full max-w-[23rem] px-7" />
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
 * ~0.27s APART, which was 0.4s on the old 9s loop and was scaled with it when the owner
 * asked for a faster run. Faster and the four arrive as one flicker; slower and the
 * writing beat outgrows the 6s loop the three beats share (see
 * `tailwind.config.ts`). Four rules and not six: a title, then three stories, is the
 * shape `/magic:plan` actually leaves behind — a spec, an epic, and the stories under it.
 */
const RULES: readonly { d: string; delay: string; bullet?: { cx: number; cy: number } }[] = [
  { d: 'M 108 62 h 42', delay: '0s' },
  { d: 'M 120 86 h 34', delay: '0.27s', bullet: { cx: 110, cy: 86 } },
  { d: 'M 120 106 h 26', delay: '0.53s', bullet: { cx: 110, cy: 106 } },
  { d: 'M 120 126 h 38', delay: '0.8s', bullet: { cx: 110, cy: 126 } },
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
      {/* The avatars are line drawings on a transparent ground, so the disc is painted
          white first: without it the card's tone shows through and the node stops
          reading as a circle. */}
      <circle cx={cx} cy={cy} r={NODE_R} fill="white" stroke="none" />
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
 * 6s period so the beats cannot drift apart. `tailwind.config.ts` carries the whole
 * timeline in one comment; each beat's own keyframe explains only its own share of it.
 *
 * THE THREE NODES CARRY ILLUSTRATED AVATARS, which replaced the real photographs the owner
 * first asked for ("tu peux mettre des vrai photo dans l'illustration"). They are black line
 * drawings on a transparent ground, hence the white disc `GraphFace` paints under each one.
 * The node radius did not move with the swap: the owner asked to keep the circles the size
 * they were.
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
 * DRAWN IN `currentColor`, set to `text-ink` on the wrapper: black, at the owner's request,
 * so the wires, sheet and rings match the black line art of the avatars and of the site's
 * illustration set. Every stroke follows that one class without the file naming a colour,
 * and the fills are `currentColor` at low alpha for the same reason.
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
    <div aria-hidden className="flex justify-center px-7 py-8 text-ink">
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
                // The second story leaves a third of a second after the first, so the pair reads
                // as two people taking one each rather than as a single wide pulse.
                animationDelay: index === 0 ? '0s' : '0.33s',
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
 * THE TASKS BOARD, the same drawing as the "Tâches" card two bands up: `TasksArt`, which
 * is `TasksWindow`, which is the app's `TaskBoard`. One board, filtered to one repository
 * by the picker at its head, is exactly what this card claims — a shared list narrowed to
 * a project, with an agent's mark on the tickets already taken.
 */
export function TeamTasksArt() {
  return <TasksArt />
}
