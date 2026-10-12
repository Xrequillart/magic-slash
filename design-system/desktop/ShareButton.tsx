import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { Check, Plus, Share2, X } from './icons'
import { Text } from './Text'
import type { IconComponent } from './types'
import { useAnchoredPanel } from './useAnchoredPanel'

/**
 * WHO MAY SEE AND EDIT SOMETHING, behind one button: the trigger and the panel it opens.
 *
 * Drawn in a page's header, beside the other actions on the thing as a whole. Sharing is
 * set once and read rarely, so a whole section of the page spent on it was a card most
 * readers scrolled past; a button keeps the answer one press away and the page free of it.
 *
 * ── EVERY CHOICE IS DRAWN IN THE PANEL, NOTHING OPENS FROM IT ──────────────────────
 *
 * The access levels are rows with their explanation under each, not a `Select`, and the
 * people to invite are rows too, not a `Menu`. Both of those portal a panel of their own
 * to the body, and this panel closes on a press outside itself: a picker opened from it
 * would close the panel it came from on the first click. Rows are also the better
 * drawing here. Four levels, each with a sentence saying what it does, are read side by
 * side before one is picked; a picker shows one sentence at a time.
 *
 * ── TWO SHAPES, AND THE CALLER PICKS ONE ───────────────────────────────────────────
 *
 * `options`: the levels, the people with access by name, and the people who could be
 * added. `notice`: a sentence instead, for a thing that cannot be shared as it stands,
 * with the one action that would change that. A reader who presses "Share" is told why
 * there is nothing to choose, which an absent button never tells them.
 *
 * ── DATA, NEVER A SLOT ──────────────────────────────────────────────────────────────
 *
 * A level is a mark, a word and a sentence; a person is a face and a name. No prop takes
 * a node, for `Menu`'s reason: a panel that took a `ReactNode` would grow a form in it.
 */

/** One access level. `value` is what `onChange` hands back. */
export interface ShareOption {
  value: string
  label: string
  /** What picking it does, under the label. Every level has one: it is the whole choice. */
  hint: string
  icon: IconComponent
}

/** Someone who has access, or could be given it. `id` is what the callbacks hand back. */
export interface SharePerson {
  id: string
  name: string
  /** A face. `null` draws the fallback; absent draws none. */
  avatar?: string | null
}

/** The people who have access by name, under the levels. */
export interface ShareList {
  heading: string
  people: SharePerson[]
  /** Said instead of the rows when there are none, or when the list could not be read. */
  empty: string
}

export interface ShareButtonProps {
  /** The words on the trigger. Translated. */
  label: string
  /** The panel's heading, which also names it for a screen reader. */
  title: string
  /**
   * A sentence instead of choices, and the one action that would make some possible.
   * Wins over `options` when both are given.
   */
  notice?: {
    text: string
    action?: { label: string; icon?: IconComponent; onPress: () => void }
  }
  options?: ShareOption[]
  value?: string
  onChange?: (value: string) => void
  /** Drawn under the levels when given, and only then. */
  members?: ShareList & {
    removeLabel: (name: string) => string
    onRemove: (id: string) => void
  }
  /** Who could be added, under the members. Drawn when given. */
  candidates?: ShareList & {
    addLabel: (name: string) => string
    onAdd: (id: string) => void
  }
  /** A write was refused or failed. Said at the bottom of the panel, in red. */
  error?: string
  /** A write is in flight: every control in the panel waits for it. */
  busy?: boolean
  disabled?: boolean
  /** In pixels, because the panel is positioned by hand. */
  width?: number
  /** Where to portal. `document.body` unless the theme is scoped — see `Menu`. */
  portalTo?: HTMLElement | null
}

const DEFAULT_WIDTH = 340

export function ShareButton({
  label,
  title,
  notice,
  options,
  value,
  onChange,
  members,
  candidates,
  error,
  busy = false,
  disabled = false,
  width = DEFAULT_WIDTH,
  portalTo,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, width)

  // The trigger wears the level it is set to, so the header says who can see the thing
  // without being opened. The generic mark only when there is no level to show.
  const selected = notice ? undefined : options?.find((option) => option.value === value)

  return (
    <>
      <Button
        ref={triggerRef}
        icon={selected?.icon ?? Share2}
        onClick={() => setOpen((was) => !was)}
        disabled={disabled}
        title={selected?.label ?? title}
      >
        {label}
      </Button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          style={style()}
          /* `overscroll-contain` for `useAnchoredPanel`'s reason: a wheel at either end of
             a scrolling panel would chain outwards into a scroll it reads as outside. */
          className="z-[60] flex max-h-[calc(100vh-24px)] flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-line bg-bg-secondary p-3 shadow-2xl"
        >
          <Text size="xs" weight="bold">{title}</Text>

          {notice ? (
            <>
              <Text size="xs" tone="secondary">{notice.text}</Text>
              {notice.action && (
                <Button
                  size="xs"
                  icon={notice.action.icon}
                  onClick={() => {
                    close()
                    notice.action?.onPress()
                  }}
                  className="self-start"
                >
                  {notice.action.label}
                </Button>
              )}
            </>
          ) : (
            <>
              {options && (
                <div role="radiogroup" aria-label={title} className="-mx-1 flex flex-col gap-0.5">
                  {options.map((option) => (
                    <LevelRow
                      key={option.value}
                      option={option}
                      selected={option.value === value}
                      disabled={busy}
                      onPick={() => { if (option.value !== value) onChange?.(option.value) }}
                    />
                  ))}
                </div>
              )}

              {members && (
                <PeopleSection list={members}>
                  {(person) => (
                    <ButtonIcon
                      icon={X}
                      size="xs"
                      tone="ghost"
                      title={members.removeLabel(person.name)}
                      onClick={() => members.onRemove(person.id)}
                      disabled={busy}
                    />
                  )}
                </PeopleSection>
              )}

              {candidates && (
                <PeopleSection list={candidates}>
                  {(person) => (
                    <ButtonIcon
                      icon={Plus}
                      size="xs"
                      tone="ghost"
                      title={candidates.addLabel(person.name)}
                      onClick={() => candidates.onAdd(person.id)}
                      disabled={busy}
                    />
                  )}
                </PeopleSection>
              )}
            </>
          )}

          {error && <Text size="xs" tone="inherit" className="text-red">{error}</Text>}
        </div>,
        portalTo ?? document.body,
      )}
    </>
  )
}

/** One level: its mark, its name, and what it does. Selected is accent and a check. */
function LevelRow({
  option,
  selected,
  disabled,
  onPick,
}: {
  option: ShareOption
  selected: boolean
  disabled: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onPick}
      className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-wait ${
        selected ? 'bg-surface' : 'hover:bg-surface'
      }`}
    >
      <Icon
        glyph={option.icon}
        size="sm"
        tone="inherit"
        className={`mt-px shrink-0 ${selected ? 'text-accent' : 'text-text-secondary'}`}
      />
      <span className="min-w-0 flex-1">
        <Text size="xs" tone="inherit" className={`block ${selected ? 'text-accent' : 'text-ink'}`}>
          {option.label}
        </Text>
        <Text size="xs" tone="secondary" className="mt-0.5 block opacity-60">{option.hint}</Text>
      </span>
      {selected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />}
    </button>
  )
}

/**
 * A heading, then one row per person, or the list's own sentence when it has none.
 *
 * The trailing control is the only thing that differs between the two lists (remove,
 * add), so it is a render function of this file's own, never a prop of the component.
 */
function PeopleSection({
  list,
  children,
}: {
  list: ShareList
  children: (person: SharePerson) => JSX.Element
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <Text size="2xs" weight="bold" tone="secondary" className="uppercase tracking-[0.12em] opacity-60">
        {list.heading}
      </Text>
      {list.people.length === 0 ? (
        <Text size="xs" tone="secondary">{list.empty}</Text>
      ) : (
        list.people.map((person) => (
          <div key={person.id} className="flex min-w-0 items-center gap-2 py-0.5">
            {person.avatar !== undefined && (
              <Avatar src={person.avatar} alt="" size="sm" fallback="portrait" />
            )}
            <Text size="xs" className="min-w-0 flex-1 truncate">{person.name}</Text>
            {children(person)}
          </div>
        ))
      )}
    </div>
  )
}
