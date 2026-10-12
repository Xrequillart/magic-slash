import { Shell } from './Shell'

/**
 * The DESKTOP app's design system, rendered on the site: `/design-system/desktop`,
 * reached from the design system's home page at `/design-system`.
 *
 * The components are the real ones: `design-system/desktop/` is compiled into this
 * bundle by Next and into the renderer by Vite, so what is on this page and what
 * ships in Electron are one file. Nothing here is a mock-up, and nothing here can
 * drift — that was the whole reason for the shared folder.
 *
 * `/design-system/webapp` is the other one, and the two share nothing on purpose: a
 * light canvas with one theme against a dark window with eight.
 *
 * PUBLISHED, where its sibling is still development-only. It 404'd in production for
 * as long as it was a workbench; it is a page now, by request. The two gates that kept
 * it off the public site were this one and `PUBLIC_PATHS` in `lib/hostRouting.ts` —
 * the second still has to list the path, or the apex sends a reader to a login form on
 * `app.magic-slash.io` rather than serving the page.
 *
 * NOTHING HERE IS PRIVATE. The components are compiled from `design-system/desktop/`,
 * a folder in a public repository, and the page renders them rather than describing
 * them — there is no internal the source does not already state. `/design-system/webapp`
 * is the opposite case and stays behind its `notFound()`: it documents the site's own
 * `components/ui.tsx`, which nobody outside the repo has a reason to read.
 */
export default function DesignSystemPage() {
  return <Shell />
}
