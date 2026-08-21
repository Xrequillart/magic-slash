'use client'

import { ExternalLink } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { RichText } from '@/components/site/RichText'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import type { ChangelogVersion } from '@/lib/changelog'
import { Changelog } from './Changelog'
import { useCodeCopyButtons } from './useCodeCopyButtons'

/**
 * The Documentation page's body — sixteen sections, from Quick Start to the changelog.
 *
 * Mechanically converted from the static page in `docs/`; the classes and structure
 * are the original's, so the ported stylesheet applies unchanged.
 */
export function DocContent({ versions }: { versions: ChangelogVersion[] }) {
  const { t } = useT()
  // Every <pre> gets a copy button, as it did on the static page.
  useCodeCopyButtons()

  return (
    <>
                    <h1>{t('site.doc.intro.1')}</h1>
                    <p className="doc-subtitle">{t('site.doc.intro.2')}</p>

                    <div className="doc-section" id="quick-start">
                        <h2>{t('site.doc.quickStart.1')}</h2>
                        <p>{t('site.doc.quickStart.2')}</p>
                        <p><a href={DESKTOP_DOWNLOAD_URL}>{t('site.doc.quickStart.download')}</a></p>
                        <RichText k="site.doc.quickStart.3" as="p" />

                        <h3>{t('site.doc.quickStart.4')}</h3>
                        <div className="doc-card-grid">
                            <div className="doc-card">
                                <h3>{t('site.doc.quickStart.5')}</h3>
                                <p>{t('site.doc.quickStart.6')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.quickStart.7')}</h3>
                                <p>{t('site.doc.quickStart.8')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.quickStart.9')}</h3>
                                <p>{t('site.doc.quickStart.10')}</p>
                            </div>
                        </div>

                        <p>{t('site.doc.quickStart.11')}</p>
                    </div>

                    {/* Trail 1 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-1)">
                                <path d="M-20 35C80 10 180 55 300 30C420 5 520 50 620 25C680 12 720 30 720 30" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="usage">
                        <h2>{t('site.doc.usage.1')}</h2>
                        <p>{t('site.doc.usage.2')}</p>
                        <pre><code>&gt; /magic:start PROJ-142
    &#10003; Fetched ticket: &#34;Add JWT auth middleware&#34;
    &#10003; Created worktree: /projects/api-PROJ-142
    &#10003; Branch feature/PROJ-142 created
    &#10003; Ticket moved to &#34;In Progress&#34;

      ... you write code ...

    &gt; /magic:commit
    &#10003; Staged 4 files (excluded .env.local)
    &#10003; feat(auth): add JWT token refresh mechanism

    &gt; /magic:pr
    &#10003; Pushed to origin/feature/PROJ-142
    &#10003; PR #87 created — linked to PROJ-142
    &#10003; Ticket moved to &#34;To be reviewed&#34;

      ... PR gets reviewed ...

    &gt; /magic:review 87
    &#10003; Fetched PR #87 (3 files, +10 −1)
    &#10003; Approved with 2 suggestions

    &gt; /magic:resolve
    &#10003; 2 comments addressed — 2 files updated
    &#10003; Force-pushed to origin/feature/PROJ-142

      ... PR is merged ...

    &gt; /magic:done
    &#10003; PR #87 merged
    &#10003; Branch feature/PROJ-142 deleted
    &#10003; Ticket moved to &#34;Done&#34;</code></pre>

                        <h3>{t('site.doc.usage.3')}</h3>
                        <RichText k="site.doc.usage.4" as="p" />
                        <pre><code>&gt; /magic:continue PROJ-142
    &#10003; Worktree found: /projects/api-PROJ-142
    &#10003; Branch: feature/PROJ-142 (3 commits ahead)
    &#10003; PR #87 (open)

    Ready to continue. What would you like to do?</code></pre>

                        <h3>{t('site.doc.usage.5')}</h3>
                        <p>{t('site.doc.usage.6')}</p>
                        <div className="doc-card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="doc-card">
                                <h3>{t('site.doc.usage.7')}</h3>
                                <RichText k="site.doc.usage.8" as="p" />
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.usage.9')}</h3>
                                <RichText k="site.doc.usage.10" as="p" />
                            </div>
                        </div>

                        <h3>{t('site.doc.usage.11')}</h3>
                        <p>{t('site.doc.usage.12')}</p>
                        <pre><code>&#123;
      &#34;languages&#34;: &#123;
        &#34;discussion&#34;: &#34;fr&#34;,    // Agent responses
        &#34;commit&#34;: &#34;en&#34;,        // Commit messages
        &#34;pullRequest&#34;: &#34;fr&#34;,   // PR descriptions
        &#34;jiraComment&#34;: &#34;en&#34;    // Jira comments
      &#125;
    &#125;</code></pre>
                    </div>

                    {/* Trail 2 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-2)">
                                <path d="M-20 25C100 55 200 5 350 35C500 65 580 15 720 28" stroke="#393BFF" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="skills">
                        <h2>{t('site.doc.skills.1')}</h2>
                        <p>{t('site.doc.skills.2')}</p>
                        <RichText k="site.doc.skills.3" as="p" />

                        {/* First in the section because it runs first in the cycle: /magic:plan
                            is what happens before a ticket exists.

                            NO `doc-skill-img`: there is no `skill-plan.png` and no source for
                            one in `design/`, and an <img> pointing at a 404 is worse than none.
                            `.doc-skill h3` is a flex row, so the header simply loses the 48px
                            icon and its indent — the same shape the "create your own" block and
                            the workflow cards below already have. Add the element back the day
                            the artwork lands. */}
                        <div className="doc-skill">
                            <h3><span className="doc-skill-name">/magic:plan</span> <span className="doc-skill-tag">{t('site.doc.tag.lifecycle')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-plan/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.109" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.110')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.111')}</li>
                                        <li>{t('site.doc.skills.112')}</li>
                                        <li>{t('site.doc.skills.113')}</li>
                                        <li>{t('site.doc.skills.114')}</li>
                                        <li>{t('site.doc.skills.115')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.116')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.117" as="li" />
                                        <li>{t('site.doc.skills.118')}</li>
                                        <li>{t('site.doc.skills.119')}</li>
                                    </ul>
                                    <h4>{t('site.doc.skills.120')}</h4>
                                    <RichText k="site.doc.skills.121" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-start.png" alt="skill /magic:start icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:start</span> <span className="doc-skill-tag">{t('site.doc.tag.lifecycle')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-start/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.4" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.5')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.6')}</li>
                                        <li>{t('site.doc.skills.7')}</li>
                                        <RichText k="site.doc.skills.8" as="li" />
                                        <li>{t('site.doc.skills.9')}</li>
                                        <li>{t('site.doc.skills.10')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.11')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.12" as="li" />
                                        <li>{t('site.doc.skills.13')}</li>
                                        <li>{t('site.doc.skills.14')}</li>
                                    </ul>
                                    <h4>{t('site.doc.skills.15')}</h4>
                                    <p>{t('site.doc.skills.16')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-continue.png" alt="skill /magic:continue icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:continue</span> <span className="doc-skill-tag">{t('site.doc.tag.lifecycle')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-continue/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.17" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.18')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.19')}</li>
                                        <li>{t('site.doc.skills.20')}</li>
                                        <li>{t('site.doc.skills.21')}</li>
                                        <li>{t('site.doc.skills.22')}</li>
                                        <li>{t('site.doc.skills.23')}</li>
                                        <li>{t('site.doc.skills.24')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.25')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.26" as="li" />
                                        <li>{t('site.doc.skills.27')}</li>
                                        <li>{t('site.doc.skills.28')}</li>
                                    </ul>
                                    <h4>{t('site.doc.skills.29')}</h4>
                                    <p>{t('site.doc.skills.30')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-commit.png" alt="skill /magic:commit icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:commit</span> <span className="doc-skill-tag">{t('site.doc.tag.git')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-commit/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.31" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.32')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.33" as="li" />
                                        <li>{t('site.doc.skills.34')}</li>
                                        <li>{t('site.doc.skills.35')}</li>
                                        <li>{t('site.doc.skills.36')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.37')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.38" as="li" />
                                        <RichText k="site.doc.skills.39" as="li" />
                                        <RichText k="site.doc.skills.40" as="li" />
                                        <RichText k="site.doc.skills.41" as="li" />
                                        <RichText k="site.doc.skills.42" as="li" />
                                        <RichText k="site.doc.skills.42b" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-pr.png" alt="skill /magic:pr icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:pr</span> <span className="doc-skill-tag">{t('site.doc.tag.lifecycle')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-pr/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.43" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.44')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.45')}</li>
                                        <li>{t('site.doc.skills.46')}</li>
                                        <li>{t('site.doc.skills.47')}</li>
                                        <li>{t('site.doc.skills.48')}</li>
                                        <li>{t('site.doc.skills.49')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.50')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.51" as="li" />
                                        <RichText k="site.doc.skills.52" as="li" />
                                        <RichText k="site.doc.skills.53" as="li" />
                                        <RichText k="site.doc.skills.54" as="li" />
                                        <RichText k="site.doc.skills.55" as="li" />
                                        <RichText k="site.doc.skills.56" as="li" />
                                    </ul>
                                    <h4>{t('site.doc.skills.57')}</h4>
                                    <p>{t('site.doc.skills.58')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-review.png" alt="skill /magic:review icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:review</span> <span className="doc-skill-tag">{t('site.doc.tag.review')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-review/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.59" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.60')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.61')}</li>
                                        <li>{t('site.doc.skills.62')}</li>
                                        <li>{t('site.doc.skills.63')}</li>
                                        <li>{t('site.doc.skills.64')}</li>
                                        <RichText k="site.doc.skills.65" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.66')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.67" as="li" />
                                        <li>{t('site.doc.skills.68')}</li>
                                        <li>{t('site.doc.skills.69')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-resolve.png" alt="skill /magic:resolve icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:resolve</span> <span className="doc-skill-tag">{t('site.doc.tag.review')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-resolve/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.70" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.71')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.72')}</li>
                                        <li>{t('site.doc.skills.73')}</li>
                                        <li>{t('site.doc.skills.74')}</li>
                                        <li>{t('site.doc.skills.75')}</li>
                                        <li>{t('site.doc.skills.76')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.77')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.78" as="li" />
                                        <li>{t('site.doc.skills.79')}</li>
                                        <li>{t('site.doc.skills.80')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3><img src="/img/skill-done.png" alt="skill /magic:done icon" className="doc-skill-img" /><span className="doc-skill-name">/magic:done</span> <span className="doc-skill-tag">{t('site.doc.tag.lifecycle')}</span> <a href="https://github.com/xrequillart/magic-slash/blob/main/skills/magic-done/SKILL.md" target="_blank" className="doc-skill-source"><ExternalLink size={16} /> {t('site.doc.skillSource')}</a></h3>
                            <RichText k="site.doc.skills.81" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.82')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.83')}</li>
                                        <li>{t('site.doc.skills.84')}</li>
                                        <li>{t('site.doc.skills.85')}</li>
                                        <li>{t('site.doc.skills.86')}</li>
                                        <RichText k="site.doc.skills.87" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.88')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.89" as="li" />
                                        <li>{t('site.doc.skills.90')}</li>
                                        <li>{t('site.doc.skills.91')}</li>
                                    </ul>
                                    <h4>{t('site.doc.skills.92')}</h4>
                                    <RichText k="site.doc.skills.93" as="p" />
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.skills.94')}</h3>
                        <p>{t('site.doc.skills.95')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.skills.createOwn')} <span className="doc-skill-tag">{t('site.doc.tag.custom')}</span></h3>
                            <RichText k="site.doc.skills.96" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.97')}</h4>
                                    <ul>
                                        <li>{t('site.doc.skills.98')}</li>
                                        <RichText k="site.doc.skills.99" as="li" />
                                        <RichText k="site.doc.skills.100" as="li" />
                                        <li>{t('site.doc.skills.101')}</li>
                                        <RichText k="site.doc.skills.102" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.skills.103')}</h4>
                                    <ul>
                                        <RichText k="site.doc.skills.104" as="li" />
                                        <RichText k="site.doc.skills.105" as="li" />
                                        <RichText k="site.doc.skills.106" as="li" />
                                        <RichText k="site.doc.skills.107" as="li" />
                                        <RichText k="site.doc.skills.108" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail: Skills → Workflows */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-3)">
                                <path d="M-20 30C60 50 160 8 280 40C400 72 480 15 600 30C660 38 720 20 720 20" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== WORKFLOW EXAMPLES ==================== */}
                    <div className="doc-section" id="workflows">
                        <h2>{t('site.doc.workflows.1')}</h2>
                        <p>{t('site.doc.workflows.2')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.workflows.3')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.workflows.4')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.5')}</h4>
                                    <pre style={{ margin: '0' }}><code>/magic:start BUG-42
      ... fix the bug ...
    /magic:commit
    /magic:pr
      ... wait for review ...
    /magic:done</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.6')}</h4>
                                    <ul>
                                        <li>{t('site.doc.workflows.7')}</li>
                                        <RichText k="site.doc.workflows.8" as="li" />
                                        <li>{t('site.doc.workflows.9')}</li>
                                        <li>{t('site.doc.workflows.10')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.workflows.11')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.workflows.12')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.13')}</h4>
                                    <pre style={{ margin: '0' }}><code>/magic:start FEAT-101
      ... implement feature ...
    /magic:commit
    /magic:commit
    /magic:pr
    /magic:review
      ... fix issues found ...
    /magic:commit
      ... request external review ...
    /magic:done</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.14')}</h4>
                                    <ul>
                                        <RichText k="site.doc.workflows.15" as="li" />
                                        <RichText k="site.doc.workflows.16" as="li" />
                                        <li>{t('site.doc.workflows.17')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.workflows.18')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.workflows.19')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.20')}</h4>
                                    <pre style={{ margin: '0' }}><code>/magic:start FEAT-200
      ✓ Matched: api-repo + web-repo
      ✓ Worktrees created for both

      ... implement backend ...
    /magic:commit

      ... implement frontend ...
    /magic:commit
    /magic:pr
      ... PRs created for both repos ...
    /magic:done</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.21')}</h4>
                                    <ul>
                                        <li>{t('site.doc.workflows.22')}</li>
                                        <li>{t('site.doc.workflows.23')}</li>
                                        <li>{t('site.doc.workflows.24')}</li>
                                        <li>{t('site.doc.workflows.25')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.workflows.26')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.workflows.27')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.28')}</h4>
                                    <pre style={{ margin: '0' }}><code>/magic:continue PROJ-142
      ✓ Worktree found
      ✓ Branch: feature/PROJ-142 (3 commits ahead)
      ✓ PR #87 (open, 1 comment)

      ... continue coding ...
    /magic:commit
    /magic:resolve
      ... review comments addressed ...</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.29')}</h4>
                                    <ul>
                                        <li>{t('site.doc.workflows.30')}</li>
                                        <RichText k="site.doc.workflows.31" as="li" />
                                        <RichText k="site.doc.workflows.32" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.workflows.33')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.workflows.34')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.35')}</h4>
                                    <pre style={{ margin: '0' }}><code>/magic:review 87
      ✓ Fetched PR #87 (12 files, +340 −42)
      ✓ Review: 1 blocker, 3 suggestions, 2 nits
      ✓ Submitted as &#34;Changes Requested&#34;</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.workflows.36')}</h4>
                                    <ul>
                                        <li>{t('site.doc.workflows.37')}</li>
                                        <li>{t('site.doc.workflows.38')}</li>
                                        <li>{t('site.doc.workflows.39')}</li>
                                        <li>{t('site.doc.workflows.40')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail: Workflows → Best Practices */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-2)">
                                <path d="M-20 25C100 55 200 5 350 35C500 65 580 15 720 28" stroke="#393BFF" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== BEST PRACTICES ==================== */}
                    <div className="doc-section" id="best-practices">
                        <h2>{t('site.doc.bestPractices.1')}</h2>
                        <p>{t('site.doc.bestPractices.2')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.bestPractices.3')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.bestPractices.4')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.5')}</h4>
                                    <ul>
                                        <RichText k="site.doc.bestPractices.6" as="li" />
                                        <RichText k="site.doc.bestPractices.7" as="li" />
                                        <li>{t('site.doc.bestPractices.8')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.9')}</h4>
                                    <ul>
                                        <RichText k="site.doc.bestPractices.10" as="li" />
                                        <li>{t('site.doc.bestPractices.11')}</li>
                                        <li>{t('site.doc.bestPractices.12')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.bestPractices.13')}</h3>
                            <RichText k="site.doc.bestPractices.14" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.15')}</h4>
                                    <ul>
                                        <li>{t('site.doc.bestPractices.16')}</li>
                                        <li>{t('site.doc.bestPractices.17')}</li>
                                        <RichText k="site.doc.bestPractices.18" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.19')}</h4>
                                    <ul>
                                        <li>{t('site.doc.bestPractices.20')}</li>
                                        <li>{t('site.doc.bestPractices.21')}</li>
                                        <li>{t('site.doc.bestPractices.22')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.bestPractices.23')}</h3>
                            <RichText k="site.doc.bestPractices.24" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.25')}</h4>
                                    <ul>
                                        <li>{t('site.doc.bestPractices.26')}</li>
                                        <li>{t('site.doc.bestPractices.27')}</li>
                                        <li>{t('site.doc.bestPractices.28')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.29')}</h4>
                                    <pre style={{ margin: '0' }}><code>/magic:pr
    /magic:review
      ... fix findings ...
    /magic:commit
      ... then request human review</code></pre>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.bestPractices.30')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.bestPractices.31')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.32')}</h4>
                                    <ul>
                                        <RichText k="site.doc.bestPractices.33" as="li" />
                                        <RichText k="site.doc.bestPractices.34" as="li" />
                                        <li>{t('site.doc.bestPractices.35')}</li>
                                        <RichText k="site.doc.bestPractices.36" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.37')}</h4>
                                    <p>{t('site.doc.bestPractices.38')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.bestPractices.39')}</h3>
                            <RichText k="site.doc.bestPractices.40" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.41')}</h4>
                                    <pre style={{ margin: '0' }}><code>&#34;my-repo&#34;: &#123;
      &#34;path&#34;: &#34;/projects/my-repo&#34;,
      &#34;worktreeFiles&#34;: [
        &#34;.env&#34;,
        &#34;.env.local&#34;,
        &#34;.npmrc&#34;
      ]
    &#125;</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.bestPractices.42')}</h4>
                                    <ul>
                                        <li>{t('site.doc.bestPractices.43')}</li>
                                        <RichText k="site.doc.bestPractices.44" as="li" />
                                        <li>{t('site.doc.bestPractices.45')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail: Best Practices → Configuration */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-1)">
                                <path d="M-20 28C90 55 190 12 320 38C450 64 540 18 640 32C690 38 720 22 720 22" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="configuration">
                        <h2>{t('site.doc.configuration.1')}</h2>
                        <RichText k="site.doc.configuration.2" as="p" />

                        <h3>{t('site.doc.configuration.3')}</h3>
                        <pre><code>&#123;
      &#34;version&#34;: &#34;0.63.1&#34;,
      &#34;repositories&#34;: &#123;
        &#34;my-frontend&#34;: &#123;
          &#34;path&#34;: &#34;/Users/dev/projects/my-frontend&#34;,
          &#34;keywords&#34;: [&#34;frontend&#34;, &#34;ui&#34;, &#34;react&#34;, &#34;amplify&#34;],
          &#34;color&#34;: &#34;#3B82F6&#34;,
          &#34;languages&#34;: &#123;
            &#34;discussion&#34;: &#34;fr&#34;,
            &#34;pullRequest&#34;: &#34;fr&#34;,
            &#34;jiraComment&#34;: &#34;fr&#34;
          &#125;,
          &#34;commit&#34;: &#123;
            &#34;coAuthor&#34;: false,
            &#34;includeTicketId&#34;: true
          &#125;,
          &#34;branches&#34;: &#123;
            &#34;development&#34;: &#34;develop&#34;
          &#125;,
          &#34;jira&#34;: &#123;
            &#34;siteUrl&#34;: &#34;https://myteam.atlassian.net/browse/&#34;,
            &#34;projectKey&#34;: &#34;PROJ&#34;
          &#125;
        &#125;,
        &#34;my-api&#34;: &#123;
          &#34;path&#34;: &#34;/Users/dev/projects/my-api&#34;,
          &#34;keywords&#34;: [&#34;backend&#34;, &#34;api&#34;, &#34;lambda&#34;, &#34;serverless&#34;],
          &#34;color&#34;: &#34;#EF4444&#34;,
          &#34;languages&#34;: &#123;
            &#34;discussion&#34;: &#34;fr&#34;,
            &#34;pullRequest&#34;: &#34;fr&#34;,
            &#34;jiraComment&#34;: &#34;fr&#34;
          &#125;,
          &#34;commit&#34;: &#123;
            &#34;includeTicketId&#34;: true,
            &#34;coAuthor&#34;: false
          &#125;,
          &#34;branches&#34;: &#123;
            &#34;development&#34;: &#34;develop&#34;
          &#125;,
          &#34;jira&#34;: &#123;
            &#34;siteUrl&#34;: &#34;https://myteam.atlassian.net/browse/&#34;,
            &#34;projectKey&#34;: &#34;PROJ&#34;
          &#125;
        &#125;,
        &#34;my-tools&#34;: &#123;
          &#34;path&#34;: &#34;/Users/dev/projects/my-tools&#34;,
          &#34;keywords&#34;: [&#34;tools&#34;, &#34;cli&#34;, &#34;scripts&#34;],
          &#34;color&#34;: &#34;#8B5CF6&#34;,
          &#34;languages&#34;: &#123;
            &#34;discussion&#34;: &#34;fr&#34;
          &#125;,
          &#34;commit&#34;: &#123;
            &#34;coAuthor&#34;: false
          &#125;,
          &#34;branches&#34;: &#123;
            &#34;development&#34;: &#34;main&#34;
          &#125;,
          &#34;issues&#34;: &#123;
            &#34;commentOnPR&#34;: false
          &#125;
        &#125;
      &#125;,
      &#34;agents&#34;: [
        &#123;
          &#34;id&#34;: &#34;claude-1770400971763&#34;,
          &#34;name&#34;: &#34;Claude 1&#34;,
          &#34;repositories&#34;: [&#34;/Users/dev/projects/my-frontend&#34;],
          &#34;tsCreate&#34;: 1770400971818,
          &#34;metadata&#34;: &#123;
            &#34;title&#34;: &#34;Add user dashboard&#34;,
            &#34;branchName&#34;: &#34;feature/PROJ-42-user-dashboard&#34;,
            &#34;ticketId&#34;: &#34;PROJ-42&#34;,
            &#34;description&#34;: &#34;Create the main user dashboard with activity feed and stats.&#34;,
            &#34;status&#34;: &#34;PR created&#34;,
            &#34;fullStackTaskId&#34;: &#34;&#34;,
            &#34;relatedWorktrees&#34;: [],
            &#34;repositoryMetadata&#34;: &#123;
              &#34;/Users/dev/projects/my-frontend&#34;: &#123;
                &#34;prUrl&#34;: &#34;https://github.com/myorg/my-frontend/pull/156&#34;
              &#125;
            &#125;
          &#125;
        &#125;,
        &#123;
          &#34;id&#34;: &#34;claude-1770589955009&#34;,
          &#34;name&#34;: &#34;Claude 2&#34;,
          &#34;repositories&#34;: [],
          &#34;tsCreate&#34;: 1770589955032,
          &#34;metadata&#34;: &#123;
            &#34;title&#34;: &#34;&#34;,
            &#34;branchName&#34;: &#34;&#34;,
            &#34;ticketId&#34;: &#34;&#34;,
            &#34;description&#34;: &#34;&#34;,
            &#34;status&#34;: &#34;&#34;,
            &#34;fullStackTaskId&#34;: &#34;&#34;,
            &#34;relatedWorktrees&#34;: [],
            &#34;repositoryMetadata&#34;: &#123;&#125;
          &#125;
        &#125;
      ]
    &#125;</code></pre>

                        <h3>{t('site.doc.configuration.4')}</h3>
                        <RichText k="site.doc.configuration.5" as="p" />
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.6')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.7" as="li" />
                                        <RichText k="site.doc.configuration.8" as="li" />
                                        <RichText k="site.doc.configuration.9" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.10')}</h4>
                                    <ul>
                                        <li>{t('site.doc.configuration.11')}</li>
                                        <li>{t('site.doc.configuration.12')}</li>
                                        <li>{t('site.doc.configuration.13')}</li>
                                        <li>{t('site.doc.configuration.14')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.configuration.15')}</h3>
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.16')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.17" as="li" />
                                        <RichText k="site.doc.configuration.18" as="li" />
                                        <RichText k="site.doc.configuration.19" as="li" />
                                        <RichText k="site.doc.configuration.20" as="li" />
                                        <RichText k="site.doc.configuration.20b" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.21')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.22" as="li" />
                                        <RichText k="site.doc.configuration.23" as="li" />
                                        <RichText k="site.doc.configuration.24" as="li" />
                                        <RichText k="site.doc.configuration.25" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.configuration.26')}</h3>
                        <p>{t('site.doc.configuration.27')}</p>
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.28')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.29" as="li" />
                                        <RichText k="site.doc.configuration.30" as="li" />
                                        <RichText k="site.doc.configuration.31" as="li" />
                                        <RichText k="site.doc.configuration.32" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.33')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.34" as="li" />
                                        <RichText k="site.doc.configuration.35" as="li" />
                                    </ul>
                                    <h4>{t('site.doc.configuration.36')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.37" as="li" />
                                        <RichText k="site.doc.configuration.38" as="li" />
                                        <RichText k="site.doc.configuration.39" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.configuration.40')}</h3>
                        <RichText k="site.doc.configuration.41" as="p" />
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.42')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.43" as="li" />
                                        <RichText k="site.doc.configuration.44" as="li" />
                                        <RichText k="site.doc.configuration.45" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.46')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.47" as="li" />
                                        <RichText k="site.doc.configuration.48" as="li" />
                                        <RichText k="site.doc.configuration.49" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.configuration.50')}</h3>
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.51')}</h4>
                                    <ul>
                                        <RichText k="site.doc.configuration.52" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.configuration.53')}</h4>
                                    <pre><code>&#34;branches&#34;: &#123;
      &#34;development&#34;: &#34;develop&#34;
    &#125;</code></pre>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.configuration.54')}</h3>
                        <pre><code>~/.config/magic-slash/config.json   # Main configuration
    ~/.claude/skills/magic-plan/SKILL.md       # /magic:plan skill definition
    ~/.claude/skills/magic-start/SKILL.md      # /magic:start skill definition
    ~/.claude/skills/magic-continue/SKILL.md   # /magic:continue skill definition
    ~/.claude/skills/magic-commit/SKILL.md     # /magic:commit skill definition
    ~/.claude/skills/magic-pr/SKILL.md         # /magic:pr skill definition
    ~/.claude/skills/magic-review/SKILL.md     # /magic:review skill definition
    ~/.claude/skills/magic-resolve/SKILL.md    # /magic:resolve skill definition
    ~/.claude/skills/magic-done/SKILL.md       # /magic:done skill definition
    ~/.claude.json                      # MCP server settings (Jira &amp; GitHub)</code></pre>
                    </div>

                    {/* Trail 4 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-4)">
                                <path d="M-20 20C120 55 220 10 360 45C500 80 560 15 650 30C690 36 720 25 720 25" stroke="#393BFF" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="integrations">
                        <h2>{t('site.doc.integrations.1')}</h2>
                        <p>{t('site.doc.integrations.2')}</p>

                        <div className="doc-skill">
                            <h3>GitHub <span className="doc-skill-tag">MCP</span></h3>
                            <RichText k="site.doc.integrations.3" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.integrations.4')}</h4>
                                    <ul>
                                        <li>{t('site.doc.integrations.5')}</li>
                                        <li>{t('site.doc.integrations.6')}</li>
                                        <li>{t('site.doc.integrations.7')}</li>
                                        <li>{t('site.doc.integrations.8')}</li>
                                        <li>{t('site.doc.integrations.9')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.integrations.10')}</h4>
                                    <RichText k="site.doc.integrations.11" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>Jira <span className="doc-skill-tag">MCP</span></h3>
                            <p className="doc-skill-desc">{t('site.doc.integrations.12')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.integrations.13')}</h4>
                                    <ul>
                                        <li>{t('site.doc.integrations.14')}</li>
                                        <li>{t('site.doc.integrations.15')}</li>
                                        <li>{t('site.doc.integrations.16')}</li>
                                        <li>{t('site.doc.integrations.17')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.integrations.18')}</h4>
                                    <p>{t('site.doc.integrations.19')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>Git <span className="doc-skill-tag">Native</span></h3>
                            <p className="doc-skill-desc">{t('site.doc.integrations.20')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.integrations.21')}</h4>
                                    <ul>
                                        <li>{t('site.doc.integrations.22')}</li>
                                        <RichText k="site.doc.integrations.23" as="li" />
                                        <li>{t('site.doc.integrations.24')}</li>
                                        <li>{t('site.doc.integrations.25')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.integrations.26')}</h4>
                                    <ul>
                                        <RichText k="site.doc.integrations.27" as="li" />
                                        <RichText k="site.doc.integrations.28" as="li" />
                                    </ul>
                                    <h4>{t('site.doc.integrations.29')}</h4>
                                    <RichText k="site.doc.integrations.30" as="p" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail 5 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-1)">
                                <path d="M-20 28C90 55 190 12 320 38C450 64 540 18 640 32C690 38 720 22 720 22" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="multi-repo">
                        <h2>{t('site.doc.multiRepo.1')}</h2>
                        <p>{t('site.doc.multiRepo.2')}</p>

                        <h3>{t('site.doc.multiRepo.3')}</h3>
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.multiRepo.4')}</h4>
                                    <ul>
                                        <li>{t('site.doc.multiRepo.5')}</li>
                                        <li>{t('site.doc.multiRepo.6')}</li>
                                        <li>{t('site.doc.multiRepo.7')}</li>
                                        <RichText k="site.doc.multiRepo.8" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.multiRepo.9')}</h4>
                                    <ul>
                                        <li>{t('site.doc.multiRepo.10')}</li>
                                        <li>{t('site.doc.multiRepo.11')}</li>
                                        <li>{t('site.doc.multiRepo.12')}</li>
                                        <li>{t('site.doc.multiRepo.13')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.multiRepo.14')}</h4>
                                    <ul>
                                        <li>{t('site.doc.multiRepo.15')}</li>
                                        <RichText k="site.doc.multiRepo.16" as="li" />
                                        <RichText k="site.doc.multiRepo.17" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.multiRepo.18')}</h3>
                        <pre><code>&gt; /magic:start PROJ-200
    &#10003; Ticket: &#34;Add user avatar upload&#34;
    &#10003; Matched repos: api (score: 15), web (score: 12)

      Which repos? &gt; all

    &#10003; Created /projects/api-PROJ-200
    &#10003; Created /projects/web-PROJ-200

      ... you implement backend + frontend ...

    &gt; /magic:commit
    &#10003; api-PROJ-200: feat(upload): add avatar endpoint
    &#10003; web-PROJ-200: feat(profile): add avatar picker component

    &gt; /magic:pr
    &#10003; PR #42 created on org/api
    &#10003; PR #43 created on org/web
    &#10003; Jira PROJ-200 updated with both PR links</code></pre>

                        <h3>{t('site.doc.multiRepo.19')}</h3>
                        <RichText k="site.doc.multiRepo.20" as="p" />
                        <pre><code># Full-Stack Context

    You are working on ticket **PROJ-200** which spans multiple repos.

    ## Worktrees for this task
    - **Backend**: /projects/api-PROJ-200
    - **Frontend**: /projects/web-PROJ-200

    ## Instructions
    - Use `cd` to navigate to the appropriate worktree
    - You can work on both repos in a single session
    - Make sure changes are consistent across repos</code></pre>
                    </div>

                    {/* Trail 6 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-3)">
                                <path d="M-20 35C70 12 170 52 310 28C450 4 530 48 630 22C680 12 720 32 720 32" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="desktop">
                        <h2>{t('site.doc.desktop.1')}</h2>
                        <p>{t('site.doc.desktop.2')}</p>

                        <div className="doc-card-grid">
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.3')}</h3>
                                <p>{t('site.doc.desktop.4')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.5')}</h3>
                                <p>{t('site.doc.desktop.6')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.7')}</h3>
                                <p>{t('site.doc.desktop.8')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.9')}</h3>
                                <p>{t('site.doc.desktop.10')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.11')}</h3>
                                <p>{t('site.doc.desktop.12')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.13')}</h3>
                                <p>{t('site.doc.desktop.14')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.15')}</h3>
                                <p>{t('site.doc.desktop.16')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.17')}</h3>
                                <p>{t('site.doc.desktop.18')}</p>
                            </div>
                            <div className="doc-card">
                                <h3>{t('site.doc.desktop.19')}</h3>
                                <p>{t('site.doc.desktop.20')}</p>
                            </div>
                        </div>

                        <h3>{t('site.doc.desktop.21')}</h3>
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.desktop.22')}</h4>
                                    <ul>
                                        <li>{t('site.doc.desktop.23')}</li>
                                        <li>{t('site.doc.desktop.24')}</li>
                                        <li>{t('site.doc.desktop.25')}</li>
                                        <li>{t('site.doc.desktop.26')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.desktop.27')}</h4>
                                    <ul>
                                        <li>{t('site.doc.desktop.28')}</li>
                                        <li>{t('site.doc.desktop.29')}</li>
                                        <li>{t('site.doc.desktop.30')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.desktop.31')}</h3>
                        <p>{t('site.doc.desktop.32')}</p>
                        <div className="doc-skill">
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <RichText k="site.doc.desktop.33" as="h4" />
                                    <ul>
                                        <RichText k="site.doc.desktop.34" as="li" />
                                        <RichText k="site.doc.desktop.35" as="li" />
                                        <RichText k="site.doc.desktop.36" as="li" />
                                        <RichText k="site.doc.desktop.37" as="li" />
                                        <RichText k="site.doc.desktop.38" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <RichText k="site.doc.desktop.39" as="h4" />
                                    <ul>
                                        <RichText k="site.doc.desktop.40" as="li" />
                                    </ul>
                                    <RichText k="site.doc.desktop.41" as="p" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail 7 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-2)">
                                <path d="M-20 32C100 8 200 52 340 25C480 -2 560 45 660 28C700 22 720 30 720 30" stroke="#393BFF" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== PLANS ==================== */}
                    <div className="doc-section" id="plans">
                        <h2>{t('site.doc.plans.1')}</h2>
                        <RichText k="site.doc.plans.2" as="p" />

                        <div className="doc-skill">
                            <h3>{t('site.doc.plans.3')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.plans.4')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.plans.5')}</h4>
                                    <ul>
                                        <li>{t('site.doc.plans.6')}</li>
                                        <li>{t('site.doc.plans.7')}</li>
                                        <li>{t('site.doc.plans.8')}</li>
                                        <li>{t('site.doc.plans.9')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.plans.10')}</h4>
                                    <RichText k="site.doc.plans.11" as="p" />
                                    <RichText k="site.doc.plans.12" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.plans.13')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.plans.14')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.plans.15')}</h4>
                                    <ul>
                                        <li>{t('site.doc.plans.16')}</li>
                                        <li>{t('site.doc.plans.17')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.plans.18')}</h4>
                                    <ul>
                                        <li>{t('site.doc.plans.19')}</li>
                                        <li>{t('site.doc.plans.20')}</li>
                                        <li>{t('site.doc.plans.21')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* The two surprising consequences of deriving visibility from the
                            repository, spelled out rather than left to be discovered: one of
                            them makes private brainstorming readable by a whole org. */}
                        <div className="doc-skill">
                            <h3>{t('site.doc.plans.22')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.plans.23')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.plans.24')}</h4>
                                    <RichText k="site.doc.plans.25" as="p" />
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.plans.26')}</h4>
                                    <RichText k="site.doc.plans.27" as="p" />
                                </div>
                            </div>
                        </div>

                        <h3>{t('site.doc.plans.28')}</h3>
                        <RichText k="site.doc.plans.29" as="p" />
                    </div>

                    {/* Trail 7b */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-1)">
                                <path d="M-20 30C90 52 190 8 320 32C450 56 550 12 660 30C700 36 720 30 720 30" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== HOOKS & AUTOMATION ==================== */}
                    <div className="doc-section" id="hooks">
                        <h2>{t('site.doc.hooks.1')}</h2>
                        <p>
                            {t('site.doc.hooks.introBefore')}{' '}
                            <a
                                href="https://docs.anthropic.com/en/docs/claude-code/hooks"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t('site.doc.hooks.introLink')}
                            </a>{' '}
                            <RichText k="site.doc.hooks.introAfter" />
                        </p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.hooks.2')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.hooks.3')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.hooks.4')}</h4>
                                    <ul>
                                        <RichText k="site.doc.hooks.5" as="li" />
                                        <RichText k="site.doc.hooks.6" as="li" />
                                        <RichText k="site.doc.hooks.7" as="li" />
                                        <RichText k="site.doc.hooks.8" as="li" />
                                        <RichText k="site.doc.hooks.9" as="li" />
                                        <RichText k="site.doc.hooks.10" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.hooks.11')}</h4>
                                    <RichText k="site.doc.hooks.12" as="p" />
                                    <p>{t('site.doc.hooks.13')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.hooks.14')}</h3>
                            <RichText k="site.doc.hooks.15" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.hooks.16')}</h4>
                                    <ul>
                                        <RichText k="site.doc.hooks.17" as="li" />
                                        <RichText k="site.doc.hooks.18" as="li" />
                                        <RichText k="site.doc.hooks.19" as="li" />
                                        <RichText k="site.doc.hooks.20" as="li" />
                                        <RichText k="site.doc.hooks.21" as="li" />
                                        <RichText k="site.doc.hooks.22" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.hooks.23')}</h4>
                                    <ul>
                                        <RichText k="site.doc.hooks.24" as="li" />
                                        <RichText k="site.doc.hooks.25" as="li" />
                                        <RichText k="site.doc.hooks.26" as="li" />
                                        <RichText k="site.doc.hooks.27" as="li" />
                                        <RichText k="site.doc.hooks.28" as="li" />
                                        <RichText k="site.doc.hooks.29" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.hooks.30')}</h3>
                            <RichText k="site.doc.hooks.31" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.hooks.32')}</h4>
                                    <ul>
                                        <RichText k="site.doc.hooks.33" as="li" />
                                        <RichText k="site.doc.hooks.34" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.hooks.35')}</h4>
                                    <ul>
                                        <RichText k="site.doc.hooks.36" as="li" />
                                        <RichText k="site.doc.hooks.37" as="li" />
                                        <RichText k="site.doc.hooks.38" as="li" />
                                        <RichText k="site.doc.hooks.39" as="li" />
                                        <RichText k="site.doc.hooks.40" as="li" />
                                    </ul>
                                    <RichText k="site.doc.hooks.41" as="p" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail 8 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-1)">
                                <path d="M-20 28C120 52 220 8 360 32C500 56 580 12 680 35C710 40 720 30 720 30" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== SECURITY & PERMISSIONS ==================== */}
                    <div className="doc-section" id="security">
                        <h2>{t('site.doc.security.1')}</h2>
                        <p>{t('site.doc.security.2')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.security.3')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.security.4')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.security.5')}</h4>
                                    <p>{t('site.doc.security.6')}</p>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.security.7')}</h4>
                                    <RichText k="site.doc.security.8" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.security.9')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.security.10')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.security.11')}</h4>
                                    <ul>
                                        <RichText k="site.doc.security.12" as="li" />
                                        <li>{t('site.doc.security.13')}</li>
                                        <li>{t('site.doc.security.14')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.security.15')}</h4>
                                    <RichText k="site.doc.security.16" as="p" />
                                    <p>{t('site.doc.security.17')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.security.18')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.security.19')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.security.20')}</h4>
                                    <ul>
                                        <RichText k="site.doc.security.21" as="li" />
                                        <li>{t('site.doc.security.22')}</li>
                                        <RichText k="site.doc.security.23" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.security.24')}</h4>
                                    <ul>
                                        <RichText k="site.doc.security.25" as="li" />
                                        <li>{t('site.doc.security.26')}</li>
                                        <li>{t('site.doc.security.27')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail 9 */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-2)">
                                <path d="M-20 35C80 10 200 50 320 28C440 6 540 48 650 25C700 15 720 30 720 30" stroke="#393BFF" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== UPDATES & AUTO-UPDATE ==================== */}
                    <div className="doc-section" id="updates">
                        <h2>{t('site.doc.updates.1')}</h2>
                        <p>{t('site.doc.updates.2')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.updates.3')}</h3>
                            <RichText k="site.doc.updates.4" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.updates.5')}</h4>
                                    <ul>
                                        <li>{t('site.doc.updates.6')}</li>
                                        <li>{t('site.doc.updates.7')}</li>
                                        <li>{t('site.doc.updates.8')}</li>
                                        <li>{t('site.doc.updates.9')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.updates.10')}</h4>
                                    <p>{t('site.doc.updates.11')}</p>
                                    <p>{t('site.doc.updates.12')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.updates.13')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.updates.14')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.updates.15')}</h4>
                                    <ul>
                                        <li>{t('site.doc.updates.16')}</li>
                                        <RichText k="site.doc.updates.17" as="li" />
                                        <li>{t('site.doc.updates.18')}</li>
                                        <li>{t('site.doc.updates.19')}</li>
                                        <li>{t('site.doc.updates.20')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.updates.21')}</h4>
                                    <RichText k="site.doc.updates.22" as="p" />
                                    <p>{t('site.doc.updates.23')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.updates.24')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.updates.25')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.updates.26')}</h4>
                                    <RichText k="site.doc.updates.27" as="p" />
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.updates.28')}</h4>
                                    <p>{t('site.doc.updates.29')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail: Updates → Environments */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-1)">
                                <path d="M-20 30C100 55 220 5 350 32C480 59 560 10 680 30C710 35 720 30 720 30" stroke="#FF0000" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    {/* ==================== SUPPORTED ENVIRONMENTS ==================== */}
                    <div className="doc-section" id="environments">
                        <h2>{t('site.doc.environments.1')}</h2>
                        <p>{t('site.doc.environments.2')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.environments.3')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.environments.4')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.5')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.6" as="li" />
                                        <RichText k="site.doc.environments.7" as="li" />
                                        <RichText k="site.doc.environments.8" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.9')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.10" as="li" />
                                        <RichText k="site.doc.environments.11" as="li" />
                                        <RichText k="site.doc.environments.12" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.environments.13')}</h3>
                            <RichText k="site.doc.environments.14" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.15')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.16" as="li" />
                                        <RichText k="site.doc.environments.17" as="li" />
                                        <RichText k="site.doc.environments.18" as="li" />
                                        <RichText k="site.doc.environments.19" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.20')}</h4>
                                    <ul>
                                        <li>{t('site.doc.environments.21')}</li>
                                        <RichText k="site.doc.environments.22" as="li" />
                                        <li>{t('site.doc.environments.23')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.environments.24')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.environments.25')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.26')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.27" as="li" />
                                        <RichText k="site.doc.environments.28" as="li" />
                                        <RichText k="site.doc.environments.29" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.30')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.31" as="li" />
                                        <RichText k="site.doc.environments.32" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.environments.33')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.environments.34')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.35')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.36" as="li" />
                                        <RichText k="site.doc.environments.37" as="li" />
                                        <RichText k="site.doc.environments.38" as="li" />
                                        <RichText k="site.doc.environments.39" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.environments.40')}</h4>
                                    <ul>
                                        <RichText k="site.doc.environments.41" as="li" />
                                        <RichText k="site.doc.environments.42" as="li" />
                                        <RichText k="site.doc.environments.43" as="li" />
                                        <RichText k="site.doc.environments.44" as="li" />
                                        <RichText k="site.doc.environments.45" as="li" />
                                        <RichText k="site.doc.environments.46" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trail: Environments → FAQ */}
                    <div className="doc-trail">
                        <svg viewBox="0 0 700 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#trail-texture-2)">
                                <path d="M-20 35C80 10 200 50 320 28C440 6 540 48 650 25C700 15 720 30 720 30" stroke="#393BFF" strokeWidth="6" strokeLinecap="round" />
                            </g>
                        </svg>
                    </div>

                    <div className="doc-section" id="troubleshooting">
                        <h2>{t('site.doc.troubleshooting.1')}</h2>
                        <p>{t('site.doc.troubleshooting.2')}</p>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.3')}</h3>
                            <RichText k="site.doc.troubleshooting.4" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.5')}</h4>
                                    <p>{t('site.doc.troubleshooting.6')}</p>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.7')}</h4>
                                    <pre style={{ margin: '0' }}><code>&#123;
      &#34;version&#34;: &#34;0.63.1&#34;,
      &#34;repositories&#34;: &#123;
        &#34;my-repo&#34;: &#123;
          &#34;path&#34;: &#34;/path/to/repo&#34;,
          &#34;keywords&#34;: [&#34;backend&#34;]
        &#125;
      &#125;
    &#125;</code></pre>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.8')}</h3>
                            <RichText k="site.doc.troubleshooting.9" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.10')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.11" as="li" />
                                        <RichText k="site.doc.troubleshooting.12" as="li" />
                                        <RichText k="site.doc.troubleshooting.13" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.14')}</h4>
                                    <pre style={{ margin: '0' }}><code>cd /path/to/main-repo
    git worktree remove ../repo-PROJ-123</code></pre>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.15')}</h3>
                            <RichText k="site.doc.troubleshooting.16" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.17')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.18')}</li>
                                        <li>{t('site.doc.troubleshooting.19')}</li>
                                    </ul>
                                    <p>{t('site.doc.troubleshooting.20')}</p>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.21')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.22')}</li>
                                        <li>{t('site.doc.troubleshooting.23')}</li>
                                        <li>{t('site.doc.troubleshooting.24')}</li>
                                    </ul>
                                    <p>{t('site.doc.troubleshooting.25')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.26')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.27')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.28')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.29')}</li>
                                        <li>{t('site.doc.troubleshooting.30')}</li>
                                        <li>{t('site.doc.troubleshooting.31')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.32')}</h4>
                                    <p>{t('site.doc.troubleshooting.33')}</p>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.34')}</li>
                                        <li>{t('site.doc.troubleshooting.35')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.36')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.37')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.38')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.39')}</li>
                                        <li>{t('site.doc.troubleshooting.40')}</li>
                                        <li>{t('site.doc.troubleshooting.41')}</li>
                                        <li>{t('site.doc.troubleshooting.42')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.43')}</h4>
                                    <pre style={{ margin: '0' }}><code>claude mcp list</code></pre>
                                    <RichText k="site.doc.troubleshooting.44" as="p" />
                                    <pre style={{ margin: '0' }}><code>claude mcp add atlassian --transport http
    claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=&#34;ghp_...&#34;</code></pre>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.45')}</h3>
                            <RichText k="site.doc.troubleshooting.46" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.47')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.48')}</li>
                                        <li>{t('site.doc.troubleshooting.49')}</li>
                                        <RichText k="site.doc.troubleshooting.50" as="li" />
                                        <li>{t('site.doc.troubleshooting.51')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.52')}</h4>
                                    <pre style={{ margin: '0' }}><code># Check remote status
    git remote -v
    git push --dry-run

    # Check existing PRs
    gh pr list --head $(git branch --show-current)</code></pre>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.53')}</h3>
                            <RichText k="site.doc.troubleshooting.54" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.55')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.56" as="li" />
                                        <RichText k="site.doc.troubleshooting.57" as="li" />
                                        <RichText k="site.doc.troubleshooting.58" as="li" />
                                    </ul>
                                    <p>{t('site.doc.troubleshooting.59')}</p>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.60')}</h4>
                                    <RichText k="site.doc.troubleshooting.61" as="p" />
                                    <pre style={{ margin: '0' }}><code>&#34;my-api&#34;: &#123;
      &#34;keywords&#34;: [&#34;backend&#34;, &#34;api&#34;, &#34;server&#34;, &#34;graphql&#34;]
    &#125;,
    &#34;my-web&#34;: &#123;
      &#34;keywords&#34;: [&#34;frontend&#34;, &#34;ui&#34;, &#34;react&#34;, &#34;dashboard&#34;]
    &#125;</code></pre>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ marginTop: '3rem' }}>{t('site.doc.troubleshooting.62')}</h3>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.63')}</h3>
                            <RichText k="site.doc.troubleshooting.64" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.65')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.66')}</li>
                                        <li>{t('site.doc.troubleshooting.67')}</li>
                                        <li>{t('site.doc.troubleshooting.68')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.69')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.70')}</li>
                                        <li>{t('site.doc.troubleshooting.71')}</li>
                                        <li>{t('site.doc.troubleshooting.72')}</li>
                                    </ul>
                                    <p>{t('site.doc.troubleshooting.73')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.74')}</h3>
                            <RichText k="site.doc.troubleshooting.75" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.76')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.77" as="li" />
                                        <RichText k="site.doc.troubleshooting.78" as="li" />
                                        <RichText k="site.doc.troubleshooting.79" as="li" />
                                        <RichText k="site.doc.troubleshooting.80" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.81')}</h4>
                                    <RichText k="site.doc.troubleshooting.82" as="p" />
                                    <p>{t('site.doc.troubleshooting.83')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.84')}</h3>
                            <RichText k="site.doc.troubleshooting.85" as="p" className="doc-skill-desc" />
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.86')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.87')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.88')}</h4>
                                    <pre style={{ margin: '0' }}><code>bash &lt;(curl -fsSL https://magic-slash.io/uninstall.sh)</code></pre>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.89')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.90" as="li" />
                                        <RichText k="site.doc.troubleshooting.91" as="li" />
                                        <RichText k="site.doc.troubleshooting.92" as="li" />
                                        <RichText k="site.doc.troubleshooting.93" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.94')}</h3>
                            <RichText k="site.doc.troubleshooting.95" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.96')}</h4>
                                    <p>{t('site.doc.troubleshooting.96b')}</p>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.97')}</h4>
                                    <pre style={{ margin: '0' }}><code>ls ~/.claude/skills/magic-*/SKILL.md</code></pre>
                                    <p>{t('site.doc.troubleshooting.98')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.99')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.100')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.101')}</h4>
                                    <RichText k="site.doc.troubleshooting.102" as="p" />
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.103')}</h4>
                                    <RichText k="site.doc.troubleshooting.104" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.105')}</h3>
                            <RichText k="site.doc.troubleshooting.106" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.107')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.108')}</li>
                                        <li>{t('site.doc.troubleshooting.109')}</li>
                                        <li>{t('site.doc.troubleshooting.110')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.111')}</h4>
                                    <p>{t('site.doc.troubleshooting.112')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.113')}</h3>
                            <RichText k="site.doc.troubleshooting.114" as="p" className="doc-skill-desc" />
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.115')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.116" as="li" />
                                        <RichText k="site.doc.troubleshooting.117" as="li" />
                                        <RichText k="site.doc.troubleshooting.118" as="li" />
                                        <RichText k="site.doc.troubleshooting.119" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.120')}</h4>
                                    <pre style={{ margin: '0' }}><code>&#34;commit&#34;: &#123;
      &#34;format&#34;: &#34;angular&#34;,
      &#34;style&#34;: &#34;single-line&#34;,
      &#34;coAuthor&#34;: false,
      &#34;includeTicketId&#34;: true
    &#125;</code></pre>
                                    <RichText k="site.doc.troubleshooting.121" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.122')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.123')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.124')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.125" as="li" />
                                        <RichText k="site.doc.troubleshooting.126" as="li" />
                                        <RichText k="site.doc.troubleshooting.127" as="li" />
                                    </ul>
                                    <p>{t('site.doc.troubleshooting.128')}</p>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.129')}</h4>
                                    <RichText k="site.doc.troubleshooting.130" as="p" />
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.131" as="li" />
                                        <RichText k="site.doc.troubleshooting.132" as="li" />
                                    </ul>
                                    <RichText k="site.doc.troubleshooting.133" as="p" />
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.134')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.135')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.136')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.137')}</li>
                                        <li>{t('site.doc.troubleshooting.138')}</li>
                                        <RichText k="site.doc.troubleshooting.139" as="li" />
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.140')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.141" as="li" />
                                        <RichText k="site.doc.troubleshooting.142" as="li" />
                                        <RichText k="site.doc.troubleshooting.143" as="li" />
                                        <RichText k="site.doc.troubleshooting.144" as="li" />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.145')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.146')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.147')}</h4>
                                    <ul>
                                        <RichText k="site.doc.troubleshooting.148" as="li" />
                                        <li>{t('site.doc.troubleshooting.149')}</li>
                                        <li>{t('site.doc.troubleshooting.150')}</li>
                                        <li>{t('site.doc.troubleshooting.151')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.152')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.153')}</li>
                                        <li>{t('site.doc.troubleshooting.154')}</li>
                                        <li>{t('site.doc.troubleshooting.155')}</li>
                                    </ul>
                                    <p>{t('site.doc.troubleshooting.156')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="doc-skill">
                            <h3>{t('site.doc.troubleshooting.157')}</h3>
                            <p className="doc-skill-desc">{t('site.doc.troubleshooting.158')}</p>
                            <div className="doc-skill-details">
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.159')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.160')}</li>
                                        <li>{t('site.doc.troubleshooting.161')}</li>
                                        <li>{t('site.doc.troubleshooting.162')}</li>
                                        <li>{t('site.doc.troubleshooting.163')}</li>
                                    </ul>
                                </div>
                                <div className="doc-skill-col">
                                    <h4>{t('site.doc.troubleshooting.164')}</h4>
                                    <ul>
                                        <li>{t('site.doc.troubleshooting.165')}</li>
                                        <li>{t('site.doc.troubleshooting.166')}</li>
                                        <li>{t('site.doc.troubleshooting.167')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Changelog ── */}
                    <div className="doc-section" id="changelog">
                        <h2>{t('site.doc.changelog.1')}</h2>
                        <p>
                            {t('site.doc.changelog.intro')}{' '}
                            <a
                                href="https://github.com/xrequillart/magic-slash/blob/main/CHANGELOG.md"
                                target="_blank"
                                rel="noreferrer"
                            >
                                CHANGELOG.md
                            </a>
                        </p>
                        <Changelog versions={versions} />
                    </div>
    </>
  )
}
