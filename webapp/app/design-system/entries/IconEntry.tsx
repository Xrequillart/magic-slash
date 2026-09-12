'use client'

// Two imports and not one, which is the folder's own rule: components come from the
// barrel, glyphs from `icons` directly. Routing four thousand icons through the
// component barrel would make every icon import drag the components behind it.
import { Icon, ICON_SIZES, type IconSize, type IconTone } from '@ds/desktop'
import {
  Bell,
  BotMessageSquare,
  Check,
  ClaudeCode,
  CLAUDE_CORAL,
  Clock,
  GitPullRequest,
  Github,
  Jira,
  MagicSlash,
  Play,
  Search,
  Sparkles,
  Trash2,
  VSCode,
} from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

/**
 * The Icon entry.
 *
 * Every glyph below is imported from `@ds/desktop` — the Lucide ones and the five
 * brand marks alike, which is the claim this page exists to make: they come from
 * one place and they are used the same way.
 */

const SIZES: { size: IconSize; note: string }[] = [
  { size: 'xs', note: 'a chip, a dense row' },
  { size: 'sm', note: 'the default — 249 uses in the app' },
  { size: 'md', note: 'a button, a list row' },
  { size: 'lg', note: 'a banner, a card head' },
  { size: 'xl', note: 'a page title' },
]

const TONES: { tone: IconTone; note: string }[] = [
  { tone: 'default', note: 'text-icon — anything readable or clickable' },
  { tone: 'muted', note: 'text-icon-muted — decoration, an unset affordance' },
  { tone: 'inherit', note: 'takes the colour of what it sits in' },
]

/** A handful of Lucide's, to stand for the four thousand. */
const LUCIDE = [
  { glyph: GitPullRequest, name: 'GitPullRequest' },
  { glyph: BotMessageSquare, name: 'BotMessageSquare' },
  { glyph: Sparkles, name: 'Sparkles' },
  { glyph: Clock, name: 'Clock' },
  { glyph: Search, name: 'Search' },
  { glyph: Bell, name: 'Bell' },
  { glyph: Check, name: 'Check' },
  { glyph: Play, name: 'Play' },
  { glyph: Trash2, name: 'Trash2' },
]

/**
 * `color` is each mark AS IT IS ACTUALLY WORN, which is the only honest way to show
 * one. Claude Code's robot is `currentColor` in the source, so a preview that did not
 * pass the coral drew it in the theme's grey — a colour it wears nowhere in the
 * product. Jira and VS Code carry their colours inside their own SVG and take none
 * from here.
 *
 * GitHub's mark and Magic Slash's own are monochrome, so they take the theme's INK:
 * white on the dark themes, black on the light ones. Ink and not `text-icon`, which
 * is the quieter grey the app gives a glyph beside a label — a brand mark on a page
 * about brand marks is the subject, not a decoration next to one.
 */
const BRAND: { glyph: typeof ClaudeCode; name: string; color?: string; note: string }[] = [
  { glyph: ClaudeCode, name: 'ClaudeCode', color: CLAUDE_CORAL, note: 'CLAUDE_CORAL' },
  { glyph: Jira, name: 'Jira', note: 'its own gradient' },
  { glyph: VSCode, name: 'VSCode', note: 'its own blues' },
  { glyph: Github, name: 'Github', note: 'ink — white on dark, black on light' },
  { glyph: MagicSlash, name: 'MagicSlash', note: 'ink — white on dark, black on light' },
]

const PROPS: PropRow[] = [
  {
    name: 'glyph',
    type: 'IconComponent',
    required: true,
    description: (
      <>
        The drawing — any Lucide export or any of the five brand marks, all from{' '}
        <code>@ds/desktop/icons</code>. A component and not a name: a registry keyed by string
        would hold a reference to all four thousand glyphs, and nothing could be shaken out of the
        bundle again.
      </>
    ),
  },
  {
    name: 'size',
    type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
    fallback: "'sm'",
    description:
      'Five rungs, taken from what the app already draws rather than from a doubling scale. sm is its most common icon by a factor of three, which is why it is the default.',
  },
  {
    name: 'tone',
    type: "'default' | 'muted' | 'inherit'",
    fallback: "'default'",
    description: (
      <>
        The theme has exactly two icon weights and both are opaque — <code>text-icon/50</code> is a
        bug, not a shade. That rule was written in <code>themes.ts</code> and unenforced until this
        prop. <code>inherit</code> is the way out, for a glyph that must take its parent’s colour.
      </>
    ),
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Colour and layout only — flex-shrink-0, a margin, the tone a Banner paints its mark with. Never a size: two width classes from the same group do not override each other by order, so whichever Tailwind emitted last would win.',
  },
]

// No `onOpen`: a foundation draws nothing but itself, so there are no chips to click
// through. The type now says so — `uses` and `onOpen` travel together or not at all.
export function IconEntry({ theme }: { theme: DesktopTheme }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Icon">
        Every glyph the app draws, at one of five sizes in one of three weights. It renders a
        drawing it is handed rather than looking one up by name — the four thousand from Lucide and
        the five marks this app owns are the same kind of thing here.
      </EntryHeader>

      <EntrySection
        title="Sizes"
        note="Five rungs, denser at the bottom than a doubling scale because that is where the app actually lives. Anything larger than xl is an illustration and belongs to its call site."
      >
        <Stage theme={theme} className="flex flex-wrap items-end gap-8">
          {SIZES.map(({ size, note }) => (
            <span key={size} className="flex flex-col items-center gap-2">
              <span className="flex h-8 items-end">
                <Icon glyph={GitPullRequest} size={size} />
              </span>
              <span className="font-mono text-[11px] text-ink">{size}</span>
              <span className="font-mono text-[10px] text-text-secondary">
                {ICON_SIZES[size]}
              </span>
            </span>
          ))}
        </Stage>
        <p className="text-xs text-muted">{SIZES.map((s) => `${s.size}: ${s.note}`).join(' · ')}</p>
      </EntrySection>

      <EntrySection
        title="Tones"
        note="Two weights and an escape hatch. Both weights are opaque colours tuned per theme, never an alpha of the text colour — change the theme in the rail and they move together."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {TONES.map(({ tone, note }) => (
            <span key={tone} className="flex items-center gap-3">
              <Icon glyph={Bell} size="lg" tone={tone} />
              <span className="font-mono text-xs text-ink">{tone}</span>
              <span className="text-xs text-text-secondary">{note}</span>
            </span>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="The library"
        note="Lucide, whole. The design system owns the dependency — it is declared in design-system/package.json and named in exactly one file — so neither app carries a version of its own and the two cannot drift apart again."
      >
        <Stage theme={theme} className="flex flex-wrap gap-6">
          {LUCIDE.map(({ glyph, name }) => (
            <span key={name} className="flex w-28 flex-col items-center gap-2">
              {/* `tone="inherit"` onto `text-ink` and NOT the component's own default.
                  `default` is `text-icon` — the muted grey a glyph wears beside a label
                  in the app, and correct there. On a sheet whose subject IS the glyph,
                  it reads as every icon being disabled. Ink follows the theme to full
                  contrast: white on the dark grounds, black on the light ones.
                  This is the PAGE's choice; the component's tones are unchanged and the
                  app still draws its icons in `text-icon`. See the Tones section above,
                  which shows the real thing. */}
              <Icon glyph={glyph} size="lg" tone="inherit" className="text-ink" />
              <span className="text-center font-mono text-[10px] text-text-secondary">
                {name}
              </span>
            </span>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="The marks"
        note="Five that Lucide does not have — it dropped every brand glyph in v1 — drawn here and exported from the same barrel. GitHub had two of these in the app, on two different grids, which is most of the reason this folder exists."
      >
        <Stage theme={theme} className="flex flex-wrap gap-6">
          {BRAND.map(({ glyph, name, color, note }) => (
            <span key={name} className="flex w-28 flex-col items-center gap-1.5">
              <Icon
                glyph={glyph}
                size="xl"
                tone="inherit"
                className={color ? '' : 'text-ink'}
                style={color ? { color } : undefined}
              />
              <span className="text-center font-mono text-[10px] text-ink">
                {name}
              </span>
              <span className="text-center font-mono text-[9px] text-text-secondary">
                {note}
              </span>
            </span>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Three ways a mark gets its colour, and the split is deliberate. Jira and VS Code carry
          theirs inside the SVG — a brand mark recoloured by the theme stops being the brand mark.
          Claude Code’s robot is drawn in <code>currentColor</code> and painted with{' '}
          <code>CLAUDE_CORAL</code>, because it sits on a coral-tinted chip in one place and may sit
          on a solid one next. GitHub’s and Magic Slash’s are monochrome, so they take the theme’s
          ink and go white on a dark ground and black on a light one — change the theme in the rail
          and only those two move.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Icon } from '@ds/desktop'
import { Github } from '@ds/desktop/icons'

<Icon glyph={Github} size="md" tone="muted" />`}</Snippet>
      </EntrySection>
    </article>
  )
}
