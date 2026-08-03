'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  CheckCircle,
  Clock,
  Command,
  Cpu,
  ExternalLink,
  Layers,
  LifeBuoy,
  Map,
  Monitor,
  Moon,
  RefreshCw,
  Settings,
  Shield,
  Sun,
  Terminal,
  Zap,
  GitPullRequest,
} from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'
import { LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'
import { GithubIcon } from '@/components/site/icons'
import { GITHUB_REPO_URL, RELEASE_TAG_URL } from '@/components/site/links'
import { useDocTheme } from './useDocTheme'

/**
 * The Documentation page's own navigation.
 *
 * This page does not use the site header — it has a full-height sidebar instead — so
 * everything the reader needs to leave, switch theme or jump between sections lives
 * here. Ported from `docs/documentation.html`.
 *
 * The language control the original had was a `<select>` with English as its only
 * option, because the page could not be translated. It is gone: the page is bilingual
 * now, and the site's own `LanguageMenu` is the one control that changes the language
 * everywhere. Adding a second, page-local one would let the two disagree.
 */

/** Sidebar groups, in order. Each entry is the section it scrolls to. */
const GROUPS: { heading: MessageKey; links: { id: string; label: MessageKey; Icon: typeof Zap }[] }[] =
  [
    {
      heading: 'site.doc.nav.gettingStarted',
      links: [
        { id: 'quick-start', label: 'site.doc.nav.quickStart', Icon: Zap },
        { id: 'usage', label: 'site.doc.nav.usage', Icon: Terminal },
        { id: 'skills', label: 'site.doc.nav.skills', Icon: Command },
        { id: 'workflows', label: 'site.doc.nav.workflows', Icon: Map },
        { id: 'best-practices', label: 'site.doc.nav.bestPractices', Icon: Award },
      ],
    },
    {
      heading: 'site.doc.nav.reference',
      links: [
        { id: 'configuration', label: 'site.doc.nav.configuration', Icon: Settings },
        { id: 'integrations', label: 'site.doc.nav.integrations', Icon: GitPullRequest },
        { id: 'multi-repo', label: 'site.doc.nav.multiRepo', Icon: Layers },
        { id: 'desktop', label: 'site.doc.nav.desktop', Icon: Monitor },
        { id: 'hooks', label: 'site.doc.nav.hooks', Icon: Cpu },
        { id: 'security', label: 'site.doc.nav.security', Icon: Shield },
        { id: 'updates', label: 'site.doc.nav.updates', Icon: RefreshCw },
        { id: 'environments', label: 'site.doc.nav.environments', Icon: CheckCircle },
      ],
    },
    {
      heading: 'site.doc.nav.help',
      links: [
        { id: 'troubleshooting', label: 'site.doc.nav.troubleshooting', Icon: LifeBuoy },
        { id: 'changelog', label: 'site.doc.nav.changelog', Icon: Clock },
      ],
    },
  ]

export function DocSidebar() {
  const { t } = useT()
  const { theme, toggle } = useDocTheme()
  const nav = useRef<HTMLElement>(null)

  // Highlight whichever section the reader has scrolled to. Imperative and scoped to
  // the nav, like the other scroll-driven bits of this site: it fires on every frame
  // and only moves one class.
  useEffect(() => {
    const root = nav.current
    if (!root) return

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
    const sections = document.querySelectorAll<HTMLElement>('.doc-section[id], .doc-card-grid[id]')

    const onScroll = () => {
      let current = ''
      sections.forEach((section) => {
        if (window.scrollY >= section.offsetTop - 100) current = section.id
      })
      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <aside className="doc-sidebar">
      <div className="doc-sidebar-logo">
        <Link href="/">
          <svg className="doc-sidebar-logo-svg" viewBox="0 0 583 105">
            <use href="#magic-slash-logo" />
          </svg>
        </Link>
        <span className="doc-sidebar-logo-label">{t('site.doc.nav.docs')}</span>
      </div>

      <nav className="doc-sidebar-nav" ref={nav}>
        <a
          href={RELEASE_TAG_URL}
          className="doc-sidebar-link"
          style={{ justifyContent: 'space-between' }}
          target="_blank"
          rel="noreferrer"
        >
          <span>v{LATEST_DESKTOP_VERSION}</span>
          <ExternalLink style={{ width: 14, height: 14 }} />
        </a>

        <Link href="/" className="doc-sidebar-link doc-sidebar-back">
          <ArrowLeft size={16} /> {t('site.doc.nav.backHome')}
        </Link>

        {GROUPS.map((group) => (
          <div key={group.heading}>
            <span className="doc-sidebar-section">{t(group.heading)}</span>
            {group.links.map(({ id, label, Icon }) => (
              <a key={id} href={`#${id}`} className="doc-sidebar-link">
                <Icon size={16} /> {t(label)}
              </a>
            ))}
          </div>
        ))}

        <span className="doc-sidebar-section">{t('site.doc.nav.links')}</span>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="doc-sidebar-link">
          <GithubIcon size={16} /> GitHub <ExternalLink className="doc-external-icon" size={14} />
        </a>
      </nav>

      <div className="doc-sidebar-footer">
        <button
          className="theme-toggle"
          onClick={toggle}
          aria-label={t('site.doc.nav.themeToggle')}
          // The stylesheet shows one icon per theme, but it keys off `data-theme` on
          // <html> — which is only correct once the theme has resolved in the browser.
          type="button"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  )
}
