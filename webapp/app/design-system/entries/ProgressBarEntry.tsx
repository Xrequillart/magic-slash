'use client'

import { ProgressBar, type ProgressSize, type ProgressTrack } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/** The app's two real threshold sets, which disagree by 25 points and are both right. */
const LIMIT = { warning: 65, danger: 85 }
const CONTEXT = { warning: 40, danger: 70 }

const SIZES: { size: ProgressSize; note: string }[] = [
  { size: 'xs', note: 'h-1 — a sidebar mini-bar' },
  { size: 'sm', note: 'h-1.5 — the common one' },
  { size: 'md', note: 'h-2 — the bar is the row’s subject' },
]

const TRACKS: { track: ProgressTrack; note: string }[] = [
  { track: 'surface', note: 'a raised sliver' },
  { track: 'strong', note: 'heavier, for a bar sitting on a surface' },
  { track: 'sunken', note: 'a recess — the context gauge’s well' },
]

const PROPS: PropRow[] = [
  {
    name: 'value',
    type: 'number',
    required: true,
    description:
      '0 to 100, clamped — a caller doing its own arithmetic cannot overflow the track.',
  },
  {
    name: 'tone',
    type: "'success' | 'warning' | 'danger' | 'accent'",
    fallback: "'success'",
    description:
      'The colour below the first threshold, or the only colour when there are none. accent is not a severity: it is the app reporting its own download, where green would read as a verdict on something unfinished.',
  },
  {
    name: 'thresholds',
    type: '{ warning: number; danger: number }',
    description:
      'Where the fill turns orange and then red. The caller’s, because the same percentage means opposite things on different gauges — the app’s own two disagree by 25 points and both are right.',
  },
  {
    name: 'size',
    type: "'xs' | 'sm' | 'md'",
    fallback: "'sm'",
    description: 'h-1, h-1.5, h-2 — the three heights the app draws.',
  },
  {
    name: 'track',
    type: "'surface' | 'strong' | 'sunken'",
    fallback: "'surface'",
    description:
      'The well the fill runs in. Three is probably one too many: sunken has a reason, surface against strong is 6% against 10% and nobody wrote down why.',
  },
  {
    name: 'label',
    type: 'string',
    description:
      'What the bar is measuring, for a screen reader. Without it the bar has no role and is decorative — which is the right answer for one sitting beside a number that already says it.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Width and margins. Not the height, the radius or either colour.',
  },
]

export function ProgressBarEntry({ theme }: { theme: DesktopTheme }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ProgressBar">
        A filled track — how much of something is used. Green all the way to 100% unless you
        say otherwise: a bar that reddens on its own has an opinion about what it is measuring,
        and a download at 90% is nearly done, not nearly broken.
      </EntryHeader>

      <EntrySection
        title="Thresholds"
        note="Two numbers, and they belong to the caller. 60% of a weekly quota is an ordinary Wednesday; 60% of a context window is most of the way to a compaction. The app’s two gauges sit 25 points apart for exactly that reason."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          {[10, 50, 75, 95].map((value) => (
            <div key={value} className="flex items-center gap-4">
              <span className="w-10 flex-shrink-0 font-mono text-[10px] text-text-secondary tabular-nums">
                {value}%
              </span>
              <span className="flex-1">
                <ProgressBar value={value} thresholds={LIMIT} size="md" />
              </span>
              <span className="flex-1">
                <ProgressBar value={value} thresholds={CONTEXT} size="md" />
              </span>
            </div>
          ))}
          <div className="flex items-center gap-4 font-mono text-[10px] text-text-secondary">
            <span className="w-10 flex-shrink-0" />
            <span className="flex-1">plan limits · 65 / 85</span>
            <span className="flex-1">context window · 40 / 70</span>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Without them"
        note="No thresholds, no opinion. Green by default, or accent for progress that is not a verdict on anything."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <ProgressBar value={72} size="md" />
          <ProgressBar value={72} tone="accent" size="md" />
        </Stage>
      </EntrySection>

      <EntrySection title="Sizes">
        <Stage theme={theme} className="flex flex-col gap-4">
          {SIZES.map(({ size, note }) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-10 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <span className="flex-1">
                <ProgressBar value={62} size={size} />
              </span>
              <span className="w-56 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {note}
              </span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Tracks"
        note="The well matters: the context gauge keeps one at all times because it is what makes the remainder legible. A fill floating on nothing says how much is used without saying of what."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {TRACKS.map(({ track, note }) => (
            <div key={track} className="flex items-center gap-4">
              <span className="w-10 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {track}
              </span>
              <span className="flex-1">
                <ProgressBar value={45} size="md" track={track} />
              </span>
              <span className="w-56 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {note}
              </span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ProgressBar, PROGRESS_TEXT, progressTone } from '@ds/desktop'

const tone = progressTone(pct, LIMIT_THRESHOLDS)

<span className={PROGRESS_TEXT[tone]}>{Math.round(pct)}%</span>
<ProgressBar value={pct} thresholds={LIMIT_THRESHOLDS} size="md" label={label} />`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>progressTone</code> and <code>PROGRESS_TEXT</code> are exported because the
          percentage a caller prints sits <em>outside</em> the track, in its own row, and has to
          agree with the fill. Every one of the five bars this replaced computed both from one
          function; these two are what keep them in step.
        </p>
      </EntrySection>
    </article>
  )
}
