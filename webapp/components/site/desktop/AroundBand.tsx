'use client'

import { AppWindow, Bell, Columns, Search, type LucideIcon } from 'lucide-react'
import { AROUND_CARDS, DESKTOP_BANDS } from '@/lib/desktopPage'
import { titleOf, type FeatureIcon } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import { BAND_TITLE, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'

/**
 * WHAT SITS AROUND THE WINDOW: the split view, the global shortcut, the Mac's own
 * notifications and the menu bar. Four `/features` rows, on a DARK band — `bg-ink`, white
 * type — with no drawings: an icon, the title beside it, the description under the pair.
 * The product owner's brief, word for word: "background en black, texte en white, pas
 * besoin des cards avec les illustrations, un icon blanc, un titre à droite de l'icon et
 * en dessous la description".
 *
 * WHY THE DARK GROUND WORKS HERE. The three bands above are light and each carries a
 * screenshot on a coloured plate; this one has no picture, and four lines of copy on the
 * same white would read as the page running out. The dark sheet is the page changing
 * register — the same move the closing band makes — and it gives the four rows a ground
 * to be four rows on. `BAND_TITLE.onDark` is the headline recipe the closing band uses;
 * the subtitle is white at the alpha the footer plate uses for body copy.
 *
 * THE ICONS ARE THE ROWS' OWN, from `lib/features.ts`: each row names a `FeatureIcon`,
 * and `/features` draws it in a tile beside the row. The map here resolves the four this
 * band shows and falls back to the first for a name it does not know — the same reason
 * `FeaturesContent` resolves through a fallback: one neutral glyph is the failure a row
 * can afford, a throw in render is not.
 */
const ICONS: Partial<Record<FeatureIcon, LucideIcon>> = {
  Columns,
  Search,
  Bell,
  AppWindow,
}

export function AroundBand() {
  const { t } = useT()

  return (
    <HomeSection className="bg-ink">
      <Reveal order={1}>
        <div className="max-w-2xl">
          <h2 className={BAND_TITLE.onDark}>{t(DESKTOP_BANDS.around.title)}</h2>
          <p className="mt-4 text-base leading-relaxed text-onink-body">{t(DESKTOP_BANDS.around.subtitle)}</p>
        </div>
      </Reveal>

      {/* Four rows, TWO TO A LINE from `md` — the product owner's call over four across,
          with the type a step up: a row is an icon, a title and a paragraph, and at half
          the band's width the paragraph gets a measure it can be read at. `gap-x-16`
          between the columns and `gap-y-14` between the rows, wider than the paragraph's
          own line-height, so the four read as four rather than as one column of text. */}
      <ul className="mt-14 grid gap-x-16 gap-y-14 md:grid-cols-2">
        {AROUND_CARDS.map((feature, index) => {
          const Icon = ICONS[feature.icon] ?? Columns
          return (
            <Reveal key={feature.id} order={index + 2}>
              <li className="flex flex-col">
                <div className="flex items-center gap-3.5">
                  <Icon className="h-7 w-7 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
                  <h3 className="font-display text-2xl font-bold leading-snug text-white">
                    {titleOf(feature.title, t)}
                  </h3>
                </div>
                <p className="mt-4 max-w-lg text-lg leading-relaxed text-onink-body">{t(feature.description)}</p>
              </li>
            </Reveal>
          )
        })}
      </ul>
    </HomeSection>
  )
}
