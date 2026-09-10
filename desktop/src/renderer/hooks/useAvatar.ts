import { useSyncExternalStore } from 'react'

/**
 * The account photo, once, for every surface in the main window that draws it.
 *
 * Same shape as the theme and language stores (`theme/index.ts`, `i18n/index.ts`): a
 * module-level `current`, a `Set` of listeners, `useSyncExternalStore`. Three
 * components now show the same face — the identity card on the Account tab, the
 * settings rail footer and the sidebar account button — and removing the photo from
 * the card has to blank the other two on the spot (AC 3). Three copies of a
 * `useEffect` fetching the same data URL would each be right on their own and wrong
 * together the first time one of them missed a write.
 *
 * WHY A RENDERER STORE AND NOT A `profile:avatarChanged` BROADCAST. All three surfaces
 * live in the SAME window, and the only writer is the card in that same window. A
 * main→renderer event would be a round trip out of the process and back into it to tell
 * the sender's neighbours something the sender already knows. The day a second window
 * shows the photo — the menu-bar popover is explicitly out of scope for this story —
 * that IPC becomes the right answer and this module becomes its subscriber; nothing
 * here has to move for that.
 *
 * IT BOOTSTRAPS, IT DOES NOT ONLY LISTEN, and that is the part worth reading twice.
 * `auth:statusChanged` is sent ONLY from the explicit transition handlers in
 * `main/ipc/auth-handlers.ts` — login, signup, email change, logout, account deletion.
 * Nothing emits it when a window opens on an already-authenticated session, which is
 * precisely why `useAuth` calls `auth.status()` itself on mount and treats the push
 * channel as an update feed rather than a source. A store that only subscribed would
 * sit at `null` from module load until the user next signed in or out, so the ordinary
 * case — a signed-in user launching the app — would show the fallback icon in the
 * sidebar and the footer next to their own name, and keep showing it all session. So
 * the module asks once at init, and listens afterwards.
 *
 * The boot ask does not gate itself on `auth.status()` first, unlike that description
 * might suggest: it calls `fetchAvatar()` directly. `getAvatarDataUrl()` on the main
 * side (`CloudStore.ts`) already resolves a logged-out session from the stored session
 * on disk with no network call and returns null immediately, so a status check in front
 * of it would only add a second IPC round trip to confirm what the first call was going
 * to establish anyway — and would delay the first paint of a signed-in user's photo by
 * that whole extra hop.
 *
 * NO `window.electronAPI?.x?.()` GUARDS, unlike `i18n/index.ts` next door, and their
 * absence is a decision rather than an oversight — do not "fix" it by copying them in.
 * The reason is NOT that the auxiliary windows get a narrower bridge: all three load
 * the same `preload/index.js` and its single `exposeInMainWorld`, so the surface is
 * identical everywhere. It is that `i18n/index.ts` reads at MODULE SCOPE and is
 * imported by all three entry points, which makes it run in whatever state each window
 * happens to be in. This module also reads at module scope, but is reachable only from
 * `SidebarAccount`, `pages/Config/index.tsx` and `CloudAccountSection` — none of which
 * is in the import graph of `popover-main.tsx` or `quick-launch-main.tsx`. So it only
 * ever runs in the main window, where the bridge is there or nothing works at all, and
 * an optional call would turn a missing bridge into a photo that silently never loads.
 */

let current: string | null = null
const listeners = new Set<() => void>()

/**
 * Which read is allowed to win.
 *
 * Two things can be in flight at once — the boot fetch, a refetch after a login, a
 * resync after a failed write — and the network does not promise to answer them in
 * order. Bumped by every read AND by every publish, so a slow `getAvatar()` cannot
 * land on top of the photo the user uploaded while it was travelling; the last thing
 * asked for is the last thing shown.
 */
let generation = 0

/**
 * Which ACCOUNT a result belongs to, as an epoch bumped on every auth transition.
 *
 * `generation` orders reads against each other, but it cannot tell whose face is
 * being ordered: an upload started by account A and a fetch started by account B are
 * two reads like any other, so the later one wins and the later one may be A's. That
 * is the whole failure — sign out mid-upload, sign in as someone else, and A's photo
 * lands next to B's name, having also bumped `generation` and thereby discarded B's
 * own in-flight fetch. It then survives until something else happens to refresh.
 *
 * So an async result carries the epoch it was STARTED under, and is dropped if the
 * epoch has moved since. The two counters answer different questions and neither
 * subsumes the other: `session` asks "is this still the same person", `generation`
 * asks "is this still the latest answer for them".
 *
 * WHICH EVENTS MOVE IT is the whole subtlety, and counting `auth:statusChanged` is
 * the wrong answer even though it looks like the obvious one. That event is emitted
 * by five handlers and only three of them are account changes: `confirmEmailChange`
 * fires it for the SAME person, with a new address and the same `user.id`. Advancing
 * the epoch there would discard an upload that was perfectly legitimate — the bytes
 * reach Storage, the epoch check drops the publish, and the event's own refetch may
 * already have read the old photo before the write landed, so every surface sits on
 * a stale face until something unrelated refreshes it.
 *
 * Hence an identity, compared, rather than events, counted. `user.id` and not the
 * email precisely because an email change must NOT read as a different person.
 */
let accountKey: string | null = null
let session = 0

/**
 * The epoch to stamp an async avatar operation with. Read it BEFORE the first await,
 * never after — read afterwards it would return the epoch of whoever is signed in by
 * then, which is exactly the value that cannot detect the switch.
 */
export function avatarSession(): number {
  return session
}

function commit(dataUrl: string | null): void {
  if (dataUrl === current) return
  current = dataUrl
  for (const listener of listeners) listener()
}

/**
 * Put a value on the store. Exported because the write path lives in the card, not
 * here: `CloudAccountSection` already holds the encoded bytes it just uploaded, so
 * publishing them is a write-through and not a reason to go and re-read the server.
 *
 * `forSession` is the epoch from `avatarSession()`, taken before the operation that
 * produced `dataUrl` began. A result from an account that has since been signed out
 * of is dropped whole — not published, and not allowed to bump `generation` either,
 * since bumping it would discard the current account's own in-flight fetch and leave
 * the surfaces on a stale face.
 */
export function publishAvatar(dataUrl: string | null, forSession: number): void {
  if (forSession !== session) return
  generation++
  commit(dataUrl)
}

/** Read the stored photo and publish it, unless something newer has happened since. */
async function fetchAvatar(): Promise<void> {
  const mine = ++generation
  const mySession = session
  try {
    const dataUrl = await window.electronAPI.profile.getAvatar()
    // A newer read or a write started while this one was in the air: it knows better.
    if (mine !== generation) return
    // And whoever asked for it is no longer the one signed in.
    if (mySession !== session) return
    commit(dataUrl)
  } catch {
    /* No photo is the fallback, and the fallback is already on screen. */
  }
}

// Boot: the session is normally already open by the time this module is imported, and
// no event will ever announce it. See the note above. No auth.status() gate in front of
// this: fetchAvatar()'s own IPC handler already resolves "not logged in" from disk with
// no network call, so a status check first would just be a second round trip to learn
// what the first one was about to answer.
void fetchAvatar()

// Subscribed at module scope rather than from a hook, for the reason the language
// store gives: a subscription set up by a component is a subscription that is missing
// whenever that component happens not to be mounted, and the sidebar is the only one
// of the three that always is.
//
// Signing out and deleting the account both arrive here as `loggedIn: false` and both
// mean the same thing — drop the face before the next person sees it. Signing in as
// someone else has to FETCH rather than keep what is on screen.
window.electronAPI.auth.onStatusChanged((status) => {
  // A new epoch only when the PERSON changed — see the note on `accountKey`. A
  // same-account event (an email confirmation) leaves it alone, so an upload in
  // flight still publishes; ordering it against this handler's own refetch is
  // `generation`'s job, and it already does it.
  const key = status.loggedIn ? (status.user?.id ?? null) : null
  if (key !== accountKey) {
    accountKey = key
    session++
  }
  if (!status.loggedIn) {
    publishAvatar(null, session)
    return
  }
  void fetchAvatar()
})

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The account photo as a `data:` URL, or null when there is none. */
export function useAvatar(): string | null {
  return useSyncExternalStore(subscribe, () => current)
}
