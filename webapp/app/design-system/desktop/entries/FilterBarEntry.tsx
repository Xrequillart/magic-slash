'use client'

import { useState } from 'react'
import { FilterBar, type FilterBarControl } from '@ds/desktop'
import { ArrowDownWideNarrow, BotMessageSquare, CalendarRange } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'before', type: 'FilterBarControl[]', description: 'The controls ahead of the search box. A select, or a chip — the line Select and Label are drawn either side of: a picker CHANGES what is on screen, a chip NAMES it and does not move while you look at it.' },
  { name: 'search', type: 'FilterBarSearch', description: 'The box that takes the width. It owns the clear button inside it, the spinner that says a wider answer is coming, the warning that says the reach past what is loaded failed, and the Escape that empties the field rather than closing the page around it.' },
  { name: 'after', type: 'FilterBarControl[]', description: 'The controls past it. Conditional pickers go here, so the permanent ones keep the places the reader knows them by.' },
  { name: 'height', type: 'number', fallback: 'FILTER_BAR_HEIGHT (52)', description: 'Its own box, not a minimum: whatever pins below has to know exactly how tall this is, and a height that falls out of its padding is a height nobody else can read.' },
  { name: 'top', type: 'number', fallback: '0', description: 'Where it pins, in pixels from the top of the pane. Not zero when something is already pinned there — a mode banner, a title bar.' },
  { name: 'paneRef', type: 'RefObject<HTMLElement>', description: 'The scrolling pane, for the sentinel that answers whether it has pinned. OMITTED MEANS IT NEVER LIFTS ITS SHADOW, which is the honest state for a bar drawn inside something that does not scroll.' },
  { name: 'className', type: 'string', description: 'The full bleed, and only that: `-mx-6 px-6` for a page inset by 24px. What scrolls past has to go under an opaque band edge to edge, and the number is the page’s own padding.' },
]

export function FilterBarEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [agent, setAgent] = useState('')

  const before: FilterBarControl[] = [
    {
      kind: 'select',
      id: 'repo',
      value: 'magic-slash',
      options: [
        { value: 'magic-slash', label: 'magic-slash', color: '#3B82F6' },
        { value: 'checkout-api', label: 'acme/checkout-api', color: '#10B981' },
      ],
      onChange: () => undefined,
      width: 208,
      marker: 'repo',
    },
    { kind: 'chip', id: 'sprint', label: 'PER Sprint 12', icon: CalendarRange, title: 'Active sprint: PER Sprint 12' },
  ]

  const after: FilterBarControl[] = [
    {
      kind: 'select',
      id: 'sort',
      value: sort,
      options: [{ value: 'recent', label: 'Newest' }, { value: 'priority', label: 'Priority' }],
      onChange: setSort,
      width: 152,
      icon: ArrowDownWideNarrow,
      active: sort !== 'recent',
    },
    {
      kind: 'select',
      id: 'agent',
      value: agent,
      options: [{ value: 'with', label: 'With an agent' }, { value: 'without', label: 'Without an agent' }],
      onChange: setAgent,
      placeholder: 'Any agent',
      clearLabel: 'Any agent',
      width: 160,
      icon: BotMessageSquare,
      active: !!agent,
    },
  ]

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="FilterBar" uses={usesOf('filterbar')} onOpen={onOpen}>
        The row of controls at the top of a list: pickers, a search box that takes the
        width, and more pickers. Pinned, so what narrows a page is never a scroll away
        from it.
      </EntryHeader>

      <EntrySection
        title="Live — type in it, open the pickers"
        note="A control is lit when it is away from what the page opens on, and what that means differs per control: the sort's default is its first entry, the agent's is having no value at all, and the repository has none to be away from. The caller says which; a rule inferred in here would leave the repository permanently lit."
      >
        <Stage theme={theme}>
          <Specimen label="two pickers, a sprint chip, a search box, two more pickers">
            <div className="flex w-full flex-col gap-3">
              <FilterBar
                before={before}
                after={after}
                search={{
                  value: query,
                  onChange: setQuery,
                  placeholder: 'Search by ticket ID or title…',
                  clearLabel: 'Clear the search',
                }}
              />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The three things at the right edge of the box"
        note="Only ever one of them shows, which is why they share a row rather than each claiming the corner: stacked absolutely they would overlap."
      >
        <Stage theme={theme}>
          <Specimen label="searching">
            <div className="flex w-full flex-col gap-3">
              <FilterBar
                search={{
                  value: 'PER-12',
                  onChange: () => undefined,
                  busy: true,
                  busyLabel: 'Searching the whole sprint…',
                  clearLabel: 'Clear the search',
                }}
              />
            </div>
          </Specimen>
          <Specimen label="the reach past what is loaded failed">
            <div className="flex w-full flex-col gap-3">
              <FilterBar
                search={{
                  value: 'PER-12',
                  onChange: () => undefined,
                  warning: 'Could not search beyond the loaded tickets. What is shown is still accurate.',
                  clearLabel: 'Clear the search',
                }}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The spinner is not “the page is loading”: whatever is in memory has already been
          narrowed by the time it appears, undebounced, so it says a WIDER answer is on its
          way — which is why it is a 14px glyph in the corner of the box rather than
          anything that covers the list. The warning is the same restraint one step further:
          nothing is broken that the reader can act on, and the rows they can see are all
          real.
        </p>
      </EntrySection>

      <EntrySection
        title="It is StickyBar plus the two things a band cannot do for itself"
        note="The same split TaskBoard makes over BoardColumn."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It knows <strong>whether it has pinned</strong>: a sticky band has moved, so it
          cannot report the position it came from, and a wrapper that renders the sentinel
          AND the band can. <code>StickyBar.stuck</code> stays a prop for the caller with its
          own answer; nobody who uses this needs one.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          And it knows <strong>what a control in a filter bar looks like</strong> — the
          widths, the order, the clear button inside the box, the Escape that empties the
          field. All of that was spelled out at the Tasks page’s call site and would have
          been spelled again at the Plans page’s. What it holds nothing of is what the
          controls MEAN: a repository, an epic, a sprint, an agent are the app’s vocabulary,
          and they arrive as <code>before</code> and <code>after</code>.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { FilterBar } from '@ds/desktop'

<FilterBar
  before={[{ kind: 'select', id: 'repo', value, options, onChange, width: 208, marker: 'repo' }]}
  search={{ value: query, onChange, placeholder, clearLabel }}
  after={[{ kind: 'select', id: 'sort', value: sort, options, onChange, width: 152, icon }]}
  top={PICK_BAR_H}
  paneRef={paneRef}
  className="-mx-6 px-6"
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
