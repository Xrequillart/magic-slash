import { useEffect, useState } from 'react'
import { AccountCard, SectionHeader } from '@ds/desktop'
import { Clock, Info, MagicSlash, Sparkles } from '@ds/desktop/icons'
import { showToast } from '../../components/Toast'
import { useT } from '../../i18n'
import { CHANGELOG_URL } from '../../../urls'

/**
 * WHICH VERSION THIS IS, and what changed in it.
 *
 * `TelemetryHealthCard` used to sit under the version and it has gone to the Application
 * page, beside the switch it is about. It said whether usage recording was actually
 * reaching the server, which is a real thing to know and was unreadable here: nothing on
 * this page mentions recording, so a card reporting on it read as a fact about the
 * RELEASE — as though the app were telling you its own build was unwell.
 *
 * It is a tab of `AccountModal` and not of `SettingsModal` because of what the two
 * answer: that one is "what does this app do", and a version number is not a setting —
 * it is a fact about the copy YOU are running, which is the account menu's question.
 * The release notes button is the one thing on this page that acts.
 *
 * ── IT IS THE SAME CARD AS THE OTHER TABS' ─────────────────────────────────────────
 *
 * A front, a name, a quieter line under it, and what you can do about the thing it
 * names. That is the Account tab's card and the Connections tab's, and this one drew it
 * by hand: its own plate, its own hairline, and two buttons spelled out of `px-3 py-1.5`
 * strings that had drifted a rung below the ones on the cards either side of it. So it
 * is `AccountCard` now, and what is left here is the version and the two gestures.
 *
 * THE SUBJECT IS THE APP AND NOT AN ACCOUNT, which is the one thing the component's name
 * still gets wrong — see the note on `AccountCardMark`. What the card actually holds is
 * an IDENTITY, and the copy of Magic Slash you are running is one: it has a mark, a
 * name, a version, and two things you can do with it.
 *
 * THE MARK IS THE PRODUCT'S OWN, on the theme's plate rather than a tinted one. Every
 * other card in this modal opens on a front — a face, a logo — and this was the only one
 * that opened on a line of text. It takes NO tint, unlike the tracker's: a brand colour
 * is a value the design system is handed, and this app's own accent is a token that
 * moves with the theme, so the neutral plate is the honest answer.
 *
 * THE CHANGELOG IS A BUTTON AND NOT AN ANCHOR. It was `<a target="_blank">`, which
 * leaves where the address opens to the window-open handler; every other outside link in
 * this app hands it to `shell.openExternal` itself. The design system takes gestures and
 * not hrefs for that reason — see `ScriptCard`'s `onOpenUrl`.
 */
export function AboutPage() {
  const t = useT()
  const [appVersion, setAppVersion] = useState('')
  const [loadingWhatsNew, setLoadingWhatsNew] = useState(false)

  useEffect(() => {
    window.electronAPI.updater.getVersion().then(setAppVersion)
  }, [])

  const handleWhatsNew = async () => {
    if (loadingWhatsNew || !appVersion) return
    setLoadingWhatsNew(true)
    try {
      const release = await window.electronAPI.updater.getReleaseNotes(appVersion)
      if (!release) {
        showToast(t('toast.releaseNotesFailed'), 'error')
        return
      }
      // A window event and not a state flag: the dialog that shows this is mounted at
      // the app's root, far above a settings tab, and it was already listening.
      window.dispatchEvent(new CustomEvent('show:whats-new', {
        detail: { version: appVersion, ...release },
      }))
    } catch {
      showToast(t('toast.releaseNotesFailed'), 'error')
    } finally {
      setLoadingWhatsNew(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader icon={Info} title={t('settings.about.section')} />
        <AccountCard
          mark={{ glyph: MagicSlash, title: 'Magic Slash' }}
          name="Magic Slash"
          /* The version, where the other cards put the address you are signed in at.
             It is empty for the one frame before the main process answers, and an
             empty `hint` draws no line rather than a bare `v`. */
          hint={appVersion ? `v${appVersion}` : undefined}
          actions={[
            {
              id: 'changelog',
              label: t('settings.about.changelog'),
              icon: Clock,
              onClick: () => window.electronAPI.shell.openExternal(CHANGELOG_URL),
            },
            {
              id: 'whats-new',
              label: t('settings.about.whatsNew'),
              icon: Sparkles,
              /* The accent, and the only one in this modal's About tab: reading what
                 changed is what somebody opens this page to do. The changelog beside it
                 is the same thing for every release ever shipped, which is the quieter
                 question. */
              tone: 'accent',
              /* `busy` is the whole of the loading state now. It spins the mark and
                 refuses a second press — where this swapped the label for "Loading…"
                 and left the button pressable-looking beside it, which said the same
                 thing twice and let a double click ask twice. */
              busy: loadingWhatsNew,
              disabled: !appVersion,
              onClick: handleWhatsNew,
            },
          ]}
        />
      </div>
    </div>
  )
}
