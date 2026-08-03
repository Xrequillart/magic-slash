import { NextResponse, type NextRequest } from 'next/server'

/**
 * One Next.js deployment, two sites.
 *
 * `magic-slash.io` is the public site — the pages under `app/(marketing)`, with `/`
 * as its landing page. `app.magic-slash.io` is the product — the signed-in pages,
 * with the login form as ITS front door. Both want to be at `/`, and only one route
 * can be, so the app subdomain gets its root REWRITTEN to `/login`.
 *
 * A rewrite rather than a redirect, deliberately: `app.magic-slash.io/` has been the
 * login URL since the app shipped, it is what is bookmarked and what password
 * managers have stored, and a redirect would rewrite that URL in the address bar of
 * everyone who has it saved. The rewrite serves the form and leaves the URL alone.
 *
 * Anything OTHER than `/` is left untouched on both hosts. The marketing pages
 * resolving on the app subdomain too is harmless — same content, no duplicate-content
 * risk worth a redirect chain, since only the apex domain is in the sitemap.
 */

/** The product's host. Any subdomain of it (previews, staging) counts as the app. */
const APP_HOST_PREFIX = 'app.'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  if (host.startsWith(APP_HOST_PREFIX) && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/login', request.url))
  }

  return NextResponse.next()
}

/**
 * Only the root path can ever be rewritten, so only the root path needs to reach
 * this. Matching everything would run a header read on every asset request for a
 * decision that is `NextResponse.next()` in all but one case.
 */
export const config = {
  matcher: '/',
}
