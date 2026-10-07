import { AbsoluteFill, Audio, Composition, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion'
import './style.css'
import { fontsReady } from './fonts'
import { Film } from './Film'
import { CLIPS, CLIP_END } from './film/clips'
import { Logo } from './film/Outro'
import { DURATION, RENDER_FPS, STEPS_PER_FRAME } from './film/timeline'

const handle = delayRender('Loading Cera Pro')
fontsReady.then(() => continueRender(handle))

const SIZE = { fps: RENDER_FPS, width: 1920, height: 1080 }

/** A stretch of the film, then the logo, with the score faded out under it. */
function Clip({ from, to }: { from: number; to: number }) {
  const frame = useCurrentFrame()
  const length = (to - from) * STEPS_PER_FRAME
  const end = length + CLIP_END * STEPS_PER_FRAME
  const volume = 0.6 * interpolate(frame, [0, 20, end - 50, end], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: '#FFFFFF' }}>
      <Sequence from={-from * STEPS_PER_FRAME} durationInFrames={to * STEPS_PER_FRAME}>
        <Film music={false} />
      </Sequence>
      <Sequence from={length}>
        <ClipLogo />
      </Sequence>
      <Audio src={staticFile('audio/music.wav')} startFrom={from * STEPS_PER_FRAME} volume={volume} />
    </AbsoluteFill>
  )
}

function ClipLogo() {
  return <Logo local={useCurrentFrame() / STEPS_PER_FRAME} />
}

export function Root() {
  return (
    <>
      <Composition id="MagicSlashFilm" component={Film} durationInFrames={DURATION * STEPS_PER_FRAME} {...SIZE} />
      {CLIPS.map((clip) => (
        <Composition
          key={clip.id}
          id={clip.id}
          component={Clip}
          defaultProps={{ from: clip.from, to: clip.to }}
          durationInFrames={(clip.to - clip.from + CLIP_END) * STEPS_PER_FRAME}
          {...SIZE}
        />
      ))}
    </>
  )
}
