'use client'

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
                {/* A plain anchor: this leaves for the app host — see `lib/routes.ts`. */}
                <a href={LOGIN_PATH} className="btn-get-started cta-btn">
                    {t('site.cta.button')}
                </a>
            </div>
        </div>
    </section>
  )
}
