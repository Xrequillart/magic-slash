import { useCallback, useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Check } from 'lucide-react'
import { Modal } from './Modal'
import { useT } from '../i18n'
import { BTN, BTN_ICON, BTN_PRIMARY } from '../theme/controls'
import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  clampOffset,
  clampCropZoom,
  sourceRectFor,
  type CropState,
  type SourceRect,
} from '../../avatarCrop'

/**
 * The half of `CropState` the user moves; the other half is the image itself.
 *
 * Exported because it is what `onConfirm` hands over. No rectangle crosses that
 * boundary: the export site calls `sourceRectFor` itself, against the image it
 * decoded, so containment is that function's property and not a promise made here.
 */
export type AvatarCropView = Omit<CropState, 'naturalWidth' | 'naturalHeight'>

/**
 * `sourceRectFor` against an image element, which is the only shape this file has.
 *
 * One helper rather than the same five-field literal at each call site — and that
 * is not only brevity. The preview and the drag's scale factor have to be the SAME
 * call for "what you framed is what was saved" to hold; with the literal spelled
 * out twice, checking that meant diffing two objects by eye. The export makes the
 * third such call, on its own decode of the same bytes — see `toAvatarDataUrl`.
 */
function rectFor(image: HTMLImageElement, view: AvatarCropView): SourceRect {
  return sourceRectFor({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    ...view,
  })
}

/** One press of `+` or `−`. Geometric, so the two are exact inverses of each other. */
const ZOOM_STEP = 1.25

/**
 * The id tying the canvas to its instructions. A constant rather than `useId`
 * because only one crop dialog is ever mounted: `CloudAccountSection` renders
 * exactly one, and it frames one photo at a time.
 */
const HINT_ID = 'avatar-crop-hint'

/**
 * How much of a zoom one notch of a wheel is worth, and how much one notch of a
 * trackpad pinch is.
 *
 * Two numbers because they are two devices. A mouse wheel reports whole notches
 * of ~100 in `deltaY`; a pinch on a trackpad arrives as a stream of deltas an
 * order of magnitude smaller with `ctrlKey` set (the browsers' convention for it),
 * and at the wheel's rate a two-finger spread across the whole trackpad would
 * barely leave zoom 1. Five times the rate puts a comfortable gesture and a few
 * notches of a wheel on the same span of zoom. The zoom is exponential in the
 * delta rather than linear so that the step feels the same size at 1x and at 8x.
 */
const WHEEL_RATE = 0.002
const PINCH_RATE = 0.01

interface Props {
  isOpen: boolean
  /** The picked file as a data URL, straight from `profile.pickAvatarSource()`. */
  sourceDataUrl: string | null
  /** Dismissed: nothing has been written, and nothing should be. */
  onCancel: () => void
  /** The framing the user confirmed: a zoom and a pan, in `avatarCrop.ts`'s units. */
  onConfirm: (view: AvatarCropView) => void
  /** The bytes arrived but no decoder here would take them. */
  onUnreadable: () => void
}

/**
 * Place the photo inside the round mask, then confirm it.
 *
 * WHY THE PREVIEW AND THE EXPORT SHARE ONE FUNCTION
 * ---------------------------------------------------------------------------
 * The canvas below draws `sourceRectFor(...)` scaled into the mask, and what it
 * hands `onConfirm` is the very state it was drawing at, so the export makes that
 * same call on its own decode of the same bytes. There is no second
 * transform anywhere in this file — no "screen space" scale factor kept beside
 * the source rectangle and no CSS `transform` on an `<img>`. That is the whole
 * defence of "what you confirmed is what was saved": with two independent
 * transforms, a non-square photo is the case where they disagree, and they
 * disagree by a margin nobody notices until a face is missing its chin.
 *
 * The one place a display dimension appears is `onPointerMove`, converting a
 * pointer delta in CSS pixels into source pixels. `avatarCrop.ts` is deliberately
 * ignorant of how big this dialog is — see its header.
 *
 * WHY `new Image()` AND NOT `createImageBitmap`
 * ---------------------------------------------------------------------------
 * `HTMLImageElement` applies a JPEG's EXIF orientation; `createImageBitmap`
 * ignores it unless asked (`imageOrientation: 'from-image'`). A photo taken on a
 * phone in portrait is stored landscape with a rotation flag, so the faster path
 * would show, and save, a picture lying on its side. The export in
 * `CloudAccountSection` decodes the same way for the same reason, which also
 * means the rectangle chosen here lands on the same pixels there.
 *
 * The zoom is capped and the pan is clamped in `avatarCrop.ts`, not here: every
 * interaction below goes through `applyView`, so there is exactly one place that
 * can decide the crop square is still on the picture — which is what makes a gap
 * inside the mask impossible rather than merely unlikely.
 */
export function AvatarCropModal({ isOpen, sourceDataUrl, onCancel, onConfirm, onUnreadable }: Props) {
  const t = useT()

  const [decoded, setDecoded] = useState<{ src: string; el: HTMLImageElement } | null>(null)
  const [view, setView] = useState<AvatarCropView>({ zoom: MIN_CROP_ZOOM, offsetX: 0, offsetY: 0 })
  /** The mask's on-screen edge, in CSS pixels. 0 until the canvas has been laid out. */
  const [maskSize, setMaskSize] = useState(0)

  // The framing is reset the moment a DIFFERENT source arrives, and not when that
  // source finishes decoding. Re-picking the SAME file makes the comparison below
  // true on the very first render — nothing has to decode — so a reset that waited
  // for `onload` would let the canvas paint the previous session's zoom and pan
  // before snapping back to centred. Adjusting the state during the render is what
  // keeps that off the screen: React re-runs this component with the new value
  // before it paints anything.
  //
  // Centred and fully zoomed out is exactly the automatic crop this dialog
  // replaced, so the confirm button alone reproduces the old behaviour.
  const [framedSource, setFramedSource] = useState(sourceDataUrl)
  if (framedSource !== sourceDataUrl) {
    setFramedSource(sourceDataUrl)
    setView({ zoom: MIN_CROP_ZOOM, offsetX: 0, offsetY: 0 })
  }

  /**
   * The photo being framed — or null while this pick is still decoding.
   *
   * Derived by comparing the decoded source against the one on the props rather
   * than read straight out of the state: the decode lands in an effect, so between
   * a new pick and its `onload` the state still holds the PREVIOUS photo, and
   * without the comparison that photo would show for a frame underneath the new
   * one — at the previous session's framing, since the reset above has run.
   */
  const image = decoded && decoded.src === sourceDataUrl ? decoded.el : null

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // `zoom` is the zoom the anchor below was taken at, not a second copy of the
  // state: `handlePointerMove` compares it against the live one to know that the
  // anchor it is measuring from belongs to another scale.
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startOffsetX: number; startOffsetY: number; zoom: number } | null>(null)

  // Held in a ref rather than listed as a dependency of the decode effect below.
  // The parent's callback is memoized on `t`, which changes identity when the user
  // switches language — and a dependency on it would re-decode the image, resetting
  // the zoom and the pan just dialled in, because someone changed the app's
  // language with this dialog open.
  const onUnreadableRef = useRef(onUnreadable)
  useEffect(() => { onUnreadableRef.current = onUnreadable }, [onUnreadable])

  // Decode the picked bytes.
  useEffect(() => {
    if (!isOpen || !sourceDataUrl) {
      // Nothing to frame any more, so the decoded element — and the base64 string
      // it was built from, up to ~6.7 MB of it — is let go rather than kept
      // reachable for the life of the settings page. It costs nothing on screen:
      // `image` above is already null the moment `sourceDataUrl` is, so the redraw
      // effect returns before its `clearRect` and the canvas keeps the pixels it
      // has for the length of `Modal`'s exit animation, dropped or not.
      setDecoded(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      setDecoded({ src: sourceDataUrl, el: img })
    }
    img.onerror = () => {
      // A file with the right extension whose bytes are not an image. Opening an
      // empty mask over it would leave the user dragging nothing with no
      // explanation, so the parent is told and closes the dialog.
      if (!cancelled) onUnreadableRef.current()
    }
    img.src = sourceDataUrl
    return () => { cancelled = true }
  }, [isOpen, sourceDataUrl])

  // The mask's CSS size, measured rather than assumed: it is `w-full` inside a
  // dialog whose width follows the window. Measured in an effect for the reason
  // UpdateOverlay's canvas is — before React has committed, `offsetWidth` is 0 —
  // and re-measured on resize, because every pointer delta is divided by it.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!isOpen || !canvas) return
    const measure = () => setMaskSize(canvas.offsetWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [isOpen])

  /**
   * The one way this component changes the crop.
   *
   * Every gesture — drag, wheel, pinch, the two buttons — produces a WANTED view
   * and hands it here, and this is where it is made legal. A handler that clamped
   * on its own would be a second opinion about where the edge of the picture is.
   */
  const applyView = useCallback(
    (next: (current: AvatarCropView) => AvatarCropView) => {
      setView((current) => {
        if (!image) return current
        const wanted = next(current)
        const zoom = clampCropZoom(wanted.zoom)
        const { offsetX, offsetY } = clampOffset({
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          ...wanted,
          zoom,
        })
        // Returning `current` unchanged when the clamp absorbed everything, which
        // is not a rare case: at zoom 1 one axis has exactly zero room, so every
        // vertical drag on a landscape photo produces this. Handing back a fresh
        // object would re-render and redraw a pixel-identical frame per event.
        if (zoom === current.zoom && offsetX === current.offsetX && offsetY === current.offsetY) {
          return current
        }
        return { zoom, offsetX, offsetY }
      })
    },
    [image],
  )

  // Zoom about the centre of the mask: whatever is under the middle of the hole
  // stays there, which is where the user is looking. Zooming about the cursor
  // would be nicer with a mouse and worse with the two buttons, which have no
  // cursor to zoom about.
  const zoomBy = useCallback((factor: number) => {
    applyView((current) => ({ ...current, zoom: current.zoom * factor }))
  }, [applyView])

  // Redraw whenever anything the picture depends on moves.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || maskSize <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // The backing store is in device pixels and the drawing is in CSS pixels: a
    // photo drawn 1:1 into a CSS-sized canvas is visibly soft on a retina panel.
    // `setTransform` absorbs the ratio once so nothing below has to think about it.
    const ratio = window.devicePixelRatio || 1
    // Assigned only when it actually changes. Writing `canvas.width` at all — even
    // the value it already holds — reallocates and zeroes the backing store, and
    // this effect runs on every pointer-move: at DPR 2 that is a megabyte thrown
    // away per frame of a drag, for a size that is constant for the whole gesture.
    const side = Math.round(maskSize * ratio)
    if (canvas.width !== side) {
      canvas.width = side
      canvas.height = side
    }

    // Cleared in DEVICE space, before the ratio goes on: at a fractional DPR
    // `side` is rounded, so `maskSize` CSS pixels do not cover the last column of
    // the store, and a stale sliver would survive there. It has to happen every
    // frame now that the resize above usually does not.
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

    const rect = rectFor(image, view)
    if (rect.sSize > 0) {
      ctx.drawImage(image, rect.sx, rect.sy, rect.sSize, rect.sSize, 0, 0, maskSize, maskSize)
    }

    // The round mask, as a hole: one path made of the square and the circle,
    // filled `evenodd` so the circle is the part that stays clear. A plain fill
    // rather than a blur — `backdrop-blur` is a disabled core plugin here, and a
    // class that silently does nothing is worse than no class.
    const centre = maskSize / 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.beginPath()
    ctx.rect(0, 0, maskSize, maskSize)
    // `moveTo` first, and it is not decoration: `rect` leaves the current point at
    // the origin, so `arc` would otherwise draw a straight line from there to the
    // circle's start. Even-odd counts every edge a ray crosses, and that stray
    // diagonal flips the parity of part of what should stay dimmed. Landing exactly
    // on the arc's own start point (angle 0) starts the subpath with nothing extra.
    ctx.moveTo(maskSize, centre)
    ctx.arc(centre, centre, centre, 0, Math.PI * 2)
    ctx.fill('evenodd')

    // A hairline on the circle itself, so the mask reads as an edge rather than
    // as a vignette. Half a pixel in, or the stroke straddles the canvas border
    // and only half of it is drawn.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(centre, centre, centre - 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }, [image, view, maskSize])

  // The wheel listener is attached BY HAND, with `{ passive: false }`. React 18
  // registers `wheel` at the root as a passive listener, so a JSX `onWheel` runs
  // but its `preventDefault()` is ignored — the settings page scrolls under the
  // dialog, and a ctrl+wheel reaches Electron as a pinch-zoom of the whole window.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!isOpen || !canvas || !image) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // A trackpad pinch is a wheel event with `ctrlKey` set, by convention on
      // every platform — and it arrives in much smaller increments.
      zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? PINCH_RATE : WHEEL_RATE)))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [isOpen, image, zoomBy])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image || e.button !== 0) return
    // Capture, so the drag survives the pointer leaving the mask — a pan that
    // stopped at the edge of a 240 px square would be unusable at high zoom. It
    // also guarantees the matching up event lands here rather than on whatever the
    // pointer happened to be over.
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: view.offsetX,
      startOffsetY: view.offsetY,
      zoom: view.zoom,
    }
  }, [image, view.offsetX, view.offsetY, view.zoom])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId || !image || maskSize <= 0) return
    // Read off the event here rather than inside the updater: that runs during a
    // later render, and twice in development. Re-anchoring inside it survives the
    // repeat — the second run finds the anchor the first one took and measures a
    // zero delta from it — but only as long as nothing in there reaches back into
    // an event that has since moved on.
    const pointerX = e.clientX
    const pointerY = e.clientY
    applyView((current) => {
      // The anchor is re-taken whenever the zoom has moved under the drag — a wheel
      // turned, or `+` pressed with a finger still down. The deltas are measured
      // from where the drag began and converted at the CURRENT scale, so an anchor
      // from another zoom would have its whole accumulated distance re-converted:
      // across a 300 px mask, a 100 px drag at zoom 2 is 100 source pixels and the
      // same drag at zoom 4 is 50, so the photo would slide 50 pixels under a
      // pointer that had not moved. Re-anchoring here forfeits nothing — the delta
      // it discards is this event's, and the pointer is where it already was.
      if (current.zoom !== drag.zoom) {
        drag.zoom = current.zoom
        drag.startX = pointerX
        drag.startY = pointerY
        drag.startOffsetX = current.offsetX
        drag.startOffsetY = current.offsetY
      }
      // THE one conversion between the screen and the source image: the mask shows
      // `sSize` source pixels across `maskSize` CSS pixels, so this is the scale.
      // Taken from the live zoom rather than captured at pointer-down, which is
      // only sound because of the re-anchor above: the anchor and this scale are
      // always the same zoom's.
      const { sSize } = rectFor(image, current)
      const perCssPixel = sSize / maskSize
      // Minus: dragging the photo right shows what was to its left, so the crop
      // square travels the other way. The offsets are measured from where the drag
      // began rather than accumulated, so a clamped edge does not eat the pan — the
      // picture starts moving again the moment the pointer comes back.
      return {
        zoom: current.zoom,
        offsetX: drag.startOffsetX - (pointerX - drag.startX) * perCssPixel,
        offsetY: drag.startOffsetY - (pointerY - drag.startY) * perCssPixel,
      }
    })
  }, [applyView, image, maskSize])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  const handleConfirm = useCallback(() => {
    if (!image) return
    onConfirm(view)
  }, [image, onConfirm, view])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t('cloud.avatar.crop.title')}
      footer={
        <>
          <button onClick={onCancel} className={BTN}>
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!image}
            className={`${BTN_PRIMARY} disabled:opacity-40`}
          >
            <Check className="w-3.5 h-3.5" />
            {t('cloud.avatar.crop.confirm')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('cloud.avatar.crop.canvas')}
          // The visible hint IS the accessible description, rather than the label
          // repeating it: one sentence per language, in one key.
          aria-describedby={HINT_ID}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          // `touch-none` so a drag on a touchpad-driven surface pans the photo
          // instead of scrolling the dialog out from under it.
          className="w-full aspect-square block rounded-xl bg-bg-tertiary border border-line touch-none cursor-grab active:cursor-grabbing"
        />
        <div className="flex items-center justify-between gap-3">
          <p id={HINT_ID} className="text-xs text-text-secondary/60">{t('cloud.avatar.crop.hint')}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              disabled={!image || view.zoom <= MIN_CROP_ZOOM}
              title={t('cloud.avatar.crop.zoomOut')}
              aria-label={t('cloud.avatar.crop.zoomOut')}
              className={`${BTN_ICON} disabled:opacity-40`}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => zoomBy(ZOOM_STEP)}
              disabled={!image || view.zoom >= MAX_CROP_ZOOM}
              title={t('cloud.avatar.crop.zoomIn')}
              aria-label={t('cloud.avatar.crop.zoomIn')}
              className={`${BTN_ICON} disabled:opacity-40`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
