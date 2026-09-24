'use client'

import { useRef, useState } from 'react'
import { ShareButton, type ShareOption, type SharePerson } from '@ds/desktop'
import { FolderGit2, Lock, ShieldCheck, UserLock, Users } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The plan page's own four levels, so the drawing is the app's panel and not lorem. */
const OPTIONS: ShareOption[] = [
  { value: 'personal', label: 'Personal', icon: UserLock, hint: 'Only you can see and edit this plan. The organization does not see it, admins included.' },
  { value: 'org', label: 'The whole organization', icon: Users, hint: 'The whole organization can see and edit this plan.' },
  { value: 'admins', label: 'Admins only', icon: ShieldCheck, hint: 'The organization can read and comment. Only its author and the admins can edit.' },
  { value: 'invited', label: 'Invited people', icon: Lock, hint: 'The organization can read and comment. Only its author, the admins and the people invited here can edit.' },
]

const ROSTER: SharePerson[] = [
  { id: 'a', name: 'camille@example.com', avatar: null },
  { id: 'b', name: 'noah@example.com', avatar: null },
  { id: 'c', name: 'lea@example.com', avatar: null },
]

const PROPS: PropRow[] = [
  {
    name: 'label · title',
    type: 'string · string',
    description:
      'The words on the trigger, and the panel’s heading (which also names it for a screen reader). The trigger wears the icon of the level it is set to, so the header says who can see the thing without being opened.',
  },
  {
    name: 'options · value · onChange',
    type: 'ShareOption[] · string · (value) => void',
    description:
      'The access levels, drawn as rows with their sentence under each, never as a Select: a picker portals a panel of its own, and this one closes on a press outside itself.',
  },
  {
    name: 'members · candidates',
    type: 'ShareList & { onRemove } · ShareList & { onAdd }',
    description:
      'Who has access by name, and who could be given it. Each is drawn only when given, with its own sentence when it has nobody in it or could not be read.',
  },
  {
    name: 'notice',
    type: '{ text, action? }',
    description:
      'A sentence instead of choices, for a thing that cannot be shared as it stands, and the one action that would change that. Wins over `options`.',
  },
  {
    name: 'error · busy',
    type: 'string · boolean',
    description: 'A refused or failed write, said in red at the bottom; and a write in flight, during which every control waits.',
  },
  {
    name: 'portalTo',
    type: 'HTMLElement | null',
    description: 'Where the panel is portalled — `Menu`’s prop, for the same reason.',
  },
]

export function ShareButtonEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [value, setValue] = useState('invited')
  const [invited, setInvited] = useState<string[]>(['a'])
  const stageRef = useRef<HTMLDivElement>(null)
  const noticeStageRef = useRef<HTMLDivElement>(null)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ShareButton" uses={usesOf('sharebutton')} onOpen={onOpen}>
        Who may see and edit something, behind one button in a page’s header. Every choice
        is drawn inside the panel, and nothing opens from it.
      </EntryHeader>

      <EntrySection
        title="Levels, and the people invited"
        note="The plan page’s own panel. Pick “Invited people” to see the list and who could join it. Press the button."
      >
        <Stage theme={theme}>
          <div ref={stageRef} className="relative flex min-h-[28rem] justify-end py-6">
            <ShareButton
              label="Share"
              title="Who can see and edit"
              options={OPTIONS}
              value={value}
              onChange={setValue}
              members={value === 'invited' ? {
                heading: 'Invited',
                people: ROSTER.filter((p) => invited.includes(p.id)),
                empty: 'Nobody is invited yet.',
                removeLabel: (name) => `Remove ${name}`,
                onRemove: (id) => setInvited((was) => was.filter((x) => x !== id)),
              } : undefined}
              candidates={value === 'invited' ? {
                heading: 'Invite a member',
                people: ROSTER.filter((p) => !invited.includes(p.id)),
                empty: 'Every member who can be invited already is.',
                addLabel: (name) => `Invite ${name}`,
                onAdd: (id) => setInvited((was) => [...was, id]),
              } : undefined}
              portalTo={stageRef.current}
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Nothing to choose, and why"
        note="A plan on a personal repository has nobody to be shared with. The button still answers, with the way out."
      >
        <Stage theme={theme}>
          <div ref={noticeStageRef} className="relative flex min-h-48 justify-end py-6">
            <ShareButton
              label="Share"
              title="Who can see and edit"
              notice={{
                text: 'This plan is on a personal repository: only you can see it. Share the repository with an organization to share its plans.',
                action: { label: 'Share the repository', icon: FolderGit2, onPress: () => {} },
              }}
              portalTo={noticeStageRef.current}
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ShareButton } from '@ds/desktop'

<ShareButton
  label={t('plans.access.share')}
  title={t('plans.access.title')}
  options={levels}
  value={policy}
  onChange={setPolicy}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
