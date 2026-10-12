import type { AuthStatus } from '../../types'
import { refreshUser } from './auth'

/**
 * WATCH FOR AN EMAIL CHANGE THAT IS CONFIRMED SOMEWHERE ELSE.
 *
 * The confirmation link lands in a mailbox and is clicked in a BROWSER — possibly on a
 * phone, certainly not in this process. Supabase applies the change server-side and
 * redirects to the web app; nothing tells the desktop. Before the link, the user typed a
 * code into the app and that keystroke WAS the notification. Now there is none, so this
 * asks, on a timer, and stops as soon as it has an answer.
 *
 * IT LIVES IN MAIN AND NOT IN THE ACCOUNT TAB, which is the decision worth stating. A
 * poller in the renderer dies the moment the user navigates away from Settings — and
 * navigating away is exactly what somebody does while they go and find the email. From
 * here it survives every tab change, and the result reaches the UI the way every other
 * session transition does: one `auth:statusChanged`.
 *
 * ── WHY IT STOPS, AND WHEN ────────────────────────────────────────────────────────
 *
 * THREE ENDINGS, and the app must not be left polling forever by any of them:
 *
 *   * the address changed — the answer arrived, there is nothing left to watch;
 *   * the server says nothing is pending — `new_email` is empty, so the change was
 *     abandoned, expired, or confirmed while the app was closed;
 *   * the window expired — nobody clicked, and a link that is hours old is one the
 *     user will start over rather than come back to.
 *
 * `INTERVAL_MS` is fifteen seconds because the thing being waited on is a human walking
 * to another device. A second would be polite to nobody and rude to the server; a minute
 * would leave the address stale on screen long after it changed, which is the complaint
 * this exists to answer.
 */

/** How often to ask, while a change is in flight. */
const INTERVAL_MS = 15_000

/**
 * How long to keep asking. GoTrue's own link is valid for an hour by default, and this
 * deliberately stops short of it: the watcher exists to make a confirmation land WHILE
 * the user is still looking at the app. Past twenty minutes they have closed the tab,
 * and the change will be picked up by the read at the next launch instead.
 */
const WINDOW_MS = 20 * 60_000

let timer: ReturnType<typeof setInterval> | null = null
let startedAt = 0

/** Stop asking. Safe to call when nothing is running, which every caller relies on. */
export function stopEmailChangeWatch(): void {
  if (timer) clearInterval(timer)
  timer = null
  startedAt = 0
}

/**
 * Start asking, and call `onChanged` once if the address turns out to have moved.
 *
 * RESTARTING RESETS THE CLOCK rather than stacking a second timer: requesting a second
 * change while the first is still in flight is an ordinary thing to do — a typo in the
 * address, most often — and it should extend the watch, not double the polling.
 *
 * The first ask is IMMEDIATE and not one interval away. A user who requested the change
 * on another machine minutes ago, or who confirms in the seconds before this starts,
 * should not wait fifteen seconds to be told.
 */
export function startEmailChangeWatch(onChanged: (status: AuthStatus) => void): void {
  stopEmailChangeWatch()
  startedAt = Date.now()

  const tick = async () => {
    const { changed, pending, status } = await refreshUser()

    if (changed) {
      stopEmailChangeWatch()
      onChanged(status)
      return
    }
    // Nothing in flight: confirmed elsewhere, abandoned, or expired. Either way there is
    // no longer a question to ask. NOT treated as a change — the address we hold already
    // matches, which `changed: false` has just established.
    if (!pending) {
      stopEmailChangeWatch()
      return
    }
    if (Date.now() - startedAt > WINDOW_MS) stopEmailChangeWatch()
  }

  timer = setInterval(() => { void tick() }, INTERVAL_MS)
  void tick()
}

/**
 * Pick up a change that was confirmed while the app was closed, and resume watching if
 * one is still in flight. Called once at startup.
 *
 * THE SAME TWO OUTCOMES AS A TICK, which is why it is this function and not a second
 * implementation: the app having been closed is not different from the app having been
 * open and not asked yet.
 */
export async function resumeEmailChangeWatch(onChanged: (status: AuthStatus) => void): Promise<void> {
  const { changed, pending, status } = await refreshUser()
  if (changed) onChanged(status)
  if (pending) startEmailChangeWatch(onChanged)
}
