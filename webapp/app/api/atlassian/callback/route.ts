import { NextResponse, type NextRequest } from 'next/server'
import { loopbackCallbackUrl, parseState } from '@/lib/atlassianState'

/**
 * The redirect URI registered with Atlassian: `https://app.magic-slash.io/api/atlassian/callback`.
 *
 * The desktop app connects a user's own Atlassian account with OAuth 2.0 (3LO) + PKCE,
 * and it opens a loopback HTTP server on a port it picks at launch to receive the result.
 * That port cannot be the registered redirect URI — Atlassian wants one fixed HTTPS URL,
 * decided once, in a console. So the browser lands here and this route bounces it to the
 * loopback, carrying the port through `state` (`<nonce>.<port>`; see `lib/atlassianState.ts`).
 *
 * What this route does NOT do is the token exchange. That is `../token/route.ts`, called
 * by the desktop over HTTPS with its PKCE verifier. The split matters: the code arrives
 * here in a URL, which means in a browser's history, and the verifier that redeems it
 * never leaves the machine that generated it. This route only forwards, so a browser
 * history entry on its own is worth nothing.
 *
 * Nothing from this flow is logged and nothing is stored. The webapp is a secret-holder,
 * never a token-holder: no Jira token is ever persisted in the cloud.
 *
 * Three outcomes, and no fourth:
 *
 *  - a `state` we recognise and a `code`  → 307 to the loopback with the code
 *  - a `state` we recognise and an `error` → 307 to the loopback with the error
 *  - anything else                         → 400 and a static page, no redirect
 *
 * The middleware lets this through untouched on the app host — `canonicalHost` sees it is
 * already there and `resolveRewrite` only ever rewrites `/`. See `lib/hostRouting.ts`.
 */

/**
 * Read from the query string on every request, never cached.
 *
 * `request.nextUrl.searchParams` already opts this handler out of Next's static
 * optimisation, so this is belt and braces — but a cached OAuth callback would hand the
 * next visitor somebody else's authorization code, and that is not a failure mode worth
 * leaving to an implementation detail of the framework.
 */
export const dynamic = 'force-dynamic'

/**
 * The page shown when `state` did not survive validation.
 *
 * REFLECTS NOTHING. Not the error, not the description, not the state, not any other
 * query parameter — this is a fixed string, and it has to stay one. It is served on
 * `app.magic-slash.io`, a domain our users are signed in to, from a URL an attacker
 * composes in full: echoing any parameter back into this markup is reflected XSS via a
 * link, running on our own origin. There is nothing here worth that, so there is nothing
 * from the request here at all.
 *
 * Which is also why it says so little. We cannot tell the visitor what went wrong without
 * quoting the request, and the desktop app is where they can retry anyway.
 */
const ERROR_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Atlassian connection failed</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #f7f7f8; color: #18181b;
  }
  main { max-width: 30rem; padding: 2rem; text-align: center; }
  h1 { margin: 0 0 0.75rem; font-size: 1.35rem; font-weight: 600; }
  p { margin: 0; color: #52525b; }
  @media (prefers-color-scheme: dark) {
    body { background: #111113; color: #f4f4f5; }
    p { color: #a1a1aa; }
  }
</style>
</head>
<body>
<main>
<h1>The Atlassian connection could not be completed</h1>
<p>This link is incomplete or has expired. Open Magic Slash and start again from
Settings &rarr; Jira to connect your Atlassian account.</p>
</main>
</body>
</html>
`

/** The static page, with the headers that keep it out of every cache. */
function errorPage(): NextResponse {
  return new NextResponse(ERROR_PAGE, {
    status: 400,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams

  // `state` first, before anything else is even read. It carries the port, and without a
  // port there is no address to answer at — a bad `state` is the one case with nowhere to
  // send the visitor, so it is the one case that renders a page here.
  const state = parseState(query.get('state'))
  if (!state) return errorPage()

  // The error branch is read BEFORE the code branch, because a denial arrives with
  // `error` set and no `code`. Forwarding it is load-bearing rather than tidy: it is how
  // the desktop learns THAT MOMENT that the user closed the consent screen, instead of
  // sitting on an open loopback server until its five-minute timeout gives up on a flow
  // that ended half a second after it started.
  //
  // Only the `error` CODE travels, never Atlassian's `error_description`: the desktop
  // deliberately never puts callback text in front of the user (it is
  // attacker-influenceable — see `ipc/jira-handlers.ts`), so a description forwarded
  // here would cross the loopback and be dropped.
  //
  // The last case is a `state` we built with neither a code nor an error. Atlassian does
  // not do this, so it is a truncated URL or a hand-made request — but the port is
  // validated, so the desktop gets told rather than left waiting. Named with the RFC
  // 6749 code so the desktop needs no special case for it.
  const error = query.get('error')
  const code = query.get('code')
  // Annotated rather than inferred: without it TypeScript widens the three branches into a
  // union that gives each one the other's key as `undefined`, which no longer satisfies
  // `Record<string, string>`. It typechecks under the root config and fails `next build`,
  // so the annotation is what keeps the deploy honest.
  const outcome: Record<string, string> = error
    ? { error }
    : code
      ? { code }
      : { error: 'invalid_request' }

  // The nonce alone goes back, not the `state` we received: the desktop matches it
  // against what it stored, and the port half is now the URL. 307 rather than 302 —
  // irrelevant for a GET, but it is the one redirect that never rewrites the method, and
  // this endpoint has no reason to be the exception.
  return NextResponse.redirect(loopbackCallbackUrl(state.port, { ...outcome, state: state.nonce }), 307)
}
