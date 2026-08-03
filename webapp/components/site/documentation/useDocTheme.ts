'use client'

import { useEffect, useState } from 'react'

/**
 * The Documentation page's light/dark switch.
 *
 * The theme lives on `<html data-theme>` because that is what `doc.css` keys its whole
 * palette off, and it is remembered in localStorage under the key the static page
 * already used (`doc-theme`), so a reader who picked dark on magic-slash.io/docs keeps
 * it here.
 *
 * SCOPED TO THIS PAGE, deliberately. The signed-in app has no dark mode, and the
 * attribute is removed on unmount so navigating from the docs to the dashboard cannot
 * leave a stray `data-theme="dark"` on a page with no dark palette to match it.
 */

const STORAGE_KEY = 'doc-theme'

type Theme = 'light' | 'dark'

/**
 * Applied before paint by the inline script in the docs layout, and mirrored here.
 * The two must agree: this is the fallback the script also uses.
 */
export const DEFAULT_DOC_THEME: Theme = 'light'

export function useDocTheme() {
  // Starts at the default so the server and the first client render agree; the effect
  // below corrects it to whatever the boot script already put on <html>.
  const [theme, setTheme] = useState<Theme>(DEFAULT_DOC_THEME)

  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme')
    setTheme(applied === 'dark' ? 'dark' : 'light')

    return () => {
      // Leaving the docs: hand <html> back the way it was found.
      document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private mode. The choice still applies to this page load.
    }
  }

  return { theme, toggle }
}

/**
 * Runs before the first paint, so a reader who chose dark never sees a white flash.
 * Plain ES5 in a blocking script tag — no imports — which is why the storage key and
 * the default are repeated here rather than imported.
 */
export const BOOT_DOC_THEME = `
try {
  var stored = window.localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : ${JSON.stringify(DEFAULT_DOC_THEME)});
} catch (e) {
  document.documentElement.setAttribute('data-theme', ${JSON.stringify(DEFAULT_DOC_THEME)});
}
`.trim()
