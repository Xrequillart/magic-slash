import { useEffect, useState, type RefObject } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { Input, type InputTrailing } from './Input'
import { Label } from './Label'
import { Loader } from './Loader'
import { Search, TriangleAlert, X } from './icons'
import { Select, type SelectProps } from './Select'
import { StickyBar } from './StickyBar'
import type { IconComponent } from './types'

/**
 * THE ROW OF CONTROLS AT THE TOP OF A LIST: pickers, a search box that takes the width,
 * and more pickers — pinned, so what narrows a page is never a scroll away from it.
 *
 * `StickyBar` PLUS THE TWO THINGS A BAND CANNOT DO FOR ITSELF, which is the same split
 * `TaskBoard` makes over `BoardColumn`:
 *
 *   1. IT KNOWS WHETHER IT HAS PINNED. A sticky band has moved, so it cannot report the
 *      position it came from; a wrapper that renders the SENTINEL and the band can, and
 *      that is what this is. `StickyBar.stuck` stays a prop for the caller that has its
 *      own answer; nobody who uses this needs one.
 *   2. IT KNOWS WHAT A CONTROL IN A FILTER BAR LOOKS LIKE. The widths, the order, the
 *      clear button inside the box, the spinner that says a wider answer is coming, the
 *      Escape that empties the field rather than closing the page — all of that was
 *      spelled out at the Tasks page's call site and would have been spelled again at the
 *      Plans page's.
 *
 * WHAT IT HOLDS NOTHING OF is what the controls MEAN. A repository, an epic, a sprint, an
 * agent: those are the app's vocabulary, and they arrive as `before` and `after` — two
 * lists, because the search box is the thing they sit either side of.
 *
 * THE FULL BLEED IS THE CALLER'S, and it is the one thing that must not be forgotten:
 * what scrolls past has to go under an opaque band EDGE TO EDGE, so a bar inside a page
 * with a 24px inset needs `-mx-6 px-6`. The number is the page's own padding, which is why
 * it cannot live in here. See `className`.
 */

/**
 * The bar's height in pixels, and the offset everything that pins UNDER it has to use.
 *
 * 28px of controls — what a `Select` and an `Input` both stand at their own default —
 * between 12px of padding either side. Stated as a number rather than left to the content
 * for `StickyBar.height`'s reason: two sticky bands at the same offset are one band hiding
 * the other, so whatever pins below has to know exactly how tall this is, and a height
 * that falls out of its padding is a height nobody else can read.
 */
export const FILTER_BAR_HEIGHT = 52

/**
 * One control in the row.
 *
 * TWO KINDS, and the pair is the line `Select` and `Label` are drawn either side of: a
 * picker CHANGES what is on screen, a chip NAMES what is on screen and does not move while
 * you look at it. The Tasks bar has one of the second kind — which sprint the board is
 * showing — and it was spelled with a transparent border whose only job was to make it
 * stand as tall as the things around it.
 */
export type FilterBarControl =
  | ({ kind: 'select'; id: string } & SelectProps)
  | {
    kind: 'chip'
    id: string
    /** The word on the plate, already translated or the source's own. */
    label: string
    icon?: IconComponent
    /** The tooltip, for the half a truncated name loses first. */
    title?: string
  }

/**
 * The search box, and the three things that can sit at its right edge.
 *
 * ONLY EVER ONE OF THEM DOES, which is why they share a row rather than each claiming the
 * corner: stacked absolutely they would overlap; in a flex row the clear button simply
 * moves left by the width of whichever status glyph is showing.
 */
export interface FilterBarSearch {
  value: string
  onChange: (value: string) => void
  /**
   * Where a box says how far it reaches, because it is the only text a reader sees BEFORE
   * typing — which is when "will this find the thing I cannot see" is the question.
   */
  placeholder?: string
  /** The clear button's name. Absent draws no clear button. */
  clearLabel?: string
  /**
   * A WIDER ANSWER IS ON ITS WAY, and this is not "the page is loading": whatever is in
   * memory has already been narrowed by the time this appears. A 14px glyph in the corner
   * of the box, never anything that covers the list.
   */
  busy?: boolean
  busyLabel?: string
  /**
   * The reach past what is loaded failed; what is on screen is still accurate. A glyph and
   * a sentence on hover, not a banner — nothing is broken that the reader can act on.
   */
  warning?: string
}

export interface FilterBarProps {
  before?: FilterBarControl[]
  search?: FilterBarSearch
  after?: FilterBarControl[]
  /** Its own box, not a minimum. See `FILTER_BAR_HEIGHT`. */
  height?: number
  /** Where it pins, in pixels from the top of the pane. 0 unless something is above it. */
  top?: number
  /**
   * The scrolling pane, for the sentinel. OMITTED MEANS IT NEVER LIFTS ITS SHADOW, which
   * is the honest state for a bar drawn inside something that does not scroll.
   */
  paneRef?: RefObject<HTMLElement>
  /**
   * THE FULL BLEED GOES HERE — `-mx-6 px-6` for a page inset by 24px. Margins and bleed
   * only: not the ground, the height or the shadow.
   */
  className?: string
}

export function FilterBar({
  before = [],
  search,
  after = [],
  height = FILTER_BAR_HEIGHT,
  top = 0,
  paneRef,
  className = '',
}: FilterBarProps) {
  /**
   * Whether it has pinned, which decides one thing: the shadow it lifts off the page.
   *
   * A SENTINEL AND AN OBSERVER rather than a scroll handler: this is one boolean that
   * flips twice per visit, and a `scroll` listener would remeasure a rectangle on every
   * frame to answer it. There is no CSS for the question on the Chromium the desktop ships
   * — `:stuck` and scroll-state queries both landed after it.
   *
   * THE NODE IS HELD IN STATE AND NOT IN A REF, which is what makes the observer re-attach
   * on its own: a bar that is unmounted with its list and mounted again on the way back
   * would otherwise leave the observer watching a detached node for the rest of the
   * session. A ref could not be read on mount either — child refs attach before their
   * parent's, so `paneRef` is still null at the moment a ref callback here would fire.
   */
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const pane = paneRef?.current
    // Cleared rather than left latched on, or a bar that comes back would wear a shadow it
    // has no business keeping.
    if (!sentinel || !pane) {
      setStuck(false)
      return
    }
    // `rootMargin` shrinks the root by whatever is pinned above, so the sentinel counts as
    // gone the moment it slides under that band rather than when it leaves the pane —
    // without it the shadow appears `top` pixels late, with the first row already cut in
    // half by an edgeless bar.
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: pane, threshold: 0, rootMargin: `-${top}px 0px 0px 0px` },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, top, paneRef])

  return (
    <>
      {/* Zero height, nothing to see: it marks where the top of the bar WOULD be.

          `-mb-3` CANCELS THE GAP AFTER ITSELF, which is the half that matters: the
          sentinel has to sit EXACTLY on the bar's top edge or the shadow lifts early. It
          assumes the column around it spaces its children by `gap-3`, which is what every
          page that pins one of these does — and the gap BEFORE the sentinel is then the
          air under whatever heads the list. */}
      <div ref={setSentinel} className="h-0 -mb-3" aria-hidden />
      <StickyBar height={height} top={top} stuck={stuck} className={className}>
        {before.map((control) => <Control key={control.id} control={control} />)}
        {search && <SearchField search={search} />}
        {after.map((control) => <Control key={control.id} control={control} />)}
      </StickyBar>
    </>
  )
}

function Control({ control }: { control: FilterBarControl }) {
  if (control.kind === 'chip') {
    // `md` is 28px, which is exactly what a `Select` stands at its own default — so a chip
    // in this row needs no border of its own to line up with its neighbours, which is what
    // the transparent one it used to wear was for.
    return (
      <Label
        {...(control.icon ? { icon: control.icon } : {})}
        size="md"
        {...(control.title ? { title: control.title } : {})}
        truncate
        className="max-w-[11rem]"
      >
        {control.label}
      </Label>
    )
  }

  const { kind: _kind, id: _id, ...select } = control
  // `flex-shrink-0` is not spelled here: `Select` takes a fixed `width`, and the search box
  // beside it is the only thing in the row that grows.
  return <Select {...select} />
}

function SearchField({ search }: { search: FilterBarSearch }) {
  const { value, onChange, placeholder, clearLabel, busy, busyLabel, warning } = search
  const canClear = !!value && !!clearLabel

  // The MARK is the field's (`icon`); the STATUS ROW at the other edge is this component's,
  // so the field is asked only to keep room for it.
  const trailing: InputTrailing = value && (busy || warning) ? 'wide' : value || busy ? 'narrow' : 'none'

  return (
    <div className="relative flex-1 min-w-0">
      <Input
        type="search"
        value={value}
        onChange={onChange}
        // ESCAPE CLEARS THE BOX rather than closing the page around it. A page overlay
        // listens for Escape on `window`, so a reader whose first instinct is Escape would
        // otherwise lose the whole list to clear one word — and clearing is what Escape
        // means in a search box everywhere else. Only when there is something to clear, so
        // an empty box still closes the page.
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !value) return
          event.preventDefault()
          event.stopPropagation()
          onChange('')
        }}
        {...(placeholder ? { placeholder } : {})}
        icon={Search}
        trailing={trailing}
        className="w-full"
      />
      {(value || busy) && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {busy && (
            // `Loader` and not a hand-spun glyph: it is this folder's single answer for
            // "something you are waiting on", and the reduced-motion rule it carries applies
            // here for free.
            <Loader variant="spin" size="sm" tone="muted" {...(busyLabel ? { label: busyLabel } : {})} />
          )}
          {!busy && warning && (
            // THE NAME IS ON THE WRAPPER, not on the mark. `Icon` takes no `aria-label` and
            // TypeScript does not check hyphenated JSX attributes, so one written there
            // compiles and is then dropped on the floor — the quietest way to lose an
            // accessible name there is.
            <span title={warning} role="img" aria-label={warning} className="flex items-center">
              <Icon glyph={TriangleAlert} size="sm" tone="inherit" className="text-orange" />
            </span>
          )}
          {canClear && (
            // `ButtonIcon` at `xs` — 20px, the rung for a control that lives INSIDE
            // something else, which is exactly what a clear button in a field is. Its
            // `ghost` tone is the one written for that case: no plate at rest, so it is not
            // a square sitting permanently in the box.
            <ButtonIcon icon={X} size="xs" tone="ghost" title={clearLabel} onClick={() => onChange('')} />
          )}
        </span>
      )}
    </div>
  )
}
