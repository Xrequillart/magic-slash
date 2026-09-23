import type { KeyboardEvent } from 'react'
import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Input } from './Input'
import { Select, type SelectOption } from './Select'
import { Trash2 } from './icons'
import type { IconComponent } from './types'

/**
 * THE LINKS A PLAN POINTS OUT TO — the Figma file, the Notion page, the Claude artifact the
 * plan is about — drawn the way its tickets are: a sunken card of rows, one per link, the
 * tool's mark on the left, a click to open.
 *
 * ── ROWS ARE DATA, NOT CHILDREN ───────────────────────────────────────────────────────
 *
 * Each row arrives already said — its mark, its name, the line under it, what opening it
 * does — so every plan draws its links the same way and nobody hand-lays a row. The mark is
 * whatever `IconComponent` the caller picked: a brand mark in its own colours, or a generic
 * glyph in the text colour, with `iconColor` for a monochrome brand that has one.
 *
 * ── REMOVING IS OFFERED, NOT SHOWN ────────────────────────────────────────────────────
 *
 * The bin appears under the pointer and on focus, never at rest: a list of links is read far
 * more often than it is pruned, and a column of bins would make every link look like a thing
 * about to be deleted. A row the reader may not remove has no bin at all — the database
 * decides who may, and the caller passes `remove` only where it will.
 *
 * ── THE FORM LIVES IN THE CARD ────────────────────────────────────────────────────────
 *
 * Adding a link opens a row of fields at the foot of the list — address, tool, name —
 * rather than a dialog: the link lands exactly where the form was, and the reader never
 * loses sight of the ones already there. Enter adds, Escape cancels.
 */
export interface ExternalLinkRow {
  id: string
  icon: IconComponent
  /** For a monochrome brand mark with a colour of its own. */
  iconColor?: string
  title: string
  /** The line under the name: the tool, who added it. */
  subtitle: string
  /** The address in full, as the row's tooltip. */
  href: string
  onOpen: () => void
  remove?: { label: string; onRemove: () => void }
}

export interface ExternalLinkForm {
  url: string
  onUrl: (value: string) => void
  urlPlaceholder: string
  title: string
  onTitle: (value: string) => void
  titlePlaceholder: string
  kind: string
  kinds: SelectOption[]
  onKind: (value: string) => void
  submitLabel: string
  cancelLabel: string
  onSubmit: () => void
  onCancel: () => void
  canSubmit: boolean
  busy?: boolean
  /** Why the last add did not land, already translated. */
  error?: string
}

export interface ExternalLinkCardProps {
  links: ExternalLinkRow[]
  /** Said when there is no link and no form open. */
  empty: string
  form?: ExternalLinkForm
}

export function ExternalLinkCard({ links, empty, form }: ExternalLinkCardProps) {
  if (links.length === 0 && !form) {
    return <p className="py-6 text-center text-sm text-text-secondary bg-surface-subtle rounded-xl">{empty}</p>
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!form) return
    if (e.key === 'Enter' && form.canSubmit && !form.busy) { e.preventDefault(); form.onSubmit() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); form.onCancel() }
  }

  return (
    <div className="rounded-xl bg-surface-subtle p-2 flex flex-col gap-0.5">
      {links.map((link) => {
        const Icon = link.icon
        return (
          <div key={link.id} className="group flex items-center gap-1 rounded-lg transition-colors hover:bg-surface-strong focus-within:bg-surface-strong">
            <button
              type="button"
              onClick={link.onOpen}
              title={link.href}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 text-left focus:outline-none"
            >
              <Icon className="h-4 w-4 shrink-0" style={link.iconColor ? { color: link.iconColor } : undefined} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-ink">{link.title}</span>
                <span className="truncate text-xs text-text-secondary">{link.subtitle}</span>
              </span>
            </button>
            {link.remove && (
              <span className="mr-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <ButtonIcon icon={Trash2} title={link.remove.label} onClick={link.remove.onRemove} tone="ghost" size="sm" />
              </span>
            )}
          </div>
        )
      })}

      {form && (
        <div className={`flex flex-col gap-2 p-2 ${links.length > 0 ? 'mt-1 border-t border-line-subtle pt-3' : ''}`}>
          <div className="flex items-center gap-2">
            <Input
              value={form.url}
              onChange={form.onUrl}
              placeholder={form.urlPlaceholder}
              type="url"
              size="md"
              autoFocus
              onKeyDown={onKey}
              className="min-w-0 flex-1"
            />
            {/* `fit`: a dozen tools, seen all at once. At `max-h-80` the list scrolled by one
                entry, behind a scrollbar nobody noticed. */}
            <Select value={form.kind} options={form.kinds} onChange={form.onKind} size="md" width={190} fit />
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={form.title}
              onChange={form.onTitle}
              placeholder={form.titlePlaceholder}
              size="md"
              onKeyDown={onKey}
              className="min-w-0 flex-1"
            />
            <Button size="sm" tone="ghost" onClick={form.onCancel}>{form.cancelLabel}</Button>
            <Button size="sm" tone="accent" onClick={form.onSubmit} disabled={!form.canSubmit} busy={form.busy}>
              {form.submitLabel}
            </Button>
          </div>
          {form.error && <p className="text-xs text-red">{form.error}</p>}
        </div>
      )}
    </div>
  )
}
