'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The seven-step walkthrough: a sticky terminal on one side, a scrolling list of steps
 * on the other, with the terminal switching to whichever step is nearest the middle of
 * the viewport.
 *
 * The switching is imperative and scoped to this section — the same read-and-toggle
 * loop `docs/script.js` used, moved onto a ref. It stays out of React state because it
 * runs on every scroll frame: routing it through a re-render would re-render 116
 * elements to change two class names.
 */

/** The accent each step's dot takes when it becomes the active one. */
const STEP_COLORS = ['#6366f1', '#6366f1', '#a855f7', '#22c55e', '#06b6d4', '#f97316', '#22c55e']

export function FlowSection() {
  const { t } = useT()
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = section.current
    if (!root) return

    const steps = Array.from(root.querySelectorAll('.flow-step'))
    const contents = Array.from(root.querySelectorAll('.flow-terminal-content'))
    const dots = Array.from(root.querySelectorAll<HTMLElement>('.flow-mockup-dot'))
    if (!steps.length) return

    let current = -1
    let ticking = false

    const setActiveStep = (index: number) => {
      if (index === current) return
      current = index
      steps.forEach((step, i) => step.classList.toggle('active', i === index))
      contents.forEach((content, i) => content.classList.toggle('active', i === index))
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index)
        dot.style.background = i === index ? STEP_COLORS[i] : ''
      })
    }

    const update = () => {
      ticking = false
      const rect = root.getBoundingClientRect()
      // Nothing to decide while the section is off screen.
      if (rect.bottom < 0 || rect.top > window.innerHeight) return

      const viewportCenter = window.innerHeight / 2
      let closest = 0
      let closestDistance = Infinity
      steps.forEach((step, i) => {
        const box = step.getBoundingClientRect()
        const distance = Math.abs(viewportCenter - (box.top + box.height / 2))
        if (distance < closestDistance) {
          closestDistance = distance
          closest = i
        }
      })
      setActiveStep(closest)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    setActiveStep(0)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="flow-section" ref={section}>
        <div className="flow-inner">
            <div className="flow-header">
                <h2 className="flow-title">{t('site.flow.title')}</h2>
                <p className="flow-subtitle">{t('site.flow.subtitle')}</p>
            </div>
            <div className="flow-container">
                <div className="flow-sticky-col">
                    <div className="flow-mockup">
                        <div className="flow-mockup-bar">
                            <span></span><span></span><span></span>
                        </div>
                        <div className="flow-mockup-body">
                            {/* Step 1: /magic:start */}
                            <div className="flow-terminal-content active" data-flow-content="1">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:start PROJ-142</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Fetching Jira ticket PROJ-142&hellip;</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Analysing ticket&hellip;</span><span className="flow-result">BACKEND</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Creating worktree&hellip;</span><span className="flow-result">feature/PROJ-142</span></div>
                                <div className="flow-line success"><span className="flow-check"><Check size={16} /></span><span>Ready! Starting work&hellip;</span></div>
                            </div>
                            {/* Step 2: /magic:continue */}
                            <div className="flow-terminal-content" data-flow-content="2">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:continue PROJ-142</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Finding worktree&hellip;</span><span className="flow-result">feature/PROJ-142</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Loading ticket context&hellip;</span><span className="flow-result">PROJ-142</span></div>
                                <div className="flow-line success"><span className="flow-check"><Check size={16} /></span><span>Resuming work&hellip;</span></div>
                            </div>
                            {/* Step 3: /magic:commit */}
                            <div className="flow-terminal-content" data-flow-content="3">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:commit</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Staging changes&hellip;</span><span className="flow-result">3 files staged</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Generating commit message&hellip;</span></div>
                                <div className="flow-line commit-msg"><span className="flow-check"><Check size={16} /></span><span>feat(auth): add JWT middleware</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Committing&hellip;</span><span className="flow-result">Commit created!</span></div>
                            </div>
                            {/* Step 4: /magic:pr */}
                            <div className="flow-terminal-content" data-flow-content="4">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:pr</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Pushing to remote&hellip;</span><span className="flow-result">origin/feature/PROJ-142</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Creating pull request&hellip;</span><span className="flow-result">PR #87 created</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Updating Jira ticket&hellip;</span><span className="flow-result">PROJ-142 &rarr; &#34;To be reviewed&#34;</span></div>
                            </div>
                            {/* Step 5: /magic:review */}
                            <div className="flow-terminal-content" data-flow-content="5">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:review 87</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Fetching PR #87&hellip;</span><span className="flow-result">3 files, +10 &minus;1</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Reviewing code&hellip;</span><span className="flow-result">2 comments</span></div>
                                <div className="flow-line success"><span className="flow-check"><Check size={16} /></span><span>Approved with suggestions</span></div>
                            </div>
                            {/* Step 6: /magic:resolve */}
                            <div className="flow-terminal-content" data-flow-content="6">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:resolve</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Fetching review comments&hellip;</span><span className="flow-result">2 comments</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Applying fixes&hellip;</span><span className="flow-result">2 files updated</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Force-pushing&hellip;</span><span className="flow-result">All comments resolved</span></div>
                            </div>
                            {/* Step 7: /magic:done */}
                            <div className="flow-terminal-content" data-flow-content="7">
                                <div className="flow-cmd"><span className="flow-prompt">&#10095;</span> /magic:done</div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Merging PR #87&hellip;</span><span className="flow-result">Merged</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Cleaning up branch&hellip;</span><span className="flow-result">feature/PROJ-142 deleted</span></div>
                                <div className="flow-line"><span className="flow-check"><Check size={16} /></span><span>Transitioning Jira&hellip;</span><span className="flow-result">PROJ-142 &rarr; &#34;Done&#34;</span></div>
                                <div className="flow-line flow-success-banner"><span className="flow-check"><Check size={16} /></span><span>Task complete!</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flow-steps-col">
                    <div className="flow-step active" data-flow-step="1">
                        <span className="flow-step-number">01</span>
                        <span className="flow-step-cmd">/magic:start</span>
                        <h3 className="flow-step-title">{t('site.flow.step1Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step1Desc')}</p>
                    </div>
                    <div className="flow-step" data-flow-step="2">
                        <span className="flow-step-number">02</span>
                        <span className="flow-step-cmd">/magic:continue</span>
                        <h3 className="flow-step-title">{t('site.flow.step2Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step2Desc')}</p>
                    </div>
                    <div className="flow-step" data-flow-step="3">
                        <span className="flow-step-number">03</span>
                        <span className="flow-step-cmd">/magic:commit</span>
                        <h3 className="flow-step-title">{t('site.flow.step3Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step3Desc')}</p>
                    </div>
                    <div className="flow-step" data-flow-step="4">
                        <span className="flow-step-number">04</span>
                        <span className="flow-step-cmd">/magic:pr</span>
                        <h3 className="flow-step-title">{t('site.flow.step4Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step4Desc')}</p>
                    </div>
                    <div className="flow-step" data-flow-step="5">
                        <span className="flow-step-number">05</span>
                        <span className="flow-step-cmd">/magic:review</span>
                        <h3 className="flow-step-title">{t('site.flow.step5Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step5Desc')}</p>
                    </div>
                    <div className="flow-step" data-flow-step="6">
                        <span className="flow-step-number">06</span>
                        <span className="flow-step-cmd">/magic:resolve</span>
                        <h3 className="flow-step-title">{t('site.flow.step6Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step6Desc')}</p>
                    </div>
                    <div className="flow-step" data-flow-step="7">
                        <span className="flow-step-number">07</span>
                        <span className="flow-step-cmd">/magic:done</span>
                        <h3 className="flow-step-title">{t('site.flow.step7Title')}</h3>
                        <p className="flow-step-desc">{t('site.flow.step7Desc')}</p>
                        <Link href="/documentation#quick-start" className="flow-step-cta">
                            {t('site.flow.cta')} <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}
