'use client'

import { useState } from 'react'
import { CONTROL_CENTER_GRID, SetupStatusCard, type SetupState } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const LABELS: Record<SetupState, string> = {
  checking: 'Checking…',
  ready: 'Machine ready',
  issues: '2 to fix',
  failed: 'Check failed',
}

const PROPS: PropRow[] = [
  { name: 'state', type: "'checking' | 'ready' | 'issues' | 'failed'", required: true, description: 'Four states and not a boolean: checking is the spinner, ready and issues the answer, failed the check itself not coming back — a different thing from “something is missing”, in the same red because both need the same click.' },
  { name: 'label', type: 'string', required: true, description: 'The two words for the state. Translated — the caller knows the count.' },
  { name: 'openTitle · onOpen', type: 'string · () => void', required: true, description: 'The pill is a button: a verdict you cannot act on is a worry rather than a status. The caller says where the fixes are.' },
  { name: 'refreshTitle · onRefresh', type: 'string · () => void', required: true, description: 'The fourth point. Busy while checking, so a re-check cannot queue behind a re-check.' },
]

export function SetupStatusCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [state, setState] = useState<SetupState>('ready')
  const recheck = () => {
    setState('checking')
    setTimeout(() => setState('ready'), 1200)
  }
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SetupStatusCard" uses={usesOf('setupstatuscard')} onOpen={onOpen}>
        The machine’s verdict in one row — three points of pill and one of button — on the
        quick-settings sheet. The settings page’s whole setup card, reduced to its first line
        and the way back to it.
      </EntryHeader>

      <EntrySection title="The four states" note="Press the refresh: the pill checks for a second and lands on ready. It renders two grid children, not one, because it lies on ControlCenterGroup’s four-point grid.">
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className={CONTROL_CENTER_GRID}>
            <SetupStatusCard state={state} label={LABELS[state]} openTitle="Open the machine setup" onOpen={() => undefined} refreshTitle="Check again" onRefresh={recheck} />
          </div>
          {(['issues', 'failed'] as SetupState[]).map((s) => (
            <div key={s} className={CONTROL_CENTER_GRID}>
              <SetupStatusCard state={s} label={LABELS[s]} openTitle="Open the machine setup" onOpen={() => undefined} refreshTitle="Check again" onRefresh={() => undefined} />
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SetupStatusCard } from '@ds/desktop'

<SetupStatusCard
  state={state}
  label={t(SETUP_LABEL[state], { count })}
  openTitle={t('controlCenter.setup.open')}
  onOpen={() => openSettingsModal('application')}
  refreshTitle={t('settings.application.setup.recheck')}
  onRefresh={checkSetup}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
