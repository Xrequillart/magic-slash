'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { AgentPanel } from './AgentPanel'

/**
 * Section ⑥: you always know where a job stands.
 *
 * The page had a hole here. ④ sells running twelve jobs at once and ⑤ sells them coming
 * back the way your project does things, but nothing said what you SEE while they run —
 * and "where is this one, exactly" is the question a person actually has when twelve
 * things are in flight. The illustration answers it by being the panel itself.
 *
 * Same two-column shape and the same blue as ④, deliberately: those two sections make one
 * argument in two halves — many jobs, and each one legible — and the white of ⑤ between
 * them is what keeps the blue from reading as one long block. The visual sits on the
 * RIGHT, alternating against ⑤, and the heading is first in the DOM either way.
 *
 * The copy names the states out loud (in review, changes requested, CI) because that is
 * the vocabulary the reader already has for "where is it", and the panel beside it is
 * showing those exact words. It is the only place on the site that says the app watches
 * the pull request for you.
 *
 * Its button goes to the workflow reference rather than to the app page ④ already links —
 * two sections in the same blue with the same label under them read as one repeated CTA,
 * and the states the copy names are documented there.
 */
export function WhereItStandsSection() {
  const { t } = useT()

  return (
    <section className="status-section">
      <div className="status-inner">
        <div className="status-content">
          <h2 className="status-title">{t('site.whereItStands.title')}</h2>
          <p className="status-desc">{t('site.whereItStands.subtitle')}</p>
          <p className="status-desc">{t('site.whereItStands.p1')}</p>
          <p className="status-desc status-desc--lead">{t('site.whereItStands.p2')}</p>
          <Link href="/documentation#workflows" className="status-btn">
            {t('site.whereItStands.cta')} <ArrowRight size={14} />
          </Link>
        </div>

        <AgentPanel />
      </div>
    </section>
  )
}
