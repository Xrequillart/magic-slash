'use client'

import { Text, TEXT_SIZES, TEXT_WEIGHTS, type TextSize, type TextTone, type TextWeight } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/**
 * The Text entry.
 *
 * Every specimen below is the real component, so the face on this page is the face
 * in the app — which is the one thing this entry has to prove, given that the site's
 * own `font-sans` is a different typeface entirely.
 */

const SIZES: { size: TextSize; note: string }[] = [
  { size: 'xs', note: 'the default — 460 uses, most of the app' },
  { size: 'sm', note: '191 uses — a banner, a card body' },
  { size: 'base', note: 'a settings paragraph' },
  { size: 'lg', note: 'a section head' },
  { size: 'xl', note: 'rare' },
  { size: '2xl', note: 'a page title' },
]

const WEIGHTS: { weight: TextWeight; note: string }[] = [
  { weight: 'light', note: 'Cera Pro Light · 300' },
  { weight: 'medium', note: 'Cera Pro Medium · 500 — the body weight' },
  { weight: 'bold', note: 'Cera Pro Bold · 700' },
  { weight: 'black', note: 'Cera Pro Black · 900' },
]

const TONES: { tone: TextTone; note: string }[] = [
  { tone: 'ink', note: 'what the reader is meant to read' },
  { tone: 'secondary', note: 'what supports it' },
  { tone: 'inherit', note: 'takes the colour of what it sits in' },
]

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'string',
    required: true,
    description: (
      <>
        The words, already translated. A string and not a <code>ReactNode</code>: text that needs a
        node inside it has structure, and structure is how a label component grows a{' '}
        <code>&lt;strong&gt;</code>, then a link, then a layout. Compose several of these instead.
      </>
    ),
  },
  {
    name: 'size',
    type: "'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'",
    fallback: "'xs'",
    description:
      'Named after the Tailwind classes they are, so there is one vocabulary rather than two. xs and sm are 95% of the app’s text, which is why xs is the default and why the scale is dense at the bottom.',
  },
  {
    name: 'weight',
    type: "'light' | 'medium' | 'bold' | 'black'",
    fallback: "'medium'",
    description:
      'Named after the four faces that exist. A scale offering normal/medium/semibold/bold would be four names for two drawings, since nothing upright answers to 400 or 600. medium is the body weight here, and defaulting to it changes nothing on screen: unweighted text was already falling through 400 to this face.',
  },
  {
    name: 'tone',
    type: "'ink' | 'secondary' | 'inherit'",
    fallback: "'ink'",
    description:
      'A text component has to own its colour or every call site passes a class for it — which is exactly what Banner was doing, spelling text-ink beside a size it also spelled.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Layout and truncation only — truncate, min-w-0, a margin. Never a size, weight or colour: a second spelling of any of the three would win or lose on the order Tailwind emitted them in.',
  },
  {
    name: 'title',
    type: 'string',
    description: 'The native tooltip, for a line that may be truncated.',
  },
]

// No `onOpen`: a foundation draws nothing but itself, so there are no chips to click
// through. The type now says so — `uses` and `onOpen` travel together or not at all.
export function TextEntry({ theme }: { theme: DesktopTheme }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Text">
        Words, in Cera Pro, at one of six sizes in one of four weights. It names the face directly
        rather than leaning on <code>font-sans</code> — which is Cera Pro in the desktop app and
        Avenir on this site, so a shared component trusting it would render this page in a typeface
        the product does not use.
      </EntryHeader>

      <EntrySection
        title="Sizes"
        note="Named after the Tailwind classes they are, so there is one vocabulary and not two. Dense at the bottom because that is where the app lives: xs and sm together are 95% of its text."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {SIZES.map(({ size, note }) => (
            <span key={size} className="flex items-baseline gap-4">
              <span className="w-12 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <span className="flex-shrink-0">
                <Text size={size}>An agent is already working on this ticket.</Text>
              </span>
              <span className="ml-auto min-w-0 truncate pl-4 font-mono text-[10px] text-text-secondary">
                {TEXT_SIZES[size]} · {note}
              </span>
            </span>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Weights"
        note="Four names for four files, because there are only four faces. The shipped family has no upright Regular — the @font-face at weight 400 points at the Regular Italic and declares font-style: italic — so 400 and 500 render the same drawing, and so do 600 and 700. Measured, not deduced: at 40px, 400 and 500 both set “Handgloves 123” in 290.69px."
      >
        {/* Each specimen is `flex-shrink-0` and the NOTE is what truncates. The two
            shared a row and both could shrink, so the longest note squeezed its own
            specimen — the `medium` line came out 54px narrower than `light`, which on
            a page about weights reads as the weight being wrong. */}
        <Stage theme={theme} className="flex flex-col gap-4">
          {WEIGHTS.map(({ weight, note }) => (
            <span key={weight} className="flex items-baseline gap-4">
              <span className="w-20 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {weight}
              </span>
              <span className="flex-shrink-0">
                <Text size="sm" weight={weight}>
                  An agent is already working on this ticket.
                </Text>
              </span>
              <span className="ml-auto min-w-0 truncate pl-4 font-mono text-[10px] text-text-secondary">
                {TEXT_WEIGHTS[weight]} · {note}
              </span>
            </span>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Tones"
        note="Two rungs and an escape hatch, the shape Icon uses. Both rungs are theme tokens — change the theme in the rail and they move together."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          {TONES.map(({ tone, note }) => (
            <span key={tone} className="flex items-baseline gap-4">
              <span className="w-20 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {tone}
              </span>
              <span className="flex-shrink-0">
                <Text size="sm" tone={tone}>
                  An agent is already working on this ticket.
                </Text>
              </span>
              <span className="ml-auto min-w-0 truncate pl-4 font-mono text-[10px] text-text-secondary">
                {note}
              </span>
            </span>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Text } from '@ds/desktop'

<Text size="sm">{t('tasks.hasAgentHint')}</Text>`}</Snippet>
      </EntrySection>
    </article>
  )
}
