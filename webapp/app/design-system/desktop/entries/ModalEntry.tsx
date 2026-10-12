'use client'

import { useState } from 'react'
import { Card, Modal, Text } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'ReactNode',
    required: true,
    description: 'The panel. A Card, usually — but a wizard or a picture just as well.',
  },
  {
    name: 'onClose',
    type: '() => void',
    description:
      'Dismiss. Wired to the ground only — a click inside the panel never reaches it, which is the one piece of behaviour this component owns.',
  },
  {
    name: 'backdropClassName',
    type: 'string',
    description:
      'The ground: the caller’s enter and exit animation. Not the dim, the fixing or the stacking order.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'The panel’s width, and the caller’s animation. Not the ground, the radius or the z.',
  },
  {
    name: 'onAnimationEnd',
    type: '(e) => void',
    description: 'For a caller driving its own exit — see the app’s useModalExit.',
  },
  { name: 'labelledBy', type: 'string', description: 'The id of whatever heads the panel, for a screen reader.' },
]

export function ModalEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  /* The dialog portals, and the theme's variables live on `Stage` rather than on `:root`
     here — so it portals INTO the stage. Without this the panel resolves `bg-bg-secondary`
     against nothing and comes out transparent. */
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Modal" uses={usesOf('modal')} onOpen={onOpen}>
        The ground a dialog floats on, and nothing else: a portal to the body, a dimmed
        window, the stacking order that puts it above everything, the elevation under what
        it holds, and the opaque colour that thing sits on.
      </EntryHeader>

      <EntrySection
        title="The portal is the point"
        note="A dialog rendered where it sits in the tree inherits every overflow-hidden, transform and stacking context above it. The agent sidebar it is opened from is a folded column with its own overflow-hidden, which would clip a centred overlay to a 288px strip. Going to document.body is the only way a fixed box means the window."
      >
        <Stage theme={theme}>
          <div ref={setPortal} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
          >
            Open a dialog
          </button>
          {open && (
            <Modal portalTo={portal} onClose={() => setOpen(false)} className="w-full max-w-sm mx-4">
              <Card className="flex flex-col gap-2">
                <Text weight="bold">It goes to the body</Text>
                <Text tone="secondary">Click the ground to dismiss. Clicking here does not.</Text>
              </Card>
            </Modal>
          )}
        </Stage>
      </EntrySection>

      <EntrySection
        title="The opaque ground is not decoration"
        note="surface — what Card paints — is 6% white, and 6% white over a 70% black scrim is a panel you cannot see. Every dialog needs a window colour under its plate, so the dialog carries it rather than each caller remembering to."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The animation is the caller’s: the app’s enter and exit keyframes live in its own
          stylesheet, which this folder cannot reach. Handed nothing, the dialog simply
          appears.
        </p>
      </EntrySection>

      <EntrySection
        title="What it does not do"
        note="Said plainly so nobody assumes otherwise: it does not trap focus, it does not close on Escape, and it does not restore focus to whatever opened it. Those are real obligations for a dialog and they are not here yet."
      >
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Modal } from '@ds/desktop'

{open && (
  <Modal onClose={close} className="w-full max-w-md mx-4">
    <Card padding="none">…</Card>
  </Modal>
)}`}</Snippet>
      </EntrySection>
    </article>
  )
}
