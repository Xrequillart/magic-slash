import { useMemo } from 'react'
import { create } from 'qrcode'
import { qrPath } from './qrModules'

/**
 * A QR CODE FOR A PHONE TO SCAN: the iPhone companion's pairing token, on Remote access.
 *
 * DARK MODULES ON WHITE, WHATEVER THE THEME, and it is the one drawing in this folder that
 * names colours rather than roles. That is deliberate, not an oversight of the "no hex"
 * rule: a QR code is not a surface the theme paints, it is a target a camera reads, and
 * scanners are built for dark-on-light. An inverted symbol on a dark theme scans on some
 * phones and not on others, which is the worst way for pairing to fail. `white` and
 * `black` are spelled as SVG keywords, so no theme variable can ever reach them.
 *
 * THE WHITE IS THE QUIET ZONE TOO (see `qrModules`): the plate is the symbol plus four
 * modules all round, so the card it sits on can be any colour at all.
 *
 * ENCODED HERE, from the string: a caller hands over the text and nothing else, and the
 * encoder (`qrcode`, a dependency of this folder) never leaks into an app. Error
 * correction `M`, the common default: the token is short, the screen is clean, and the
 * extra redundancy of `Q` or `H` would only make the modules smaller.
 *
 * Re-encoded only when the text changes. The pairing token rotates every 60 seconds, and
 * the countdown beside it ticks every second; the second must not cost an encode.
 */

export interface QrCodeProps {
  /** The text the symbol carries. */
  value: string
  /** What the symbol is, for a screen reader: "Pairing code for your iPhone". Translated. */
  label: string
  /** The side in pixels, quiet zone included. 192 by default, comfortable at arm's length. */
  size?: number
  /** Margins. Not the size, the colours or the radius. */
  className?: string
}

export function QrCode({ value, label, size = 192, className = '' }: QrCodeProps) {
  const drawing = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' })
    return qrPath(modules.size, (row, col) => modules.get(row, col) === 1)
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${drawing.extent} ${drawing.extent}`}
      // Every module edge on a pixel boundary: an antialiased seam between two dark
      // modules is a light line a scanner can read as a gap.
      shapeRendering="crispEdges"
      className={`block flex-shrink-0 rounded-xl ${className}`.trim()}
    >
      <rect width={drawing.extent} height={drawing.extent} fill="white" />
      <path d={drawing.path} fill="black" />
    </svg>
  )
}
