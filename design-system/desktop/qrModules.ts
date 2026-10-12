/**
 * A QR symbol as ONE SVG PATH, from its module grid. `QrCode`'s drawing, kept apart so the
 * suite can check it: the tests run on the root `node_modules`, which has no `qrcode`, so
 * the encoder stays in the component and only this arithmetic is here.
 *
 * ONE PATH AND NOT A RECT PER MODULE. A version-6 symbol is 41 × 41, close to a thousand
 * dark modules, and a thousand elements re-rendered every time the token rotates is a
 * cost with nothing to show for it. Runs of dark modules on a row are one `h` stroke each.
 *
 * THE QUIET ZONE IS FOUR MODULES, which is what the standard asks for and what a phone's
 * scanner actually needs: without it the finder patterns run into whatever is around the
 * symbol, and on a dark theme that is a dark card the camera cannot tell from a module.
 */

export const QR_QUIET_ZONE = 4

export interface QrDrawing {
  /** The `d` of the dark modules, in module units, already offset by the quiet zone. */
  path: string
  /** The symbol's side plus the quiet zone on both sides: the `viewBox`'s width and height. */
  extent: number
}

export function qrPath(size: number, isDark: (row: number, col: number) => boolean): QrDrawing {
  const parts: string[] = []
  for (let row = 0; row < size; row++) {
    let col = 0
    while (col < size) {
      if (!isDark(row, col)) {
        col++
        continue
      }
      const start = col
      while (col < size && isDark(row, col)) col++
      parts.push(`M${start + QR_QUIET_ZONE} ${row + QR_QUIET_ZONE}h${col - start}v1h-${col - start}z`)
    }
  }
  return { path: parts.join(''), extent: size + QR_QUIET_ZONE * 2 }
}
