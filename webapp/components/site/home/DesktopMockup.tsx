'use client'

import { useEffect, useRef } from 'react'
import {
  Check,
  ChevronDown,
  Clock,
  Edit2,
  GitBranch,
  GitPullRequest,
  Info,
  PanelLeft,
  Plus,
  RotateCw,
  Settings,
  X,
  Zap,
} from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { mountDesktopTerminal } from './terminalAnimation'

/**
 * The fake desktop window in the hero — sidebar, scripted terminal, context panel.
 *
 * The markup is a mechanical conversion of `docs/index.html` (lines 155-482): same
 * elements, same classes, same ids. The ids matter — `terminalAnimation.ts` finds its
 * targets by them, exactly as the original script did.
 *
 * It renders ONCE and never re-renders on its own; the animation mutates this subtree
 * imperatively from `mountDesktopTerminal`, which is only safe because of that. The
 * one thing that would break it is a re-render wiping the classes the animation added
 * — so if this component ever needs reactive state, the animation has to move with it.
 */
export function DesktopMockup() {
  const { t } = useT()
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!frame.current) return
    return mountDesktopTerminal(frame.current)
  }, [])

  return (
      <div className="desktop-frame reveal" ref={frame}>

          {/* Title bar */}
          <div className="desktop-titlebar">
              <div className="desktop-titlebar-dots">
                  <span></span><span></span><span></span>
              </div>
              <span className="desktop-titlebar-btn active"><PanelLeft size={16} /></span>
              <div className="desktop-titlebar-center"></div>
              <div className="desktop-titlebar-actions">
                  <span className="desktop-titlebar-btn active"><PanelLeft size={16} style={{ transform: 'rotate(180deg)' }} /></span>
              </div>
          </div>

          {/* Body: 3 columns */}
          <div className="desktop-body">

              {/* Left sidebar */}
              <div className="desktop-sidebar">
                  <div className="desktop-menu">
                      <div className="desktop-menu-item">
                          <Plus size={16} /> <span>{t('site.desktop.newAgent')}</span>
                      </div>
                      <div className="desktop-menu-item">
                          <Zap size={16} /> <span>{t('site.desktop.skills')}</span>
                      </div>
                      <div className="desktop-menu-item">
                          <Settings size={16} /> <span>{t('site.desktop.settings')}</span>
                      </div>
                  </div>

                  <div className="desktop-agents-header">
                      <span className="desktop-agents-label">{t('site.desktop.agents')}</span>
                  </div>

                  <div className="desktop-agent-list">
                      <div className="desktop-project-group">
                          <span className="dot" style={{ background: '#6366f1' }}></span>
                          stellar-api
                          <ChevronDown size={16} />
                      </div>
                      <div className="desktop-agent-item selected sub" id="desktop-agent-auth">
                          <span className="dot blue" id="desktop-agent-auth-dot"></span>
                          <span className="desktop-agent-name">auth-middleware</span>
                          <span className="desktop-agent-spinner" id="desktop-agent-auth-spinner"></span>
                          <span className="desktop-agent-status desktop-agent-check" id="desktop-agent-auth-check" style={{ color: '#22c55e' }}><Check size={16} /></span>
                      </div>
                      <div className="desktop-agent-item sub">
                          <span className="dot green"></span>
                          <span className="desktop-agent-name">api-refactor</span>
                          <span className="desktop-agent-status" style={{ color: '#22c55e' }}><Check size={16} /></span>
                      </div>
                      <div className="desktop-agent-item sub">
                          <span className="dot green"></span>
                          <span className="desktop-agent-name">fix-tests</span>
                          <span className="desktop-agent-status" style={{ color: '#22c55e' }}><Check size={16} /></span>
                      </div>
                      <div className="desktop-project-group">
                          <span className="dot" style={{ background: '#a855f7' }}></span>
                          acme-app
                          <ChevronDown size={16} />
                      </div>
                      <div className="desktop-agent-item sub">
                          <span className="dot yellow"></span>
                          <span className="desktop-agent-name">db-migration</span>
                          <span className="desktop-agent-status" style={{ color: '#eab308' }}><Clock size={16} /></span>
                      </div>
                      <div className="desktop-agent-item sub">
                          <span className="dot gray"></span>
                          <span className="desktop-agent-name">seed-data</span>
                      </div>
                      <div className="desktop-agent-item">
                          <span className="dot green"></span>
                          <span className="desktop-agent-name">ci-pipeline</span>
                          <span className="desktop-agent-status" style={{ color: '#22c55e' }}><Check size={16} /></span>
                      </div>
                  </div>

                  <div className="desktop-sidebar-footer">
                      <a href="#">Docs</a>
                      <a href="#">GitHub</a>
                  </div>
              </div>

              {/* Main panel */}
              <div className="desktop-main">
                  <div className="desktop-main-terminal">
                      <div className="desktop-main-inner">
                          <div className="desktop-main-header">
                              <div className="desktop-main-logo-row">
                                  <img className="desktop-main-logo" src="/img/claudecode-color.png" alt="Claude Code" />
                                  <span className="desktop-main-name">Claude Code</span>

                              </div>
                              <div className="desktop-main-meta">claude-opus-4-20250514 &middot; /auth-middleware</div>
                              <div className="desktop-main-path">~/projects/stellar-api</div>
                          </div>
                          <div className="desktop-terminal-content" id="desktop-terminal-content">
                              {/* Phase 1: /start PROJ-142 */}
                              <div className="workflow-line phase-1-line cli-prompt">
                                  <span className="cli-prompt-icon">&#10095;</span>
                                  <span className="command" data-text="/magic:start PROJ-142"></span>
                              </div>
                              <div className="workflow-line phase-1-line cli-response">
                                  <div className="cli-status phase-1-status-1">
                                      <span className="cli-status-icon"><span className="loader"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Fetching Jira ticket PROJ-142...</span>
                                  </div>
                                  <div className="cli-status phase-1-status-2">
                                      <span className="cli-status-icon"><span className="loader"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Analysing ticket...</span>
                                      <span className="cli-status-result result">BACKEND</span>
                                  </div>
                                  <div className="cli-status phase-1-status-3">
                                      <span className="cli-status-icon"><span className="loader"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Creating worktree...</span>
                                      <span className="cli-status-result result">stellar-api/feature/PROJ-142</span>
                                  </div>
                                  <div className="cli-status phase-1-status-4" style={{ marginTop: '8px' }}>
                                      <span className="cli-status-icon success"><Check size={16} /></span>
                                      <span className="cli-status-text">Ready! Starting work...</span>
                                  </div>
                                  <div className="cli-agents phase-1-status-5">
                                      <span className="cli-status-icon"><span className="loader"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="agents-text">1 agent coding...</span>
                                  </div>
                                  <div className="agents-diff-container">
                                      <div className="diff-file" data-diff-file="1">
                                          <div className="diff-filename">src/middleware/auth.ts</div>
                                          <div className="diff-line added">+export function verifyToken(req: Request, res: Response, next: NextFunction) &#123;</div>
                                          <div className="diff-line added">+  const token = req.headers.authorization?.split(&#39; &#39;)[1];</div>
                                          <div className="diff-line added">+  if (!token) return res.status(401).json(&#123; error: &#39;Unauthorized&#39; &#125;);</div>
                                          <div className="diff-line added">+&#125;</div>
                                      </div>
                                      <div className="diff-file" data-diff-file="2">
                                          <div className="diff-filename">src/middleware/refresh.ts</div>
                                          <div className="diff-line added">+export async function refreshToken(token: string): Promise&lt;string&gt; &#123;</div>
                                          <div className="diff-line added">+  const decoded = jwt.verify(token, SECRET);</div>
                                          <div className="diff-line added">+  return jwt.sign(&#123; sub: decoded.sub &#125;, SECRET, &#123; expiresIn: &#39;1h&#39; &#125;);</div>
                                          <div className="diff-line added">+&#125;</div>
                                      </div>
                                      <div className="diff-file" data-diff-file="3">
                                          <div className="diff-filename">src/routes/index.ts</div>
                                          <div className="diff-line removed">- router.get(&#39;/users&#39;, getUsers);</div>
                                          <div className="diff-line added">+ router.get(&#39;/users&#39;, verifyToken, getUsers);</div>
                                          <div className="diff-line added">+ router.post(&#39;/auth/refresh&#39;, refreshToken);</div>
                                      </div>
                                  </div>
                              </div>

                              {/* Phase 2: /commit */}
                              <div className="workflow-line phase-2-line cli-prompt" style={{ marginTop: '16px' }}>
                                  <span className="cli-prompt-icon purple">&#10095;</span>
                                  <span className="command purple" data-text="/magic:commit"></span>
                              </div>
                              <div className="workflow-line phase-2-line cli-response purple">
                                  <div className="cli-status phase-2-status-1">
                                      <span className="cli-status-icon"><span className="loader purple"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Staging changes...</span>
                                      <span className="cli-status-result result">3 files staged</span>
                                  </div>
                                  <div className="cli-status phase-2-status-2">
                                      <span className="cli-status-icon"><span className="loader purple"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Generating commit message...</span>
                                  </div>
                                  <div className="cli-status phase-2-status-3">
                                      <span className="cli-status-icon success"><Check size={16} /></span>
                                      <span className="cli-status-text" style={{ color: '#fff' }}>feat(auth): add JWT middleware</span>
                                  </div>
                                  <div className="cli-status phase-2-status-4">
                                      <span className="cli-status-icon"><span className="loader purple"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Committing...</span>
                                      <span className="cli-status-result result">Commit created!</span>
                                  </div>
                              </div>

                              {/* Phase 3: /pr */}
                              <div className="workflow-line phase-3-line cli-prompt" style={{ marginTop: '16px' }}>
                                  <span className="cli-prompt-icon green">&#10095;</span>
                                  <span className="command green" data-text="/magic:pr"></span>
                              </div>
                              <div className="workflow-line phase-3-line cli-response green">
                                  <div className="cli-status phase-3-status-1">
                                      <span className="cli-status-icon"><span className="loader green"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Pushing to remote...</span>
                                      <span className="cli-status-result result">origin/feature/PROJ-142</span>
                                  </div>
                                  <div className="cli-status phase-3-status-2">
                                      <span className="cli-status-icon"><span className="loader green"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Creating pull request...</span>
                                      <span className="cli-status-result result">PR #87 created</span>
                                  </div>
                                  <div className="cli-status phase-3-status-3">
                                      <span className="cli-status-icon"><span className="loader green"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Updating Jira ticket...</span>
                                      <span className="cli-status-result result">PROJ-142 &rarr; &#34;To be reviewed&#34;</span>
                                  </div>
                              </div>

                              {/* Phase 4: /review */}
                              <div className="workflow-line phase-4-line cli-prompt" style={{ marginTop: '16px' }}>
                                  <span className="cli-prompt-icon cyan">&#10095;</span>
                                  <span className="command cyan" data-text="/magic:review 87"></span>
                              </div>
                              <div className="workflow-line phase-4-line cli-response cyan">
                                  <div className="cli-status phase-4-status-1">
                                      <span className="cli-status-icon"><span className="loader cyan"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Fetching PR #87...</span>
                                      <span className="cli-status-result result">3 files, +10 &minus;1</span>
                                  </div>
                                  <div className="cli-status phase-4-status-2">
                                      <span className="cli-status-icon"><span className="loader cyan"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Reviewing code...</span>
                                      <span className="cli-status-result result">2 comments</span>
                                  </div>
                                  <div className="cli-status phase-4-status-3">
                                      <span className="cli-status-icon success"><Check size={16} /></span>
                                      <span className="cli-status-text" style={{ color: '#fff' }}>Approved with suggestions</span>
                                  </div>
                              </div>

                              {/* Phase 5: /resolve */}
                              <div className="workflow-line phase-5-line cli-prompt" style={{ marginTop: '16px' }}>
                                  <span className="cli-prompt-icon orange">&#10095;</span>
                                  <span className="command orange" data-text="/magic:resolve"></span>
                              </div>
                              <div className="workflow-line phase-5-line cli-response orange">
                                  <div className="cli-status phase-5-status-1">
                                      <span className="cli-status-icon"><span className="loader orange"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Fetching review comments...</span>
                                      <span className="cli-status-result result">2 comments</span>
                                  </div>
                                  <div className="cli-status phase-5-status-2">
                                      <span className="cli-status-icon"><span className="loader orange"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Applying fixes...</span>
                                      <span className="cli-status-result result">2 files updated</span>
                                  </div>
                                  <div className="cli-status phase-5-status-3">
                                      <span className="cli-status-icon"><span className="loader orange"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Force-pushing...</span>
                                      <span className="cli-status-result result">All comments resolved</span>
                                  </div>
                              </div>

                              {/* Phase 6: /done */}
                              <div className="workflow-line phase-6-line cli-prompt" style={{ marginTop: '16px' }}>
                                  <span className="cli-prompt-icon green">&#10095;</span>
                                  <span className="command green" data-text="/magic:done"></span>
                              </div>
                              <div className="workflow-line phase-6-line cli-response green">
                                  <div className="cli-status phase-6-status-1">
                                      <span className="cli-status-icon"><span className="loader green"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Merging PR #87...</span>
                                      <span className="cli-status-result result">Merged</span>
                                  </div>
                                  <div className="cli-status phase-6-status-2">
                                      <span className="cli-status-icon"><span className="loader green"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Cleaning up branch...</span>
                                      <span className="cli-status-result result">feature/PROJ-142 deleted</span>
                                  </div>
                                  <div className="cli-status phase-6-status-3">
                                      <span className="cli-status-icon"><span className="loader green"></span><span className="checkmark"><Check size={16} /></span></span>
                                      <span className="cli-status-text">Transitioning Jira...</span>
                                      <span className="cli-status-result result">PROJ-142 &rarr; &#34;Done&#34;</span>
                                  </div>
                                  <div className="cli-success-banner phase-6-status-4">
                                      <span className="success-check"><Check size={16} /></span>
                                      <span>Task complete!</span>
                                  </div>
                              </div>
                          </div>
                          <button className="desktop-replay-btn">
                              <RotateCw size={16} />
                          </button>
                      </div>
                  </div>
              </div>

              {/* Right panel */}
              <div className="desktop-right">
                  <div className="desktop-right-header">
                      <Info size={16} />
                      <span className="desktop-right-title">auth-middleware</span>
                      <span className="desktop-right-close"><X size={16} /></span>
                  </div>
                  <div className="desktop-right-body">
                      {/* Ticket card */}
                      <div className="desktop-right-ticket">
                          <div className="desktop-right-ticket-head">
                              <span className="desktop-right-ticket-id">PROJ-142</span>
                              <span className="desktop-right-ticket-badge in-progress">{t('site.desktop.inProgress')}</span>
                          </div>
                          <div className="desktop-right-ticket-title">{t('site.desktop.ticketTitle')}</div>
                          <div className="desktop-right-ticket-desc">{t('site.desktop.ticketDesc')}</div>
                      </div>

                      {/* Repositories */}
                      <div className="desktop-right-section-head">
                          <span className="desktop-right-section-label">{t('site.desktop.repositories')}</span>
                          <span className="desktop-right-section-action"><Edit2 size={16} /> &#8984;P</span>
                      </div>
                      <div className="desktop-right-repo-card">
                          <div className="desktop-right-repo-name">stellar-api</div>
                          <div className="desktop-right-branch">
                              <GitBranch size={16} />
                              <span>feature/PROJ-142</span>
                          </div>
                          <div className="desktop-right-changes" id="desktop-right-changes">
                              <div className="desktop-right-changes-head" id="desktop-right-changes-head">
                                  <span className="desktop-right-changes-count" id="desktop-right-changes-count"></span>
                                  <div className="desktop-right-changes-gauge" id="desktop-right-gauge"></div>
                              </div>
                              <div className="desktop-right-change-files" id="desktop-right-files"></div>
                              <div className="desktop-right-no-changes" id="desktop-right-no-changes">No uncommitted changes</div>
                          </div>
                          <div className="desktop-right-commits" id="desktop-right-commits"></div>
                          <span className="desktop-right-commit-ahead" id="desktop-right-ahead"></span>
                          <a className="desktop-right-pr-link" id="desktop-right-pr-link">
                              <GitPullRequest size={16} />
                              <span>PR #87</span>
                              <span className="desktop-right-pr-status">Open</span>
                          </a>
                      </div>
                  </div>
              </div>

          </div>
      </div>
  )
}
