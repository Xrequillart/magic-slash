'use client'

import { ButtonLink } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import { BAND_TITLE, HomeSection } from './Shell'

/**
 * The closing ask, and the one band on the page that is a dark sheet: the app's icon,
 * one headline, one line, one button, centred on a wash of colour bleeding out of black.
 *
 * ONE BUTTON, NOT TWO. The section used to close on the hero's pair — `primary` to the
 * app, `secondary` to the .dmg — on the argument that a reader who scrolled the whole
 * page should meet the same choice they were offered at the top. It now closes on the
 * download alone. The end of a landing page is the one place where a second option is a
 * question rather than a convenience, and the icon above it has already said what is
 * being offered. `DESKTOP_DOWNLOAD_URL` is the .dmg itself, not a releases page.
 *
 * ITS OWN COPY, and that is a fix rather than a preference: `site.cta.*` is ALSO what
 * `/story` renders in its own closing block (`components/site/story/StoryContent.tsx`),
 * so retuning this band through those keys would have silently rewritten a page this
 * story is not supposed to touch. The homepage's closing copy is `site.finalCta.*` and
 * nothing else reads it; `site.cta.*` stays exactly as `/story` left it.
 *
 * THE ICON IS THE ONLY BITMAP ON THE PAGE, at 256px and 46KB — everything else in
 * `public/img/` bar the integration logos is between 1.7MB and 4MB, which is why the
 * hero above is type only. It is requested twice and downloaded once: the glow behind it
 * is the same file blurred, so the browser serves the second `img` from cache.
 *
 * It is `app-icon-desktop.png`, a NEW file, and the reason is worth recording: the tree
 * already had `public/img/app-icon.png`, whose call site in the `/admin` device panel
 * describes it as "the desktop app's REAL icon, resized" — and it is not, any more. That
 * one is the old ninja mascot on a square white field, which on this dark sheet reads as
 * a white box rather than as an app icon. `desktop/resources/icon.png` is what actually
 * ships on the dock today: the leaping hare on a pale blue field. Resized to 256px and
 * added beside the old one rather than over it, because overwriting `app-icon.png` would
 * change what `/admin` renders and that surface is out of this story's scope. The stale
 * asset is worth its own ticket.
 *
 * The corners are rounded HERE, not in the artwork — the source is a hard square, and a
 * hard square on a dark sheet reads as a cropped screenshot rather than as an app icon.
 * `rounded-3xl` is 24px against the 128px box, which is close to the ~22% macOS icons
 * actually use, and it is a declared radius rather than an arbitrary one. `rounded-button`
 * would be wrong: 12px is the corner of a control you press, not of an icon.
 */

/**
 * The wash, and it is built out of declared tokens rather than a hand-mixed gradient.
 *
 * Three blurred discs over `bg-ink`: `red` on the left, `brand` on the right, `purple`
 * between them, each at low alpha under `blur-3xl`. That is where the wine-into-blue
 * bleed comes from, and none of it is a new colour — the alternative was a
 * `bg-[radial-gradient(...)]` with hex stops in it, which is precisely the hardcoded
 * value the design brief rules out.
 *
 * SIZED IN FRACTIONS, not in `h-[36rem]`. Tailwind's spacing scale stops at `h-96`, so
 * a disc big enough to read as a wash would have needed an arbitrary value at every
 * corner. Fractions of the band answer the same question and scale with it.
 *
 * The last layer is the fade to black at the bottom edge, which is what keeps the wash
 * in the upper half and lets the footer below start from the same ink.
 */
function Wash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-1/4 -top-1/2 h-full w-2/3 rounded-full bg-red/20 blur-3xl" />
      <div className="absolute -right-1/4 -top-1/2 h-full w-2/3 rounded-full bg-brand/25 blur-3xl" />
      <div className="absolute left-1/4 -top-1/3 h-2/3 w-1/2 rounded-full bg-purple/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
    </div>
  )
}

export function FinalCtaSection() {
  const { t } = useT()

  return (
    <HomeSection padding="tall" backdrop={<Wash />} className="bg-ink">
      <div className="mx-auto max-w-2xl text-center">
        {/* THE GLOW IS THE ICON ITSELF, blurred, sitting behind the icon. Not a disc of
            some chosen colour: the halo is then whatever the artwork is — the pale blue
            of this icon — and it stays correct if the icon is ever redrawn, with no
            second value to keep in sync. `scale-110` so the bloom reads past the edges
            rather than only through the corners, and `blur-2xl` because `blur-3xl` at
            this size dissolves it into the wash behind.

            It is NOT an elevation. The scale has four rungs and a glow is not one of
            them, and an arbitrary shadow value would fail `designTokens.test.ts` — which
            scans this file as TEXT, comments included, so the class cannot even be named
            here to say it is unwanted.

            96px rather than 128px. At 128 the icon was competing with the headline for
            the eye instead of introducing it — and the blur now adds visual size the box
            does not, so it reads bigger than the number suggests.

            `alt` is empty on both: the headline underneath names the product, and the
            copy is decoration of decoration. */}
        <div className="relative mx-auto h-24 w-24">
          <img
            src="/img/app-icon-desktop.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 rounded-3xl opacity-70 blur-2xl"
          />
          <img
            src="/img/app-icon-desktop.png"
            alt=""
            width={96}
            height={96}
            className="relative h-full w-full rounded-3xl"
          />
        </div>

        {/* `BAND_TITLE.onDark` — the same type as every band above, on the rung that
            carries `text-white` instead of `text-ink`. See the note on the constant in
            `Shell.tsx` for why the colour is a rung and not a `className`. */}
        <h2 className={`mt-10 ${BAND_TITLE.onDark}`}>{t('site.finalCta.title')}</h2>

        <p className="mx-auto mt-5 max-w-md text-base text-onink-body">
          {t('site.finalCta.subtitle')}
        </p>

        {/* `secondary` — the white face — because on `ink` it IS the loud one: the blue
            `primary` would be the quieter of the two against this wash, which inverts
            the ladder. The radius stays `rounded-button`; the reference this band is
            drawn from uses a full pill, and a `rounded-full` appended here would fight
            the recipe on stylesheet order rather than replace it. */}
        <div className="mt-10">
          <ButtonLink href={DESKTOP_DOWNLOAD_URL} variant="secondary" size="lg">
            {t('site.finalCta.button')}
          </ButtonLink>
        </div>
      </div>
    </HomeSection>
  )
}
