import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { Button } from './Button'
import { Input } from './Input'
import type { IconComponent } from './types'

/**
 * THE CARD THAT FLOATS OVER A SELECTION: what can be done to the words picked, in one row —
 * the kind of block, the marks, a link, and a note about them. Notion's, and for the same
 * reason: the actions are about the selection, so they appear at it, and nowhere else on
 * the page wears a toolbar that is idle ninety-nine times out of a hundred.
 *
 * DRAWN, NOT PLACED. The caller owns the selection, works out where it is and positions
 * this through `style`; this file owns what the card looks like and what its buttons say.
 *
 * IT NEVER TAKES THE FOCUS. Every press is swallowed on mousedown, so the selection the
 * buttons act on is still there when the click lands — a toolbar that moved the focus would
 * collapse the very selection it was about to format. The link field is the one exception,
 * and the caller keeps a copy of the selection for it.
 */
export interface FormatToolbarItem {
  key: string
  icon: IconComponent
  /** Already translated; the tooltip and the accessible name. */
  label: string
  /** The selection already has it: bold text under the bold button. */
  active?: boolean
  disabled?: boolean
  onSelect: () => void
}

export interface FormatToolbarProps {
  /** Groups of buttons, a hairline between each. */
  groups: FormatToolbarItem[][]
  /** The one action written out in words, at the end: "Comment". */
  action?: { icon: IconComponent; label: string; onSelect: () => void }
  /** Replaces the buttons with a field for a link's address, while one is being added. */
  link?: {
    value: string
    placeholder: string
    submitLabel: string
    onChange: (value: string) => void
    onSubmit: () => void
    onCancel: () => void
  }
  style?: CSSProperties
}

export function FormatToolbar({ groups, action, link, style }: FormatToolbarProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (link) cardRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [link?.placeholder, link])

  const onLinkKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); link?.onSubmit() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); link?.onCancel() }
  }

  return (
    <div
      ref={cardRef}
      role="toolbar"
      data-format-toolbar
      style={style}
      /* See the docblock: a press here must not take the focus off the selection. The link
         field is let through, since typing in it is the point. */
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault()
      }}
      className="flex items-center gap-0.5 rounded-xl bg-bg-tertiary p-1 shadow-xl"
    >
      {link ? (
        <div className="flex items-center gap-1.5 px-1">
          <Input
            value={link.value}
            onChange={link.onChange}
            placeholder={link.placeholder}
            size="sm"
            type="url"
            onKeyDown={onLinkKey}
            className="w-64"
          />
          <Button size="sm" tone="accent" onClick={link.onSubmit}>{link.submitLabel}</Button>
        </div>
      ) : (
        <>
          {groups.map((group, index) => (
            <div key={group[0]?.key ?? index} className="flex items-center gap-0.5">
              {index > 0 && <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />}
              {group.map((item) => (
                <ButtonIcon
                  key={item.key}
                  icon={item.icon}
                  title={item.label}
                  onClick={item.onSelect}
                  active={item.active}
                  disabled={item.disabled}
                  tone="ghost"
                  size="sm"
                />
              ))}
            </div>
          ))}
          {action && (
            <>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />
              <Button size="sm" tone="ghost" icon={action.icon} onClick={action.onSelect}>
                {action.label}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}
