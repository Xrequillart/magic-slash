'use client'

import { MenuSidebarItem } from '@ds/desktop'
import { ListTodo, LogIn, NotebookPen, Settings, Sparkles } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'label', type: 'string', required: true, description: 'The word. Translated, and it truncates.' },
  { name: 'icon', type: 'IconComponent', description: 'The mark. Ignored when avatar or thumb is given.' },
  {
    name: 'thumb',
    type: '{ src: string | null; alt: string }',
    description:
      'A SQUARE picture in front of the word \u2014 a skill\u2019s own artwork, as the skills rail draws it. Square and not avatar, which is rounded-full throughout because it draws a FACE: a round crop of artwork cuts its corners off. Wins over icon, loses to avatar.',
  },
  {
    name: 'active',
    type: 'boolean',
    description:
      'This row is the pane currently open beside it. Accent ground at rest, the word up to full ink, and aria-current="page" saying it out loud. Undefined by default, ButtonIcon.active\u2019s rule: a row that never lights up and a row currently unlit are two different claims.',
  },
  {
    name: 'avatar',
    type: '{ src: string | null; alt: string }',
    description:
      'A person in front of the word instead of a glyph — the account row is this. An object and not a node, the way Label’s is. Bare, never a badge: the account row has always drawn a naked glyph when there is no photo, and a pill appearing behind it would be a visible change for everyone who never uploads one.',
  },
  {
    name: 'shortcut',
    type: 'string',
    description:
      'The accelerator, pre-formatted by the caller — ⌘T, Ctrl+,. Which modifier a platform spells is the app’s question, not this folder’s.',
  },
  {
    name: 'alert',
    type: 'boolean',
    fallback: 'false',
    description:
      'Something needs attention: the row turns yellow and takes a badge. One prop for both, because the app has never wanted one without the other — two would be two ways to say it and one way to get it half right.',
  },
  { name: 'onClick', type: '() => void', required: true, description: 'Where it goes.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the padding, the radius, the gap or either colour.' },
]

/** The sidebar's own width, so a row is judged in the column it actually lives in. */
function Column({ children }: { children: React.ReactNode }) {
  return <div className="w-[228px] rounded-lg bg-surface-sunken px-2 py-3">{children}</div>
}

export function MenuSidebarItemEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="MenuSidebarItem"
        uses={usesOf('menusidebaritem')}
        onOpen={onOpen}
      >
        One row of the sidebar’s menu: a mark, a word, and the keys that get you there. The app
        wrote it six times — three pages in the sidebar, and three more inside the account
        control, which is one row wearing three faces.
      </EntryHeader>

      <EntrySection
        title="A mark, a word, a shortcut"
        note="The shortcut is part of the row, not a decoration on it: every one of these opens a page that also answers to a key, and putting the accelerator in a tooltip or a help screen is how an app ends up with shortcuts nobody knows. It sits quiet on the right at half opacity — there to be read when you look for it, not to compete with the word."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Column>
            <MenuSidebarItem icon={NotebookPen} label="Plans" shortcut="⌘T" onClick={() => undefined} />
            <MenuSidebarItem icon={ListTodo} label="Tasks" shortcut="⌘J" onClick={() => undefined} />
            <MenuSidebarItem icon={Sparkles} label="Skills" shortcut="⌘;" onClick={() => undefined} />
          </Column>
          <span className="font-mono text-[10px] text-text-secondary">
            hover them — nothing at rest, the row tints and the word goes to ink
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A glyph, or a person"
        note="The account row is the same row with a photo where the mark goes. An object and not a node, the way Label's avatar is — it is data this hands to Avatar, where a ReactNode would be a slot and the end of this component being one thing. Bare, never a badge: a pill appearing behind the glyph would be a visible change for everyone who never uploads a photo."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <Column>
            <MenuSidebarItem avatar={{ src: null, alt: '' }} label="Camille" shortcut="⌘," onClick={() => undefined} />
          </Column>
          <Column>
            <MenuSidebarItem icon={LogIn} label="Login / Sign up" onClick={() => undefined} />
          </Column>
          <Column>
            <MenuSidebarItem icon={Settings} label="Settings" shortcut="⌘," onClick={() => undefined} />
          </Column>
          <span className="font-mono text-[10px] text-text-secondary">
            the account’s three faces — signed in, signed out, and cloud off, where settings
            still have to be reachable with no account at all
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="When something needs attention"
        note="The row turns yellow and grows a badge on its corner — not in its line, which is what makes it read as an alarm rather than as one more thing in a list of controls. In the app it is one fact: no repository is configured yet."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Column>
            <MenuSidebarItem avatar={{ src: null, alt: '' }} label="Camille" shortcut="⌘," alert onClick={() => undefined} />
            <MenuSidebarItem icon={Settings} label="Settings" shortcut="⌘," alert onClick={() => undefined} />
          </Column>
          <span className="font-mono text-[10px] text-text-secondary">
            the colour and the badge are one prop
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The word gives way"
        note="An account name is whatever the person is called, in a 228px column that also holds a mark and an accelerator. The shortcut never shrinks: it is a fixed pair of glyphs, and half of one says nothing."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Column>
            <MenuSidebarItem
              avatar={{ src: null, alt: '' }}
              label="alexandra.developer@a-very-long-domain.example"
              shortcut="⌘,"
              onClick={() => undefined}
            />
          </Column>
          <span className="font-mono text-[10px] text-text-secondary">228px — the sidebar</span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { MenuSidebarItem } from '@ds/desktop'
import { NotebookPen } from '@ds/desktop/icons'

<MenuSidebarItem icon={NotebookPen} label={t('sidebar.plans')} shortcut="⌘T" onClick={openPlans} />
<MenuSidebarItem avatar={{ src: photo, alt: '' }} label={name} shortcut="⌘," alert={hasNoRepos} onClick={openSettings} />`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-ink">It grew an active state</strong>, on the
          terms the old note set. Every row in the app’s own sidebar opens an <em>overlay</em>,
          which closes back onto whatever was underneath, so a row that stayed lit for a page
          you had already dismissed would be lying — and the note ended “the day the sidebar
          navigates rather than overlays, this grows one”. The skills rail is that day: picking
          a skill replaces the pane beside it and the row stays picked, which is a fact about
          the screen rather than a decoration.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Rows are drawn one at a time here to show the row itself; in the app they arrive as
          data through <code>MenuSidebar</code>, which is what makes the group a landmark
          rather than a column of buttons.
        </p>
      </EntrySection>
    </article>
  )
}
