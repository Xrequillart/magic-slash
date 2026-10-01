import { useState, type KeyboardEvent } from 'react'
import { Plus, Trash } from './icons'
import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Input } from './Input'
import { Text } from './Text'

/**
 * A CUSTOM STEP'S OUTCOMES, AS A TABLE: one row per outcome, its name as the skills spell
 * it, what leaves the step on it, and a way to remove it; under them, a field to add one.
 *
 * A TABLE AND NOT CHIPS. An outcome is not a tag on the step: it is a way out of it, with
 * its own port on the card and its own links, and a row says so where a chip would only
 * say the word. The second column is what makes it a table: how many links leave on that
 * outcome, which is what removing it costs.
 *
 * IT KNOWS NO FLOW. The names come in, the whole new list goes out (`onChange`), and the
 * second column is the caller's words, already counted and translated.
 */

export interface OutcomeTableLabels {
  /** The first column's heading: "Outcome". */
  outcome: string
  /** The second column's heading: "Links". */
  links: string
  /** No outcome yet: "None: every link applies whatever the skill ended on." */
  empty: string
  /** The add field's prompt, and its button's word. */
  placeholder: string
  add: string
  /** The trash's tooltip, the outcome's name after it for a screen reader. */
  remove: string
}

export interface OutcomeTableProps {
  items: string[]
  /** The whole new list, on every add and every removal. */
  onChange: (items: string[]) => void
  labels: OutcomeTableLabels
  /** By outcome, the second column's cell: "2 links", "No link". Blank when absent. */
  details?: Readonly<Record<string, string>>
  /** Look, don't touch: no trash, no add row. */
  disabled?: boolean
  /** The add field's id. */
  id?: string
  /** Margins and width. */
  className?: string
}

export function OutcomeTable({
  items,
  onChange,
  labels,
  details = {},
  disabled = false,
  id,
  className = '',
}: OutcomeTableProps) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value) return
    if (!items.includes(value)) onChange([...items, value])
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }

  return (
    <div className={`flex w-full min-w-0 flex-col gap-2 ${className}`.trim()}>
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-surface-subtle">
              <th scope="col" className="px-2.5 py-1.5"><Text size="2xs" tone="secondary" weight="bold">{labels.outcome}</Text></th>
              <th scope="col" className="w-24 px-2.5 py-1.5"><Text size="2xs" tone="secondary" weight="bold">{labels.links}</Text></th>
              {!disabled && <th scope="col" className="w-9" aria-hidden="true" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item} className="border-t border-line">
                <td className="px-2.5 py-1.5">
                  {/* `<code>`: the name is the skills', spelled exactly as they read it. */}
                  <code className="block truncate font-mono text-[11px] text-ink" title={item}>{item}</code>
                </td>
                <td className="truncate px-2.5 py-1.5 align-top">
                  <Text size="2xs" tone="secondary">{details[item] ?? ''}</Text>
                </td>
                {!disabled && (
                  <td className="px-1 py-1 text-right align-top">
                    <ButtonIcon icon={Trash} title={`${labels.remove} ${item}`} tone="ghost" size="sm" onClick={() => onChange(items.filter((one) => one !== item))} />
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={disabled ? 2 : 3} className="px-2.5 py-2">
                  <Text size="2xs" tone="secondary">{labels.empty}</Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <div className="flex min-w-0 gap-2">
          <Input id={id} value={draft} onChange={setDraft} onKeyDown={onKeyDown} placeholder={labels.placeholder} className="min-w-0 flex-1" />
          <Button tone="neutral" icon={Plus} onClick={add} disabled={!draft.trim()}>{labels.add}</Button>
        </div>
      )}
    </div>
  )
}

