import { useEffect, useState } from 'react'
import { Clock, Info, Sparkles } from '@ds/desktop/icons'
import { SectionHeader } from './SectionHeader'
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
      const html = await window.electronAPI.updater.getReleaseNotes(appVersion)
      if (!html) {
        showToast(t('toast.releaseNotesFailed'), 'error')
        return
      }
      // A window event and not a state flag: the dialog that shows this is mounted at
      // the app's root, far above a settings tab, and it was already listening.
      window.dispatchEvent(new CustomEvent('show:whats-new', {
        detail: { version: appVersion, releaseNotes: html },
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
        <div className="bg-surface border border-line-strong rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Magic Slash</div>
            <div className="text-xs text-text-secondary/50 mt-0.5">v{appVersion}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface hover:text-ink transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {t('settings.about.changelog')}
            </a>
            <button
              onClick={handleWhatsNew}
              disabled={loadingWhatsNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingWhatsNew ? t('common.loading') : t('settings.about.whatsNew')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
