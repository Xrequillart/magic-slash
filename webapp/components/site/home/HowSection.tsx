'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { RichText } from '../RichText'

/**
 * Section ②: the three moments, then the commands.
 *
 * This replaces `FlowSection`, a seven-step walkthrough driven by a sticky terminal that
 * swapped panes as you scrolled. Two reasons it went: it sold the mechanism (seven steps
 * from ticket to merge) where the page now sells the outcome, and its centrepiece was a
 * terminal — the one image the new pitch cannot afford above the fold.
 *
 * The commands stayed. They are what a user actually types, so leaving "it gets built"
 * unexplained would be worse than the jargon costs; they just moved below the three
 * moments and lost the headline. The reference now lives in the documentation, which is
 * where `seeDocs` points — there is no `/skills` page any more.
 *
 * `id="how"` is the hero's secondary CTA target.
 */

/**
 * The eight commands, in the order a job goes through them — `plan` first, because it
 * runs before there is a ticket to start.
 */
const COMMANDS = [
  { name: 'plan', k: 'site.how.planDesc' },
  { name: 'start', k: 'site.how.startDesc' },
  { name: 'continue', k: 'site.how.continueDesc' },
  { name: 'commit', k: 'site.how.commitDesc' },
  { name: 'pr', k: 'site.how.prDesc' },
  { name: 'review', k: 'site.how.reviewDesc' },
  { name: 'resolve', k: 'site.how.resolveDesc' },
  { name: 'done', k: 'site.how.doneDesc' },
] as const

const STEPS = [
  { n: '01', title: 'site.how.step1Title', desc: 'site.how.step1Desc' },
  { n: '02', title: 'site.how.step2Title', desc: 'site.how.step2Desc' },
  { n: '03', title: 'site.how.step3Title', desc: 'site.how.step3Desc' },
] as const

export function HowSection() {
  const { t } = useT()

  return (
    <section className="how-section" id="how">
      <div className="how-inner">
        <div className="how-header">
          <h2 className="how-title">{t('site.how.title')}</h2>
          <p className="how-subtitle">{t('site.how.subtitle')}</p>
        </div>

        <div className="how-steps">
          {STEPS.map((step) => (
            <div className="how-step" key={step.n}>
              <span className="how-step-num">{step.n}</span>
              <h3 className="how-step-title">{t(step.title)}</h3>
              <p className="how-step-desc">{t(step.desc)}</p>
            </div>
          ))}
        </div>

        <div className="how-commands">
          <h3 className="how-commands-title">{t('site.how.commandsTitle')}</h3>
          <RichText as="p" className="how-commands-intro" k="site.how.commandsIntro" />

          <ul className="how-command-list">
            {COMMANDS.map((command) => (
              <li className="how-command" key={command.name}>
                <RichText as="span" className="how-command-text" k={command.k} />
              </li>
            ))}
          </ul>

          <Link href="/documentation#skills" className="how-cta">
            {t('site.how.seeDocs')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
