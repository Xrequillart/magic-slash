/**
 * Which route a host serves — the whole decision behind `middleware.ts`, kept here
 * as a pure function so it can be tested.
 *
 * It lives in `lib/` and imports nothing because of how this repo runs its tests:
 * the suite runs on the ROOT node_modules and never installs the webapp's own, so a
 * test that reached `next/server` would fail to RESOLVE rather than fail honestly
 * (see vitest.config.ts). The middleware keeps the framework; this keeps the rules.
 *
 * One Next.js deployment, three sites:
 *
 * | Host                    | Serves                                     |
 * | ----------------------- | ------------------------------------------ |
 * | `magic-slash.io`        | the public site — `app/(marketing)`        |
 * | `app.magic-slash.io`    | the product — `/dashboard`, and `/admin`   |
 * | `invite.magic-slash.io` | the invitation funnel — `/invite/<token>`  |
 *
 * The back-office had a host of its own for a while. It does not need one: it is a
 * section of the product reached by the handful of people who already work in the
 * product, and `app.magic-slash.io/admin/users` says so more plainly than a fourth
 * domain to provision, certify and remember.
 *
 * Three rules, asked in this order, because they answer different questions:
 *
 *  - `canonicalHost` — does this path belong on ANOTHER host? A single deployment
 *    answers on every host, so every page was reachable on every one of them:
 *    `magic-slash.io/dashboard` served the product from the public site's domain. That
 *    is a redirect, and it has to be settled before anything is rewritten.
 *  - `retiredPath` — is this a public page we DELETED, and where did it go? Asked before
 *    the host question, because a retired path is a public path: it has to reach its
 *    successor rather than be sent to the app.
 *  - `resolveRewrite` — given that this path belongs here, which route renders it?
 */

/** The product's own host. Its root is the dashboard; the back-office is under /admin. */
export const APP_HOST = 'app.magic-slash.io'

/** The domain every host of the product shares. */
const SHARED_DOMAIN = 'magic-slash.io'

/**
 * The paths the PUBLIC site owns. Everything not listed here belongs to the app.
 *
 * Listing the public side rather than the product side is deliberate, and it is about
 * which mistake each version makes when someone forgets to update it. Enumerating the
 * product's paths means a new page added to the app is reachable on the apex forever
 * and nobody notices. Enumerating the public ones means a new marketing page redirects
 * to `app.` — wrong, but wrong in the face of whoever loads it, on the first try.
 */
const PUBLIC_PATHS = new Set([
  '/',
  '/changelog',
  '/faq',
  '/features',
  '/story',
  // NOT A PAGE ANY MORE. `/documentation` is in `RETIRED_PATHS` below and 308s to
  // `/faq`, and it has to stay listed HERE for that redirect to be the one that fires:
  // drop it and `canonicalHost` decides it belongs to the app, which 307s the reader to
  // a login form on `app.magic-slash.io` — the one outcome worse than a 404.
  '/documentation',
])

/**
 * Public pages we deleted → where their readers should land instead.
 *
 * A REDIRECT AND NOT A 404, because these URLs do not stop existing when the route
 * does. `/documentation` is in the README, in release notes, in the desktop app's own
 * history and in whatever anybody bookmarked, and the page it named is gone — split
 * between `/changelog`, `/features` and `/faq`, which is where the questions it was
 * really being read for ended up.
 *
 * HERE RATHER THAN IN `next.config.mjs`'s `redirects()`, which is the obvious home for
 * it and the wrong one. Two reasons, and the second is the one that decides it:
 *   • this file is where the public site's paths are already enumerated, and a rule
 *     about a public path that lives somewhere else is a rule the next person editing
 *     `PUBLIC_PATHS` will not see;
 *   • the relative order of a config redirect and the middleware is a framework detail
 *     we would be betting a link on. Asked here, in `middleware.ts`, before
 *     `canonicalHost` gets a say, the order is ours and `hostRouting.test.ts` pins it.
 *
 * A 308 and not the 307 `canonicalHost` produces: that one is a hosting decision that
 * could be revisited, this one is a page that has been deleted. Permanent is the honest
 * answer and it is what search engines need to move the ranking across.
 */
const RETIRED_PATHS: Record<string, string> = {
  '/documentation': '/faq',
}

/**
 * Public path prefixes — `/invite/<token>` and nothing else.
 *
 * Invitations have been sent as `app.magic-slash.io/invite/<token>` and as
 * `magic-slash.io/invite/<token>`, and those links do not expire because we introduced
 * a shorter host. Every host keeps answering them.
 */
const PUBLIC_PREFIXES = ['/invite']

/**
 * Whether this is one of the production hosts.
 *
 * Everything below is scoped to them, because there is only ONE host in development
 * and on Vercel previews: sending `localhost:3000/dashboard` to `app.magic-slash.io`
 * would push a developer into production mid-session, and a preview deploy could not
 * be used to review anything but the landing page.
 *
 * Matched on a label boundary, so `magic-slash.io.evil.com` is not one of ours. The
 * same rule decides the session cookie's scope — see `cookieDomain` in `authStorage.ts`,
 * kept separate there rather than shared from here: the middleware's routing and the
 * auth store have no business importing each other for three lines of string matching.
 */
function isProductionHost(host: string): boolean {
  const name = host.toLowerCase().split(':')[0]
  return name === SHARED_DOMAIN || name.endsWith(`.${SHARED_DOMAIN}`)
}

/**
 * `/story/` is `/story`. Next normalises the trailing slash itself, but not reliably
 * ahead of every rule below — and a public page that fails to match `isPublicPath` is
 * not served differently, it is sent to another host, which is not a mistake worth
 * betting on the framework's ordering to avoid.
 *
 * Shared with `retiredPath` so `/documentation/` retires the same as `/documentation`.
 * MEASURED, on a production build: Next answers `/documentation/` with its own 308 to
 * `/documentation` BEFORE the middleware sees it, so that URL reaches `/faq` in two hops
 * rather than one. Correct either way, and this normalisation is what keeps it correct
 * if that ordering — or the `trailingSlash` option — ever changes.
 */
function normalise(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

function isPublicPath(pathname: string): boolean {
  const path = normalise(pathname)

  if (PUBLIC_PATHS.has(path)) return true
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/**
 * The page this deleted path should hand its reader to, or null if it is not one.
 *
 * NOT SCOPED TO PRODUCTION, unlike the two rules below it. Those are about which of
 * three hosts answers; this one is about a route that genuinely no longer exists, which
 * is equally true of `localhost:3000/documentation` and of a preview deploy. Scoping it
 * would leave the redirect untestable in the one place anybody would test it.
 *
 * `invite.` IS EXEMPT, for the same reason it is exempt from `canonicalHost`: every path
 * on that host is a TOKEN rather than a route, so `invite.magic-slash.io/documentation`
 * is a request for an invitation that happens to be named `documentation`. Sending it to
 * `/faq` would answer a wrong-token message with a page about uninstalling the app. The
 * host is checked by PREFIX and not by `isProductionHost`, so a preview of the invite
 * host is exempt too.
 */
export function retiredPath(host: string, pathname: string): string | null {
  if (host.startsWith('invite.')) return null
  return RETIRED_PATHS[normalise(pathname)] ?? null
}

/**
 * The host this path belongs on, or null to serve it where it was asked for.
 *
 * The product used to answer on every host at once — `magic-slash.io/account` and
 * `app.magic-slash.io/account` were two URLs for one page, and the first is the one
 * people bookmarked by accident. One page, one home: the product and its back-office on
 * `app.`, the public site on the apex.
 *
 * `invite.` is exempt from the whole question. Every path on that host is a TOKEN, not a
 * route — `invite.magic-slash.io/dashboard` is a request for an invitation that happens
 * to be named `dashboard`, and redirecting it would turn a wrong-token message into a
 * trip to the login page. The prefix rule below owns that host completely.
 */
export function canonicalHost(host: string, pathname: string): string | null {
  if (!isProductionHost(host)) return null
  if (host.startsWith('invite.')) return null
  if (isPublicPath(pathname)) return null
  return host.toLowerCase().split(':')[0] === APP_HOST ? null : APP_HOST
}

/** Host prefix → the route its ROOT serves. Deeper paths are left untouched. */
const ROOT_REWRITES: Record<string, string> = {
  'app.': '/dashboard',
}

/**
 * Host prefix → a path prefix applied to EVERY path, root included.
 *
 * Invitations need this and the other hosts do not: the token IS the path
 * (`invite.magic-slash.io/abc123`), and `/abc123` is not a route. Where
 * `app.magic-slash.io/admin/users` already carries its real path in the URL, an
 * invite URL never can.
 *
 * Safe only because the invite page links nowhere internal — its single link is the
 * external download. If that page ever grows a `/login` link, blind prefixing would
 * turn it into `/invite/login`, and those links would have to become absolute URLs
 * on the apex.
 */
const PATH_PREFIXES: Record<string, string> = {
  'invite.': '/invite',
}

/**
 * The path this request should be REWRITTEN to, or null to serve it unchanged.
 *
 * Rewritten, never redirected: `app.magic-slash.io/` has been the product's front
 * door since it shipped, so it is bookmarked and stored in password managers. A
 * redirect would rewrite that URL in the address bar of everyone who saved it.
 */
export function resolveRewrite(host: string, pathname: string): string | null {
  for (const [prefix, target] of Object.entries(PATH_PREFIXES)) {
    if (!host.startsWith(prefix)) continue
    // Already under the target — a link that hardcoded the real path, or an internal
    // navigation replaying it. Prefixing again would produce /invite/invite/<token>.
    if (pathname === target || pathname.startsWith(`${target}/`)) return null
    return pathname === '/' ? target : `${target}${pathname}`
  }

  if (pathname !== '/') return null

  for (const [prefix, target] of Object.entries(ROOT_REWRITES)) {
    if (host.startsWith(prefix)) return target
  }

  return null
}
