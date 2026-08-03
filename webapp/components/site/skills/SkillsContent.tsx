'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { RichText } from '@/components/site/RichText'
import { LOGIN_PATH } from '@/lib/routes'

/**
 * The Skills page: the seven commands, each with a terminal transcript.
 *
 * Mechanically converted from the static page in `docs/`; the classes and structure
 * are the original's, so the ported stylesheet applies unchanged.
 */
export function SkillsContent() {
  const { t } = useT()

  return (
    <>

    {/* Hero */}
    <div className="skills-hero">
        <div className="skills-hero-label">{t('site.skills.label')}</div>
        <RichText k="site.skills.heroTitle" as="h1" />
        <p className="skills-hero-intro">{t('site.skills.heroSubtitle')}</p>
    </div>

    {/* Skills List */}
    <div className="skills-list">

        {/* 1. /magic:start */}
        <div className="skill-item" id="skill-start">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:start PROJ-42</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Fetching PROJ-42 from Jira...</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> <span className="terminal-highlight">&#34;Add user authentication flow&#34;</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Branch <span className="terminal-info">feature/PROJ-42-add-user-auth</span> created</div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Worktree ready &mdash; agent starting...</div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">01</span>
                <span className="skill-cmd">/magic:start</span>
                <h2 className="skill-title">{t('site.skills.startTitle')}</h2>
                <p className="skill-desc">{t('site.skills.startDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

        {/* 2. /magic:continue */}
        <div className="skill-item" id="skill-continue">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:continue</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Available worktrees:</span></div>
                    <div className="terminal-line terminal-indent"><span className="terminal-highlight">1.</span> PROJ-42 &mdash; Add user authentication flow</div>
                    <div className="terminal-line terminal-indent"><span className="terminal-highlight">2.</span> PROJ-38 &mdash; Fix dashboard loading state</div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Resuming PROJ-42...</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Context loaded &mdash; ready to code</div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">02</span>
                <span className="skill-cmd">/magic:continue</span>
                <h2 className="skill-title">{t('site.skills.continueTitle')}</h2>
                <p className="skill-desc">{t('site.skills.continueDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

        {/* 3. /magic:commit */}
        <div className="skill-item" id="skill-commit">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:commit</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Analyzing diff... 3 files changed</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> <span className="terminal-info">feat(auth): add JWT token validation middleware</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&nbsp;&nbsp;[PROJ-42] 3 files changed, 127 insertions(+)</span></div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">03</span>
                <span className="skill-cmd">/magic:commit</span>
                <h2 className="skill-title">{t('site.skills.commitTitle')}</h2>
                <p className="skill-desc">{t('site.skills.commitDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

        {/* 4. /magic:pr */}
        <div className="skill-item" id="skill-pr">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:pr</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Pushing to origin/feature/PROJ-42...</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> PR <span className="terminal-highlight">#87</span> created &mdash; <span className="terminal-info">&#34;Add user authentication flow&#34;</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Jira PROJ-42 &rarr; <span className="terminal-highlight">In Review</span></div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">04</span>
                <span className="skill-cmd">/magic:pr</span>
                <h2 className="skill-title">{t('site.skills.prTitle')}</h2>
                <p className="skill-desc">{t('site.skills.prDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

        {/* 5. /magic:review */}
        <div className="skill-item" id="skill-review">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:review #87</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Fetching PR #87 diff...</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Reviewing against team conventions...</span></div>
                    <div className="terminal-line"><span className="terminal-highlight">&nbsp;&nbsp;src/auth.ts:24</span> &mdash; Consider constant-time comparison</div>
                    <div className="terminal-line"><span className="terminal-highlight">&nbsp;&nbsp;src/auth.ts:41</span> &mdash; Missing error handling for expired tokens</div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> 2 comments posted</div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">05</span>
                <span className="skill-cmd">/magic:review</span>
                <h2 className="skill-title">{t('site.skills.reviewTitle')}</h2>
                <p className="skill-desc">{t('site.skills.reviewDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

        {/* 6. /magic:resolve */}
        <div className="skill-item" id="skill-resolve">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:resolve #87</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Reading 2 review comments...</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Fixed: constant-time comparison in <span className="terminal-highlight">auth.ts:24</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Fixed: error handling in <span className="terminal-highlight">auth.ts:41</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Force-pushing...</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> All threads resolved</div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">06</span>
                <span className="skill-cmd">/magic:resolve</span>
                <h2 className="skill-title">{t('site.skills.resolveTitle')}</h2>
                <p className="skill-desc">{t('site.skills.resolveDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

        {/* 7. /magic:done */}
        <div className="skill-item" id="skill-done">
            <div className="skill-terminal">
                <div className="skill-terminal-bar">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                </div>
                <div className="skill-terminal-body">
                    <div className="terminal-line"><span className="terminal-prompt">$</span> <span className="terminal-cmd">/magic:done</span></div>
                    <div className="terminal-line"><span className="terminal-muted">&rarr; Merging PR #87...</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> PR merged into <span className="terminal-info">main</span></div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Branch <span className="terminal-info">feature/PROJ-42</span> deleted</div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Worktree cleaned up</div>
                    <div className="terminal-line"><span className="terminal-success">&#10003;</span> Jira PROJ-42 &rarr; <span className="terminal-highlight">Done</span></div>
                </div>
            </div>
            <div className="skill-content">
                <span className="skill-number">07</span>
                <span className="skill-cmd">/magic:done</span>
                <h2 className="skill-title">{t('site.skills.doneTitle')}</h2>
                <p className="skill-desc">{t('site.skills.doneDesc')}</p>
                <Link href="/documentation#skills" className="skill-link">{t('site.skills.seeDocs')} <ArrowRight size={14} /></Link>
            </div>
        </div>

    </div>

    {/* CTA */}
    <section className="cta-section">
        <div className="cta-inner">
            <img src="/img/mascot-robot.png" alt="magic-slash mascot" className="cta-mascot" />
            <div className="cta-content">
                <h2 className="cta-title">{t('site.cta.title')}</h2>
                <p className="cta-subtitle">{t('site.cta.subtitle')}</p>
                <Link href={LOGIN_PATH} className="btn-get-started cta-btn">
                    {t('site.cta.button')}
                </Link>
            </div>
        </div>
    </section>

    {/* Footer */}
    </>
  )
}
