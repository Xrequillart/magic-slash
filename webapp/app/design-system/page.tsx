import { notFound } from 'next/navigation'
import { Shell } from './Shell'

/**
 * The DESKTOP app's design system, rendered on the site.
 *
 * The components are the real ones: `design-system/desktop/` is compiled into this
 * bundle by Next and into the renderer by Vite, so what is on this page and what
 * ships in Electron are one file. Nothing here is a mock-up, and nothing here can
 * drift — that was the whole reason for the shared folder.
 *
 * `/design-system-web` is the other one, and the two share nothing on purpose: a
 * light canvas with one theme against a dark window with eight.
 *
 * DEVELOPMENT ONLY, for the reason its sibling gives — it is a workbench, not a
 * page of the product, and `notFound()` in production means the route does not
 * exist there rather than merely being unlinked.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <Shell />
}
