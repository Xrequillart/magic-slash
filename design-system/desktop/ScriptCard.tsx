import { Button } from './Button'
import { CircleStop, ExternalLink, Globe, XCircle } from './icons'
import { Icon } from './Icon'
import { Loader } from './Loader'
import { Text } from './Text'

/**
 * A script running on a repository, and the addresses it answers on.
 *
 * THE ONE FILLED CARD IN THE WHOLE COLUMN, and that is the point of it. Every other
 * block in a repository card is a plate at 5% ink; this one is solid purple. A process
 * the reader started is still alive on their machine, and it is the only thing in the
 * sidebar that is happening RIGHT NOW rather than being reported after the fact.
 *
 * PURPLE WHILE IT RUNS, RED WHEN IT DIED. Not a tone table: there are exactly two
 * states a script can be in that are worth a card, and a `state` prop with two values
 * says so more honestly than a scale with five rungs and three unused.
 *
 * THE URLS HANG OFF IT, attached rather than spaced — they are that script's addresses,
 * not further items in a list. So the card's radius belongs to the BLOCK: the bar loses
 * its bottom corners as soon as there is a row under it, and the last row takes them.
 *
 * WHAT IT NEVER KNOWS: how a script is started or stopped, what a terminal is, how to
 * open a browser, or how to shorten a URL for display. All of it arrives as callbacks
 * and finished strings — the app reads the addresses off the script's own output, and
 * `dev`, `web` and `storybook` are all the same kind of thing to this file.
 */

/** One address the script announced. */
export interface ScriptCardUrl {
  /** The address. The row's key, and what `onOpenUrl` is handed. */
  url: string
  /**
   * What the row shows. The app strips the scheme — `localhost:3000` rather than
   * `http://localhost:3000/` — which is a decision about how much of a URL a 288px
   * column can spare, not about what the address is.
   */
  label: string
  /** Tooltip and accessible name, translated. */
  title: string
}

export interface ScriptCardProps {
  /** The script's own name, as `package.json` spells it — `dev`, `build`. */
  name: string
  /**
   * The package it belongs to, on a monorepo. It PREFIXES the name, dimmed: three
   * packages each with a `dev` script would otherwise give three identical cards, and
   * which one is serving is the whole question a reader opens this card with.
   */
  workspace?: string
  /** Running, or exited non-zero. */
  state?: 'running' | 'error'
  /** The tooltip on the name — the app composes the full label. */
  title?: string
  /** Opening the script's terminal. The name and the mark are this control. */
  onOpen?: () => void
  /**
   * Stopping it. WORDED AND ALWAYS VISIBLE, never a hover reveal on a lone glyph:
   * stopping a server is the action a person comes to this card for, and a control that
   * only exists under the pointer cannot be found by someone looking for it.
   */
  stop?: { label: string; title: string; onStop: () => void }
  /** The addresses it answers on, each its own row under the bar. */
  urls?: ScriptCardUrl[]
  /** Handed the address. A callback and not a link: opening it is the app's to do. */
  onOpenUrl?: (url: string) => void
  /** Margins and width. Not the fill, the radius or either state's colour. */
  className?: string
}

export function ScriptCard({
  name,
  workspace,
  state = 'running',
  title,
  onOpen,
  stop,
  urls = [],
  onOpenUrl,
  className = '',
}: ScriptCardProps) {
  const served = urls.length > 0

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      {/* A ROW OF TWO BUTTONS, not a button with a button inside it. The stop control
          used to be a `<span>` carrying an `onClick` nested in the bar's own `<button>`
          — which renders, and which no keyboard can reach. Side by side they are both
          real controls, and the bar keeps the whole width it is not using. */}
      <div
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-on-brand ${
          state === 'running' ? 'bg-purple' : 'bg-red'
        } ${served ? 'rounded-t-lg' : 'rounded-lg'}`}
      >
        <button
          type="button"
          onClick={onOpen}
          title={title ?? name}
          disabled={!onOpen}
          className="flex flex-1 items-center gap-2 min-w-0 border-none bg-transparent p-0 text-left text-on-brand cursor-pointer disabled:cursor-default"
        >
          {/* `Loader`'s bars are `currentColor`, so the row's own `text-on-brand` is
              what makes them white against the fill — no tone needed. */}
          <span className="flex-shrink-0">
            {state === 'running' ? <Loader /> : <Icon glyph={XCircle} size="md" tone="inherit" />}
          </span>
          <Text tone="inherit" className="min-w-0 flex-1 truncate">
            {workspace ? `${workspace}/${name}` : name}
          </Text>
        </button>

        {stop && (
          /* NOT a `ButtonIcon`: that component is icon-only by construction and this
             control carries its verb in the open, which is the whole reason it reads.

             `overlay` IS THE TONE THIS CARD ASKED FOR. It was a hand-built chip here —
             `bg-on-brand/15`, its own radius, its own `text-[11px] font-semibold` — and
             every one of those values was this file inventing a control because no tone
             in the folder was mixed from the fill's ink rather than from the app's. Now
             one is, and the reasoning moved to where the next card on a fill can find it.

             `sm`, the list-row rung, and NOT one of the two below it. A chip nested in
             something else belongs down there, and this one is not decoration: the prop
             below says stopping a server is the action a person comes to this card for.
             It stands 6px taller than the hand-built chip did — 2px for being on the
             ladder at all, and 4px more since `Button` took a step up it for the air a
             borderless target needs. That is what it costs to be a control rather than a
             label, and the bar it sits on has the room. */
          <Button
            tone="overlay"
            size="sm"
            icon={CircleStop}
            title={stop.title}
            onClick={stop.onStop}
          >
            {stop.label}
          </Button>
        )}
      </div>

      {urls.map((entry, index) => (
        /* `bg-ink/5`, the card's own material, going a step up under the pointer — and
           `text-xs`, like everything else in the column. This was `text-sm` in a ruled
           box, on the argument that a link to hit should be bigger than the status line
           above it; it was the only 14px text anywhere in the sidebar, and one row set
           apart in its own size and its own frame reads as a fragment of another design
           rather than as emphasis. The ground carries the emphasis instead. */
        <button
          key={entry.url}
          type="button"
          onClick={() => onOpenUrl?.(entry.url)}
          title={entry.title}
          className={`group/url w-full flex items-center gap-2 px-2 py-1.5 border-none bg-ink/5 text-text-secondary cursor-pointer transition-colors hover:bg-ink/10 hover:text-ink ${
            index === urls.length - 1 ? 'rounded-b-lg' : ''
          }`}
        >
          <Icon glyph={Globe} tone="inherit" className="flex-shrink-0 text-purple" />
          <Text tone="inherit" className="min-w-0 flex-1 truncate text-left">
            {entry.label}
          </Text>
          <Icon
            glyph={ExternalLink}
            size="xs"
            tone="inherit"
            className="flex-shrink-0 opacity-60 transition-opacity group-hover/url:opacity-100"
          />
        </button>
      ))}
    </div>
  )
}
