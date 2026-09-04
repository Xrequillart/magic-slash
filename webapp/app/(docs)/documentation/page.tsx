import type { Metadata } from 'next'
import { DocSidebar } from '@/components/site/documentation/DocSidebar'
import { DocContent } from '@/components/site/documentation/DocContent'
import './doc.css'

/**
 * magic-slash.io/documentation — ported from `docs/documentation.html`.
 *
 * IT NO LONGER READS `CHANGELOG.md`. This page used to be a server component for exactly
 * that reason: it loaded the file off the disk at build time and handed the parsed
 * versions to the client tree, where the last of its sixteen sections rendered them. The
 * releases now have a page of their own at `/changelog` — see
 * `app/(marketing)/changelog/page.tsx` — and the section here is a signpost to it, so
 * there is nothing left for this file to read.
 *
 * It stays a server component all the same, because it does not need to be anything
 * else: `metadata` cannot be exported from a `'use client'` module, and the two children
 * below declare their own boundary.
 */

export const metadata: Metadata = {
  title: 'Documentation — magic-slash',
  description: 'Everything you need to get started with magic-slash.',
}

export default function DocumentationPage() {
  return (
    <div className="doc-layout">
      <DocSidebar />
      <div className="doc-main">
        <main className="doc-page">
          <DocContent />
        </main>
      </div>
    </div>
  )
}
