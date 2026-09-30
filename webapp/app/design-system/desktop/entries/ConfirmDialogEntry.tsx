'use client'

import { useState } from 'react'
import { ConfirmDialog, type ConfirmDialogTone } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'title · body', type: 'string', required: true, description: 'The question, and one line on what answering yes means. Translated.' },
  { name: 'confirmLabel · cancelLabel', type: 'string', required: true, description: 'The two answers, cancel first. Each takes half the row.' },
  { name: 'onConfirm · onCancel', type: '() => void', required: true, description: 'The answers. A press on the dimmed ground is onCancel too. Enter and Escape are the caller’s to bind.' },
  { name: 'tone', type: '"warning" | "danger"', fallback: '"warning"', description: 'How serious the question is, drawn by the mark: the yellow triangle for what can be taken back, the red one for what cannot.' },
  { name: 'confirmRef', type: 'Ref<HTMLButtonElement>', description: 'The confirm button, for the caller to focus when the dialog opens, so Enter visibly means yes.' },
  { name: 'backdropClassName · className · onAnimationEnd · portalTo', type: 'string · string · (e) => void · HTMLElement | null', description: 'Passed straight to Modal: the caller’s animation, and where a drawing of the app portals it.' },
]

/** Opens on a press, in either tone, the way the app opens it on ⌘W. */
function Demo() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState<ConfirmDialogTone | null>(null)
  const button = 'rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong'
  return (
    <div className="flex flex-col items-start gap-3">
      <div ref={setPortal} />
      <div className="flex gap-2">
        <button type="button" className={button} onClick={() => setOpen('warning')}>Archive an agent</button>
        <button type="button" className={button} onClick={() => setOpen('danger')}>Danger tone</button>
      </div>
      {open && (
        <ConfirmDialog
          title="Archive this session?"
          body="It leaves your list, and its history is kept."
          confirmLabel="Yes, archive it"
          cancelLabel="Cancel"
          tone={open}
          onConfirm={() => setOpen(null)}
          onCancel={() => setOpen(null)}
          portalTo={portal}
        />
      )}
    </div>
  )
}

export function ConfirmDialogEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ConfirmDialog" uses={usesOf('confirmdialog')} onOpen={onOpen}>
        “Are you sure?”: a question, one line on what it means, and the two answers. A Modal
        holding a Card, with the mark, the heading and two Buttons.
      </EntryHeader>

      <EntrySection
        title="Archiving an agent"
        note="Where the app asks it: ⌘W on an agent, or the title bar’s archive button. Settings → Agents can turn the question off, and the archive then happens at once."
      >
        <Stage theme={theme}>
          <Demo />
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ConfirmDialog } from '@ds/desktop'

<ConfirmDialog
  title={t('app.closeAgent.title')}
  body={t('app.closeAgent.body')}
  confirmLabel={t('app.closeAgent.confirm')}
  cancelLabel={t('common.cancel')}
  onConfirm={archive}
  onCancel={close}
  confirmRef={confirmRef}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
