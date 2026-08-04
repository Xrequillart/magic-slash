'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import { LOGIN_PATH } from '@/lib/routes'
import { Fade } from '../Fade'
import { GithubIcon } from '../icons'
import { GITHUB_REPO_URL } from '../links'

/**
 * The landing page's first screen: headline, the two calls to action, and the visual.
 *
 * The `order` props are the entrance sequence, which spans the header too — the bar is
 * 0, and these continue from 1 in the order they are read. See `Fade` for why the
 * stagger is a transition delay here rather than the chain of `setTimeout`s the
 * original used.
 *
 * The visual is a PLACEHOLDER awaiting the Figma illustration. What stood here before
 * was `DesktopMockup`, a fake terminal window printing `claude-opus-4` and a file path;
 * under a headline that promises "describe what's next, it gets built" it advertised a
 * command line before the sentence had been read, so it went rather than shipping as a
 * contradiction. It is in git history if the replacement ends up wanting the same shape.
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

          {/* Primary sends people into the app. The second one keeps them on the page —
              it scrolls to the section that explains the thing, which is a better next
              step for a cold visitor than dropping them into the docs. */}
          <Fade order={3} className="hero-cta">
            <Link href={LOGIN_PATH} className="btn-get-started">
              {t('site.hero.cta')}
            </Link>
            <a href="#how" className="btn-secondary">
              {t('site.hero.howCta')}
            </a>
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
        <div className="hero-visual-placeholder" aria-hidden="true">
          <span>Hero illustration</span>
        </div>
      </Fade>
    </div>
  )
}
