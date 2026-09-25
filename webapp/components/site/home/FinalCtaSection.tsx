'use client'

import { ButtonLink } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import { BAND_TITLE, HomeSection } from './Shell'

/**
 * The closing ask, and the one band on the page that is a dark sheet: a white line
 * illustration, one headline, one line, one button, centred on plain black.
 *
 * NO WASH, AND NO GLOW. The band used to sit on three blurred discs of `red`, `brand` and
 * `purple` bleeding out of the ink, with the app icon haloed by a blurred copy of itself.
 * The owner asked for both to go ("laisse juste un fond noir"), then for the icon itself to
 * give way to an illustration drawn in white: white on `bg-ink` is the whole band now.
 *
 * ONE BUTTON, NOT TWO. The section used to close on the hero's pair — `primary` to the
 * app, `secondary` to the .dmg — on the argument that a reader who scrolled the whole
 * page should meet the same choice they were offered at the top. It now closes on the
 * download alone. The end of a landing page is the one place where a second option is a
 * question rather than a convenience, and the headline has already said what is being
 * offered. `DESKTOP_DOWNLOAD_URL` is the .dmg itself, not a releases page.
 *
 * ITS OWN COPY, and that was a fix rather than a preference: `site.cta.*` was ALSO what
 * `/story` rendered in its own closing block, so retuning this band through those keys
 * would have silently rewritten a page that story was not supposed to touch. The
 * homepage's closing copy has been `site.finalCta.*` ever since, and it keeps that name
 * now `/story` and `site.cta.*` are both deleted: this band is the homepage's closing
 * sheet, which is what the family says.
 */

/**
 * The four arrows around the button, positioned exactly as `DownloadContent` places them.
 * LITERAL CLASS LISTS, because Tailwind only emits classes it can see in the source.
 */
const ARROWS = [
  { src: '/img/arrow-swirl.svg', className: 'left-[17%] top-0 w-[100px] rotate-[28deg]' },
  { src: '/img/arrow-wave.svg', className: 'left-[2%] top-8 w-[88px] rotate-[14deg]' },
  { src: '/img/arrow-zigzag.svg', className: 'right-[17%] top-0 w-[100px] -rotate-[28deg] scale-x-[-1]' },
  { src: '/img/arrow-bolt.svg', className: 'right-[2%] top-8 w-[88px] -rotate-[14deg] scale-x-[-1]' },
] as const

export function FinalCtaSection() {
  const { t } = useT()

  return (
    <HomeSection padding="tall" className="bg-ink">
      <div className="mx-auto max-w-2xl text-center">
        {/* AN ILLUSTRATION FROM THE SITE'S SET IN PLACE OF THE APP ICON, on the owner's
            call: a jetpack launch, which is the headline's "vitesse supérieure" drawn.
            `invert` turns its black ink white on the ink band, as with the arrows below;
            its `viewBox` is cropped to the drawing (`23 71 954 790` out of 1000²).

            CROPPED AT THE BOTTOM AND FADED, because the owner found it too small at 16rem.
            The viewBox stops at y=861, through the flames and the lower boot, so the
            drawing's weight (the figure and the pack) fills the 26rem instead of its
            exhaust. A hard cut through white strokes on black reads as a mistake; the mask
            dissolves the last 30% into the band instead, and `mt-2` under it because the
            faded foot is already the gap. `max-w-full` so a phone scales it down rather
            than overflowing. */}
        <img
          src="/img/illustration-jetpack.svg"
          alt=""
          className="mx-auto h-auto w-auto max-w-full invert [mask-image:linear-gradient(to_bottom,black_70%,transparent)] md:h-[26rem]"
        />

        {/* `BAND_TITLE.onDark` — the same type as every band above, on the rung that
            carries `text-white` instead of `text-ink`. See the note on the constant in
            `Shell.tsx` for why the colour is a rung and not a `className`. */}
        <h2 className={`mt-2 ${BAND_TITLE.onDark}`}>{t('site.finalCta.title')}</h2>

        <p className="mx-auto mt-5 max-w-md text-base text-onink-body">
          {t('site.finalCta.subtitle')}
        </p>

        {/* `secondary` — the white face — because on `ink` it IS the loud one: the blue
            `primary` would be the quieter of the two against black, which inverts
            the ladder. The radius stays `rounded-button`; the reference this band is
            drawn from uses a full pill, and a `rounded-full` appended here would fight
            the recipe on stylesheet order rather than replace it. */}
        {/* THE DOWNLOAD PAGE'S FOUR ARROWS, in white, converging on the button. Same files,
            same angles and the same mirroring as `DownloadContent` — its note explains the
            aim — with `invert` turning the art's #010101 ink to white rather than a second
            copy of each file drawn in another colour.

            `lg:-mx-12` IS WHAT LETS THE SAME PERCENTAGES WORK. This column is `max-w-2xl`
            and the download page's is `max-w-3xl`, 96px wider; widening the arrows' box by
            48px a side makes it that same 768px, so every offset lands where it does
            there. Only from `lg`, which is also the only width the arrows draw at: on a
            phone a negative margin would push the page sideways for nothing. */}
        <div className="relative mt-10 flex justify-center lg:-mx-12">
          {ARROWS.map((arrow) => (
            <img
              key={arrow.src}
              src={arrow.src}
              alt=""
              aria-hidden
              className={`pointer-events-none absolute hidden invert lg:block ${arrow.className}`}
            />
          ))}
          <ButtonLink href={DESKTOP_DOWNLOAD_URL} variant="secondary" size="lg">
            {t('site.finalCta.button')}
          </ButtonLink>
        </div>
      </div>
    </HomeSection>
  )
}
