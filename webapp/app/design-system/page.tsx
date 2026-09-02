import { notFound } from 'next/navigation'
import { Gallery } from './Gallery'

/**
 * The design system, rendered. Every variant of every primitive in
 * `components/ui.tsx`, on one scrollable page, so a change to the scale can be
 * judged by looking instead of by reading a diff.
 *
 * DEVELOPMENT ONLY. It is a workbench, not a page of the product: it has no
 * session guard, no i18n, and it would tell a visitor more about the app's
 * internals than the app does. `notFound()` in production rather than a
 * `PUBLIC_PATHS` entry or a middleware rule, because the route should not exist
 * at all there — `lib/hostRouting.ts` decides which HOST serves a path, not
 * whether it should be served, and this is the second question.
 *
 * Reachable at `localhost:3000/design-system` on any host, since
 * `isProductionHost()` scopes the host rules to the real domains and there is
 * only one host in development.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <Gallery />
}
