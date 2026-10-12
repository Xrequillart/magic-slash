import { useState, useCallback, useEffect, useRef } from 'react'
import { AccountCard, SectionHeader, type AccountCardAlert } from '@ds/desktop'
import { Ticket, Link2, Unlink, RefreshCw, ShieldAlert, Jira, JIRA_CHIP_GROUND } from '@ds/desktop/icons'
import type { JiraConnectFailure, JiraDisconnectReason } from '../../../types'
import { useJiraAuth } from '../../hooks/useJiraAuth'
import { showToast } from '../../components/Toast'
import { useT, type MessageKey } from '../../i18n'

/**
 * Atlassian block of the Connections tab: one button, one browser consent screen.
 *
 * Built on `CloudAccountSection` — same card, same rows, same CTA — with THREE states
 * where that one has two, and the third is the point:
 *
 * It keeps a SECTION HEADER, which that one has since dropped, and the asymmetry is
 * deliberate rather than drift: this block sits among several on the Connections tab
 * and nothing else on screen says which service it is about. The account card names
 * itself — it opens on your own face and address — so a title above it repeated what
 * the plate already said.
 *
 *  • disconnected → the CTA,
 *  • connected → who and where, plus Disconnect,
 *  • connected but `unverified` → Atlassian last refused the stored credential, which
 *    almost always means the user revoked the app. That state gets an explanation and
 *    a "Reconnect" button, because the alternative — treating it as a generic failure
 *    at the next Jira read — leaves the user with a section that says "connected" and
 *    a feature that does not work. The credential is deliberately NOT deleted for it
 *    (a site outage answers 401 too), so a boolean in the status is exactly what the
 *    UI has to branch on.
 *
 * The wait between the click and the credential is a browser round-trip, so `pending`
 * below is local optimism only: what actually flips this section is the push the hook
 * subscribes to, which is also where a cancelled or expired attempt is explained. And
 * because a consent screen the user simply CLOSES sends no answer at all, that optimism
 * also has to expire on its own — coming back to this window is what ends it, and the
 * focus effect below is where that is spelled out.
 *
 * ── THE DRAWING IS `AccountCard`'S NOW ─────────────────────────────────────────────
 *
 * "Built on CloudAccountSection" was true of the shape and false of the code: this file
 * drew its own plate, its own hairlines, its own tile, and its buttons out of the
 * `BTN`/`BTN_PRIMARY` strings — and it had already drifted into a button height and a
 * padding the account card no longer used. Same card means the same component, so what
 * is left here is the WIRING: the hook, the browser round-trip, the toasts and the
 * sentence each failure code becomes.
 *
 * EVERY STATE IS THE SAME CARD AND THE DIFFERENCE IS DATA, which is the card's own rule
 * and the reason the guard clause below stopped being a hand-built empty plate. "No
 * client id in this build" is an account you cannot connect: a mark, a line saying so,
 * and no button — the same component as the three above it rather than a plate beside
 * them.
 */

/** The reason codes, as messages. A record so the mapping is total and typo-proof. */
const REASON_MESSAGE: Record<JiraDisconnectReason, MessageKey> = {
  cancelled: 'jira.toast.cancelled',
  timeout: 'jira.toast.timeout',
  failed: 'jira.toast.failed',
  // Its own message, not a variant of `failed`: the keychain is a problem with this
  // machine, and the user has to be told that rather than sent to look at Atlassian.
  keychain: 'jira.toast.keychain',
}

/**
 * The same, for the outcomes `jira:connect` answers with directly.
 *
 * THIS is where the wording of a failed connect lives — not in the main process, which
 * cannot know the user's language. Every message here is in both `en.ts` and `fr.ts`,
 * and `unexpected` is what a rejected bridge call becomes, so Electron's own
 * "Error invoking remote method …" text has no route to a toast.
 */
const FAILURE_MESSAGE: Record<JiraConnectFailure, MessageKey> = {
  notConfigured: 'jira.toast.notConfigured',
  noCallbackServer: 'jira.toast.noCallbackServer',
  browser: 'jira.toast.connectFailed',
  unexpected: 'jira.toast.connectUnexpected',
}

/**
 * The front of the card, in every state — the mark the account card draws where a
 * person's card draws a face.
 *
 * The ground is `JIRA_CHIP_GROUND`, the value that travels with the mark itself: it is
 * Atlassian's blue and not this palette's, so it can only ever be a value. The tracker
 * tile on the Tasks rows reads the same one.
 */
const JIRA_MARK = { glyph: Jira, title: 'Jira', tint: JIRA_CHIP_GROUND }

export function JiraAccountSection() {
  const { status, loading, lastEvent, connect, disconnect } = useJiraAuth()
  const t = useT()

  const [pending, setPending] = useState(false)

  // `pending`, readable from the effects below without making them depend on it. The
  // outcome effect is keyed on `lastEvent` identity alone — adding `pending` to its
  // deps would replay the last explanation every time the spinner moved.
  const pendingRef = useRef(false)
  useEffect(() => { pendingRef.current = pending }, [pending])

  // The outcome of an attempt that ended in the browser. Keyed on the event object,
  // which changes identity on every push — two cancellations in a row are two
  // explanations, not one.
  useEffect(() => {
    if (!lastEvent) return
    const wasPending = pendingRef.current
    setPending(false)
    // The TTL expiring on an attempt the user already walked away from (see the focus
    // effect below) is not news: the spinner has been gone for minutes, and the
    // sentence would be about a browser tab they closed on purpose. A timeout the user
    // IS still waiting on is the other branch, and it keeps its toast — as does every
    // other reason, abandoned attempt or not.
    if (lastEvent.reason === 'timeout' && !wasPending) return
    showToast(t(REASON_MESSAGE[lastEvent.reason]), 'error')
  }, [lastEvent])

  // Coming back to this window with an attempt still in flight means the user left the
  // consent screen without finishing it — closed the tab, hit Escape, changed their
  // mind. Nothing reports that: the browser owns the screen for the whole round trip
  // and only ever calls back on an answer, so regaining focus is the only evidence
  // there is. Without it the section sits on a disabled spinner for the full five
  // minutes of the main process's TTL, which is exactly as long as the user cannot
  // reopen the consent screen they meant to go back to.
  //
  // A LOCAL RESET, and nothing more. The attempt keeps its verifier and its timer in
  // the main process, so a user who returns to the browser and finally accepts is
  // still connected by the push. All this drops is the spinner and the disabled state
  // — which is the whole point, since clicking Connect again is what starts over.
  //
  // Armed only while pending, and only after a blur: `shell.openExternal` is what
  // takes the focus away, so a focus event with no blur before it is this window
  // never having lost it — there was no consent screen to leave.
  useEffect(() => {
    if (!pending) return
    let leftForBrowser = false
    const onBlur = () => { leftForBrowser = true }
    const onFocus = () => { if (leftForBrowser) setPending(false) }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [pending])

  // A successful connection also arrives through the push; drop the spinner on any
  // transition into "connected".
  useEffect(() => {
    if (status.connected) setPending(false)
  }, [status.connected])

  const handleConnect = useCallback(async () => {
    if (pending) return
    setPending(true)
    // `connect()` never rejects — see the hook. A failure comes back as a code, which is
    // the only thing this component is willing to turn into a sentence.
    const result = await connect()
    if (!result.started) {
      setPending(false)
      showToast(t(FAILURE_MESSAGE[result.failure]), 'error')
    }
  }, [pending, connect])

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect()
    } catch {
      // Deliberately NOT `e.message`: a rejected `ipcRenderer.invoke` carries Electron's
      // own wrapper text, in English, about a remote method name the user never asked
      // about. One translated sentence instead.
      showToast(t('jira.toast.disconnectFailed'), 'error')
    }
  }, [disconnect])

  // No Atlassian client id in this build → there is nothing to connect to, and a
  // button here could only lead to an Atlassian error page. Same guard clause, and
  // same shape, as CloudAccountSection's "cloud disabled".
  //
  // `!status.connected` is part of the condition, and it is not a detail. A build that
  // lost the client id still has whatever credential the previous build stored, and
  // hiding it behind "not available in this build" would leave the user looking at a
  // machine that holds an Atlassian token with no way to remove it. So a stored
  // credential always gets its card, with Disconnect; only CONNECTING is unavailable
  // (see `canConnect` below).
  //
  // NO PRIVACY NOTE ON THIS ONE. The foot of the card is a promise about a credential
  // this machine holds, and this is the state in which it holds none and cannot be made
  // to.
  if (!loading && !status.configured && !status.connected) {
    return (
      <div>
        <SectionHeader icon={Ticket} title={t('jira.section')} />
        <AccountCard mark={JIRA_MARK} name={t('jira.notConfigured')} hint={t('jira.notConfiguredHint')} />
      </div>
    )
  }

  // False in exactly one case — the one the guard above now lets through: a stored
  // credential on a build with no client id. That account can be REMOVED but not
  // re-authorised, so the CTA has to go while Disconnect stays.
  // `loading` counts as connectable so the button does not flicker disabled on the
  // first paint, before the real status has been read.
  const canConnect = loading || status.configured

  /* The revoked credential, as the card's own band. `danger` is the variant it would
     take anyway; `ShieldAlert` is named because the band is about an AUTHORISATION and
     not about a generic failure, which is the one thing the default mark cannot say.

     NO BUTTON WHEN THERE IS NO CLIENT ID, and the hint says why instead: a reconnect
     that cannot start is a button that can only lead to an Atlassian error page. */
  const alert: AccountCardAlert | undefined = status.unverified
    ? {
        variant: 'danger',
        icon: ShieldAlert,
        message: t('jira.unverified'),
        hint: canConnect ? t('jira.unverifiedHint') : t('jira.notConfigured'),
        actions: canConnect
          ? [{
              label: pending ? t('jira.connecting') : t('jira.reconnect'),
              icon: RefreshCw,
              busy: pending,
              primary: true,
              onClick: handleConnect,
            }]
          : undefined,
      }
    : undefined

  return (
    <div>
      <SectionHeader icon={Ticket} title={t('jira.section')} />
      {status.connected ? (
        <AccountCard
          mark={JIRA_MARK}
          /* The Atlassian account's own name, and the site under it — which is the same
             division the cloud card makes between who you are and where. */
          name={status.accountName || t('jira.connectedFallback')}
          hint={status.siteUrl ? t('jira.connectedHint', { site: status.siteUrl }) : t('jira.connectedHintNoSite')}
          actions={[
            { id: 'disconnect', label: t('jira.disconnect'), icon: Unlink, onClick: handleDisconnect },
          ]}
          alert={alert}
          note={t('jira.privacy')}
        />
      ) : (
        <AccountCard
          mark={JIRA_MARK}
          name={t('jira.notConnected')}
          hint={t('jira.notConnectedHint')}
          /* `accent`, and the only one on the tab: connecting is what this card is for.
             `busy` is the whole of the pending state now — the button spins its own mark
             and refuses a second press, where this file used to swap the glyph for a
             `Loader2` and disable the element by hand. The disabled case is gone with it:
             a build with no client id and no credential never reaches this branch. */
          actions={[
            {
              id: 'connect',
              label: pending ? t('jira.connecting') : t('jira.connect'),
              icon: Link2,
              tone: 'accent',
              busy: pending,
              onClick: handleConnect,
            },
          ]}
          note={t('jira.privacy')}
        />
      )}
    </div>
  )
}
