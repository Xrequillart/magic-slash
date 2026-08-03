'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The integrations row — Claude Code, GitHub, Jira, Git, VS Code.
 *
 * Mechanically converted from `docs/index.html`; the classes and structure are
 * the original's, so `marketing.css` styles it unchanged.
 */
export function StackSection() {
  const { t } = useT()

  return (
    <section className="stack-section">
        <div className="stack-inner">
            <img src="/img/mascot-stack.png" alt="magic-slash integrations" className="stack-mascot" />
            <div className="stack-content">
                <h2 className="stack-title">{t('site.section5.title')}</h2>
                <p className="stack-desc">{t('site.section5.p1')}</p>
                <p className="stack-desc">{t('site.section5.p2')}</p>
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
                <Link href="/documentation#configuration" className="stack-btn">
            {t('site.section5.seeDocs')} <ArrowRight size={14} />
        </Link>
            </div>
        </div>
    </section>
  )
}
