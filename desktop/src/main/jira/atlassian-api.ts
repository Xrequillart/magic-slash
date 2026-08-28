/**
 * Every HTTP call this feature makes, and nothing else.
 *
 * PURE in the same sense as `pkce.ts`: no `electron`, no filesystem, no ambient
 * `fetch`. Each function takes its transport and its base URL as parameters, so
 * `atlassian-api.test.ts` drives the whole surface with a hand-written stub — no
 * network, and no mock of a module the root node_modules does not even hold.
 * `connect.ts` is the one place that binds the real `fetch` and the real URLs.
 *
 * ─── The rule this file exists to enforce ───────────────────────────────────────
 * A token, a `code` and a verifier NEVER appear in an `Error.message`, and never
 * in a log line. That sounds obvious and is exactly what goes wrong by accident:
 * the natural way to write an HTTP helper is `throw new Error(await res.text())`,
 * and the body of a failed token exchange routinely echoes the request back. Every
 * failure here is therefore reported as an operation name plus a status code, and
 * response bodies are read for their JSON shape only.
 */

/** The subset of a `Response` these calls use. Structural, so a test can fake it in three lines. */
export interface HttpResponseLike {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

/** The subset of `fetch` these calls use. */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<HttpResponseLike>

/**
 * What every call needs handed to it: the transport, the webapp route that owns
 * the client secret, and the root of the Atlassian API.
 *
 * `tokenUrl` and `apiBaseUrl` are parameters rather than imports so the tests can
 * assert WHICH host was called — the distinction between "our webapp" and
 * "Atlassian" is the security-relevant part of this design, and a test that hits a
 * constant cannot notice the two being swapped.
 */
export interface AtlassianDeps {
  fetch: FetchLike
  /** `POST /api/atlassian/token` on the webapp — the only holder of the client secret. */
  tokenUrl: string
  /** `https://api.atlassian.com` in production. */
  apiBaseUrl: string
}

/**
 * The OAuth error codes that mean this grant will never work again.
 *
 * `invalid_grant` is the revocation signal proper: the user removed the app from
 * their Atlassian account, or the refresh token was already spent. `unauthorized_client`
 * is the other terminal answer — the client is not allowed this grant — and it too
 * cannot be waited out. Everything else Atlassian names (`invalid_request`,
 * `temporarily_unavailable`, a rate limit) is a condition, not a verdict.
 */
const REJECTED_GRANT_CODES = new Set(['invalid_grant', 'unauthorized_client'])

/**
 * The same character class the webapp gates the forwarded code on
 * (`webapp/lib/atlassianState.ts`). Applied again on this side deliberately: neither
 * end has to trust the other's filtering, and this is what keeps `errorCode` from
 * being a channel for anything longer or stranger than an OAuth code.
 */
const ERROR_CODE_PATTERN = /^[a-z_]{1,40}$/

/**
 * A failed Atlassian (or webapp) call, carrying the ONE thing the caller has to
 * branch on: whether the credential was refused.
 *
 * `unauthorized` (401) means "this access token is not accepted". `rejectedGrant`
 * means the GRANT was refused — a revoked refresh token, or a code that does not
 * match its verifier. The caller needs the two apart because they are the difference
 * between telling the user to reconnect and simply having lost the network for a
 * minute.
 *
 * ─── Why the code, and not just the status ──────────────────────────────────────
 * The token exchange does not answer us directly: it goes through the webapp, which
 * holds the client secret and SANITISES what comes back. It used to fold every 4xx
 * into a 400, so an Atlassian rate limit reached this class as the exact shape of a
 * revoked credential and put a "Reconnect" prompt in front of a user whose account
 * was fine. Both ends of that were fixed, and BOTH are kept:
 *
 *  • the webapp preserves 429 as itself (`upstreamFailure` there), so the status
 *    alone no longer lies for the one case that mattered;
 *  • and the decision here rests on the forwarded OAuth error CODE whenever there is
 *    one, because that is evidence from Atlassian rather than a status a hop in the
 *    middle chose. A status is one integer that three layers rewrite; the code says
 *    what actually happened.
 *
 * Belt and braces on purpose: either fix alone leaves the invariant resting on a
 * remapping in another deployment, which is precisely how it was defeated the first
 * time. With no code to go on (a Jira read's 401, an HTML error page, a body that is
 * not JSON) it falls back to the status, which is the old behaviour.
 *
 * The message is built from an operation name and a status, never from a response
 * body — and `errorCode` is not part of it. See this file's header.
 */
export class AtlassianApiError extends Error {
  readonly status: number

  /**
   * The upstream OAuth error code, when one was forwarded and it looks like one.
   * Whitelisted to `[a-z_]{1,40}`, so it cannot carry a token, a URL or a sentence.
   */
  readonly errorCode: string | null

  constructor(operation: string, status: number, errorCode: string | null = null) {
    super(`${operation} failed (HTTP ${status || 0})`)
    this.name = 'AtlassianApiError'
    this.status = status
    this.errorCode = errorCode
  }

  /** The access token was refused. */
  get unauthorized(): boolean {
    return this.status === 401
  }

  /**
   * The grant itself was refused. Evidence first: a forwarded code decides on its
   * own, and only a terminal one counts. Without a code, 400 and 401 are the token
   * endpoint's answers for it, and anything else (429, 5xx, 0 for a transport
   * failure) is an outage, not a revocation.
   */
  get rejectedGrant(): boolean {
    if (this.errorCode) return REJECTED_GRANT_CODES.has(this.errorCode)
    return this.status === 400 || this.status === 401
  }
}

/** What the webapp's token route returns, verbatim from Atlassian. */
export interface AtlassianTokenPayload {
  access_token: string
  /** Present only when `offline_access` was granted — i.e. on the authorization_code leg. */
  refresh_token?: string
  /** Seconds. Atlassian issues one-hour access tokens. */
  expires_in?: number
  scope?: string
  token_type?: string
}

/** One Atlassian site the user granted access to. */
export interface AccessibleResource {
  /** The `cloudId` — what every Jira REST path is keyed by. */
  id: string
  /** `https://acme.atlassian.net` — shown in Settings so the user can tell sites apart. */
  url: string
  name: string
}

/** The identity check: who this credential belongs to. */
export interface AtlassianMyself {
  displayName: string
  accountId: string
}

/**
 * Read a JSON body without ever letting it become an error message.
 *
 * A non-2xx answer throws before the body is even parsed, and a body that is not
 * JSON throws the same operation-plus-status error as an HTTP failure — a token
 * route answering an HTML error page must not put that page anywhere near a log.
 *
 * The shape check is left to the caller, because the two callers want different
 * shapes (an object here, an array for accessible-resources). This is the ONE place
 * that turns a response into a value, so the rule this file exists to enforce is
 * enforced once.
 */
async function readBody(response: HttpResponseLike, operation: string): Promise<unknown> {
  if (!response.ok) throw new AtlassianApiError(operation, response.status, await readErrorCode(response))
  try {
    return await response.json()
  } catch {
    throw new AtlassianApiError(`${operation} (unreadable body)`, response.status)
  }
}

/**
 * The `error` field of a failed response, and NOTHING else from that body.
 *
 * One field, matched against a whitelist before it is kept, and never interpolated
 * into a message — so the file's rule holds: a body that echoes the request back, or
 * carries an `error_description` naming our client id, contributes nothing. An
 * unreadable or non-JSON body is simply no evidence, not an error of its own: the
 * caller is already throwing, and the status it throws with is unaffected.
 */
async function readErrorCode(response: HttpResponseLike): Promise<string | null> {
  try {
    const body = await response.json()
    if (!body || typeof body !== 'object') return null
    const code = (body as Record<string, unknown>).error
    return typeof code === 'string' && ERROR_CODE_PATTERN.test(code) ? code : null
  } catch {
    return null
  }
}

/** `readBody` narrowed to a JSON object — what every call but one expects. */
async function readJson(
  response: HttpResponseLike,
  operation: string,
): Promise<Record<string, unknown>> {
  const parsed = await readBody(response, operation)
  if (!parsed || typeof parsed !== 'object') {
    throw new AtlassianApiError(`${operation} (unexpected body)`, response.status)
  }
  return parsed as Record<string, unknown>
}

/**
 * Turn a transport failure into the same error shape as an HTTP failure, with
 * status 0.
 *
 * `fetch` rejects with a `TypeError` whose message names the host and the cause;
 * that is safe today, but it is also the one place where an unreviewed string from
 * outside would flow into our logs, so it is normalised away here.
 */
async function send(
  deps: AtlassianDeps,
  operation: string,
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<HttpResponseLike> {
  try {
    return await deps.fetch(url, init)
  } catch {
    throw new AtlassianApiError(`${operation} (transport)`, 0)
  }
}

/**
 * The address of one Jira REST endpoint behind Atlassian's cloud proxy.
 *
 * ONE function rather than the same template literal per read, because the encoding
 * is the invariant and not the convenience: the cloudId comes back from Atlassian
 * but it lands in a URL PATH, so a malformed one has to fail as a 404 instead of
 * reshaping the address. Spelled out per call site that rule held in three places
 * and only one of them said why.
 *
 * `path` is everything after `/rest/api/3` and is the caller's own literal — any
 * value inside it that did not come from us is the caller's to encode (see
 * `fetchJiraIssue`, whose key arrives from the renderer).
 */
function jiraApiUrl(deps: AtlassianDeps, cloudId: string, path: string): string {
  return `${deps.apiBaseUrl}/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3${path}`
}

/** Every token payload must at least carry a usable access token. */
function toTokenPayload(body: Record<string, unknown>, operation: string): AtlassianTokenPayload {
  const accessToken = body.access_token
  if (typeof accessToken !== 'string' || accessToken === '') {
    throw new AtlassianApiError(`${operation} (no access token)`, 200)
  }
  const refreshToken = body.refresh_token
  const expiresIn = body.expires_in
  return {
    access_token: accessToken,
    ...(typeof refreshToken === 'string' && refreshToken !== '' ? { refresh_token: refreshToken } : {}),
    ...(typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? { expires_in: expiresIn } : {}),
    ...(typeof body.scope === 'string' ? { scope: body.scope } : {}),
    ...(typeof body.token_type === 'string' ? { token_type: body.token_type } : {}),
  }
}

/**
 * Redeem the authorization code.
 *
 * Called by the DESKTOP over HTTPS, not by the browser — which is the point of the
 * whole architecture: the tokens come back in this response body and never touch
 * the browser, its history, or the loopback server.
 */
export async function exchangeCode(
  deps: AtlassianDeps,
  args: { code: string; verifier: string },
): Promise<AtlassianTokenPayload> {
  const operation = 'Atlassian code exchange'
  const response = await send(deps, operation, deps.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: args.code,
      code_verifier: args.verifier,
    }),
  })
  return toTokenPayload(await readJson(response, operation), operation)
}

/**
 * Trade the refresh token for a fresh access token.
 *
 * Atlassian ROTATES refresh tokens: the response carries a new one, and the old
 * one stops working. A caller that keeps the old value will be locked out at the
 * next refresh, so the returned payload must be persisted whole.
 *
 * A `rejectedGrant` failure here is the real revocation signal — the user removed
 * the app from their Atlassian account.
 */
export async function refreshCredential(
  deps: AtlassianDeps,
  args: { refreshToken: string },
): Promise<AtlassianTokenPayload> {
  const operation = 'Atlassian token refresh'
  const response = await send(deps, operation, deps.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: args.refreshToken,
    }),
  })
  return toTokenPayload(await readJson(response, operation), operation)
}

/**
 * The sites this credential can reach, straight from Atlassian.
 *
 * This is where the `cloudId` comes from. It cannot be derived from the site URL,
 * and every Jira REST path needs it, so the connect flow is not finished until
 * this answers.
 *
 * Entries missing an id or a URL are dropped rather than repaired: a resource we
 * cannot address is not a site the user could pick.
 */
export async function fetchAccessibleResources(
  deps: AtlassianDeps,
  accessToken: string,
): Promise<AccessibleResource[]> {
  const operation = 'Atlassian accessible-resources'
  const response = await send(deps, operation, `${deps.apiBaseUrl}/oauth/token/accessible-resources`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  const parsed = await readBody(response, operation)
  if (!Array.isArray(parsed)) {
    throw new AtlassianApiError(`${operation} (unexpected body)`, response.status)
  }
  return parsed.flatMap((entry): AccessibleResource[] => {
    if (!entry || typeof entry !== 'object') return []
    const { id, url, name } = entry as Record<string, unknown>
    if (typeof id !== 'string' || id === '') return []
    if (typeof url !== 'string' || url === '') return []
    return [{ id, url, name: typeof name === 'string' && name !== '' ? name : url }]
  })
}

/**
 * Who the credential belongs to — the verification step.
 *
 * Deliberately the cheapest authenticated Jira read there is, and deliberately
 * BEFORE anything is written to disk: a credential that cannot name its own owner
 * is not one to report as connected. Its `displayName` is also the only thing
 * Settings shows, so the same call answers both questions.
 *
 * A 401 here, once a credential is already stored, is the other revocation path —
 * see `connect.ts`. It is not proof on its own (a site outage answers 401 too),
 * which is why it marks rather than deletes.
 *
 * THIS ENDPOINT NEEDS `read:jira-user`, and it is the only one here that does —
 * `read:jira-work` does not cover it, however much a display name looks like part of
 * "work". Omitting the scope makes every connect fail on this line with
 * `401 "Unauthorized; scope does not match"`, after the browser has already reported
 * success. See `SCOPES` in `constants.ts`.
 */
export async function fetchMyself(
  deps: AtlassianDeps,
  accessToken: string,
  cloudId: string,
): Promise<AtlassianMyself> {
  const operation = 'Atlassian myself'
  const url = jiraApiUrl(deps, cloudId, '/myself')
  const response = await send(deps, operation, url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  const body = await readJson(response, operation)
  const { displayName, accountId } = body
  if (typeof accountId !== 'string' || accountId === '') {
    throw new AtlassianApiError(`${operation} (no account id)`, response.status)
  }
  return {
    accountId,
    displayName: typeof displayName === 'string' && displayName !== '' ? displayName : accountId,
  }
}

/**
 * ONE page of a JQL search — the only Jira READ this feature makes.
 *
 * `/rest/api/3/search/jql` rather than `/rest/agile/1.0/board/{id}/sprint`: the
 * agile surface needs a board id (which nothing in our config holds) and a scope
 * we do not ask for. `read:jira-work` covers this endpoint and nothing on
 * `/rest/agile`, so the query says `sprint in openSprints()` and lets Jira resolve
 * the board itself. See `SCOPES` in `constants.ts`.
 *
 * Paginated by TOKEN, not by offset, and with NO `total` in the response: the
 * caller can learn that there is more (`nextPageToken`), never how much more.
 *
 * The issues come back RAW. Shaping them is a decision about values, and it lives
 * in `sprint-issues.ts`, which is pure and tested for exactly that; this file keeps
 * only the invariant it exists for — an operation name and a status code, never a
 * response body, in any error or log.
 */
export interface JiraSearchPage {
  /** The `issues` array verbatim. Mapped by `sprint-issues.ts`. */
  issues: unknown[]
  /** Jira's cursor for the next page; null when this page was the last. */
  nextPageToken: string | null
}

export async function fetchSprintIssues(
  deps: AtlassianDeps,
  args: {
    accessToken: string
    cloudId: string
    jql: string
    /** The fields to read back. Anything not asked for is not sent, and not billed for. */
    fields: string[]
    maxResults: number
    pageToken?: string
  },
): Promise<JiraSearchPage> {
  const operation = 'Jira sprint search'
  const url = jiraApiUrl(deps, args.cloudId, '/search/jql')
  const response = await send(deps, operation, url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql: args.jql,
      fields: args.fields,
      maxResults: args.maxResults,
      ...(args.pageToken ? { nextPageToken: args.pageToken } : {}),
    }),
  })
  const body = await readJson(response, operation)
  // A body with no `issues` array is not an empty sprint, it is an answer we did
  // not understand — and reporting it as "nothing to do" would hide a broken read
  // behind an ordinary-looking empty card.
  if (!Array.isArray(body.issues)) {
    throw new AtlassianApiError(`${operation} (unexpected body)`, response.status)
  }
  const token = body.nextPageToken
  return {
    issues: body.issues,
    nextPageToken: typeof token === 'string' && token !== '' ? token : null,
  }
}

/**
 * ONE ticket, by key — what the detail panel opens on.
 *
 * A GET on `/rest/api/3/issue/{key}` rather than `fetchSprintIssues` with a
 * `jql: key = "PROJ-123"`, which would also have worked and would have said
 * something else. The search endpoint's answer is a page, so a ticket that has been
 * deleted or moved comes back as an empty list — indistinguishable from a query
 * that matched nothing — where this one answers 404 and lands on
 * `tasks.jira.error.notFound` through the ladder every other Jira failure uses.
 * There is also no JQL to quote, and therefore no way to malform.
 *
 * Covered by `read:jira-work` exactly as the search is, so no scope changes with it
 * (see `SCOPES` in `constants.ts`).
 *
 * The issue comes back RAW, for `fetchSprintIssues`' reason: shaping it — and
 * converting its ADF description — is a decision about values and lives in
 * `issue-detail.ts`, which is pure and tested for exactly that. This file keeps only
 * the invariant it exists for, an operation name and a status code and never a
 * response body in any error or log.
 */
export async function fetchJiraIssue(
  deps: AtlassianDeps,
  args: {
    accessToken: string
    cloudId: string
    /** The issue key, `PROJ-123`. */
    key: string
    /** The fields to read back. Anything not asked for is not sent. */
    fields: string[]
  },
): Promise<Record<string, unknown>> {
  const operation = 'Jira issue read'
  // The KEY is encoded here, on top of the cloudId `jiraApiUrl` handles: it is the
  // one value in this address a renderer supplies, and a key that reshaped the URL
  // would address a different endpoint entirely rather than fail as a 404.
  const url = jiraApiUrl(deps, args.cloudId, `/issue/${encodeURIComponent(args.key)}`)
    + `?fields=${encodeURIComponent(args.fields.join(','))}`
  const response = await send(deps, operation, url, {
    headers: { Authorization: `Bearer ${args.accessToken}`, Accept: 'application/json' },
  })
  // No shape check beyond "it is an object": unlike the search, there is no array
  // whose absence would turn a broken read into an innocuous-looking empty one —
  // every field of this body is optional to the mapper by design.
  return readJson(response, operation)
}
