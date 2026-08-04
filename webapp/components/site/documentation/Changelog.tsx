'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/useLanguage'
import type { ChangelogVersion } from '@/lib/changelog'
import { GITHUB_REPO_URL } from '@/components/site/links'

/**
 * The changelog section, rendered from data the page already has.
 *
 * The versions arrive as a prop from the server component that read CHANGELOG.md at
 * build time — see `lib/changelog.ts` for why that replaced a runtime fetch. All this
 * does is paginate them, which is what the original's "Show more" button did.
 *
 * The entries themselves stay in English in both languages: they are written from
 * commit messages at release time, and there is no French source to render.
 */

/** How many versions are shown before the reader asks for more. */
const PER_PAGE = 15

export function Changelog({ versions }: { versions: ChangelogVersion[] }) {
  const { t } = useT()
  const [visible, setVisible] = useState(PER_PAGE)

  if (versions.length === 0) {
    return (
      <p className="changelog-error">
        {t('site.doc.changelog.unavailable')}{' '}
        <a href={`${GITHUB_REPO_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">
          {t('site.doc.changelog.viewOnGithub')}
        </a>
      </p>
    )
  }

  return (
    <>
      <div id="changelogContent">
        {versions.slice(0, visible).map((version) => (
          <div className="changelog-version" key={version.version}>
            <div className="changelog-version-head">
              <span className="changelog-version-number">v{version.version}</span>
              <span className="changelog-version-date">{version.date}</span>
            </div>
            {version.categories.map((category) => (
              <div className="changelog-category" key={category.type}>
                <span className={`changelog-badge changelog-badge-${category.type.toLowerCase()}`}>
                  {category.type}
                </span>
                <ul className="changelog-items">
                  {category.items.map((item, index) => (
                    // Index is a legitimate key here: the list is static build-time
                    // data that is never reordered, inserted into, or filtered.
                    <li key={index}>
                      {item.component && (
                        <span className="changelog-component">{item.component}</span>
                      )}
                      {item.component ? ': ' : ''}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>

      {visible < versions.length && (
        <button
          type="button"
          className="changelog-load-more"
          onClick={() => setVisible((shown) => shown + PER_PAGE)}
        >
          {t('site.doc.changelog.showMore')}
        </button>
      )}
    </>
  )
}
