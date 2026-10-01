'use client'

import { useEffect, useRef, useState } from 'react'
import { UpdateSplash, type UpdateStage } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The same five seconds the app counts, so the drawing and the product agree. */
const COUNTDOWN = 5
const VERSION = '0.105.5'

const PROPS: PropRow[] = [
  {
    name: 'stage',
    type: "{ type: 'checking' | 'downloading' | 'ready' | 'failed', … }",
    required: true,
    description:
      'Where the update has got to. downloading carries a percent; the others carry nothing. Entering downloading and entering ready each make the rabbit hop.',
  },
  {
    name: 'label',
    type: 'string',
    required: true,
    description:
      'The one line under the rabbit, translated and filled in: “Checking for updates…”, “Downloading Magic Slash v0.105.5”, “Magic Slash will restart in 4…”. The caller’s, because every one of them carries a version or a count.',
  },
  {
    name: 'action',
    type: '{ label: string; onClick: () => void }',
    description: 'The one button under the line: Later during the countdown, Try again after a failed transfer. Absent everywhere else.',
  },
  {
    name: 'leaving · onLeft',
    type: 'boolean · () => void',
    description:
      'Hand the screen back: the line fades, the rabbit dashes off to the upper right, the ground fades, then onLeft fires and the caller unmounts.',
  },
  {
    name: 'contained',
    type: 'boolean',
    description: 'Fill the nearest positioned ancestor instead of the window. For a drawing like this one; the app never passes it.',
  },
]

export function UpdateSplashEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="UpdateSplash" uses={usesOf('updatesplash')} onOpen={onOpen}>
        The app telling you it is about to become a newer app, on the launch splash’s white
        ground. The rabbit slashes in, hops when a release is found, hops again when it is
        on disk, then the app restarts.
      </EntryHeader>

      <EntrySection
        title="It plays itself"
        note="Checking → found → transferring → counting down, then the app relaunches. Press play and watch it through; Later is the one way to stop it, and the rabbit dashes off when it is pressed."
      >
        <Stage theme={theme}>
          <Playback />
        </Stage>
      </EntrySection>

      <EntrySection
        title="The launch splash’s colours, not the theme’s"
        note="The launch splash paints before any theme has loaded, so it is white and black whatever the theme is. This is the same screen, so its colours are the same literals, and its progress bar is drawn by hand rather than borrowed: every colour ProgressBar has is a token."
      >
        <PropsTable rows={PROPS} />
        <Snippet>{`import { UpdateSplash } from '@ds/desktop'

<UpdateSplash
  stage={{ type: 'ready' }}
  label={t('update.restartingIn', { seconds: remaining })}
  action={{ label: t('app.later'), onClick: postpone }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}

/** The view the drawing holds: what the app's `UpdateModal` hands the splash. */
interface View {
  stage: UpdateStage
  label: string
  action?: { label: string; onClick: () => void }
}

/**
 * The stages, walked end to end.
 *
 * A drawing of a sequence has to BE the sequence: four static splashes would say what
 * each stage looks like and nothing about the hops and the exit, which are the point.
 */
function Playback() {
  const [view, setView] = useState<View | null>(null)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function leave() {
    stop()
    setLeaving(true)
  }

  function play() {
    stop()
    setLeaving(false)
    setView({ stage: { type: 'checking' }, label: 'Checking for updates…' })
    timerRef.current = setTimeout(() => download(0), 1400)
  }

  function download(percent: number) {
    setView({ stage: { type: 'downloading', percent }, label: `Downloading Magic Slash v${VERSION}` })
    if (percent >= 100) {
      timerRef.current = setTimeout(() => countdown(COUNTDOWN), 700)
      return
    }
    // The first tick waits for the hop that greets the release to land.
    timerRef.current = setTimeout(() => download(Math.min(100, percent + 7)), percent === 0 ? 1100 : 180)
  }

  function countdown(remaining: number) {
    setView({
      stage: { type: 'ready' },
      label: `Magic Slash will restart in ${remaining}…`,
      action: { label: 'Later', onClick: leave },
    })
    // Nothing to relaunch into on a web page, so the splash simply leaves.
    timerRef.current = setTimeout(() => (remaining <= 1 ? leave() : countdown(remaining - 1)), 1000)
  }

  function failed() {
    stop()
    setLeaving(false)
    setView({ stage: { type: 'failed' }, label: 'Download failed', action: { label: 'Try again', onClick: play } })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={play}
          className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
        >
          Play the sequence
        </button>
        <button
          type="button"
          onClick={failed}
          className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
        >
          Failed transfer
        </button>
      </div>
      <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-hairline">
        {view && (
          <UpdateSplash
            {...view}
            contained
            leaving={leaving}
            onLeft={() => {
              setView(null)
              setLeaving(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
