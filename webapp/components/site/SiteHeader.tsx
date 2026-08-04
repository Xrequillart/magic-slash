'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Users } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { HOME_PATH, LOGIN_PATH } from '@/lib/routes'
import { useSession } from '@/lib/session'
import { LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'
import { LanguageMenu } from './LanguageMenu'
import { useRevealed } from './Fade'
import { GITHUB_REPO_URL, RELEASE_TAG_URL } from './links'

/**
 * The public site's top bar: wordmark, the two product links, the Resources menu,
 * version badge, language picker, and the call to action.
 *
 * Ported from the header in `docs/*.html`, which was repeated verbatim in all five
 * pages and kept in sync by hand. Here it is one component in the marketing layout,
 * so a nav change is one edit.
 *
 * Two behaviours the original had, preserved: only one menu is open at a time
 * (opening the dropdown closes the language picker, and vice versa), and the bar
 * changes appearance on scroll — `scrolled` as soon as the page moves, `past-hero`
 * once the hero is behind it.
 */

export function SiteHeader() {
  const { t } = useT()
  // Resolves in the browser only; on a public page it is usually null. See the
  // account control at the bottom of this file for what that means for the render.
  const { session } = useSession()
  // One dropdown left, so this is a boolean rather than the "which menu" union it
  // used to be. The Resources menu still closes on an outside click and on Escape.
  const [openMenu, setOpenMenu] = useState(false)
  const nav = useRef<HTMLElement>(null)

  // `scrolled` / `past-hero` are what the stylesheet keys the bar's background and
  // wordmark colour off. Read from `scrollY` on a passive listener, and once on
  // mount — a visitor arriving on a deep link (`/#how`) or
  // restoring a scroll position starts mid-page, and a bar that only reacted to the
  // first scroll EVENT would paint transparent over content until they moved.
  const [scroll, setScroll] = useState({ scrolled: false, pastHero: false })
  useEffect(() => {
    const read = () => {
      setScroll({ scrolled: window.scrollY > 0, pastHero: window.scrollY > 600 })
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])

  useEffect(() => {
    if (!openMenu) return
    const close = (event: MouseEvent) => {
      if (nav.current?.contains(event.target as Node)) return
      setOpenMenu(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(false)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', escape)
    }
  }, [openMenu])

  const toggle = () => setOpenMenu((was) => !was)

  // First in the entrance sequence, which is why the bar's `visible` class comes from
  // the same hook the hero uses rather than from a timer of its own.
  const revealed = useRevealed()

  const headerClass = [
    'site-header',
    'header-fade',
    revealed ? 'visible' : '',
    scroll.scrolled ? 'scrolled' : '',
    scroll.pastHero ? 'past-hero' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={headerClass}>
      <div className="header-inner">
        <Link href="/" className="header-logo-link" aria-label="magic-slash">
          {/* The bar is light in every state — softblue, then translucent white on
              scroll — so it always wants the dark-ink variant. `alt` is empty because
              the link above it is already labelled. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="header-logo" src="/img/logo-readme-light.svg" alt="" />
        </Link>

        <nav className="header-nav" ref={nav}>
          {/* One link left where there were two. `/desktop` and `/skills` are gone —
              the home page absorbed what they argued — so this points at the section
              that explains the product rather than at a page. An anchor rather than a
              route, which also means it works from the home page without a navigation.
              Removing "Skills" from the primary nav is the most visible half of the
              repositioning: it was the first word a cold visitor read. */}
          <Link href="/#how" className="header-nav-item">
            {t('site.nav.howItWorks')}
          </Link>

          <div className={`header-nav-item${openMenu ? ' open' : ''}`}>
            <button
              type="button"
              className="header-nav-trigger"
              onClick={toggle}
              aria-expanded={openMenu}
            >
              <span>{t('site.nav.resources')}</span> <ChevronDown size={16} />
            </button>
            {/* The documentation and changelog columns lived here and are gone: the
                reference is being reworked, and until it is, it is reachable from the
                desktop app only — not advertised on the site. `dropdown-narrow` is the
                stylesheet's own affordance for a menu this size; the three-column
                width would leave two thirds of it empty. */}
            <div className="header-dropdown dropdown-columns dropdown-narrow">
              <div className="dropdown-column">
                <span className="dropdown-category-title">
                  <Users size={16} /> {t('site.nav.communityCategory')}
                </span>
                <DropdownLink href="/story">{t('site.nav.ourStory')}</DropdownLink>
                <DropdownLink href={GITHUB_REPO_URL} external>
                  GitHub
                </DropdownLink>
              </div>
            </div>
          </div>
        </nav>

        <div className="header-right">
          <a
            href={RELEASE_TAG_URL}
            className="header-version-badge"
            target="_blank"
            rel="noreferrer"
          >
            v{LATEST_DESKTOP_VERSION}
          </a>
          <LanguageMenu variant="header" />
          {/* Signed out, this is the way in; signed in, it is the way back to your
              account, and showing WHICH account matters when someone keeps a work and
              a personal login. Until the session resolves it renders the signed-out
              label — that is the correct answer for almost every visitor to a public
              page, and it is also what the server renders, so hydration matches. */}
          {/* Plain anchors, both of them: these two leave for the app host, and there
              is no client-side navigation across origins — see `lib/routes.ts`. */}
          {session ? (
            <a
              href={HOME_PATH}
              className="header-cta-btn header-account-btn"
              title={session.user.email ?? undefined}
              aria-label={t('site.nav.account')}
            >
              <span className="header-account-email">{session.user.email}</span>
            </a>
          ) : (
            <a href={LOGIN_PATH} className="header-cta-btn">
              {t('site.nav.signIn')}
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * One entry in a dropdown column. The nested spans are not decoration — the
 * stylesheet lays the row out through `.dropdown-item-text`, so flattening them
 * collapses the padding.
 */
function DropdownLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  const inner = (
    <span className="dropdown-item-text">
      <span className="dropdown-item-title">{children}</span>
    </span>
  )

  if (external) {
    return (
      <a href={href} className="dropdown-item secondary" target="_blank" rel="noreferrer">
        {inner}
      </a>
    )
  }

  return (
    <Link href={href} className="dropdown-item secondary">
      {inner}
    </Link>
  )
}
