'use client'

import Link from 'next/link'
import { Activity, AlertTriangle, Check, CheckCircle, ChevronRight, Clock, Download, Eye, FileText, Folder, GitBranch, GitCommit, GitPullRequest, Globe, Info, Play, Plus, Zap } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { RichText } from '@/components/site/RichText'
import { LOGIN_PATH } from '@/lib/routes'
import { DesktopMockup } from '@/components/site/home/DesktopMockup'
import { useDesktopPageEffects } from './useDesktopPageEffects'

/**
 * The Desktop App page: eleven feature sections, each with its own mockup.
 *
 * Mechanically converted from the static page in `docs/`; the classes and structure
 * are the original's, so the ported stylesheet applies unchanged.
 */
export function DesktopContent() {
  const { t } = useT()
  // Section reveals, and the Quick Launch typing loop.
  useDesktopPageEffects()

  return (
    <>

    {/* ── Hero ── */}
    <div className="dsk-hero">
        <div className="dsk-hero-label">{t('site.desktop.heroLabel')}</div>
        <RichText k="site.desktop.heroTitle" as="h1" />
        <p className="dsk-hero-intro">{t('site.desktop.heroIntro')}</p>
        <div className="hero-cta" style={{ justifyContent: 'flex-start' }}>
            <Link href={LOGIN_PATH} className="btn-get-started">{t('site.hero.cta')}</Link>
            <Link href="/documentation#quick-start" className="btn-secondary">
                {t('site.hero.docsCta')}
            </Link>
        </div>
    </div>
    {/* ── Desktop App Mockup ── */}
    <div className="desktop-mockup-section">
    <div className="desktop-mockup-section">
        <DesktopMockup />
    </div>
    </div>

    {/* ── 2. Live agent tracking — black, content left + visual right ── */}
    <section className="dsk-section dsk-tracking">
        <div className="dsk-section-inner">
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat2Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat2Desc')}</p>
            </div>
            <div className="dsk-section-visual">
                <div className="dsk-sidebar-mockup">
                    <div className="dsk-sidebar-titlebar">
                        <div className="dsk-split-dots"><span></span><span></span><span></span></div>
                    </div>
                    <div className="dsk-sidebar-actions">
                        <div className="dsk-sidebar-action">
                            <Plus size={16} />
                            <span>New agent</span>
                            <span className="s-shortcut">&#8984;N</span>
                        </div>
                        <div className="dsk-sidebar-action">
                            <Zap size={16} />
                            <span>Skills</span>
                            <span className="s-shortcut">&#8984;;</span>
                        </div>
                    </div>
                    <div className="dsk-sidebar-body">
                        <div className="dsk-sidebar-group">
                            <div className="dsk-sidebar-group-header">
                                <Play size={16} />
                                <span>In progress</span>
                                <span className="dsk-sidebar-group-count">2</span>
                            </div>
                            <div className="dsk-sidebar-agents">
                                <div className="dsk-sidebar-agent s-active">
                                    <span className="dsk-sidebar-agent-name">PROJ-142 &middot; auth-middleware</span>
                                    <span className="dsk-sidebar-dot" style={{ background: '#6366f1' }}></span>
                                    <span className="dsk-sidebar-status"><span className="dsk-sidebar-spinner"></span></span>
                                </div>
                                <div className="dsk-sidebar-agent">
                                    <span className="dsk-sidebar-agent-name">PROJ-287 &middot; user-service</span>
                                    <span className="dsk-sidebar-dot" style={{ background: '#22c55e' }}></span>
                                    <span className="dsk-sidebar-status"><span className="dsk-sidebar-spinner"></span></span>
                                </div>
                            </div>
                        </div>
                        <div className="dsk-sidebar-group">
                            <div className="dsk-sidebar-group-header">
                                <AlertTriangle size={16} />
                                <span>Needs attention</span>
                                <span className="dsk-sidebar-group-count">1</span>
                            </div>
                            <div className="dsk-sidebar-agents">
                                <div className="dsk-sidebar-agent">
                                    <span className="dsk-sidebar-agent-name">PROJ-456 &middot; api-refactor</span>
                                    <span className="dsk-sidebar-dot" style={{ background: '#f59e0b' }}></span>
                                    <span className="dsk-sidebar-status s-waiting"><Clock size={16} /></span>
                                </div>
                            </div>
                        </div>
                        <div className="dsk-sidebar-group">
                            <div className="dsk-sidebar-group-header">
                                <Eye size={16} />
                                <span>In review</span>
                                <span className="dsk-sidebar-group-count">1</span>
                            </div>
                            <div className="dsk-sidebar-agents">
                                <div className="dsk-sidebar-agent">
                                    <span className="dsk-sidebar-agent-name">PROJ-321 &middot; fix-login</span>
                                    <span className="dsk-sidebar-dot" style={{ background: '#6366f1' }}></span>
                                    <span className="dsk-sidebar-status s-completed"><Check size={16} /></span>
                                </div>
                            </div>
                        </div>
                        <div className="dsk-sidebar-group">
                            <div className="dsk-sidebar-group-header">
                                <CheckCircle size={16} />
                                <span>Done</span>
                                <span className="dsk-sidebar-group-count">2</span>
                            </div>
                            <div className="dsk-sidebar-agents">
                                <div className="dsk-sidebar-agent">
                                    <span className="dsk-sidebar-agent-name">PROJ-189 &middot; db-migration</span>
                                    <span className="dsk-sidebar-status s-completed"><Check size={16} /></span>
                                </div>
                                <div className="dsk-sidebar-agent">
                                    <span className="dsk-sidebar-agent-name">PROJ-095 &middot; cache-layer</span>
                                    <span className="dsk-sidebar-status s-completed"><Check size={16} /></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ── 3. Context panel — light blue, content left + visual right ── */}
    <section className="dsk-section dsk-context">
        <div className="dsk-section-inner">
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat3Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat3Desc')}</p>
                <p className="dsk-section-desc">{t('site.desktopApp.feat3Desc2')}</p>
                <p className="dsk-section-desc">{t('site.desktopApp.feat3Desc3')}</p>
            </div>
            <div className="dsk-section-visual">
                <div className="dsk-ctx-mockup">
                    <div className="dsk-ctx-titlebar dsk-ctx-group">
                        <div className="dsk-split-dots"><span></span><span></span><span></span></div>
                    </div>
                    {/* Ticket header */}
                    <div className="dsk-ctx-ticket dsk-ctx-group">
                        <div className="dsk-ctx-ticket-row">
                            <span className="dsk-ctx-ticket-id">PROJ-142</span>
                            <span className="dsk-ctx-ticket-status">in progress</span>
                        </div>
                        <div className="dsk-ctx-ticket-title">Fix auth middleware token validation</div>
                        <div className="dsk-ctx-ticket-desc">Update the login flow to properly validate JWT tokens on refresh. The current implementation skips expiry checks when the token is&nbsp;renewed.</div>
                    </div>
                    {/* Repo + branch */}
                    <div className="dsk-ctx-repo dsk-ctx-group">
                        <div className="dsk-ctx-repo-name">
                            <Folder size={16} />
                            <span>auth-middleware</span>
                        </div>
                        <div className="dsk-ctx-branch">
                            <span className="dsk-ctx-branch-base">develop</span>
                            <span className="dsk-ctx-branch-arrow">&rarr;</span>
                            <span className="dsk-ctx-branch-current">feature/PROJ-142</span>
                        </div>
                    </div>
                    {/* Uncommitted changes */}
                    <div className="dsk-ctx-block dsk-ctx-group">
                        <div className="dsk-ctx-block-header">
                            <span className="dsk-ctx-block-label">Uncommitted changes</span>
                            <span className="dsk-ctx-block-meta">3 files</span>
                        </div>
                        <div className="dsk-ctx-stats">
                            <span className="dsk-ctx-stats-add">+47</span>
                            <span className="dsk-ctx-stats-del">&minus;12</span>
                        </div>
                        <div className="dsk-ctx-gauge">
                            <span className="s-add"></span>
                            <span className="s-add"></span>
                            <span className="s-add"></span>
                            <span className="s-add"></span>
                            <span className="s-del"></span>
                            <span></span>
                        </div>
                        <div className="dsk-ctx-files">
                            <div className="dsk-ctx-file">
                                <span className="dsk-ctx-file-name">src/auth.ts</span>
                                <span className="dsk-ctx-file-add">+32</span>
                                <span className="dsk-ctx-file-del">&minus;8</span>
                            </div>
                            <div className="dsk-ctx-file">
                                <span className="dsk-ctx-file-name">src/utils.ts</span>
                                <span className="dsk-ctx-file-add">+10</span>
                                <span className="dsk-ctx-file-del">&minus;4</span>
                            </div>
                            <div className="dsk-ctx-file">
                                <span className="dsk-ctx-file-name">test/auth.test.ts</span>
                                <span className="dsk-ctx-file-add">+5</span>
                                <span className="dsk-ctx-file-del">&minus;0</span>
                            </div>
                        </div>
                    </div>
                    {/* Commits */}
                    <div className="dsk-ctx-block dsk-ctx-group" style={{ borderTop: 'none', paddingTop: '0' }}>
                        <div className="dsk-ctx-block-header">
                            <span className="dsk-ctx-block-label">Commits</span>
                            <span className="dsk-ctx-block-meta">3 ahead of develop</span>
                        </div>
                        <div className="dsk-ctx-files">
                            <div className="dsk-ctx-commit">
                                <span className="dsk-ctx-commit-msg">fix: validate token expiry on refresh</span>
                                <span className="dsk-ctx-commit-hash">a1b2c3f</span>
                                <span className="dsk-ctx-commit-date">15min</span>
                            </div>
                            <div className="dsk-ctx-commit">
                                <span className="dsk-ctx-commit-msg">feat: add middleware chain</span>
                                <span className="dsk-ctx-commit-hash">d4e5f6a</span>
                                <span className="dsk-ctx-commit-date">2h</span>
                            </div>
                            <div className="dsk-ctx-commit">
                                <span className="dsk-ctx-commit-msg">chore: setup feature branch</span>
                                <span className="dsk-ctx-commit-hash">g7h8i9b</span>
                                <span className="dsk-ctx-commit-date">3h</span>
                            </div>
                        </div>
                    </div>
                    {/* PR link */}
                    <div className="dsk-ctx-pr dsk-ctx-group">
                        <GitPullRequest size={16} />
                        <span className="dsk-ctx-pr-label">PR #92</span>
                        <span className="dsk-ctx-pr-status">Open</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ── 7. Notifications — pink, visual left + content right ── */}
    <section className="dsk-section dsk-notifs">
        <div className="dsk-section-inner">
            <div className="dsk-notif-anim">
                <div className="dsk-notif-toast">
                    <div className="dsk-notif-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></div>
                    <div className="dsk-notif-body">
                        <span className="dsk-notif-app">magic-slash</span>
                        <span className="dsk-notif-title">PROJ-123 &middot; auth-middleware</span>
                        <span className="dsk-notif-msg">Agent is waiting for your input</span>
                    </div>
                    <span className="dsk-notif-time">now</span>
                </div>
                <div className="dsk-notif-toast">
                    <div className="dsk-notif-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                    <div className="dsk-notif-body">
                        <span className="dsk-notif-app">magic-slash</span>
                        <span className="dsk-notif-title">PROJ-456 &middot; api-refactor</span>
                        <span className="dsk-notif-msg">Task completed successfully</span>
                    </div>
                    <span className="dsk-notif-time">now</span>
                </div>
                <div className="dsk-notif-toast">
                    <div className="dsk-notif-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div>
                    <div className="dsk-notif-body">
                        <span className="dsk-notif-app">magic-slash</span>
                        <span className="dsk-notif-title">PROJ-789 &middot; db-migration</span>
                        <span className="dsk-notif-msg">Test suite failed &mdash; 2 errors</span>
                    </div>
                    <span className="dsk-notif-time">now</span>
                </div>
                <div className="dsk-notif-toast">
                    <div className="dsk-notif-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></div>
                    <div className="dsk-notif-body">
                        <span className="dsk-notif-app">magic-slash</span>
                        <span className="dsk-notif-title">PROJ-321 &middot; fix-login</span>
                        <span className="dsk-notif-msg">PR #92 merged</span>
                    </div>
                    <span className="dsk-notif-time">now</span>
                </div>
            </div>
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat9Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat9Desc')}</p>
            </div>
        </div>
    </section>
    {/* ── 1. Split view — light blue, visual left + content right ── */}
    <section className="dsk-section dsk-split">
        <div className="dsk-section-inner">
            <div className="dsk-section-visual">
                <div className="dsk-split-mockup">
                    <div className="dsk-split-titlebar">
                        <div className="dsk-split-dots"><span></span><span></span><span></span></div>
                    </div>
                    <div className="dsk-split-body">
                        <div className="dsk-split-pane">
                            <div className="dsk-split-pane-header">
                                <img className="dsk-split-logo" src="/img/claudecode-color.png" alt="Claude Code" />
                                <span className="dsk-split-name">Claude Code</span>
                            </div>
                            <div className="dsk-split-meta">claude-opus-4 &middot; /auth-middleware</div>
                            <div className="dsk-split-line">
                                <span className="s-prompt">&#10095;</span>
                                <span className="s-cmd">/magic:start PROJ-142</span>
                            </div>
                            <div className="dsk-split-line">
                                <span className="s-check"><Check size={16} /></span>
                                <span className="s-text">Fetching ticket...</span>
                            </div>
                            <div className="dsk-split-line">
                                <span className="s-check"><Check size={16} /></span>
                                <span className="s-text">Creating worktree...</span>
                                <span className="s-result">feature/PROJ-142</span>
                            </div>
                            <div className="dsk-split-line s-success">
                                <span className="s-check"><Check size={16} /></span>
                                <span className="s-text">Ready! Coding...</span>
                            </div>
                        </div>
                        <div className="dsk-split-divider"></div>
                        <div className="dsk-split-pane">
                            <div className="dsk-split-pane-header">
                                <img className="dsk-split-logo" src="/img/claudecode-color.png" alt="Claude Code" />
                                <span className="dsk-split-name">Claude Code</span>
                            </div>
                            <div className="dsk-split-meta">claude-opus-4 &middot; /api-refactor</div>
                            <div className="dsk-split-line">
                                <span className="s-prompt">&#10095;</span>
                                <span className="s-cmd">/magic:review 87</span>
                            </div>
                            <div className="dsk-split-line">
                                <span className="s-check"><Check size={16} /></span>
                                <span className="s-text">Fetching PR #87...</span>
                                <span className="s-result">3 files</span>
                            </div>
                            <div className="dsk-split-line">
                                <span className="s-check"><Check size={16} /></span>
                                <span className="s-text">Reviewing code...</span>
                                <span className="s-result">2 comments</span>
                            </div>
                            <div className="dsk-split-line s-success">
                                <span className="s-check"><Check size={16} /></span>
                                <span className="s-text">Approved with suggestions</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat1Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat1Desc')}</p>
            </div>
        </div>
    </section>
    {/* ── 4. Script runner — blue, visual left + content right ── */}
    <section className="dsk-section dsk-runner">
        <div className="dsk-section-inner">
            <div className="dsk-section-visual">
                <div className="dsk-runner-mockup">
                    <div className="dsk-runner-titlebar">
                        <div className="dsk-split-dots"><span></span><span></span><span></span></div>
                    </div>
                    <div className="dsk-runner-header">
                        <Play size={16} />
                        Scripts — stellar-api
                    </div>
                    <div className="dsk-runner-scripts">
                        <div className="dsk-runner-script">
                            <svg className="dsk-runner-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            <span className="dsk-runner-name">dev</span>
                            <span className="dsk-runner-cmd">npm run dev</span>
                        </div>
                        <div className="dsk-runner-script s-running">
                            <svg style={{ width: '14px', height: '14px', color: '#ef4444' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                            <span className="dsk-runner-name" style={{ color: '#fff' }}>test</span>
                            <span className="dsk-runner-cmd">npm test</span>
                        </div>
                        <div className="dsk-runner-script">
                            <svg className="dsk-runner-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            <span className="dsk-runner-name">build</span>
                            <span className="dsk-runner-cmd">npm run build</span>
                        </div>
                        <div className="dsk-runner-script">
                            <svg className="dsk-runner-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            <span className="dsk-runner-name">lint</span>
                            <span className="dsk-runner-cmd">npm run lint</span>
                        </div>
                    </div>
                    <div className="dsk-runner-output">
                        <div className="dsk-runner-output-line s-pass">&#10003; auth.test.ts (4 tests)</div>
                        <div className="dsk-runner-output-line s-pass">&#10003; middleware.test.ts (6 tests)</div>
                        <div className="dsk-runner-output-line s-pass">&#10003; refresh.test.ts (3 tests)</div>
                        <div className="dsk-runner-output-line s-info">&nbsp;</div>
                        <div className="dsk-runner-output-line s-info">Test Files &nbsp;3 passed (3)</div>
                        <div className="dsk-runner-output-line s-info">Tests &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;13 passed (13)</div>
                    </div>
                    <div className="dsk-runner-result s-pass">
                        <CheckCircle size={16} />
                        All tests passed &mdash; 13/13
                    </div>
                </div>
            </div>
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat6Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat6Desc')}</p>
                <p className="dsk-section-desc">{t('site.desktopApp.feat6Desc2')}</p>
                <p className="dsk-section-desc">{t('site.desktopApp.feat6Desc3')}</p>
            </div>
        </div>
    </section>
    {/* ── 5. Quick Launch — content left + visual right ── */}
    <section className="dsk-section dsk-quicklaunch">
        <div className="dsk-section-inner">
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat10Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat10Desc')}</p>
            </div>
            <div className="dsk-section-visual">
                <div className="dsk-spotlight">
                    <div className="dsk-spotlight-input">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <span className="dsk-spotlight-text" id="spotlight-typed"></span>
                    </div>
                    <div className="dsk-spotlight-hint">
                        <div className="dsk-spotlight-hint-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                        </div>
                        <span className="dsk-spotlight-hint-label"><strong>/magic:start</strong> &mdash; Start a task from a ticket</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ── 6. Keyboard-first — dark with grid pattern ── */}
    <section className="dsk-section dsk-keyboard">
        <div className="dsk-section-inner">
            <div className="dsk-kb-bubbles">
                <div className="dsk-kb-bubble">&#8984;N</div>
                <div className="dsk-kb-bubble">&#8984;/</div>
                <div className="dsk-kb-bubble">&#8984;&#8593;</div>
                <div className="dsk-kb-bubble">&#8984;D</div>
                <div className="dsk-kb-bubble">&#8984;B</div>
                <div className="dsk-kb-bubble">&#8984;&#8595;</div>
                <div className="dsk-kb-bubble">&#8984;\</div>
                <div className="dsk-kb-bubble">&#8984;I</div>
                <div className="dsk-kb-bubble">&#8984;;</div>
                <div className="dsk-kb-bubble">&#8984;K</div>
                <div className="dsk-kb-bubble">&#8984;W</div>
                <div className="dsk-kb-bubble">&#8984;R</div>
            </div>
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat4Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat4Desc')}</p>
            </div>
        </div>
    </section>
    {/* ── 8. Skills budget — light blue, content left + visual right ── */}
    <section className="dsk-section dsk-budget">
        <div className="dsk-section-inner">
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat5Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat5Desc')}</p>
            </div>
            <div className="dsk-section-visual">
                <div className="dsk-budget-mockup">
                    {/* Header */}
                    <div className="dsk-budget-head">
                        <Activity size={16} />
                        <span>Skills Budget</span>
                    </div>
                    {/* Two-column gauges: Tokens + Characters */}
                    <div className="dsk-budget-grid">
                        {/* Token gauge */}
                        <div className="dsk-bar-card">
                            <div className="dsk-bar-label-row">
                                <span className="dsk-bar-label">Tokens (2% context)</span>
                                <span className="dsk-bar-value">2,840 / 4,000</span>
                            </div>
                            <div className="dsk-bar-track">
                                <div className="dsk-bar-fill bf-accent" style={{ width: '71%' }}>
                                    <div className="dsk-bar-shimmer"></div>
                                </div>
                            </div>
                            <div className="dsk-bar-pct">71%</div>
                        </div>
                        {/* Character gauge */}
                        <div className="dsk-bar-card">
                            <div className="dsk-bar-label-row">
                                <span className="dsk-bar-label">Characters (fallback)</span>
                                <span className="dsk-bar-value">11,360 / 16,000</span>
                            </div>
                            <div className="dsk-bar-track">
                                <div className="dsk-bar-fill bf-orange" style={{ width: '71%' }}>
                                    <div className="dsk-bar-shimmer"></div>
                                </div>
                            </div>
                            <div className="dsk-bar-pct">71%</div>
                        </div>
                    </div>
                    {/* Info tip */}
                    <div className="dsk-budget-info">
                        <Info size={16} />
                        <span className="dsk-budget-info-text">Anthropic recommends keeping skills under <strong>2% of the context window</strong> (~4 000 tokens) for optimal performance.</span>
                    </div>
                    {/* Breakdown toggle */}
                    <div className="dsk-budget-toggle">
                        <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
                        <span>Breakdown by skill</span>
                    </div>
                    {/* Breakdown list */}
                    <div className="dsk-budget-breakdown">
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-builtin">built-in</span>
                            <span className="dsk-bk-name">magic-start</span>
                            <span className="dsk-bk-tokens">620 tok</span>
                            <span className="dsk-bk-weight bw-high">high</span>
                        </div>
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-builtin">built-in</span>
                            <span className="dsk-bk-name">magic-pr</span>
                            <span className="dsk-bk-tokens">580 tok</span>
                            <span className="dsk-bk-weight bw-high">high</span>
                        </div>
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-builtin">built-in</span>
                            <span className="dsk-bk-name">magic-review</span>
                            <span className="dsk-bk-tokens">510 tok</span>
                            <span className="dsk-bk-weight bw-high">high</span>
                        </div>
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-builtin">built-in</span>
                            <span className="dsk-bk-name">magic-commit</span>
                            <span className="dsk-bk-tokens">390 tok</span>
                            <span className="dsk-bk-weight bw-med">med</span>
                        </div>
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-repo">repo</span>
                            <span className="dsk-bk-name">skill-creator</span>
                            <span className="dsk-bk-tokens">340 tok</span>
                            <span className="dsk-bk-weight bw-med">med</span>
                        </div>
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-builtin">built-in</span>
                            <span className="dsk-bk-name">magic-done</span>
                            <span className="dsk-bk-tokens">220 tok</span>
                            <span className="dsk-bk-weight bw-med">med</span>
                        </div>
                        <div className="dsk-bk-row">
                            <span className="dsk-bk-badge bb-custom">custom</span>
                            <span className="dsk-bk-name">release</span>
                            <span className="dsk-bk-tokens">180 tok</span>
                            <span className="dsk-bk-weight bw-low">low</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ── 9. Per-repo config — pink, centered + card grid ── */}
    <section className="dsk-section dsk-config">
        <div className="dsk-section-inner">
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat8Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat8Desc')}</p>
            </div>
            <div className="dsk-config-grid">
                <div className="dsk-config-card">
                    <div className="dsk-config-card-icon"><GitCommit size={16} /></div>
                    <div className="dsk-config-card-title">Commit style</div>
                    <div className="dsk-config-card-desc">Conventional, Angular, Gitmoji, or custom format with live preview.</div>
                </div>
                <div className="dsk-config-card">
                    <div className="dsk-config-card-icon"><Globe size={16} /></div>
                    <div className="dsk-config-card-title">Language</div>
                    <div className="dsk-config-card-desc">Set language for commits, PRs, and Jira comments independently.</div>
                </div>
                <div className="dsk-config-card">
                    <div className="dsk-config-card-icon"><FileText size={16} /></div>
                    <div className="dsk-config-card-title">PR templates</div>
                    <div className="dsk-config-card-desc">Define templates, toggle co-author, auto-link tickets.</div>
                </div>
                <div className="dsk-config-card">
                    <div className="dsk-config-card-icon"><GitBranch size={16} /></div>
                    <div className="dsk-config-card-title">Worktrees</div>
                    <div className="dsk-config-card-desc">Configure worktree files and branch naming per repo.</div>
                </div>
            </div>
        </div>
    </section>
    {/* ── 11. History ── */}
    <section className="dsk-section dsk-history">
        <div className="dsk-section-inner">
            <div className="dsk-section-visual">
                <div className="dsk-hist-mockup">
                    <div className="dsk-hist-titlebar">
                        <div className="dsk-split-dots"><span></span><span></span><span></span></div>
                    </div>
                    <div className="dsk-hist-header">
                        <Clock size={16} />
                        History
                    </div>
                    <div className="dsk-hist-day">Today</div>
                    <div className="dsk-hist-entries">
                        <div className="dsk-hist-entry">
                            <span className="dsk-hist-dot" style={{ background: '#3b82f6' }}></span>
                            <span className="dsk-hist-time">14:32</span>
                            <span className="dsk-hist-agent">auth-middleware</span>
                            <span className="dsk-hist-ticket">PROJ-142</span>
                            <span className="dsk-hist-action" style={{ color: '#3b82f6' }}>PR created</span>
                        </div>
                        <div className="dsk-hist-entry">
                            <span className="dsk-hist-dot" style={{ background: '#eab308' }}></span>
                            <span className="dsk-hist-time">14:30</span>
                            <span className="dsk-hist-agent">auth-middleware</span>
                            <span className="dsk-hist-ticket">PROJ-142</span>
                            <span className="dsk-hist-action" style={{ color: '#eab308' }}>Committed</span>
                        </div>
                        <div className="dsk-hist-entry">
                            <span className="dsk-hist-dot" style={{ background: '#22c55e' }}></span>
                            <span className="dsk-hist-time">14:05</span>
                            <span className="dsk-hist-agent">auth-middleware</span>
                            <span className="dsk-hist-ticket">PROJ-142</span>
                            <span className="dsk-hist-action" style={{ color: '#22c55e' }}>Started</span>
                        </div>
                    </div>
                    <div className="dsk-hist-day">Yesterday</div>
                    <div className="dsk-hist-entries">
                        <div className="dsk-hist-entry">
                            <span className="dsk-hist-dot" style={{ background: '#22c55e' }}></span>
                            <span className="dsk-hist-time">17:45</span>
                            <span className="dsk-hist-agent">fix-login</span>
                            <span className="dsk-hist-ticket">PROJ-321</span>
                            <span className="dsk-hist-action" style={{ color: '#22c55e' }}>Merged</span>
                        </div>
                        <div className="dsk-hist-entry">
                            <span className="dsk-hist-dot" style={{ background: '#a855f7' }}></span>
                            <span className="dsk-hist-time">16:20</span>
                            <span className="dsk-hist-agent">fix-login</span>
                            <span className="dsk-hist-ticket">PROJ-321</span>
                            <span className="dsk-hist-action" style={{ color: '#a855f7' }}>In review</span>
                        </div>
                        <div className="dsk-hist-entry">
                            <span className="dsk-hist-dot" style={{ background: '#22c55e' }}></span>
                            <span className="dsk-hist-time">10:15</span>
                            <span className="dsk-hist-agent">db-migration</span>
                            <span className="dsk-hist-ticket">PROJ-189</span>
                            <span className="dsk-hist-action" style={{ color: '#22c55e' }}>Done</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat13Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat13Desc')}</p>
                <p className="dsk-section-desc">{t('site.desktopApp.feat13Desc2')}</p>
            </div>
        </div>
    </section>
    {/* ── 12. Auto-updates — black, content left + visual right ── */}
    <section className="dsk-section dsk-updates">
        <div className="dsk-section-inner">
            <div className="dsk-section-content">
                <h2 className="dsk-section-title">{t('site.desktopApp.feat7Title')}</h2>
                <p className="dsk-section-desc">{t('site.desktopApp.feat7Desc')}</p>
            </div>
            <div className="dsk-section-visual">
                <div className="dsk-update-mockup">
                    <div className="dsk-update-icon">
                        <Download size={16} />
                    </div>
                    <div className="dsk-update-title">Update ready!</div>
                    <div className="dsk-update-version">v0.44.0</div>
                    <div className="dsk-update-progress">
                        <div className="dsk-update-progress-fill"></div>
                    </div>
                    <div className="dsk-update-pct">100%</div>
                    <div className="dsk-update-buttons">
                        <button className="dsk-update-btn s-secondary">Later</button>
                        <button className="dsk-update-btn s-primary">Restart now</button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/* ── CTA ── */}
    <section className="cta-section">
        <div className="cta-inner">
            <img src="/img/mascot-peace.png" alt="magic-slash mascot" className="cta-mascot" loading="lazy" />
            <div className="cta-content">
                <h2 className="cta-title">{t('site.cta.title')}</h2>
                <p className="cta-subtitle">{t('site.cta.subtitle')}</p>
                <Link href={LOGIN_PATH} className="btn-get-started cta-btn">
                    {t('site.cta.button')}
                </Link>
            </div>
        </div>
    </section>

    {/* ── Footer ── */}
    </>
  )
}
