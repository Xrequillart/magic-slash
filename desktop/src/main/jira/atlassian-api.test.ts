import { describe, it, expect } from 'vitest'
import {
  AtlassianApiError,
  exchangeCode,
  fetchAccessibleResources,
  fetchMyself,
  fetchSprintIssues,
  refreshCredential,
  type AtlassianDeps,
  type FetchLike,
} from './atlassian-api'

// A hand-written transport rather than a mocked `fetch`: the module takes its
// transport as a parameter precisely so this suite needs neither the network nor
// the root node_modules to hold anything it does not already have.

interface Call {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

function stub(
  answer: (call: Call) => { status?: number; body?: unknown; unreadable?: boolean } | 'throw',
): { deps: AtlassianDeps; calls: Call[] } {
  const calls: Call[] = []
  const fetchLike: FetchLike = async (url, init) => {
    const call: Call = {
      url,
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body ? JSON.parse(init.body) : undefined,
    }
    calls.push(call)
    const result = answer(call)
    if (result === 'throw') throw new TypeError('fetch failed: connect ECONNREFUSED 127.0.0.1:443')
    const status = result.status ?? 200
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (result.unreadable) throw new SyntaxError('Unexpected token < in JSON')
        return result.body
      },
    }
  }
  return {
    deps: {
      fetch: fetchLike,
      tokenUrl: 'https://app.magic-slash.io/api/atlassian/token',
      apiBaseUrl: 'https://api.atlassian.com',
    },
    calls,
  }
}

const TOKEN_BODY = {
  access_token: 'atl-access-token',
  refresh_token: 'atl-refresh-token',
  expires_in: 3600,
  scope: 'read:jira-work offline_access',
  token_type: 'Bearer',
}

describe('exchangeCode', () => {
  it('posts the authorization_code grant to the webapp, never to Atlassian', () => {
    // The client secret lives on the webapp; a desktop build that talked straight
    // to auth.atlassian.com could not complete the exchange, and would have to ship
    // the secret to try.
    const { deps, calls } = stub(() => ({ body: TOKEN_BODY }))
    return exchangeCode(deps, { code: 'the-code', verifier: 'the-verifier' }).then(() => {
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toBe('https://app.magic-slash.io/api/atlassian/token')
      expect(calls[0].method).toBe('POST')
      expect(calls[0].body).toEqual({
        grant_type: 'authorization_code',
        code: 'the-code',
        code_verifier: 'the-verifier',
      })
    })
  })

  it('returns the token payload it was handed', async () => {
    const { deps } = stub(() => ({ body: TOKEN_BODY }))
    const payload = await exchangeCode(deps, { code: 'c', verifier: 'v' })
    expect(payload).toEqual(TOKEN_BODY)
  })

  it('rejects a 200 that carries no access token', async () => {
    const { deps } = stub(() => ({ body: { refresh_token: 'r' } }))
    await expect(exchangeCode(deps, { code: 'c', verifier: 'v' })).rejects.toThrow(AtlassianApiError)
  })

  it('reports a mismatched verifier as a rejected grant, not an outage', async () => {
    // Atlassian answers 400 `invalid_grant`. The caller must be able to tell that
    // apart from a 503, which means "try again later".
    const { deps } = stub(() => ({ status: 400, body: { error: 'invalid_grant' } }))
    const error = await exchangeCode(deps, { code: 'c', verifier: 'v' }).catch((e) => e)
    expect(error).toBeInstanceOf(AtlassianApiError)
    expect((error as AtlassianApiError).rejectedGrant).toBe(true)
    expect((error as AtlassianApiError).unauthorized).toBe(false)
  })
})

describe('refreshCredential', () => {
  it('posts the refresh_token grant to the same webapp route', async () => {
    const { deps, calls } = stub(() => ({ body: TOKEN_BODY }))
    await refreshCredential(deps, { refreshToken: 'old-refresh' })
    expect(calls[0].url).toBe('https://app.magic-slash.io/api/atlassian/token')
    expect(calls[0].body).toEqual({ grant_type: 'refresh_token', refresh_token: 'old-refresh' })
  })

  it('surfaces the ROTATED refresh token, which the caller must persist', async () => {
    // Atlassian invalidates the old refresh token on every refresh. Dropping the
    // new one locks the user out an hour later, with no visible cause.
    const { deps } = stub(() => ({ body: { ...TOKEN_BODY, refresh_token: 'brand-new-refresh' } }))
    const payload = await refreshCredential(deps, { refreshToken: 'old-refresh' })
    expect(payload.refresh_token).toBe('brand-new-refresh')
  })

  it('flags a revoked refresh token as a rejected grant', async () => {
    const { deps } = stub(() => ({ status: 400, body: { error: 'invalid_grant' } }))
    const error = await refreshCredential(deps, { refreshToken: 'revoked' }).catch((e) => e)
    expect(error).toBeInstanceOf(AtlassianApiError)
    expect((error as AtlassianApiError).rejectedGrant).toBe(true)
  })

  it('does NOT flag an outage as a rejected grant', async () => {
    // The difference between "the user revoked us" and "Atlassian is down" is the
    // difference between marking the credential unverified and doing nothing.
    for (const status of [429, 500, 502, 503]) {
      const { deps } = stub(() => ({ status, body: {} }))
      const error = await refreshCredential(deps, { refreshToken: 'r' }).catch((e) => e)
      expect((error as AtlassianApiError).rejectedGrant, `HTTP ${status}`).toBe(false)
    }
  })

  it('reports a transport failure as status 0, not as a rejected grant', async () => {
    const { deps } = stub(() => 'throw')
    const error = await refreshCredential(deps, { refreshToken: 'r' }).catch((e) => e)
    expect(error).toBeInstanceOf(AtlassianApiError)
    expect((error as AtlassianApiError).status).toBe(0)
    expect((error as AtlassianApiError).rejectedGrant).toBe(false)
  })
})

/**
 * The forwarded OAuth error code — the evidence the revocation decision rests on.
 *
 * A status is one integer that three layers rewrite: the token exchange goes through
 * the webapp (which holds the client secret and sanitises what comes back), and folding
 * a 429 into a 400 there once made a rate limit indistinguishable from a revoked
 * credential. The code says what actually happened. Driven over the hop as a whole in
 * `revocation.test.ts`; this is the classification on its own.
 */
describe('the forwarded OAuth error code', () => {
  const failWith = (status: number, body: unknown): Promise<AtlassianApiError> => {
    const { deps } = stub(() => ({ status, body }))
    return refreshCredential(deps, { refreshToken: 'r' }).then(
      () => { throw new Error(`HTTP ${status} did not fail`) },
      (error: AtlassianApiError) => error,
    )
  }

  it('lets a code overrule a status that says otherwise', async () => {
    // The regression, at this level: 400 is what the hop answers for every refused
    // request, and `atlassian_error` is what it sends when Atlassian named no code.
    // Neither is evidence of a revocation, so neither may read as one.
    const error = await failWith(400, { error: 'atlassian_error' })
    expect(error.rejectedGrant).toBe(false)
  })

  it('still trusts the status when there is no code to go on', async () => {
    // A Jira read's 401, an HTML error page, a body that is not JSON: the old
    // behaviour, unchanged.
    for (const body of [{}, null, 'a string', { error: 'Not A Code' }, { error: 'x'.repeat(41) }]) {
      expect((await failWith(400, body)).rejectedGrant, JSON.stringify(body)).toBe(true)
      expect((await failWith(429, body)).rejectedGrant, JSON.stringify(body)).toBe(false)
    }
  })

  it('counts only the terminal codes as a rejected grant', async () => {
    for (const code of ['invalid_grant', 'unauthorized_client']) {
      expect((await failWith(400, { error: code })).rejectedGrant, code).toBe(true)
    }
    // Conditions, not verdicts: waiting or retrying is the answer to all of these.
    for (const code of ['invalid_request', 'temporarily_unavailable', 'rate_limit_exceeded', 'server_not_configured']) {
      expect((await failWith(400, { error: code })).rejectedGrant, code).toBe(false)
    }
  })

  it('keeps the code out of the message, which stays operation plus status', async () => {
    const error = await failWith(400, { error: 'invalid_grant' })
    expect(error.errorCode).toBe('invalid_grant')
    expect(error.message).toBe('Atlassian token refresh failed (HTTP 400)')
  })
})

describe('fetchAccessibleResources', () => {
  it('reads the sites from Atlassian with the access token as a bearer', async () => {
    const { deps, calls } = stub(() => ({
      body: [
        { id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' },
        { id: 'cloud-2', url: 'https://other.atlassian.net', name: 'Other' },
      ],
    }))
    const sites = await fetchAccessibleResources(deps, 'atl-access-token')
    expect(calls[0].url).toBe('https://api.atlassian.com/oauth/token/accessible-resources')
    expect(calls[0].headers.Authorization).toBe('Bearer atl-access-token')
    expect(sites).toEqual([
      { id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' },
      { id: 'cloud-2', url: 'https://other.atlassian.net', name: 'Other' },
    ])
  })

  it('drops entries with no id or no url — a site we cannot address is not a site', async () => {
    const { deps } = stub(() => ({
      body: [
        { url: 'https://acme.atlassian.net', name: 'No id' },
        { id: 'cloud-2', name: 'No url' },
        { id: 'cloud-3', url: 'https://third.atlassian.net' },
        'not an object',
        null,
      ],
    }))
    const sites = await fetchAccessibleResources(deps, 'token')
    // The nameless one keeps its URL as a label rather than rendering blank.
    expect(sites).toEqual([{ id: 'cloud-3', url: 'https://third.atlassian.net', name: 'https://third.atlassian.net' }])
  })

  it('distinguishes a 401 from every other failure', async () => {
    const { deps } = stub(() => ({ status: 401, body: {} }))
    const error = await fetchAccessibleResources(deps, 'stale').catch((e) => e)
    expect(error).toBeInstanceOf(AtlassianApiError)
    expect((error as AtlassianApiError).unauthorized).toBe(true)

    const { deps: down } = stub(() => ({ status: 503, body: {} }))
    const outage = await fetchAccessibleResources(down, 'fine').catch((e) => e)
    expect((outage as AtlassianApiError).unauthorized).toBe(false)
  })

  it('rejects a body that is not an array', async () => {
    const { deps } = stub(() => ({ body: { resources: [] } }))
    await expect(fetchAccessibleResources(deps, 'token')).rejects.toThrow(AtlassianApiError)
  })
})

describe('fetchMyself', () => {
  it('reads the identity through the Jira proxy for the given cloud id', async () => {
    const { deps, calls } = stub(() => ({ body: { displayName: 'Ada Lovelace', accountId: 'acc-1' } }))
    const me = await fetchMyself(deps, 'atl-access-token', 'cloud-1')
    expect(calls[0].url).toBe('https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/myself')
    expect(calls[0].headers.Authorization).toBe('Bearer atl-access-token')
    expect(me).toEqual({ displayName: 'Ada Lovelace', accountId: 'acc-1' })
  })

  it('encodes the cloud id instead of letting it reshape the path', async () => {
    const { deps, calls } = stub(() => ({ body: { displayName: 'A', accountId: 'acc-1' } }))
    await fetchMyself(deps, 'token', '../../evil?x=')
    expect(calls[0].url).toBe('https://api.atlassian.com/ex/jira/..%2F..%2Fevil%3Fx%3D/rest/api/3/myself')
  })

  it('falls back to the account id when Jira returns no display name', async () => {
    const { deps } = stub(() => ({ body: { accountId: 'acc-1' } }))
    expect(await fetchMyself(deps, 'token', 'cloud-1')).toEqual({
      displayName: 'acc-1',
      accountId: 'acc-1',
    })
  })

  it('rejects an identity with no account id', async () => {
    const { deps } = stub(() => ({ body: { displayName: 'Ada' } }))
    await expect(fetchMyself(deps, 'token', 'cloud-1')).rejects.toThrow(AtlassianApiError)
  })

  it('flags a 401 as unauthorized — the revocation signal on the read path', async () => {
    const { deps } = stub(() => ({ status: 401, body: {} }))
    const error = await fetchMyself(deps, 'stale', 'cloud-1').catch((e) => e)
    expect((error as AtlassianApiError).unauthorized).toBe(true)
  })
})

describe('fetchSprintIssues', () => {
  const ARGS = {
    accessToken: 'atl-access-token',
    cloudId: 'cloud-1',
    jql: 'project = "PROJ" AND sprint in openSprints()',
    fields: ['summary', 'status', 'created'],
    maxResults: 50,
  }

  it('posts the JQL to the Jira proxy for this cloud id', async () => {
    const { deps, calls } = stub(() => ({ body: { issues: [] } }))
    await fetchSprintIssues(deps, ARGS)

    expect(calls[0].url).toBe('https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/search/jql')
    expect(calls[0].method).toBe('POST')
    expect(calls[0].headers.Authorization).toBe('Bearer atl-access-token')
    expect(calls[0].body).toEqual({ jql: ARGS.jql, fields: ARGS.fields, maxResults: 50 })
  })

  it('encodes the cloud id rather than letting it reshape the URL', async () => {
    const { deps, calls } = stub(() => ({ body: { issues: [] } }))
    await fetchSprintIssues(deps, { ...ARGS, cloudId: '../../evil' })

    expect(calls[0].url).toBe('https://api.atlassian.com/ex/jira/..%2F..%2Fevil/rest/api/3/search/jql')
  })

  it('sends the page token only when there is one', async () => {
    const { deps, calls } = stub(() => ({ body: { issues: [] } }))
    await fetchSprintIssues(deps, { ...ARGS, pageToken: 'cursor-2' })

    expect(calls[0].body).toMatchObject({ nextPageToken: 'cursor-2' })
  })

  it('returns the issues untouched, and the cursor when Jira offers one', async () => {
    // Shaping them is `sprint-issues.ts`'s job: this file owns the transport and the
    // rule that no response body ever reaches an error or a log, and nothing else.
    const { deps } = stub(() => ({ body: { issues: [{ key: 'PROJ-1' }], nextPageToken: 'cursor-2' } }))

    expect(await fetchSprintIssues(deps, ARGS)).toEqual({
      issues: [{ key: 'PROJ-1' }],
      nextPageToken: 'cursor-2',
    })
  })

  it('reads a last page as having no cursor', async () => {
    // The search is paginated by TOKEN and reports no total at all, so the absence
    // of a cursor is the only end-of-list signal there is.
    const { deps } = stub(() => ({ body: { issues: [], isLast: true } }))
    expect((await fetchSprintIssues(deps, ARGS)).nextPageToken).toBeNull()
  })

  it('refuses a body with no issues array instead of calling it an empty sprint', async () => {
    // "Nothing to do" and "we did not understand the answer" must not look alike:
    // an empty card would hide a broken read behind an ordinary-looking one.
    const { deps } = stub(() => ({ body: { warningMessages: ['nope'] } }))
    await expect(fetchSprintIssues(deps, ARGS)).rejects.toThrow('unexpected body')
  })

  it('reports an HTTP failure as an operation and a status', async () => {
    const { deps } = stub(() => ({ status: 400, body: { errorMessages: ["Field 'sprint' does not exist"] } }))
    await expect(fetchSprintIssues(deps, ARGS)).rejects.toMatchObject({ status: 400 })
  })

  it('reports a transport failure as status 0', async () => {
    const { deps } = stub(() => 'throw')
    await expect(fetchSprintIssues(deps, ARGS)).rejects.toMatchObject({ status: 0 })
  })
})

describe('never leaking a secret into an error', () => {
  // The reason this module reports failures as an operation plus a status: the
  // natural `throw new Error(await res.text())` puts the echoed request — code,
  // verifier, token and all — straight into the logs.
  const SECRETS = ['the-code', 'the-verifier', 'atl-access-token', 'atl-refresh-token', 'revoked']

  const assertClean = (error: unknown) => {
    const serialized = `${(error as Error).message}\n${(error as Error).stack ?? ''}\n${JSON.stringify(
      error,
      Object.getOwnPropertyNames(error),
    )}`
    for (const secret of SECRETS) {
      expect(serialized, `leaked ${secret}`).not.toContain(secret)
    }
  }

  it('keeps the code and the verifier out of an exchange failure', async () => {
    for (const answer of [
      { status: 400, body: { error: 'invalid_grant', request: { code: 'the-code', code_verifier: 'the-verifier' } } },
      { status: 500, unreadable: true },
    ] as const) {
      const { deps } = stub(() => answer)
      assertClean(await exchangeCode(deps, { code: 'the-code', verifier: 'the-verifier' }).catch((e) => e))
    }
  })

  it('keeps the refresh token out of a refresh failure', async () => {
    const { deps } = stub(() => ({ status: 400, body: { error: 'invalid_grant', hint: 'revoked' } }))
    assertClean(await refreshCredential(deps, { refreshToken: 'revoked' }).catch((e) => e))
  })

  it('keeps the access token out of a sprint read failure', async () => {
    const { deps } = stub(() => ({ status: 403, body: { errorMessages: ['atl-access-token cannot browse PROJ'] } }))
    assertClean(await fetchSprintIssues(deps, {
      accessToken: 'atl-access-token',
      cloudId: 'cloud-1',
      jql: 'project = "PROJ"',
      fields: ['summary'],
      maxResults: 50,
    }).catch((e) => e))
  })

  it('keeps the access token out of a read failure, transport included', async () => {
    const { deps } = stub(() => ({ status: 401, body: { message: 'atl-access-token is not valid' } }))
    assertClean(await fetchMyself(deps, 'atl-access-token', 'cloud-1').catch((e) => e))

    const { deps: dead } = stub(() => 'throw')
    assertClean(await fetchAccessibleResources(dead, 'atl-access-token').catch((e) => e))
  })
})
