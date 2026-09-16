'use client'

import { Item, ItemGroup, ItemNote } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'ReactNode',
    required: true,
    description:
      'The row’s own content. Card’s arrangement: this draws a ground and holds a shape, and knows nothing about what is inside it.',
  },
  {
    name: 'align',
    type: "'center' | 'start'",
    fallback: "'center'",
    description:
      'center is a row of one line — a name, some chips, a chevron. start is a row of three, where the facts at the right edge belong beside the title and not beside the middle of a stack that grew a second line of prose under it.',
  },
  {
    name: 'href',
    type: 'string',
    description:
      'Renders an <a>, which is what a row navigating to a page is: it answers the middle button, it can be copied, and the keyboard half is the browser’s. Exclusive with onClick.',
  },
  {
    name: 'onClick',
    type: '() => void',
    description:
      'Renders a role="button" div, for a row that opens something in place — a modal, a detail pane — where there is no address to hand out. Enter and Space are wired here, since a div answers neither on its own. Exclusive with href.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Placement. Not a margin: the rows are flush, and a gap between two of them breaks the stack the first and last radii are describing.',
  },
]

export function ItemEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Item" uses={usesOf('item')} onOpen={onOpen}>
        A row of a list you scan, and the group of them that reads as one object. It owns the
        ground, the hover, the rule between rows, the radius at the two ends and the focus
        ring — and not one fact about what is in the row.
      </EntryHeader>

      <EntrySection
        title="The rows are flush"
        note="No gap between them, a hairline where they meet, and a radius only where the stack begins and ends — so a list of four reads as one panel divided into four, rather than as four cards that happen to be near each other. Two lists in one app, reached from the same tab strip, had two answers to this; now they have one."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <Item href="#">
              <span className="flex-1 text-sm text-ink">magic-slash</span>
              <span className="text-xs text-text-secondary">first — rounded at the top</span>
            </Item>
            <Item href="#">
              <span className="flex-1 text-sm text-ink">notes</span>
              <span className="text-xs text-text-secondary">square both ends</span>
            </Item>
            <Item href="#">
              <span className="flex-1 text-sm text-ink">scratch</span>
              <span className="text-xs text-text-secondary">last — rounded at the bottom</span>
            </Item>
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The radius is on the row, not on the group"
        note="The obvious spelling is the other one: rounded-xl overflow-hidden on the container clips the corners and the rows stay square. That is how the Plans list did it, and the cost was that overflow-hidden clips a focus ring too — so the ring had to be drawn inset to survive, which is a weaker ring on the one interaction that has nothing else to show for itself. Put the shape on the rows and nothing has to be clipped. Tab into the list below."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <Item onClick={() => undefined}>
              <span className="flex-1 text-sm text-ink">PAY-318 · invoice VAT</span>
            </Item>
            <Item onClick={() => undefined}>
              <span className="flex-1 text-sm text-ink">PAY-311 · card change</span>
            </Item>
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A sentence about the list is a row of it"
        note="ItemNote, and not a <p> the caller writes. :first-child and :last-child count elements, not Items — so a bare paragraph at the end takes the group’s bottom radius while wearing no ground, and leaves the last real row square. It is inert: no hover, no pointer, nothing in the tab order, because it is not a row you can open."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <Item onClick={() => undefined}>
              <span className="flex-1 text-sm text-ink">#12 · Split view, Stage Manager</span>
            </Item>
            <Item onClick={() => undefined}>
              <span className="flex-1 text-sm text-ink">#11 · Repository colours</span>
            </Item>
            <ItemNote>Showing the 50 most recent plans.</ItemNote>
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Two lines, and the right edge moves"
        note="align=&quot;start&quot; is what a three-line row needs: the status and the date at the right edge belong beside the title, not beside the middle of the stack under it. It is the one geometry decision this component takes from its caller, because it is the only one the caller’s own content settles."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <ItemGroup>
            <Item align="start" onClick={() => undefined}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-ink">Invoice VAT rounding</span>
                <span className="text-xs text-text-secondary">
                  the totals disagree with the tax lines by a cent on some currencies
                </span>
              </span>
              <span className="text-xs text-text-secondary">start</span>
            </Item>
          </ItemGroup>
          <ItemGroup>
            <Item align="center" onClick={() => undefined}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-ink">Invoice VAT rounding</span>
                <span className="text-xs text-text-secondary">
                  the totals disagree with the tax lines by a cent on some currencies
                </span>
              </span>
              <span className="text-xs text-text-secondary">center</span>
            </Item>
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Item, ItemGroup, ItemNote } from '@ds/desktop'

<ItemGroup>
  {rows.map((row) => (
    <Item key={row.id} href={\`#/repo/\${row.name}\`}>
      …
    </Item>
  ))}
  {truncated && <ItemNote>{t('plans.truncated')}</ItemNote>}
</ItemGroup>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>RepositoryItem</code> and <code>PlanItem</code> both stand on this and share
          nothing else. A plan row and a repository row are the same object with different
          contents, and that was not true before: one was a flush list on a framed ground, the
          other a stack of separate plates.
        </p>
      </EntrySection>
    </article>
  )
}
