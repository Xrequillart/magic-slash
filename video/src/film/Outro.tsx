import { Img, interpolate, spring } from 'remotion'
import logo from '../../../webapp/public/img/logo-black.svg'
import { FPS, at } from './timeline'

/** The logo, on the white ground the window has just left. */
export function Outro({ frame }: { frame: number }) {
  return <Logo local={frame - at('outro', 50)} />
}

/** The logo landing, `local` story frames after it starts. */
export function Logo({ local }: { local: number }) {
  if (local < 0) return null

  const logoIn = spring({ frame: local, fps: FPS, config: { damping: 16, stiffness: 90 } })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Cera Pro',
        perspective: 1600,
      }}
    >
      <Img
        src={logo}
        style={{
          width: 760,
          opacity: logoIn,
          transform: `translateY(${(1 - logoIn) * 40}px) rotateX(${(1 - logoIn) * 50}deg) scale(${interpolate(logoIn, [0, 1], [0.9, 1])})`,
        }}
      />
    </div>
  )
}
