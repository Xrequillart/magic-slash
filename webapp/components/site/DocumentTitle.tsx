'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n/useLanguage'
import { PAGE_TITLES, type TitledPath } from '@/lib/pageTitles'

/**
 * THE TAB'S TITLE IN THE READER'S LANGUAGE. The server sent the English one (see
 * `lib/pageTitles.ts` for why it could not do better); this swaps it once the browser
 * knows the language, and again when the reader changes it or navigates.
 *
 * A LATE WRITE ON NAVIGATION, and it is deliberate: on a client-side route change the
 * router applies the new page's `metadata.title` itself, and that can land after this
 * effect. One frame later is after it, so the reader's language has the last word.
 */
export function DocumentTitle() {
  const { t } = useT()
  const pathname = usePathname()

  useEffect(() => {
    const key = PAGE_TITLES[pathname as TitledPath]
    if (!key) return
    const title = t(key)
    document.title = title
    const frame = window.requestAnimationFrame(() => {
      document.title = title
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname, t])

  return null
}
