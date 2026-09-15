'use client'

import { useEffect, useRef, useState } from 'react'
import { UpdateDialog, type UpdateStage } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The same five seconds the app counts, so the drawing and the product agree. */
const COUNTDOWN = 5

const LABELS = {
  availableLabel: 'Update available',
  downloadingLabel: 'Downloading the new version…',
  readyLabel: 'Update ready',
  failedLabel: 'Download failed',
  postponeLabel: 'Later',
  retryLabel: 'Try again',
}

const PROPS: PropRow[] = [
  {
    name: 'stage',
    type: "{ type: 'available' | 'downloading' | 'ready' | 'failed', … }",
    required: true,
    description:
      'Where the update has got to, and the only thing that decides what is drawn. available carries a version, downloading a percent, ready a version and the seconds left out of the total, failed nothing at all.',
  },
  {
    name: 'availableLabel · downloadingLabel · readyLabel · failedLabel',
    type: 'string',
    required: true,
    description:
      'The heading for each stage, translated. Whichever one stage selects is the one drawn — the other three cost nothing and keep the component from having to choose a sentence.',
  },
  {
    name: 'version',
    type: 'string',
    description:
      'Spelled by the caller — “v0.95.0”. Drawn verbatim, for the reason Sidebar’s version line gives: which prefix a version wears is not this dialog’s question.',
  },
  {
    name: 'countdownLabel',
    type: 'string',
    required: true,
    description:
      '“Restarting in 4s…”, already counted and already worded. The seconds are in stage.remaining too, but only so the bar can be drawn from them — the sentence is the caller’s because a French one puts a space before the unit and an English one does not.',
  },
  {
    name: 'postponeLabel · onPostpone',
    type: 'string · () => void',
    required: true,
    description:
      'The one way out, offered only while the countdown runs. At every other stage there is nothing a person could usefully decide, so nothing is offered.',
  },
  {
    name: 'retryLabel · onRetry',
    type: 'string · () => void',
    required: true,
    description: 'Pull it again after a failed transfer. The release is still there; only the download broke.',
  },
  {
    name: 'backdropClassName · className · onAnimationEnd',
    type: 'string · string · (e) => void',
    description: 'The caller’s enter and exit animation, and the panel’s width — see Modal, which owns neither.',
  },
  {
    name: 'portalTo',
    type: 'HTMLElement | null',
    description: 'Passed straight to Modal — see its note on why a drawing of the app needs it.',
  },
]

export function UpdateDialogEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="UpdateDialog" uses={usesOf('updatedialog')} onOpen={onOpen}>
        The app telling you it is about to become a newer app. A Modal holding a Card, four
        stages in one shape: a mark, a line naming what is happening, and underneath it
        whatever that stage has to show.
      </EntryHeader>

      <EntrySection
        title="It plays itself"
        note="Found → transferring → counting down, then the app relaunches. The whole sequence is one uninterrupted thing, which is why it is one component rather than four states scattered down a column. Press play and watch it through; Later is the one way to stop it."
      >
        <Stage theme={theme}>
          <Playback />
        </Stage>
      </EntrySection>

      <EntrySection
        title="It replaced a row in the left sidebar"
        note="That row let you keep working through the download and then asked whether to restart. This holds the screen from the moment a release is found until the app relaunches — an update that can be ignored is an update half the installs never take."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Modal’s <code>onClose</code> is deliberately not wired: a click outside must not
          dismiss an app that is halfway through replacing itself. And the countdown bar
          DRAINS rather than fills, because what it measures is the time you have left to
          stop this.
        </p>
      </EntrySection>

      <EntrySection
        title="What it does not know"
        note="That there is an updater at all. No IPC, no timer, no arithmetic on seconds — the countdown arrives already counted and already worded, because “Restarting in 4s” needs a translator and the tick needs to survive this component re-rendering for other reasons."
      >
        <PropsTable rows={PROPS} />
        <Snippet>{`import { UpdateDialog } from '@ds/desktop'

<UpdateDialog
  stage={{ type: 'ready', version: '0.95.0', remaining, total: 5 }}
  version="v0.95.0"
  countdownLabel={t('update.restartingIn', { seconds: remaining })}
  postponeLabel={t('app.later')}
  onPostpone={postpone}
  …
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}

/**
 * The four stages, walked end to end on a loop.
 *
 * A drawing of a sequence has to BE the sequence — a row of four static dialogs would
 * say what each stage looks like and nothing about the thing this component is for,
 * which is the transition between them. `Later` stops it at the countdown, the same as
 * in the app, and the play button starts it over.
 */
function Playback() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [stage, setStage] = useState<UpdateStage | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function play() {
    stop()
    setStage({ type: 'available', version: '0.95.0' })
    timerRef.current = setTimeout(() => download(0), 900)
  }

  function download(percent: number) {
    setStage({ type: 'downloading', percent })
    if (percent >= 100) {
      // Held at full for a beat, the way a real transfer sits there while the signature
      // is verified before the download is called finished.
      timerRef.current = setTimeout(() => countdown(COUNTDOWN), 700)
      return
    }
    timerRef.current = setTimeout(() => download(Math.min(100, percent + 7)), 180)
  }

  function countdown(remaining: number) {
    setStage({ type: 'ready', version: '0.95.0', remaining, total: COUNTDOWN })
    if (remaining <= 0) {
      // Nothing to relaunch into on a web page, so the dialog simply leaves — which is
      // what the real install looks like from here: the window goes away.
      timerRef.current = setTimeout(() => setStage(null), 600)
      return
    }
    timerRef.current = setTimeout(() => countdown(remaining - 1), 1000)
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div ref={setPortal} />
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
          onClick={() => {
            stop()
            setStage({ type: 'failed' })
          }}
          className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
        >
          Failed transfer
        </button>
      </div>
      {stage && (
        <UpdateDialog
          {...LABELS}
          stage={stage}
          portalTo={portal}
          version={'version' in stage ? `v${stage.version}` : undefined}
          countdownLabel={`Restarting in ${stage.type === 'ready' ? stage.remaining : COUNTDOWN}s…`}
          onPostpone={() => {
            stop()
            setStage(null)
          }}
          onRetry={play}
        />
      )}
    </div>
  )
}
