'use client'

import Link from 'next/link'
import { Activity, ArrowRight, Check, ChevronDown, Clock, Columns2, Command, GitPullRequest, PanelLeft, Plus, Settings, Zap } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The desktop app pitch, with its own miniature mockup.
 *
 * Mechanically converted from `docs/index.html`; the classes and structure are
 * the original's, so `marketing.css` styles it unchanged.
 */
export function DesktopAppSection() {
  const { t } = useT()

  return (
    <section className="desktopapp-section">
        <div className="desktopapp-inner">
            <div className="desktopapp-content">
                <h2 className="desktopapp-title">{t('site.desktopApp.title')}</h2>
                <p className="desktopapp-desc">{t('site.desktopApp.p1')}</p>
                <p className="desktopapp-desc">{t('site.desktopApp.p2')}</p>
                <Link href="/desktop" className="desktopapp-btn">
            {t('site.desktopApp.cta')} <ArrowRight size={14} />
        </Link>
            </div>
            {/* Mini desktop mockup */}
            <div className="desktopapp-mockup">
                {/* Title bar */}
                <div className="dam-titlebar">
                    <div className="dam-dots"><span></span><span></span><span></span></div>
                    <span className="dam-titlebar-icon"><PanelLeft size={16} /></span>
                    <div className="dam-titlebar-center"></div>
                    <span className="dam-titlebar-icon"><PanelLeft size={16} style={{ transform: 'rotate(180deg)' }} /></span>
                </div>
                <div className="dam-body">
                    {/* Sidebar */}
                    <div className="dam-sidebar">
                        <div className="dam-menu">
                            <div className="dam-menu-item"><Plus size={16} /><span>New agent</span></div>
                            <div className="dam-menu-item"><Zap size={16} /><span>Skills</span></div>
                            <div className="dam-menu-item"><Settings size={16} /><span>Settings</span></div>
                        </div>
                        <div className="dam-agents-label">Agents</div>
                        <div className="dam-agent-list">
                            <div className="dam-project"><span className="dam-dot" style={{ background: '#6366f1' }}></span>stellar-api<ChevronDown size={16} /></div>
                            <div className="dam-agent active"><span className="dam-dot" style={{ background: '#3b82f6' }}></span><span className="dam-agent-name">auth-middleware</span><span className="dam-agent-status" style={{ color: '#22c55e' }}><Check size={16} /></span></div>
                            <div className="dam-agent"><span className="dam-dot" style={{ background: '#22c55e' }}></span><span className="dam-agent-name">api-refactor</span><span className="dam-agent-status" style={{ color: '#22c55e' }}><Check size={16} /></span></div>
                            <div className="dam-agent"><span className="dam-dot" style={{ background: '#22c55e' }}></span><span className="dam-agent-name">fix-tests</span><span className="dam-agent-status" style={{ color: '#22c55e' }}><Check size={16} /></span></div>
                            <div className="dam-project"><span className="dam-dot" style={{ background: '#a855f7' }}></span>acme-app<ChevronDown size={16} /></div>
                            <div className="dam-agent"><span className="dam-dot" style={{ background: '#eab308' }}></span><span className="dam-agent-name">db-migration</span><span className="dam-agent-status" style={{ color: '#eab308' }}><Clock size={16} /></span></div>
                            <div className="dam-agent"><span className="dam-dot" style={{ background: '#3f3f46' }}></span><span className="dam-agent-name">seed-data</span></div>
                        </div>
                    </div>
                    {/* Terminal */}
                    <div className="dam-terminal">
                        <div className="dam-terminal-header">
                            <img className="dam-terminal-logo" src="/img/claudecode-color.png" alt="" />
                            <span className="dam-terminal-name">Claude Code</span>
                        </div>
                        <div className="dam-terminal-meta">claude-opus-4 &middot; /auth-middleware</div>
                        <div className="dam-terminal-lines">
                            <div className="dam-line"><span className="dam-prompt">&#10095;</span><span className="dam-cmd">/magic:start PROJ-142</span></div>
                            <div className="dam-line dam-status"><span className="dam-check"><Check size={16} /></span>Fetching Jira ticket PROJ-142...</div>
                            <div className="dam-line dam-status"><span className="dam-check"><Check size={16} /></span>Creating branch feature/PROJ-142</div>
                            <div className="dam-line dam-status"><span className="dam-check"><Check size={16} /></span>Reading codebase...</div>
                            <div className="dam-line"><span className="dam-prompt">&#10095;</span><span className="dam-cmd">/magic:commit</span></div>
                            <div className="dam-line dam-status"><span className="dam-check"><Check size={16} /></span>fix(auth): validate JWT expiry on refresh</div>
                        </div>
                    </div>
                    {/* Context panel */}
                    <div className="dam-context">
                        <div className="dam-ctx-ticket">
                            <div className="dam-ctx-ticket-row"><span className="dam-ctx-id">PROJ-142</span><span className="dam-ctx-status">in progress</span></div>
                            <div className="dam-ctx-title">Fix auth middleware token validation</div>
                        </div>
                        <div className="dam-ctx-branch">
                            <span className="dam-ctx-base">develop</span>
                            <span className="dam-ctx-arrow">&rarr;</span>
                            <span className="dam-ctx-current">feature/PROJ-142</span>
                        </div>
                        <div className="dam-ctx-changes">
                            <div className="dam-ctx-changes-header"><span>Uncommitted</span><span className="dam-ctx-changes-meta">3 files</span></div>
                            <div className="dam-ctx-stats"><span className="dam-ctx-add">+47</span><span className="dam-ctx-del">&minus;12</span></div>
                            <div className="dam-ctx-gauge"><span className="g-add"></span><span className="g-add"></span><span className="g-add"></span><span className="g-add"></span><span className="g-del"></span><span></span></div>
                        </div>
                        <div className="dam-ctx-pr">
                            <div className="dam-ctx-pr-row"><span className="dam-ctx-pr-icon"><GitPullRequest size={16} /></span><span className="dam-ctx-pr-label">#48</span><span className="dam-ctx-pr-status">review</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="desktopapp-features">
            <div className="desktopapp-feature">
                <div className="desktopapp-feature-icon"><Columns2 size={16} /></div>
                <div className="desktopapp-feature-text">
                    <h3 className="desktopapp-feature-title">{t('site.desktopApp.feat1Title')}</h3>
                    <p className="desktopapp-feature-desc">{t('site.desktopApp.feat1Desc')}</p>
                </div>
            </div>
            <div className="desktopapp-feature">
                <div className="desktopapp-feature-icon"><Activity size={16} /></div>
                <div className="desktopapp-feature-text">
                    <h3 className="desktopapp-feature-title">{t('site.desktopApp.feat2Title')}</h3>
                    <p className="desktopapp-feature-desc">{t('site.desktopApp.feat2Desc')}</p>
                </div>
            </div>
            <div className="desktopapp-feature">
                <div className="desktopapp-feature-icon"><PanelLeft size={16} /></div>
                <div className="desktopapp-feature-text">
                    <h3 className="desktopapp-feature-title">{t('site.desktopApp.feat3Title')}</h3>
                    <p className="desktopapp-feature-desc">{t('site.desktopApp.feat3Desc')}</p>
                </div>
            </div>
            <div className="desktopapp-feature">
                <div className="desktopapp-feature-icon"><Command size={16} /></div>
                <div className="desktopapp-feature-text">
                    <h3 className="desktopapp-feature-title">{t('site.desktopApp.feat4Title')}</h3>
                    <p className="desktopapp-feature-desc">{t('site.desktopApp.feat4Desc')}</p>
                </div>
            </div>
        </div>
    </section>
  )
}
