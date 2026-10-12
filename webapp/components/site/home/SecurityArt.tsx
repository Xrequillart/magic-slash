'use client'

import { Fragment } from 'react'

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
 *     guard rail doing this one thing. That graph has since gone too, the other way: the
 *     card now carries an illustration from the site's own set (`illustration-shield.svg`,
 *     drawn by `SecuritySection`), on the owner's call.
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
 * rule scans this file as TEXT, comments included — the same note `DesktopContent` carries
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
