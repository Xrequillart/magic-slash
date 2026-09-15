'use client'

import { useState } from 'react'
import { TabStrip } from '@ds/desktop'
import { AppWindow, Bell, FolderGit2, Languages, Palette, Ticket } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The four pages of the settings panel beside the quick-settings sheet. */
const SETTINGS_PAGES = [
  { key: 'application', label: 'Application', icon: AppWindow },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'language', label: 'Language & Region', icon: Languages },
]

/** A repository's configuration, cut into subjects — the strip inside one rail entry. */
const REPO_TABS = [
  { key: 'general', label: 'Repository', icon: FolderGit2 },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'languages', label: 'Languages', icon: Languages },
]

const PROPS: PropRow[] = [
  { name: 'items', type: 'TabStripItem[]', required: true, description: 'Each is a key, a word, and optionally a mark — a glyph, or a person as { src, alt } data. The avatar wins over the icon where both are given.' },
  { name: 'activeKey', type: 'string | undefined', required: true, description: 'The tab in force. Controlled: which page is open decides what the caller draws under the rail, so the caller holds it. An unmatched key falls back to the first tab rather than to none — every strip here always has an active tab.' },
  { name: 'onSelect', type: '(key: string) => void', description: 'A press, reporting the item’s own key back. Absent, the rail is a drawing — which is what the marketing site’s storyboards need.' },
  { name: 'ariaLabel', type: 'string', required: true, description: 'Names the set for a screen reader — “Settings pages”. Translated.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement. Not the ground, the radius or the type.' },
]

function Demo({ items, initial }: { items: typeof SETTINGS_PAGES; initial: string }) {
  const [active, setActive] = useState(initial)
  return <TabStrip items={items} activeKey={active} onSelect={setActive} ariaLabel="Pages" />
}

export function TabStripEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="TabStrip" uses={usesOf('tabstrip')} onOpen={onOpen}>
        The app’s one tab row: a pill rail whose background slides to the tab you pick. The
        settings modal’s header, a repository’s configuration, the Team page’s organizations
        and the settings panel beside the quick-settings sheet are all this control.
      </EntryHeader>

      <EntrySection
        title="The rail"
        note="Press one, then another: the pill travels rather than cutting. It is one absolutely positioned box moved by transform — a background painted on the active button could only appear in its new place, and the movement is what makes it read as the answer to the click."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Demo items={SETTINGS_PAGES} initial="application" />
          <Demo items={REPO_TABS} initial="general" />
        </Stage>
      </EntrySection>

      <EntrySection
        title="What it measures, and why"
        note="The pill is placed from the active tab’s own offset and width, in a layout effect so it lands in the same frame. A ResizeObserver watches the rail and every tab in it: Cera Pro arrives after first paint and widens the row underneath, which would otherwise leave the pill sized against text that no longer exists. It does not animate into place on the first paint — a pill sliding in from the left edge every time a page opens reads as a glitch."
      >
        <Stage theme={theme}>
          <Demo items={SETTINGS_PAGES} initial="appearance" />
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { TabStrip } from '@ds/desktop'

<TabStrip
  items={PAGES.map(({ id, labelKey, icon }) => ({ key: id, label: t(labelKey), icon }))}
  activeKey={page}
  onSelect={(key) => setPage(key as PanelPage)}
  ariaLabel={t('controlCenter.allSettings')}
/>

// A person instead of a glyph — the settings tab wears the account's photo.
{ key: 'settings', label: accountName, avatar: { src: avatarDataUrl, alt: '' } }`}</Snippet>
      </EntrySection>
    </article>
  )
}
