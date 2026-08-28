import { describe, it, expect } from 'vitest'
import { REDIRECT_URI, SCOPES, WEBAPP_BASE_URL } from './constants'

/**
 * The values a third party compares, and the one list whose omissions are invisible
 * until a user hits them.
 *
 * `constants.ts` has no behaviour to test, which is exactly why it went unguarded and
 * exactly how it broke: `SCOPES` shipped without `read:jira-user`, so every connect
 * attempt died on `fetchMyself` with `401 "Unauthorized; scope does not match"` — AFTER
 * the browser had already shown Atlassian's success screen. Nothing failed at build
 * time, nothing failed in 2119 other tests, and the only symptom was a toast.
 *
 * So these assertions are deliberately literal. They are not checking that the code
 * does what the code says; they are pinning the three strings that have to agree with
 * something outside this repository — Atlassian's scope names, and the redirect URI
 * registered in its developer console.
 *
 * No electron, no network: `constants.ts` is importable under plain Node, which is what
 * lets the pure halves of the flow (`pkce.ts`, `atlassian-api.ts`) be tested at all.
 */

describe('SCOPES', () => {
  /**
   * One scope per endpoint the flow actually calls, named with the call that needs it.
   * A scope removed in the name of minimalism breaks the call on its right.
   */
  const REQUIRED = [
    // `fetchSprintIssues` (POST /search/jql) and `fetchJiraIssue` (GET /issue/{key}).
    { scope: 'read:jira-work', because: 'the sprint search and the single-issue read' },
    // `fetchMyself` (GET /myself) — the verification step, and NOT covered by
    // `read:jira-work`. This is the one that was missing.
    { scope: 'read:jira-user', because: 'the /myself verification in completeConnect' },
    // What yields a refresh token. Without it the credential dies in an hour and the
    // user is sent back to the browser with no explanation.
    { scope: 'offline_access', because: 'surviving past one hour' },
  ]

  it.each(REQUIRED)('asks for $scope, needed for $because', ({ scope }) => {
    expect(SCOPES).toContain(scope)
  })

  it('asks for nothing that can write to a Jira site', () => {
    // The feature is read-only and says so in Settings. A `write:` or `manage:` scope
    // arriving here is a change to what the user is consenting to, not a detail.
    for (const scope of SCOPES) {
      expect(scope).not.toMatch(/^(write|manage|delete):/)
    }
  })

  it('carries no duplicate and no stray whitespace', () => {
    // The list is joined with spaces into one query parameter, so a value containing a
    // space would silently become two scopes — one of them nonsense.
    expect(new Set(SCOPES).size).toBe(SCOPES.length)
    for (const scope of SCOPES) expect(scope).toBe(scope.trim())
    for (const scope of SCOPES) expect(scope).not.toMatch(/\s/)
  })
})

describe('REDIRECT_URI', () => {
  it('is the exact URL registered with Atlassian, on the app host', () => {
    // Compared for byte equality at BOTH ends of the flow — the authorize request here
    // and the token exchange in `webapp/lib/atlassianState.ts`, which builds the same
    // string from its own `APP_URL`. A trailing slash drifting between them is an
    // `invalid_grant` with no hint as to why.
    expect(REDIRECT_URI).toBe('https://app.magic-slash.io/api/atlassian/callback')
    expect(WEBAPP_BASE_URL).toBe('https://app.magic-slash.io')
  })

  it('is https and never loopback', () => {
    // Atlassian will not register an ephemeral `http://127.0.0.1:<port>`, which is the
    // entire reason the webapp sits in the middle of this flow.
    expect(REDIRECT_URI.startsWith('https://')).toBe(true)
    expect(REDIRECT_URI).not.toMatch(/127\.0\.0\.1|localhost/)
  })
})
