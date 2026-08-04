'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { ParallelSidebar } from './ParallelSidebar'

/**
 * Section ④: several jobs at once.
 *
 * Reuses the old `DesktopAppSection` classes so `marketing.css` styles it unchanged.
 * Two things left with the rewrite: the miniature app mockup, which was a terminal
 * printing `claude-opus-4` (see `Hero` for why that image is gone from the page), and
 * the four-feature grid, whose copy belonged to the `/desktop` page that no longer
 * exists. The visual slot now holds `ParallelSidebar` — the agent list and nothing else,
 * since the list IS the claim this section makes.
 *
 * With `/desktop` gone this is the ONLY place on the site that sells the app, which is
 * the thing people actually download. Worth watching whether it needs to grow once the
 * page can be read end to end.
 */
export function ParallelSection() {
  const { t } = useT()

  return (
    <section className="desktopapp-section">
      <div className="desktopapp-inner">
        <div className="desktopapp-content">
          <h2 className="desktopapp-title">{t('site.parallel.title')}</h2>
          <p className="desktopapp-desc">{t('site.parallel.subtitle')}</p>
          <p className="desktopapp-desc">{t('site.parallel.p1')}</p>
          <p className="desktopapp-desc">{t('site.parallel.p2')}</p>
          <Link href="/documentation#desktop" className="desktopapp-btn">
            {t('site.parallel.cta')} <ArrowRight size={14} />
          </Link>
        </div>

        <ParallelSidebar />
      </div>
    </section>
  )
}
