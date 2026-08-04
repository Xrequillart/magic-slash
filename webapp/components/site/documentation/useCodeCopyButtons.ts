'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/useLanguage'

/**
 * Puts a copy button on every code block in the documentation.
 *
 * There are 27 `<pre>` blocks in this page, written as literal JSX because they are
 * shell and JSON that never change between languages. Wrapping each one in a component
 * would mean editing 27 generated blocks; adding the button from an effect keeps the
 * markup exactly as it was converted, which is the point of the whole port.
 *
 * The effect RE-RUNS on a language change and removes its own buttons first. That is
 * not defensive tidying: `DocContent` re-renders when the language changes, React
 * reconciles the children of each `<pre>` against what it rendered, and a stray node it
 * did not create is exactly the kind of thing that ends up duplicated or orphaned.
 * Owning the whole lifecycle here avoids arguing with the reconciler about it.
 */

/** How long the button shows "copied" before returning to its normal state. */
const FEEDBACK_MS = 2000

const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'

const CHECK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'

export function useCodeCopyButtons() {
  const lang = useLanguage()

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const buttons: HTMLButtonElement[] = []

    document.querySelectorAll<HTMLPreElement>('.doc-page pre').forEach((pre) => {
      // A previous run's button, if React kept it around.
      pre.querySelector('.doc-copy-btn')?.remove()

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'doc-copy-btn'
      button.innerHTML = COPY_ICON
      button.setAttribute('aria-label', lang === 'fr' ? 'Copier le code' : 'Copy code')

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code')
        try {
          await navigator.clipboard.writeText(code?.textContent ?? pre.textContent ?? '')
        } catch {
          // Clipboard denied or insecure origin. The code is on screen and selectable.
          return
        }
        button.innerHTML = CHECK_ICON
        timers.push(
          setTimeout(() => {
            button.innerHTML = COPY_ICON
          }, FEEDBACK_MS),
        )
      })

      pre.appendChild(button)
      buttons.push(button)
    })

    return () => {
      timers.forEach(clearTimeout)
      buttons.forEach((button) => button.remove())
    }
  }, [lang])
}
