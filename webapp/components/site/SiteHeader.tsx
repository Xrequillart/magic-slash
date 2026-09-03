'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { Button, ButtonLink } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { HOME_PATH, LOGIN_PATH } from '@/lib/routes'
import { useSession } from '@/lib/session'
import {
  NAV_ITEM,
  POPOVER_PANEL,
  POPOVER_ROW,
  POPOVER_ROW_REST,
  useDismiss,
} from './NavDropdown'
import { useRevealClass } from './Reveal'

/**
 * The public site's top bar: wordmark, the Product menu, the how-it-works link, the
 * language picker, and the way in.
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
 * MOUNT as well as on scroll: a visitor arriving on `/#how` starts mid-page, and a bar
 * that only reacted to the first scroll EVENT would paint transparent over content
 * until they moved.
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
 * THE BAR IS DOWN TO THREE THINGS — wordmark, one nav link, the way in — and both cuts
 * were requested rather than forced by width. The Product dropdown went (see
 * `NAV_LINKS`), and so did the LANGUAGE PICKER: `LanguageMenu` now appears only in the
 * footer, in the dress written for exactly that, and its own note is that the footer is
 * where people go LOOKING for the control. Its `header` dress is consequently unused;
 * it is left in place rather than deleted, since the component's two-dress API is what
 * lets a later story put a picker back somewhere without reinventing one.
 *
 * The collapse below `md` stays regardless. Three controls still do not fit: the
 * wordmark alone is 165px at `h-12`, "Comment ça marche" is ~145px with its padding and
 * the way in ~86px, which is ~412px of content against the 327px a 375px viewport
 * offers. Removing controls moved the number, not the verdict.
 */

/**
 * The nav, which is now one row: "how it works", and nothing else.
 *
 * IT WAS A PRODUCT MENU plus this anchor — six rows behind a dropdown trigger, pointing
 * into the documentation at anchors `DocSidebar` publishes. The dropdown is gone by
 * request, and with it the last reason this file needed `NavDropdown`'s own component.
 * The `site.nav.{product,allFeatures,gettingStarted,skillsReference,configuration,
 * documentationCategory,changelog}` keys stay in the catalogues unreferenced, like every
 * other family this rebuild has retired: nothing tests for an unused key, and pruning
 * them means editing `i18n.test.ts`'s exact `SAME_IN_BOTH` allow-list in lockstep. The
 * footer still carries the same destinations, so nothing became unreachable.
 *
 * The MOBILE panel is fed from the same array rather than a second copy of it — the two
 * lists drifting apart is exactly what a shared constant is for, and the reason the bar
 * and the panel agree about what the nav contains at every width.
 *
 * At module scope with `label` as a `MessageKey`, so `tsc` checks the key — the same
 * shape the homepage's own `STEPS` rows use. `t()` cannot be called here, so the label
 * is resolved in the render below.
 */
const NAV_LINKS: { href: string; label: MessageKey }[] = [
  { href: '/#how', label: 'site.nav.howItWorks' },
]

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
  items,
  session,
}: {
  items: { href: string; label: string }[]
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
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${POPOVER_ROW} ${POPOVER_ROW_REST}`}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
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
          {/* An anchor rather than a route, so it works from the homepage without a
              navigation — and there is no page to point it at anyway. `NAV_ITEM` is the
              bar's own control recipe; it used to be shared with the Product trigger
              that stood beside this link, and it stays in `NavDropdown.tsx` because
              `MobileMenu` and the footer's picker still draw on that file's popover
              vocabulary. This link once restated the recipe inline and arrived without
              the focus ring, which is the drift the shared constant exists to stop.

              Below `md` this row is a row of `MobileMenu`'s panel — the same `NAV_LINKS`
              entry, rendered in the other place. */}
          <Link href="/#how" className={NAV_ITEM}>
            {t('site.nav.howItWorks')}
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <WayIn session={session} className="max-w-[12rem]" />
        </div>

        <MobileMenu
          items={NAV_LINKS.map((link) => ({ href: link.href, label: t(link.label) }))}
          session={session}
        />
      </div>
    </header>
  )
}
