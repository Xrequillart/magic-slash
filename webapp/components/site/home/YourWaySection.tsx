'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { RepoSettings } from './RepoSettings'

/**
 * Section ⑤: it works your way.
 *
 * New section, and the one that carries the quality claim. The old copy sold this as
 * "one config, every repo" with commit formats and Jira sync in the headline; here the
 * per-project settings are the supporting detail and the point is the last line —
 * work arrives finished, nothing to clean up behind it.
 *
 * That line is doing real work: it is the whole "the git history it leaves is clean and
 * the process is respected" argument, translated out of engineering vocabulary. Saying
 * it that way would have put the page back in the weeds, so it says the outcome and
 * lets the documentation carry the mechanism.
 *
 * Its own light background rather than the black of ③ or the blue of ④, so three
 * consecutive two-column sections do not read as one long block.
 *
 * The illustration sits on the LEFT here, alternating against ④, which put its visual on
 * the right. The heading still comes FIRST in the DOM — CSS does the swap, so the column
 * stacking on a narrow screen leads with the words rather than with the picture.
 */
export function YourWaySection() {
  const { t } = useT()

  return (
    <section className="yourway-section">
      <div className="yourway-inner">
        <div className="yourway-content">
          <h2 className="yourway-title">{t('site.yourWay.title')}</h2>
          <p className="yourway-desc">{t('site.yourWay.subtitle')}</p>
          <p className="yourway-desc">{t('site.yourWay.p1')}</p>
          <p className="yourway-desc yourway-desc--lead">{t('site.yourWay.p2')}</p>
          <Link href="/documentation#configuration" className="yourway-btn">
            {t('site.yourWay.seeDocs')} <ArrowRight size={14} />
          </Link>
        </div>

        <RepoSettings />
      </div>
    </section>
  )
}
