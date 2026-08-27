/**
 * The fixed values of the Atlassian OAuth flow — everything that is the same on
 * every machine, in one place so no caller ever spells one of them out.
 *
 * Nothing SECRET lives here, and that is the whole design: the desktop app is
 * distributed to users, so anything baked into it is public by construction. The
 * client id below is a public identifier (it appears in the authorize URL the
 * user's own browser opens); the client SECRET stays on the webapp, which is why
 * the code exchange goes through `/api/atlassian/token` instead of straight to
 * `auth.atlassian.com` from here.
 *
 * Kept free of `electron` on purpose: this module is imported by the pure,
 * test-covered halves of the flow (`pkce.ts`, `atlassian-api.ts`), and the suite
 * runs on the ROOT node_modules where `electron` is absent.
 */

/**
 * The public OAuth client id of the Magic Slash Atlassian app.
 *
 * Injected at BUILD TIME from `MAGIC_SLASH_ATLASSIAN_CLIENT_ID`, by the same
 * `define` block in `desktop/vite.config.ts` that bakes in the Supabase URL and
 * anon key — set it in `desktop/.env.local` (untracked) or in the build
 * environment. That mechanism is for public identifiers, and this is one: the id
 * appears in the authorize URL the user's own browser opens. It is NOT a secret,
 * so it deliberately does not go anywhere near a `.enc` file or the keychain; the
 * client SECRET stays on the webapp (see the header).
 *
 * EMPTY is the safe default, and stays the shipped default until the app is
 * registered in the Atlassian developer console. An empty value is not a crash:
 * `getStatus()` reports `configured: false` and the Settings section renders
 * "not configured" rather than offering a button that could only lead to an
 * Atlassian error page. Setting the env var is the only change needed to turn the
 * feature on for a build.
 *
 * `process.env` rather than an `import.meta.env`: this module is main-process code,
 * and the suite imports it under plain Node where nothing is defined — which is
 * exactly the "not configured" path, so the default is exercised for free.
 */
export const ATLASSIAN_CLIENT_ID = process.env.MAGIC_SLASH_ATLASSIAN_CLIENT_ID || ''

/** Where the two server-side halves of the flow live (callback + token exchange). */
export const WEBAPP_BASE_URL = 'https://app.magic-slash.io'

/**
 * The redirect URI registered with Atlassian — an HTTPS URL on our own domain,
 * never `http://127.0.0.1`.
 *
 * Atlassian requires the redirect to match the registered value exactly, and a
 * loopback URL cannot be registered for an ephemeral port. The webapp callback
 * therefore takes the browser leg and bounces it to this machine's loopback
 * server, which is also what keeps the tokens off the browser: they are fetched
 * from `TOKEN_URL` over HTTPS by the desktop process itself.
 */
export const REDIRECT_URI = `${WEBAPP_BASE_URL}/api/atlassian/callback`

/** The exchange the desktop calls directly (authorization_code and refresh_token grants). */
export const TOKEN_URL = `${WEBAPP_BASE_URL}/api/atlassian/token`

/**
 * The least we can ask for and still be useful.
 *
 * `read:jira-work` is read-only; `offline_access` is what yields a refresh token,
 * without which the user would face the consent screen again every hour.
 */
export const SCOPES = ['read:jira-work', 'offline_access']

/** Atlassian's own consent screen — the only URL the user's browser is sent to. */
export const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize'

/** Root of the Atlassian REST surface (accessible-resources, and the Jira proxy). */
export const ATLASSIAN_API_BASE_URL = 'https://api.atlassian.com'
