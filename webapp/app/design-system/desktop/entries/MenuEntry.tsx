'use client'

import { useRef, useState } from 'react'
import { Label, Menu, type MenuGroup } from '@ds/desktop'
import { Building2, CircleUserRound, Download, Info, LogOut, Plug, SquareTerminal } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The rows an account menu actually carries, so the drawing is the app's own menu and
 *  not a list of lorem. */
const GROUPS: MenuGroup[] = [
  {
    items: [
      { id: 'account', icon: CircleUserRound, label: 'Account' },
      { id: 'organization', icon: Building2, label: 'Organization' },
      { id: 'connections', icon: Plug, label: 'Connections' },
      { id: 'claude-code', icon: SquareTerminal, label: 'Claude Code' },
      { id: 'about', icon: Info, label: 'About' },
    ],
  },
  {
    items: [
      { id: 'update', icon: Download, label: 'Check for updates' },
      { id: 'sign-out', icon: LogOut, label: 'Sign out', tone: 'danger' },
    ],
  },
]

const PROPS: PropRow[] = [
  {
    name: 'open · onClose',
    type: 'boolean · () => void',
    description:
      'The caller owns whether the panel is down — there is no internal state to fight with. `onClose` fires on Escape, on a click outside both the anchor and the panel, on a scroll anywhere above it, on a resize, and on a row being picked.',
  },
  {
    name: 'anchor',
    type: 'HTMLElement | null',
    description:
      'The element the panel hangs from. An element and not a rect, so a null on the first render simply means the panel waits rather than being positioned against a measurement taken before the trigger existed. Right-aligned to it, and flipped above it when the room below runs out.',
  },
  {
    name: 'header',
    type: 'MenuHeader',
    description:
      'Who or what the menu is about: a face or a mark, a name, and a line under it. NOT a row — it has no id, nothing happens when it is pressed, and it carries two lines where a row carries one. A menu that made its own subject pressable would be offering an action it has no name for.',
  },
  {
    name: 'groups · onSelect',
    type: 'MenuGroup[] · (item: MenuItem) => void',
    description:
      'Runs of rows, each with a hairline above it and an optional heading. A row is a mark, a word, a quiet trailing note and whether it is the dangerous one — data, never a slot, for `Label`’s reason: a menu that took a ReactNode would grow a form in it by the end of the quarter.',
  },
  {
    name: 'MenuItem.loading · keepOpen',
    type: 'boolean · boolean',
    description:
      '`loading` puts a spinner where the mark goes and the row stops answering — at full contrast, because it is busy rather than unavailable. `keepOpen` leaves the menu down when the row is picked. They go together on the one row whose job is the wait: "check for updates" asks a server, and a menu that dismissed itself on the press would have nowhere to put the answer.',
  },
  {
    name: 'width',
    type: 'number',
    fallback: '248',
    description:
      'In pixels, because the panel is portalled and positioned by hand — the same value the right-alignment and the viewport clamp are computed from. Pass the width of the longest row, not the width of the anchor: a menu is read at its text.',
  },
  {
    name: 'portalTo',
    type: 'HTMLElement | null',
    description:
      'Where the panel is portalled. `document.body` by default, which is right wherever the theme’s variables are on `:root`. This page has them on one element instead, which is why the drawings below pass their own.',
  },
]

export function MenuEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Menu" uses={usesOf('menu')} onOpen={onOpen}>
        A panel of rows hanging off something the caller drew — the dropdown, with no
        trigger of its own. <code>SelectIcon</code> beside it is a trigger and a panel
        welded together, and the chevron is the whole point of that component; this one
        is for the triggers it cannot be talked into being.
      </EntryHeader>

      <EntrySection
        title="The caller draws the trigger"
        note="Here it is a Label wearing a face and a name, which is what the app’s title bar hangs it from. Hand the menu the element and own the open flag — nothing inside it decides anything. Press the label."
      >
        <Stage theme={theme}>
          <div ref={stageRef} className="relative flex min-h-64 justify-center py-6">
            <span ref={anchorRef} className="inline-flex self-start">
              <Label
                avatar={{ src: null, alt: '' }}
                onClick={() => setOpen((was) => !was)}
                title="Account"
                truncate
              >
                Xavier
              </Label>
            </span>
            <Menu
              open={open}
              onClose={() => setOpen(false)}
              anchor={anchorRef.current}
              label="Account"
              header={{
                title: 'Xavier',
                subtitle: 'xavier@example.com',
                avatar: { src: null, alt: '' },
              }}
              groups={GROUPS}
              onSelect={(item) => setPicked(item.label)}
              // The theme’s variables are on this page’s own element, not on `:root` —
              // a portal to the body would leave them behind and paint a menu with no
              // ground. See the prop’s note.
              portalTo={stageRef.current}
            />
          </div>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          {picked ? <>Picked: <code>{picked}</code>.</> : 'Nothing picked yet.'}
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Menu } from '@ds/desktop'

<Menu
  open={open}
  onClose={() => setOpen(false)}
  anchor={anchor}
  label={t('accountMenu.title')}
  header={{ title: name, subtitle: email, avatar: { src: avatar, alt: '' } }}
  groups={groups}
  onSelect={(item) => go(item.id)}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The <code>danger</code> tone paints a row red on hover rather than at rest. A
          permanently red row in a list of grey ones is a warning nobody is heeding by
          the third time they open the menu — and it is the one the eye lands on first,
          which is the opposite of what a destructive action wants.
        </p>
      </EntrySection>
    </article>
  )
}
