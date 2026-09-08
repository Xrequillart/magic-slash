'use client'

import { Fragment, useId } from 'react'

/**
 * The four drawings inside `SecuritySection`'s four cards: a padlock, a GDPR seal, a branch
 * graph and a table of secrets.
 *
 * ── WHY THEY WERE ALL REDRAWN ─────────────────────────────────────────────────────
 *
 * The first pass shipped four lucide glyphs at 112 and 128px and one flat disc, and the
 * product owner's verdict was the whole review: "elles sont horrible". It is worth writing
 * down WHY, because it is a mistake that is very easy to make again.
 *
 * A LUCIDE ICON IS DRAWN FOR 24 PIXELS. Every one of them is a uniform 2px stroke on a
 * 24px grid, and that uniformity is exactly what makes it legible at the size of a button
 * label: there is no room for a highlight, so there is none, and nothing is filled because
 * a fill at 24px is a blob. Scale that to 128px and the very thing that made it work
 * becomes the problem — a single hairline weight tracing an empty outline, which the eye
 * reads as a placeholder waiting for the real artwork. Enlarging it is not a size change,
 * it is a change of medium.
 *
 * SO THESE ARE DRAWN FOR THE SIZE THEY RENDER AT, and what that means in practice is four
 * things a 24px glyph cannot have:
 *
 *   • MASS. The bodies are FILLED, with a stroke used only where a stroke is the shape (a
 *     shackle, a key's bow). An outline says "symbol"; a filled body says "object".
 *   • ONE LIGHT SOURCE, top-left, on all five. Every gradient below runs from a lit corner
 *     to a shaded one along the same diagonal, which is what makes five separate drawings
 *     read as one set rather than as five clip-arts.
 *   • A LIT EDGE. Each solid carries a thin inner rim at low opacity on its top-left
 *     contour — the oldest bevel trick there is, and the single cheapest thing that turns a
 *     flat shape into a moulded one.
 *   • SOMEWHERE TO SIT. A soft elliptical contact shadow under the objects on light cards,
 *     a soft glow behind the ones on dark cards. Without it an object floats, and a
 *     floating object reads as a sticker.
 *
 * INTERIOR DETAIL IS KNOCKED OUT RATHER THAN PAINTED on the two solid dark objects — the
 * shield's check and the bubble's mark are `mask`ed holes, so the card's own wash shows
 * through them. That is not only prettier than a white check: it is the only correct
 * answer here, because `bg-tone-*` is a six-bloom gradient and there is no single colour a
 * painted detail could be that would match the ground at every point of it.
 *
 * ── WHAT THEY ARE STILL NOT ───────────────────────────────────────────────────────
 *
 * THREE SYMBOLS AND TWO MECHANISM DRAWINGS, and the split has a history worth keeping
 * because it went the other way first. All five were symbols to begin with: the owner's
 * call between two offers, the other being to draw the MECHANISM in each card the way
 * `WorkflowArt` and `BuiltForArt` do — the boundary your repository does not cross, the
 * staging area with the secrets pulled out of it, the branch the guard rail refuses.
 * Objects won, and then two of the five crossed over anyway, one at a time, on the owner's
 * own second thoughts:
 *
 *   • the secrets card, because a key said nothing its title had not already said, where a
 *     table of secrets collapsing into unreadable blocks says the whole claim without a
 *     word;
 *   • the commit guard, because a shield is protection IN GENERAL — "c'est pas ouf comme
 *     illustration" — where a `master` line with a refused commit on the end of it is this
 *     guard rail doing this one thing.
 *
 * AND THEN A FIFTH DRAWING WENT ENTIRELY. A comment bubble carried "a ticket cannot give the
 * agent orders" until the band was cut to two rows of two; `lib/security.ts` records why
 * that card and not another. It was a lucide `MessageSquareWarning` redrawn as a solid with
 * a knocked-out mark, and nothing else here depended on it.
 *
 * SO THE BAND NOW SPLITS TWO AND TWO, which would normally be a mistake and is not one here:
 * the padlock and the seal give the grid its objects, the graph and the table are the cards
 * a reader stops on, and each row carries one of each. What the pattern predicts is that the
 * other two go mechanism eventually, and that is fine — a card earns a mechanism drawing
 * when there is a mechanism worth drawing, and "your repository stays yours" does not have
 * one that fits in 128 pixels.
 *
 * ── THE MECHANICS ─────────────────────────────────────────────────────────────────
 *
 * GRADIENTS AND MASKS, NEVER AN SVG FILTER. `feGaussianBlur` would have been the obvious
 * way to get a soft shadow and it is the wrong tool at this scale: a filter forces its
 * subtree onto its own raster surface at whatever resolution the browser picks, which on a
 * retina screen is where crisp vector edges go to die. Every soft edge below is a
 * `radialGradient` with a transparent outer stop, which stays vector at any zoom.
 *
 * NO TAILWIND SHADOW ANYWHERE IN HERE, and it is not merely unused: `lib/designTokens.test.ts`
 * fails the build on any shadow written as an arbitrary value, and none of the four rungs
 * of the declared elevation scale describes a contact shadow under a drawn object. That
 * rule scans this file as TEXT, comments included — the same note `DesktopSection` carries
 * — so the offending class cannot even be spelled here to say it is unwanted.
 *
 * `useId()` FOR EVERY GRADIENT AND MASK ID. SVG ids are document-global, so two of these
 * drawings on one page with a hand-written `id="body"` would have the second one silently
 * painting itself with the first one's gradient. `JiraMark` in `features/TicketCardMockup.tsx`
 * established the pattern; the colons React puts in the value are stripped, because an id
 * is also a fragment reference and `url(#:r3:)` is a thing browsers merely tolerate.
 *
 * `aria-hidden` ON EVERY ONE OF THEM, at the outermost node. Each restates the description
 * directly above it in its card; a screen reader walking into this would hear the same
 * claim twice, the second time as a padlock.
 */

/**
 * ONE BOX FOR ALL FIVE — 128px, and the `viewBox` is 128 too, so the drawings render at
 * 1:1 and every coordinate below is a real pixel.
 *
 * THE SHIELD IS NOT BIGGER THAN THE REST, and the brief asked for it "en gros". It is
 * drawn to fill more of its box than the others fill theirs, which is the same thing at a
 * glance and does not cost the row its alignment: five objects at five sizes is the
 * failure the first pass was already accused of, and a shield 14% taller than its
 * neighbours would have looked like a mistake rather than like emphasis.
 */
const BOX = 'h-32 w-32'

/** Strips the colons React's `useId` puts in a value, so it is a clean fragment id. */
const useSvgId = () => useId().replace(/[^a-zA-Z0-9]/g, '')

/**
 * The secrets panel's frame. `rounded-tl-2xl` ALONE, because the other three corners are
 * outside the card being cropped and a radius there would put a visible curve where the
 * crop should look like a cut. See `SecretsArt`.
 */
const SECRET_PANEL = 'overflow-hidden rounded-tl-2xl'

/**
 * The table's two tracks: the file name sized to its content, the secret taking the rest.
 *
 * ONE GRID FOR THE WHOLE TABLE, and this went out wrong the first time: each row was its
 * own grid, so every row sized its own `max-content` column independently and the header's
 * "Secret" landed a hundred pixels left of the secrets it was heading. A table's columns
 * have to be tracks of ONE grid — which is why the cells below are direct children of it
 * and the row rule is a `border-t` on each of a row's two cells rather than on a wrapper.
 *
 * `minmax(0, 1fr)` AND NOT `1fr`, which is the whole reason the values can be cropped at
 * all — a bare `1fr` is `minmax(auto, 1fr)`, and its automatic minimum is the content's
 * min-content width, so a `nowrap` secret would have widened the grid until it fitted and
 * there would have been nothing hanging off the card's right edge to cut.
 */
const SECRET_TABLE = 'grid grid-cols-[max-content_minmax(0,1fr)]'

/** What a cell of the header row wears. */
const SECRET_HEAD = 'bg-black/[0.03] py-2 text-[10px] uppercase tracking-wider text-muted'

/** What a cell of a data row wears — the `border-t` is the row rule, drawn per cell. */
const SECRET_CELL = 'border-t border-hairline py-3.5 font-mono text-[13px]'

/**
 * THE PIXELATION FILTER, and the block size it quantises to.
 *
 * HOW IT WORKS, because none of these five primitives does the obvious thing. There is no
 * `pixelate` in SVG; what there is is a way to SAMPLE a grid and then grow each sample to
 * fill its cell:
 *
 *   1. `feFlood` paints ONE opaque dot, in a primitive subregion `1×1` pixel at the middle
 *      of the block;
 *   2. `feComposite` with a subregion of `n×n` puts that dot alone in an n-pixel cell;
 *   3. `feTile` repeats that cell across the whole filter region — a grid of single dots;
 *   4. `feComposite operator="in"` keeps the source only where a dot is, so the text is
 *      reduced to one sample per block;
 *   5. `feMorphology operator="dilate"` grows every surviving sample by half a block in
 *      each direction, which fills its cell with that one colour.
 *
 * The result is genuine pixelation of live text — not an image, not a canvas — and the
 * `primitiveUnits` default of `userSpaceOnUse` is what makes `BLOCK` a real pixel count.
 *
 * 5px WAS PICKED BY RENDERING THE ACTUAL STRING AT THE ACTUAL 13px AND LOOKING, not by
 * eye-balling a number: at 3px the letter shapes still come through in places, at 7px and
 * above the sampling misses so much white space that the row turns into scattered specks
 * with holes in it rather than a mosaic. 5px is where the blocks are big, dense, and
 * completely illegible.
 *
 * THERE USED TO BE TWO OF THESE, a 3px step on the way down to the 5px, because the
 * animation switched `filter` from one to the other and the intermediate read as a
 * resolution ladder being descended. That animation is gone (see `SecretsArt`) and the
 * ladder went with it: the dissolve is now an opacity, and a second filter would be a
 * layer nothing shows.
 *
 * THE ID IS FIXED RATHER THAN `useId()`, which is the opposite of what every other drawing
 * in this file does. It is no longer forced — the keyframes stopped naming it — but it
 * stays fixed because there is now no reason for it to be unique: the filter is referenced
 * from ONE inline style in this file, and a generated id would only make that style
 * unreadable. This drawing renders once per page; two copies would resolve to the first
 * filter, which is harmless because both would be identical.
 *
 * THE FALLBACK, stated plainly: if a browser gets `feTile` or `feMorphology` wrong the row
 * renders unfiltered — the fake secret in clear. That is a cosmetic failure and not a leak,
 * because nothing in `SECRETS` has ever been a credential (see its own note), and it is the
 * reason this is acceptable at all on a page about privacy.
 */
const SECRET_PX = 'secret-px'
const SECRET_BLOCK = 5


/**
 * One five-pointed star, upright, as a `polygon`'s points.
 *
 * A FUNCTION AND NOT TWELVE PATHS, which is the only reason the seal below is readable at
 * all: the European emblem is twelve identical stars on a circle, and writing that out is
 * 120 hand-computed coordinates nobody could ever check. Here the ring and the star are
 * each one line of arithmetic, so a change of radius stays a change of one number.
 *
 * `0.382` is the inner radius as a fraction of the outer — 1/φ², the ratio a five-pointed
 * star's own geometry gives you when the points are joined by straight lines. Anything
 * else produces a star with either fat or spidery arms, and at this size that is the whole
 * difference between "the EU emblem" and "some stars".
 */
function starPoints(cx: number, cy: number, r: number) {
  const inner = r * 0.382
  return Array.from({ length: 10 }, (_, index) => {
    const angle = ((-90 + index * 36) * Math.PI) / 180
    const radius = index % 2 === 0 ? r : inner
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

/**
 * THE PADLOCK, for the card about the repository staying yours. White, on `midnight`.
 *
 * WHAT MAKES IT AN OBJECT rather than the outline it was: the body is a filled slab with
 * its own gradient and an inner rim, and the shackle is a stroke — which is honest, since
 * a shackle IS a bent rod and the body IS a block. The first version stroked both at one
 * weight, so the lock had no parts.
 *
 * THE KEYHOLE IS PAINTED AND NOT KNOCKED OUT, unlike the shield's check, and the reason is
 * the opposite of the shield's: a hole here would show the card's dark wash through a WHITE
 * body, which is right — but the recess in a real lock is darker than whatever is behind
 * the lock, so a knockout would read as a window rather than as a keyhole. It is filled in
 * the deep end of `midnight`'s own hue instead, which is the darkest thing on the card.
 *
 * THE GLOW, not a shadow. On a near-black ground a contact shadow is invisible; what
 * places an object there is light coming off it.
 */
export function PrivateRepoArt() {
  const id = useSvgId()
  return (
    <div aria-hidden className="flex justify-center py-2">
      <svg viewBox="0 0 128 128" className={BOX} fill="none">
        <defs>
          {/* The one light source: top-left bright, bottom-right in shade. Every gradient
              in this file runs along this same diagonal. */}
          <linearGradient id={`${id}body`} x1="0.1" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#EDEEF8" />
            <stop offset="100%" stopColor="#B4BAE4" />
          </linearGradient>
          <linearGradient id={`${id}metal`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#A7AEDE" />
          </linearGradient>
          <radialGradient id={`${id}glow`}>
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* THE GLOW STAYS OUTSIDE THE SCALED GROUP below. It is an ambient wash rather
            than part of the object, and scaled with the lock its gradient would run past
            the viewBox and be cut mid-falloff. */}
        <circle cx="64" cy="70" r="60" fill={`url(#${id}glow)`} />

        {/* THE ZOOM IS A TRANSFORM, NOT A REDRAW. The owner asked for a bigger padlock, and
            there were two ways to give them one: grow the element (which is `BOX`, shared
            with the seal, so the seal would have grown too) or fill more of the box the
            lock already has. This is the second, and it corrects a real imbalance rather
            than only answering the brief — the seal is a disc of r=60 inside a 128 box and
            very nearly fills it, where the lock was 76 units across the same 128 and looked
            like the smaller of the two objects in the band.
            
            HOW THE TRANSFORM READS, since three chained translates never read at a glance:
            `translate(64 64) scale(1.2) translate(-64 -68.25)` maps every point p to
            (64,64) + 1.2·(p − (64, 68.25)). The subtracted pair is the lock's OWN centre —
            x from the body's 26…102, y from the shackle's outer edge at 22.5 down to the
            body's 114 — so the group is scaled about itself and then re-centred on the
            box. At 1.2 the lock measures 91×110 of 128, which leaves ~18 units of margin
            each side and ~9 at the top. 1.25 was tried and puts the shackle 7 units from
            the edge, which reads as a crop that was not intended.
            
            EVERY STROKE SCALES WITH IT, which is what makes this a zoom rather than a
            stretch: the shackle's 11 becomes 13.2 and the rim's hairline 1.8, so the lock
            keeps its proportions instead of growing a thin outline. */}
        <g transform="translate(64 64) scale(1.2) translate(-64 -68.25)">
          {/* THE SHACKLE, drawn BEFORE the body so the body covers where it enters. It
              leaves the top edge vertically for a few pixels before it turns, which is what
              a real shackle does and what keeps the join from reading as a bubble sitting on
              a box. */}
          <path
            d="M46 66V46a18 18 0 0 1 36 0v20"
            stroke={`url(#${id}metal)`}
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* THE BODY: a filled slab. `rx=16` on a 76×56 box — rounded enough to belong to
              this design system's surfaces, not so much that it stops being a padlock. */}
          <rect x="26" y="58" width="76" height="56" rx="16" fill={`url(#${id}body)`} />
          {/* THE LIT EDGE. An inner rim at low opacity, inset by a pixel and a half: the
              oldest bevel trick there is, and what turns the slab into something moulded. */}
          <rect
            x="27.5"
            y="59.5"
            width="73"
            height="53"
            rx="14.5"
            stroke="#FFFFFF"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />

          {/* THE KEYHOLE: a circle and the slot widening under it, as one solid. Filled in
              `midnight`'s own deep stop, so it is the darkest thing on the card. */}
          <circle cx="64" cy="80" r="7.5" fill="#1B1C6B" />
          <path d="M60.5 85h7l2.5 15h-12z" fill="#1B1C6B" />
        </g>
      </svg>
    </div>
  )
}

/**
 * THE GDPR SEAL: the European emblem's twelve stars, struck as a medal. On `mist`.
 *
 * DRAWN HERE RATHER THAN FETCHED, and that is worth being straight about because the
 * product owner's brief was "un logo RGPD stp en svg tu dois trouver ça sur internet".
 * There is no official EU-issued GDPR logo to find: the Commission publishes the EMBLEM
 * (the twelve stars) and its usage guidelines, and every "GDPR logo" in circulation is
 * community-made from that emblem. So a file off the internet would have been somebody
 * else's drawing of the same thing, under a licence nobody here had read.
 *
 * WHAT MAKES IT A SEAL rather than the flat disc it was: a raised RIM around a recessed
 * FIELD, a sheen across the top, and stars struck IN RELIEF — each one drawn twice, a dark
 * copy offset down-right and the gold on top of it, which is what a raised shape looks like
 * lit from the top-left. The acronym is struck the same way. Flat, it was a sticker; struck,
 * it is a thing that was pressed.
 *
 * IT BRINGS ITS OWN GROUND, which is what makes it usable on any card. `components/ui.tsx`'s
 * `LogoPlate` exists precisely because "logos arrive in whatever colour their owner drew
 * them in, and no single ground holds VS Code blue, GitHub black and Jira's own pale square
 * at once". The emblem is gold on its own blue and nothing else, so the disc is part of the
 * drawing.
 *
 * THE BLUE IS A GRADIENT AROUND #003399, not a departure from it: #1F52B8 down to #002270
 * passes through very nearly the reference value at the disc's middle. A single flat
 * #003399 cannot be lit, and a seal that is not lit is a circle.
 *
 * THE ACRONYM IS A PROP, not a literal, and it is the one string in this file that is not
 * English in both languages. It is the regulation's name, and the regulation has a French
 * name — RGPD — that a French reader would not recognise as GDPR. So it comes from the
 * catalogue like the rest of the band's copy, which is also why `security.test.ts` looks it
 * up in both. The rule the site's other drawings follow ("a string the TOOL prints stays in
 * the language it is printed in") does not reach this: nothing prints it.
 *
 * THE STARS DO NOT SPELL A COMPLIANCE CLAIM. What the card next to it says is what we can
 * stand behind — that the list of stored data is short — and the seal is a signal, not a
 * certification. See `lib/security.ts`.
 */
export function GdprArt({ label }: { label: string }) {
  const id = useSvgId()
  const STARS = 12
  const RING = 43
  return (
    <div aria-hidden className="flex justify-center py-2">
      <svg viewBox="0 0 128 128" className={BOX}>
        <defs>
          {/* The rim catches the light; the field sits below it in shade. Two gradients
              rather than one is the whole difference between a medal and a circle. */}
          <linearGradient id={`${id}rim`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#4F7BE0" />
            <stop offset="50%" stopColor="#123F9E" />
            <stop offset="100%" stopColor="#001A55" />
          </linearGradient>
          <linearGradient id={`${id}field`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#1F52B8" />
            <stop offset="55%" stopColor="#00318F" />
            <stop offset="100%" stopColor="#002270" />
          </linearGradient>
          {/* The sheen: brightest at the top-left of the field, gone by the middle. */}
          <radialGradient id={`${id}sheen`} cx="0.32" cy="0.2" r="0.75">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          {/* The contact shadow. A radial gradient and not a filter — see the header. */}
          <radialGradient id={`${id}cast`}>
            <stop offset="0%" stopColor="#131030" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#131030" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="64" cy="120" rx="40" ry="7" fill={`url(#${id}cast)`} />

        {/* THE RIM, then the FIELD inset inside it. */}
        <circle cx="64" cy="62" r="60" fill={`url(#${id}rim)`} />
        <circle cx="64" cy="62" r="54" fill={`url(#${id}field)`} />
        {/* The rim's own lit edge, and the shadow the rim casts onto the field. */}
        <circle
          cx="64"
          cy="62"
          r="57"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="1.2"
        />
        <circle
          cx="64"
          cy="62"
          r="53.4"
          fill="none"
          stroke="#001A55"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
        <circle cx="64" cy="62" r="54" fill={`url(#${id}sheen)`} />

        {/* THE STARS, struck: a dark copy offset down-right, the gold laid on top of it.
            That pairing is what "en relief" means at 128px — a flat gold star on blue is
            printed, a gold star with a shadow under its lower edge is raised. */}
        {Array.from({ length: STARS }, (_, index) => {
          const angle = ((-90 + index * (360 / STARS)) * Math.PI) / 180
          const cx = 64 + RING * Math.cos(angle)
          const cy = 62 + RING * Math.sin(angle)
          return (
            <g key={index}>
              <polygon points={starPoints(cx + 0.9, cy + 1, 6.1)} fill="#001A55" opacity="0.6" />
              <polygon points={starPoints(cx, cy, 6.1)} fill="#FFCC00" />
            </g>
          )
        })}

        {/* The gold hairline that frames the acronym, so the middle of the seal is a
            deliberate field rather than the space the stars left over.
            
            `r=32` AND NOT 30, and one point of opacity lower. At 30 with the acronym at
            20px the ring cleared the type by about two pixels, which at this size reads as
            a target rather than as a frame — a hairline has to be far enough from what it
            frames to be doing the framing. */}
        <circle
          cx="64"
          cy="62"
          r="32"
          fill="none"
          stroke="#FFCC00"
          strokeOpacity="0.32"
          strokeWidth="1"
        />

        {/* THE ACRONYM, struck like the stars. `dominantBaseline="central"` rather than a
            nudged `y`: four capitals have no descenders to measure against, and the type
            has to sit on the field's optical centre. `font-display` through a class, so
            the seal is set in the page's own face rather than in whatever the SVG default
            resolves to. */}
        <text
          x="64.9"
          y="63.2"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-display font-black"
          fontSize="19"
          fill="#001A55"
          opacity="0.6"
        >
          {label}
        </text>
        <text
          x="64"
          y="62.2"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-display font-black"
          fontSize="19"
          fill="#FFCC00"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}

/**
 * THE BRANCH GRAPH, for the commit guard rail: three commits on `master`, and the fourth
 * one refused. On `sky`.
 *
 * IT REPLACED A SHIELD, and the swap is the product owner's — "pour la card du garde fou
 * des commit. c'est pas ouf comme illustration. tu peux mettre une branche de commit avec
 * des [commits] au nom de master. et sur le commit tu met un croix rouge". They were right,
 * and the reason is the one the secrets card crossed over for: a shield is a symbol of
 * protection in general, where this is a picture of THIS guard rail doing THIS thing. The
 * card's copy names four branches and a refusal; the drawing now shows one of each.
 *
 * ── WHAT IS DRAWN ────────────────────────────────────────────────────────────────
 *
 * `master` NAMED IN FULL, because the whole claim depends on the reader recognising the
 * branch as one of theirs. "A protected branch" is a phrase that could mean anything;
 * `master` is a thing they have. It sits ABOVE the line rather than to the left of it — a
 * legend goes beside a graph, a REF goes on it, and `master` is a ref.
 *
 * THE LINE IS CROPPED BY THE CARD'S LEFT EDGE, which changes what the graph says rather
 * than only how it looks: a line that begins inside the frame claims the branch starts
 * there, and no branch does. Entering from off-frame, it says there is history behind you —
 * the premise the card rests on, since a guard rail is only worth having on a branch that
 * already carries something.
 *
 * THREE COMMITS, SOLID, THEN A DASHED SEGMENT, THEN A RED DISC. The dash is the load-bearing
 * detail and the easiest to miss: it is the connector to a commit that DID NOT HAPPEN, so it
 * cannot be drawn in the same solid stroke as the three that did. Solid, the graph would say
 * a bad commit landed and was marked afterwards; dashed, it says the skill stopped at the
 * edge — which is what `/magic:commit` actually does.
 *
 * AND THE CONNECTOR IS ENTIRELY RED, glued to the disc. It went through two intermediate
 * states the owner rejected in turn — a short red dash detached from the refusal, then a
 * connector split ink-then-red at its midpoint — before landing on the simplest reading of
 * "tout rouge". The single colour is also the truest: every unit of that segment is the
 * same thing, a commit that did not happen, and painting half of it in the history's own
 * ink said the first half had happened.
 *
 * THE CROSS STANDS WHERE THE COMMIT WOULD HAVE GONE rather than being drawn across a normal
 * commit dot, and both readings were considered. A red cross over a commit says "this commit
 * is broken"; a disc occupying the position says "there is no commit here", which is the
 * true one. It is also larger than the three real commits, because it is the one thing on
 * this card a reader needs to catch without looking for it.
 *
 * `red` IS THE DECLARED STATUS TOKEN, spelled as a literal here for the reason every colour
 * in this file is: an SVG `fill` cannot take a Tailwind class. It is the only saturated
 * colour in the band, and it is spent on the only thing in the band that is a refusal.
 *
 * THE COMMITS CARRY THE SAME GRADIENT AND THE SAME LIGHT as the bubble beside them —
 * near-black, lit from the top-left. At fifteen pixels across that is nearly subliminal, and
 * it is what keeps three dots from looking like three dots.
 */
export function CommitGuardArt() {
  const id = useSvgId()
  /**
   * Where the four visible commits sit. The position after the last is the refusal, and the
   * line enters from off-frame to the left of the first — see the crop note below.
   */
  const COMMITS = [22, 102, 182, 262]
  return (
    // `-ml-2` AND NO LEFT PADDING: the line runs off the card's left edge and `ToneCard`'s
    // `overflow-hidden` cuts it there, which is the same technique the secrets panel uses
    // on the other two sides. The gutter stays on the right so the refusal keeps its air.
    <div aria-hidden className="-ml-2 py-2 pr-7">
      {/* WIDER THAN TALL, unlike the two objects in the band — a graph is a horizontal
          thing, and squeezing one into a 128px square would have set it at half the size
          for no gain.

          THE VIEWBOX IS THE DRAWING'S OWN BOX AND NOT A SQUARE, which was the fix for the
          first attempt: that one was 208×128 with everything happening in a 54px band
          through the middle, so `ToneCard`'s `center` slot dutifully centred a box that was
          mostly empty and the graph looked like it was floating low on the card. At 460×58
          the box IS the graph — one row for the branch name, one for the line.

          ── THE SCALE, IN FOUR ROUNDS ────────────────────────────────────────────

          `w-full` MAKES THE DRAWING'S SIZE A FUNCTION OF THE CARD'S, and the viewBox's
          width is therefore the only dial: fewer units across the same pixels is a bigger
          drawing. The history is worth keeping because three of the four rounds were wrong
          in a way the numbers alone did not show:

            1. 244 units, uncapped. The day the band went to two-column cards this one was
               handed ~705px — a scale of nearly 3, `master` set at 38px, larger than the
               headline above it.
            2. 560 units, capped at 560px. Rendered 1:1, every coordinate a real pixel …
               and far too SMALL for a card that wide. The owner said so.
            3. 560 units, cap moved out to `max-w-3xl`. Scale 1.26, `master` at ~16px.
               Better, and still short — "encore plus zoomé".
            4. 460 units. Scale ~1.53 on the long card: the bar is 4.6px, the commits 23px
               across, the refusal 46px. `master` drops to `fontSize` 11 so it lands at
               ~17px rather than 20 — a mono ref a hair above the body copy reads as
               deliberate, one at 20px reads as a heading nobody asked for. That is the one
               place this zoom is NOT uniform, and it is on purpose.

          `max-w-3xl` (768px) IS A GUARD, not the size: the long card offers ~705px, so the
          cap is never reached. It exists so a future wider card cannot restart round 1.
          `w-full` still does the work below `lg`, where scaling down is what should happen.

          THE DRAWING DELIBERATELY STOPS SHORT OF THE VIEWBOX, ending at 365 of 460 units,
          and the empty 95 on the right are the whole reason: the owner asked for the
          refused commit "un peu plus au centre de la card (mais pas au centre totalement)",
          and moving it left is the ONE change that cannot be made by touching the scale.
          Shrinking the viewBox to fit the drawing would render it wider again and put the
          cross straight back against the right edge. So the box keeps its 460 units — the
          scale, and therefore every element's size, is exactly what the previous round
          settled on — and the drawing simply sits in the left four fifths of it. The
          refusal's centre lands at ~73% across the card: clear of the edge, and clearly not
          centred.

          FOUR COMMITS, NOT FIVE, and the pitch stays at 80. Something had to give when the
          drawing lost 82 units off its right end, and of the two options — five commits at
          a 60 pitch, or four at 80 — the pitch is the one worth keeping: it is the spacing
          the previous round was approved at, and a denser row of dots would have read as a
          different drawing. A four-commit history plus a crop at the left edge says exactly
          what five did. */}
      <svg viewBox="0 0 460 58" className="h-auto w-full max-w-3xl" fill="none">
        <defs>
          <linearGradient id={`${id}node`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#43434E" />
            <stop offset="100%" stopColor="#0A0A0A" />
          </linearGradient>
          <radialGradient id={`${id}cast`}>
            <stop offset="0%" stopColor="#131030" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#131030" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* THE REF, AS A CHIP: a rounded label holding a padlock and the branch name.
            The owner asked for both, one round after the other — first the lock "à côté de
            master", then master "en mode label avec des border arrounded" — and the two
            requests resolve into ONE object rather than two: a padlock inside a rounded
            border beside a branch name is exactly how every git host draws a protected ref,
            and it is the only arrangement here where the lock is unambiguously ABOUT the
            name. The lock kept its own 15×15 badge for one round, which put two rounded
            shapes side by side and read as a chip that had grown a second chip.
            
            IT SAYS IN ONE GLYPH WHAT THE CARD'S FIRST SENTENCE SAYS IN FOUR BRANCH NAMES,
            and it is the reason the refusal further down the line is not arbitrary: without
            it the red cross is a decision nobody explained, and with it the cross is a
            consequence.

            A ROUNDED RECT AND NOT A PILL. `rx=6` on a 19-unit box, which is the shape a ref
            chip has everywhere it appears; `rx=9.5` would have made it a capsule, and a
            capsule reads as a status badge — something the branch IS rather than something
            the branch is CALLED.

            INK AND NOT RED, fill and border both. `red` on this card means one thing, the
            commit that was refused, and a red chip would have made the branch itself look
            like the problem. A protected branch is a normal branch.

            THE GEOMETRY IS MEASURED OFF THE TYPE, which is why the numbers look arbitrary
            and are not: `master` is six characters of monospace at `fontSize` 11, so ~6.6
            units each and ~40 across. Six units of padding, the 6.4-wide lock, a 3.6 gap,
            the 40 of text, six more — 64 units, which is the chip's width. Rename the
            branch and this number moves. */}
        <g>
          <rect
            x="16"
            y="3.5"
            width="64"
            height="19"
            rx="6"
            fill="#0A0A0A"
            fillOpacity="0.05"
            stroke="#0A0A0A"
            strokeOpacity="0.14"
            strokeWidth="1"
          />
          {/* The padlock: a filled body under a stroked shackle, the same two-part
              construction `PrivateRepoArt` uses at nine times the size — a shackle IS a bent
              rod and a body IS a block, so one is a stroke and the other a fill. Centred on
              the chip's own axis at y=13. */}
          <rect x="23" y="12.1" width="6.4" height="5" rx="1.2" fill="#0A0A0A" fillOpacity="0.5" />
          <path
            d="M24.5 12.1V10.6a1.7 1.7 0 0 1 3.4 0v1.5"
            stroke="#0A0A0A"
            strokeOpacity="0.5"
            strokeWidth="1.3"
            fill="none"
          />
          {/* The name. `dominantBaseline="central"` sits it on the chip's axis rather than on
              its own baseline, which is what lets the lock and the text share one y. */}
          <text
            x="33"
            y="13"
            dominantBaseline="central"
            className="font-mono"
            fontSize="11"
            fill="#0A0A0A"
            fillOpacity="0.6"
          >
            master
          </text>
        </g>

        {/* THE HISTORY THAT EXISTS, entering from off-frame. Starting at x=0 under a
            negative margin is what makes this a CROP rather than a stub: a line that begins
            inside the card says the branch starts there, which is a thing no branch does.
            Cut by the card's edge, it says there is history behind you — which is the
            premise the whole card rests on, since a guard rail only matters on a branch
            that already has something worth protecting.

            `ink` AT FULL STRENGTH, the same black as the commits, by the owner's call —
            "mettre le trail gris clair de la même couleur que les points noir". It was
            `0.2` before, a hairline the dots sat on rather than a line they belonged to,
            which is what a git graph does NOT look like: the branch and its commits are one
            object.

            A FLAT COLOUR AND NOT THE COMMITS' GRADIENT, which was the other way to match
            them and would have looked worse. That gradient runs top-left to bottom-right,
            which on a 10px dot is a lit sphere and on a line spanning the whole card is a
            left-to-right fade — the same values doing the opposite job. `ink` is the
            gradient's own dark stop, so the two read as one black. */}
        <path d={`M0 34H${COMMITS.at(-1)}`} stroke="#0A0A0A" strokeWidth="3" />
        {/* THE COMMIT THAT DOES NOT EXIST: one dashed connector, ALL RED, running from the
            last real commit right up to the refusal. See the header for why it is dashed.

            IT WAS SPLIT INK-THEN-RED FOR ONE ROUND and the owner cut that — "je veux que
            le trail en dashed soit tout rouge". The split had an argument behind it (the
            line running out of permission as it approached) and the single colour has a
            better one: the whole segment is the same thing, a commit that did not happen,
            and colouring half of it like the history said the first half was history.

            `3 4` IS NOT AN ARBITRARY DASH — it is what keeps the connector glued to the
            disc with no offset to tune. The span is 73 units (last commit at 344, the
            disc's left edge at 417) and 73 = 10×7 + 3, so with a 7-unit period the eleventh
            dash occupies 70–73 and lands exactly on the disc's edge. THE SPAN IS NOT FREE
            FOR THAT REASON: it has to stay ≡ 3 (mod 7), so the next lengths up and down are
            66 and 80, not 72 and 74.

            73 HAS SURVIVED EVERY RESCALE AND THE SHIFT, which is why it is still 73: it
            was 45 when the graph was 244 wide (18% of it, which read), 8% once the box
            reached 560, and 73 put it back to 13%. At 460 the same 73 is 16%, and moving
            the whole run left changed nothing at all — the glue depends on the span modulo
            the dash period, not on where the span sits or how wide the box is. The dashed
            run is the part of the drawing that says the commit never happened, so it cannot
            be the part that disappears when the box moves.

            BUTT CAPS, not round: a round cap adds its radius at both ends of every dash,
            so a `3` dash renders 6 long and the gaps close up. An earlier `4 6` round-capped
            version was reading as very nearly solid for exactly that reason. */}
        <path
          d={`M${COMMITS.at(-1)} 34H335`}
          stroke="#EF4444"
          strokeOpacity="0.9"
          strokeWidth="3"
          strokeDasharray="3 4"
        />

        {COMMITS.map((x) => (
          <circle key={x} cx={x} cy="34" r="7.5" fill={`url(#${id}node)`} />
        ))}

        {/* THE REFUSAL. The contact shadow is what stops it floating over the line. */}
        <ellipse cx="350" cy="54" rx="17" ry="4" fill={`url(#${id}cast)`} />
        <circle cx="350" cy="34" r="15" fill="#EF4444" />
        <path
          d="M343.5 27.5l13 13M356.5 27.5l-13 13"
          stroke="#FFFFFF"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

/**
 * THE SECRETS TABLE, for the card about secrets never reaching a commit. A pale panel
 * cropped by the card's bottom-right corner, on `indigo`.
 *
 * IT REPLACED A KEY, and the swap is the product owner's — "pour la card des Les secrets
 * tu peux changer l'illustration. et faire un tableau cropé en bas et à droite qui liste
 * des secret. et l'animation flouté les secret." The key was a fine drawing of a SYMBOL and
 * it said nothing the title did not already say. This says the thing itself: here are your
 * secrets, and here is us not being able to read them.
 *
 * WHICH MAKES IT THE ONE MECHANISM PANEL IN THE BAND. The other four cards are objects,
 * which was the owner's call when all five were redrawn (see this file's header). This one
 * crossed over on its own merits, and the band is better for the mix than it would be for
 * the consistency: five symbols in a row have no anchor, and one panel among them is the
 * card a reader stops on.
 *
 * ── THE CROP ──────────────────────────────────────────────────────────────────────
 *
 * `-mb-9 -mr-10` pulls the panel PAST the card on two sides, and `ToneCard` is
 * `overflow-hidden`, so the card's own radius does the cutting and this component never has
 * to know it is being cut. `StartTerminal`'s header sets out the argument for the technique:
 * a panel wider than its column "reads as a window you are seeing the corner of rather than
 * as a diagram someone drew to fit". `rounded-tl-2xl` alone — the other three corners are
 * outside the card and rounding them would put a visible curve where the crop should look
 * like a cut.
 *
 * TWO ROWS AND A THIRD BEING CUT, which is the owner's own spec ("j'aimerai voir seulement 2
 * ligne du tableau") and is also what makes the crop legible. A panel cropped at a row
 * BOUNDARY reads as a short table; cropped THROUGH a row it reads as a long one. So the
 * third row is in the markup precisely so that its top few pixels show, and the type is
 * sized against that: 13px rows at `py-3.5` put the boundary where the bottom edge falls.
 *
 * THE VALUES RUN OFF THE RIGHT and are cut there too, which is the other half of the same
 * argument — a secret that ends neatly inside the frame is a secret somebody chose the
 * length of. They are ~90 characters each, and the number is not decoration: the card grew
 * from a third of the row to two thirds of it, and at ~48 characters every value suddenly
 * FITTED. The crop was silently gone, on the widest breakpoint, with nothing failing. `minmax(0, 1fr)` on the value track is what allows that: a bare `1fr` is
 * `minmax(auto, 1fr)`, whose minimum is the content's min-content width, so a `nowrap`
 * string would have widened the grid until it fitted and there would have been nothing to
 * crop.
 *
 * ── THE PIXELATION ────────────────────────────────────────────────────────────────
 *
 * THE SECRETS DISSOLVE INTO 5-PIXEL BLOCKS and stay there. It was a `blur()` first and the
 * product owner asked for pixels — "faire une animation qui fait en gros pixel et illisible
 * les secret" — and the change turned out to be more than cosmetic: a blur says the text is
 * out of FOCUS, which is a property of whoever is looking, where a mosaic says the
 * RESOLUTION is gone, which is a property of what was kept. The second is the claim the card
 * actually makes.
 *
 * IT IS REAL PIXELATION OF LIVE TEXT, through an SVG filter chain rather than an image —
 * `SECRET_PX` below walks the five primitives and says why 5px is the block size.
 *
 * TWO STACKED LAYERS, AND THE ANIMATION ONLY TOUCHES AN OPACITY. The mosaic sits underneath
 * with a STATIC filter; a readable copy of the same string lies on top of it and fades away.
 * That arrangement is what fixed a snap the owner spotted in the version that animated
 * `filter` itself — and the reason is NOT performance, which was measured and ruled out:
 * `filter: url(...)` simply cannot be interpolated, so that animation jumped between states
 * instead of moving. `opacity` can be, so it travels. `tailwind.config.ts` holds the full
 * account and the measurement.
 *
 * THE READABLE COPY IS `opacity-0` BY DEFAULT, so the RESTING state is redacted and
 * `motion-reduce:animate-none` is correct with no second set of rules. Written the other way
 * round (clear by default, animated to pixelated) a reader who asked for less motion would
 * have been shown the secrets in full, which is the one outcome this drawing must not have.
 *
 * THE TWO ROWS DISSOLVE IN ORDER, a beat apart, which reads as something sweeping the table
 * rather than as a light being switched off. `tailwind.config.ts` holds the beats and the
 * reason they cannot be `animation-delay`s.
 *
 * ── THE STRINGS ───────────────────────────────────────────────────────────────────
 *
 * ENGLISH LITERALS IN BOTH LANGUAGES, and they are not catalogue keys — the file names, the
 * column headers, the values. Every one of them is a string the TOOL or the platform prints:
 * `/magic:commit` scans for exactly these patterns and names what it found (step 2.2), and a
 * private key's armour header is what OpenSSL writes. The rule `WorkflowArt.tsx` states and
 * the whole site follows.
 *
 * THE VALUES ARE SHAPED LIKE THE REAL THING AND ARE NOT REAL. `sk_live_` is Stripe's own
 * live-key prefix and `-----BEGIN RSA PRIVATE KEY-----` is the armour line, because a
 * plausible secret is the only kind a developer reads as a secret — and then the characters
 * after the prefix are keyboard noise. Nothing here has ever been a credential, which is
 * worth stating in a file whose whole subject is not leaking them.
 */
const SECRETS = [
  {
    file: '.env',
    value: 'STRIPE_SECRET_KEY=sk_live_4tQm8xZ2vKq9RbN7wYp3LdF6hTn5cRw8JgVe2QsMbXu7ZpAk3DyFo',
    reveal: 'animate-secret-reveal-1',
  },
  {
    file: 'credentials.json',
    value: '"private_key": "-----BEGIN RSA PRIVATE KEY-----MIIEowIBAAKCAQEA7vN2kQm8xZ2vKq9RbN',
    reveal: 'animate-secret-reveal-2',
  },
  {
    file: 'deploy/id_rsa',
    value: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vN2kQm8xZ2vKq9RbN7wYp3LdF6hTn5cRw8JgVe2Qs',
    reveal: 'animate-secret-reveal-3',
  },
  // THE CERTIFICATE, and it is the row that finally makes the card's own sentence complete.
  // The copy promises "environment files, credentials, private keys and certificates"; the
  // table listed the first three and left the fourth as a claim with nothing behind it.
  {
    file: 'certs/server.pem',
    value: '-----BEGIN CERTIFICATE-----MIIDXTCCAkWgAwIBAgIJAK9vN2kQm8xZ2vKq9RbN7wYp3LdF6hTn',
    reveal: 'animate-secret-reveal-4',
  },
  // THE REGISTRY TOKEN. The owner calls these cards "les token caché", and until now the
  // table held keys and credentials but no token as such — the one kind of secret a
  // developer is most likely to have committed by accident.
  //
  // AND IT IS THE ROW THAT GETS CUT. See the header: a table cropped through a row reads as
  // a long one, where cropped at a boundary it reads as a short one. Whichever row is LAST
  // is the one that exists to be sliced, so adding two secrets moved that job from the
  // private key to this.
  {
    file: '.npmrc',
    value: '//registry.npmjs.org/:_authToken=npm_8xZ2vKq9RbN7wYp3LdF6hTn5cRw8JgVe2QsMbXu7ZpAk',
    reveal: 'animate-secret-reveal-5',
  },
]

export function SecretsArt() {
  return (
    // `-mb-7` and not more: the panel's bottom is pinned to the card's by `ToneCard`'s
    // `end` slot, so this number IS how deep the crop bites. 28px cuts about twenty pixels
    // into the third row — enough that it reads as a row starting rather than as a thick
    // border, and not so much that a third row is legible. See the header for why the
    // depth matters.
    <div aria-hidden className="-mb-7 -mr-10 pl-7 pt-5">
      {/* THE FILTER DEFINITION. A zero-sized `absolute` svg carrying nothing but `defs`,
          which is the standard way to make an SVG filter available to HTML — the element
          paints nothing and takes no space, and `filter: url(#…)` on a span reaches it.

          `x/y/width/height` cover exactly the filtered element's own box: the default
          region is 10% larger on every side, and the dilation would then paint blocks
          outside the text's line. The primitive subregions are in pixels — see the note on
          `SECRET_PX` for what each of the five steps does. */}
      <svg aria-hidden focusable="false" width="0" height="0" className="absolute">
        <defs>
          <filter id={SECRET_PX} x="0" y="0" width="100%" height="100%">
            <feFlood x={SECRET_BLOCK >> 1} y={SECRET_BLOCK >> 1} width="1" height="1" />
            <feComposite width={SECRET_BLOCK} height={SECRET_BLOCK} />
            <feTile result="grid" />
            <feComposite in="SourceGraphic" in2="grid" operator="in" />
            <feMorphology operator="dilate" radius={SECRET_BLOCK / 2} />
          </filter>
        </defs>
      </svg>

      {/* `bg-canvas` — the site's off-white, and the third step of a ladder the band is
          already climbing: page, then coloured card, then panel. `PANEL_GROUND` in
          `BuiltForArt.tsx` states the same value for the same reason.

          A LIGHT PANEL ON A DARK CARD, which is `StartTerminal`'s relationship inverted and
          rests on the same rule: the contrast is what makes a panel read as something ON
          the card rather than as a hole IN it. `indigo` is a saturated mid-blue, so the
          off-white is the side of it with the room.

          `shadow-lift`, the top rung of the declared elevation scale — the same one every
          panel on this site sits on. `overflow-hidden` so the panel's own radius clips its
          header's corner; the CARD's overflow is what does the cropping. */}
      <div className={`${SECRET_PANEL} ${SECRET_TABLE} bg-canvas shadow-lift`}>
        {/* THE HEADER. 10px uppercase with tracking, which is what a column head looks like
            in the app's own tables — and small enough that it costs the panel no row.
            `SECRET` rather than `VALUE`: the second column is the thing the card is about,
            and naming it that is what makes the blur read as a redaction rather than as a
            rendering fault. */}
        <div className={`${SECRET_HEAD} pl-4 pr-6`}>File</div>
        <div className={`${SECRET_HEAD} pr-4`}>Secret</div>

        {SECRETS.map((secret) => (
          <Fragment key={secret.file}>
            {/* The file name stays sharp throughout. It is not the secret — `/magic:commit`
                REPORTS which files it pulled out, and a reader who could not read the file
                names would not know what the table was a table of. */}
            <div className={`${SECRET_CELL} whitespace-nowrap pl-4 pr-6 font-medium text-ink`}>
              {secret.file}
            </div>
            {/* THE SECRET, IN TWO STACKED LAYERS — the mosaic underneath, a readable copy
                on top of it that fades away.

                THE FILTER IS ON A SPAN AND NOT ON THIS CELL, and that is a bug fix rather
                than tidiness. The cell draws the row's `border-t`, and a filter applies to
                an element's border as much as to its text: `feMorphology` samples on a
                5-pixel grid, so a 1px rule along the top of the box is missed by nearly
                every sample and simply disappears. The owner saw it — "elle mange la border
                du haut du tableau". With the filter on an inner layer the border is outside
                the filtered box and cannot be touched, and the filter region shrinks to the
                line of text, which is all it ever needed to cover.

                A 1×1 GRID rather than absolute positioning: both layers are grid items in
                the same cell, so they stack exactly, both contribute to the row's height,
                and neither has to know the other's padding. Absolutely positioning the top
                copy would have pinned it to the cell's padding box and left it a few pixels
                above the text it is meant to cover. */}
            <div
              className={`${SECRET_CELL} grid overflow-hidden whitespace-nowrap pr-4 text-ink/70`}
            >
              {/* The mosaic. STATIC — nothing animates it, so the browser rasterises the
                  filter once and never looks at it again. That is a saving rather than the
                  fix: what actually cured the snap is that the thing being animated is now
                  interpolable. `tailwind.config.ts` holds the account and the measurement. */}
              <span className="col-start-1 row-start-1" style={{ filter: `url(#${SECRET_PX})` }}>
                {secret.value}
              </span>
              {/* The readable copy, lying on top and fading out. `opacity-0` is its BASE
                  state, so the resting panel is redacted and `motion-reduce:animate-none`
                  is correct with no second set of rules — the animation only brings it back
                  for a beat. Written the other way round, a reader who asked for less
                  motion would be shown the secrets in full, which is the one outcome this
                  drawing must not have. */}
              <span
                className={`col-start-1 row-start-1 bg-canvas opacity-0 ${secret.reveal} motion-reduce:animate-none`}
              >
                {secret.value}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
