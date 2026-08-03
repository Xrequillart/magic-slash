'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The three reasons the product exists, from the landing page.
 *
 * Mechanically converted from `docs/index.html`; the classes and structure are
 * the original's, so `marketing.css` styles it unchanged.
 */
export function WhySection() {
  const { t } = useT()

  return (
    <section className="why-section">
        <div className="why-inner">
            <h2 className="why-title">{t('site.why.title')}</h2>
            <div className="why-grid">
                <div className="why-item">
                    <span className="why-number">01</span>
                    <h3 className="why-item-title">{t('site.why.point1Title')}</h3>
                    <p className="why-item-desc">{t('site.why.point1Desc')}</p>
                </div>
                <div className="why-item">
                    <span className="why-number">02</span>
                    <h3 className="why-item-title">{t('site.why.point2Title')}</h3>
                    <p className="why-item-desc">{t('site.why.point2Desc')}</p>
                </div>
                <div className="why-item">
                    <span className="why-number">03</span>
                    <h3 className="why-item-title">{t('site.why.point3Title')}</h3>
                    <p className="why-item-desc">{t('site.why.point3Desc')}</p>
                </div>
            </div>
            <Link href="/story" className="why-btn">
                {t('site.why.cta')} <ArrowRight size={14} />
            </Link>
        </div>
    </section>
  )
}
