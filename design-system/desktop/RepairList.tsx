import { Button } from './Button'
import { Copy, ExternalLink } from './icons'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * WHAT IS BROKEN, AND THE SHORTEST PATH TO IT NOT BEING — one line each, the fault on
 * the left and the one thing to do about it on the right.
 *
 * ── A FAULT WITHOUT A FIX IS A WORRY, NOT A STATUS ────────────────────────────────
 *
 * That is the whole reason this is a component and not four `<li>`s. The machine setup
 * card lists missing tools, unregistered MCP servers and absent skills, and each one had
 * grown its own button spelled out by hand — `px-2 py-1 text-[11px] font-medium
 * text-accent bg-accent/10 border border-accent/20 rounded-md` — four times, in three
 * shapes, one of them an `<a>` that looked like a button and one of them a `<button>`
 * wearing a monospace font. A reader was meant to understand from those that one would
 * install something, one would copy a command and one would open a page.
 *
 * ── THREE KINDS, BECAUSE THERE ARE THREE ANSWERS ──────────────────────────────────
 *
 * We can fix it ourselves; we know the command but cannot run it, so it can be copied;
 * or we can only point at a page. Collapsing them would strand somebody: a "Fix" button
 * that silently means "here is a page about it" is worse than no button. They are a
 * tagged union for `SettingRow.control`'s reason — a kind and its data go in, this draws
 * the control, and no call site gets to decide how loud a repair button is.
 *
 * ── EVERY FAULT WEARS THE SAME BULLET ─────────────────────────────────────────────
 *
 * It did not: the missing tools were bulleted and the missing MCP servers were not,
 * which made one list read as a list and the other as two loose sentences that happened
 * to have buttons beside them. They are the same kind of thing — something the machine
 * needs and has not got — so they are one list, and the count of red bullets is the
 * count of things to fix.
 */

/**
 * The one thing to do about a fault.
 *
 * `open` IS A BUTTON AND NOT AN ANCHOR, deliberately, and it is the one place this
 * folder gives up a real link. In Electron an `<a target="_blank">` is a renderer that
 * can be navigated away from the app, and the desktop already has one handler for
 * "open this in the system browser" — so the caller passes what to run and keeps that
 * handler, rather than this folder guessing which of the two environments it is in.
 */
export type RepairAction =
  | {
      kind: 'fix'
      /** The verb, translated. While `busy`, the caller's own "…ing" word. */
      label: string
      icon?: IconComponent
      busy?: boolean
      disabled?: boolean
      onClick: () => void
    }
  | {
      kind: 'copy'
      /** The command itself — it IS the label, in monospace, because it is what you get. */
      command: string
      /** What the button says for the second after it was copied. Translated. */
      copiedLabel: string
      /** This command is the one in the clipboard. The caller owns the timer. */
      copied?: boolean
      onCopy: (command: string) => void
    }
  | {
      kind: 'open'
      /** The verb, translated — "Get it", not the URL. */
      label: string
      onOpen: () => void
    }

export interface RepairRow {
  /** Stable across renders — the tool's or the server's own id. Never the index. */
  id: string
  /** What is wrong, in one line. Translated, and a fact rather than an instruction. */
  message: string
  /** Absent draws the fault alone: something to fix that we have no way to fix. */
  action?: RepairAction
}

export interface RepairListProps {
  rows: RepairRow[]
  /** Margins. Not the gaps or the type. */
  className?: string
}

export function RepairList({ rows, className = '' }: RepairListProps) {
  if (rows.length === 0) return null

  return (
    <ul className={`space-y-2 ${className}`.trim()}>
      {rows.map(({ id, message, action }) => (
        <li key={id} className="flex items-start justify-between gap-2">
          {/* `text-xs` on the row so the bullet, which is a bare glyph rather than a
              `Text`, is set at the same rung as the line it marks. */}
          <div className="flex min-w-0 gap-1.5 text-xs">
            {/* Red, and the only red on a card that may otherwise be green: the bullet is
                the count. */}
            <span aria-hidden className="shrink-0 text-red">
              •
            </span>
            <Text size="xs" tone="secondary" className="block leading-snug opacity-70">
              {message}
            </Text>
          </div>
          {action && (
            <div className="shrink-0">
              {action.kind === 'fix' ? (
                <Button
                  size="xs"
                  tone="accent"
                  icon={action.icon}
                  busy={action.busy}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ) : action.kind === 'copy' ? (
                // The command in monospace because it is a command, and the word "Copied"
                // in its place for a moment because a clipboard write has no other tell.
                <Button
                  size="xs"
                  tone="neutral"
                  icon={Copy}
                  onClick={() => action.onCopy(action.command)}
                  className={action.copied ? '' : 'font-mono'}
                >
                  {action.copied ? action.copiedLabel : action.command}
                </Button>
              ) : (
                <Button size="xs" tone="neutral" icon={ExternalLink} onClick={action.onOpen}>
                  {action.label}
                </Button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
