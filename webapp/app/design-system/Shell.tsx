'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS, type DesktopTheme, type DesktopThemeId } from '@/lib/desktopTheme'
import { AvatarEntry } from './entries/AvatarEntry'
import { ButtonIconEntry } from './entries/ButtonIconEntry'
import { CardEntry } from './entries/CardEntry'
import { ColorsEntry } from './entries/ColorsEntry'
import { ContextAgentCardEntry } from './entries/ContextAgentCardEntry'
import { BannerEntry } from './entries/BannerEntry'
import { IconEntry } from './entries/IconEntry'
import { LabelEntry } from './entries/LabelEntry'
import { ProgressBarEntry } from './entries/ProgressBarEntry'
import { TextEntry } from './entries/TextEntry'
import { ENTRY_LABELS, ENTRY_NOTES, FAMILIES, FOUNDATION_PAGES, type EntryId } from './entries/ids'

/**
 * The desktop app's design system: a rail of components on the left, one of them
 * on the right.
 *
 * A rail rather than the single scrolling page `/design-system-web` uses, and the
 * difference is not taste. That page documents a SCALE — shadows, radii, edges —
 * where the whole point is seeing twenty cards at once and catching the rung that
 * sags. This one documents COMPONENTS, extracted one at a time into
 * `design-system/desktop/`, and a component wants the page to itself: its
 * variants, its layouts, its props, with nothing else competing.
 *
 * Everything under `/design-system` is the REAL component, imported from the
 * shared folder that the Electron app compiles too. There is no copy of a banner
 * on this site to fall out of date with the one in the app.
 *
 * THE RAIL LISTS ONLY WHAT EXISTS. It carried a second half naming the components
 * still inside the app, as a migration map; that list is gone. A rail is a way
 * around a thing, and half of it leading nowhere made every row look uncertain —
 * the backlog belongs in issues, not in the navigation.
 */

/**
 * Every entry's component. The ids, labels, notes and families live in
 * `entries/ids.ts`, which the entries themselves read too — a `Banner` naming
 * `Icon` in its "built on" chips would otherwise have to import this module and
 * close a cycle.
 */
const ENTRIES: Record<
  EntryId,
  (props: { theme: DesktopTheme; onOpen?: (id: string) => void }) => JSX.Element
> = {
  colors: ColorsEntry,
  icon: IconEntry,
  text: TextEntry,
  progress: ProgressBarEntry,
  card: CardEntry,
  buttonicon: ButtonIconEntry,
  contextagentcard: ContextAgentCardEntry,
  avatar: AvatarEntry,
  label: LabelEntry,
  banner: BannerEntry,
}

export function Shell() {
  // `midnight` and not `dark`: the app's default is `dark`, but a near-black ground
  // flatters a tint — every one of the four reads on it. Midnight is the harder
  // ground and the one most people actually run, so it is the honest thing to open
  // on. The eight are one click away regardless.
  const [theme, setTheme] = useState<DesktopThemeId>('midnight')
  const [entry, setEntry] = useState<EntryId>('colors')

  /**
   * Which families are folded. Open is the default and this holds the exceptions,
   * so a family added to `FAMILIES` shows up rather than hiding until someone
   * clicks it.
   */
  const [folded, setFolded] = useState<string[]>([])
  const toggle = (label: string) =>
    setFolded((f) => (f.includes(label) ? f.filter((l) => l !== label) : [...f, label]))

  const shown = FAMILIES.filter((family) => family.entries.length > 0)

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        {/* The rail. Sticky on a wide screen, a plain block above the content on a
            narrow one — a 256px column beside a props table does not survive being
            squeezed, and this page is read on a laptop anyway. */}
        <nav className="flex w-full flex-shrink-0 flex-col border-b border-hairline px-6 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-1 pb-6">
            <span className="text-sm font-semibold text-ink">Design system</span>
            <span className="text-xs text-muted">Magic Slash Desktop</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 lg:overflow-y-auto">
            {/* ABOVE the families and outside them: a palette is not something you
                compose with, it is what everything below is made of. */}
            <ul className="flex flex-col gap-0.5">
              {FOUNDATION_PAGES.map((id) => (
                <li key={id}>
                  <button
                    onClick={() => setEntry(id)}
                    className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors ${
                      id === entry ? 'bg-canvas' : 'hover:bg-canvas/60'
                    }`}
                  >
                    <span className="text-sm font-medium text-ink">{ENTRY_LABELS[id]}</span>
                    <span className="text-[11px] leading-snug text-muted">{ENTRY_NOTES[id]}</span>
                  </button>
                </li>
              ))}
            </ul>

            {shown.map((family) => {
              const open = !folded.includes(family.label)

              return (
                <div key={family.label} className="flex flex-col gap-1">
                  <button
                    onClick={() => toggle(family.label)}
                    className="group flex items-center gap-1.5 rounded-lg py-1 text-left"
                  >
                    {/* Rotated rather than swapped for a second glyph: one element that
                        turns reads as the same control in two states, where two glyphs
                        read as two controls. */}
                    <ChevronRight
                      className={`h-3 w-3 flex-shrink-0 text-muted transition-transform ${
                        open ? 'rotate-90' : ''
                      }`}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {family.label}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted/70">
                      {family.entries.length}
                    </span>
                  </button>

                  {open && (
                    <>
                      <span className="pl-[18px] text-[11px] leading-snug text-muted/80">
                        {family.note}
                      </span>
                      <ul className="flex flex-col gap-0.5 pt-1">
                        {family.entries.map((id) => (
                          <li key={id}>
                            <button
                              onClick={() => setEntry(id)}
                              className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                id === entry ? 'bg-canvas' : 'hover:bg-canvas/60'
                              }`}
                            >
                              <span className="text-sm font-medium text-ink">
                                {ENTRY_LABELS[id]}
                              </span>
                              <span className="text-[11px] leading-snug text-muted">
                                {ENTRY_NOTES[id]}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* THE THEME, at the foot of the rail and not above each page.
              It is one setting for the whole workbench — every preview on every entry
              reads it — so repeating it per page made it look like a property of the
              component being documented. A select rather than eight pills, because
              eight pills wrap to three rows in a 256px column and would take more of
              the rail than the components do. */}
          <div className="flex flex-col gap-1.5 border-t border-hairline pt-4 mt-5">
            <label htmlFor="ds-theme" className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Theme
            </label>
            <select
              id="ds-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as DesktopThemeId)}
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink"
            >
              {DESKTOP_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {DESKTOP_THEMES[id].label}
                </option>
              ))}
            </select>
            <span className="text-[11px] leading-snug text-muted">
              Eight of them, and a tint that reads on one can vanish on another. Every preview
              on the right follows this.
            </span>
          </div>
        </nav>

        <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
          {(() => {
            const Entry = ENTRIES[entry]
            // `onOpen` is what makes a "built on" chip a link: an entry names the
            // components it draws with, and clicking one opens it.
            return <Entry theme={DESKTOP_THEMES[theme]} onOpen={(id) => setEntry(id as EntryId)} />
          })()}
        </main>
      </div>
    </div>
  )
}
