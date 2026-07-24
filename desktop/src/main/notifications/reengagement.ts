import type { OrgAgent, OrgAgentChange } from '../../types'
import { addOrgAgentChangeListener } from '../cloud/realtime'
import { loadSession } from '../cloud/session-store'
import { getStore } from '../store/Store'

// ---------------------------------------------------------------------------
// Re-engagement notifications (main process).
//
// Subscribes to the org-agents realtime stream (via the fan-out listener added
// in cloud/realtime) and surfaces two OS notifications designed to bring the
// user back into the app — the "no daily trigger" adoption blocker (#128):
//
//   (a) a colleague picked up a ticket the current user also has an agent for;
//   (b) one of the current user's own PRs went to changes-requested.
//
// Both fire through the shared notificationCallback (which already guards on
// !window.isFocused and wires click → focus), with a per-key 5-minute cooldown
// mirroring the PRReviewWatcher. We deliberately do NOT attempt GitHub-login-
// targeted "your review" notifications — there is no GH-identity mapping.
// ---------------------------------------------------------------------------

const COOLDOWN_MS = 5 * 60 * 1000

export function setupReengagementNotifications(
  showNotification: (title: string, body: string) => void,
): () => void {
  // owner_id (auth.users id) of the signed-in user. Re-read on every event so a
  // sign-out / different user is picked up without re-wiring.
  let myId: string | undefined = loadSession()?.user?.id
  // Latest known roster keyed by DB row uuid, so we can (1) know which tickets
  // the current user owns and (2) detect transitions (e.g. → changes-requested).
  const roster = new Map<string, OrgAgent>()
  const lastNotifiedAt = new Map<string, number>()
  let seeded = false
  let seeding = false

  const cooldownOk = (key: string): boolean => {
    const now = Date.now()
    const last = lastNotifiedAt.get(key) ?? 0
    if (now - last < COOLDOWN_MS) return false
    lastNotifiedAt.set(key, now)
    return true
  }

  // Seed the roster once from the store so "a colleague picked up MY ticket" can
  // match the current user's existing agents even if they never emit a change.
  // Best-effort: retried on the first realtime event if it returned empty (the
  // backend may not be authed/hydrated yet at wiring time).
  const ensureSeeded = async (): Promise<void> => {
    // `seeding` guards against an event burst on realtime connect each firing its
    // own concurrent (fire-and-forget) load before the first resolves.
    if (seeded || seeding) return
    seeding = true
    try {
      const agents = await getStore().loadOrgAgents()
      for (const a of agents) if (!roster.has(a.id)) roster.set(a.id, a)
      if (agents.length > 0) seeded = true
    } catch {
      /* keep seeded=false so a later event retries */
    } finally {
      seeding = false
    }
  }
  void ensureSeeded()

  const ownsTicket = (ticketId: string, exceptRowId: string): boolean => {
    for (const a of roster.values()) {
      if (a.id === exceptRowId) continue
      if (a.ownerId === myId && a.ticketId === ticketId) return true
    }
    return false
  }

  const unsubscribe = addOrgAgentChangeListener((change: OrgAgentChange) => {
    myId = loadSession()?.user?.id ?? myId
    void ensureSeeded()
    if (!myId) return

    const prev = roster.get(change.id)

    if (change.eventType === 'DELETE') {
      roster.delete(change.id)
      return
    }

    const agent = change.agent
    if (!agent) return
    roster.set(agent.id, agent)

    // (a) A colleague picked up a ticket the current user is also on.
    if (agent.ownerId && agent.ownerId !== myId && agent.ticketId && ownsTicket(agent.ticketId, agent.id)) {
      const isNewPickup = !prev || prev.ownerId !== agent.ownerId || prev.ticketId !== agent.ticketId
      if (isNewPickup && cooldownOk(`pickup:${agent.ticketId}:${agent.ownerId}`)) {
        showNotification(
          `A colleague picked up ${agent.ticketId}`,
          `A teammate is now working on ${agent.ticketId} — you also have an agent on it.`,
        )
      }
    }

    // (b) One of the current user's own PRs transitioned to changes-requested.
    if (agent.ownerId === myId && agent.prReviews) {
      for (const review of agent.prReviews) {
        if (review.status !== 'changes-requested') continue
        const wasAlreadyChanges = prev?.prReviews?.some(
          (p) => p.repo === review.repo && p.status === 'changes-requested',
        )
        if (wasAlreadyChanges) continue
        if (cooldownOk(`changes:${review.prUrl ?? review.repo}`)) {
          showNotification(
            'Changes requested on your PR',
            `${agent.ticketId ?? agent.name}: a reviewer requested changes.`,
          )
        }
      }
    }
  })

  return unsubscribe
}
