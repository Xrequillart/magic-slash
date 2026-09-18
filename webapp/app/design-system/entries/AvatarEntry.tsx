'use client'

import { Avatar, AVATAR_SIZES, type AvatarSize } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The Avatar entry.
 *
 * No photo is loaded here and that is on purpose: every specimen below is the
 * FALLBACK, which is the half of this component with decisions in it. A page of
 * stock faces would document nothing but the stock.
 *
 * The default one now IS a face — the app's default portrait, which ships with the
 * component precisely so this page can draw it without reaching into the desktop app.
 */

const SIZES: { size: AvatarSize; note: string }[] = [
  { size: '2xs', note: '12px — a presence dot: it cannot hold an initial' },
  { size: 'xs', note: '14px — the left sidebar, and the one rung with no pill' },
  { size: 'sm', note: '20px — the settings rail footer' },
  { size: 'md', note: '24px — a row of the members table' },
  { size: 'lg', note: '44px — the identity card' },
  { size: 'xl', note: '56px — a profile header' },
  { size: '2xl', note: '64px — one face, alone on the line' },
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
    type: "'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'",
    fallback: "'lg'",
    description:
      'Four boxes. They were named card / footer / sidebar / roster while this lived in the app, which is a design system knowing the name of a screen — the app maps its surfaces onto these now.',
  },
  {
    name: 'fallback',
    type: "'portrait' | 'glyph' | 'initials'",
    fallback: "'portrait'",
    description:
      'What the no-photo state looks like, and orthogonal to the size on purpose. portrait is the app’s default drawn face, for a person with an account and no picture — it replaced a tinted pill with a CircleUserRound in it; glyph is the bare mark the title bar’s account row draws, which takes currentColor and therefore turns yellow with its row, something a picture cannot do; initials is an accent plate with a letter on it, for GitHub authors who have no account here and would otherwise all be the same stranger.',
  },
  {
    name: 'name',
    type: 'string',
    description:
      'The name the monogram is taken from, for fallback="initials" and ignored by the other two. A name and not a monogram: the component takes the first character and upper-cases it, because one letter is what a round 24px plate fits. Empty or missing draws a ?.',
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
      <EntryHeader title="Avatar" uses={usesOf('avatar')} onOpen={onOpen}>
        A person, as a round photo — or as an <code>Icon</code> when there is none. It knows
        nothing about who: it takes the bytes it is given and draws them. With no photo it
        draws the app’s default portrait; the bare mark and the letter are the two cases a
        drawn face cannot answer.
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
        title="The three fallbacks"
        note="Orthogonal to the size, which is the whole reason it is a prop. A person with an account gets the default portrait; the title bar’s account row keeps the bare glyph, and a GitHub author with no account here keeps a letter."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-8">
          <span className="flex items-center gap-3">
            <Avatar src={null} alt="" size="md" fallback="portrait" />
            <span className="font-mono text-[11px] text-ink">portrait</span>
          </span>
          <span className="flex items-center gap-3">
            <Avatar src={null} alt="" size="md" fallback="glyph" />
            <span className="font-mono text-[11px] text-ink">glyph</span>
          </span>
          <span className="flex items-center gap-3">
            <Avatar src={null} alt="" size="md" fallback="initials" name="xrequillart" />
            <span className="font-mono text-[11px] text-ink">initials</span>
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
          yellow along with the row when no repository is configured. That is the reason it did
          not become a portrait with the rest: a picture cannot inherit a colour. The letter
          states its colour once, on the element that also carries the fill it has to read
          against.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Avatar } from '@ds/desktop'

<Avatar src={dataUrl} alt={t('cloud.avatar.alt')} size="lg" />
<Avatar src={null} alt="" size="xs" fallback="glyph" />
<Avatar src={null} alt="" size="md" fallback="initials" name={comment.author} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
