'use client'

import { useState } from 'react'
import { AppTitleBar, type TitleBarTitle } from '@ds/desktop'
import { BellOff } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Nothing happens when this is pressed, and that is the point: every handler here is
 *  a drawing of a handler. The component cannot tell the difference. */
const noop = () => undefined

const TOGGLE_TITLES = { left: 'Show or hide the agents', right: 'Show or hide the agent panel' }
const SETTINGS_TITLE = 'Quick settings'

/**
 * The bar, boxed.
 *
 * A WIDTH, because the bar has none of its own: it is as wide as the window it caps,
 * and the middle is absolutely positioned against that. 720px is about what a laptop
 * gives it, and it is the width at which the 36% cap on the title starts to matter.
 */
function Window({ children }: { children: React.ReactNode }) {
  return <div className="w-[720px] max-w-full overflow-hidden rounded-lg">{children}</div>
}

const PROPS: PropRow[] = [
  {
    name: 'left · right',
    type: 'TitleBarToggle',
    description:
      'The two panel toggles. `open` is the PANEL’s state and decides both halves of what the control says: the mark becomes the close glyph, the chevron pointing at the edge the panel would fold into, and the mark lights.',
  },
  {
    name: 'titles',
    type: 'TitleBarTitle[]',
    fallback: '[]',
    description:
      'The name, or the two names, in the middle. A list and not a string, because a split window shows two and dims the one that is not being typed into.',
  },
  {
    name: 'leftSwitch',
    type: 'TitleBarSwitch',
    description:
      'A pair of words, one of them on — the view switch, beside the left toggle. Exactly two options, spelled as a tuple so a third is a type error rather than a layout bug: the thumb is half the track and slides by its own width.',
  },
  {
    name: 'action',
    type: 'TitleBarAction',
    description:
      'The one action in the bar, and it belongs to the agent rather than to a panel — which is why it is here at all: a control that closes the agent cannot live in something the agent’s owner may have collapsed. Drawn by Label, so it wears the plate, the height and the radius of the toggles beside it.',
  },
  {
    name: 'settings',
    type: 'TitleBarToggle & { icon?: IconComponent }',
    description:
      'The quick-settings toggle, last in the bar — where the platform keeps its own Control Center. `open` is the MENU’s state: the mark lights in ink while the sheet is down. The sheet itself is the caller’s ControlCenter; this is only the button that pulls it down. Settings2 unless the caller says otherwise, because a cog is what opens the settings PAGE.',
  },
  {
    name: 'notice',
    type: 'TitleBarAction',
    description:
      'A standing notice before the quick-settings toggle — “Notifications off”. TitleBarAction’s shape because it is one: a mark and a word on a plate, and a click that does something about it. It says something about the whole app for as long as it is true, and the bar is the one strip on screen for as long as the app is.',
  },
  {
    name: 'account',
    type: 'TitleBarAccount',
    description:
      'Who is signed in, past the quick-settings toggle — where macOS keeps its own account, at the end of the menu bar. A Label and not a ButtonIcon: a photograph with no name is a riddle at 24px, and the one question this control answers is whose app this is. `avatar` wins over `icon` inside Label, so an account passes the face (`src: null` included, which draws the bare person glyph) and no account passes a mark and the word that invites signing in. No pressed state, unlike settings beside it: the sheet it opens covers half the window and is its own feedback.',
  },
  {
    name: 'trafficLightGutter',
    type: 'boolean',
    fallback: 'true',
    description:
      'Keeps the 64px macOS’s window buttons occupy clear. The app turns it off in native fullscreen: the lights are gone there and the gutter with them, or the first toggle sits beside a hole nothing fills.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the height, the ground, or the order of the regions.',
  },
]

export function AppTitleBarEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [view, setView] = useState('normal')
  const [quickOpen, setQuickOpen] = useState(false)

  const toggles = {
    left: { open: leftOpen, title: TOGGLE_TITLES.left, onToggle: () => setLeftOpen((o) => !o) },
    right: { open: rightOpen, title: TOGGLE_TITLES.right, onToggle: () => setRightOpen((o) => !o) },
  }
  const settings = { open: quickOpen, title: SETTINGS_TITLE, onToggle: () => setQuickOpen((o) => !o) }

  const PAIR: TitleBarTitle[] = [
    { id: 'a', label: 'PAY-318 · invoice VAT', focused: true },
    { id: 'b', label: '#409 · rate limits' },
  ]

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="AppTitleBar"
        uses={usesOf('apptitlebar')}
        onOpen={onOpen}
      >
        The bar across the top of the window, whole — and like <code>Sidebar</code>, it
        knows nothing. The gutter the traffic lights sit in, the two panel toggles, the
        agent’s name, the one action that closes it, and the sliders that pull the quick
        settings down.
      </EntryHeader>

      <EntrySection
        title="Hand it props and it draws them"
        note="No store, no translator, no idea what an agent is beyond a string and whether it has the focus. Every string arrives translated: the toggles’ tooltips, the switches’ two words, the name in the middle, the action’s label. Press either toggle."
      >
        <Stage theme={theme}>
          <Window>
            <AppTitleBar
              left={toggles.left}
              titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
              action={{ label: 'Archive', title: 'Archive the agent  ⌘W', onClick: noop }}
              right={toggles.right}
              settings={settings}
            />
          </Window>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The mark says what the click does"
        note="Not what the panel is. The chevron points at the edge the panel would fold into, so an open panel wears the CLOSE glyph — which is the convention every editor with a sidebar already taught the reader. The state is carried twice over: the mark lights as well, through ButtonIcon’s active at ink rather than at accent. Both panels are open most of the time, and two accent squares at rest would be announcing the app’s own furniture."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="both panels out — both marks lit, both chevrons pointing outward">
            <Window>
              <AppTitleBar
                left={{ open: true, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={{ open: true, title: TOGGLE_TITLES.right, onToggle: noop }}
              />
            </Window>
          </Specimen>
          <Specimen label="both folded away — the marks go quiet and the chevrons turn inward">
            <Window>
              <AppTitleBar
                left={{ open: false, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={{ open: false, title: TOGGLE_TITLES.right, onToggle: noop }}
              />
            </Window>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="One name is quiet. Two are a comparison"
        note="A single title is the only thing in the middle of a bar whose job is to stay out of the way, so lighting it would be lighting the bar. Two are a question — which of these am I typing into — and then the lit one is the answer. The names are absolutely positioned and capped at 36% of the width, so a long one can never shunt a control sideways."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="one agent">
            <Window>
              <AppTitleBar
                left={{ open: true, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={{ open: true, title: TOGGLE_TITLES.right, onToggle: noop }}
              />
            </Window>
          </Specimen>
          <Specimen label="a split window, the left pane focused">
            <Window>
              <AppTitleBar
                left={{ open: true, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={PAIR}
                right={{ open: true, title: TOGGLE_TITLES.right, onToggle: noop }}
              />
            </Window>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A pair of words, one of them on"
        note="Exactly two options, and the thumb is a sibling of both rather than the chosen button’s own ground: a background that moves from one element to another can only cut, and this one slides. There was a second switch here once, changing an agent between coder and planner — the product decided it earned nothing in the bar, and it took a size ladder with it. Press it."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Window>
            <AppTitleBar
              left={toggles.left}
              leftSwitch={{
                options: [
                  { id: 'normal', label: 'Normal', title: 'One agent at a time' },
                  { id: 'split', label: 'Split', title: 'Two agents side by side' },
                ],
                value: view,
                onSelect: setView,
              }}
              titles={view === 'split' ? PAIR : [{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
              action={{ label: 'Archive', title: 'Archive the agent  ⌘W', onClick: noop }}
              right={toggles.right}
            />
          </Window>
          <Snippet>{`leftSwitch={{ options: [normal, split], value, onSelect }}`}</Snippet>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The far right belongs to the app, not to the agent"
        note="Three slots after the info toggle, and none of them is about the agent in the middle. The sliders open the quick-settings sheet and light in ink while it is down, the same way the panel toggles do — the sheet is a panel like any other. The notice before them stands only while something about the whole app is true, and pressing it goes to where that can be changed. The account comes last, past the sliders, and names the person rather than a setting. Press the sliders."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="settings — shut, then lit while the sheet is down">
            <Window>
              <AppTitleBar
                left={toggles.left}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={toggles.right}
                settings={settings}
              />
            </Window>
          </Specimen>
          <Specimen label="notice — a standing fact about the app, and the way to act on it">
            <Window>
              <AppTitleBar
                left={{ open: true, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={{ open: true, title: TOGGLE_TITLES.right, onToggle: noop }}
                notice={{ label: 'Notifications off', title: 'Notifications off', icon: BellOff, onClick: noop }}
                settings={{ open: false, title: SETTINGS_TITLE, onToggle: noop }}
              />
            </Window>
          </Specimen>
          <Specimen label="account — the person, at the very end of the bar">
            <Window>
              <AppTitleBar
                titles={[{ id: 'a', label: 'Refonte du volet compte' }]}
                settings={{ open: false, title: SETTINGS_TITLE, onToggle: noop }}
                account={{ label: 'Xavier', title: 'Account', avatar: { src: null, alt: '' }, onClick: noop }}
              />
            </Window>
          </Specimen>
          <Snippet>{`settings={{ open, title, onToggle }}
account={{ label, title, avatar, onClick }}`}</Snippet>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The gutter is the app’s, the lights are not"
        note="macOS draws the three buttons; the bar only leaves the 64px hole they land in. In native fullscreen they are gone and the gutter goes with them, or the first toggle sits beside a notch nothing fills — so the app turns it off rather than the component guessing. A web page drawing this window has to add the lights itself, inside that same gutter."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="trafficLightGutter (the default) — 64px kept clear">
            <Window>
              <AppTitleBar
                left={{ open: true, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={{ open: true, title: TOGGLE_TITLES.right, onToggle: noop }}
                settings={{ open: false, title: SETTINGS_TITLE, onToggle: noop }}
              />
            </Window>
          </Specimen>
          <Specimen label="false — fullscreen, the toggle flush against the bar’s own padding">
            <Window>
              <AppTitleBar
                trafficLightGutter={false}
                left={{ open: true, title: TOGGLE_TITLES.left, onToggle: noop }}
                titles={[{ id: 'a', label: 'PAY-318 · invoice VAT' }]}
                right={{ open: true, title: TOGGLE_TITLES.right, onToggle: noop }}
                settings={{ open: false, title: SETTINGS_TITLE, onToggle: noop }}
              />
            </Window>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { AppTitleBar, TITLE_BAR_HEIGHT } from '@ds/desktop'

<AppTitleBar
  trafficLightGutter={!isFullScreen}
  left={{ open: leftSidebarVisible, title: t('titlebar.toggleAgentsList'), onToggle: toggleLeftSidebar }}
  titles={titles}
  action={{ label: t('agentInfo.closeAgent'), title: \`\${t('agentInfo.closeAgent')} ⌘W\`, onClick: askToClose }}
  right={{ open: rightSidebar === 'info', title: t('titlebar.info'), onToggle: toggleInfo }}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>TITLE_BAR_HEIGHT</code> and <code>TRAFFIC_LIGHT_GUTTER</code> travel with
          it, because this is no longer the only thing laid out around those lights: the
          app’s full-screen overlay covers this bar, and macOS keeps drawing its three
          buttons over whatever is up there — so <code>ModalHeader</code> steps around the
          same 64px. Two places holding the same number is how one of them ends up holding
          a different one.
        </p>
      </EntrySection>
    </article>
  )
}
