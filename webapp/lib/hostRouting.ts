/**
 * Which route a host serves — the whole decision behind `middleware.ts`, kept here
 * as a pure function so it can be tested.
 *
 * It lives in `lib/` and imports nothing because of how this repo runs its tests:
 * the suite runs on the ROOT node_modules and never installs the webapp's own, so a
 * test that reached `next/server` would fail to RESOLVE rather than fail honestly
 * (see vitest.config.ts). The middleware keeps the framework; this keeps the rules.
 *
 * One Next.js deployment, four sites:
 *
 * | Host                    | Serves                                    |
 * | ----------------------- | ----------------------------------------- |
 * | `magic-slash.io`        | the public site — `app/(marketing)`       |
 * | `app.magic-slash.io`    | the product — `/dashboard`                |
 * | `admin.magic-slash.io`  | the back-office — `/admin`                |
 * | `invite.magic-slash.io` | the invitation funnel — `/invite/<token>` |
 */

/** Host prefix → the route its ROOT serves. Deeper paths are left untouched. */
const ROOT_REWRITES: Record<string, string> = {
  'app.': '/dashboard',
  'admin.': '/admin',
}

/**
 * Host prefix → a path prefix applied to EVERY path, root included.
 *
 * Invitations need this and the other hosts do not: the token IS the path
 * (`invite.magic-slash.io/abc123`), and `/abc123` is not a route. Where
 * `admin.magic-slash.io/admin/users` already carries its real path in the URL, an
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
