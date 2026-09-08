'use client'

import { Fragment, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import {
  type LucideIcon,
  AppWindow,
  CircleHelp,
  Cloud,
  Download,
  Layers,
  Lightbulb,
  Menu,
  ScrollText,
  Workflow,
  X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { Button, ButtonLink } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { HOME_PATH, LOGIN_PATH } from '@/lib/routes'
import { useSession } from '@/lib/session'
import {
  ALL_NAV_GROUPS,
  HELP_MENU,
  HELP_MENU_LABEL,
  PRODUCT_MENU_GROUPS,
  PRODUCT_MENU_LABEL,
  type SiteNavIcon,
  type SiteNavRow,
} from '@/lib/siteNav'
import {
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
 * The public site's top bar: wordmark, the Product menu, the Help menu, and the way in.
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
 * That button is a plain `ButtonLink` now and is visible from the first paint, which
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
 * wide), a ~96px Product trigger, a ~74px language picker, an ~86px `Sign in` button and
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
 * THE BAR IS WORDMARK, PRODUCT ▾, HELP ▾, THE WAY IN — two controls, and both of them
 * are menus now. The Product dropdown had been cut by
 * request when the bar was rebuilt, on a homepage that was then the only page there was;
 * it comes back because the site now has six destinations to offer and a bar cannot
 * hold six. Its rows and their order are NOT here — `lib/siteNav.ts` owns them, and
 * the note there says why a nav row is a tested constant rather than a literal in JSX.
 *
 * FAQ STAYED OUT OF THE PRODUCT MENU AND IS NOW IN A MENU OF ITS OWN. It spent a
 * release as the bar's second control, on the reading that the page answering the
 * objection which stops a download should be one press from anywhere. What changed is
 * that it got a neighbour: "Best practices" is the other thing a reader comes here to be
 * taught, and two bare links of that kind beside one trigger would have made a bar of
 * two controls read as three peers. So the second control is a **Help** menu, and the
 * word on the trigger is what a reader with a question looks for before they look for
 * "FAQ". "All features" is inside the Product menu, where it sits with the pages it
 * summarises.
 *
 * THE LANGUAGE PICKER IS STILL GONE, and that cut is unrelated: `LanguageMenu` appears
 * only in the footer, in the dress written for exactly that, and its own note is that
 * the footer is where people go LOOKING for the control. Its `header` dress is
 * consequently unused; it is left in place rather than deleted, since the component's
 * two-dress API is what lets a later story put a picker back somewhere without
 * reinventing one.
 *
 * The collapse below `md` stays regardless, and a menu makes the case narrower, not
 * wider: a trigger is ~96px whatever it opens, so the bar's content is the 165px
 * wordmark, ~96px of "Produit", ~78px of "Aide" and an ~86px way in — ~449px against
 * the 327px a 375px viewport offers. The rows behind a trigger cost the bar nothing;
 * they cost the PANEL, which is a column and has the room. A second trigger costs ~23px
 * more than the link it replaced, which changes the number and not the verdict.
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
  Cloud,
  Download,
  Layers,
  Lightbulb,
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
  return { href: row.href, label: t(row.label), icon: glyph, tone: row.tone, tile: row.tile }
}

/**
 * THE NAV IS NOT DECIDED HERE ANY MORE. `lib/siteNav.ts` holds it: `PRODUCT_MENU` (seven
 * rows, in menu order), `PRODUCT_MENU_LABEL` for the trigger, `FAQ_NAV_ROW` for the link
 * beside it, and `ALL_NAV_ROWS` — the two flattened — for the mobile panel.
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
 * The way in, wherever it is standing: the bar at `md` and up, the mobile panel below.
 *
 * One component rather than the same ternary written twice, because the two copies would
 * be the ones to drift — the signed-in branch has three attributes the signed-out branch
 * does not. `className` is additive only (`max-w-*`, `w-full`, `mt-*`), which is the rule
 * `components/ui.tsx` states for anything handed to `ButtonLink`.
 *
 * The label falls back to `site.nav.account` when Supabase hands us a session with no
 * email on it — an OAuth identity that never exposed one, or a phone sign-up. The
 * `aria-label` already said "Your account" in that case, so the button was named but
 * VISUALLY EMPTY: a white plate with 46px of padding and nothing between it.
 */
function WayIn({ session, className }: { session: Session | null; className?: string }) {
  const { t } = useT()

  // Signed out this is the way in; signed in it is the way back to your account, and
  // showing WHICH account matters to anyone keeping a work and a personal login. Plain
  // anchors either way: both paths leave for the app host, and there is no client-side
  // navigation across origins — see `lib/routes.ts`. `ButtonLink` renders an `<a>`,
  // which is exactly what that needs.
  return session ? (
    <ButtonLink
      href={HOME_PATH}
      variant="secondary"
      title={session.user.email ?? undefined}
      aria-label={t('site.nav.account')}
      truncate
      className={className}
    >
      {session.user.email ?? t('site.nav.account')}
    </ButtonLink>
  ) : (
    <ButtonLink href={LOGIN_PATH} variant="primary" className={className}>
      {t('site.nav.signIn')}
    </ButtonLink>
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
 * that a `menuitem` list of anchors plus a `ButtonLink` does not have. `aria-expanded`
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
   * Product menu's three plus the Help menu as a fourth. A rule goes between one group
   * and the next, never above the first: the same arrangement `NavDropdown` draws,
   * because below `md` this panel IS both menus and a reader who resizes should not find
   * them regrouped.
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
                  {/* BARE, even for the four rows that ask for a tile: `item.tile` is
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

          {/* AND THE SECOND MENU, which used to be a bare `/faq` link written out right
              here. It became a dropdown when it got a neighbour — see `HELP_MENU` in
              `lib/siteNav.ts` — and the change is one `NavDropdown` for one `Link`,
              which is what putting the nav's shape in a module bought.

              ONE GROUP, so no rule inside it: `HELP_MENU` is a flat array and it is
              wrapped in one here rather than kept as a nested one over there, because a
              menu with a single family has nothing to divide and the array-of-arrays
              would be a shape claiming otherwise. */}
          <NavDropdown
            label={t(HELP_MENU_LABEL)}
            groups={[HELP_MENU.map((row) => dress(row, t))]}
          />
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
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
