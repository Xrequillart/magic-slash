'use client'

import { useState } from 'react'
import { ModalHeader } from '@ds/desktop'
import { ListTodo, NotebookPen, Sparkles } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Nothing happens when these are pressed, and that is the point: every handler here is
 *  a drawing of a handler. The component cannot tell the difference. */
const noop = () => undefined

const TABS = [
  { key: 'plans', label: 'Plans', icon: NotebookPen },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'skills', label: 'Skills', icon: Sparkles },
]

/** A panel to sit the band on, so it is read at the width it is actually drawn at. */
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="w-[720px] max-w-full overflow-hidden rounded-2xl bg-panel">{children}</div>
}

const PROPS: PropRow[] = [
  {
    name: 'title · icon',
    type: 'string · IconComponent',
    description:
      'The name of what is open, on the left where every window in the app puts it, and the mark that names the same thing. With `tabs` the title names the ACTIVE page: the strip in the middle is what you choose with, this is what you are on. The word truncates and the mark does not — `truncate` is on the word rather than on the row, or the icon would be the thing that got cut.',
  },
  {
    name: 'tabs',
    type: '{ items, activeKey, onSelect, ariaLabel }',
    description:
      'The pages this dialog switches between, as `TabStrip`’s own items — so a second level of pages looks like every other one in the app rather than like a control this header invented. Centred on the band by two equal side tracks, so it never drifts as a title or an indicator changes — and a title too long for its track is ellipsed rather than run under the pills, which an absolutely centred strip could not promise at the narrow overlay’s width. A dialog with one page passes nothing, which is most of them.',
  },
  {
    name: 'fullScreen',
    type: '{ expanded, onToggle, expandTitle, collapseTitle }',
    description:
      'The expand control, and absent it simply is not drawn. A page overlay can take the whole window and a confirmation dialog cannot — there is nothing in “are you sure?” to expand into. Optional rather than a boolean some callers set to false: a prop that is not passed draws nothing, where a `false` would still be a decision this component had to hold.',
  },
  {
    name: 'onClose · closeTitle',
    type: '() => void · string',
    description:
      'Dismiss, last in the row. OPTIONAL, for the one dialog that puts its own close elsewhere: a dialog opening on a hero image carries the button in the image’s corner, and a second one in the band under it would be two ways out of one window.',
  },
  {
    name: 'right',
    type: 'ReactNode',
    description:
      'The one slot, for chrome a PAGE owns rather than the dialog — the plans list hangs a live indicator there. It sits before the buttons, because those two are the last thing in the row in every window in this app.',
  },
  {
    name: 'trafficLightGutter',
    type: 'boolean',
    description:
      'Keeps macOS’s 64px corner clear, for a dialog that reaches the top of the window. A full-screen page overlay covers the app’s title bar but NOT the traffic lights: the window is `titleBarStyle: "hidden"`, so the platform draws them over the web content and the overlay is painted under three buttons that land exactly on its mark and title. Applied as a margin on the title rather than a spacer in the row — a spacer would bring the row’s gap with it and indent the inset case by 8px it never asked for — and it is a length at both ends, so it travels with the panel instead of popping in. `PageModal` passes it only while full screen, and only while the window is not in its own native fullscreen, where the lights are gone.',
  },
  {
    name: 'draggable',
    type: 'boolean',
    description:
      'Lets the window be dragged by this band, for the one case where this header is the only chrome left on screen: a full-screen page overlay covers the bar the window was dragged by, and without this the window is immovable for as long as the overlay is open. The tab strip and the right-hand group opt back out — Electron hands macOS rectangles computed from the DOM rather than a hit-test, so a button merely painted over a drag region does not reclaim its pixels. The title does not opt out, deliberately: dragging a window by the name of what is in it is what every window on the platform does.',
  },
]

export function ModalHeaderEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [tab, setTab] = useState('tasks')
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ModalHeader" uses={usesOf('modalheader')} onOpen={onOpen}>
        The band across the top of every dialog in the app — a mark and a name on the
        left, the pages in the middle when there are several, and the two controls that
        act on the WINDOW rather than on what is inside it on the right.
      </EntryHeader>

      <EntrySection
        title="It was written twice"
        note="The page overlay had one shape and the dialog had another: a bare heading and a close button, at a different height, with a different padding, and a rule under it the overlay did not have. Two headers is two answers to what the top of a dialog looks like — and the day one of them grew a tab strip, the other could not follow. Press a tab, or the expand button."
      >
        <Stage theme={theme}>
          <Panel>
            <ModalHeader
              title={TABS.find((t) => t.key === tab)?.label ?? ''}
              icon={TABS.find((t) => t.key === tab)?.icon}
              tabs={{ items: TABS, activeKey: tab, onSelect: setTab, ariaLabel: 'Pages' }}
              fullScreen={{
                expanded,
                onToggle: () => setExpanded((was) => !was),
                expandTitle: 'Full screen  ⌘⇧F',
                collapseTitle: 'Exit full screen  ⌘⇧F',
              }}
              onClose={noop}
              closeTitle="Close  Esc"
            />
          </Panel>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Everything past the title is optional"
        note="A confirmation dialog has one page and nothing to expand into, so it passes neither — and draws neither. The band keeps its height either way, which is what stops two dialogs open one after the other from looking like two different windows."
      >
        <Stage theme={theme}>
          <Specimen label="a dialog — a name and a way out">
            <Panel>
              <ModalHeader title="Delete this organization?" onClose={noop} closeTitle="Close" />
            </Panel>
          </Specimen>
          <Specimen label="no rule under it — the body starts straight after">
            <Panel>
              <ModalHeader title="Skills" icon={Sparkles} onClose={noop} closeTitle="Close" />
              <div className="px-4 pb-4 text-xs text-muted">
                A dialog is one surface. A line drawn across it says the header is a
                separate panel sitting on the body.
              </div>
            </Panel>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Full screen, where the band is the top of the window"
        note="Expanded, a page overlay reaches the top — so it inherits the two jobs the app’s title bar was doing. macOS keeps drawing its traffic lights over the web content, so the title steps around the same 64px the bar steps around; and the band becomes what the window is dragged by, since the bar it covered is gone. The dots below are where the platform draws its own, to scale."
      >
        <Stage theme={theme}>
          <Specimen label="trafficLightGutter — the title clears the lights">
            <Panel>
              {/* A DRAWING OF THE PLATFORM'S BUTTONS, and the only reason they are here:
                  the lights are macOS's and a browser has none, so the one thing this
                  specimen has to show — that the title clears them — would otherwise be
                  invisible on the site. Positioned from `trafficLightPosition` in the
                  app's main process: x=16 for the first, 20px apart, 12px in diameter. */}
              <div className="relative">
                <div className="pointer-events-none absolute left-4 top-[18px] flex gap-2">
                  <span className="size-3 rounded-full bg-[#ff5f57]" />
                  <span className="size-3 rounded-full bg-[#febc2e]" />
                  <span className="size-3 rounded-full bg-[#28c840]" />
                </div>
                <ModalHeader
                  title="Plans"
                  icon={NotebookPen}
                  tabs={{ items: TABS, activeKey: 'plans', onSelect: noop, ariaLabel: 'Pages' }}
                  fullScreen={{
                    expanded: true,
                    onToggle: noop,
                    expandTitle: 'Full screen  ⌘⇧F',
                    collapseTitle: 'Exit full screen  ⌘⇧F',
                  }}
                  onClose={noop}
                  closeTitle="Close  Esc"
                  trafficLightGutter
                />
              </div>
            </Panel>
          </Specimen>
          <Specimen label="without it — the same band inset, where a real title bar is above">
            <Panel>
              <ModalHeader
                title="Plans"
                icon={NotebookPen}
                tabs={{ items: TABS, activeKey: 'plans', onSelect: noop, ariaLabel: 'Pages' }}
                fullScreen={{
                  expanded: false,
                  onToggle: noop,
                  expandTitle: 'Full screen  ⌘⇧F',
                  collapseTitle: 'Exit full screen  ⌘⇧F',
                }}
                onClose={noop}
                closeTitle="Close  Esc"
              />
            </Panel>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ModalHeader } from '@ds/desktop'

<ModalHeader
  title={t(activePage.labelKey)}
  icon={activePage.icon}
  tabs={{ items, activeKey: activeModal, onSelect: openModal, ariaLabel: t('workspace.tabs.aria') }}
  fullScreen={{ expanded, onToggle, expandTitle: t('modal.fullScreen'), collapseTitle: t('modal.exitFullScreen') }}
  onClose={requestClose}
  closeTitle={t('modal.closeEsc')}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>MODAL_HEADER_HEIGHT</code> travels with it — 48px, the number both
          headers had landed on independently. Written once rather than as{' '}
          <code>h-12</code> at two call sites, which is how two headers that agree today
          stop agreeing.
        </p>
      </EntrySection>
    </article>
  )
}
