'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import { LanguageMenu } from './LanguageMenu'
import { GithubIcon } from './icons'
import { GITHUB_REPO_URL } from './links'

/**
 * The public site's footer — brand, three link columns, copyright, language picker.
 *
 * Identical across every marketing page, as it already was in `docs/` (four copies of
 * the same markup, kept in sync by hand).
 */
export function SiteFooter({ serverYear }: { serverYear: number }) {
  const { t } = useT()

  // The copyright year, without a hydration mismatch and without going stale.
  //
  // `docs/` used `document.write(new Date().getFullYear())`, which has no
  // server-rendered equivalent: computing the date during SSR bakes the year into a
  // statically generated page, and computing it during render makes the server's HTML
  // and the client's first paint disagree across a New Year boundary. So the server's
  // year is the initial state — hydration matches by construction — and the browser
  // corrects it after mount on the one day a year it could be wrong.
  const [year, setYear] = useState(serverYear)
  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="footer-logo" src="/img/logo-readme-dark.svg" alt="Magic slash" />
            <p className="footer-tagline">{t('site.footer.tagline')}</p>
            <div className="footer-social">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
                <GithubIcon size={20} />
              </a>
            </div>
          </div>

          <div className="footer-columns">
            {/* Every documentation link is gone from here, and the Updates column
                with them — its only entry was the changelog. The reference is being
                reworked and reaches its readers through the desktop app in the
                meantime. The two columns that remain are kept as columns, rather than
                collapsed into a list, so putting those links back is an addition
                rather than another layout change. */}
            <div className="footer-column">
              <h4 className="footer-column-title">{t('site.footer.product')}</h4>
              <Link href="/#how">{t('site.footer.howItWorks')}</Link>
              <Link href="/story">{t('site.footer.ourStory')}</Link>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">{t('site.footer.resources')}</h4>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-legal">
            <span className="footer-copyright">© {year} magic-slash</span>
          </div>
          <div className="footer-lang">
            <LanguageMenu variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  )
}
