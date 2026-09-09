import { ArrowLeft, ArrowRight, Lock, RotateCw } from 'lucide-react'
import { APP_HOST } from '@/lib/hostRouting'

/**
 * The drawing beside the cloud band: a browser window with the product's own dashboard
 * in it, drawn as a SKELETON — the logo in the header, and everything else as the grey
 * bars a page shows while it is still loading.
 *
 * ASKED FOR IN THOSE TERMS. "un navigateur web (style chrome) avec un site internet, qui
 * a un header avec notre logo et des placeholder style lazy loading, des bandes grises" —
 * and "pas besoin d'animation pour cette illustration", which is the one instruction here
 * that changes the code rather than the picture: every other drawing on this page runs
 * (`SkillsRunTerminal` types seven commands, `WorkflowArt` loops, `RepoCardMockup`
 * storyboards a dev server), so this is the site's first mockup that is a still. It is
 * therefore a SERVER component — no `'use client'`, no hook, no state — which is worth
 * naming because every file next to it opens with that directive and a reader will
 * wonder what is missing. Nothing is.
 *
 * ── WHY A SKELETON AND NOT THE DASHBOARD ──────────────────────────────────────────
 *
 * The other mockups on this site are REPRODUCTIONS: `AppWindowMockup` is the app's
 * titlebar and rails at the app's own pixel values, `RepoCardMockup` is drawn class for
 * class off `RepositoryCard.tsx`. This one is deliberately not, and the difference is
 * not laziness — it is what the band is for. `/cloud` is a page still being written
 * (`PLACEHOLDER_PAGES` in `lib/siteNav.ts`), the dashboard behind it moves every week,
 * and a faithful drawing of `app/dashboard` would be a promise about a screen that has
 * changed by the time anybody clicks through. A skeleton says THERE IS A WEB APP AND IT
 * IS OURS — which is the whole claim the three rows beside it make — and says it without
 * naming a single number, plan or price that could go stale.
 *
 * WHAT IS REAL IN IT: the logo (`logo-black.svg`, the header's own artwork) and the
 * address, which is `APP_HOST` rather than a string — the drawing names the host
 * `lib/hostRouting.ts` actually routes the product on, so the day that moves the picture
 * moves with it. Those two are what make the grey read as OUR page loading rather than
 * as a generic wireframe.
 *
 * ── THE BROWSER ───────────────────────────────────────────────────────────────────
 *
 * "Style chrome", so it is Chrome's own arrangement and not a generic frame: a tab strip
 * with the three macOS discs at its left and one active tab lifted out of it in white,
 * then a toolbar with back, forward, reload and the address pill. Two rows rather than
 * one, which is what makes it read as a browser at a glance — a single bar with a URL in
 * it is what every "app window" mockup on the internet is.
 *
 * NO NEW-TAB PLUS, and it was drawn there for one round. Removed by request, and it is
 * the right cut: the glyph is a CONTROL — the one affordance in a drawing that is
 * otherwise all surface — and on a page explicitly still loading, a button that invites a
 * click is the thing an eye goes to first. Its absence costs the frame nothing, because
 * the tab beside a bare strip is already the shape that says "tab".
 *
 * THE TRAFFIC LIGHTS ARE `AppWindowMockup`'s, at its geometry and on the same three
 * `macos-*` tokens, so the two windows on this page are lit by one decision. They are 10px
 * here against that window's 12px because this frame is drawn at its own scale rather
 * than scaled down from the app's 1280×800 — see below.
 *
 * IT RUNS OFF THE PLATE'S RIGHT EDGE, by request, and the page inside it is cut by its own
 * bottom edge. `PLATE` below holds that construction and the argument for why the crop
 * ended up on one side and not two.
 *
 * NO ZOOM, which is where this parts company with `AppSection`. That band's plate carries
 * a five-rung table of heights AND `scale()` values, because the thing inside it is
 * 1280×800 of the app's real pixels and a transform is the only way to keep a
 * reproduction's proportions exact. Nothing here is a reproduction, so the window is
 * FLUID: it takes a share of the art column, and its rows are set in the page's own type
 * scale rather than in the app's pixels. Which means the crop is one percentage and three
 * heights, and nothing to recompute the day `SplitFeature`'s share changes.
 *
 * ── THE GREY ──────────────────────────────────────────────────────────────────────
 *
 * TWO ALPHAS AND NOT SIX. `bg-ink/10` is a bar that stands for a heading or a control,
 * `bg-ink/[0.06]` one that stands for body text — the same 6% wash this site already
 * uses under text elsewhere, and a step under the 8% `hairline` the frame's own rules are
 * drawn at, because a placeholder is a surface and must sit under the weight borders are
 * drawn at. A skeleton with a grey per element is a greyscale illustration; two says
 * "primary, secondary" and lets the eye group the page.
 *
 * ROUNDED FULL on every bar, which is what separates a skeleton from a wireframe: a
 * square grey rectangle reads as a placeholder IMAGE, a pill reads as a line of text that
 * has not arrived. The two blocks that stand for pictures are the exception and take a
 * radius (`rounded-md`), for exactly that reason.
 *
 * `aria-hidden` on the root: it is a drawing, and a screen reader announcing sixteen
 * empty bars would be reciting a loading state that is not happening.
 */

/**
 * THE PLATE'S BOX: A BAND ON THREE SIDES AND A HARD EDGE ON THE FOURTH.
 *
 * `pl` / `pt` / `pb` AND NO `pr`, and no height of its own. The window is `w-[122%]` of
 * this box's content width, so it runs off the RIGHT and `overflow-hidden` cuts it there;
 * the other three sides are a band of green the window sits inside. The plate's height is
 * therefore the window's plus the two insets — one less number to keep in step, and the
 * band cannot drift out of proportion with the drawing it frames.
 *
 * -- WHY THE CROP IS ON ONE SIDE AND NOT TWO --------------------------------------
 *
 * This is the second thing the product owner asked for and it partly reverses the first,
 * so the reasoning is written out rather than left as a diff to interpret. The brief was
 * "croper un peu en bas et a droite", and it shipped that way: a fixed-height plate with
 * a left-and-top inset, exactly `AppSection`'s construction, the window running off the
 * bottom and the right. Then came "tu peux mettre un degrade dans le background comme la
 * color card vert" — and those two requests are in direct geometric conflict, which is
 * worth knowing before anybody reverses this again.
 *
 * `mesh()` PUTS A TONE'S COLOUR IN ITS LOWER HALF. Six blooms, centred between y=48% and
 * y=95% (see `WASH` in `tailwind.config.ts`, and note the composition is TRACED from a
 * reference rather than composed, so it cannot be moved for one call site). Above them is
 * the flat quiet stop. So a plate cropped at the bottom AND the right shows only its
 * upper-left corner — which is `MINT_LIGHT` and nothing else. Measured off the rendered
 * page at every visible point of that version: 228,246,235 in the top band, 228,246,235
 * down the left band, 226,244,232 in its bottom corner. A flat pale green, to within two
 * values of each other, over the whole visible ground. The gradient was there and the
 * window was standing on all of it.
 *
 * WHAT THE BOTTOM BAND BUYS, same measurement: 159,217,178 under the middle of the window
 * and 146,212,175 towards its right, against 228,246,235 at the top of the same plate.
 * That is the mint the colour cards read as, and a gradient with somewhere to travel.
 *
 * SO THE BOTTOM CROP WAS SPENT ON THE GRADIENT and the right-hand one was kept, because
 * of the three sides the right is the one that costs nothing: it cuts the skeleton's third
 * card and the tail of the address bar, both of which say "the page is wider than this"
 * without hiding any of the ground. A bottom crop hides the only part of the plate that
 * is actually coloured. IF THE TWO-SIDED CROP IS EVER WANTED BACK, the honest way to get
 * it is a tone whose colour gathers in the upper left — a new entry in `TONES`, not an
 * inset retuned here.
 *
 * WHAT REPLACES IT AT THE BOTTOM: the window's page is 13/14/15rem, a little shorter than
 * the skeleton stacked inside it, so the list's last row and the card holding it are cut
 * by the window's OWN bottom edge. Which is what a browser does to a page taller than its
 * viewport, and it keeps the "there is more below" cue the bottom crop used to carry —
 * inside the frame instead of at its expense.
 *
 * -- THE NUMBERS ------------------------------------------------------------------
 *
 * THE INSET IS 32/56/64px on the left and 24/40/48 top and bottom. Up from the 20/28/32
 * the uncropped plate used, and the reason is the same measurement as above: these bands
 * are the only ground that shows, so they have to read as a FIELD rather than as an edge.
 * `AgentsSidebarMockup` on `/features` runs the same argument further — `pl-8 sm:pl-20`,
 * 80px of blue band, no top inset at all — because its window is nearly black where this
 * one is white, and a pale drawing needs more ground showing to be seen ON it.
 *
 * `w-[122%]` IS THE CUT, and a percentage rather than a rung table because the art column
 * is itself a share (`SplitFeature`'s `grow-[6]` of eleven): a fixed overhang would be a
 * fifth of the drawing on a phone and a sliver on a desktop. It is a percentage of the
 * plate's CONTENT box, which the left inset makes narrower than the plate — so it has
 * risen with every widening of that inset (113 -> 118 -> 122) to keep the same slice of
 * window off the edge. 22% puts the cut inside the skeleton's third card at every width:
 * never so deep that the page's own left rail is all that is left of it.
 *
 * Both are literal strings because Tailwind reads SOURCE: a value assembled from a number
 * at runtime is a class that was never generated.
 */
const PLATE = 'pb-6 pl-8 pt-6 sm:pb-10 sm:pl-14 sm:pt-10 lg:pb-12 lg:pl-16 lg:pt-12'

const WINDOW_WIDTH = 'w-[122%]'

/**
 * ONE SKELETON BAR. `h-*` and `w-*` come from the call site because they are the drawing
 * — the whole composition is which bar is how long — and the colour does not, because
 * that is the one thing every bar must share. See the note on the grey above.
 *
 * THE RADIUS IS A SLOT AND NOT A `className`, which is the discipline
 * `components/ui.tsx` sets out at length: appended to the recipe, a caller's
 * `rounded-md` would be a CONFLICTING utility against the base's `rounded-full`, and
 * which one won would be decided by where Tailwind happens to emit the two class names
 * rather than by anybody's intent. `block` REPLACES the pill instead of racing it — and
 * the two shapes are the two things a placeholder can stand for, so a boolean is the
 * whole vocabulary: a pill is a line of text that has not arrived, a rounded square is a
 * picture or a control.
 */
function Bar({ className, faint, block }: { className: string; faint?: boolean; block?: boolean }) {
  return (
    <span
      className={`block ${block ? 'rounded-md' : 'rounded-full'} ${
        faint ? 'bg-ink/[0.06]' : 'bg-ink/10'
      } ${className}`}
    />
  )
}

/** One of the browser's three toolbar glyphs, at the weight the frame's rules are drawn at. */
function ToolbarIcon({ icon: Icon }: { icon: typeof ArrowLeft }) {
  return <Icon className="h-3.5 w-3.5 shrink-0 text-ink/25" strokeWidth={2} />
}

/**
 * ONE CARD IN THE SKELETON'S MAIN COLUMN: a small block where a picture or a figure would
 * be, a heading bar, and a shorter line under it. Three of them, which is the shape a
 * dashboard's top row has on every product that has one — and the shape the band's own
 * three rows put beside it, which is a resemblance worth having rather than avoiding.
 *
 * `w-full` INSIDE A `grid`, so the three share the column evenly and none of them decides
 * the width. The bars inside are fractions of the card for the same reason: fixed pixel
 * widths would be wrong the moment the art column changes share.
 */
function SkeletonCard() {
  return (
    <div className="rounded-lg border border-hairline bg-white p-2.5">
      <Bar block className="h-4 w-4" />
      <Bar className="mt-2.5 h-1.5 w-3/4" />
      <Bar faint className="mt-1.5 h-1.5 w-1/2" />
    </div>
  )
}

/** One row of the skeleton's list: a square, a long line, and a short one pushed right. */
function SkeletonRow({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-2">
      <Bar block className="h-3 w-3 shrink-0" />
      <Bar faint className={`h-1.5 ${width}`} />
      <Bar className="ml-auto h-1.5 w-6 shrink-0" />
    </div>
  )
}

export function CloudBrowserMockup() {
  return (
    // THE PLATE, AND IT IS THE GREEN THAT WAS ASKED FOR: `tone-mint`, the design
    // system's own green ground and the one `/features` puts on `/magic:done`. The inset
    // is `SkillsRunTerminal`'s — 5/7/8 — so the two drawings on this page that sit on a
    // coloured plate are inset by the same air, and the band reads as a sibling of the
    // skills band rather than as a third arrangement.
    //
    // IT CROPS THE RIGHT, and the green band on the other three sides is what carries
    // the gradient. `PLATE` holds that whole argument, including the measurements that
    // decided it and what a two-sided crop would cost — read it before changing an inset.
    //
    // WHAT IT COST TO GET HERE: this shipped uncropped one round, on the argument that a
    // browser cut off would undersell a page nobody has seen yet. Wrong, and worth
    // recording rather than quietly reversing — the uncropped frame read as a stock
    // browser mockup precisely BECAUSE it was whole and centred, which is what every such
    // picture on the internet is. Cut on one side, it reads as a screen somebody is
    // working on.
    //
    // `overflow-hidden` IS WHAT DOES THE CROPPING, and it clips `shadow-lift-mint` on the
    // cut edge. That is correct rather than a loss: that edge is not there.
    <div aria-hidden className={`overflow-hidden rounded-2xl bg-tone-mint ${PLATE}`}>
      {/* `shadow-lift-mint` AND NOT `shadow-lift`, which is the token's second consumer
          and its own note says why: a grey shadow on a green ground reads as dirt and a
          green one as depth. `overflow-hidden` is what lets the tab strip's grey and the
          page's canvas run to the frame's rounded corners — without it the two would
          square off the top and the bottom of a `rounded-xl` window. */}
      <div className={`overflow-hidden rounded-xl bg-white shadow-lift-mint ${WINDOW_WIDTH}`}>
        {/* ── THE TAB STRIP ── the discs and one lifted tab. `items-end` so the tab's
            bottom edge meets the toolbar under it and the two read as one frame; `pt-2` is
            the only air above it, which is Chrome's own proportion. */}
        <div className="flex items-end gap-2 bg-ink/[0.06] px-3 pt-2">
          {/* 10px discs on a 6px gap. `AppWindowMockup`'s `TrafficLights` is absolute
              inside the app's 64px gutter and cannot be reused in a flex row, so the
              three colours are what is shared and the geometry is this frame's. */}
          <span className="flex shrink-0 gap-1.5 pb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-macos-close" />
            <span className="h-2.5 w-2.5 rounded-full bg-macos-minimize" />
            <span className="h-2.5 w-2.5 rounded-full bg-macos-zoom" />
          </span>

          {/* THE ACTIVE TAB, in white with only its top corners rounded — which is the
              whole trick of a tab: it is the page's own surface reaching up through the
              strip. `min-w-0` because the favicon and the title bar inside it are flex
              items and a tab is allowed to be narrower than its content at 320px.

              A SINGLE TAB, deliberately. Two or three inactive ones would be a browser
              with other sites open in it, and every one of those tabs is a grey pill the
              reader has to decide is not part of the skeleton.

              `sm:max-w-[13rem]` IS WHAT MAKES IT A TAB. On `flex-1` alone it took the
              whole strip, and a white bar the width of the window with one grey pill in it
              is a second toolbar, not a tab — the shape only reads once there is bare strip
              to its right for it to be lifted OUT of. The cap lifts below `sm`, where the
              drawing is ~230px wide and 13rem would be most of it anyway. */}
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-t-lg bg-white px-2.5 py-1.5 sm:max-w-[13rem]">
            {/* The favicon, and it is the one mark in the tab: the product's own,
                reduced to the brand disc rather than the wordmark, which is what a
                16px favicon of this logo would be. */}
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
            <Bar className="h-1.5 min-w-0 flex-1" />
          </span>
        </div>

        {/* ── THE TOOLBAR ── back, forward, reload, then the address. `border-hairline`
            under it is the site's own 8% rule, so the frame is drawn at the weight every
            other border on this page is. */}
        <div className="flex items-center gap-2 border-b border-hairline bg-white px-3 py-2">
          <ToolbarIcon icon={ArrowLeft} />
          <ToolbarIcon icon={ArrowRight} />
          <ToolbarIcon icon={RotateCw} />

          {/* THE ADDRESS PILL, and the address is real — `APP_HOST`, imported rather
              than typed, so the drawing cannot outlive the host it names. `truncate` for
              the narrowest column, where the pill is barely wider than the padlock.
              `text-[10px]` is under this site's smallest declared step on purpose: it is
              chrome, not copy, and at 12px it would read as a line the band is making an
              argument with. */}
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-ink/[0.06] px-2.5 py-1">
            <Lock className="h-2.5 w-2.5 shrink-0 text-ink/30" strokeWidth={2.5} />
            <span className="truncate text-[10px] leading-none text-ink/45">
              {APP_HOST}
            </span>
          </span>
        </div>

        {/* ── THE PAGE ── on `canvas`, which is this site's own ground (`#F4F7FE`): the
            grey belongs to the placeholders, so the surface under them has to be the page
            the product actually paints, or the whole drawing turns into one grey field.

            THE HEIGHT IS WHAT MAKES THE WINDOW A WINDOW: content-sized, the frame would
            be as tall as sixteen bars happen to stack, which is a shape nobody chose. It
            is also deliberately a little SHORTER than the skeleton stacked inside it, so
            the list's last row is cut by the window's own bottom edge — the "there is
            more below" cue, which is the job the plate's bottom crop used to do before
            that crop was spent on the gradient. See `PLATE`. */}
        <div className="h-[13rem] bg-canvas p-3 sm:h-[14rem] sm:p-4 lg:h-[15rem]">
          {/* THE SITE HEADER, and the logo in it is the only ink on the page.

              `h-5 sm:h-6` — 20 then 24px, up from 12/14, by request ("le logo magic-slash
              en plus gros"). The first pass argued the opposite at length: the artwork is
              736×214, so a small box draws ~10px of wordmark, and a logo drawn at a
              READABLE size inside a browser drawn at a third of one would be out of scale
              with everything under it. Half of that still holds — this is why the bars
              beside it grew too, see below — but the premise was wrong. The logo is the
              one thing in this drawing that says WHOSE page is loading, and at 12px it was
              a smudge the eye skipped: recognisable is the requirement, and 12px did not
              meet it. At 24px it draws ~70px of wordmark, which is a header's logo at the
              scale the rest of the page is drawn at rather than a badge in the corner.

              THE HEADER GREW WITH IT, from `pb-2.5` to `pb-3`, and the nav bars from
              `h-1.5` to `h-2` with the button from `h-3 w-8` to `h-4 w-10`. Not
              decoration: the row's height is set by its tallest child, so a 24px logo
              beside 6px bars is a logo with a header built around it and a nav that
              shrank away from it. The bars are still a step under the logo — they stand
              for words, and words in a nav are smaller than a wordmark. */}
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <img className="h-5 w-auto shrink-0 sm:h-6" src="/img/logo-black.svg" alt="" />

            {/* The nav, as three bars pushed right, then the button. The button is a bar
                like the rest rather than a brand-blue pill: the header would then have a
                live-looking control in a page that is explicitly still loading, and the
                one thing a skeleton must not do is finish in one place. */}
            <span className="ml-auto flex items-center gap-2">
              <Bar faint className="h-2 w-6" />
              <Bar faint className="h-2 w-8" />
              <Bar faint className="h-2 w-5" />
              <Bar block className="h-4 w-10" />
            </span>
          </div>

          {/* THE BODY, as a rail and a column — the shape the product's own dashboard has
              (`components/AppShell.tsx`) and the shape a reader recognises as an
              application rather than as a marketing page. The rail is `hidden sm:flex`:
              at the narrowest rung the whole drawing is ~230px wide, and a 48px rail
              inside it leaves a main column too narrow for three cards. */}
          <div className="mt-3 flex gap-3">
            <div className="hidden w-12 shrink-0 flex-col gap-2 sm:flex">
              <Bar className="h-1.5 w-full" />
              <Bar faint className="h-1.5 w-3/4" />
              <Bar faint className="h-1.5 w-full" />
              <Bar faint className="h-1.5 w-2/3" />
            </div>

            <div className="min-w-0 flex-1">
              {/* The page's own title and its lead, at the two alphas: a heading bar over
                  a fainter, longer one. The proportions are a real page's — a short
                  title over a wide line of body copy — which is what makes two grey bars
                  read as a heading and a subtitle rather than as two bars. */}
              <Bar className="h-2 w-20" />
              <Bar faint className="mt-2 h-1.5 w-full max-w-[9rem]" />

              <div className="mt-3 grid grid-cols-3 gap-2">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>

              {/* The list under the cards, on the white surface the product's own tables
                  sit on. Three rows at three widths, because four identical ones read as
                  a pattern and a table's rows never are. */}
              <div className="mt-3 flex flex-col gap-2.5 rounded-lg border border-hairline bg-white p-2.5">
                <SkeletonRow width="w-2/3" />
                <SkeletonRow width="w-1/2" />
                <SkeletonRow width="w-3/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
