import { useCallback, useEffect, useState } from 'react'
import type { TitleBarMenu } from '@ds/desktop'
import { ClaudeCode, Plus } from '@ds/desktop/icons'
import type { ClaudeSessionEntry } from '../../types'
import { useT } from '../i18n'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import { formatTimestamp } from '../components/agent-info-sidebar/utils'

/**
 * THE SESSION HISTORY in the title bar: every Claude Code session the agent has been on
 * (`metadata.claudeSessions`, in the cloud with the agent), and a row to resume each one
 * in the agent's terminal.
 *
 * The list is read when the menu opens, never before — titles live in the transcripts,
 * which can run to megabytes — and read again on every open, since the current session's
 * title keeps changing while it runs.
 */
export function useSessionHistory(terminalId: string | undefined): TitleBarMenu | undefined {
  const t = useT()
  const [sessions, setSessions] = useState<ClaudeSessionEntry[] | 'loading' | null>(null)

  // Another agent's list is not this one's.
  useEffect(() => setSessions(null), [terminalId])

  const onOpen = useCallback(() => {
    if (!terminalId) return
    setSessions('loading')
    window.electronAPI.terminal.listSessions(terminalId)
      .then(setSessions)
      .catch(() => setSessions([]))
  }, [terminalId])

  const setResuming = useStore((s) => s.setResumingSession)
  const onSelect = useCallback((transcriptPath: string) => {
    if (!terminalId) return
    setResuming(terminalId, true)
    void window.electronAPI.terminal.resumeSession(terminalId, transcriptPath).then((ok) => {
      if (ok) return
      setResuming(terminalId, false)
      showToast(t('sessions.resumeFailed'), 'error')
    })
  }, [terminalId, t, setResuming])

  const onNew = useCallback(() => {
    if (!terminalId) return
    void window.electronAPI.terminal.newSession(terminalId).then((ok) => {
      if (!ok) showToast(t('sessions.newFailed'), 'error')
    })
  }, [terminalId, t])

  if (!terminalId) return undefined
  const list = Array.isArray(sessions) ? sessions : []
  const now = Date.now()

  return {
    title: t('sessions.title'),
    groups: list.length > 0 ? [{
      label: t('sessions.title'),
      items: list.map((s) => ({
        id: s.transcriptPath,
        label: s.title || t('sessions.untitled'),
        // A session written on another machine has nothing to resume here.
        hint: s.available ? formatTimestamp(s.lastActiveAt ?? s.startedAt, now, t) : t('sessions.elsewhere'),
        disabled: !s.available,
        selected: s.current,
      })),
    }] : [],
    onOpen,
    onSelect: (item) => {
      if (!list.find((s) => s.transcriptPath === item.id)?.current) onSelect(item.id)
    },
    loading: sessions === 'loading',
    loadingLabel: t('sessions.loading'),
    emptyLabel: t('sessions.empty'),
    emptyIcon: ClaudeCode,
    action: { label: t('sessions.new'), icon: Plus, onSelect: onNew },
    panelWidth: 320,
  }
}
