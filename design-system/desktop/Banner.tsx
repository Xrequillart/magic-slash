import type { ReactNode } from 'react'
import { Icon, type IconSize } from './Icon'
import { Text, type TextSize } from './Text'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from './icons'
import type { IconComponent } from './types'

/**
 * A tinted strip that states a FACT about the surface it sits on — not a
 * notification, not a toast, and not a disabled control's small print.
 *
 * The app had grown this shape a dozen times by hand (`bg-red/10 border
 * border-red/20 rounded-xl p-4`, `bg-yellow/10 … rounded-lg`, and the ticket
 * page's green one), each with its own padding, its own radius and its own mind
 * about whether it wears an outline. They are one component, and this is it.
 *
 * WHAT IT IS NOT: `Toast` is the transient one, raised over the app and gone on a
 * timer; this is part of the page and stays as long as the fact does. A badge or
 * a `StatusPill` labels a thing; a banner addresses the reader.
 *
 * Colour is the variant's whole job. Every tone names a role that the desktop's
 * theme registry paints, so a banner is legible on all eight themes without a
 * call site ever naming a colour.
 */

/**
 * The four things a banner can be saying. They are the reader's question —
 * "should I worry?" — and not the app's internal severity, which is why there is
 * no `neutral`: a strip with no colour is a card, and reaching for one here means
 * the sentence did not need a banner.
 */
export type BannerVariant = 'info' | 'success' | 'warning' | 'danger'

export const BANNER_VARIANTS: readonly BannerVariant[] = ['info', 'success', 'warning', 'danger']

interface BannerTone {
  /** The ground. 10% is the lightest tint that still reads as a tint on the light themes. */
  fill: string
  /** The icon, and the outline when there is one. Never the message: see `text-ink` below. */
  accent: string
  /** The outline, for `bordered`. Twice the fill's weight — a border at 10% disappears. */
  edge: string
  /**
   * The mark. A variant that could not name its own icon would be a variant with
   * no opinion, and the four would drift apart one call site at a time. A caller
   * may still override it — see `icon` — but never has to supply one.
   */
  icon: IconComponent
}

/**
 * Static strings, one per variant, because Tailwind reads source as TEXT:
 * `bg-${variant}/10` generates nothing and the banner comes out untinted. Every
 * class is spelled in full for the scanner, in both apps' `content` globs.
 *
 * `warning` is ORANGE and not the `yellow` a handful of hand-built strips still
 * use. Yellow is the colour this app gives a *pending* state — a check running, a
 * PR waiting — and a strip that warns is not a strip that waits. The stragglers
 * are the ones to move, not this table.
 */
const TONES: Record<BannerVariant, BannerTone> = {
  info: { fill: 'bg-blue/10', accent: 'text-blue', edge: 'border-blue/20', icon: Info },
  success: { fill: 'bg-green/10', accent: 'text-green', edge: 'border-green/20', icon: CircleCheck },
  warning: { fill: 'bg-orange/10', accent: 'text-orange', edge: 'border-orange/20', icon: TriangleAlert },
  danger: { fill: 'bg-red/10', accent: 'text-red', edge: 'border-red/20', icon: CircleAlert },
}

/**
 * How the message and the actions are arranged, and with them the type scale —
 * the two travel together rather than as two props. A banner is stacked exactly
 * when its column is too narrow for a sentence and a button side by side, and at
 * that width the sentence wants the smaller size anyway; splitting them into
 * `layout` and `size` would spell four combinations for the two that exist.
 */
export type BannerLayout = 'row' | 'stacked'

export const BANNER_LAYOUTS: readonly BannerLayout[] = ['row', 'stacked']

const LAYOUTS: Record<
  BannerLayout,
  { box: string; icon: IconSize; iconClass: string; text: TextSize; head: string }
> = {
  /** Full width: icon, sentence, actions pushed to the right edge, all on one line. */
  row: {
    box: 'flex items-center gap-3 px-4 py-3',
    icon: 'lg',
    iconClass: 'flex-shrink-0',
    text: 'sm',
    head: '',
  },
  /**
   * A narrow column (the ticket page's 256px rail): the sentence beside nothing,
   * the actions under the sentence. `items-start` and the mark's `mt-0.5` because
   * a wrapped sentence's first line is what it belongs beside.
   */
  stacked: {
    box: 'flex flex-col gap-2 px-3 py-3',
    icon: 'sm',
    iconClass: 'flex-shrink-0 mt-0.5',
    text: 'xs',
    head: 'flex items-start gap-2 min-w-0',
  },
}

export interface BannerProps {
  variant?: BannerVariant
  /**
   * Overrides the variant's own mark, for when the banner names a specific THING
   * rather than a severity: the ticket page's success banner is about an agent, so
   * it wears `BotMessageSquare` where a green tick would be vaguer.
   *
   * Takes any component accepting a `className`, which is what a Lucide icon is —
   * so a call site passes one of its own straight in, from whichever version of
   * the library that app happens to hold. Left out, the variant's icon is used and
   * the caller needs no icon library at all.
   */
  icon?: IconComponent
  /**
   * The sentence. A STRING, already translated — a banner never builds its own copy.
   *
   * Not a `ReactNode`, and it was one. A banner says ONE thing: everything that can
   * be done about it goes in `actions`, and everything that needs structure is not a
   * banner. Typed as text, the component can hand it to `Text` and own its size,
   * weight and colour — where a node would have arrived with all three already
   * decided at the call site, which is how the two copies of this banner ended up
   * spelling `text-sm text-ink` and `text-xs text-ink` by hand.
   */
  children: string
  /**
   * What can be done about it, if anything. A `row` banner pushes them to the
   * right edge, a `stacked` one puts them under the sentence. Style them in the
   * variant's own colour at the call site: buttons in here would need a tier per
   * tone for a shape that is one banner in the app.
   */
  actions?: ReactNode
  layout?: BannerLayout
  /**
   * An outline in the variant's colour. OFF by default: on a tinted ground it
   * adds a second edge to a shape that already has one, and the ticket page read
   * better without it. The wizards' error strips still want it, which is the only
   * reason it is a prop.
   */
  bordered?: boolean
  /**
   * Margins and widths only. The banner owns its ground, its padding and its
   * radius — a caller respelling those is the duplication this component ended.
   */
  className?: string
}

export function Banner({
  variant = 'info',
  // `override` and not `Icon`: that name belongs to the component this file renders
  // the mark WITH, and destructuring the prop into it shadowed the import — with an
  // error that talked about JSX construct signatures rather than about the shadowing.
  icon: override,
  children,
  actions,
  layout = 'row',
  bordered = false,
  className = '',
}: BannerProps) {
  const tone = TONES[variant]
  const shape = LAYOUTS[layout]
  const Mark = override ?? tone.icon

  const head = (
    <>
      {/* Through `Icon` rather than rendering the glyph directly: the size is a rung
          of the scale instead of two width classes spelled here, and a banner's mark
          then matches every other icon in the app by construction.

          `tone="inherit"` because this is the one thing a banner colours itself —
          the variant's accent IS the severity, and the theme's two icon weights have
          nothing to say about it. */}
      <Icon glyph={Mark} size={shape.icon} tone="inherit" className={`${tone.accent} ${shape.iconClass}`} />
      {/* `tone="ink"` — Text's own default — and NOT the variant's colour: the ground
          carries the severity and a whole sentence in red is a sentence nobody
          finishes reading. The mark is coloured, the words are not. */}
      <Text size={shape.text} className="min-w-0">
        {children}
      </Text>
    </>
  )

  return (
    <div
      className={`${shape.box} rounded-xl ${tone.fill} ${bordered ? `border ${tone.edge}` : ''} ${className}`}
    >
      {shape.head ? <span className={shape.head}>{head}</span> : head}
      {actions &&
        (layout === 'row' ? (
          <span className="ml-auto flex-shrink-0 flex items-center gap-2">{actions}</span>
        ) : (
          actions
        ))}
    </div>
  )
}
