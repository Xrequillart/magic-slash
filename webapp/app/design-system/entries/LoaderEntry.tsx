'use client'

import { Loader, type LoaderSize } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/** The rungs, with what each one is actually for in the app. */
const SIZES: { size: LoaderSize; note: string }[] = [
  { size: '2xs', note: '10px — a texture rather than a thing that turns' },
  { size: 'xs', note: '12px — inside a dense row' },
  { size: 'sm', note: '14px — beside a button’s label' },
  { size: 'md', note: '16px — the default, and the sidebar badge' },
  { size: 'lg', note: '20px — a panel waiting on its contents' },
  { size: 'xl', note: '24px — a section that is empty until it loads' },
  { size: '2xl', note: '32px — a loader alone on a screen' },
]

const PROPS: PropRow[] = [
  {
    name: 'variant',
    type: "'wave' | 'spin'",
    fallback: "'wave'",
    description:
      'wave is an agent at work — no end, nothing waiting on you. spin is something you started and are waiting on. Both are indeterminate; the difference is whose turn it is.',
  },
  {
    name: 'size',
    type: "'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'",
    fallback: "'md'",
    description:
      'Icon’s five rungs plus one. 2xl is 32px, past anything that sits in a line of text, and it is here because a loader sometimes owns a whole screen.',
  },
  {
    name: 'tone',
    type: "'inherit' | 'accent' | 'muted'",
    fallback: "'inherit'",
    description:
      'inherit is the common case: currentColor, so the agent badge’s own state colour reaches it. The other two are for a loader alone on a ground with nothing to inherit from.',
  },
  {
    name: 'label',
    type: 'string',
    description:
      'What is loading, for a screen reader. Without it the loader is decorative — the right answer beside a row that already says it in words. Pass it when the loader is the only thing on screen.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Layout and colour — flex-shrink-0, a margin, a tone class. Not a size.',
  },
]

export function LoaderEntry({ theme }: { theme: DesktopTheme }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Loader">
        “Something is happening,” in one of two shapes. The app drew this thirty-five times and
        agreed on nothing: a wave with its keyframes in the renderer’s stylesheet, a spinning
        arc spelled out at four sizes in thirty places, and four screens that rolled their own
        ring out of a border.
      </EntryHeader>

      <EntrySection
        title="The two shapes"
        note="Not a style choice. The wave is an agent working — it has no end and nothing is waiting on you, which is why it reads as activity rather than progress. The arc is an action you started: a button pressed, a page fetching. Whose turn it is, is the whole distinction."
      >
        <Stage theme={theme} className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <Loader size="xl" tone="accent" />
            <span className="font-mono text-[11px] text-text-secondary">
              wave · an agent at work
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Loader variant="spin" size="xl" tone="accent" />
            <span className="font-mono text-[11px] text-text-secondary">
              spin · you are waiting
            </span>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Sizes"
        note="Pixels rather than Tailwind classes, and this is the one component in the folder that does it. The wave is three bars whose widths, gaps, radii and two rest heights are all fractions of the box — Tailwind can state the box but not the six things derived from it. Sizing the arc from the same number is what lets the two variants swap at a call site without the row moving."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {SIZES.map(({ size, note }) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-10 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <span className="flex w-10 flex-shrink-0 justify-center">
                <Loader size={size} />
              </span>
              <span className="flex w-10 flex-shrink-0 justify-center">
                <Loader variant="spin" size={size} />
              </span>
              <span className="font-mono text-[10px] text-text-secondary">{note}</span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Tones"
        note="Colourless by default. The bars and the arc are currentColor, so whatever wraps this decides — in the sidebar that is the agent’s own state colour, which the hardcoded-accent ring it replaced simply ignored."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <div className="flex items-center gap-8">
            {(['inherit', 'accent', 'muted'] as const).map((tone) => (
              <div key={tone} className="flex items-center gap-3">
                <Loader size="lg" tone={tone} />
                <span className="font-mono text-[11px] text-text-secondary">{tone}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-8">
            {/* `inherit` is not a colour — it is the absence of one, which only shows
                when something above it has an opinion. These four are the agent states
                the sidebar badge actually paints. */}
            {[
              ['text-green', 'working'],
              ['text-orange', 'waiting'],
              ['text-blue', 'syncing'],
              ['text-red', 'error'],
            ].map(([cls, state]) => (
              <div key={state} className={`flex items-center gap-3 ${cls}`}>
                <Loader size="lg" />
                <span className="font-mono text-[11px]">{state}</span>
              </div>
            ))}
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Loader } from '@ds/desktop'

// In a list, beside words that already say what is going on.
<Loader className="flex-shrink-0" />

// Alone on a screen, where it is the only thing saying anything.
<Loader variant="spin" size="2xl" tone="accent" label={t('common.loading')} />`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The keyframes travel <em>with</em> the component: it puts its own stylesheet in the
          document once, on first render. This folder has no CSS file and gains nothing by
          growing one — it would be a fourth thing to wire per app, after the alias, the
          Tailwind glob and the tsconfig paths.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          One of the four hand-rolled rings this replaced was <em>invisible</em>, and had been
          for as long as it existed: the app’s first loading screen asked for{' '}
          <code>border-3</code>, which is not a Tailwind class, so preflight’s{' '}
          <code>border-width: 0</code> stood and left a coloured top edge on a ring with no
          thickness. Nobody mistyped anything. The only thing that would have caught it is the
          ring being drawn in one place instead of four.
        </p>
      </EntrySection>
    </article>
  )
}
