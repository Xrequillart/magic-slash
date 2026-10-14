import type { SupabaseClient } from '@supabase/supabase-js'
import { t as translate } from '../i18n'
import { getAuthedClient } from '../cloud/auth'
import { loadSession } from '../cloud/session-store'
import { WEBAPP_BASE_URL } from '../jira/constants'
import { agentNotification, subjectOf } from '../notifications/agent-message'
import { getTerminal } from '../pty/terminal-manager'
import { getPendingQuestion } from '../questions/pending-questions'
import { pushAad, sealPush, type PushKind, type PushPayload } from './crypto'
import { loadIdentity } from './identity-store'
import { isRemoteModeEnabled } from './remote-mode'
import { terminalOwner } from './terminal-owners'

// ---------------------------------------------------------------------------
// Push notifications to the paired phones (#355, PROTOCOL.md §14).
//
// When an agent starts waiting or finishes, each paired phone that sent its push key gets a
// box sealed under that key, which this Mac posts to the web server; the server relays it to
// APNs without being able to read it, and the phone's Notification Service Extension opens it.
//
// Independent of the relay channel: it reads the paired phones from the identity file, so it
// works while the relay is reconnecting too. Remote mode off means nothing goes out, as for
// everything else remote (§9).
//
// NOTHING READABLE IN THE LOGS: a failure is logged by its status or error name, never with
// a title, a body or a box.
// ---------------------------------------------------------------------------

/**
 * Per terminal and kind: a state that flaps does not ring the phone each time. A `waiting`
 * claim is released as soon as the agent leaves that state (clearRemotePushCooldown), so a
 * second question asked a few seconds after the first one still rings.
 */
const COOLDOWN_MS = 30_000
/** How long a `waiting` push waits for the question to land: its hook may come after the state. */
const QUESTION_WAIT_MS = 2_000
const QUESTION_POLL_MS = 100
/** A waiting body: the question, cut so it fits a lock-screen notification. */
const QUESTION_MAX_CHARS = 180
const REQUEST_TIMEOUT_MS = 10_000
const PUSH_URL = `${WEBAPP_BASE_URL}/api/push`

const lastSent = new Map<string, number>()

export interface PushDeps {
  fetch?: typeof fetch
  /** How long a `waiting` push waits for the pending question; tests shorten it. */
  questionWaitMs?: number
}

function sessionUserId(): string | null {
  const id = loadSession()?.user?.id
  return typeof id === 'string' && id ? id.toLowerCase() : null
}

/** `text` cut at `max` characters (code points, so an emoji is never split), with an ellipsis. */
export function truncateQuestion(text: string, max = QUESTION_MAX_CHARS): string {
  const chars = Array.from(text.trim().replace(/\s+/g, ' '))
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`
}

/** The agent's pending question, waiting up to `ms` for it to arrive. */
async function waitForQuestion(terminalId: string, ms: number): Promise<string | undefined> {
  const deadline = Date.now() + ms
  for (;;) {
    const prompt = getPendingQuestion(terminalId)?.prompt?.trim()
    if (prompt) return prompt
    if (Date.now() >= deadline) return undefined
    await new Promise((resolve) => setTimeout(resolve, QUESTION_POLL_MS))
  }
}

/** The notification's text, as the desktop's own says it; a known question becomes the body. */
async function render(terminalId: string, kind: PushKind, questionWaitMs: number): Promise<{ title: string; body: string }> {
  const terminal = getTerminal(terminalId)
  const text = agentNotification(translate, kind, subjectOf(terminal, terminal?.name ?? ''))
  if (kind !== 'waiting') return text
  const question = await waitForQuestion(terminalId, questionWaitMs)
  // The title then names the agent ("PROJ-12 needs your answer"), the body asks the question.
  return question ? { title: text.body, body: truncateQuestion(question) } : text
}

async function accessToken(client: SupabaseClient, refresh: boolean): Promise<string | null> {
  const { data } = refresh ? await client.auth.refreshSession() : await client.auth.getSession()
  // A refresh rotates the refresh token: getAuthedClient() writes it back to disk, or the next
  // launch would replay the consumed one and reuse detection would sign the user out.
  if (refresh && data.session) await getAuthedClient()
  return data.session?.access_token ?? null
}

async function post(doFetch: typeof fetch, token: string, body: string): Promise<number> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await doFetch(PUSH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })
    return response.status
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Tell the paired phones that an agent waits for an answer or has finished. Never throws, and
 * resolves once every post is done (or failed). A no-op when remote mode is off, signed out,
 * the terminal is another account's, no phone has a push key yet, or the same notification
 * went out less than 30 s ago.
 *
 * `appAgentId` is the terminal id: it is what the snapshots carry and what `agents.app_agent_id`
 * holds, so the phone opens the agent a tap names.
 */
export async function sendRemotePush(terminalId: string, kind: PushKind, deps: PushDeps = {}): Promise<void> {
  try {
    if (!isRemoteModeEnabled()) return
    const cooldownKey = `${terminalId}|${kind}`
    // Checked before the disk reads below: a state that flaps costs nothing.
    if (Date.now() - (lastSent.get(cooldownKey) ?? 0) < COOLDOWN_MS) return
    const uid = sessionUserId()
    if (!uid || terminalOwner(terminalId) !== uid) return
    const identity = loadIdentity(uid)
    const devices = identity?.devices.filter((d) => d.pushKey) ?? []
    if (!identity || devices.length === 0) return

    // Claimed before the awaits: a second transition meanwhile finds it taken.
    lastSent.set(cooldownKey, Date.now())

    const { title, body } = await render(terminalId, kind, deps.questionWaitMs ?? QUESTION_WAIT_MS)
    const payload: PushPayload = { kind, appAgentId: terminalId, title, body, sentAt: Date.now() }
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
    const requests = devices.map((d) => JSON.stringify({
      phoneId: d.phoneId,
      macId: identity.macId,
      kind,
      // Standard padded base64, as the route expects.
      box: sealPush(
        Buffer.from(d.pushKey!, 'base64'),
        plaintext,
        pushAad({ macId: identity.macId, phoneId: d.phoneId, pairingId: d.pairingId, kind }),
      ).toString('base64'),
    }))

    const client = await getAuthedClient()
    let token = client ? await accessToken(client, false) : null
    if (!client || !token) {
      // Nothing went out: the next transition may try again.
      lastSent.delete(cooldownKey)
      return
    }
    const doFetch = deps.fetch ?? fetch
    // One refresh at most for the whole batch, shared by every post that met a 401.
    let refreshed: Promise<string | null> | null = null

    await Promise.all(requests.map(async (request) => {
      try {
        let status = await post(doFetch, token!, request)
        if (status === 401) {
          refreshed ??= accessToken(client, true).catch(() => null)
          const fresh = await refreshed
          if (!fresh) return
          token = fresh
          status = await post(doFetch, fresh, request)
        }
        // 404 not paired, 410 token gone, 500 not configured, 502 APNs: nothing to do here,
        // the phone's own row is the server's business. Logged by status alone.
        if (status !== 200) console.warn(`[remote] push answered ${status}`)
      } catch (error) {
        console.warn('[remote] push failed:', error instanceof Error ? error.name : 'unknown error')
      }
    }))
  } catch (error) {
    console.error('[remote] push not sent:', error instanceof Error ? error.name : 'unknown error')
  }
}

/** The agent left `kind`: its next entry into it is a new event, never a flap. */
export function clearRemotePushCooldown(terminalId: string, kind: PushKind): void {
  lastSent.delete(`${terminalId}|${kind}`)
}

/** Test seam: forget the cooldowns. */
export function __resetRemotePushForTests(): void {
  lastSent.clear()
}
