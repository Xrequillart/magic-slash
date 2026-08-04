'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Section ③: it works on the product you already have.
 *
 * Same markup and classes as the old `StackSection`, so `marketing.css` styles it
 * unchanged — what changed is the job. The integration logos used to BE the pitch
 * ("plugs into your stack"); here they are reassurance under a claim about your
 * existing codebase. That is the difference between listing features and answering
 * "will this work on my thing".
 */
export function YourProductSection() {
  const { t } = useT()

  return (
    <section className="stack-section">
      <div className="stack-inner">
        <img
          src="/img/mascot-stack.png"
          alt=""
          className="stack-mascot"
        />
        <div className="stack-content">
          <h2 className="stack-title">{t('site.yourProduct.title')}</h2>
          <p className="stack-desc">{t('site.yourProduct.subtitle')}</p>
          <p className="stack-desc">{t('site.yourProduct.p1')}</p>
          <p className="stack-desc">{t('site.yourProduct.p2')}</p>
          <div className="stack-logos">
            <div className="stack-logo-item">
              <img src="/img/claude-logo.png" alt="Claude Code" className="stack-logo-img" />
              <span className="stack-logo-label">Claude Code</span>
            </div>
            <div className="stack-logo-item">
              <img src="/img/github-logo.png" alt="GitHub" className="stack-logo-img" />
              <span className="stack-logo-label">GitHub</span>
            </div>
            <div className="stack-logo-item">
              <img src="/img/jira-logo.png" alt="Jira" className="stack-logo-img" />
              <span className="stack-logo-label">Jira</span>
            </div>
            <div className="stack-logo-item">
              <img src="/img/git-logo.png" alt="Git" className="stack-logo-img" />
              <span className="stack-logo-label">Git</span>
            </div>
            <div className="stack-logo-item">
              <img src="/img/vscode-logo.png" alt="VS Code" className="stack-logo-img" />
              <span className="stack-logo-label">VS Code</span>
            </div>
          </div>
          <Link href="/documentation#integrations" className="stack-btn">
            {t('site.yourProduct.seeDocs')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
