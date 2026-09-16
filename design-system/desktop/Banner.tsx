import { Button, type ButtonSize } from './Button'
import { Icon, type IconSize } from './Icon'
import { Text, type TextSize } from './Text'
import { CircleAlert, CircleCheck, Info, MousePointerClick, TriangleAlert } from './icons'
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
 * The five things a banner can be saying. Four of them are the reader's question —
 * "should I worry?" — and not the app's internal severity, which is why there is
 * no `neutral`: a strip with no colour is a card, and reaching for one here means
 * the sentence did not need a banner.
 *
 * `accent` IS THE FIFTH AND IT IS NOT A SEVERITY. It is for a MODE the reader put
 * the app into and can leave again — the Tasks board being used to choose a ticket
 * for an agent rather than to read one. Nothing is wrong, nothing has succeeded,
 * and none of the four would be true; what the strip is doing is explaining why
 * the surface underneath it behaves differently for as long as it is there. The
 * app's own accent is the right colour for exactly that reason: it is the one hue
 * that means "you did this", where the other four report what happened to you.
 */
export type BannerVariant = 'info' | 'success' | 'warning' | 'danger' | 'accent'

export const BANNER_VARIANTS: readonly BannerVariant[] = [
  'info',
  'success',
  'warning',
  'danger',
  'accent',
]

interface BannerTone {
  /** The ground. 10% is the lightest tint that still reads as a tint on the light themes. */
  fill: string
  /** The icon, and the outline when there is one. Never the message: see `text-ink` below. */
  accent: string
  /** The outline, for `bordered`. Twice the fill's weight — a border at 10% disappears. */
  edge: string
  /**
   * The little rounded plate the mark sits on in the `band` layout, and nowhere else.
   *
   * A band has no tint of its own to carry the variant — it is opaque, see `LAYOUTS`
   * — so the colour has to live somewhere, and it lives under the icon. 15% and not
   * the fill's 10%: a 28px square has a fraction of a full-width strip's area, and
   * the same tint on it reads as grey.
   */
  plate: string
  /**
   * The variant's colour as a VALUE rather than as a class — what the buttons are handed.
   *
   * A THIRD SPELLING OF THE SAME HUE, and it is not redundancy: `Button`'s `tint` and
   * `fill` take a colour they mix themselves, and no class can be handed to them. This is
   * `prTones.ts`'s `PR_COLOR` move, for the same reason and with the same shape.
   *
   * EACH CARRIES THE FALLBACK the two Tailwind configs carry, and it is load-bearing: an
   * undefined variable makes the whole `color-mix` invalid, so a page that had not posted
   * a theme would draw a button with NO background at all rather than a slightly wrong
   * green.
   */
  value: string
  /**
   * The mark. A variant that could not name its own icon would be a variant with
   * no opinion, and the four would drift apart one call site at a time. A caller
   * may still override it — see `icon` — but never has to supply one.
   */
  icon: IconComponent
}

/**
 * One gesture a banner offers, AS DATA. The banner draws the `Button` itself.
 *
 * NO TONE, NO SIZE, NO CLASSES. That is the whole of the bargain and it is what the
 * `ReactNode` this replaces could not keep: a node arrives with its shape, its padding
 * and its colour already decided at the call site, which is exactly how the hand-built
 * strips this component replaced came to disagree in the first place. Three of these
 * lists were nodes until recently and between them they spelled four different button
 * chromes — one `bg-green text-bg`, one `border border-green/40`, one `border-line` on a
 * band, and the banner's own `h-6 px-2` chip.
 *
 * THE COLOUR IS THE VARIANT'S, ALWAYS. A `success` banner's buttons are the green, a
 * `danger` one's are the red, and the call site has nothing to decide and therefore
 * nothing to spell. The one place this changes what was on screen is the pick-a-ticket
 * band, whose cancel was a neutral outline: it now wears the accent like everything else
 * on that strip, which is what the rest of this file has always claimed happens.
 */
export interface BannerAction {
  /** The word on it, already translated. */
  label: string
  onClick: () => void
  /**
   * A mark before the word.
   *
   * IT WAS ONCE FORBIDDEN HERE, on the argument that the strip's own mark already says
   * what kind of thing this is. That held while a banner had ONE button; it does not hold
   * for a pair, where the glyph is the fastest way to tell "View agent" from "Detach" in
   * a row read at a glance. Optional, and a single button rarely needs one.
   */
  icon?: IconComponent
  /**
   * THE LOUDER OF THE TWO RANKS — filled with the variant's colour rather than tinted
   * with it. At most one per banner: two primaries are none.
   *
   * IT ALSO DECIDES WHERE THIS SITS, which is the rule that used to live at the call
   * sites and be spelled twice. A row puts the primary LAST, against the right edge the
   * eye arrives at; a stacked column puts it FIRST, at the top, because that is where a
   * ranking reads when it runs downwards. The ticket page had the same pair written out
   * in both orders for exactly this reason, and either could have been edited without
   * the other.
   */
  primary?: boolean
  /**
   * The gesture is in flight: the button dims and refuses a second click.
   *
   * No spinner. The banner is about to be replaced by the fact it is fetching — a
   * watcher switched back on redraws this whole strip as a checklist — so a loader
   * here would animate for the moment before its own container disappears.
   */
  busy?: boolean
  /** The native tooltip, when the word alone does not say what will happen. */
  title?: string
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
  info: { fill: 'bg-blue/10', accent: 'text-blue', edge: 'border-blue/20', plate: 'bg-blue/15', value: 'rgb(var(--c-blue, 59 130 246))', icon: Info },
  success: { fill: 'bg-green/10', accent: 'text-green', edge: 'border-green/20', plate: 'bg-green/15', value: 'rgb(var(--c-green, 34 197 94))', icon: CircleCheck },
  warning: { fill: 'bg-orange/10', accent: 'text-orange', edge: 'border-orange/20', plate: 'bg-orange/15', value: 'rgb(var(--c-orange, 249 115 22))', icon: TriangleAlert },
  danger: { fill: 'bg-red/10', accent: 'text-red', edge: 'border-red/20', plate: 'bg-red/15', value: 'rgb(var(--c-red, 239 68 68))', icon: CircleAlert },
  // The default mark says what an accent band always says: the click means something
  // else while this is here. A variant that named no icon would be a variant with no
  // opinion — though this is the one tone whose callers nearly always bring their own,
  // because a mode is a specific thing and `TicketPlus` says which.
  accent: { fill: 'bg-accent/10', accent: 'text-accent', edge: 'border-accent/20', plate: 'bg-accent/15', value: 'rgb(var(--c-accent, 99 102 241))', icon: MousePointerClick },
}

/**
 * How the message and the actions are arranged, and with them the type scale —
 * the two travel together rather than as two props. A banner is stacked exactly
 * when its column is too narrow for a sentence and a button side by side, and at
 * that width the sentence wants the smaller size anyway; splitting them into
 * `layout` and `size` would spell four combinations for the two that exist.
 */
export type BannerLayout = 'row' | 'stacked' | 'band' | 'inset'

export const BANNER_LAYOUTS: readonly BannerLayout[] = ['row', 'stacked', 'band', 'inset']

/**
 * The `band` layout's height, in pixels, and the reason it is a number anybody can
 * import — `TITLE_BAR_HEIGHT`'s reason exactly.
 *
 * A band is PINNED, and nothing pinned is ever alone on a page: the Tasks board has a
 * filter bar under this one and column headings under that, and a sticky element knows
 * nothing about the sticky element above it. Each of them offsets itself by whatever is
 * already there, so the height has to be a value they can all read. Two places holding
 * the same 53 is how one of them ends up holding 57.
 *
 * 53 is what the shape comes to: two 16px lines of text between 10px of padding either
 * side, plus the hairline. It is stated rather than computed because the padding is a
 * class and the hairline is a border — there is nothing to compute it from that would
 * not itself be a second spelling of the same three numbers.
 */
export const BANNER_BAND_HEIGHT = 53

interface BannerShape {
  box: string
  icon: IconSize
  iconClass: string
  text: TextSize
  head: string
  /**
   * The rung the buttons stand on, which is the layout's and not the caller's — the
   * `icon` and `text` rungs above are the layout's for the same reason. A strip whose
   * button size were a prop would be a strip that can disagree with itself.
   */
  button: ButtonSize
  /**
   * The mark goes on its own little tinted square rather than bare on the ground.
   *
   * Only the band does this, and only because the band is opaque: with no tint across
   * the strip there is nowhere else for the variant's colour to be, and a lone coloured
   * glyph on a full-width neutral bar reads as an icon somebody forgot to align.
   */
  plate?: boolean
  /**
   * The ground, for a layout that does not take the variant's tint. Absent, the tint
   * is used — and with it the radius, unless `square` says otherwise.
   */
  ground?: string
  /**
   * The variant's tint, with no radius under it.
   *
   * Only the `inset` layout, and only because it is the one layout that takes the tint
   * WITHOUT floating on a page: it spans a card's band edge to edge, and a radius there
   * is a corner with the card's own ground showing through it. The `band` layout is
   * square for the same reason and does not need the flag — it brings a `ground` of its
   * own, which already replaces the radius.
   */
  square?: boolean
  /**
   * The message and the hint wrap instead of truncating.
   *
   * A band pinned across a window can truncate: there is always more width to be had by
   * making the window wider, and what it names is usually a thing the reader chose. An
   * `inset` band has no such width to find — it is as wide as the card it is a band of,
   * and that card is 248px inside a sidebar at its minimum. What it says there is a
   * failure and the FIX for it, and a truncated fix is a fix nobody can follow.
   *
   * BOTH LINES OR NEITHER. Truncating the message while the fix below it wrapped would
   * cut off the shorter of the two, which is the wrong one to lose.
   */
  wrap?: boolean
  /** A fixed height, for a layout whose height other things measure themselves against. */
  height?: number
}

const LAYOUTS: Record<BannerLayout, BannerShape> = {
  /** Full width: icon, sentence, actions pushed to the right edge, all on one line. */
  row: {
    box: 'flex items-center gap-3 px-4 py-3',
    icon: 'lg',
    iconClass: 'flex-shrink-0',
    text: 'sm',
    head: '',
    // 28px, which is what the ticket page's pair already stood at by hand.
    button: 'md',
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
    // The row's rung, not a smaller one: these go FULL WIDTH under the sentence, and a
    // 24px bar across a 256px column reads as a control that shrank.
    button: 'md',
  },
  /**
   * A BAND: full-bleed, square-cornered, opaque, with a hairline under it — the shape
   * a strip takes when it is pinned to the top of a scrolling pane rather than sitting
   * in a page's flow.
   *
   * OPAQUE IS THE WHOLE POINT and it is not a matter of taste. Every other layout is a
   * 10% tint, which is exactly right on a page and wrong the moment the thing is
   * `sticky`: the content scrolls UNDER it, and a translucent bar shows the rows sliding
   * about behind the words. The variant's colour moves to the mark's plate instead.
   *
   * Square corners for the same reason. A radius is a shape floating on a page; a band
   * spans its pane edge to edge and a rounded corner there is a gap with the scrolling
   * content showing through it.
   *
   * `px-6` because the panes this pins to have no padding of their own — the band is a
   * sibling of the page's layers, not a child of them, so it pays for its own gutter and
   * pays the same 24px the layers inside it do.
   */
  band: {
    box: 'flex items-center gap-3 px-6',
    // `sm` in a 28px plate: 16px of mark leaves 6px of tint visible all round, which is
    // what makes the square read as a plate rather than as a box the icon overflowed.
    icon: 'sm',
    iconClass: '',
    text: 'xs',
    head: 'flex items-center gap-3 min-w-0',
    // 24px inside a 53px band. A `md` here would leave 12px of air above and below it
    // and the band would read as a toolbar.
    button: 'sm',
    plate: true,
    ground: 'bg-bg-secondary border-b border-line',
    height: BANNER_BAND_HEIGHT,
  },
  /**
   * INSIDE something else: one band of a card, between two hairlines the card draws.
   *
   * It is the `band` shape at a card's scale rather than a window's — full-bleed and
   * square for the same reason, since a card's band spans the card edge to edge. What
   * it does NOT take from the band is the opacity and the plate: nothing scrolls under
   * a band that is part of a card's flow, so the variant's tint can stay where it is on
   * every other layout, across the whole strip. A 28px plate in a 288px sidebar would
   * be the largest thing in the card.
   *
   * `items-start` AND NOT `items-center`, which every other layout uses. This is the
   * one place a hint wraps (see `wrap`), and a centred mark beside three lines of fix
   * floats in the middle of them; what it belongs beside is the message's own line.
   * The `mt-px` on the mark is that line's optical centre — 16px of glyph against a
   * 16px strut sits a hair high without it.
   *
   * `px-3 py-2` and not the row's `px-4 py-3`: the bands above and below it are
   * `CollapsibleLine`s at `px-3`, and a strip that paid for a wider gutter than the
   * rows it is stacked with would read as a different object rather than as the same
   * list interrupted.
   */
  inset: {
    box: 'flex items-start gap-2 px-3 py-2',
    icon: 'sm',
    iconClass: 'flex-shrink-0 mt-px',
    text: 'xs',
    head: 'flex items-start gap-2 min-w-0 flex-1',
    // 24px, which is what this layout's one button already was — and what a
    // `ButtonIcon` at `sm` is, so a card growing one of each has one control height.
    button: 'sm',
    square: true,
    wrap: true,
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
   * A second, quieter line UNDER the sentence — and the only structure a banner has.
   *
   * It exists for the one thing a mode band has to say and a page banner does not:
   * what is different while this is on screen. "Choose a ticket for Ada" is the fact;
   * "clicking a card attaches it instead of opening it" is why the band is pinned
   * rather than merely rendered, and putting the two in one sentence makes a sentence
   * nobody finishes.
   *
   * A STRING, for `children`'s reason, and drawn at the layout's own text rung in
   * secondary ink — a hint that names its own size is a hint that will disagree with
   * the sentence above it on some other screen.
   *
   * NOT A PLACE FOR A SECOND FACT. Two facts are two banners, or a card.
   */
  hint?: string
  /**
   * WHAT CAN BE DONE ABOUT IT, as data — the banner draws every button itself.
   *
   * ONE PROP WHERE THERE WERE TWO. There was an `action` taking a single typed object and
   * an `actions` taking a `ReactNode`, and the second existed only because this folder had
   * no button tier to rank a pair with. It has one now — see `BannerAction.primary` — so
   * the node is gone and with it the last way for a call site to put its own chrome on a
   * banner.
   *
   * TWO IS THE CEILING IN PRACTICE, not in the type: a banner says one thing, and three
   * buttons on a strip is a dialog that forgot to be one. The type does not enforce it
   * because the one rule worth enforcing — at most one primary — is about rank rather
   * than count, and a list of two unranked verbs is legitimate.
   *
   * AN EMPTY OR ABSENT LIST DRAWS NOTHING, which is what the call sites need: the ticket
   * page's pair exists only when there is a local agent to view, and `actions={agentId ?
   * [...] : undefined}` should be the whole of that at the call site rather than a
   * conditional wrapped around a fragment.
   *
   * A `row` and a `band` push them to the right edge; a `stacked` column puts them full
   * width under the sentence, because there is no right edge in 256px to push anything to.
   */
  actions?: BannerAction[]
  layout?: BannerLayout
  /**
   * An outline in the variant's colour. OFF by default: on a tinted ground it
   * adds a second edge to a shape that already has one, and the ticket page read
   * better without it. The wizards' error strips still want it, which is the only
   * reason it is a prop.
   *
   * IGNORED BY THE BAND, which carries a hairline under it as part of being a band
   * and has no tint for a coloured outline to belong to.
   */
  bordered?: boolean
  /**
   * Margins and widths only. The banner owns its ground, its padding and its
   * radius — a caller respelling those is the duplication this component ended.
   *
   * A band's PINNING goes here, and it is the exception that proves the rule: where
   * an element sticks and what it stacks above are facts about the page around it,
   * which is the one thing this folder cannot know. `sticky top-0 z-30` is the caller's
   * to write; the ground, the height and the hairline are not.
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
  hint,
  actions,
  layout = 'row',
  bordered = false,
  className = '',
}: BannerProps) {
  const tone = TONES[variant]
  const shape = LAYOUTS[layout]
  const Mark = override ?? tone.icon
  const stacked = layout === 'stacked'

  /**
   * THE RANK DECIDES THE ORDER, and the component decides what the rank means — which is
   * the whole point of the list being data. The primary goes LAST in a row, against the
   * right edge the eye arrives at, and FIRST in a stacked column, at the top where a
   * ranking reads when it runs downwards. Both orders were spelled by hand at two call
   * sites that drew the same pair, and either could have been edited without the other.
   *
   * A stable partition rather than a sort: `Array.prototype.sort` is stable in every
   * engine this ships on, but a partition SAYS there are two groups where a comparator
   * only implies it, and it keeps the caller's order inside each group.
   */
  const list = actions ?? []
  const lead = list.filter((entry) => entry.primary)
  const rest = list.filter((entry) => !entry.primary)
  const ordered = stacked ? [...lead, ...rest] : [...rest, ...lead]

  const buttons = ordered.map((entry) => (
    <Button
      key={entry.label}
      // `fill` for the one that is the point, `tint` for the way round it — and the hue
      // is the variant's in both cases, handed over as a value because no class can
      // reach a colour Tailwind never saw. See `BannerTone.value`.
      tone={entry.primary ? 'fill' : 'tint'}
      color={tone.value}
      size={shape.button}
      icon={entry.icon}
      onClick={entry.onClick}
      disabled={entry.busy}
      title={entry.title}
      // FULL WIDTH ONLY WHEN STACKED. The column is 256px and a button hugging its word
      // in the middle of it reads as something that failed to lay out; in a row the
      // opposite is true and a stretched button would eat the sentence.
      className={stacked ? 'w-full' : ''}
    >
      {entry.label}
    </Button>
  ))

  const mark = (
    <Icon
      glyph={Mark}
      size={shape.icon}
      tone="inherit"
      className={`${shape.plate ? '' : tone.accent} ${shape.iconClass}`.trim()}
    />
  )

  const head = (
    <>
      {/* Through `Icon` rather than rendering the glyph directly: the size is a rung
          of the scale instead of two width classes spelled here, and a banner's mark
          then matches every other icon in the app by construction.

          `tone="inherit"` because this is the one thing a banner colours itself —
          the variant's accent IS the severity, and the theme's two icon weights have
          nothing to say about it. On a plate the colour is stated once on the plate
          and inherited down, so the tint and the mark cannot disagree. */}
      {shape.plate ? (
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tone.plate} ${tone.accent}`}
        >
          {mark}
        </span>
      ) : (
        mark
      )}
      {/* `tone="ink"` — Text's own default — and NOT the variant's colour: the ground
          carries the severity and a whole sentence in red is a sentence nobody
          finishes reading. The mark is coloured, the words are not. */}
      {hint ? (
        // A column, and both lines do the same thing: a layout that truncated the
        // message while letting the fix under it wrap would be cutting the shorter of
        // the two off. Which thing they do is `wrap`'s.
        <span className="flex flex-col min-w-0">
          <Text size={shape.text} className={shape.wrap ? '' : 'truncate'}>
            {children}
          </Text>
          <Text size={shape.text} tone="secondary" className={shape.wrap ? '' : 'truncate'}>
            {hint}
          </Text>
        </span>
      ) : (
        <Text size={shape.text} className="min-w-0">
          {children}
        </Text>
      )}
    </>
  )

  return (
    <div
      className={`${shape.box} ${
        shape.ground ??
        `${shape.square ? '' : 'rounded-xl'} ${tone.fill} ${bordered ? `border ${tone.edge}` : ''}`
      } ${className}`}
      // The height as the exported number rather than as a class, for the reason
      // `BANNER_BAND_HEIGHT` gives: the things that pin under a band lay themselves out
      // against exactly this value, and a class would be a second place to change it.
      style={shape.height ? { height: shape.height } : undefined}
    >
      {shape.head ? <span className={shape.head}>{head}</span> : head}
      {ordered.length > 0 &&
        /* `flex-shrink-0` and `ml-auto` for the reason every other trailing slot has them:
           the head beside it carries `min-w-0` and would otherwise hand these the squeeze
           instead of truncating its own sentence. A stacked column has neither — it is
           already below the sentence and already the full width. */
        (stacked ? (
          <span className="flex flex-col gap-2">{buttons}</span>
        ) : (
          <span className="ml-auto flex flex-shrink-0 items-center gap-2">{buttons}</span>
        ))}
    </div>
  )
}
