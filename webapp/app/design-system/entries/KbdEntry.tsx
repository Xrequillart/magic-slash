'use client'

import { Card, Kbd, Text } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Five of the fourteen chords the shortcuts page lists, as it hands them over. */
const CHORDS: [string, string][] = [
  ['New agent', 'N'],
  ['Close agent', 'W'],
  ['Previous agent', '↑'],
  ['Toggle split view', '/'],
  ['Quick settings', ','],
]

const PROPS: PropRow[] = [
  {
    name: 'keys',
    type: 'string[]',
    required: true,
    description:
      'The chord, one entry per key: ["⌘", "N"], ["⌃", "Space"]. A list and not a string, which is the whole of the API decision: "⌘ N" would arrive as one run of characters the component would have to split on a space — and a space is a separator in ⌘ N and a KEY NAME in ⌃ Space. The caller knows which is which; a parser would be guessing. One cap and not one per key, because a chord is a single gesture: two gestures are two Kbds, which is what the appearance page’s ⌘ + and ⌘ − are.',
  },
  {
    name: 'size',
    type: "'xs' | 'sm'",
    fallback: "'sm'",
    description:
      'Two rungs, because there are two places a key is drawn. sm is 24px — a row’s value, the chord at the right of a line that names what it does. xs is 20px, for a cap INSIDE a sentence: the appearance page names ⌘ + and ⌘ − in the middle of a line of xs prose, and a row-sized cap there is taller than the line it interrupts.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and alignment. Not the ground, the radius or the type.',
  },
]

export function KbdEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Kbd" uses={usesOf('kbd')} onOpen={onOpen}>
        A key you press, drawn as the cap it is written on.
      </EntryHeader>

      <EntrySection
        title="It was two spellings, and they disagreed"
        note="The shortcuts page drew px-2 py-0.5 bg-surface border border-line rounded text-xs. The appearance page, one tab away, drew px-1 py-0.5 bg-surface-strong rounded text-[10px] in the middle of a sentence. Same object, two grounds, two radii, two type sizes, and one of them with an outline."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="a row’s value — the chord at the right of what it does">
            <Card className="w-full">
              <div className="grid grid-cols-2 gap-3">
                {CHORDS.map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <Text size="sm" tone="secondary">{label}</Text>
                    <Kbd keys={['⌘', key]} />
                  </div>
                ))}
              </div>
            </Card>
          </Specimen>
          <Specimen label="inside a sentence — the smaller rung, on the text’s own line">
            <Card className="w-full">
              <Text size="xs" tone="secondary" className="opacity-50">
                Interface scale. Or press
              </Text>{' '}
              <Kbd size="xs" keys={['⌘', '+']} />{' '}
              <Kbd size="xs" keys={['⌘', '−']} />{' '}
              <Text size="xs" tone="secondary" className="opacity-50">
                at any time.
              </Text>
            </Card>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The modifiers are typeset a rung up"
        note="⌘ at the same size as N reads smaller than it, because it is: the four Mac modifier glyphs are drawn around the x-height where a capital fills the cap-height. The shortcuts page had already fixed this by hand — a text-sm span inside a text-xs cap — and that is exactly the kind of correction that survives in one place and is forgotten in the next, which is what happened one tab away."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-3">
          <Kbd keys={['⌘', 'N']} />
          <Kbd keys={['⌃', 'Space']} />
          <Kbd keys={['⌃⇧', 'Space']} />
          <Kbd keys={['⌥⇧', 'M']} />
          <Kbd keys={['⌘', '↑']} />
          <Kbd keys={['Control+Space']} />
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The rule is per <em>character</em> and not per key: the modifiers stack, and{' '}
          <code>⌃⇧</code> is as short as either glyph alone. <code>Space</code> is a word
          and stays at the cap’s own rung — a string <em>containing</em> a raised glyph is
          not the same thing as a string made of them. It is a fact about the glyphs and
          not about the app, which is the only reason this component is allowed to look at
          what it was handed: what a key <em>means</em>, whether a chord is bound, and
          which platform is underneath are all the caller’s.
        </p>
      </EntrySection>

      <EntrySection
        title="No outline"
        note="The cap is surface-strong, a step up from the surface every card that holds one is drawn on, and it wears no hairline — Button’s rule, and the one AccountCard and RepositoryItem learned the same way. The version with the border was drawn in bg-surface on a bg-surface card, which is why it needed one: it was invisible otherwise."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It is a <code>{'<kbd>'}</code> and not a styled span, which costs nothing and is
          the one thing the markup can say that the drawing cannot: this is a key on a
          keyboard. <code>Label</code> is the neighbour to tell it apart from — that one{' '}
          <em>names</em> a thing, on a plate tinted with that thing’s colour. A key carries
          nobody’s brand.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Kbd } from '@ds/desktop'

<Kbd keys={['⌘', key]} />
<Kbd size="xs" keys={['⌘', '+']} />

// The chord comes from the option table, already split — composed where the
// chords are written rather than parsed where they are drawn.
<Kbd keys={SPOTLIGHT_OPTIONS.find((o) => o.value === shortcut)?.keys ?? [shortcut]} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
