import { useState } from 'react'
import { Card, TabStrip, type TabStripItem } from '@ds/desktop'
import { AppWindow, Bell, Languages, Palette } from '@ds/desktop/icons'
import { ApplicationPage } from '../pages/Config/ApplicationPage'
import { NotificationsPage } from '../pages/Config/NotificationsPage'
import { AppearancePage } from '../pages/Config/AppearancePage'
import { LanguagePage } from '../pages/Config/LanguagePage'
import { useT, type MessageKey } from '../i18n'

/**
 * EVERYTHING THE QUICK SETTINGS SHEET DOES NOT HOLD, in the middle of the window.
 *
 * The sheet is a grid of tiles: it answers the settings that are a yes or a no, a scale
 * or a swatch. Four settings pages were dropped from the modal when it arrived — the
 * app itself, notifications, appearance, language — and most of what was on them the
 * sheet now says faster. The REST had nowhere to go: the machine's setup card with its
 * installers, the Quick Launch shortcut, the PR watcher's interval and its skill
 * auto-launch, the two sidebar panels' format, and every sentence of help text a 40px
 * circle has no room for. This is where they are read now.
 *
 * FOUR PAGES AND NOT ONE SCROLL, and the tabs are the whole of that: the pages were
 * four pages in the modal's rail, they are the same four here, in the same order. One
 * column holding all of them was the first shape and it was a rail's worth of settings
 * with the rail taken away — the machine's setup and the app's language are not
 * neighbours, and a scrollbar is a poor way to say so.
 *
 * IT IS A DRAWING OF FOUR COMPONENTS AND A BAR. The pages own their own state, their
 * own writes and their own toasts, exactly as they did inside the modal, so this file
 * has no logic to get wrong beyond which one is showing.
 *
 * ONLY THE OPEN PAGE IS MOUNTED. Three of the four ask the main process something when
 * they mount — the setup status, the auto-start flag — and mounting all four to hide
 * three would be three round trips for pages nobody opened. The cost is that a page
 * starts at its top each time it comes back, which is what a settings page should do.
 */

type PanelPage = 'application' | 'notifications' | 'appearance' | 'language'

/** The four, in the order the settings rail used to list them. Message KEYS rather than
 *  labels, for the reason the rail gives: module scope is evaluated once at import, so a
 *  `t()` here would pin the bar to whatever language the app booted in. */
const PAGES: { id: PanelPage; labelKey: MessageKey; icon: TabStripItem['icon'] }[] = [
  { id: 'application', labelKey: 'settings.tab.application', icon: AppWindow },
  { id: 'notifications', labelKey: 'settings.tab.notifications', icon: Bell },
  { id: 'appearance', labelKey: 'settings.tab.appearance', icon: Palette },
  { id: 'language', labelKey: 'settings.tab.language', icon: Languages },
]

export function AllSettingsPanel() {
  const t = useT()
  const [page, setPage] = useState<PanelPage>('application')

  return (
    // `raised` for the sheet's own reason (see `plate.ts`): this hangs over the blurred
    // window like the tiles do, and a translucent card there is a hole rather than a
    // panel. `padding="none"` because the BODY is the scroller and its padding has to
    // be inside it — padding on the card would put the scrollbar inside the air and
    // clip the first row before it reached the top. The height is the caller's, so
    // `min-h-0` is what lets this go shorter than its content and scroll at all.
    // 704 × 736, AND BOTH ARE FIXED — a panel that resized itself per page was the bug
    // this replaced: Language holds one row, and the card collapsed to it, so switching
    // tabs moved the whole thing under the pointer. A settings panel is one object with
    // four faces; an object does not change size when you turn it round.
    //
    // THE WIDTH IS THE TAB ROW'S FLOOR: four names with their marks make ~540px of pill
    // rail, and `TabStrip` is one line that scrolls rather than wrapping — with the app's
    // scrollbars hidden, a rail that overflowed would hide a tab with nothing to say so.
    // The forms take the rest gladly: a settings row is a label and a 208px select.
    //
    // THE HEIGHT IS `min()` AND NOT A FLAT `h-`: 736px is the resting size, and on a
    // short window — 600px is the app's own minimum — it gives way to 80% of the window
    // rather than running off the bottom of it. One expression, so the card does not
    // have to be told its parent's height to stay inside it. The 80 matches
    // `ControlCenter`'s own cap on the panel: a taller vh term here would simply
    // overflow a box that has already decided where the window ends.
    <Card
      ground="raised"
      padding="none"
      className="flex h-[min(46rem,80vh)] w-[44rem] max-w-full min-h-0 flex-col overflow-hidden"
    >
      {/* THE APP'S OWN TAB ROW — `TabStrip` from the design system, the same rail the
          settings modal's header and a repository's configuration are cut into, so a
          second level of pages here looks like every other one in the app rather than
          like a control this panel invented. The pill slides to what you picked, which
          is the part a reader recognises. */}
      {/* CENTRED, and the same air under the rail as over it: the header is a band, and
          a band with 16px above its content and none below reads as the top of the page
          rather than as a thing of its own. `min-w-0` on the rail so that centring never
          pushes its ends past the card — it is one scrolling line, and a line centred out
          of reach is worse than a line starting at the left. */}
      <div className="flex shrink-0 justify-center px-4 py-4">
        <TabStrip
          items={PAGES.map(({ id, labelKey, icon }) => ({ key: id, label: t(labelKey), icon }))}
          activeKey={page}
          // The cast holds because the strip only ever reports back a key it was given.
          onSelect={(key) => setPage(key as PanelPage)}
          ariaLabel={t('controlCenter.allSettings')}
          className="min-w-0"
        />
      </div>
      {/* `key` on the scroller and not on the page: remounting on every switch is what
          puts the new page at its top, and it is the scroller that holds the offset. */}
      <div key={page} className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
        {page === 'application' && <ApplicationPage />}
        {page === 'notifications' && <NotificationsPage />}
        {page === 'appearance' && <AppearancePage />}
        {page === 'language' && <LanguagePage />}
      </div>
    </Card>
  )
}
