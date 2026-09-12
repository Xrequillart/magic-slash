'use client'

import { Card, Label, Text } from '@ds/desktop'
import { Ticket } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  { name: 'children', type: 'ReactNode', required: true, description: 'Whatever the card holds. The card has no opinion about it.' },
  {
    name: 'padding',
    type: "'regular' | 'compact' | 'none'",
    fallback: "'regular'",
    description:
      'regular is the one to use. compact is a card folded to one line, where p-4 would undo the point of folding it. none is for a panel whose body scrolls — padding on the outside puts the scrollbar inside it and clips the first row.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Layout inside and around — flex flex-col gap-2, flex-1 min-h-0, a margin. Not the ground, the radius or the padding: a second spelling of the padding would win or lose on the order Tailwind emitted them in.',
  },
]

export function CardEntry({ theme }: { theme: DesktopTheme }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Card">
        A raised panel on the app’s ground. It holds a ground, a radius and a padding, and it
        holds nothing else — no header, no title, no border, no shadow. A card that knew what
        went inside it would be a layout, and a layout is not a foundation.
      </EntryHeader>

      <EntrySection
        title="Padding"
        note="Three, and the two exceptions are real: the agent sidebar folds a card to one line, and its spec panel scrolls its own body."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Specimen label="regular — p-4">
            <Stage theme={theme}>
              <Card className="flex flex-col gap-2">
                <Text weight="medium">Repository</Text>
                <Label icon={Ticket}>3 tickets</Label>
              </Card>
            </Stage>
          </Specimen>
          <Specimen label="compact — px-4 py-2">
            <Stage theme={theme}>
              <Card padding="compact" className="flex items-center gap-2">
                <Label tone="claude-code">Claude Code</Label>
              </Card>
            </Stage>
          </Specimen>
          <Specimen label="none">
            <Stage theme={theme}>
              <Card padding="none">
                <div className="border-b border-line-subtle px-4 py-2">
                  <Text weight="medium">A header on the edge</Text>
                </div>
                <div className="px-4 py-2">
                  <Text tone="secondary">A body that scrolls</Text>
                </div>
              </Card>
            </Stage>
          </Specimen>
        </div>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Card } from '@ds/desktop'

<Card className="flex flex-col gap-2">{children}</Card>`}</Snippet>
      </EntrySection>
    </article>
  )
}
