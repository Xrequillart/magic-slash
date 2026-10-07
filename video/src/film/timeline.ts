import { Easing, interpolate } from 'remotion'
import data from './chapters.json'

/**
 * THE FILM'S CLOCK. The story is timed in 30ths of a second ("story frames"); every
 * number under src/film/ is one. Chapters and their lengths live in chapters.json, which
 * scripts/make-audio.mjs reads too, so the score lands on the same beats as the picture.
 */
export const FPS = data.fps

/** It is rendered at 60, so the camera moves on every half-step of the story's clock. */
export const RENDER_FPS = 60
export const STEPS_PER_FRAME = RENDER_FPS / FPS

export type ChapterId = 'hook' | 'plan' | 'tickets' | 'start' | 'commit' | 'workflow' | 'ship' | 'resolve' | 'close' | 'outro'

export interface Chapter {
  id: ChapterId
  from: number
  to: number
  number?: string
  title?: string
  label?: string
  command?: string
  line?: string
}

export const CHAPTERS: Chapter[] = (() => {
  let from = 0
  return data.chapters.map((c) => {
    const chapter = { ...c, id: c.id as ChapterId, from, to: from + c.length }
    from += c.length
    return chapter
  })
})()

export const DURATION = CHAPTERS[CHAPTERS.length - 1].to

const BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<ChapterId, Chapter>

/** The story frame `local` frames into a chapter: `at('ship', 40)`. */
export const at = (id: ChapterId, local = 0) => BY_ID[id].from + local
export const chapter = (id: ChapterId) => BY_ID[id]

/** The chapters the step row lists: everything between the hook and the outro. */
export const STEPS = CHAPTERS.filter((c) => c.number)

export function chapterAt(frame: number) {
  return CHAPTERS.find((c) => frame >= c.from && frame < c.to) ?? CHAPTERS[CHAPTERS.length - 1]
}

/** How long a chapter's title card holds the screen, from its first frame. */
export const TITLE_CARD = 54

const EASE = Easing.bezier(0.45, 0, 0.2, 1)

/** 0 → 1 between two frames, eased and clamped. */
export function progress(frame: number, from: number, to: number, easing = EASE) {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  })
}

/** The first `n` characters of `text` after `from`, at `cps` characters per second. */
export function typed(text: string, frame: number, from: number, cps = 40) {
  if (frame < from) return ''
  const count = Math.floor(((frame - from) / FPS) * cps)
  return text.slice(0, count)
}

/** Like `typed`, but whole words at a time: Markdown never shows half a `code span`. */
export function streamed(text: string, frame: number, from: number, cps = 70) {
  const cut = typed(text, frame, from, cps).length
  if (cut >= text.length) return text
  const end = text.lastIndexOf(' ', cut)
  return end <= 0 ? '' : text.slice(0, end)
}
