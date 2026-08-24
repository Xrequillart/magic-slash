import { segmentIndexAt, type RulerGeometry, type RulerSegment } from '../../utils/diffMarkers'
import { useT } from '../../i18n'

/**
 * How wide the band is, and the padding that reserves room for it — declared as a pair
 * so they cannot be changed apart.
 *
 * The `<pre>` inside CodeView scrolls horizontally on its own, so without the gutter a
 * long line dragged to the right runs underneath the band. Nothing in the type system
 * links a width to a padding, so the only thing that can keep them equal is sitting on
 * the same two lines.
 */
const RULER_WIDTH = 'w-2.5'
export const RULER_GUTTER = 'pr-2.5'

interface Props {
  /** Already projected into track space by `rulerSegments` — nothing is measured here. */
  segments: RulerSegment[]
  /** The translucent window marker, on the same track scale as the segments. */
  viewport: RulerGeometry
  /** A click that landed on a segment: the same step the navigator's arrows take. */
  onSelectBlock: (index: number) => void
  /**
   * A click that landed on bare track. Named for what it does and NOT "scrub": the
   * ruler answers single clicks, dragging it is deliberately not a feature, and a name
   * suggesting otherwise is how it would grow one.
   */
  onJumpTo: (offsetPx: number, trackHeight: number) => void
}

/** Yellow for `mixed`, matching the `modified` badge in the panel header — the ruler and
 *  the badge describe the same thing and should not use two colours for it. */
const SEGMENT_CLASS: Record<RulerSegment['kind'], string> = {
  add: 'bg-green',
  remove: 'bg-red',
  mixed: 'bg-yellow',
}

/**
 * The thin band down the right edge of the preview: one mark per change, a translucent
 * indicator for the part of the file on screen, and a click anywhere to get there.
 *
 * Dumb on purpose — it draws the geometry it is handed and reports where it was
 * clicked. Every number comes from `diffMarkers`, which is the only way any of this is
 * covered at all: the renderer suite runs on node with no jsdom, so a component holding
 * its own arithmetic would be untestable. Whether there is a ruler at all is the
 * caller's decision too, since the same answer sizes the gutter above.
 */
export default function ChangeRuler({ segments, viewport, onSelectBlock, onJumpTo }: Props) {
  const t = useT()

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Measured against the BAND, not `e.offsetY`, which is relative to whatever element
    // the event fired on — a segment div for the very clicks that matter, so every hit
    // test would come back a few pixels from that segment's own top and resolve as
    // background. The same rect is where the track height comes from.
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetPx = e.clientY - rect.top
    const index = segmentIndexAt(segments, offsetPx)
    if (index !== null) onSelectBlock(index)
    else onJumpTo(offsetPx, rect.height)
  }

  return (
    <div
      onClick={handleClick}
      // `presentation` and a title rather than an `aria-label`: this is a POINTER
      // shortcut to changes that are already reachable without it — the navigator card
      // is a pair of real buttons and Alt+↑/↓ walks the same list — and a band with no
      // focusable part inside it cannot be operated from the keyboard whatever it is
      // labelled. Announcing it would add a landmark that leads nowhere; the tooltip
      // says what it is to the reader who can see and click it.
      role="presentation"
      title={t('filePreview.changeRuler')}
      // `overflow-hidden` because a mark's drawn height is not purely proportional:
      // `rulerSegments` floors it, and `mergeRulerSegments` may then widen one that was
      // already pinned to the bottom of the track. Clipping keeps the band's own edge
      // straight instead of letting a mark hang a pixel or two past it.
      className={`absolute right-0 top-0 bottom-0 ${RULER_WIDTH} z-10 overflow-hidden bg-surface-sunken border-l border-line-subtle cursor-pointer`}
    >
      {segments.map(segment => (
        <div
          key={segment.index}
          // `pointer-events-none` on every child, so `e.currentTarget` in the handler is
          // always the band and the rect above is always the track.
          className={`absolute left-0.5 right-0.5 rounded-sm pointer-events-none ${SEGMENT_CLASS[segment.kind]}`}
          style={{ top: segment.top, height: segment.height }}
        />
      ))}
      {/* Drawn over the segments rather than under them: it is translucent, so the marks
          stay readable through it, and painting it underneath would leave the window
          indistinguishable exactly where a change sits. */}
      <div
        className="absolute left-0 right-0 bg-ink/15 pointer-events-none"
        style={{ top: viewport.top, height: viewport.height }}
      />
    </div>
  )
}
