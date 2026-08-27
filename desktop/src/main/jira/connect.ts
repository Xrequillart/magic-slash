import { shell } from 'electron'
import type { JiraAuthStatus, JiraConnectResult, JiraDisconnectReason } from '../../types'
import { readConfig, setIntegration } from '../config/config'
import { getServerPort } from '../hooks/status-server'
import {
  AtlassianApiError,
  exchangeCode,
  fetchAccessibleResources,
  fetchMyself,
  refreshCredential,
  type AtlassianDeps,
  type AtlassianTokenPayload,
} from './atlassian-api'
import {
  ATLASSIAN_API_BASE_URL,
  ATLASSIAN_CLIENT_ID,
  REDIRECT_URI,
  SCOPES,
  TOKEN_URL,
} from './constants'
import { buildAuthorizeUrl, buildState, createNonce, createPkcePair, isNonce } from './pkce'
import * as tokenStore from './token-store'
import { KeychainUnavailableError, type StoredJiraCredential } from './token-store'

/**
 * The orchestrator of the Atlassian connect flow: one click, one browser consent
 * screen, one credential on this machine.
 *
 * ─── The route, and why it bends the way it does ────────────────────────────────
 *  1. Here: a PKCE pair and a nonce. `nonce → verifier` is held in RAM ONLY, in
 *     `pending` below. Nothing about an in-flight attempt ever touches disk.
 *  2. `shell.openExternal` on Atlassian's consent screen, with
 *     `state = <nonce>.<port>` — the port of this machine's loopback status server.
 *     Atlassian will only redirect to a pre-registered HTTPS URL, which is why the
 *     redirect target is the webapp rather than 127.0.0.1.
 *  3. The webapp callback validates the state and bounces the BROWSER to
 *     `http://127.0.0.1:<port>/jira/callback?code=…&state=<nonce>`.
 *  4. `completeConnect` looks the verifier up by nonce and POSTs `code` + verifier
 *     to the webapp's token route over HTTPS. THE TOKENS COME BACK IN THAT
 *     RESPONSE BODY — they never enter the browser, its history, or the loopback
 *     leg. That is the whole reason for the detour.
 *  5. Resolve `cloudId` → verify with `myself` → and ONLY THEN persist.
 *
 * ─── Two orderings that are not cosmetic ────────────────────────────────────────
 * Verification before persistence: a credential that cannot name its own owner is
 * not one to keep, and a half-written credential is worse than none.
 *
 * `token-store.save()` before ANY `connected: true` emission and before
 * `setIntegration('atlassian', true)`: `save()` throws when the OS keychain is
 * unavailable, and a UI that said "Connected" over a discarded secret would be
 * lying — the user would find themselves disconnected at the next restart with no
 * idea why. So the save is the commit point; everything that announces success
 * happens strictly after it returns.
 *
 * ─── Revocation ────────────────────────────────────────────────────────────────
 * TWO paths mark the credential `unverified`, and NEITHER deletes it: a 401 on a
 * Jira read (`reportUnauthorized`) and a rejected `refresh_token` grant (the real
 * revocation). A site outage answers 401 too, and an incident must not cost the
 * user their refresh token — so the credential is marked, the UI offers
 * "Reconnect", and a later successful refresh clears the mark on its own.
 *
 * The 401 path tries one repair before it marks: a stale `cloudId` — the site moved —
 * answers 401 exactly like a revoked token, so accessible-resources is re-resolved
 * and the stored site updated if it changed. See `reportUnauthorized`.
 *
 * This module imports `electron` freely: it is main-process-only, and the one suite
 * that drives it (`no-token-leak.test.ts`) mocks `electron` wholesale rather than
 * importing it. The parts that had to be testable WITHOUT that scaffolding were
 * extracted into `pkce.ts` and `atlassian-api.ts`, which is why they are pure.
 */

/**
 * A failure this module authored, as opposed to one that came back from a network
 * call or a library.
 *
 * The distinction exists for `describe()` below: our own messages are known to
 * carry no secret and are worth LOGGING, while anything from elsewhere is reduced to
 * its class name.
 *
 * Log lines, and nothing else. These sentences are authored in English in the main
 * process, which cannot know the user's language, so none of them may ever reach a
 * toast — every outcome the user is told about travels as a machine reason code
 * (`JiraConnectResult`, `JiraDisconnectReason`) that the renderer translates from
 * `i18n/en.ts` / `i18n/fr.ts`.
 */
class JiraFlowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JiraFlowError'
  }
}

/** Bound once by `ipc/jira-handlers.ts`, which forwards to the renderer. */
type StatusListener = (status: JiraAuthStatus, reason?: JiraDisconnectReason) => void

let statusListener: StatusListener | null = null

export function setStatusListener(listener: StatusListener): void {
  statusListener = listener
}

/**
 * The one connect attempt waiting for the browser to come back.
 *
 * A single slot, because a new click supersedes whatever was pending (see
 * `beginConnect`): the user is starting over, and the older verifier is of no use to
 * them. The nonce is stored alongside the verifier so a callback can prove it belongs
 * to THIS attempt.
 */
let pending: { nonce: string; verifier: string; timer: NodeJS.Timeout } | null = null

/**
 * How long a pending attempt is kept.
 *
 * Long enough for a real consent screen (an unauthenticated user has to sign in to
 * Atlassian first, possibly through an IdP), short enough that a verifier is not
 * sitting in memory for the rest of the session. On expiry the attempt is dropped
 * and the UI is told WHY, so a browser tab abandoned an hour ago cannot silently
 * connect an account later.
 */
const PENDING_TTL_MS = 5 * 60 * 1000

/**
 * Refresh this long before the deadline rather than at it.
 *
 * A token that expires mid-request fails as a 401, which this feature reads as a
 * possible revocation — so the margin is not about latency, it is about not
 * mistaking our own clock for the user having revoked us.
 */
const EXPIRY_SKEW_MS = 60 * 1000

const deps: AtlassianDeps = {
  // Wrapped rather than passed by reference: `fetch` is only structurally
  // compatible with `FetchLike`, and the wrapper is where that stays visible.
  fetch: (url, init) => fetch(url, init),
  tokenUrl: TOKEN_URL,
  apiBaseUrl: ATLASSIAN_API_BASE_URL,
}

/**
 * The credential, cached after the first read.
 *
 * THREE states in one variable: `undefined` is "not read yet", `null` is "read, and
 * there is nothing". The distinction has to exist — without it, "no credential
 * stored" would hit the keychain on every status read, and Settings reads the status
 * on every open — but it does not need a second flag to carry it.
 */
let credential: StoredJiraCredential | null | undefined

/** The in-flight token refresh, shared by every caller that arrives while it runs. */
let refreshing: Promise<{ accessToken: string; cloudId: string } | null> | null = null

/**
 * Which credential this module is on. Bumped by `disconnect()`, and by nothing else.
 *
 * WHY A COUNTER RATHER THAN CLEARING WHAT IS IN FLIGHT. Every write to the credential
 * — the file AND the cache — sits after an `await` on a network call: the code
 * exchange, the refresh, the site re-resolution. A `disconnect()` that lands while one
 * of those is outstanding cannot call it off; dropping `refreshing` only stops the
 * callers that have not started yet, and a promise already past its own `await` would
 * still run its `tokenStore.save()` and its `credential =` line — putting back on disk,
 * and back in memory, the credential the user just removed. So each of those paths
 * captures the generation BEFORE its first await and re-checks it before it writes:
 * NO WRITE MAY OUTLIVE THE DISCONNECT THAT PRECEDED IT.
 *
 * A counter and not a boolean, because a disconnect can be followed by a reconnect
 * while the same stale call is still in flight — and the write would then land on the
 * NEW credential (a bogus `unverified` mark, a cloud id from the old account), which a
 * "was disconnected" flag would already have cleared by the time it was read.
 */
let generation = 0

/**
 * Whether a disconnect has landed since `epoch` was captured — i.e. whether this write
 * is about a credential that no longer exists. Called immediately before every
 * `tokenStore.save()` and every `credential =` assignment that follows an await.
 */
function superseded(epoch: number): boolean {
  if (epoch === generation) return false
  // Worth a line: it is the difference between a refresh that failed and one that
  // succeeded and was deliberately thrown away. Names nothing — see `describe()`.
  console.error('[Jira] Dropped a credential write that a disconnect had already overtaken')
  return true
}

function currentCredential(): StoredJiraCredential | null {
  if (credential === undefined) credential = tokenStore.load()
  return credential
}

/** Whether this build can connect at all — see `ATLASSIAN_CLIENT_ID`. */
function isConfigured(): boolean {
  return ATLASSIAN_CLIENT_ID !== ''
}

/**
 * The status the renderer sees. DISPLAY ONLY: a name, a site URL, two booleans.
 * No token, no cloud id, no account id — see `JiraAuthStatus` in `types.ts`.
 *
 * Reads from disk on the first call, which is what makes the section show
 * "connected" the instant Settings opens after a restart, with no round trip.
 */
export function getStatus(): JiraAuthStatus {
  const configured = isConfigured()
  const stored = currentCredential()
  if (!stored) return { connected: false, configured }
  return {
    connected: true,
    configured,
    accountName: stored.account_name,
    siteUrl: stored.site_url,
    ...(stored.unverified ? { unverified: true } : {}),
  }
}

function emit(reason?: JiraDisconnectReason): JiraAuthStatus {
  const status = getStatus()
  statusListener?.(status, reason)
  return status
}

/** Drop the pending attempt, if any, and stop its timer. */
function clearPending(): void {
  if (!pending) return
  clearTimeout(pending.timer)
  pending = null
}

/**
 * Start the flow: mint the secrets, remember them in RAM, open the browser.
 *
 * On success returns the CURRENT status (still disconnected) rather than waiting: the
 * flow completes through the browser and the loopback server, minutes later and on
 * another stack entirely, which is why `jira:statusChanged` exists at all.
 *
 * RESOLVES on failure rather than rejecting, with a reason CODE. Two reasons, and
 * neither is style. A rejection would cross the bridge as Electron's own wrapper text
 * (`Error invoking remote method 'jira:connect': …`), which is not something to put in
 * front of a user; and the sentence itself would be authored here, in the main process,
 * which has no idea what language the user reads. So the outcome travels as a code and
 * the renderer composes the message from its catalogues — the same division of labour
 * `JiraDisconnectReason` already uses for the outcomes that arrive by push.
 */
export async function beginConnect(): Promise<JiraConnectResult> {
  if (!isConfigured()) {
    console.error('[Jira] Connect not started: this build has no Atlassian client id')
    return { started: false, failure: 'notConfigured' }
  }
  const port = getServerPort()
  if (!port) {
    // Without the loopback server there is nothing for the webapp to redirect back
    // to, and the browser would end on a dead page holding a live `code`.
    console.error('[Jira] Connect not started: the local callback server is not listening')
    return { started: false, failure: 'noCallbackServer' }
  }

  // A new click supersedes whatever was pending: the user is starting over, and the
  // older verifier is of no use to them.
  clearPending()

  const { verifier, challenge } = createPkcePair()
  const nonce = createNonce()
  const timer = setTimeout(() => {
    // Only if THIS attempt is still the pending one — a later click has its own timer.
    if (pending?.nonce !== nonce) return
    pending = null
    // The browser never came back. Say so — an unexplained "still not connected" is
    // the failure mode this reason code exists to prevent (and it is what the
    // acceptance criteria call a stated reason).
    emit('timeout')
  }, PENDING_TTL_MS)
  // The app must be allowed to quit with an attempt outstanding.
  timer.unref()
  pending = { nonce, verifier, timer }

  try {
    await shell.openExternal(
      buildAuthorizeUrl({
        clientId: ATLASSIAN_CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scopes: SCOPES,
        state: buildState(nonce, port),
        challenge,
      }),
    )
  } catch (error) {
    // The consent screen never opened, so no callback is ever coming. ROLL THE ATTEMPT
    // BACK: leaving `pending` armed would leave its 5-minute timer armed too, and the
    // user who has already been told the browser could not be opened would get a second,
    // contradictory "your browser never came back" toast five minutes later.
    //
    // Guarded on the nonce, like the timer is: a click that landed while this `await` was
    // outstanding owns `pending` now, and its attempt is live.
    if (pending?.nonce === nonce) clearPending()
    console.error('[Jira] Could not open the Atlassian consent screen:', describe(error))
    return { started: false, failure: 'browser' }
  }

  return { started: true, status: getStatus() }
}

/**
 * The browser came back with a code. Redeem it, verify it, store it — in that
 * order.
 *
 * `state` here is the BARE nonce: the webapp already consumed the port half to
 * build the redirect. An unknown or expired nonce is refused outright — it is the
 * only thing tying this callback to an attempt WE started, on a loopback port any
 * local process can reach.
 *
 * Never rejects: the loopback route has already answered the browser by the time
 * this runs, so there is nobody left to catch. Every outcome is reported the only
 * way it can be — by emitting a status, with a reason when there is no credential.
 */
export async function completeConnect(args: { code: string; state: string }): Promise<void> {
  if (!isNonce(args.state) || pending?.nonce !== args.state) {
    // Either the callback carried no usable state, or it names no attempt we started
    // — the only thing tying it to us, on a port any local process can reach.
    console.error('[Jira] Connect failed: the Atlassian callback matched no pending attempt')
    emit('failed')
    return
  }
  // Consumed immediately: a code is redeemable once, and a second callback with the
  // same nonce is either a browser retry or someone replaying the URL.
  const { verifier } = pending
  clearPending()
  // Three network round trips follow, and `disconnect()` has no `pending` attempt left
  // to take away from this one — the nonce was consumed on the line above. The
  // generation is the only thing that can tell this attempt it has been overtaken.
  const epoch = generation

  try {
    const payload = await exchangeCode(deps, { code: args.code, verifier })

    const sites = await fetchAccessibleResources(deps, payload.access_token)
    const site = sites[0]
    if (!site) {
      throw new JiraFlowError('This Atlassian account has no site the app can read')
    }

    // The verification, and the source of the only name the UI shows.
    const me = await fetchMyself(deps, payload.access_token, site.id)

    const stored: StoredJiraCredential = {
      refresh_token: payload.refresh_token ?? '',
      access_token: payload.access_token,
      expires_at: expiryFrom(payload),
      cloud_id: site.id,
      site_url: site.url,
      account_name: me.displayName,
    }
    if (!stored.refresh_token) {
      // No `offline_access` in practice: the credential would die in an hour and the
      // user would be sent back to the browser with no explanation.
      throw new JiraFlowError('Atlassian returned no refresh token, so the connection would not survive an hour')
    }

    // A disconnect landed while the exchange was in flight. The user's last word wins,
    // and committing now would resurrect what they just removed. Nothing has been
    // written yet, so there is nothing to undo, and the disconnect already emitted the
    // disconnected status — there is no second outcome to report.
    if (superseded(epoch)) return

    // THE COMMIT POINT. Throws when the keychain is unavailable; nothing below it
    // may run in that case, or the UI reports a connection that does not exist.
    tokenStore.save(stored)
    credential = stored

    // Display/detection flag only — no token goes anywhere near the config. Guarded
    // because `setIntegration` writes the whole config blob to the cloud store, and a
    // reconnect (the common case for the `unverified` branch) changes nothing here.
    if (!readConfig().integrations?.atlassian) setIntegration('atlassian', true)
    emit()
  } catch (error) {
    // No credential was written (or the write itself failed), so the section must
    // stay on its disconnected branch — with a reason, not a silent no-op.
    //
    // The keychain gets its OWN reason rather than sharing `failed`: it is the one
    // failure mode the acceptance criteria name, and "Could not connect your Atlassian
    // account" would send the user hunting through their Atlassian settings for a
    // problem that is on this machine. Nothing was stored either way — the throw came
    // from the commit point above, so there is nothing to undo.
    console.error('[Jira] Connect failed:', describe(error))
    emit(error instanceof KeychainUnavailableError ? 'keychain' : 'failed')
  }
}

/**
 * The `error=` branch of the callback: the user declined, or Atlassian refused.
 *
 * The attempt is dropped and the UI is told why — WHEN the callback proves it belongs
 * to that attempt. This is what turns "clicked Cancel in the browser" into a visible
 * outcome instead of a Settings section that sits there unchanged forever; an
 * unattributable hit gets nothing, for the reason spelled out below.
 */
export function cancelConnect(args: { state: string | null; reason: JiraDisconnectReason }): JiraAuthStatus {
  // A MATCHING NONCE, or nothing happens. The loopback port is reachable by any local
  // process — and by a web page in the user's own browser walking 127.0.0.1 — so a
  // callback that cannot be attributed to the attempt in flight is not evidence of
  // anything. Treating a stateless hit as a cancellation is how an unrelated probe gets
  // to kill a real consent screen the user is halfway through and drop a failure toast
  // on top of it.
  //
  // Ignored means ignored: the pending attempt keeps its verifier AND its timer, and
  // nothing is emitted. The genuine cancellation — Atlassian's `error=` coming back with
  // our own nonce — is the branch below, unchanged.
  if (!isNonce(args.state) || pending?.nonce !== args.state) {
    console.error('[Jira] Ignored an Atlassian callback that matched no pending attempt')
    return getStatus()
  }
  clearPending()
  return emit(args.reason)
}

/** Forget the credential entirely. The file is the only copy, so this is final. */
export function disconnect(): JiraAuthStatus {
  clearPending()
  // Everything already in flight is working on behalf of a credential that is about to
  // be gone. BOTH halves are needed: dropping the shared promise stops a later caller
  // from adopting a refresh that is now doomed, and the bump is what stops the writes
  // of one that is already past its own await. See `generation`.
  generation += 1
  refreshing = null
  tokenStore.clear()
  credential = null
  // `integrations.atlassian` is deliberately NOT flipped back: it is a user-settable
  // org/machine flag that predates this feature (see `setIntegration`), and a
  // disconnect here is not evidence the user stopped using Atlassian elsewhere.
  return emit()
}

/**
 * A usable access token, refreshed transparently when the stored one has expired.
 *
 * Returns null rather than throwing on every failure mode a caller can do nothing
 * about (no credential, an outage, a keychain that went away): the Jira reads this
 * serves are all "show what you can", and a rejected refresh has already surfaced
 * as a reconnect prompt by the time this returns.
 *
 * CONCURRENT CALLERS SHARE ONE REFRESH. Not an optimisation: Atlassian ROTATES the
 * refresh token, so a second simultaneous refresh would present a token the first
 * has already spent, come back `invalid_grant`, and be read as a revocation — a
 * `Promise.all` over a few Jira reads would manufacture a "reconnect" prompt on a
 * perfectly good credential.
 */
export async function withFreshAccessToken(): Promise<{ accessToken: string; cloudId: string } | null> {
  const stored = currentCredential()
  if (!stored) return null
  if (stored.expires_at - EXPIRY_SKEW_MS > Date.now()) {
    return { accessToken: stored.access_token, cloudId: stored.cloud_id }
  }
  if (!refreshing) {
    // Identity-checked rather than blindly nulled: `disconnect()` drops `refreshing`,
    // so by the time this attempt settles a later caller may already have started its
    // own — and clearing the slot then would let a third caller start a duplicate
    // refresh, which is the one thing the shared promise exists to prevent.
    const attempt = refresh(stored, generation).finally(() => {
      if (refreshing === attempt) refreshing = null
    })
    refreshing = attempt
  }
  return refreshing
}


async function refresh(stored: StoredJiraCredential, epoch: number): Promise<{ accessToken: string; cloudId: string } | null> {
  try {
    const payload = await refreshCredential(deps, { refreshToken: stored.refresh_token })
    const updated: StoredJiraCredential = {
      ...stored,
      access_token: payload.access_token,
      // Atlassian ROTATES the refresh token; keeping the old one locks the user out
      // at the next refresh. Fall back to the current one only if none came back.
      refresh_token: payload.refresh_token ?? stored.refresh_token,
      expires_at: expiryFrom(payload),
      // A successful refresh IS the verification, so it clears an earlier mark.
      unverified: false,
    }
    // The disconnect that landed while Atlassian was answering wins: persisting a
    // rotated refresh token now would resurrect the credential on disk, and handing the
    // access token back would let the caller keep reading a Jira the user unhooked.
    if (superseded(epoch)) return null
    tokenStore.save(updated)
    credential = updated
    if (stored.unverified) emit()
    return { accessToken: updated.access_token, cloudId: updated.cloud_id }
  } catch (error) {
    if (error instanceof AtlassianApiError && error.rejectedGrant) {
      // The real revocation: the user removed the app from their Atlassian account.
      // Marked, not deleted — see this module's header.
      //
      // Straight to the mark, NOT through `reportUnauthorized`: that path re-resolves
      // the site first, which only makes sense for a 401 whose cause is still open. A
      // refused grant is already the answer, and re-resolving it would mean refreshing
      // again with the token that was just rejected.
      markUnverified(epoch)
    } else {
      console.error('[Jira] Token refresh failed:', describe(error))
    }
    return null
  }
}

/**
 * Atlassian refused the stored credential with a 401 on a Jira read.
 *
 * The reason this is public: the reads that will use it land in later work, and every
 * one of them must funnel through here rather than deciding for itself what a 401
 * means.
 *
 * A 401 has THREE causes and only one of them is a revocation:
 *  • the credential really was revoked,
 *  • the site is having an incident,
 *  • or the `cloudId` we stored is no longer the one that site answers to. A cloud id
 *    is not forever — a migration or a sandbox refresh moves it — and a Jira read
 *    addressed to a stale one comes back 401, indistinguishable from the first two.
 *
 * So the third is RULED OUT before anything is concluded: re-resolve
 * accessible-resources with a fresh access token and update `cloud_id` / `site_url` if
 * they moved. That is the "re-resolved on a 401" half of the ticket, and it is the
 * only cause we can actually repair — if it was that, the next read simply works.
 *
 * Everything else still ends in a MARK, and nothing is ever deleted: an incident must
 * not cost the user their refresh token. Idempotent, and cheap when it is a no-op — a
 * credential already marked is left alone, so N failing reads cost one keychain write
 * and one push, not N.
 */
export async function reportUnauthorized(): Promise<void> {
  const epoch = generation
  const stored = currentCredential()
  if (!stored || stored.unverified) return
  if (await reresolveSite(stored, epoch)) return
  markUnverified(epoch)
}

/**
 * Ask Atlassian which sites this credential can reach, and adopt the answer.
 *
 * Returns true only when the stored site actually MOVED — which is the one reading of
 * a 401 this repairs, and therefore the one case where marking the credential would be
 * wrong. A re-resolution that comes back with the same site explains nothing: the 401
 * was the credential or the site, and the caller marks it exactly as it always has.
 *
 * The probe is deliberately `accessible-resources` with a fresh token rather than a
 * bare refresh: it is the only call that answers "which cloud id, today", and it is
 * authenticated, so its own 401 is evidence too — a credential Atlassian will not talk
 * to at all falls through to the mark.
 *
 * Never throws. Every failure here (an outage, a refused refresh, a keychain that went
 * away between the load and the write) leaves the caller doing what it did before this
 * function existed.
 */
async function reresolveSite(stored: StoredJiraCredential, epoch: number): Promise<boolean> {
  try {
    const fresh = await withFreshAccessToken()
    if (!fresh) return false
    const sites = await fetchAccessibleResources(deps, fresh.accessToken)
    // The site we already know, if it is still there; otherwise the first one, the same
    // rule `completeConnect` uses. A multi-site picker is out of scope.
    const site = sites.find((entry) => entry.id === stored.cloud_id) ?? sites[0]
    if (!site) return false

    // A disconnect (or a disconnect and a reconnect) landed while Atlassian was
    // answering. Writing now would either resurrect the old credential or move the NEW
    // one to a site resolved for the account the user just unhooked.
    if (superseded(epoch)) return false

    // Re-read: the refresh above may have replaced the cached credential (rotated
    // refresh token, new expiry), and writing `stored` back would undo that.
    const current = currentCredential()
    if (!current) return false
    if (site.id === current.cloud_id && site.url === current.site_url) return false

    const updated: StoredJiraCredential = { ...current, cloud_id: site.id, site_url: site.url }
    tokenStore.save(updated)
    credential = updated
    // The site URL is on screen, so the move is visible rather than silent.
    emit()
    return true
  } catch (error) {
    console.error('[Jira] Could not re-resolve the Atlassian site:', describe(error))
    return false
  }
}

/**
 * Record that Atlassian refused this credential, and push the reconnect prompt.
 *
 * Read off the cache rather than the keychain — the mark is the only field that
 * changes, and this module is holding the rest.
 *
 * PERSISTING IS BEST-EFFORT; PROMPTING IS NOT. The mark is advisory — it exists to put
 * "Atlassian refused this connection / Reconnect" in front of the user — so a keychain
 * that went away between the load and the write must not be allowed to swallow it. The
 * in-memory credential and the emitted status say `unverified` either way; the cost of a
 * failed write is that the prompt does not survive a restart, which is strictly better
 * than never showing it at all. (A restart re-reads the credential and the next refused
 * call marks it again.)
 *
 * The credential is MARKED, never deleted — see this module's header.
 */
function markUnverified(epoch: number): void {
  // Reached only from a path that has already awaited Atlassian, so it inherits the
  // same rule: a credential that is gone (or one connected since) is not ours to mark.
  if (superseded(epoch)) return
  const stored = currentCredential()
  if (!stored || stored.unverified) return
  const persisted = tokenStore.setUnverified(stored, true)
  // `setUnverified` hands back the credential UNCHANGED when the write failed, so the
  // mark is applied here rather than taken on trust from the return value.
  credential = persisted?.unverified ? persisted : { ...stored, unverified: true }
  emit()
}

/**
 * Atlassian's `expires_in` (seconds from now) as a wall-clock deadline.
 *
 * One hour is Atlassian's own default and the safe assumption when the field is
 * missing: an under-estimate costs one refresh, an over-estimate costs a 401 that
 * would read as a revocation.
 */
function expiryFrom(payload: AtlassianTokenPayload): number {
  const seconds = payload.expires_in && payload.expires_in > 0 ? payload.expires_in : 3600
  return Date.now() + seconds * 1000
}

/**
 * What is safe to log about a failure.
 *
 * `AtlassianApiError` messages are built from an operation name and a status code
 * by construction (see `atlassian-api.ts`); anything else is reduced to its class
 * name, because an error from an unreviewed source is not something to print next
 * to a credential flow.
 */
function describe(error: unknown): string {
  if (error instanceof AtlassianApiError || error instanceof JiraFlowError) return error.message
  if (error instanceof Error) return error.name
  return 'unknown error'
}
