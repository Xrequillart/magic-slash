'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import { LOGIN_PATH } from '@/lib/routes'
import { Fade } from '../Fade'
import { GithubIcon } from '../icons'
import { GITHUB_REPO_URL } from '../links'
import { DesktopMockup } from './DesktopMockup'

/**
 * The landing page's first screen: headline, the two calls to action, and the mockup.
 *
 * The `order` props are the entrance sequence, which spans the header too — the bar is
 * 0, and these continue from 1 in the order they are read. See `Fade` for why the
 * stagger is a transition delay here rather than the chain of `setTimeout`s the
 * original used.
 */
export function Hero() {
  const { t } = useT()

  return (
    <div className="hero">
      <div className="hero-inner">
        <div className="hero-content">
          <Fade order={1} as="h1" k="site.hero.title" />

          <Fade order={2} as="p">
            {t('site.hero.subtitle')}
          </Fade>

          {/* Primary sends people into the app; the docs are the quiet second option.
              This used to be the primary button plus an install box with a curl
              command to copy. */}
          <Fade order={3} className="hero-cta">
            <Link href={LOGIN_PATH} className="btn-get-started">
              {t('site.hero.cta')}
            </Link>
            <Link href="/documentation#quick-start" className="btn-secondary">
              {t('site.hero.docsCta')}
            </Link>
          </Fade>

          <Fade order={4} className="hero-meta">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hero-meta-link"
            >
              <GithubIcon size={16} />
              <span>GitHub</span>
            </a>
            <span className="hero-meta-sep" />
            <span className="hero-meta-label">Free &amp; open-source</span>
          </Fade>
        </div>
      </div>

      <Fade order={5} className="desktop-mockup-section">
        <DesktopMockup />
      </Fade>
    </div>
  )
}
