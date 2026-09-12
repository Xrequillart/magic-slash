import { Avatar } from './Avatar'
import type { AvatarSize } from './avatarSizes'
import { Icon, type IconSize } from './Icon'
import { CLAUDE_CORAL, ClaudeCode, Github, Jira, MagicSlash } from './icons'
import { Text, type TextSize } from './Text'
import type { IconComponent } from './types'

/**
 * A mark and a word on a tinted plate — the app's one badge.
 *
 * It was eight things: `TrackerBadge` for a ticket id, `PlanIdBadge` for a plan's
 * number, `RepoNameBadge` for a repository, `ClaudeCodeBadge` in the agent card, the
 * account chip in the usage card, and three hand-built `LABEL_CHIP` spans in the
 * plans list. All of them `h-6 gap-1.5 px-2 rounded-lg text-xs font-medium`, and
 * every one of them respelling it — along with its own idea of which mark colour
 * went with which ground.
 *
 * WHAT IT IS NOT: a `Banner` addresses the reader, a `StatusPill` reports a state
 * that changes on its own. A label NAMES a thing — a ticket, a repository, a
 * product — and the thing does not change while you look at it.
 *
 * It draws an `Icon` or an `Avatar`, and a `Text`. Nothing else: no layout of its own
 * beyond the row, no second line, and above all no slot — a label with a `ReactNode`
 * inside is a label that will grow a button, and then it is a card. `avatar` is data
 * and not a node, which is the difference.
 */

/**
 * The grounds a label can sit on.
 *
 * FOUR OF THE FIVE ARE SOMEBODY ELSE'S, and that is why the tone exists at all: a
 * ticket from Jira wears Atlassian's blue, a Claude Code chip wears Anthropic's
 * coral, and neither colour may become a token in this app's palette — it would be
 * the app claiming a brand, and it would drift the day the palette is retuned. The
 * tone is where they are allowed to live, spelled once.
 *
 * GITHUB AND MAGIC SLASH ARE GREY on purpose, even though both own a colour. Grey
 * IS ours (`bg-ink/5`, the text colour at 5%), and a list mixing plan numbers,
 * GitHub issues and Jira tickets can afford exactly one loud row — spending Magic
 * Slash's brand here would make our own plans the loudest thing in it.
 */
export type LabelTone = 'neutral' | 'github' | 'jira' | 'claude-code' | 'magic-slash'

export const LABEL_TONES: readonly LabelTone[] = [
  'neutral',
  'github',
  'jira',
  'claude-code',
  'magic-slash',
]

interface ToneSpec {
  /** The plate. A class where the colour is ours, a hex where it is a brand's. */
  ground?: string
  groundStyle?: string
  /** The mark the tone brings with it. `neutral` brings none — the caller supplies one. */
  icon?: IconComponent
  /** A brand's own hue for the mark, where the mark is monochrome and the brand is not. */
  iconColor?: string
  /**
   * Whether the mark is a full-contrast one or the quiet grey. Monochrome brand marks
   * take the label's ink so they read as part of the word; a Lucide glyph on a neutral
   * plate is a decoration beside the word and stays muted.
   */
  iconTone: 'inherit' | 'muted'
}

const TONES: Record<LabelTone, ToneSpec> = {
  neutral: { ground: 'bg-ink/5', iconTone: 'muted' },
  github: { ground: 'bg-ink/5', icon: Github, iconTone: 'inherit' },
  // Atlassian's blue at 14%, and the mark keeps its own two blues inside its SVG.
  // ONE COLOURED THING PER LABEL: a brand hue at full saturation on its own 14% tint
  // is not a legible pair on every theme, and the ground already says whose chip it is.
  jira: { groundStyle: 'rgba(38, 132, 255, 0.14)', icon: Jira, iconTone: 'inherit' },
  'claude-code': {
    groundStyle: 'rgba(217, 119, 87, 0.14)',
    icon: ClaudeCode,
    iconColor: CLAUDE_CORAL,
    iconTone: 'inherit',
  },
  'magic-slash': { ground: 'bg-ink/5', icon: MagicSlash, iconTone: 'inherit' },
}

/**
 * Two, and they are the ticket badge's own.
 *
 * `sm` is a list row and a pinned bar — rows of 12px type where the label is the
 * tallest thing on the line. `md` stands beside a `text-2xl` page heading, where the
 * small one read as a caption that had come adrift from a title twice its size.
 *
 * A fixed HEIGHT and not padding alone: the label sets the height of the row it sits
 * in, so it is pinned rather than left to follow the line-height of whatever type the
 * theme resolves.
 */
export type LabelSize = 'sm' | 'md'

const SIZES: Record<LabelSize, { box: string; text: TextSize; icon: IconSize; avatar: AvatarSize }> = {
  sm: { box: 'h-6 gap-1.5 px-2 rounded-lg', text: 'xs', icon: 'sm', avatar: 'xs' },
  // The face is a rung LOUDER than the glyph beside it — 20px against the icon's 16 —
  // and that is not an oversight. A line-drawn glyph reads at any size; a photograph
  // has to be big enough to be a face, and an `md` label is 32px tall with the room
  // for it. At `sm` the two agree at 14px, which is what the plans list already drew.
  md: { box: 'h-8 gap-2 px-2.5 rounded-xl', text: 'sm', icon: 'md', avatar: 'sm' },
}

export interface LabelProps {
  /** The word. A ticket id, a repository, a product — see `Text` for why it is a string. */
  children: string
  tone?: LabelTone
  /**
   * Replaces the tone's own mark, and the only way to give a `neutral` label one.
   * A Lucide glyph or a brand mark — both come from `@ds/desktop/icons`.
   */
  icon?: IconComponent
  /**
   * A PERSON in front of the word instead of a glyph — the plans list names an
   * author this way. Wins over `icon` and over the tone's own mark.
   *
   * An object and not a node, which is the whole reason it can exist here: `{ src,
   * alt }` is data the label hands to `Avatar`, where a `ReactNode` would be a slot
   * and the end of this component being simple. The shape mirrors `Avatar`'s own two
   * required props, `alt` included — a label cannot invent alternative text any more
   * than an avatar can.
   *
   * Always the BARE fallback when there is no photo: a badge pill inside a label is a
   * plate inside a plate, and the glyph then takes the label's own mark colour so an
   * author with no photo draws like the glyphs either side of them.
   */
  avatar?: { src: string | null; alt: string }
  /**
   * A hue the design system does not own: a repository's colour, picked from the
   * sixteen the app assigns. The plate takes it at 12% and the mark at full strength,
   * which is the one place a label paints its mark in the ground's own colour — a
   * repository has no brand mark to be recognised by, so the colour has to do that job.
   *
   * Wins over the tone's ground. A hex rather than a class because the value is
   * chosen at runtime, and Tailwind cannot emit a class it never saw in the source.
   */
  color?: string
  size?: LabelSize
  /**
   * Makes it a BUTTON. Absent, it renders a `<span>` with no hover, no pointer and
   * nothing in the tab order — which is the whole point of the prop: a label that
   * lit up under the cursor and did nothing was the thing every one of these chips
   * got wrong in one direction or the other.
   */
  onClick?: () => void
  /** The tooltip. Without one, a truncated label has no way to say what it truncated. */
  title?: string
  /**
   * Lets the word shrink and ellipsise instead of holding the label's full width.
   * OFF by default: a ticket id truncated to `PER-12…` is not an id. On for the
   * things that are names — a repository, an account — which have no maximum length.
   */
  truncate?: boolean
  /** Margins and layout. Not the ground, the height or the radius. */
  className?: string
}

export function Label({
  children,
  tone = 'neutral',
  icon,
  avatar,
  color,
  size = 'sm',
  onClick,
  title,
  truncate = false,
  className = '',
}: LabelProps) {
  const spec = TONES[tone]
  const shape = SIZES[size]
  const Mark = icon ?? spec.icon

  const ground = color ? undefined : spec.ground
  const style = color ? { backgroundColor: `${color}1f` } : spec.groundStyle ? { backgroundColor: spec.groundStyle } : undefined

  // `flex-shrink-0` unless it truncates, and then `min-w-0` instead: a flex child
  // cannot shrink below its content without it, so a truncating label that kept
  // `flex-shrink-0` would simply push its row wider and never ellipsise.
  const fit = truncate ? 'min-w-0' : 'flex-shrink-0'
  const hover = onClick ? 'cursor-pointer transition-opacity hover:opacity-80' : ''

  // One resolution for both kinds of mark, so a face and a glyph are never two
  // different colours in the same row.
  const markTone = color || spec.iconTone !== 'muted' ? 'inherit' : 'muted'
  const markStyle = color ? { color } : spec.iconColor ? { color: spec.iconColor } : undefined

  const inner = (
    <>
      {avatar ? (
        // Wrapped rather than given a class of its own: `Avatar`'s bare glyph carries
        // no colour deliberately — it inherits — so the wrapper is where the label's
        // mark colour has to be stated for it to reach the fallback.
        <span
          className={`flex shrink-0 ${markTone === 'muted' ? 'text-icon-muted' : ''}`}
          style={markStyle}
        >
          <Avatar src={avatar.src} alt={avatar.alt} size={shape.avatar} fallback="glyph" />
        </span>
      ) : (
        Mark && (
          <Icon
            glyph={Mark}
            size={shape.icon}
            tone={markTone}
            className="flex-shrink-0"
            style={markStyle}
          />
        )
      )}
      <Text size={shape.text} className={truncate ? 'truncate' : ''}>
        {children}
      </Text>
    </>
  )

  const shared = `${shape.box} ${ground ?? ''} ${fit} inline-flex items-center text-ink ${className}`

  return onClick ? (
    <button onClick={onClick} title={title} style={style} className={`${shared} ${hover} border-none`}>
      {inner}
    </button>
  ) : (
    <span title={title} style={style} className={shared}>
      {inner}
    </span>
  )
}
