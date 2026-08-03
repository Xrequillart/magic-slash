'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Four questions, and a link to the rest of them.
 *
 * Mechanically converted from `docs/index.html`; the classes and structure are
 * the original's, so `marketing.css` styles it unchanged.
 */
export function FaqSection() {
  const { t } = useT()

  return (
    <section className="faq-section">
        <div className="faq-inner">
            <h2 className="faq-title">{t('site.faq.title')}</h2>
            <div className="faq-grid">
                <div className="faq-item">
                    <h3 className="faq-question">{t('site.faq.q1')}</h3>
                    <p className="faq-answer">{t('site.faq.a1')}</p>
                </div>
                <div className="faq-item">
                    <h3 className="faq-question">{t('site.faq.q2')}</h3>
                    <p className="faq-answer">{t('site.faq.a2')}</p>
                </div>
                <div className="faq-item">
                    <h3 className="faq-question">{t('site.faq.q3')}</h3>
                    <p className="faq-answer">{t('site.faq.a3')}</p>
                </div>
                <div className="faq-item">
                    <h3 className="faq-question">{t('site.faq.q4')}</h3>
                    <p className="faq-answer">{t('site.faq.a4')}</p>
                </div>
            </div>
            <Link href="/documentation#troubleshooting" className="faq-link">
            {t('site.faq.viewAll')} <ArrowRight size={14} />
        </Link>
        </div>
    </section>
  )
}
