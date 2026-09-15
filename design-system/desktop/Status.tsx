import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Check, ChevronDown } from './icons'
import { Icon, type IconSize } from './Icon'
import { Text, type TextSize } from './Text'
import type { ComponentSize } from './componentSizes'

/**
 * A state, on a tinted plate — and the picker that changes it.
 *
 * `Label` already drew the line this component stands on the other side of: a label
 * NAMES a thing and the thing does not change while you look at it, where a status
 * REPORTS a state that changes on its own. That is why the two are not one component
 * with a flag, and the note in `Label` has said so since before this file existed.
 *
 * IT IS CLICKABLE OR IT IS NOT, and `options` is what decides. Given them, the plate
 * is a button that opens the picker; without them it is a `<span>` with no hover, no
 * pointer, nothing in the tab order and no chevron — because a plan's status is
 * DERIVED from whether its tickets exist, and a plate that lit up under the cursor
 * and did nothing was the thing every chip in this app got wrong in one direction or
 * the other. Same rule as `Label`'s `onClick`, same reason.
 *
 * THE CATALOGUE IS THE CALLER'S. The twelve workflow statuses are Magic Slash's
 * vocabulary, not a design language, and a plan's two — green once the tickets exist,
 * yellow while the spec is being written — are not agent statuses at all. Hardcoding
 * the agent's list here would lock the plans list out of the component whose shape it
 * is already copying by hand. The same split `ProgressBar` makes with its thresholds:
 * this folder owns how a state LOOKS, the app owns which states there are.
 *
 * Words arrive translated, for the same reason `Label` takes a `string`: there is no
 * `useT` on this side of the alias.
 */

/**
 * The plate's hue, named for the role and not for what the role means.
 *
 * `ProgressBar` gets to be semantic — `success`, `warning`, `danger` — because it
 * measures one thing and a percentage has a direction. A workflow does not: there is
 * nothing `success` about `committed`, and twelve states need twelve hues long before
 * they need twelve meanings. So these are the palette's own roles, and the app says
 * which state wears which.
 *
 * `neutral` is not a hue and is the one with a job: it is what an EMPTY status wears,
 * and what a status this build does not recognise wears. Which is why no known state
 * may be given it — a status that renders grey is saying "I do not know this one",
 * and a known state saying that is a lie the reader cannot see through.
 */
export type StatusTone =
  | 'neutral'
  | 'accent'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'cyan'
  | 'teal'

export const STATUS_TONES: readonly StatusTone[] = [
  'neutral',
  'accent',
  'green',
  'yellow',
  'orange',
  'red',
  'blue',
  'purple',
  'cyan',
  'teal',
]

/**
 * How much of the hue the plate takes — 20% or 10%.
 *
 * A SECOND ALPHA IS NOT DECORATION HERE. The app has ten palette roles and twelve
 * workflow states, so two pairs have to share a hue: `planning` against `ready for
 * PR` in orange, `planned` against `committed` in cyan. The fill alpha is the only
 * thing holding each pair apart. They wore a ring for a while instead, and a ring is
 * not part of this design language — no other plate in the app has one.
 *
 * `strong` is the default and is what eleven of the twelve use. Reach for `soft` when
 * you have run out of hues, not for emphasis: two alphas of one colour read as a pair
 * of related states, which is true of planning/planned and would be a lie anywhere
 * else.
 *
 * Ignored by `neutral`, which has one drawing and no hue to take a fraction of.
 */
export type StatusStrength = 'soft' | 'strong'

/**
 * Spelled out in full, both alphas, every role — Tailwind reads source as text and
 * `bg-${tone}/20` generates nothing. See the README's rule 2.
 */
const TONES: Record<StatusTone, Record<StatusStrength, string>> = {
  neutral: {
    soft: 'bg-surface-strong text-text-secondary',
    strong: 'bg-surface-strong text-text-secondary',
  },
  accent: { soft: 'bg-accent/10 text-accent', strong: 'bg-accent/20 text-accent' },
  green: { soft: 'bg-green/10 text-green', strong: 'bg-green/20 text-green' },
  yellow: { soft: 'bg-yellow/10 text-yellow', strong: 'bg-yellow/20 text-yellow' },
  orange: { soft: 'bg-orange/10 text-orange', strong: 'bg-orange/20 text-orange' },
  red: { soft: 'bg-red/10 text-red', strong: 'bg-red/20 text-red' },
  blue: { soft: 'bg-blue/10 text-blue', strong: 'bg-blue/20 text-blue' },
  purple: { soft: 'bg-purple/10 text-purple', strong: 'bg-purple/20 text-purple' },
  cyan: { soft: 'bg-cyan/10 text-cyan', strong: 'bg-cyan/20 text-cyan' },
  teal: { soft: 'bg-teal/10 text-teal', strong: 'bg-teal/20 text-teal' },
}

/** The dot in front of a row in the picker. Its hue only — the plate is the trigger's. */
const DOTS: Record<StatusTone, string> = {
  neutral: 'text-text-secondary',
  accent: 'text-accent',
  green: 'text-green',
  yellow: 'text-yellow',
  orange: 'text-orange',
  red: 'text-red',
  blue: 'text-blue',
  purple: 'text-purple',
  cyan: 'text-cyan',
  teal: 'text-teal',
}

/**
 * Three, and they are `Label`'s — the same 24 / 28 / 32.
 *
 * A status and a label sit in the same rows, and two badges of different heights on
 * one line is the thing a shared scale exists to stop. The plate is a pill rather than
 * a rounded rectangle and takes a little more horizontal padding for it, but the
 * heights are pinned to the same three.
 *
 * THE MENU FOLLOWS THE PLATE — its rows take the same type and grow their padding to
 * hold it. A picker whose words were a size apart from the word that opened it read as
 * a different control each time it appeared.
 *
 * SEVEN RUNGS on the shared control ladder — `ComponentSize`, 16 through 40 — and the
 * menu follows the plate at every one of them. The two below a row keep the chevron
 * at the type's own size rather than above it: at 16px a caret larger than the word
 * beside it reads as the subject.
 *
 * `sm` IS UNCHANGED and is the default — 24px, `px-2.5`, `text-xs`, which is what the
 * agent sidebar and the plans list have always drawn. It is `h-6` now where it was
 * `py-1` before, and those are the same 24px here: `text-xs` carries a 16px
 * line-height from Tailwind, not from the theme, and the browser agrees. Pinning it
 * is what lets the other two rungs be heights rather than a second padding table.
 */
export type StatusSize = ComponentSize

const SIZES: Record<StatusSize, { box: string; text: TextSize; chevron: IconSize; row: string }> = {
  '2xs': { box: 'h-4 gap-1 px-1.5', text: '2xs', chevron: '2xs', row: 'px-2 py-1' },
  xs: { box: 'h-5 gap-1 px-2', text: 'xs', chevron: 'xs', row: 'px-2.5 py-1' },
  sm: { box: 'h-6 gap-1.5 px-2.5', text: 'xs', chevron: 'xs', row: 'px-3 py-1.5' },
  md: { box: 'h-7 gap-1.5 px-3', text: 'sm', chevron: 'sm', row: 'px-3 py-2' },
  lg: { box: 'h-8 gap-2 px-3.5', text: 'sm', chevron: 'sm', row: 'px-3.5 py-2' },
  xl: { box: 'h-9 gap-2 px-4', text: 'md', chevron: 'md', row: 'px-4 py-2.5' },
  '2xl': { box: 'h-10 gap-2.5 px-5', text: 'lg', chevron: 'md', row: 'px-5 py-3' },
}

export interface StatusOption {
  /** What `onSelect` is called with, and what `value` is compared against. */
  value: string
  /** Already translated — see the note at the top. */
  label: string
  tone?: StatusTone
  strength?: StatusStrength
}

export interface StatusProps {
  /**
   * The word on the plate, translated. Passed rather than looked up in `options`, so
   * a status this build does not recognise can still be shown as itself — grey, with
   * its raw value, instead of silently collapsing to "no status" and hiding that the
   * workflow moved on without us.
   */
  label: string
  tone?: StatusTone
  strength?: StatusStrength
  /** 24 / 28 / 32, the same three `Label` draws — see `StatusSize`. */
  size?: StatusSize
  /**
   * The picker's contents, and the switch that makes the plate clickable at all.
   * Absent, this is an inert `<span>`.
   *
   * The caller filters: a planner is offered `planning` and `planned`, a coder the ten
   * that follow. One list of twelve made two workflows read as branches of a single
   * longer one.
   */
  options?: readonly StatusOption[]
  /** Which option is the current one, for the tick. Not necessarily one of them. */
  value?: string
  onSelect?: (value: string) => void
  /**
   * Which edge the menu hangs from. `right` by default because this sits at the end
   * of a row in a 320px sidebar, where a left-aligned menu goes off the panel.
   */
  align?: 'left' | 'right'
  /** Margins and layout. Not the ground, the padding or the radius. */
  className?: string
}

/**
 * Closes on a click elsewhere or on Escape.
 *
 * Written out here rather than imported: the app's `useClickOutside` is on the far
 * side of the `@ds` alias, and a design system that needs one of its consumer's hooks
 * to work is not shared code. Twenty lines is the right price for that.
 */
function useDismiss(ref: RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return

    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, ref, onClose])
}

export function Status({
  label,
  tone = 'neutral',
  strength = 'strong',
  size = 'sm',
  options,
  value,
  onSelect,
  align = 'right',
  className = '',
}: StatusProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setIsOpen(false), [])
  const menuId = useId()
  useDismiss(containerRef, isOpen, close)

  const shape = SIZES[size]
  /**
   * `transition-colors` ON THE PLATE, and it is `ProgressBar`'s rule rather than a new
   * one: that component fades its fill between tones at 300ms whatever else it is
   * doing, because a coloured INDICATOR that snaps from yellow to green reads as a
   * redraw instead of as a change. A status is the same kind of object and was the only
   * one of the two not following it.
   *
   * It costs the app nothing — a status changes when a skill reports or a person picks
   * one, both of them moments where a fade is what you want — and it is what lets the
   * marketing site's scroll tour walk a reader through the eleven states without the
   * pill flashing at each step.
   */
  const plate = `inline-flex items-center ${shape.box} rounded-full font-medium flex-shrink-0 transition-colors duration-300 ${TONES[tone][strength]}`

  if (!options) {
    return (
      <span className={`${plate} ${className}`.trim()}>
        <Text size={shape.text} tone="inherit">
          {label}
        </Text>
      </span>
    )
  }

  return (
    /**
     * THE WRAPPER IS THE SIZE AND THE SHAPE OF THE PILL, which it was not.
     *
     * It exists only to position the menu — a `<button>` may not contain the listbox,
     * so something above it has to be `relative`. As a plain `<div>` it was BLOCK and
     * therefore full-width and square, and `className` lands here: anything a caller
     * hung on this component that had a shape — the site's scroll tour rings this pill
     * — was drawn around a full-width rectangle instead of around the pill.
     *
     * `inline-flex` shrinks it to its trigger and `rounded-full` gives it the trigger's
     * own radius, so the box a caller decorates and the box a reader sees are the same
     * box. `flex-shrink-0` because the plate inside already refuses to shrink, and a
     * wrapper that did would clip it.
     */
    <div
      ref={containerRef}
      className={`relative inline-flex rounded-full flex-shrink-0 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={`${plate} cursor-pointer border-none`}
      >
        <Text size={shape.text} tone="inherit">
          {label}
        </Text>
        {/* Rotated rather than swapped for a second glyph: one element that turns says
            the menu is the same object in two states, where two glyphs say nothing. */}
        <Icon
          glyph={ChevronDown}
          size={shape.chevron}
          tone="inherit"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="listbox"
          className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 z-50 min-w-[160px] bg-bg-tertiary rounded-lg shadow-xl overflow-hidden`}
        >
          {options.map((option) => {
            const selected = value === option.value
            return (
              <button
                key={option.value || '__none__'}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect?.(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 ${shape.row} text-left hover:bg-surface-strong transition-colors border-none cursor-pointer ${
                  selected ? 'bg-surface' : ''
                }`}
              >
                {/* The row's hue, as a dot — the plate's tint would be a second plate
                    inside the menu, and at 2px there is not enough of it to read a
                    20% fill anyway. `currentColor` so one class sets both.

                    THE ONE THING THAT DOES NOT SCALE with the rung. It is a colour
                    marker rather than a glyph: grown to match 14px type it stops being
                    a dot beside a word and becomes twelve bullets down the menu. */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${DOTS[option.tone ?? 'neutral']}`}
                  style={{ backgroundColor: 'currentColor' }}
                />
                <Text size={shape.text} tone={selected ? 'ink' : 'secondary'}>
                  {option.label}
                </Text>
                {selected && (
                  <Icon glyph={Check} size={shape.chevron} tone="inherit" className="ml-auto text-ink" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
