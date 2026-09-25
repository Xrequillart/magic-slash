'use client'

import { PROJECT_COLORS, REPO_COLOR_CHOICES, REPO_QUICK_COLORS } from '@ds/desktop/palette'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, Stage } from '../parts'

/**
 * The colours entry.
 *
 * TWO KINDS, and the page's whole job is to keep them apart. A repository's colour is
 * a HEX chosen by a person and stored in their config; it is the same on every theme
 * and never becomes a variable. A theme token is a ROLE — `ink`, `surface`, `green` —
 * whose value the theme decides, and which a component names without ever knowing
 * what it resolves to.
 *
 * Mixing them is how a brand hex ends up in a palette and a token ends up hard-coded,
 * which is most of what this folder exists to prevent.
 */

/** The roles a component may name, in the order a surface is built up out of them. */
const TOKEN_GROUPS: { title: string; note: string; tokens: string[] }[] = [
  {
    title: 'Grounds',
    note: 'The window and the panels on it.',
    tokens: ['--c-bg', '--c-bg-secondary', '--c-bg-tertiary'],
  },
  {
    title: 'Surfaces',
    note: 'Raised and recessed, faintest first. Translucent by design — their alpha differs per theme.',
    tokens: [
      '--c-surface-subtle',
      '--c-surface',
      '--c-surface-strong',
      '--c-surface-sunken',
      '--c-surface-sunken-soft',
    ],
  },
  {
    title: 'Lines',
    note: 'Four weights, faintest first.',
    tokens: ['--c-line-subtle', '--c-line-field', '--c-line', '--c-line-strong', '--c-border'],
  },
  {
    title: 'Text and icons',
    note: 'Two text rungs and two icon weights — an icon is never an alpha of something.',
    tokens: ['--c-ink', '--c-text-secondary', '--c-icon', '--c-icon-muted', '--c-on-brand'],
  },
  {
    title: 'Brand and status',
    note: 'The accent, and the six the app reports state with.',
    tokens: [
      '--c-accent',
      '--c-accent-hover',
      '--c-green',
      '--c-orange',
      '--c-red',
      '--c-yellow',
      '--c-blue',
      '--c-purple',
      '--c-cyan',
      '--c-teal',
    ],
  },
]

/** A token is either bare `R G B` channels or a complete colour; both go in a `style`. */
function tokenColor(theme: DesktopTheme, token: string): string {
  const raw = theme.vars[token]
  if (!raw) return 'transparent'
  return /^\d+ \d+ \d+$/.test(raw) ? `rgb(${raw})` : raw
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex w-[104px] flex-col gap-1.5">
      <span
        className="h-9 w-full rounded-lg border border-line-subtle"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-[10px] leading-tight text-text-secondary">{label}</span>
    </span>
  )
}

export function ColorsEntry({ theme }: { theme: DesktopTheme }) {
  const quick = new Set(REPO_QUICK_COLORS)
  const fallback = new Set(PROJECT_COLORS)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Colours">
        Two kinds, and they do not mix. A repository’s colour is a hex a person picked and
        their config stores — the same on every theme, never a variable. A theme token is a
        role a component names without knowing what it resolves to.
      </EntryHeader>

      <EntrySection
        title="A repository’s colour"
        note="Eighteen hue families in spectrum order, each in a vivid and a deep tone — which is what makes the two halves read as two rows of the same rainbow rather than thirty-six unrelated dots. The deep tone is genuinely darker rather than one step down: a shade nobody can tell from its neighbour is not a choice."
      >
        <div className="flex flex-wrap gap-2">
          {REPO_COLOR_CHOICES.map((color) => (
            <span key={color} className="flex w-[68px] flex-col gap-1">
              <span
                className="h-10 w-full rounded-lg border border-hairline"
                style={{ backgroundColor: color }}
              />
              <span className="font-mono text-[9px] leading-tight text-muted">{color}</span>
              <span className="flex gap-1">
                {quick.has(color) && (
                  <span className="rounded bg-canvas px-1 text-[8px] font-medium text-muted">quick</span>
                )}
                {fallback.has(color) && (
                  <span className="rounded bg-canvas px-1 text-[8px] font-medium text-muted">auto</span>
                )}
              </span>
            </span>
          ))}
        </div>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-ink">quick</strong> marks the six the closed row
          offers without opening anything — the head of the grid in the grid’s own order, so the
          tile you just picked is directly above when you open the full one.{' '}
          <strong className="font-semibold text-ink">auto</strong> marks the ones handed out{' '}
          <em>by index</em> to a repository that never chose: every one of those is a promise about
          what an unconfigured repo already looks like elsewhere, which is why that list is
          appended to and never reordered.
        </p>
      </EntrySection>

      <EntrySection
        title="The theme’s tokens"
        note="What a component is allowed to name. Change the theme in the rail and every swatch below moves — that is the whole point of a role: the component says green and the theme decides which green reads on its ground."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          {TOKEN_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {group.title}
              </span>
              <span className="text-[11px] leading-snug text-text-secondary">{group.note}</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {group.tokens.map((token) => (
                  <Swatch key={token} color={tokenColor(theme, token)} label={token} />
                ))}
              </div>
            </div>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The surfaces and lines are drawn on the theme’s own ground because they are{' '}
          <em>translucent</em> — their alpha is part of the design and differs per theme, since
          black over a light window needs more of it than white over a dark one. A swatch of one on
          white would be a different colour than the app ever shows.
        </p>
      </EntrySection>
    </article>
  )
}
