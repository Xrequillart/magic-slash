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
 * The login form. `/` belongs to the public site, so the form has an explicit path and
 * `middleware.ts` rewrites `/` to it on the app subdomain. Guards must name THIS rather
 * than `/`: the rewrite only covers a visitor arriving at the root, and a client-side
 * `router.replace('/')` on the app host would land on the marketing landing page.
 */
export const LOGIN_PATH = '/login'

/** Where a signed-in visitor belongs. */
export const HOME_PATH = '/dashboard'
