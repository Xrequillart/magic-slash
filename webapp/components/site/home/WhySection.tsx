'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Section ⑦: why we built this — the teaser for `/story`.
 *
 * Was a three-point grid ("Jira meets Claude Code", "zero context loss", "one command
 * instead of ten"): three arguments, each naming a tool or a command. It is two short
 * paragraphs now, because this is the human beat before the closing ask, and because
 * the reasons it listed are exactly the mechanism the page stopped selling.
 *
 * It keeps the `.why-*` classes and its "read our story" link, which is the one part of
 * the old section that already did this job.
 */
export function WhySection() {
  const { t } = useT()

  return (
    <section className="why-section">
      <div className="why-inner why-inner--prose">
        <h2 className="why-title">{t('site.why.title')}</h2>
        <p className="why-prose">{t('site.why.p1')}</p>
        <p className="why-prose">{t('site.why.p2')}</p>
        <Link href="/story" className="why-btn">
          {t('site.why.cta')} <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}
