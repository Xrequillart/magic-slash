import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, FolderGit2 } from './icons'
import { Flag } from './Flag'
import { Icon } from './Icon'
import { Text } from './Text'
import type { IconComponent } from './types'
import { useAnchoredPanel } from './useAnchoredPanel'

/**
 * THE APP'S ONE PICKER: a control that names what it is set to, and a list under it.
 *
 * ── IT REPLACES A NATIVE `<select>`, AND IT HAD TO ────────────────────────────────
 *
 * Two reasons, both stated at the four call sites that had already worked them out
 * independently. An `<option>` can hold TEXT and nothing else, so the colour dot that
 * identifies a repository everywhere else on a page is not a styling problem inside a
 * native select but an IMPOSSIBILITY. And macOS draws that popup itself, in its own
 * colours, ignoring the theme the rest of the window is painted in — on six of the
 * app's eight themes the list that opens is a different product.
 *
 * So four files grew their own: the Tasks bar's `FilterSelect`, the Plans bar's copy of
 * it, `LanguageSelect`, `RoleSelect`. Between them they held four spellings of the same
 * trigger and four of the same panel, and the Plans one carried a docblock naming the
 * fix — "exporting it (or lifting it to `components/`) would delete most of this file
 * and put the tint rule, the truncation and the check mark back in one place". This is
 * that, one folder further out: eighteen native selects were drawn beside those four,
 * and a picker the design system owns is the only way the two stop being different
 * objects.
 *
 * ── THE MARK IS DATA ──────────────────────────────────────────────────────────────
 *
 * An option can carry a COLOUR, a GLYPH or a FLAG, and never a node. That is the rule
 * `Banner` and `AccountCard` already made and it is what keeps a list coherent: pass a
 * node per option and one list can draw two different kinds of mark, which is the bug
 * this shape makes impossible. How a colour is DRAWN — a plain dot, or the repository
 * tile the rest of the app draws a repository with — is the list's and not the entry's,
 * because every option of the repository picker is a repository.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────────────
 *
 * `SelectIcon` is the same idea with an icon-only trigger, for a toolbar where there is
 * no room for a word. `Menu` is a list of COMMANDS — things that happen when you press
 * them — where every row here is a VALUE the control is about to hold. `Status` opens a
 * list too, and it is a state changing rather than a setting being chosen.
 */

/** How an option's colour is drawn. A property of the LIST — see the header. */
export type SelectMarker = 'dot' | 'repo'

/** The heights, on `Input`'s ladder: a picker and a box in one row are the same object. */
export type SelectSize = 'sm' | 'md' | 'lg'

const SIZES: Record<SelectSize, { box: string; gap: string }> = {
  sm: { box: 'h-6 px-2 text-xs rounded-lg', gap: 'gap-1.5' },
  md: { box: 'h-7 px-3 text-xs rounded-lg', gap: 'gap-2' },
  lg: { box: 'h-8 px-3 text-sm rounded-lg', gap: 'gap-2' },
}

/** One entry: what it is worth, what it says, and what identifies it. */
export interface SelectOption {
  /** What `onChange` hands back. Empty string is reserved — see `clearLabel`. */
  value: string
  /** The words on the row, already translated. */
  label: string
  /**
   * A quieter second line under the label — what picking this actually does.
   *
   * The ROW grows, the trigger never does: a control two lines tall in a table of
   * members is a row that no longer lines up with the ones above it. What the trigger
   * shows is the label alone, which is the answer; the hint is the explanation, and an
   * explanation belongs where you are choosing rather than where you have chosen.
   */
  hint?: string
  /** The mark before the label takes this colour. Absent means no mark, never a default. */
  color?: string
  /**
   * A glyph before the label, for a list whose entries are KINDS of something — the
   * role picker's person and shield. Drawn instead of the colour mark, never beside it:
   * two marks on one row is a row saying which twice.
   */
  icon?: IconComponent
  /** A flag before the label, by language code — `Flag`'s own. */
  flag?: string
  /** Half opacity, and the press does nothing. */
  disabled?: boolean
}

export interface SelectProps {
  /** What the control is set to. `''` is nothing picked. */
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /**
   * What the trigger says when `value` matches no option.
   *
   * IT IS NOT A DEFAULT AND IT IS NOT AN ENTRY. It is reachable two ways: a picker with
   * a `clearLabel` that has been cleared, and a value that has LEFT the list under it —
   * a repository dropped from the config, a branch deleted on the remote, an epic whose
   * last ticket was closed. A control naming something no longer on offer would narrow
   * a page to nothing with no way to see why, so it falls back to saying nothing is
   * picked rather than to an empty trigger.
   */
  placeholder?: string
  /**
   * The panel's "no filter" entry, and the whole difference between a picker that can be
   * switched off and one that cannot.
   *
   * It LEADS the list, because it is the entry people reach for after having picked
   * wrongly. A sort has no such state — a list is always in SOME order — so it passes
   * none and every entry is a real choice.
   */
  clearLabel?: string
  /**
   * A fixed width in pixels, for a control that must not resize with its own value: a
   * table column of pickers, a filter bar whose widths are decided across the row.
   *
   * OMITTED IS THE SETTINGS CASE, and the better default. The control fills whatever it
   * is in and the panel measures it, so the two agree without a number anybody has to
   * keep in step with a class.
   */
  width?: number
  /** A glyph on the trigger, for a picker whose values do not name their own subject. */
  icon?: IconComponent
  /** How an option's colour is drawn. */
  marker?: SelectMarker
  size?: SelectSize
  /**
   * Every option at once, no scroll — for a short, closed list the reader should see whole.
   * The panel is then only as tall as the window allows, and flips above the trigger when
   * there is no room below, as it always does. Off, a long list scrolls at `max-h-80`: a
   * list of repositories can be any length, and a panel the height of the screen for it
   * would be a sheet, not a dropdown.
   */
  fit?: boolean
  /**
   * The control is away from its default — narrowing, reordering, set to something other
   * than what the page opens on. Tinted, so a page showing a fraction of its rows says so
   * from the control rather than only from the gap where the other rows were.
   *
   * THE CALLER'S AND NOT INFERRED. What counts as a default is the page's question: the
   * sort's is its first entry, a filter's is having no value at all, and the Tasks
   * repository picker has none to be away from — it is always set to something, and a
   * rule guessed here would leave it permanently lit.
   */
  active?: boolean
  /** Stops the press and dims the control. The panel cannot open. */
  disabled?: boolean
  /** The accessible name, where the control has no visible label beside it. Translated. */
  ariaLabel?: string
  /** Margins and width. Not the ground, the height or the radius. */
  className?: string
}

/**
 * The mark, in whichever of the three kinds the option carries.
 *
 * The repository tile is the app's own — the folder glyph on the colour at 12%, which is
 * what makes it a tint of the repository's colour rather than a block of it. `1f` is that
 * alpha as a hex suffix, and it is appended to the caller's colour rather than mixed in a
 * token: a repository's hue is assigned at runtime, so Tailwind has never seen it.
 */
function OptionMark({
  option,
  marker,
  selected,
}: {
  option: SelectOption
  marker: SelectMarker
  selected: boolean
}) {
  if (option.icon) {
    return (
      <Icon
        glyph={option.icon}
        size="sm"
        tone="inherit"
        className={`shrink-0 ${selected ? 'text-accent' : 'text-text-secondary'}`}
      />
    )
  }
  if (option.flag) return <Flag code={option.flag} />
  if (!option.color) return null
  if (marker === 'dot') {
    return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} />
  }
  return (
    <span
      className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
      style={{ backgroundColor: `${option.color}1f`, color: option.color }}
    >
      <FolderGit2 className="w-3 h-3" />
    </span>
  )
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  clearLabel,
  width,
  icon: TriggerIcon,
  marker = 'dot',
  size = 'md',
  active = false,
  disabled = false,
  ariaLabel,
  className = '',
  fit = false,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, width)
  const shape = SIZES[size]

  const selected = options.find((option) => option.value === value)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={width ? { width } : undefined}
        className={`flex items-center ${shape.gap} ${shape.box} bg-surface border cursor-pointer transition-colors ${
          width ? 'flex-shrink-0' : 'w-full'
        } disabled:opacity-50 disabled:cursor-not-allowed ${
          active ? 'border-accent/40 text-ink' : 'border-line-field text-ink hover:border-accent'
        } ${className}`.trim()}
      >
        {TriggerIcon && (
          <Icon glyph={TriggerIcon} size="sm" tone="inherit" className="shrink-0 text-text-secondary" />
        )}
        {/* The selected option's own mark, and never its hint: see `SelectOption.hint`. */}
        {selected && <OptionMark option={selected} marker={marker} selected={false} />}
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <Icon
          glyph={ChevronDown}
          size="sm"
          tone="inherit"
          className={`shrink-0 ml-auto text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          role="listbox"
          /* `gap-0.5` between entries, not flush. The rows carry a hover and a selected
             ground of their own, so touching they read as one banded block and the
             highlight has no edge of its own to land on; a two-pixel breath is enough to
             make each entry a thing being pointed at.

             `overscroll-contain` is not decoration either — see `useAnchoredPanel`: a
             wheel at either end of a scrolling panel chains outwards into a scroll the
             hook correctly reads as "outside", and dismisses the list at the moment the
             reader reaches the bottom of it. */
          className={`bg-bg-secondary border border-line rounded-xl shadow-2xl z-[60] p-1 ${fit ? 'max-h-[calc(100vh-24px)]' : 'max-h-80'} overflow-y-auto overscroll-contain flex flex-col gap-0.5`}
        >
          {clearLabel && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                setOpen(false)
                if (value) onChange('')
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                value ? 'hover:bg-surface' : 'bg-surface'
              }`}
            >
              <Text size="xs" tone="inherit" className={value ? 'text-ink' : 'text-accent'}>
                {clearLabel}
              </Text>
              {!value && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
            </button>
          )}
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => {
                  setOpen(false)
                  if (!isSelected) onChange(option.value)
                }}
                /* `items-start` only where a hint pushes the row to two lines: a mark
                   centred on a pair of lines floats between them, and what it belongs
                   beside is the label's own. */
                className={`w-full flex ${option.hint ? 'items-start' : 'items-center'} gap-2 px-2.5 py-2 rounded-lg text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <OptionMark option={option} marker={marker} selected={isSelected} />
                <span className="min-w-0 flex-1">
                  <Text
                    size="xs"
                    tone="inherit"
                    className={`block truncate ${isSelected ? 'text-accent' : 'text-ink'}`}
                  >
                    {option.label}
                  </Text>
                  {option.hint && (
                    <Text size="xs" tone="secondary" className="mt-0.5 block opacity-50">
                      {option.hint}
                    </Text>
                  )}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
