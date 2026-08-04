'use client'

import { BookOpen, Edit3, GitBranch, GitCommit, MessageCircle, Trash2 } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { RichText } from '@/components/site/RichText'
import { LOGIN_PATH } from '@/lib/routes'
import { useTimelineScroll } from './useTimelineScroll'

/**
 * The Story page: what the workflow looked like before, and how the product got here.
 *
 * Mechanically converted from the static page in `docs/`; the classes and structure
 * are the original's, so the ported stylesheet applies unchanged.
 */
export function StoryContent() {
  const { t } = useT()
  // The timeline scrolls sideways as the page scrolls down.
  useTimelineScroll()

  return (
    <>

    {/* Hero */}
    <div className="story-hero">
        <div className="story-hero-label">{t('site.story.label')}</div>
        <RichText k="site.story.heroTitle" as="h1" />
        <p className="story-hero-intro">{t('site.story.heroIntro')}</p>
    </div>

    {/* Pain Points */}
    <div className="story-pain">
        <h2 className="story-pain-title">{t('site.story.painTitle')}</h2>
        <p className="story-pain-subtitle">{t('site.story.painSubtitle')}</p>
        <div className="story-pain-grid">
            <div className="story-pain-card">
                <div className="story-pain-card-icon"><BookOpen size={16} /></div>
                <h3>{t('site.story.pain1Title')}</h3>
                <p>{t('site.story.pain1Desc')}</p>
            </div>
            <div className="story-pain-card">
                <div className="story-pain-card-icon"><GitBranch size={16} /></div>
                <h3>{t('site.story.pain2Title')}</h3>
                <p>{t('site.story.pain2Desc')}</p>
            </div>
            <div className="story-pain-card">
                <div className="story-pain-card-icon"><Edit3 size={16} /></div>
                <h3>{t('site.story.pain3Title')}</h3>
                <p>{t('site.story.pain3Desc')}</p>
            </div>
            <div className="story-pain-card">
                <div className="story-pain-card-icon"><GitCommit size={16} /></div>
                <h3>{t('site.story.pain4Title')}</h3>
                <p>{t('site.story.pain4Desc')}</p>
            </div>
            <div className="story-pain-card">
                <div className="story-pain-card-icon"><MessageCircle size={16} /></div>
                <h3>{t('site.story.pain5Title')}</h3>
                <p>{t('site.story.pain5Desc')}</p>
            </div>
            <div className="story-pain-card">
                <div className="story-pain-card-icon"><Trash2 size={16} /></div>
                <h3>{t('site.story.pain6Title')}</h3>
                <p>{t('site.story.pain6Desc')}</p>
            </div>
        </div>
    </div>

    {/* Timeline */}
    <div className="story-timeline-scroll-container">
    <section className="story-timeline-section">
        <div className="story-timeline-inner">
            <h2 className="story-timeline-title">{t('site.story.timelineTitle')}</h2>
            <p className="story-timeline-subtitle">{t('site.story.timelineSubtitle')}</p>

            <div className="story-timeline">
                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl1Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl1Title')}</div>
                    <p className="story-tl-desc">{t('site.story.tl1Desc')}</p>
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl2Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl2Title')}</div>
                    <p className="story-tl-desc">{t('site.story.tl2Desc')}</p>
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl3Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl3Title')}</div>
                    <RichText k="site.story.tl3Desc" as="p" className="story-tl-desc" />
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl4Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl4Title')}</div>
                    <RichText k="site.story.tl4Desc" as="p" className="story-tl-desc" />
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl5Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl5Title')}</div>
                    <p className="story-tl-desc">{t('site.story.tl5Desc')}</p>
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl6Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl6Title')}</div>
                    <p className="story-tl-desc">{t('site.story.tl6Desc')}</p>
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl7Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl7Title')}</div>
                    <RichText k="site.story.tl7Desc" as="p" className="story-tl-desc" />
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl8Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl8Title')}</div>
                    <p className="story-tl-desc">{t('site.story.tl8Desc')}</p>
                </div>

                <div className="story-tl-item">
                    <span className="story-tl-dot"></span>
                    <div className="story-tl-date">{t('site.story.tl9Date')}</div>
                    <div className="story-tl-heading">{t('site.story.tl9Title')}</div>
                    <p className="story-tl-desc">{t('site.story.tl9Desc')}</p>
                </div>
            </div>
        </div>
    </section>
    </div>

    {/* CTA */}
    <section className="cta-section">
        <div className="cta-inner">
            <img src="/img/mascot-ninja-blue.png" alt="magic-slash mascot" className="cta-mascot" />
            <div className="cta-content">
                <h2 className="cta-title">{t('site.cta.title')}</h2>
                <p className="cta-subtitle">{t('site.cta.subtitle')}</p>
                {/* A plain anchor: this leaves for the app host — see `lib/routes.ts`. */}
                <a href={LOGIN_PATH} className="btn-get-started cta-btn">
                    {t('site.cta.button')}
                </a>
            </div>
        </div>
    </section>

    {/* Footer */}
    </>
  )
}
