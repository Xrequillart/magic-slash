import type { Metadata } from 'next'
import { loadChangelog } from '@/lib/changelog'
import { DocSidebar } from '@/components/site/documentation/DocSidebar'
import { DocContent } from '@/components/site/documentation/DocContent'
import './doc.css'

/**
 * magic-slash.io/documentation — ported from `docs/documentation.html`.
 *
 * A SERVER component, which is the point: it reads CHANGELOG.md from disk at build
 * time and hands the parsed versions to the client tree. The static page fetched that
 * file from raw.githubusercontent.com on every visit.
 */

export const metadata: Metadata = {
  title: 'Documentation — magic-slash',
  description: 'Everything you need to get started with magic-slash.',
}

export default function DocumentationPage() {
  const versions = loadChangelog()

  return (
    <div className="doc-layout">
      <DocSidebar />
      <div className="doc-main">
        <main className="doc-page">
          <DocContent versions={versions} />
        </main>
      </div>
    </div>
  )
}
