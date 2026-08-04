'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'

/**
 * Five questions, and a link to the rest of them.
 *
 * The first one — "do I need to be a developer?" — is new, and it is the reason this
 * section matters more than it used to. The page above it is written to read wide: no
 * slash commands in the headline, no ticket-to-merge framing, outcomes rather than
 * mechanism. That widening is only honest if somewhere on the page says plainly that
 * you still need a codebase and some comfort with Git. This is that somewhere, and it
 * goes first because someone who cannot use the product should find out here rather
 * than three steps into an install.
 */

/** Question/answer key pairs, in display order. */
const QUESTIONS: { q: MessageKey; a: MessageKey }[] = [
  { q: 'site.faq.q1', a: 'site.faq.a1' },
  { q: 'site.faq.q2', a: 'site.faq.a2' },
  { q: 'site.faq.q3', a: 'site.faq.a3' },
  { q: 'site.faq.q4', a: 'site.faq.a4' },
  { q: 'site.faq.q5', a: 'site.faq.a5' },
]

export function FaqSection() {
  const { t } = useT()

  return (
    <section className="faq-section">
      <div className="faq-inner">
        <h2 className="faq-title">{t('site.faq.title')}</h2>
        <div className="faq-grid">
          {QUESTIONS.map(({ q, a }) => (
            <div className="faq-item" key={q}>
              <h3 className="faq-question">{t(q)}</h3>
              <p className="faq-answer">{t(a)}</p>
            </div>
          ))}
        </div>
        <Link href="/documentation#troubleshooting" className="faq-link">
          {t('site.faq.viewAll')} <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}
