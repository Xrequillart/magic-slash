'use client'

import { Fragment, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import {
  type LucideIcon,
  AppWindow,
  CircleHelp,
  Download,
  Layers,
  Menu,
  ScrollText,
  Workflow,
  X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { HOME_PATH, LOGIN_PATH } from '@/lib/routes'
import { useSession } from '@/lib/session'
import {
  ALL_NAV_GROUPS,
  FAQ_NAV_ROW,
  PRODUCT_MENU_GROUPS,
  PRODUCT_MENU_LABEL,
  type SiteNavIcon,
  type SiteNavRow,
} from '@/lib/siteNav'
import { LanguageMenu } from './LanguageMenu'
import { GITHUB_REPO_URL } from './links'
import {
  NAV_ITEM,
  NAV_ITEM_GROUND,
  NavDropdown,
  type NavDropdownItem,
  POPOVER_ICON_TONES,
  POPOVER_PANEL,
  POPOVER_ROW,
  POPOVER_ROW_NAV,
  POPOVER_ROW_WITH_ICON,
  POPOVER_RULE,
  useDismiss,
} from './NavDropdown'
import { useRevealClass } from './Reveal'

/**
 * The public site's top bar: wordmark, the Product menu, the FAQ, then the repository,
 * the language picker and the way in.
 *
 * FIVE CONTROLS AND ONE RECIPE. Everything from "Produit" to the way in is `NAV_ITEM`
 * (`./NavDropdown.tsx`) — semibold ink at `text-sm` on a pill that fills with the same
 * grey chip under the cursor, whether it opens a panel or leaves for GitHub. That is the
 * owner's format for this bar, and the two exceptions to the resting state are stated
 * where they are made: an OPEN menu keeps the chip without a cursor, and the way in
 * rests on it.
 *
 * IN TAILWIND, where it used to be nine `marketing.css` classes. That stylesheet no
 * longer reaches these routes (see `app/(marketing)/layout.tsx`), so the geometry is
 * restated here in utilities — but not the geometry it defined. `marketing.css` drew a
 * floating pill: 52px tall, inset 16px, 12px from the top, its own rounded silhouette
 * capped at `max-w-site`. This bar is FULL-BLEED instead: 64px tall, flush to the top,
 * edge to edge, with a hairline under it. The sheet and the rule now run the whole width
 * of the viewport while the CONTENT stays on the page's own 1100px column, so the
 * wordmark sits on the same vertical as the hero's headline — a pill could not do that,
 * because its silhouette and its content shared one box.
 *
 * Every colour is a token — nothing at rest, translucent white once the page moves —
 * and so is the width: 1100px is declared once, in `tailwind.config.ts`, because the
 * footer and every band of the homepage are capped on the same number and three
 * hand-written copies of it cannot be retuned together. The height is `h-16` rather
 * than the pill's arbitrary `h-[52px]`, which is one hardcoded value fewer and the
 * ordinary height for a bar that no longer has to look like it is hovering.
 *
 * SCROLL STATE, and what is left of it. The original kept two classes: `scrolled` above
 * 0, and `past-hero` above 600px. Only the first survives, and it now does MORE than it
 * did: it is what brings the bar's surface into existence at all. Above the fold there
 * is no fill, no rule and no blur — just the controls floating on the hero — and the
 * first pixel of scroll fades in the white sheet, the hairline under it and the frosted
 * blur together, so content can pass beneath the bar without running into the type. `past-hero` is gone because its ONLY job was unfolding the account button, which
 * used to ship collapsed (`max-width: 0`) so it would not compete with the hero's CTA.
 * That control is a plain anchor now and is visible from the first paint, which
 * leaves the 600px threshold with nothing to switch. Both thresholds are still read on
 * MOUNT as well as on scroll: a visitor arriving on `/features#workflow`, or coming
 * BACK to a page the browser restores mid-scroll, starts below the fold, and a bar that
 * only reacted to the first scroll EVENT would paint transparent over content until they
 * moved.
 *
 * `useSession` stays, and so does what it renders BEFORE it resolves: the signed-out
 * label. That is the right answer for almost every visitor to a public page, and it is
 * also what the server renders — so hydration matches rather than flickering through a
 * loading state on the one control everybody looks at.
 *
 * BELOW `md` THE BAR COLLAPSES, which the Tailwind rebuild had dropped: `marketing.css`
 * hid `.header-nav` and `.header-cta-btn` under 768px and nothing here replaced it. The
 * arithmetic is not close. Going full-bleed bought back the pill's 16px inset and its
 * border, so the content box is now `viewport − 48` of `px-6`: 327px at 375px and 272px
 * at 320px, against a 160px wordmark (the SVG is 693.37×130, so `h-[30px]` is 160.0px
 * wide), a ~96px Product trigger, a ~74px language picker, an ~86px `Sign in` control and
 * 24px of gaps — 456px asked for, 327px available. Ten pixels of relief does not change
 * the verdict, which is why the collapse below stays exactly as it was. (Those figures
 * predate two changes that both went the right way: the version badge is gone, and the
 * new wordmark is 124px rather than 160px. The bar is still far too wide for 375px, so
 * the conclusion holds and the numbers are left as the worst case they measured.)
 *
 * So the nav and the right-hand cluster go `hidden md:flex`, and a single icon-only
 * `Menu` button takes their place — 41px, which leaves the mobile bar at 217px of the
 * 262px available at 320px. It is a DISCLOSURE, not a hidden bar: the panel carries the
 * nav row and the way in, because a homepage whose only route to sign-in is the footer
 * is worse than a bar that overflows.
 *
 * THE BAR IS WORDMARK, PRODUCT ▾, FAQ, THEN GITHUB, THE PICKER AND THE WAY IN — two nav
 * controls, one of them a menu. The Product dropdown had been cut by request when the
 * bar was rebuilt, on a homepage that was then the only page there was; it comes back
 * because the site now has six destinations to offer and a bar cannot hold six. Its rows
 * and their order are NOT here — `lib/siteNav.ts` owns them, and the note there says why
 * a nav row is a tested constant rather than a literal in JSX.
 *
 * THE FAQ IS A BARE LINK AGAIN, which is what it was before it was a menu. It stayed out
 * of the Product menu on the reading that the page answering the objection which stops a
 * download should be one press from anywhere; then it got a neighbour — "Best practices"
 * — and two bare links of the teaching kind beside one trigger would have made a bar of
 * two controls read as three peers, so the pair went behind a **Help** trigger. That
 * page is deleted by request, and a trigger over a single FAQ row is a press bought with
 * nothing. "All features" is inside the Product menu, where it sits with the pages it
 * summarises.
 *
 * "OUR STORY" WAS THE THIRD NAV CONTROL and its page is deleted by request too, so the
 * bar is down to a trigger and a link. `/story` 308s to the homepage rather than 404ing
 * — see `RETIRED_PATHS` in `lib/hostRouting.ts` — because it was in the footer of every
 * public page for releases and those links are still out there.
 *
 * THE LANGUAGE PICKER IS BACK, on the right of the bar beside the way in — and the
 * component's two-dress API is exactly what made that a call site rather than a rebuild:
 * `LanguageMenu` kept a `header` dress through the release it spent in the footer alone,
 * for this. It sits in the RIGHT-HAND cluster and not in the nav, because it changes a
 * setting rather than going anywhere, and the two families should not be interleaved;
 * within that cluster it comes BEFORE the way in, so the primary control stays at the
 * end of the bar where a reader's eye lands last.
 *
 * IT STILL APPEARS IN THE FOOTER, in the dress written for exactly that, and that is not
 * a duplicate to prune: the footer is where people go LOOKING for the control, and it is
 * the ONLY picker below `md`, where this cluster is hidden. The alternative was a picker
 * inside `MobileMenu`, which is a popover inside a disclosure — two presses to reach a
 * setting, on the surface where presses cost the most.
 *
 * The collapse below `md` stays regardless, and none of this moves the number far: the
 * bar's content is the 165px wordmark, ~96px of "Produit", ~55px of "FAQ", a ~74px
 * picker, an ~86px way in and the ~62px "GitHub" beside them — ~540px against the 327px
 * a 375px viewport offers. The rows behind a trigger cost the bar nothing; they cost the
 * PANEL, which is a column and has the room. Two controls have left the bar since that
 * arithmetic was written — the "Aide" trigger and the story link, ~130px between them —
 * and it is still short by 200px.
 */

/**
 * AN ICON NAME → THE COMPONENT THAT DRAWS IT.
 *
 * `lib/siteNav.ts` names glyphs and does not import them, because the root vitest suite
 * reads that module and would not resolve `lucide-react` — the rule is stated there and
 * in `lib/features.ts` at length. So the map is HERE, beside the markup that renders it,
 * exactly as `FeaturesContent.tsx` keeps its own.
 *
 * `Record<SiteNavIcon, …>` is what makes a name with no glyph a TYPE error rather than a
 * hole in the menu — though only at `next build` on Vercel, since CI typechecks
 * `desktop/` alone. `glyphFor` below is the guard behind that.
 */
const ICONS: Record<SiteNavIcon, LucideIcon> = {
  AppWindow,
  CircleHelp,
  Download,
  Layers,
  ScrollText,
  Workflow,
}

/**
 * A row, dressed for a panel: its label resolved, its glyph looked up.
 *
 * ONE FUNCTION FOR BOTH SURFACES — the dropdown and the mobile panel show the same rows,
 * and a second copy of this mapping is how they would come to disagree about which glyph
 * belongs to which row. It takes `t` rather than calling `useT` because it is not a
 * component; both call sites already have one.
 *
 * The `| undefined` on the lookup is the honest type of an index access into a `Record`
 * keyed by a union with `noUncheckedIndexedAccess` off: the compiler believes the map is
 * complete, and it is — but "checked by a deploy that has not happened yet" is not the
 * same as checked, so the branch stays visible. A row whose glyph went missing loses its
 * icon and keeps its label, which is the failure worth having.
 */
function dress(row: SiteNavRow, t: (key: MessageKey) => string): NavDropdownItem {
  const glyph: LucideIcon | undefined = row.icon ? ICONS[row.icon] : undefined
  return {
    href: row.href,
    label: t(row.label),
    icon: glyph,
    tone: row.tone,
    tile: row.tile,
  }
}

/**
 * THE NAV IS NOT DECIDED HERE ANY MORE. `lib/siteNav.ts` holds it: `PRODUCT_MENU_GROUPS`
 * (five rows in three families), `PRODUCT_MENU_LABEL` for the trigger, `FAQ_NAV_ROW` for
 * the link beside it, and `ALL_NAV_GROUPS` — every row there is — for the mobile panel.
 *
 * IT USED TO BE A ONE-ROW `NAV_LINKS` ARRAY RIGHT HERE, and moving it out is not
 * housekeeping. A row's `href` and `PUBLIC_PATHS` in `lib/hostRouting.ts` disagreeing
 * does not produce a 404: it 307s the reader to a login form on `app.magic-slash.io`, so
 * the bar on every public page appears to sign them out. `siteNav.test.ts` pins every row
 * against that list and against the page behind it, and a literal in this file's JSX is a
 * row no test can enumerate.
 *
 * WHAT IS STILL DECIDED HERE is the arrangement: which rows the bar shows itself, which
 * go behind the trigger, and what the panel does with all of them below `md`.
 */

/**
 * THE WAY IN'S DRESS, AND IT IS THE BAR'S OWN — `NAV_ITEM` on a chip that is always
 * there, where this was two rungs of `ButtonLink` (a blue `primary` signed out, a white
 * bordered `secondary` signed in).
 *
 * WHY IT STOPPED BEING A BUTTON. The bar holds two menu triggers and two links now (the
 * FAQ, and the repository at the other end), all of them semibold ink on a pill that fills grey under the cursor, and a filled blue
 * button at the end of that row was the only element in the bar built on a different
 * ladder: it read as an advertisement stapled to a navigation bar. The page has not
 * lost a CTA — `primary` still carries "Télécharger pour Mac" in the hero, two inches
 * below, which is the download this site is actually asking for. A header sign-in is a
 * DESTINATION, and the bar already has a recipe for one.
 *
 * THE GROUND IS PERMANENT, and that is the one thing it does differently from a trigger:
 * `NAV_ITEM_GROUND` is a hover-and-open state on "Produit", and it rests on this. So the
 * control still reads as the last thing in the bar rather than as another menu, with no
 * second colour and no second shape to do it — the chip that answers the cursor
 * elsewhere is simply where this one starts. Hover is left to `NAV_ITEM`'s own
 * `hover:text-ink`, which closes the 20% the label rests at.
 *
 * `flex` and not the inline anchor `NAV_ITEM` alone would give: the mobile panel hands
 * this `w-full`, which does nothing to an inline element, and the signed-in label needs
 * a `min-w-0` flex child to truncate inside a capped box (the rule `components/ui.tsx`
 * states for its own `truncate` prop, one level down).
 */
const WAY_IN = `flex items-center justify-center ${NAV_ITEM} ${NAV_ITEM_GROUND}`

/**
 * The way in, wherever it is standing: the bar at `md` and up, the mobile panel below.
 *
 * One component rather than the same ternary written twice, because the two copies would
 * be the ones to drift — the signed-in branch has three attributes the signed-out branch
 * does not. `className` is additive only (`max-w-*`, `w-full`, `mt-*`), which is the same
 * rule `components/ui.tsx` states for a recipe handed a class from its call site.
 *
 * The label falls back to `site.nav.account` when Supabase hands us a session with no
 * email on it — an OAuth identity that never exposed one, or a phone sign-up. The
 * `aria-label` already said "Your account" in that case, so the control was named but
 * VISUALLY EMPTY: a plate with 28px of padding and nothing between it.
 */
function WayIn({ session, className }: { session: Session | null; className?: string }) {
  const { t } = useT()

  // Signed out this is the way in; signed in it is the way back to your account, and
  // showing WHICH account matters to anyone keeping a work and a personal login. Plain
  // anchors either way, NOT `next/link`: both paths leave for the app host, and there is
  // no client-side navigation across origins — see `lib/routes.ts`.
  return session ? (
    <a
      href={HOME_PATH}
      className={`${WAY_IN} ${className ?? ''}`}
      title={session.user.email ?? undefined}
      aria-label={t('site.nav.account')}
    >
      {/* `min-w-0` so the flex child may shrink below its content — without it
          `truncate`'s `overflow-hidden` has nothing to clip, and a long address pushes
          the bar's cap open instead of ellipsising inside it. */}
      <span className="min-w-0 truncate">{session.user.email ?? t('site.nav.account')}</span>
    </a>
  ) : (
    <a href={LOGIN_PATH} className={`${WAY_IN} ${className ?? ''}`}>
      {t('site.nav.signIn')}
    </a>
  )
}

/**
 * The bar below `md`: one icon button, and everything the bar cannot hold under it.
 *
 * Built on the pieces the two existing popovers already share — `useDismiss` for the
 * outside-click and Escape (which hands focus back to the trigger, since Escape
 * otherwise leaves the keyboard on an element that is now `hidden`), and
 * `POPOVER_PANEL` / `POPOVER_ROW` for the dress. The panel is RENDERED THEN HIDDEN, not
 * conditional, for the same reason as the others: `hidden` takes it out of the tab order
 * and the accessibility tree while leaving something for `aria-controls` to point at.
 *
 * NO `role="menu"` here, unlike `NavDropdown`. This is a disclosure — a group of links
 * with a button at the end of it — and a menu role would promise arrow-key semantics
 * that a `menuitem` list of anchors plus the way in does not have. `aria-expanded`
 * plus `aria-controls` is the whole contract, and the trigger carries an `aria-label`
 * because its glyph is `aria-hidden` and there is no text left to name it.
 *
 * `w-64` is 256px, which fits inside the 262px the pill offers at 320px — the panel is
 * anchored to the pill's content box, so it cannot reach the viewport edge.
 */
function MobileMenu({
  groups,
  session,
}: {
  /**
   * The rows in reading order, divided into families — `ALL_NAV_GROUPS`, which is the
   * Product menu's three plus the row the bar shows in the open as a fourth. A rule goes
   * between one group and the next, never above the first: the same arrangement
   * `NavDropdown` draws, because below `md` this panel IS the whole nav, and a reader who
   * resizes should not find it regrouped.
   */
  groups: NavDropdownItem[][]
  session: Session | null
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useDismiss(open, setOpen, root)

  return (
    <div ref={root} className="relative ml-auto md:hidden">
      <Button
        type="button"
        variant="ghost"
        icon={open ? X : Menu}
        aria-label={t('site.nav.menu')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((was) => !was)}
      />

      <div id={panelId} hidden={!open} className={`${POPOVER_PANEL} right-0 w-64`}>
        {groups.map((group, index) => (
          // Keyed by the first row's path rather than the index — paths are unique across
          // the nav (`siteNav.test.ts` asserts it), so a group that moves keeps its
          // identity instead of inheriting a sibling's.
          <Fragment key={group[0]?.href ?? index}>
            {/* NO `role="separator"` HERE, unlike the dropdown's own rule: this panel is
                a disclosure and not a `role="menu"` (see the note above), so its children
                carry no roles to be a valid one of. A decorative line in a group of links
                is `aria-hidden`, and the rule the dropdown draws is a separator only
                because a menu requires its children to be something. */}
            {index > 0 && <div aria-hidden className={POPOVER_RULE} />}

            {group.map((item) => {
              // Capitalised local: JSX reads a lower-case tag as an HTML element.
              const Glyph = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${Glyph ? POPOVER_ROW_WITH_ICON : POPOVER_ROW} ${POPOVER_ROW_NAV}`}
                  onClick={() => setOpen(false)}
                >
                  {/* BARE, even for the rows that ask for a tile: `item.tile` is
                      deliberately not read here. A 40px plate plus 12px of gap leaves
                      204px of this 256px panel for a label, and the longest of them
                      ("Toutes les fonctionnalités") does not fit — and the panel cannot
                      grow, because `w-64` is what fits the 262px a 320px viewport offers.
                      The rows, their order and their colours are the same as the bar's;
                      the frame is the one part of the dress this width cannot carry. */}
                  {Glyph && (
                    <Glyph
                      className={`h-4 w-4 shrink-0 ${item.tone ? POPOVER_ICON_TONES[item.tone] : ''}`}
                      aria-hidden
                    />
                  )}
                  {item.label}
                </Link>
              )
            })}
          </Fragment>
        ))}
        <WayIn session={session} className="mt-2 w-full" />
      </div>
    </div>
  )
}

export function SiteHeader() {
  const { t } = useT()
  // Resolves in the browser only; on a public page it is usually null.
  const { session } = useSession()

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 0)
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])

  // First in the entrance sequence, which is why the bar's fade comes from the same
  // hook the hero uses rather than from a timer of its own. It cannot use `Reveal`
  // itself: that component owns its own element, and this one is the bar.
  //
  // The bar therefore SHIPS VISIBLE — the entrance is a class the client adds once it
  // has mounted, and its absence on the server, without JavaScript and under reduced
  // motion leaves the pill exactly where it belongs. `[--reveal-from:-1.25rem]` is the
  // 20px above from which it drops in, the one thing it does differently from the hero
  // elements rising 12px behind it. See `Reveal`, and the keyframes it names.
  const reveal = useRevealClass()

  return (
    <header
      className={[
        // The `transition-[...]` list is the SCROLL state and nothing else: the bar
        // fading a white sheet, a hairline and a blur into being out of nothing.
        // `backdrop-filter` is in the list so the frost arrives with the fill instead of
        // snapping on a frame ahead of it. The ENTRANCE is not in this list — it is an
        // animation now, not a transition.
        //
        // TWO ELEMENTS, AND THE SPLIT IS THE POINT. The `header` is the BAND: edge to
        // edge, so the sheet and its bottom rule cross the whole viewport. The `div`
        // inside is the COLUMN, and it is `HomeSection`'s column verbatim — `px-6` out
        // here, `mx-auto max-w-site` in there. That ordering is what makes the wordmark
        // land on the same vertical as the hero's headline: put the padding inside the
        // cap instead and the bar's content sits 24px further in than the page's on any
        // viewport wide enough to hit 1100px.
        'fixed inset-x-0 top-0 z-50 border-b px-6 transition-[background-color,border-color,backdrop-filter] duration-[600ms] ease-out [--reveal-from:-1.25rem]',
        // AT REST THE BAR HAS NO SURFACE AT ALL — no fill, no rule, and no blur. It used
        // to sit on `softblue/70`, a tint of the hero's own wash, which was a reasonable
        // choice while the hero was a two-column band and a bad one now: the hero's blue
        // bloom reads as a single field, and a translucent bar over it drew a horizontal
        // seam across the top of it.
        //
        // `backdrop-blur-xl` MOVED INTO THE SCROLLED BRANCH rather than staying on the
        // base, and that is the half that is easy to miss: a backdrop filter is not
        // gated by the background being transparent. Left on the base, the bar would
        // have no fill and still blur the headline sliding under it — an invisible pane
        // of frosted glass, which is worse than a visible one because nothing on screen
        // explains the smear.
        scrolled
          ? 'border-hairline bg-white/80 backdrop-blur-xl'
          : 'border-transparent bg-transparent',
        // Empty at rest, so `filter` rather than `join` alone: an entrance that has not
        // started contributes no class instead of a trailing space.
        reveal,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-site items-center gap-4">
        <Link href="/" className="flex h-12 shrink-0 items-center" aria-label="magic-slash">
          {/* The bar is light in every state, so it always wants the black variant.
              `alt` is empty because the link around it is already labelled.

              `logo-black.svg`, not the old `logo-readme-light.svg`: new artwork, on a
              736×214 canvas where the old wordmark was 693×130 — 3.44:1 against 5.33:1.
              The consequence is that height and PRESENCE came apart: this artwork carries
              vertical air the old wordmark did not, so a box of the same height puts less
              ink on the screen. `h-12` (48px, ~165px wide) is what brings it back level
              with the 160px the old one occupied at `h-[30px]`, and it is a round number
              rather than an arbitrary one — the value tuned to the old ratio had nothing
              left to preserve. In a 64px bar that leaves 8px of air above and below; one
              class to dial back if it reads tight. */}
          <img className="h-full w-auto" src="/img/logo-black.svg" alt="" />
        </Link>

        {/* `hidden md:flex`: 768px is the threshold `marketing.css` used, and the same one
            `MobileMenu` takes over below. */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* THE PRODUCT MENU, back after a release without one — `NavDropdown` was left
              in place for exactly this, and it needed nothing added: a trigger, a panel
              of links, the outside-click and Escape handling, and `role="menu"` over
              rows that are all anchors.

              Its rows come from `lib/siteNav.ts` and its trigger's label with them, so
              this file names neither a path nor a catalogue key. */}
          <NavDropdown
            label={t(PRODUCT_MENU_LABEL)}
            groups={PRODUCT_MENU_GROUPS.map((group) => group.map((row) => dress(row, t)))}
          />

          {/* AND ONE BARE LINK, right of the trigger — `NAV_ITEM` is exported for
              exactly this. The FAQ was a dropdown for one release and is a link again
              because the row that made a menu of it is deleted (see `FAQ_NAV_ROW` in
              `lib/siteNav.ts`); the change is one `Link` for one `NavDropdown`, which is
              what putting the nav's shape in a module bought both ways. There were two
              links here until "Our story" was deleted with its page.

              THE PATH IS NOT TYPED HERE, which is what the module is for: a row whose
              `href` and `PUBLIC_PATHS` disagree does not 404 on production, it 307s the
              reader to a login form. `siteNav.test.ts` reads this file to check the link
              goes through its constant.

              THE SAME DRESS AS THE TRIGGER, chip and all: `NAV_ITEM` carries the hover
              ground now, by decision of the owner — the bar's links and its dropdowns
              are one format, so nothing here distinguishes a control that opens a panel
              from one that goes to a page. See the note on the recipe. */}
          <Link href={FAQ_NAV_ROW.href} className={NAV_ITEM}>
            {t(FAQ_NAV_ROW.label)}
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {/* THE REPOSITORY, AS THE WORD AND NOT THE MARK. It shipped for one iteration
              as an icon-only control — `GithubIcon` from `./icons.tsx`, the one glyph on
              the site lucide will not ship — and the owner's call is a label: a bar of
              words plus one logo reads as a badge somebody stuck on the end of a nav,
              and a mark is a control you have to recognise where a word is one you can
              read. It costs the bar ~26px over the 36px square and takes `NAV_ITEM`
              unchanged, which the square could not.

              NOT TRANSLATED — the proper noun, the way `SiteFooter`'s own row spells it
              rather than sending it through `t()`.

              `target="_blank"` with `rel="noreferrer"`: it leaves the site, and a reader
              who came here to look at the code has not finished with the page. */}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className={NAV_ITEM}>
            GitHub
          </a>

          {/* THE THIRD TRIGGER IN THE BAR, and it wears the same recipe the other two do
              — see the `header` dress in `LanguageMenu`. Its panel hangs from the right
              edge (`right-0`), which is the one thing it must do differently from the
              nav's: anchored left, a 144px panel on the last control but one would open
              past the column's edge. */}
          <LanguageMenu variant="header" />
          <WayIn session={session} className="max-w-[12rem]" />
        </div>

        {/* FLATTENED, on purpose: below `md` there are no dropdowns, so both menus' rows
            are one column, in `ALL_NAV_GROUPS`' order, with a rule where each boundary
            was. A disclosure inside a disclosure is two presses to reach a link on the
            surface where presses are most expensive — and reproducing both triggers in
            here would make it three. */}
        <MobileMenu
          groups={ALL_NAV_GROUPS.map((group) => group.map((row) => dress(row, t)))}
          session={session}
        />
      </div>
    </header>
  )
}
