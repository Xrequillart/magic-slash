'use client'

import { Download } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import { LOGIN_PATH } from '@/lib/routes'
import { Reveal } from '../Reveal'
import { RichText } from '../RichText'
import { HomeSection } from './Shell'

/**
 * The landing page's first screen: headline, one line, the two calls to action. Centred,
 * and TYPE ONLY — there is no visual, just a blue bloom behind the words (see `Bloom`).
 *
 * The `/magic:plan → /magic:done` eyebrow that used to sit above the headline is gone.
 * It was the one piece of copy on the page that asked the reader to already know what a
 * slash command was, and it was the first thing they met.
 *
 * THE TWO BUTTONS ARE THE TWO RUNGS. `primary` is `bg-brand` blue and goes to the app —
 * the design brief settles this explicitly, because an earlier iteration of the scale
 * had the white button as primary and the spec was written against that. `secondary` is
 * the white one beside it and downloads the build itself (`DESKTOP_DOWNLOAD_URL`, the
 * .dmg rather than a releases page). Both are `size="lg"`: this is the page whose button
 * IS the page. They are the same HEIGHT, which is worth writing down because they do not
 * look it: `BUTTON_BASE` declares the 1px border for every variant and `secondary` spends
 * it on `border-hairline` where `primary` spends it on `border-transparent`, so both come
 * to 46px at `lg`. A white face inside a filet simply reads smaller than a saturated
 * block of the same size.
 *
 * THERE IS NO IMAGE ON THIS PAGE AT ALL, which started as a performance decision and
 * ended as a layout one. Every bitmap in `public/img/` bar the integration logos is
 * between 1.7MB and 4MB, so none of them could go above the fold; what stood here
 * instead was a drawn app window — a `Card` with the agent list in it, built out of the
 * same tokens as the rest of the page. That is gone too, and the hero is a centred
 * column of type.
 *
 * Story #270 is what puts a visual back, as the scroll-driven scene it was always meant
 * to be. Its insertion point is the end of the column below, and `AppMockup.tsx` — kept
 * on disk, rendered nowhere — is the engine it converts. Nothing here has to move for it.
 *
 * The `order` props are the entrance sequence, which spans the header too — the bar is
 * 0, and these continue from 1 in the order they are read. There is no `order={4}` any
 * more; it belonged to the visual, and `order={1}` is now the headline's alone. See `Reveal` for why the stagger is an animation
 * delay rather than the chain of `setTimeout`s the original used.
 */
export function HeroSection() {
  const { t } = useT()

  return (
    // Two things this band owns, and they arrive by different routes on purpose.
    //
    // The TALLER TOP: the bar is `fixed`, full-bleed and 64px tall flush to the top, so
    // the hero owes it ~7rem before its own first line — here rather than as a spacer in
    // the layout, because the other page under that layout (`/story`) already reserves
    // the room in its own stylesheet. (The pill this replaced came to the same 64px, at
    // 52px tall plus 12px of offset, so the reservation did not have to move.) It comes
    // through `padding="hero"` and NOT through
    // `className`: a `pt-32` appended to `HomeSection`'s own `py-20` is a CONFLICTING
    // utility, and which of the two lands is decided by Tailwind sorting the class
    // names. See `SECTION_PADDING` in `Shell.tsx`.
    //
    // The WASH, which is additive and so does belong in `className`: the page is
    // `canvas`, and the hero fades `softblue` into it, so the header's own
    // `softblue/70` at rest has something to sit on rather than reading as a stray tint.
    <HomeSection
      padding="hero"
      backdrop={<Bloom />}
      className="bg-gradient-to-b from-softblue to-canvas"
    >
      {/* ONE CENTRED COLUMN. This was a two-column grid with the copy on the left and a
          drawn app window on the right; the window is gone and the copy is centred on
          the page's own axis. `max-w-3xl` keeps the headline from running the full
          1100px — a centred line that wide is read in two passes, not one — and
          `text-center` is inherited by everything below rather than restated per
          element. */}
      <div className="mx-auto max-w-3xl text-center">
        <div>
          {/* The headline carries a `<br>`, so it goes through `RichText`. `Reveal` wraps
              it rather than rendering it, which is the split that let `Fade`'s
              markup-rendering half be deleted instead of ported. */}
          <Reveal order={1}>
            <RichText
              k="site.hero.title"
              as="h1"
              className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl"
            />
          </Reveal>

          <Reveal order={2}>
            {/* `mx-auto` because `max-w-xl` inside a centred column still hugs the left
                edge on its own: a max-width narrower than its parent has to be told
                where to sit. */}
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {t('site.hero.subtitle')}
            </p>
          </Reveal>

          <Reveal order={3} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {/* A plain anchor, which is what `ButtonLink` renders: this leaves for the
                app host, and there is no client-side navigation across origins — see
                `lib/routes.ts`. */}
            <ButtonLink href={LOGIN_PATH} variant="primary" size="lg">
              {t('site.hero.cta')}
            </ButtonLink>
            <ButtonLink
              href={DESKTOP_DOWNLOAD_URL}
              variant="secondary"
              size="lg"
              icon={Download}
            >
              {t('site.hero.downloadCta')}
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </HomeSection>
  )
}

/**
 * The blue bloom behind the headline: a deeper blue than the `softblue` wash the band
 * fades through, so the first screen has a centre of gravity instead of an even tint.
 *
 * SAME TECHNIQUE AS THE CLOSING BAND'S `Wash`, and for the same reason — blurred discs
 * of declared tokens rather than a `bg-[radial-gradient(...)]` with hex stops in it,
 * which is the hardcoded value the design brief rules out. It reaches the band through
 * `HomeSection`'s `backdrop` slot because a wash capped at the 1100px column reads as a
 * rectangle with two hard edges; `backdrop` renders it as a child of the `section`
 * itself.
 *
 * THE ALPHAS ARE LOWER THAN THE CLOSING BAND'S. That one blooms on `ink`, where a disc
 * has to fight black to show at all; this one is on `softblue`, where the same disc at
 * the same strength would turn the hero into a colour field and take the headline's
 * contrast with it. `brand` carries the depth, `accent` widens it, and both sit behind
 * the type rather than under it — the column above is `relative`, so the text is never
 * inside the blur.
 *
 * EXPORTED, because `/features` opens on the same wash. The one thing that differs
 * between the two pages is the ground the bloom has to land on — `canvas` here, white
 * there — so the fade at the bottom takes its `to-*` class as a prop rather than being
 * copied with one token changed. The caller's band gradient MUST end on the same colour,
 * or the fade lands on a ground the band then leaves.
 */
export function Bloom({ fadeTo = 'to-canvas' }: { fadeTo?: 'to-canvas' | 'to-white' }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute -left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute -right-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-accent/15 blur-3xl" />
      {/* Fades the bloom out into the page below, so the band's own
          `from-softblue to-canvas` still lands on `canvas` at its bottom edge. */}
      <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent ${fadeTo}`} />
    </div>
  )
}
