'use client'

import { StickyBar, Input, Select } from '@ds/desktop'
import { ArrowDownWideNarrow, Search } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'height', type: 'number', required: true, description: 'The bar’s own box in pixels, not a minimum. Set rather than left to the content because it is the offset everything pinned UNDER it has to use — two bands at the same top are one band hiding the other, and a height that falls out of the padding is a height nobody else can read.' },
  { name: 'top', type: 'number', fallback: '0', description: 'Where it pins, in pixels from the top of the scrolling pane. 0 unless something else is already pinned there — a mode band, a title bar. The caller’s: what is stacked above a band is a fact about the page around it.' },
  { name: 'stuck', type: 'boolean', fallback: 'false', description: 'Whether it HAS pinned there — it lifts its shadow. The caller owns the question too: the sentinel that answers it sits where the bar STARTS, and a band that has moved cannot report the position it came from. There is no :stuck on this Chromium.' },
  { name: 'children', type: 'ReactNode', description: 'The controls. A container, like Card and BoardColumn — what narrows a list is entirely the caller’s.' },
  { name: 'className', type: 'string', fallback: "''", description: 'The full-bleed trick, and it is the one thing a caller must not forget: an opaque band inside a page with a 24px inset needs -mx-6 px-6 to reach past it, or rows slide past either side. The number is the page’s own padding, which is why it cannot live in here.' },
]

export function StickyBarEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="StickyBar" uses={usesOf('stickybar')} onOpen={onOpen}>
        An opaque band pinned to the top of a scrolling pane, whatever it happens to
        hold — a row of pickers, a trail out of a sub-page.
      </EntryHeader>

      <EntrySection
        title="At rest, and pinned"
        note="The only thing that changes about it is its edge. It was called FilterBar for one commit, which was the name of its first tenant rather than the name of the thing — the Tasks board’s row of pickers and that page’s own trail bar are one band with different children, and the three hand-built copies in the app had already drifted on the only part that is theirs."
      >
        <Stage theme={theme} className="flex flex-col gap-8">
          <Specimen label="at rest — no edge at all">
            <StickyBar height={52} className="w-full px-3">
              <Select
                value="magic-slash"
                options={[{ value: 'magic-slash', label: 'magic-slash', color: 'rgb(var(--c-accent, 99 102 241))' }]}
                onChange={() => undefined}
                width={180}
                marker="repo"
              />
              <Input value="" onChange={() => undefined} placeholder="Search this sprint" icon={Search} className="flex-1" />
              <Select
                value="recent"
                options={[{ value: 'recent', label: 'Newest' }, { value: 'priority', label: 'Priority' }]}
                onChange={() => undefined}
                width={140}
                icon={ArrowDownWideNarrow}
              />
            </StickyBar>
          </Specimen>
          <Specimen label="stuck — the band is above the page now">
            <StickyBar height={52} stuck className="w-full px-3">
              <Select
                value="magic-slash"
                options={[{ value: 'magic-slash', label: 'magic-slash', color: 'rgb(var(--c-accent, 99 102 241))' }]}
                onChange={() => undefined}
                width={180}
                marker="repo"
              />
              <Input value="api" onChange={() => undefined} placeholder="Search this sprint" icon={Search} className="flex-1" />
              <Select
                value="recent"
                options={[{ value: 'recent', label: 'Newest' }, { value: 'priority', label: 'Priority' }]}
                onChange={() => undefined}
                width={140}
                icon={ArrowDownWideNarrow}
              />
            </StickyBar>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The edge is a shadow and not a hairline"
        note="It wore border-b border-line the moment it pinned. That rule did a real job — rows sliding underneath dissolve into a band with no edge at all — but a 1px line across the full width of a page is the loudest thing this design language has."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          A shadow says the same thing better: the band is <em>above</em> the page rather
          than ruled off from it, which is exactly what has become true the moment it pins.
          And it says nothing at all at rest, where a hairline under a bar with the list
          flush beneath it is a rule across the page for no reason.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It has to be opaque, which is the one non-negotiable property of a pinned band:
          every <code>surface-*</code> token here is an alpha tint meant to sit on a ground
          rather than to be one, so the bar takes <code>bg-bg-secondary</code> — the modal
          panel’s own colour. Anything else reads as a floating toolbar.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { StickyBar } from '@ds/desktop'

export const FILTER_BAR_H = 52

<StickyBar height={FILTER_BAR_H} top={topOffset} stuck={stuck} className="-mx-6 px-6">
  <Select … />
  <Input … className="flex-1 min-w-0" />
</StickyBar>`}</Snippet>
      </EntrySection>
    </article>
  )
}
