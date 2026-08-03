'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import { LOGIN_PATH } from '@/lib/routes'

/**
 * The closing call to action.
 *
 * Mechanically converted from `docs/index.html`; the classes and structure are
 * the original's, so `marketing.css` styles it unchanged.
 */
export function CtaSection() {
  const { t } = useT()

  return (
    <section className="cta-section">
        <div className="cta-inner">
            <img src="/img/mascot-peace.png" alt="magic-slash mascot" className="cta-mascot" />
            <div className="cta-content">
                <h2 className="cta-title">{t('site.cta.title')}</h2>
                <p className="cta-subtitle">{t('site.cta.subtitle')}</p>
                <Link href={LOGIN_PATH} className="btn-get-started cta-btn">
                    {t('site.cta.button')}
                </Link>
            </div>
        </div>
    </section>
  )
}
