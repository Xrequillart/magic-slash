/**
 * The paths the app and the public site both need to name.
 *
 * A module of its own, with NO imports, for one reason: `lib/session.ts` — where these
 * used to live — is a client module that pulls in `@supabase/supabase-js`. The
 * marketing pages link to the login page, and importing the constant from there would
 * drag the entire auth SDK into the bundle of a landing page that never authenticates
 * anyone.
 *
 * `session.ts` re-exports both, so the guards keep reading the way they did.
 */

/**
 * BOTH PATHS LIVE ON `app.magic-slash.io`
 * ---------------------------------------------------------------------------
 * Neither is served by the public site any more: `canonicalHost` in `hostRouting.ts`
 * redirects them to the app host, since one page reachable on four hosts is three URLs
 * people bookmark by accident.
 *
 * Which is why the public site links to them with a plain `<a>` rather than `<Link>`.
 * A `<Link>` is a client-side navigation, and there is no client-side navigation to
 * another origin — the router would fetch the route, be handed a redirect off its own
 * host, and fall back to a full page load anyway, having prefetched a redirect on the
 * way. Inside the app, where these paths are on the current host, `<Link>` is correct.
 */

/**
 * The login form. `/` belongs to the public site, so the form has an explicit path and
 * `middleware.ts` rewrites `/` to it on the app subdomain. Guards must name THIS rather
 * than `/`: the rewrite only covers a visitor arriving at the root, and a client-side
 * `router.replace('/')` on the app host would land on the marketing landing page.
 */
export const LOGIN_PATH = '/login'

/** Where a signed-in visitor belongs. */
export const HOME_PATH = '/dashboard'
