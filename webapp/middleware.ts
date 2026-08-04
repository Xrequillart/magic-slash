import { NextResponse, type NextRequest } from 'next/server'
import { resolveRewrite } from '@/lib/hostRouting'

/**
 * One Next.js deployment, four sites — the apex plus the app, admin and invite
 * subdomains. Which host serves which route, and why each rule exists, is in
 * `lib/hostRouting.ts`; this is the framework wiring around it.
 *
 * The split is not decoration: the suite runs on the root node_modules and never
 * installs the webapp's own, so nothing importing `next/server` can be tested (see
 * vitest.config.ts). Keeping the decision pure is what makes it testable.
 */
export function middleware(request: NextRequest) {
  const target = resolveRewrite(request.headers.get('host') ?? '', request.nextUrl.pathname)
  return target ? NextResponse.rewrite(new URL(target, request.url)) : NextResponse.next()
}

/**
 * Everything except Next's own assets and the static files in `public/`.
 *
 * Wider than it used to be — it matched `/` alone back when the root was the only
 * path that could be rewritten, and the invite host broke that assumption. The
 * exclusions matter at this width: without them every font and image request would
 * pay for a header read to reach a `next()` that was never in doubt.
 */
export const config = {
  matcher: ['/((?!_next/|favicon\\.ico|fonts/|img/|.*\\.[a-zA-Z0-9]+$).*)'],
}
