import { NextResponse, type NextRequest } from 'next/server'
import { canonicalHost, resolveRewrite, retiredPath } from '@/lib/hostRouting'

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
  const host = request.headers.get('host') ?? ''
  const { pathname, search } = request.nextUrl

  // A DELETED PAGE FIRST, before the host question. `/documentation` is a path the
  // public site owns and no longer serves, so it has to reach its successor rather than
  // be handed to `canonicalHost` — which, reading a path with no route behind it, would
  // send the reader to a login form on the app host. 308 because the page is gone for
  // good; see `RETIRED_PATHS`. `search` is carried for the same reason it is below.
  const successor = retiredPath(host, pathname)
  if (successor) {
    return NextResponse.redirect(new URL(`${successor}${search}`, request.url), 308)
  }

  // Wrong host next: a rewrite would render the page right here, which is the thing
  // being corrected. `search` is carried by hand — the target is built from a bare host
  // and path, so anything not named is dropped, and `?lang=` or a future `?next=` on the
  // login route is what that loses. The fragment needs no help: it never leaves the
  // browser, which reapplies it to whatever it lands on.
  const elsewhere = canonicalHost(host, pathname)
  if (elsewhere) {
    // 307, not 308: this is a hosting decision taken the same week the hosts moved, and
    // a permanent redirect would sit in browser caches long after anyone remembered
    // asking for it. These are signed-in pages — no crawler has a ranking to preserve.
    return NextResponse.redirect(`https://${elsewhere}${pathname}${search}`, 307)
  }

  const target = resolveRewrite(host, pathname)
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
