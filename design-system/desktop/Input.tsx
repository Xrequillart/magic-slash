import { forwardRef, type KeyboardEvent, type Ref } from 'react'
import { Icon } from './Icon'
import type { IconComponent } from './types'

/**
 * A BOX YOU TYPE IN — one line or several.
 *
 * WHAT IT REPLACES: `INPUT` in the app's `theme/controls.ts`, the last large piece of
 * that module and the one `Button`'s header left standing. One class string, spread
 * across ten files and twenty-four fields, composed at every call site with a width and
 * whatever else that field happened to need — `resize-none`, `font-mono`,
 * `disabled:opacity-50`, `pl-9` for a search glyph, `pr-14` for a spinner. Every one of
 * those is a decision the string could not express, so every one of them was re-made by
 * hand, and two fields that meant the same thing did not always agree.
 *
 * THE TEXTAREA IS THE SAME COMPONENT, which is the first thing the constant could not
 * be. Six of those twenty-four fields are `<textarea>`s wearing `INPUT` plus a `resize`
 * class, because a field is a field whether it holds a name or a paragraph — and a
 * textarea that took its padding from one place and its resize rule from another was a
 * box that only looked like the ones above it. `multiline` is a discriminant here, so
 * `rows` on a single-line field is a type error rather than an ignored attribute.
 *
 * `onChange` HANDS OVER THE VALUE, not the event. Every call site in the app wrote
 * `(e) => set(e.target.value)`; the three that did something else were doing it to the
 * KEY, which is what `onKeyDown` is still for and still gets the event for.
 *
 * ── THE TWO TONES ─────────────────────────────────────────────────────────────────
 *
 * `default` is the theme's: `bg-surface`, a `line-field` hairline, the accent on focus.
 * It is what every form in the app wants and what the constant drew.
 *
 * `paper` is for a surface that is white WHATEVER the theme is, and the app has one —
 * the sign-in card, glass on the release mesh. On it, `bg-surface` is ink at 6% of a
 * ground that is not there and `text-ink` is white on four themes out of eight, so the
 * constant produced an invisible field. `ButtonIcon` grew a tone of the same name for
 * the same screen and the same reason; both are mixed from `release-paper` and
 * `release-ink`, the fixed pair the configs declare.
 *
 * IT IS NOT A LIGHT-THEME TONE. A caller on the app's own ground wants `default`, which
 * already follows the theme. Reach for this only where the ground itself does not.
 */

export type InputTone = 'default' | 'paper'

/**
 * The grounds, and the focus is part of the tone rather than a rule on top of it: what a
 * field does when you land in it is the same kind of statement as what it looks like at
 * rest, and splitting them is how the two end up disagreeing on one of the two tones.
 *
 * `disabled:` IS IN HERE TOO, for the reason `INPUT` proved by leaving it out: seven of
 * the app's fields can be disabled and four of them remembered to say so, because
 * `disabled:opacity-50` was a class the caller had to append. A field that dims when it
 * is unusable is not a per-form decision.
 */
const TONES: Record<InputTone, string> = {
  default:
    'bg-surface border-line-field text-ink placeholder:text-text-secondary/30 ' +
    'focus:border-accent disabled:opacity-50',
  paper:
    'bg-release-paper/45 border-release-paper/60 text-release-ink ' +
    'placeholder:text-release-ink/40 focus:bg-release-paper/70 focus:border-release-paper ' +
    'disabled:opacity-60',
}

/** What `invalid` overrides, in both tones: the hairline, at rest and focused. */
const INVALID = 'border-red focus:border-red'

/**
 * FOUR RUNGS OFF THE SHARED LADDER — 24 / 28 / 32 / 36, the same pixels `Button`,
 * `ButtonIcon`, `Label` and `Status` stand on, so a field and a button on one row are
 * the same height by construction rather than by eye.
 *
 * FOUR AND NOT SEVEN, which is `Status`'s precedent: the ladder is shared, the SUBSET a
 * component offers is its own. Nothing smaller than 24 can hold a caret and a word, and
 * a 40px field is a search bar rather than a form field — `QuickLaunch` draws that one
 * itself, deliberately, and is not a caller here.
 *
 * `md` IS THE DEFAULT because it is what `INPUT` measured: `px-3 py-1.5` around 12px
 * type, which is 28px with its border. Every field migrated off that constant keeps its
 * height without asking for a size.
 *
 * THE HEIGHT IS ABSENT FROM THE MULTILINE SHAPE, and that is not an omission: a textarea
 * is sized by its `rows`, and an `h-7` on one would cut the second line off. The rung
 * still decides the padding and the type, so a paragraph field and the name field above
 * it are set at the same size and inset by the same amount.
 */
export type InputSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<InputSize, { box: string; area: string }> = {
  sm: { box: 'h-6 px-2.5 text-xs rounded-lg', area: 'px-2.5 py-1 text-xs rounded-lg' },
  md: { box: 'h-7 px-3 text-xs rounded-lg', area: 'px-3 py-1.5 text-xs rounded-lg' },
  lg: { box: 'h-8 px-3 text-sm rounded-lg', area: 'px-3 py-2 text-sm rounded-lg' },
  xl: { box: 'h-9 px-3.5 text-sm rounded-xl', area: 'px-3.5 py-2.5 text-sm rounded-xl' },
}

/** The left inset when a mark sits in the box. One per rung, so the glyph never touches the caret. */
const WITH_ICON: Record<InputSize, string> = {
  sm: 'pl-7',
  md: 'pl-8',
  lg: 'pl-9',
  xl: 'pl-10',
}

/**
 * ROOM KEPT CLEAR AT THE RIGHT EDGE, for whatever the caller puts there.
 *
 * The search box on the Tasks board is the case: a spinner while the sprint is being
 * searched, a warning when that search failed, and a clear button whenever there is
 * something to clear — up to two of them at once. Those are the CALLER's, positioned in
 * its own relative wrapper, because what they are and when they appear is a fact about
 * that board and not about a field.
 *
 * What the field owes them is space, and a NAMED amount of it rather than a `pr-14` in
 * `className`: two padding utilities on one element are settled by the order Tailwind
 * emitted them in, not by the order they were written, so a caller appending one would
 * be racing the rung's own.
 */
export type InputTrailing = 'none' | 'narrow' | 'wide'

const TRAILING: Record<InputTrailing, string> = {
  none: '',
  narrow: 'pr-8',
  wide: 'pr-14',
}

/** Everything a field is, whichever shape it takes. */
interface InputBase {
  value: string
  /** The VALUE, not the event — see the note at the top. */
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  size?: InputSize
  tone?: InputTone
  /**
   * The content is CODE — a skill's markdown, an invitation token, a path. It is the one
   * typographic choice a field gets, and it is here because the app already made it in
   * two places by appending `font-mono` to the constant.
   */
  mono?: boolean
  /** The value is refused. Paints the hairline red, at rest and focused. */
  invalid?: boolean
  name?: string
  /** What a `<label htmlFor>` elsewhere on the page points at. */
  id?: string
  /** The tooltip, for a field whose label is somewhere the pointer is not. */
  title?: string
  spellCheck?: boolean
  /**
   * Entered and left.
   *
   * A pair rather than one of them, because the app's one use of either needs both: a
   * profile field edits locally while it has the focus and commits when it loses it, so
   * that it saves "Xavier" once instead of saving "X" and then five more names.
   */
  onFocus?: () => void
  onBlur?: () => void
  /**
   * Width and placement — `w-full`, `flex-1`, `w-72`, a margin. NOT the ground, the
   * padding, the height, the radius or the type size: a second utility from any of those
   * groups is settled by Tailwind's emit order rather than by where it was written.
   */
  className?: string
}

interface SingleLineProps extends InputBase {
  multiline?: false
  /**
   * `text` unless the caller says otherwise. The list is deliberately short: a date, a
   * file or a checkbox is a different control with a different shape, not this one
   * wearing another `type`.
   */
  type?: 'text' | 'email' | 'password' | 'url' | 'search'
  inputMode?: 'text' | 'numeric' | 'email' | 'url'
  maxLength?: number
  /** A mark inside the box, at the left. The rung decides how far the text is inset for it. */
  icon?: IconComponent
  /** Space kept clear at the right edge for the caller's own controls — see `TRAILING`. */
  trailing?: InputTrailing
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  rows?: never
  resize?: never
}

interface MultilineProps extends InputBase {
  multiline: true
  /** How tall it starts. The browser's own default is 2, which is never what a form wants. */
  rows?: number
  /**
   * Whether the reader may drag it taller. `none` by default — a box that grows inside a
   * form pushes everything under it — and `vertical` for the one field that IS the page,
   * a skill's own content.
   */
  resize?: 'none' | 'vertical'
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  type?: never
  inputMode?: never
  maxLength?: never
  icon?: never
  trailing?: never
}

export type InputProps = SingleLineProps | MultilineProps

/**
 * What every field wears, whichever shape and whichever tone.
 *
 * `border` AND NOT `border border-…`: the width is here, once, and the colour is the
 * tone's — the same split `ButtonIcon`'s tone table makes, and for the same reason, which
 * is that two colour classes on one element are a race nobody can read.
 *
 * `outline-none` with a BORDER that answers focus rather than a ring: this is the app's
 * own answer and it is worth keeping. A ring around a field sitting flush in a form adds
 * a second rectangle at every focus; the hairline is already there and only changes
 * colour.
 */
const CHROME =
  'w-full border transition-colors focus:outline-none disabled:cursor-not-allowed'

/**
 * FORWARDS ITS REF, and to whichever element it drew.
 *
 * The union is the honest type: a caller holding one of these can only do what both
 * elements do — `focus()`, `blur()`, `select()` — which is every reason the app takes a
 * ref to a field in the first place. Typing it as the input alone would have made the
 * textarea's ref a lie, and a second `textareaRef` prop would be two names for the one
 * thing a caller wants.
 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(function Input(props, ref) {
  const {
    value,
    onChange,
    placeholder,
    disabled = false,
    readOnly = false,
    autoFocus = false,
    size = 'md',
    tone = 'default',
    mono = false,
    invalid = false,
    name,
    id,
    title,
    spellCheck,
    className = '',
    onFocus,
    onBlur,
  } = props

  const shape = SIZES[size]
  const face = mono ? 'font-mono' : ''
  const ground = `${TONES[tone]} ${invalid ? INVALID : ''}`

  if (props.multiline) {
    return (
      <textarea
        ref={ref as Ref<HTMLTextAreaElement>}
        name={name}
        id={id}
        title={title}
        value={value}
        rows={props.rows ?? 3}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        spellCheck={spellCheck}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={props.onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`${shape.area} ${ground} ${CHROME} ${face} ${
          props.resize === 'vertical' ? 'resize-y' : 'resize-none'
        } ${className}`}
      />
    )
  }

  const field = (
    <input
      ref={ref as Ref<HTMLInputElement>}
      name={name}
      id={id}
      title={title}
      type={props.type ?? 'text'}
      inputMode={props.inputMode}
      maxLength={props.maxLength}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      spellCheck={spellCheck}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={props.onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`${shape.box} ${ground} ${CHROME} ${face} ${
        props.icon ? WITH_ICON[size] : ''
      } ${TRAILING[props.trailing ?? 'none']} ${props.icon ? '' : className}`}
    />
  )

  if (!props.icon) return field

  /* THE MARK IS A SIBLING, NOT A PARENT'S CHILD, and the wrapper is what carries the
     caller's width: an absolutely positioned glyph needs a positioned ancestor, and the
     field cannot be its own. `pointer-events-none` so clicking the mark still lands in
     the box — a glyph that swallowed the click would be a field with a dead corner. */
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <Icon
        glyph={props.icon}
        size="sm"
        tone="muted"
        className={`pointer-events-none absolute ${size === 'sm' ? 'left-2' : 'left-2.5'}`}
      />
      {field}
    </span>
  )
})
