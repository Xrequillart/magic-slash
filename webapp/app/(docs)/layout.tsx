import { BOOT_DOC_THEME } from '@/components/site/documentation/useDocTheme'
import '../(marketing)/marketing.css'

/**
 * The Documentation page's shell.
 *
 * Its own route group, not part of `(marketing)`: this page has no site header and no
 * footer — a full-height sidebar takes their place — and it is the only page on the
 * site with a dark theme. Putting it under the marketing layout would give it chrome
 * it was never designed around.
 *
 * It still imports `marketing.css`, because the static page loaded `styles.css` too:
 * the shared typography and the logo come from there. `doc.css` is imported by the
 * page itself and lands after it, so the documentation palette wins.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Sets `data-theme` before the first paint, so a reader who chose dark never
          gets a white flash. See useDocTheme for why the rule is duplicated as ES5. */}
      <script dangerouslySetInnerHTML={{ __html: BOOT_DOC_THEME }} />
      {children}
    </>
  )
}
