'use client'

import { AROUND_FACTS, DESKTOP_BANDS } from '@/lib/desktopPage'
import { useT } from '@/lib/i18n/useLanguage'
import { BAND_TITLE, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DesktopFactList } from './FactList'

/**
 * WHAT SITS AROUND THE WINDOW: the split view, the global shortcut, the menu bar, the
 * Mac's own notifications and the keyboard. Five facts, on a DARK band — `bg-ink`,
 * white type — with no drawings: an icon, the title beside it, the description under the
 * pair. The product owner's brief, word for word: "background en black, texte en white,
 * pas besoin des cards avec les illustrations, un icon blanc, un titre à droite de l'icon
 * et en dessous la description".
 *
 * WHY THE DARK GROUND WORKS HERE. The three bands above are light and each carries a
 * screenshot on a coloured plate; this one has no picture, and five lines of copy on the
 * same white would read as the page running out. The dark sheet is the page changing
 * register — the same move the closing band makes — and it gives the rows a ground to be
 * rows on. `BAND_TITLE.onDark` is the headline recipe the closing band uses; the subtitle
 * is white at the alpha the footer plate uses for body copy.
 *
 * THE FIFTH FACT IS THE KEYBOARD, moved up from the guardrails band by request — see
 * `AROUND_FACTS` in `lib/desktopPage.ts` for why it belongs to this question. It is also
 * why the list is a shared component now rather than markup written out here: the
 * guardrails are set at this same size, on white, and one list drawn twice is one list
 * that drifts. `DesktopFactList` owns the arrangement, the two tones and the entrance.
 *
 * THE GLYPHS ARE NAMED BY THE DATA, not resolved here. This file used to keep a lucide
 * map of its own — four names, read off each row's `FeatureIcon` — and `DESKTOP_ICONS`
 * (`./icons.ts`) is the page's one vocabulary now, which is what let that map go.
 */
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

      <DesktopFactList facts={AROUND_FACTS} tone="dark" className="mt-14" />
    </HomeSection>
  )
}
