'use client'

import { Avatar, AVATAR_SIZES, type AvatarSize } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/**
 * The Avatar entry.
 *
 * No photo is loaded here and that is on purpose: every specimen below is the
 * FALLBACK, which is the half of this component with decisions in it. A page of
 * stock faces would document nothing but the stock.
 */

const SIZES: { size: AvatarSize; note: string }[] = [
  { size: 'xs', note: '14px — the left sidebar, and the one rung with no pill' },
  { size: 'sm', note: '20px — the settings rail footer' },
  { size: 'md', note: '24px — a row of the members table' },
  { size: 'lg', note: '44px — the identity card' },
]

const PROPS: PropRow[] = [
  {
    name: 'src',
    type: 'string | null',
    required: true,
    description:
      'A data: URL, or null for the fallback. Always data and never remote in this app: the photos live in a private bucket whose only web-facing form is a signed URL that expires, and two of the three windows carry a CSP that stops at data:.',
  },
  {
    name: 'alt',
    type: 'string',
    required: true,
    description:
      'Required, with no default — the app has a translation for “Account photo” and this folder cannot read one. Pass the empty string where the person is already named beside the photo: an alt repeating the adjacent label makes a screen reader say the same person twice per row.',
  },
  {
    name: 'size',
    type: "'xs' | 'sm' | 'md' | 'lg'",
    fallback: "'lg'",
    description:
      'Four boxes. They were named card / footer / sidebar / roster while this lived in the app, which is a design system knowing the name of a screen — the app maps its surfaces onto these now.',
  },
  {
    name: 'fallback',
    type: "'badge' | 'glyph'",
    fallback: "'badge'",
    description:
      'What the no-photo state looks like, and orthogonal to the size on purpose. badge is the filled bg-accent/20 pill; glyph is the bare mark the left sidebar has always drawn, where a pill appearing behind the icon would be a visible change for everyone who never uploads a photo.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Layout only — a margin, a ring. Not the box, which the size owns.',
  },
]

export function AvatarEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Avatar" uses={[{ id: 'icon', label: 'Icon' }]} onOpen={onOpen}>
        A person, as a round photo — or as an <code>Icon</code> when there is none. It knows
        nothing about who: it takes the bytes it is given and draws them. The fallback is the
        icon and never a letter — an initial is for telling several people apart, and here the
        person is named a few pixels away.
      </EntryHeader>

      <EntrySection
        title="Sizes"
        note="Four boxes, each measured against the element it replaced rather than picked off a scale."
      >
        <Stage theme={theme} className="flex flex-wrap items-end gap-8">
          {SIZES.map(({ size }) => (
            <span key={size} className="flex flex-col items-center gap-2">
              <span className="flex h-12 items-center">
                <Avatar src={null} alt="" size={size} />
              </span>
              <span className="font-mono text-[11px] text-ink">{size}</span>
              <span className="font-mono text-[10px] text-text-secondary">
                {AVATAR_SIZES[size].box}
              </span>
            </span>
          ))}
        </Stage>
        <p className="text-xs text-muted">{SIZES.map((s) => `${s.size}: ${s.note}`).join(' · ')}</p>
      </EntrySection>

      <EntrySection
        title="The two fallbacks"
        note="Orthogonal to the size, which is the whole reason it is a prop. The left sidebar’s no-photo state is the bare glyph it has always been; everywhere else keeps the filled pill."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-8">
          <span className="flex items-center gap-3">
            <Avatar src={null} alt="" size="md" fallback="badge" />
            <span className="font-mono text-[11px] text-ink">badge</span>
          </span>
          <span className="flex items-center gap-3">
            <Avatar src={null} alt="" size="md" fallback="glyph" />
            <span className="font-mono text-[11px] text-ink">glyph</span>
          </span>
          {/* The bare glyph takes `currentColor`, which is the point of it: in the app
              it turns yellow with the rest of the row when no repository is configured. */}
          <span className="flex items-center gap-3 text-orange">
            <Avatar src={null} alt="" size="md" fallback="glyph" />
            <span className="font-mono text-[11px]">glyph, inside coloured text</span>
          </span>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The bare glyph carries <em>no colour of its own</em> — it inherits{' '}
          <code>currentColor</code> from whatever surrounds it, which is how the sidebar turns it
          yellow along with the row when no repository is configured. The badge states its colour
          once, on the element that also carries the fill it has to read against.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Avatar } from '@ds/desktop'

<Avatar src={dataUrl} alt={t('cloud.avatar.alt')} size="lg" />
<Avatar src={null} alt="" size="xs" fallback="glyph" />`}</Snippet>
      </EntrySection>
    </article>
  )
}
