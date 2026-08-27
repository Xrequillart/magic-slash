import { useState, useCallback, useEffect, useRef } from 'react'
import { Ticket, Link2, Unlink, RefreshCw, Loader2, ShieldAlert } from 'lucide-react'
import type { JiraConnectFailure, JiraDisconnectReason } from '../../../types'
import { useJiraAuth } from '../../hooks/useJiraAuth'
import { BTN, BTN_PRIMARY } from '../../theme/controls'
import { SectionHeader } from './SectionHeader'
import { showToast } from '../../components/Toast'
import { useT, type MessageKey } from '../../i18n'

/**
 * Atlassian block of the Account tab: one button, one browser consent screen.
 *
 * Built on `CloudAccountSection` — same header, same card, same rows, same CTA — with
 * THREE states where that one has two, and the third is the point:
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
  if (!loading && !status.configured && !status.connected) {
    return (
      <div>
        <SectionHeader icon={Ticket} title={t('jira.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
          <Ticket className="w-8 h-8 text-icon-muted mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">{t('jira.notConfigured')}</div>
          <div className="text-xs text-text-secondary/40 mt-1">{t('jira.notConfiguredHint')}</div>
        </div>
      </div>
    )
  }

  // False in exactly one case — the one the guard above now lets through: a stored
  // credential on a build with no client id. That account can be REMOVED but not
  // re-authorised, so the CTA has to go while Disconnect stays.
  // `loading` counts as connectable so the button does not flicker disabled on the
  // first paint, before the real status has been read.
  const canConnect = loading || status.configured

  const connectButton = (label: string, Icon: typeof Link2) => (
    <button
      onClick={handleConnect}
      disabled={pending || !canConnect}
      title={canConnect ? undefined : t('jira.notConfigured')}
      className={`${BTN_PRIMARY} disabled:opacity-40`}
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {pending ? t('jira.connecting') : label}
    </button>
  )

  return (
    <div>
      <SectionHeader icon={Ticket} title={t('jira.section')} />
      <div className="bg-surface border border-line-strong rounded-xl p-4">
        {status.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{status.accountName || t('jira.connectedFallback')}</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">
                  {status.siteUrl ? t('jira.connectedHint', { site: status.siteUrl }) : t('jira.connectedHintNoSite')}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className={BTN}
              >
                <Unlink className="w-3.5 h-3.5" />
                {t('jira.disconnect')}
              </button>
            </div>

            {/* The revoked branch. Sits INSIDE "connected" because the credential is
                still on disk — it is simply no longer being accepted. */}
            {status.unverified && (
              <div className="border-t border-line-subtle pt-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-red/10 rounded-lg flex-shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5 text-red" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('jira.unverified')}</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t('jira.unverifiedHint')}</div>
                  </div>
                </div>
                {/* No client id left in this build: reconnecting is impossible, so say
                    so instead of offering a dead button. Disconnect stays available. */}
                {canConnect
                  ? connectButton(t('jira.reconnect'), RefreshCw)
                  : (
                    <div className="text-xs text-text-secondary/40 flex-shrink-0 max-w-[12rem] text-right">
                      {t('jira.notConfigured')}
                    </div>
                  )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('jira.notConnected')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('jira.notConnectedHint')}</div>
            </div>
            {connectButton(t('jira.connect'), Link2)}
          </div>
        )}

        {/* Said in the UI rather than only in the code: the credential is nominative,
            encrypted by the OS keychain, and never reaches our servers. */}
        <div className="border-t border-line-subtle mt-3 pt-3 text-xs text-text-secondary/40">
          {t('jira.privacy')}
        </div>
      </div>
    </div>
  )
}
