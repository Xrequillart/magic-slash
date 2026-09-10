import type { Config } from 'tailwindcss'

// Light theme matching the /docs landing page: soft-blue canvas, black text,
// Cera Pro (display) + Avenir (body), indigo/brand-blue accents.
//
// The `regie` scale dresses /admin. It shares the app's blue family rather than
// opposing it — the back-office is a different ROOM, not a different building — so
// the demarcation is carried by structure instead of colour: a side nav where the
// user pages have a top bar, full-bleed width where they have a centered column,
// monospace for every value, and a brand badge that names the place.
//
// Namespaced so nothing leaks into the user pages by autocomplete, and so the two
// can be retuned independently.
const BRAND = '#393BFF'

// The page's own black.
//
// A CONSTANT BECAUSE TWO PLACES SPELL IT: the `ink` colour below and `midnight`'s top
// stop, which is the field that whole tone sits on. It was a literal in each while it was
// only a colour; a ground that has to STAY the page's black is what makes it worth
// naming, since an ink that drifted and a card that did not would be two blacks nobody
// would think to compare.
//
// IT WAS ALSO THE TONES' SHADOW until the wash was traced from its reference. `mesh()`
// used to darken both bottom corners with this at a named alpha; the reference has no
// such layer — its darkest point is the periwinkle itself, not black under the
// periwinkle — and side by side the ink was what made the old cards look dusty. See the
// note on `WASH`. Note this was deliberately NOT `SHADOW_TINT`: the elevation scale is
// cast in a desaturated indigo because it falls on the blue canvas, where a neutral black
// reads as soot, whereas a tone's shadow fell on the tone itself and a blue-tinted shadow
// on `amber` or `lemon` reads as a bruise rather than as depth.
const INK = '#0A0A0A'

// Every shadow in the scale is cast in the same desaturated indigo rather than in
// black. On the blue canvas (#F4F7FE) a neutral-black shadow reads as grey soot
// under the card; tinted towards the page it reads as depth. The value comes from
// the one hand-tuned shadow the codebase already had — the leaning illustration in
// `SkillHoursOptIn`, now `shadow-lift` — so the scale is an extension of a shadow
// that was already approved in a browser, not a fresh invention.
const SHADOW_TINT = (alpha: number) => `rgba(19, 16, 48, ${alpha})`

// One status line of the `/features` start card, as a keyframe.
//
// THE STAGGER IS IN HERE AND NOT IN AN `animation-delay`, and that is a correctness
// fix rather than a style choice. A delay on an `infinite` animation applies to the
// FIRST iteration only — every later cycle starts the instant the previous one ends.
// So five lines delayed 2.4s…6.4s each keep their own phase for ever: line one wraps
// back to hidden at 13.4s, line five at 17.4s, and `caret-type` (no delay) wraps at
// 11s. The command retypes itself while all five lines are still on screen, and the
// panel never actually resets.
//
// Baked into the keyframes, every element shares one duration and one start, so every
// cycle boundary lands on the same instant: the list clears and the command retypes
// together, which is what a session starting over looks like.
//
// `hidden` and `shown` are percentages of the shared 11s loop. Both ends are stated so
// the line holds hidden from 0 and holds shown to 100 — no fill mode required.
// One strike-through being drawn, as a keyframe: a bar whose WIDTH grows across the
// label it crosses.
//
// WIDTH AND NOT OPACITY, which is the whole effect. A line that fades in has already
// crossed the word before you see it; one that grows reads as the pen moving, which is
// what "struck through" looks like when it happens rather than when it is done. It costs
// a keyframe per row because the timing is per row, the same way the ticks are.
//
// `text-decoration: line-through` would have been the obvious tool and cannot be
// animated at all — there is no interpolable value between "none" and "line-through" —
// so the bar is an element.
const strikeAt = (at: number) => ({
  '0%': { width: '0%' },
  [`${at}%`]: { width: '0%' },
  [`${at + 4}%`]: { width: '100%' },
  '100%': { width: '100%' },
})

// One CI check settling, as a PAIR of keyframes — the spinner leaving and the tick
// arriving at the same instant.
//
// TWO AND NOT ONE, and it is not for want of trying to make it one. A lucide icon is a
// stroked SVG with a transparent middle, so stacking a tick under a spinner and fading
// only the spinner leaves both sets of strokes visible through each other for the whole
// crossfade — a smudge, not a transition. Each has to carry its own opacity.
//
// `at` is the percentage of the shared loop where the check resolves; the swap takes 4%
// of it. Both end on the settled state, so `motion-reduce:animate-none` shows a passed
// check rather than a frozen spinner — see the note on `statusIn` below for why the
// stagger lives in these percentages and not in an `animation-delay`.
const ciSettled = (at: number) => ({
  '0%': { opacity: '0' },
  [`${at}%`]: { opacity: '0' },
  [`${at + 4}%`]: { opacity: '1' },
  '100%': { opacity: '1' },
})

const ciPending = (at: number) => ({
  '0%': { opacity: '1' },
  [`${at}%`]: { opacity: '1' },
  [`${at + 4}%`]: { opacity: '0' },
  '100%': { opacity: '0' },
})

const statusIn = (hidden: number, shown: number) => ({
  '0%': { opacity: '0', translate: '0 0.25rem' },
  [`${hidden}%`]: { opacity: '0', translate: '0 0.25rem' },
  [`${shown}%`]: { opacity: '1', translate: '0 0' },
  '100%': { opacity: '1', translate: '0 0' },
})

// THE CARD TONES. Eight gradients, declared here and used as `bg-tone-<name>`.
//
// Named and centralised for exactly the reason the elevation scale is: a
// `bg-[linear-gradient(135deg,#6366f1,#393BFF)]` pasted at a call site renders
// perfectly and passes every check, and what it costs is the ability to retune the
// family later — one card would carry a gradient nobody will find again.
// `lib/designTokens.test.ts` pins them all.
//
// FOUR OF THEM CYCLE, though eight cards use them. A tone is normally a SURFACE in a
// family, not an identity: cycling four across the eight skills gives the grid the
// light/dark rhythm it is built on without turning the palette into a legend the
// reader has to learn. It also means adding a ninth skill costs no new colour.
//
// THE OTHER FOUR ARE NAMED, never dealt: `mint`, `amber`, `rose` and `lemon` are asked
// for by name, so a card that carries one keeps it through a reorder. See the note on
// each, and `CARD_TONE_CYCLE` in `components/ui.tsx`.
//
// DECLARED HERE IS NOT THE SAME AS USED ON A PAGE, and the distinction is the thing to
// hold on to. This table is the design system's palette of grounds — what a card MAY be
// — and the tighter question is how many of them one grid is allowed to name at once.
// `/features` names exactly two of the four (amber on `/magic:start`, mint on
// `/magic:done` — the loop's bookends) and `features.test.ts` pins that as an exact
// list, because a third named ground in a grid of eight is where a rhythm turns into a
// legend the reader has to learn. `rose` and `lemon` are therefore available rather than
// unused: a ground a later page can ask for without inventing a gradient at a call site,
// which is the one thing this file exists to prevent.
//
// TWO LIGHT, TWO DARK, in that order, which is what makes the cycle work — a grid of
// four columns lands one of each per row, so no two neighbours are the same weight.
// The text colour that goes with each is NOT here: it belongs with the component
// that draws the card, so a tone and its ink can never be paired wrongly. See
// `CARD_TONES` in `components/ui.tsx`.
//
// NONE OF THEM IS A LINEAR GRADIENT, and that is the one thing to know before reading a
// card as "wrong": every tone is the same DIFFUSE WASH — a flat pale field where the copy
// sits, and six soft blooms gathering the colour into the lower half in two pools of
// slightly different hue. `mesh()` below builds it, `WASH` is the composition and
// `BLOOM_RAMP` the falloff, and between them they hold the whole argument for it.
//
// IT IS TRACED RATHER THAN COMPOSED. The picture is a reference file the product owner
// supplied; the six blooms are the result of FITTING that bitmap, and they land within
// 2.5/255 of it. So the numbers in `WASH` are a measurement, and `tone-sky` — whose two
// stops are the reference's own — is that picture rather than a reading of it.
//
// NO TWO OF THEM ARE THE SAME ARRANGEMENT, though, which is the other thing to know
// before reading a card as "wrong". Seven of the eight pass their own NAME to `mesh()`,
// and the dice it seeds decide which side the near pool gathers on and where each of the
// six blooms lands inside the budget `WASH` gives it — so picking a different tone for a
// card moves its blooms rather than only recolouring them. `tone-sky` is the exception
// and passes no name: it is the traced picture, and the anchor does not move.
//
// EVERY ILLUSTRATION ON THE SITE IS ON ONE OF THESE, which is worth knowing before
// retuning any of them. `bg-tone-*` is not only the marketing cards' ground: it is the
// plate behind every mockup on `/features` and on the homepage — `SplitViewMockup`,
// `AgentsSidebarMockup`, `TasksModalMockup`, `RepoCardMockup` and a dozen more all sit on
// `mist`, `sky` or `indigo`. So these six blooms are what a drawing of the app is
// photographed against, and a change here moves ~30 surfaces at once.
//
// The stops are spelled as literals because THIS is their declaration site, the same
// way `SHADOW_TINT` spells its rgba here. `mist` opens on a near-white and `sky` on the
// reference's own field; `indigo` runs `accent` into a brand blue driven past `brand`'s
// own lightness; `midnight` runs `ink` into a deepened `brand` rather than into `brand`
// itself, which at full saturation would end the card brighter than the page it sits on.
//
// THE THREE BRAND-HUE DEPTHS ARE A LADDER, and it is worth reading as one: `brand` at
// hsl(239, 100%, 61%), `INDIGO_DEEP` at 45%, `BRAND_DEEP` at 26%. Same hue on all three,
// so they are one colour at three depths rather than three blues, and each rung is far
// enough from its neighbour to be a decision somebody could defend.
const BRAND_DEEP = '#1B1C6B'

// `accent`, and `indigo`'s quiet stop.
//
// A CONSTANT BECAUSE TWO PLACES SPELL IT: the `accent` colour below and the field of
// `tone-indigo`. That pairing is the reason it needs a name — the tone is "the accent,
// lit" and the day somebody retunes the accent without it the card becomes a blue the
// palette no longer contains.
const ACCENT = '#6366F1'

// `indigo`'s deep stop, and the one value in the blue family that is neither `brand` nor
// a shade of the page.
//
// IT USED TO BE `brand` ITSELF, which was the tidier line — "the design system's own two
// blues, accent into brand" — and it produced the flattest card of the eight. `accent`
// and `brand` are five points of lightness apart, and five points is not a wash: with no
// ink shadow left to fake the depth (see `INK`), `tone-indigo` read as a rectangle
// somebody had filled. This is `brand`'s own hue driven down to 45% lightness, which
// gives the tone eighteen points of travel — the same weight `midnight` carries — while
// still being unmistakably the brand blue rather than a navy.
//
// SATURATION SITS AT 92% AND NOT `brand`'s 100%, which is the one number here that was
// chosen by eye rather than solved for. At full saturation this deep is very nearly pure
// blue, and `cooled()` swings the second lamp off it into something electric; eight
// points back is the difference between a card that reads as lit and one that reads as a
// screensaver.
const INDIGO_DEEP = '#090DDC'

// The palest tone's two stops.
//
// NEAR-WHITE INTO A REAL BLUE, which is a change of mind about what "palest" buys. This
// was #F7FAFF into #E8F0FF — three points of lightness apart, which on the traced wash
// is not a whisper but nothing at all: the blooms are there in the stylesheet and no eye
// can find them. The deep stop is now a proper light blue, eleven points of travel, and
// `mist` stays the quietest of the light grounds because its FIELD is still a near-white
// nothing else in the family goes near.
//
// ITS DEEP STOP IS `sky`'s HUE (212) and not the 219 it used to carry, so the two blue
// grounds pool in the same blue and read as one family at two volumes rather than as two
// blues that nearly match — which is the worse of the two failures, and the one nobody
// can name when they see it.
//
// PALE IS STILL THE JOB, though, and this is the tone that has to hold it: `mist` is what
// the mockups are photographed against — `SplitViewMockup` and a dozen more — so its
// ground has to stay quiet enough that a drawing of the app is the thing being looked at.
// Eleven points is the most this can take before the ground starts competing.
const MIST_LIGHT = '#F7FAFF'
const MIST_DEEP = '#B3D2F7'

// The blue tone's two stops, and the only pair in this file READ OFF A PICTURE rather
// than chosen: they are the reference `mesh()` is traced from, so `tone-sky` is that
// image and not an interpretation of it. See the note on `'tone-sky'` for what they
// replaced and why a lamp this saturated still lands as a light ground.
//
// They are also the family's ANCHOR: every other tone's stops were tuned by rendering
// the wash and measuring its travel against SKY's thirty points of L*. See the note on
// `MINT_DEEP` for what that measurement is and why it is the honest way to compare two
// grounds of different hue.
const SKY_LIGHT = '#E2EEFC'
const SKY_DEEP = '#4D77EE'

// The green tone's two stops.
//
// A PALE FIELD AND A REAL GREEN, which is the settlement between two mistakes this tone
// has now made in both directions. It started SATURATED — #2F9E68 into a near-black
// green, white type on it — and read as a warning rather than as a finish: a dark
// saturated green at the bottom of a grid of blues is the loudest thing on the page, and
// `/magic:done` is the quietest moment in the loop. The correction was two pale stops
// twelve points apart, and on the traced wash that went too far the other way: the blooms
// were in the stylesheet and the card looked like a tint somebody had forgotten to
// finish.
//
// SO THE FIELD STAYED AND THE LAMP CAME BACK. #E4F6EB is the same near-white it has
// been; the deep stop is a mid green that gives the tone FIFTEEN POINTS of L* travel,
// which is deliberately `amber`'s number rather than a value of its own — those two are
// the loop's bookends, amber opening it and mint closing it, so a grid that shows both
// should show them at the same volume. Dark ink still reads on it, which is the
// constraint that decides how far this can go.
//
// EVERY TRAVEL QUOTED IN THIS FILE IS MEASURED ON THE TRACED COMPOSITION, before the
// dice. `mesh()` jitters each bloom's peak alpha by up to five points and moves the pools
// around, so what a given tone actually renders lands a point or two either side of its
// number — mint at 16, amber at 13. Tuning the stops against the traced composition is
// what makes two tones comparable at all; quoting the post-dice figure would be quoting an
// arrangement rather than a colour.
//
// L* AND NOT HSL LIGHTNESS, on that measurement, because HSL is the wrong instrument for
// comparing two hues: #74CA9C and a blue at the same HSL lightness are nowhere near the
// same brightness to an eye. The travel quoted for every tone in this file is the L*
// range of the RENDERED wash — the whole card, not the two stops — which is the only
// number that says what somebody actually sees.
//
// `green` in the palette above (#22c55e) is a STATUS token — it means "this finished" on
// a check, a diff's additions, a passing gauge. These stops are not it, deliberately: a
// ground is not a status, and spending the status colour on decoration is how a green
// stops meaning "ok" anywhere. This deep stop is close enough to it now to be worth
// saying twice.
const MINT_LIGHT = '#E4F6EB'
const MINT_DEEP = '#74CA9C'

// The orange tone's two stops.
//
// BUILT LIKE `sky` AND NOT LIKE `mint`, which is the one decision in here. Both of those
// are light grounds under dark ink, and the difference between them is TRAVEL: `mint` is
// two pale stops eight points apart because `/magic:done` is the quietest moment in the
// loop, and `sky` opens wide on purpose because a flat wash beside `midnight` reads as a
// card someone forgot to fill. This tone dresses `/magic:start`, which is the loudest
// moment — it is the command somebody actually types to find out whether any of this is
// real — so it takes `sky`'s wide sweep rather than `mint`'s whisper, and the grid opens
// warm and closes green.
//
// STILL LIGHT ENOUGH FOR `text-ink` AT BOTH STOPS, which is the constraint that decides
// how far the deep end can go: #F9A96A against #0a0a0a is far past any contrast floor,
// and `lib/designTokens.test.ts`'s ink pairing is what keeps the two moving together if
// it is ever retuned.
//
// NOT `yellow` (#eab308) AND NOT `plate-claude`'s coral, and both near-misses are worth
// naming. `yellow` is a STATUS token — it means "changed" on a changelog dot and
// "watch this" on a gauge — and spending it on a ground is how a colour stops meaning
// anything, the same argument the note above `MINT_LIGHT` makes about `green`. Claude's
// coral (#D97757) belongs to the PLATES, which are somebody else's brand: an orange card
// close enough to it would read as "this is the Claude one", which is a claim about the
// card that is not true.
const AMBER_LIGHT = '#FFE4CC'
const AMBER_DEEP = '#F9A96A'

// The pink and the yellow, both on `sky`'s and `amber`'s construction: a pale top stop
// into a saturated-but-still-light bottom one, ~35 points of luminance apart, so the
// gradient TRAVELS visibly instead of reading as a card someone forgot to fill.
//
// Both stay light enough for `text-ink` at the deep end, which is the constraint that
// decides how far either can go — #F5A8C4 and #F5CE5A are both far past any contrast
// floor against #0a0a0a, and `lib/designTokens.test.ts`'s ink pairing is what keeps the
// ground and its ink moving together if either is retuned.
//
// `LEMON_DEEP` IS NOT `yellow` (#eab308), and the near-miss is the same one `AMBER_*`
// notes above: `yellow` is a STATUS token — "changed" on a changelog dot, "watch this"
// on a gauge — and a status spent on decoration is a status that stops meaning anything.
// This is a paler, warmer yellow chosen to be a surface, and it is deliberately far
// enough from `AMBER_DEEP` that the two do not read as one colour at two strengths.
//
// `ROSE_DEEP` likewise is not `red` (#ef4444) or `purple` (#a855f7), for the same
// reason and with an extra one: red is what this product draws a destructive action in,
// and a card that ships in it is a card that looks like a warning.
const ROSE_LIGHT = '#FFE1EC'
const ROSE_DEEP = '#F5A8C4'
const LEMON_LIGHT = '#FFF6D9'
const LEMON_DEEP = '#F5CE5A'

/**
 * THE GRADIENT THE APPLE MARK IS FILLED WITH, on the homepage's "Truly Mac-native" card.
 *
 * NOT A TONE AND NOT A PLATE, which is why it is a table of its own with one entry. A tone
 * is a card's GROUND and cycles; a plate is another PRODUCT's own hue, always named. This
 * is neither — it is the fill of one glyph, and it is deliberately not anybody's brand
 * colour: Apple's mark has no official colour to borrow, and the reference the product
 * owner supplied fills it with a cool sweep rather than with silver.
 *
 * ITS THREE STOPS ARE THE REFERENCE'S: a sky blue, the design system's own `accent` one
 * step lighter, and an orchid. They are literals here for `PLATES`' reason — a gradient
 * belonging to one mark is a value that means one thing, and pointing it at `accent` would
 * invite somebody to retune the CTA blue and silently repaint a logo.
 *
 * IT IS APPLIED AS A MASK, not as a fill: `public/img/apple-mark.png` is an alpha mask over
 * a div wearing this. See `MacNativeArt` for why the mark is a bitmap rather than a path.
 */
const MARKS = {
  'mark-apple': `linear-gradient(135deg, #7DD3FC 0%, #A5B4FC 50%, #F0ABFC 100%)`,
}

/**
 * sRGB HEX INTO HSL AND BACK, the two halves of one conversion and the only reason
 * either is here: `cooled()` below needs to swing a hue, and a hue is not a thing you
 * can reach in hex.
 *
 * TEXTBOOK BOTH WAYS, and neither needs to be more than that — this runs when Tailwind
 * loads its config, on eight colours, and what is required of it is that
 * `toHex(...toHsl(c))` gives `c` back. It is NOT a colour-science conversion: the round
 * trip is through sRGB HSL, so "13 degrees" is 13 degrees of the hue wheel the rest of
 * this file already thinks in (`#393BFF` is 239, `#F9A96A` is 27), not of a perceptual
 * space. A perceptual swing would be the better instrument and it would also mean a
 * colour library in the build, for one derived value on eight grounds.
 *
 * SIX DIGITS ONLY, no 3-digit shorthand and no alpha. Every stop in this file is written
 * long, `fade()` appends the alpha as a suffix, and a parser that quietly accepted `#fff`
 * would return a colour nobody typed.
 */
const toHsl = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

const toHex = (hue: number, sat: number, light: number) => {
  const h = ((hue % 360) + 360) % 360
  const s = Math.min(Math.max(sat, 0), 1)
  const l = Math.min(Math.max(light, 0), 1)
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  const digits = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${digits(r)}${digits(g)}${digits(b)}`
}

/**
 * THE SECOND LAMP. A tone's deep stop in, the same colour swung toward cyan out.
 *
 * WHY A TONE HAS A THIRD COLOUR AT ALL, when it has spent this file's whole history
 * having two. The reference this wash is traced from is not two colours: measure its
 * hue across the bottom edge and it runs 223 on the left and 210 on the right, a
 * thirteen-degree swing that reads as TWO LIGHTS of slightly different colour rather
 * than as one light at two strengths. That is the whole difference between the picture
 * and every attempt at it that came before — a single hue pooling in two places is a
 * gradient, two hues meeting in the middle is a lit surface — and it cannot be spelled
 * with two stops.
 *
 * DERIVED AND NOT DECLARED, which is the choice worth defending. The alternative is a
 * third literal per tone: eight more colours to keep in tune with the two they sit
 * between, eight more chances for somebody to retune a deep stop and leave its partner
 * behind, and a table where the relationship that MAKES the effect is invisible. Here
 * the relationship is the value, so a tone stays two colours and nothing can drift.
 *
 * THE THREE NUMBERS ARE THE REFERENCE'S OWN, read off the fit: −13 degrees of hue,
 * +5 points of lightness, +4 of saturation. Cooler, and lighter because it is the
 * FURTHER lamp — the reference's right-hand pool sits eleven points of luminance above
 * its left-hand one, and matching the hue while matching the depth would have put a
 * second dark corner where the picture has a bright one.
 *
 * ONE SWING FOR EVERY TONE, including the warm ones, and that is deliberate rather than
 * unexamined. −13 degrees off `AMBER_DEEP` is not "cooler" in any useful sense, it is a
 * step toward coral; off `MINT_DEEP` it is a step toward yellow-green. What survives the
 * translation is the thing that matters — the two pools are ADJACENT rather than
 * identical, which is what stops the bottom of a card reading as one smear — and a
 * per-family rule would be three rules nobody could keep straight for a difference
 * nobody can see.
 */
const cooled = (deep: string) => {
  const [h, s, l] = toHsl(deep)
  return toHex(h - 13, s + 0.04, l + 0.05)
}

/**
 * A COLOUR AND AN ALPHA INTO ONE 8-DIGIT HEX. `fade('#4D77EE', 0.62)` is `#4D77EE9E`.
 *
 * WHY THE ALPHA IS A SUFFIX and not `rgba()`: every bloom below needs the SAME colour at
 * five different alphas, and `#RRGGBBAA` is the one spelling where the colour stays one
 * substring. It is also why every stop in this file is six digits — see `toHsl`.
 */
const fade = (colour: string, alpha: number) =>
  `${colour}${Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}`

/**
 * THE FALLOFF, as five stops: a raised cosine sampled at the quarters.
 *
 * THIS IS THE ONE NUMBER THAT DECIDES WHETHER THE WASH READS AS PAINT OR AS PLASTIC, and
 * it took the longest to find. A `radial-gradient` with two stops fades LINEARLY, which
 * means its alpha has a corner at both ends: a peak at the centre, so the bloom shows a
 * bright dot, and a kink at the last stop, so the bloom shows its own ellipse as a faint
 * ring. On a card 400px wide both are plainly visible and both are what makes a
 * hand-rolled mesh gradient look hand-rolled. The reference has neither, because it was
 * not built from gradients at all — it is blurred discs, and a Gaussian is flat at the
 * top and flat at the tail.
 *
 * `0.5 * (1 + cos(pi * u))` is the cheapest curve with those two properties, and sampled
 * at 0, ¼, ½, ¾ and 1 the straight lines between the samples are within one alpha step of
 * it. So: five stops, evenly spaced, and the numbers are `cos` rather than anything
 * anybody chose.
 *
 * THE LAST STOP IS THE SAME COLOUR AT ZERO ALPHA, never `transparent`. `transparent` is
 * rgba(0,0,0,0), so interpolating to it drags the bloom through grey and leaves a dirty
 * halo where it meets the field — the classic gradient artefact, and the reason `fade()`
 * takes the colour rather than the layer taking two.
 */
const BLOOM_RAMP = [1, 0.8536, 0.5, 0.1464, 0]

/**
 * ONE BLOOM. A colour, a centre, an ellipse and a peak alpha, out comes one
 * `radial-gradient` layer.
 *
 * THE ELLIPSE IS THE FALLOFF'S EXTENT, not the bloom's visible size: `BLOOM_RAMP` reaches
 * zero exactly at the ellipse's edge, so `w` and `h` say where the bloom STOPS rather
 * than where it is bright. That is why several of the sizes in `WASH` look too large for
 * what you see on the card — a bloom is only near its peak over the middle third of its
 * own ellipse.
 *
 * PERCENTAGES ALL THE WAY, so a tone is resolution-independent and the composition
 * survives a card 320px wide and the same tone stretched behind a 1200px mockup. `w` is
 * a percentage of the box's WIDTH and `h` of its height, which is CSS's own rule for a
 * sized `radial-gradient` and the reason a bloom stretches with the card rather than
 * staying circular.
 */
const bloom = (colour: string, x: number, y: number, w: number, h: number, peak: number) =>
  `radial-gradient(${w}% ${h}% at ${x}% ${y}%, ${BLOOM_RAMP.map(
    (step, i) => `${fade(colour, peak * step)} ${i * 25}%`,
  ).join(', ')})`

/**
 * THE COMPOSITION. Six blooms, in CSS's own order — FIRST is nearest the viewer.
 *
 * THE FIRST SIX NUMBERS IN EACH ROW ARE TRACED, not composed. The reference is a bitmap;
 * this table is the result of fitting six blooms plus a flat field to it, and the fit
 * lands within 2.5/255 RMSE of the original with the largest single-pixel error inside
 * the steepest part of the left-hand pool. So they are not a designer's reading of the
 * picture, they ARE the picture — which is why the way to vary a tone is the four
 * budgets after them and never these six.
 *
 * WHAT EACH ROW IS, read as the composition rather than as coordinates:
 *
 *   1. `top`, tall and narrow, up the middle-left — the PALE RIDGE. It is the only bloom
 *      that paints the quiet stop, and it does nothing at all except where a later row
 *      has already coloured the field, which is exactly its job: it carves the bright
 *      channel that separates the left-hand pool from everything above it. Take this row
 *      out and the bottom two-thirds of the card fills in as one mass.
 *   2. `deep`, wide and very faint, high and right of centre — the HAZE. The only colour
 *      above the midline, and what keeps the top of the card from reading as one straight
 *      pale band with weather underneath it.
 *   3. `cool`, at the bottom right — the FAR POOL, the second lamp. See `cooled()`.
 *   4. `cool`, tall and narrow at the bottom centre — where the two lamps MEET. It is
 *      tall because the reference's hue transition runs up the card, not along its
 *      bottom edge.
 *   5. `deep`, very wide, centred off the bottom-left corner — the NEAR POOL, the card's
 *      most saturated ground and the deepest point of the wash.
 *   6. `deep`, mid-left — the near pool's SHOULDER, which is what gives the left-hand
 *      mass its diagonal top edge instead of a horizon.
 *
 * AND WHAT IS ABSENT: a shadow. Every previous version of this darkened the bottom
 * corners with `ink` at a named alpha, on the reasoning that a ground turning away from
 * the light is what makes a card read as lit. The reference does not do that — its
 * darkest point is 71% luminance and it is the periwinkle itself, not black under the
 * periwinkle — and side by side the ink layer is what made the old cards look dusty. The
 * depth here is entirely the near pool being deeper than the field.
 *
 * `dx` `dy` `ds` `da` ARE THE JITTER BUDGETS, and they are the other half of this table:
 * how far `mesh()`'s dice may move that particular bloom on a tone that asks for a
 * composition of its own. One composition across eight grounds is one gradient STAMPED
 * eight times — eight cards lit by the same six lamps — and the eye reads the repeated
 * shape before it reads either colour, most obviously where two cards sit side by side.
 * So the traced rows are the CENTRE of a range rather than the whole answer.
 *
 * A BUDGET PER ROW AND NOT ONE FOR THE TABLE, which is the part that took the longest and
 * is worth not undoing. One global ±10% moves every bloom by the same licence, and two of
 * these rows cannot take it: row 4 is 68% TALL, so a few points of extra height and a
 * nudge upward turns it into a column running the full card and the colour stops reading
 * as pooling at the bottom at all — which is what a uniform budget produced on `rose` and
 * `amber`, and it is a different picture rather than the same one rearranged. Row 4's
 * height budget is therefore half of everything else's, and rows 2 and 3 — wide, faint,
 * far from the copy — carry the widest.
 *
 * WHAT THE BUDGETS PROTECT, checked by rendering all eight and measuring rather than by
 * eye: the colour's centroid stays at y ≈ 75% on every tone (it is 76% on the reference),
 * the deepest point stays below y = 83%, and the top-left — 62% of the width by 34% of the
 * height, which is where `ToneCard` puts the title and the description — never drifts
 * further from the field than the reference's own corner does. A composition that broke
 * any of those would be a card the copy is unreadable on, which renders perfectly.
 */
const WASH: [
  lamp: 'top' | 'deep' | 'cool',
  x: number,
  y: number,
  w: number,
  h: number,
  peak: number,
  dx: number,
  dy: number,
  ds: number,
  da: number,
][] = [
  ['top', 34, 51, 22, 52, 0.7, 11, 5, 12, 5],
  ['deep', 67, 48, 30, 40, 0.23, 13, 6, 15, 4],
  ['cool', 73, 85, 30, 32, 0.65, 11, 5, 15, 5],
  ['cool', 51, 88, 23, 68, 0.58, 9, 4, 8, 5],
  ['deep', 10, 95, 66, 43, 0.62, 11, 4, 11, 5],
  ['deep', 34, 78, 49, 43, 0.63, 11, 5, 13, 5],
]

/**
 * THE COMPOSITION'S DICE. A tone's name in, a stream of numbers out, the same numbers
 * every time.
 *
 * SEEDED, not `Math.random()`: this runs when Tailwind loads its config, so a live random
 * would deal a different composition into the stylesheet on every build. That is a
 * rebuild whose CSS diff is noise, a screenshot test that can never pass twice, and —
 * worst — a card that looked right when it was reviewed and ships as something else. Same
 * name, same numbers, for ever.
 *
 * ON THE NAME rather than on the stops, which is the less obvious half. Seeding on the
 * colours would be the more literal reading of "a pattern per colour", and it means
 * retuning `AMBER_DEEP` by two points RESHUFFLES amber's whole composition — a colour
 * correction that silently moves every bloom on ~30 surfaces. The name is the tone's
 * identity and the thing that is stable; the stops are what we expect to tune.
 *
 * FNV-1a INTO XORSHIFT32, both textbook, neither cryptographic and neither needs to be.
 * What is actually required of this is: same input → same output, small changes in the
 * name → an unrelated stream, and a flat enough spread that a range like −11..11 is not
 * always answered with −11. `Math.imul` is in here because FNV's multiply overflows 32
 * bits and `*` would silently go through a double.
 *
 * EVERY DRAW IS BOUNDED BY `WASH`, which is what makes a random composition safe to ship
 * without eyes on every future tone: the budgets there are narrow, and each is a range
 * within which any value is a card we would have drawn by hand. See `WASH` for what they
 * are and what they protect.
 */
const seeded = (seed: string) => {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // One draw, rounded to a whole number — a gradient stop does not need decimals, and
  // the composition reads as something a person could have typed.
  return (min: number, max: number) => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return Math.round(min + (((h >>> 0) % 1000) / 1000) * (max - min))
  }
}

/**
 * THE SHAPE EVERY TONE IS BUILT IN. Two colours and, optionally, a name in; one diffuse
 * wash out.
 *
 * A tone used to be `linear-gradient(135deg, light, deep)`: one straight sweep, corner to
 * corner, the colour arriving at an even rate the whole way across. It read as a card
 * that had been FILLED — the same amount of gradient everywhere, and the copy in the
 * top-left sitting on a tint rather than on a light. This is the picture instead: the
 * reference the product owner supplied, traced. See `WASH` for the composition and
 * `BLOOM_RAMP` for the falloff, which is the half that decides whether it reads as paint.
 *
 * THE FIELD IS FLAT, and it is the LAST layer — `linear-gradient(top, top)`, a solid
 * spelled as an image because `backgroundImage` is where a tone is declared. Every
 * version before this anchored a big radial past a corner so the ground itself travelled;
 * the reference's top third and its entire right edge are one unvarying colour, and a
 * flat field is both what that is and what makes the wash's own edges impossible to find.
 *
 * IT ALSO SETTLES THE ONE THING THAT COULD BREAK A CARD RATHER THAN RESTYLE IT. The copy
 * sits in the top-left; the title has to be readable there; `top` is the stop chosen so it
 * is. With a flat field, the top-left corner IS `top` — not approximately and not until
 * somebody retunes a bloom, because nothing in `WASH` reaches it at any draw the budgets
 * allow.
 *
 * `seed` IS THE TONE'S OWN NAME, and passing it is what buys a composition of its own:
 * the whole set of blooms mirrors or does not, and each one is nudged inside its budget.
 * `lib/designTokens.test.ts` pins that each call site passes ITS OWN name, because two
 * tones sharing a seed is one line pasted and half-edited, and what it produces is two
 * grounds wearing the same arrangement — the exact thing the dice are here to prevent, in
 * the one form nobody would notice by reading the diff.
 *
 * OMITTING IT IS ALSO A CHOICE, and exactly one tone makes it. `sky`'s two stops are the
 * reference's own, so `bg-tone-sky` IS the picture rather than a variation on it, and
 * jittering it would mean the design system no longer contains the thing it was traced
 * from. The anchor does not move; everything else is measured against it.
 *
 * MIRRORING IS DRAWN FIRST AND APPLIES TO THE WHOLE SET, never per bloom. Which side the
 * near pool gathers on is the composition's single loudest fact — it is what somebody
 * describes when they describe one of these cards — and flipping it doubles the shapes
 * available for free. Flipping blooms INDIVIDUALLY would not: the six would come apart
 * into an arrangement that no longer has a near pool and a far one, which is not a
 * variation on the reference but the loss of it.
 *
 * WHAT `top` AND `deep` MEAN, since the names matter more than "first" and "second":
 * `top` is the quiet stop, the one the copy has to be readable on, and `deep` is the
 * vivid one that pools at the bottom. For the six light tones that is pale → saturated;
 * for `indigo` and `midnight` it is dark → less dark, and the flat field is a NEAR-BLACK
 * one there. That is what keeps `text-white` safe on them: the wash cannot lighten the
 * corner the title sits in, because nothing paints that corner.
 */
const mesh = (top: string, deep: string, seed?: string) => {
  const lamp = { top, deep, cool: cooled(deep) }
  const d = seed === undefined ? null : seeded(seed)
  // Drawn before the rows so it belongs to the tone rather than to a bloom, and drawn
  // first so adding a row later cannot change which side an existing tone pools on.
  const flip = d !== null && d(0, 1) === 1
  return [
    ...WASH.map(([which, x, y, w, h, peak, dx, dy, ds, da]) => {
      if (d === null) return bloom(lamp[which], x, y, w, h, peak)
      const at = x + d(-dx, dx)
      return bloom(
        lamp[which],
        flip ? 100 - at : at,
        y + d(-dy, dy),
        Math.round(w * (1 + d(-ds, ds) / 100)),
        Math.round(h * (1 + d(-ds, ds) / 100)),
        peak + d(-da, da) / 100,
      )
    }),
    `linear-gradient(${top}, ${top})`,
  ].join(', ')
}

const TONES = {
  /**
   * Palest of the four, and the ground for a card that carries a busy visual. Eleven
   * points of travel — the quietest of the six light tones, and no longer the invisible
   * one. See `MIST_DEEP` for what it was and why three points was not a whisper but
   * nothing at all.
   */
  'tone-mist': mesh(MIST_LIGHT, MIST_DEEP, 'mist'),
  /**
   * THE REFERENCE ITSELF. `mesh()` is traced from one picture; this is the tone whose two
   * stops are that picture's own, so `bg-tone-sky` is not an interpretation of it — the
   * card and the file the product owner sent are the same image, within 2.5/255.
   *
   * WHICH IS WHY IT IS THE ONE TONE WHOSE STOPS MOVED when the wash landed. #E6F0FF →
   * #A3B2F0 was a pale blue into a light indigo, tuned when a tone was a 135° sweep and
   * the whole card had to carry the colour; the reference's field is a fraction warmer
   * (#E2EEFC) and its lamp a good deal more saturated (#4D77EE), because in this
   * composition the deep stop is a LIGHT rather than a fill — it never lands anywhere at
   * full strength. The deepest point of the finished card measures #799AF2, which is very
   * nearly where #A3B2F0 used to sit. A stop this saturated read on its own would look
   * like a tone that had drifted out of the family; on the card it is the same weight it
   * always was, and still comfortably dark-ink territory — the constraint that decides
   * how far this can go, checked by `lib/designTokens.test.ts`'s ink pairing.
   */
  'tone-sky': mesh(SKY_LIGHT, SKY_DEEP),
  /**
   * Saturated: `accent` as the field, and a brand blue driven past `brand`'s own
   * lightness as the lamp. Eighteen points of travel, the deepest of the two dark grounds
   * and enough that a four-column row landing both does not read as one of them having
   * been left flat. It ran `accent` into `brand` itself until
   * the wash was traced; see `INDIGO_DEEP` for why five points of lightness could not
   * survive losing the ink shadow.
   */
  'tone-indigo': mesh(ACCENT, INDIGO_DEEP, 'indigo'),
  /** The dark one. `ink` into a deepened brand, never into `brand` at full. */
  'tone-midnight': mesh(INK, BRAND_DEEP, 'midnight'),
  /**
   * THE ONE TONE THAT IS NOT IN THE BLUE FAMILY, and it is earned rather than added:
   * it dresses the card for `/magic:done`, which is the end of the loop. Green is
   * already what this product says "finished" with — the check in the start card's
   * terminal, a diff's additions, a passing gauge — so the closing card being green is
   * the palette agreeing with itself, not a second accent.
   *
   * LIGHT, like `mist` and `sky`, and it takes the dark ink they take. Fifteen points of
   * travel on the traced composition, which is `amber`'s — the loop's two bookends tuned
   * to one volume, give or take what the dice do to each. See the
   * note on its stops above for why it is neither the saturated green it started as nor
   * the tint it briefly became.
   *
   * It is NOT in `CARD_TONE_CYCLE`. The cycle is positional and means nothing in
   * particular; this one means something, so it is asked for by name.
   */
  'tone-mint': mesh(MINT_LIGHT, MINT_DEEP, 'mint'),
  /**
   * THE SECOND TONE OUTSIDE THE BLUE FAMILY, and earned the same way `mint` is: it
   * dresses the card for `/magic:start`, which is where a piece of work ENTERS the loop.
   * The grid now opens warm and closes green, which says the shape of the thing before a
   * word of the copy is read — and it is a fact about the command, not about its
   * position, so reordering the eight leaves it where it belongs.
   *
   * Light, like `mist`, `sky` and `mint`, and it takes the dark ink they take. See the
   * note on its stops above for why it sweeps as wide as `sky` rather than as gently as
   * `mint`, and for the two colours it is deliberately not.
   *
   * It is NOT in `CARD_TONE_CYCLE`, for `mint`'s reason: the cycle is positional and
   * means nothing in particular, and this one means something.
   */
  'tone-amber': mesh(AMBER_LIGHT, AMBER_DEEP, 'amber'),
  /**
   * Pink. A named ground with no page asking for it yet, which is a different standing
   * from `mint` and `amber` and worth being straight about: those two MEAN something on
   * `/features`, this one is a surface the palette offers.
   *
   * That is not the same as unused. The failure this file exists to prevent is a
   * `bg-[linear-gradient(...)]` pasted at a call site — a colour nobody can find again
   * and nobody dares retune — and a declared ground is what a page reaches for instead.
   * Light, so it takes the dark ink the other light tones take. Not `red` and not
   * `purple`; see the note on its stops above.
   */
  'tone-rose': mesh(ROSE_LIGHT, ROSE_DEEP, 'rose'),
  /**
   * Yellow, on the same standing as `rose` above: declared and available, named by
   * nothing yet.
   *
   * IT IS NOT THE `yellow` IN THE PALETTE, which is the one thing to know about it. That
   * one is a status — see the note on its stops — and this is a ground. Kept far enough
   * from `amber` that a grid carrying both reads as two colours rather than as one at
   * two strengths, which is the risk with any two warm tones in one table.
   */
  'tone-lemon': mesh(LEMON_LIGHT, LEMON_DEEP, 'lemon'),
}

// THE PRODUCT PLATES. One gradient per integration, declared here and used as
// `bg-plate-<name>` by `LogoPlate` in `components/ui.tsx`.
//
// A SECOND NAMESPACE RATHER THAN FIVE MORE `TONES`, and the split is the point. A tone
// is a SURFACE IN A FAMILY — four of them cycle across eight skill cards precisely
// because none of them means anything, and a ninth skill costs no new colour. A plate
// is the opposite: it is a product's own hue, it means exactly one thing, and it is
// asked for by name. Mixing the two would have made `CARD_TONE_CYCLE` able to deal a
// card the GitHub grey.
//
// COLOURS BORROWED FROM SOMEBODY ELSE'S BRAND, so the same rule the retired `vendor`
// namespace was written under applies: nothing outside a plate may reach for these, and
// a `bg-[linear-gradient(...)]` at a call site is the unfindable value this file exists
// to prevent. `lib/designTokens.test.ts` pins the five.
//
// 135deg on all five, like the tones, so a column of plates reads as one light source.
//
// WHY THEY CAN ALL BE SATURATED. Every mark that lands on one sits on a white tile —
// see `LogoPlate` — so the plate never has to be light enough for a logo to survive on
// it. That is what lets `plate-vscode` be VS Code's own blue under VS Code's own blue
// mark, which drawn directly on the ground would have been a mark you could not see.
//
// `plate-magic` is OURS and not a borrowed one: it dresses the row about the app setting
// itself up. It runs `brand` into `BRAND_DEEP` rather than reusing `tone-indigo`'s
// `accent → brand`, so the two are a different gradient rather than one value spelled
// twice.
const PLATES = {
  /** Atlassian blue, light into deep. */
  'plate-jira': `linear-gradient(135deg, #2684FF 0%, #0747A6 100%)`,
  /** GitHub's own greys, which are very nearly its black. */
  'plate-github': `linear-gradient(135deg, #3D444D 0%, #0D1117 100%)`,
  /** VS Code blue. */
  'plate-vscode': `linear-gradient(135deg, #3AA0DE 0%, #0065A9 100%)`,
  /** Claude's coral, the hue `claudecode-color.png` is drawn in (#D97757). */
  'plate-claude': `linear-gradient(135deg, #E08A6B 0%, #A8452A 100%)`,
  /** Ours. `brand` into the deepened brand the midnight tone ends on. */
  'plate-magic': `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DEEP} 100%)`,
}

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: INK,
        muted: '#52525b',
        softblue: '#D9E8FF',
        // `softblue`'s green counterpart, for the one page whose opening is green rather
        // than blue: `/download`. It is `MINT_LIGHT` — the pale stop of the mint tone —
        // named as a colour so a `from-softgreen` reads beside `from-softblue`, and so the
        // hero's wash and the tone card that closes the loop are the same green. See the
        // note on `MINT_LIGHT` for why this is not `green` (#22c55e): that one is a status.
        softgreen: MINT_LIGHT,
        canvas: '#F4F7FE',
        // The hairline. One weight, `ink` at 8% — between the 5% that outlines a
        // surface and the 10% that outlined a field, both of which were written as
        // `border-black/{5,10}` at each site. It exists because the `secondary`
        // button is white on white: without an edge it has no silhouette, and an
        // edge a shade too dark reads as a box drawn around the label rather than
        // as the button's own outline. `primary` reserves the same 1px in
        // `border-transparent`, so the two are the same box — see `BUTTON_BASE`.
        hairline: 'rgba(10, 10, 10, 0.08)',
        // Text and the filet on a DARK ground — the inverse of `ink` / `muted` /
        // `hairline` above, for the one surface on the public site that inverts: the
        // `bg-ink` footer plate, and the language picker in the `footer` dress it wears
        // down there (`components/site/SiteFooter.tsx`,
        // `components/site/LanguageMenu.tsx`). A light footer under a light page has
        // nothing to end the page with, so that plate is dark and everything on it
        // needs its own ladder; `muted` on `#0a0a0a` is unreadable.
        //
        // It exists because those two files were spelling that ladder out at every call
        // site — `text-white/60`, `text-white/50`, `text-white/40`, `border-white/10`,
        // `bg-white/10`, `hover:bg-white/5` — which is the same failure an arbitrary
        // `shadow-[…]` is: six alphas repeated across ten call sites, with nothing
        // saying which of them is a link row and which is a heading, and no way to
        // retune the footer without finding all ten.
        //
        // Three text rungs, loudest first, named by ROLE the way `regie.dim` is rather
        // than by weight: `body` is a link row and the picker's own label, `dim` is the
        // tagline and the GitHub glyph beside it, `faint` is a column heading and the
        // copyright. Full-strength white stays Tailwind's own `text-white` — it is the
        // hover target of all three and needs no name of its own.
        //
        // `rule` and not `hairline`: the light ground's filet is 8% ink and this one is
        // 10% white, so they are two different values, and `lib/designTokens.test.ts`
        // anchors on a line beginning `hairline:` — a second key by that name would
        // satisfy that guard from in HERE and let the real token be deleted in silence.
        // `regie.rule` is the precedent for a namespaced filet.
        //
        // `tint` is the hover fill under a language option and `selected` the plate
        // under the chosen one. `selected` carries `rule`'s value today and is still
        // its own key: one is an edge, the other is a surface. Two spellings of one
        // number rather than a link, on purpose — the same call the `button` radius
        // makes further down.
        onink: {
          body: 'rgba(255, 255, 255, 0.6)',
          dim: 'rgba(255, 255, 255, 0.5)',
          faint: 'rgba(255, 255, 255, 0.4)',
          rule: 'rgba(255, 255, 255, 0.1)',
          tint: 'rgba(255, 255, 255, 0.05)',
          selected: 'rgba(255, 255, 255, 0.1)',
        },
        // ── `brand` IS the primary CTA. `accent` is NON-CTA ONLY ─────────────
        //
        // This reversed once, and the note is kept in that shape on purpose so the
        // next reader does not have to guess which way round it went.
        //
        // `brand` (#393BFF) is the fill of the `primary` button — `BUTTON_VARIANTS`
        // in `components/ui.tsx`, the single definition. For one iteration of this
        // scale it was banned from every CTA and the primary button was white; that
        // white recipe is still here, as `secondary`, and the ban is lifted. So a
        // blue button in the signed-in product is now the INTENDED primary action,
        // not the regression this note used to call it.
        //
        // `accent` (#6366f1 / #818cf8) did NOT come along. It stays non-CTA: it is
        // the selected-state and focus-ring blue, one step off `brand` and never a
        // fill you press. Two blues doing one job is how a palette stops meaning
        // anything — if a CTA is wearing `accent`, that is the bug.
        //
        // The loud affirmative in the `/admin` console remains `ink` (it is a
        // confirm step, not the page's primary action) and destructive remains `red`.
        //
        // What the blues are for OUTSIDE the primary button, and where they
        // legitimately survive:
        //   • selected states — `border-accent bg-accent/[0.06]` in `ProfileWizard`,
        //     `AppearanceSettings`, `LanguageSwitcher`, `Dropdown`
        //   • tints and washes — the `bg-accent/10` badge behind an icon, the band
        //     under the leaning card in `SkillHoursOptIn`
        //   • focus rings — `focus:border-accent` on every field
        //   • typography — the `Eyebrow` slash-command signature, an org name
        //   • the `/admin` chrome — `regie.rail`, `regie.tint`, `Pill tone="brand"`,
        //     the `Modal` header icon
        //
        // Including the three tinted shadows, which STAY: `shadow-brand/[0.04]` on
        // the console panel and input (`components/regie/primitives.tsx`) and
        // `shadow-brand/[0.06]` on the app-version tile
        // (`app/admin/users/[userId]/page.tsx`). They tint a back-office surface
        // towards the blue it floats on. None of them is a button.
        //
        // AND THE INTERACTIVE CASES — the ones the list above misses, because it
        // sorts by category and every category in it sounds inert. Blue still fills
        // and tints controls a user operates, and that is not a contradiction: a CTA
        // is what you click to COMMIT to the page's primary action (submit the form,
        // accept the invite, turn the recording on), and it is the `primary` button.
        // An interactive element that is not a CTA carries no such
        // commitment — it reports a state, measures progress, or hints that a row is
        // clickable — and these all stay exactly as they are:
        //   • a toggle's CHECKED state — `peer-checked:bg-brand` and the
        //     `peer-focus-visible:ring-accent` next to it on the switch in
        //     `components/SettingRow.tsx` (l. 112). The blue is the control's VALUE;
        //     what you press to keep it is the `primary` button below the section.
        //     Same hue as that button now, which is the one place this note has to
        //     be read carefully: a switch is a value you set, not an action you fire.
        //   • a PROGRESS fill — `bg-brand` on the step bar in
        //     `components/ProfileWizard.tsx` (l. 179) and on the bar in
        //     `app/admin/stats/page.tsx` (l. 48). A measurement, with nothing to click.
        //   • a HOVER tint on a navigation row — the `group-hover:text-brand`
        //     chevrons and step badges in `components/GettingStarted.tsx` (eight
        //     `text-brand` / `bg-brand/*` between them), and the same chevron over the
        //     `bg-brand/10` icon tile in `components/OrganizationCard.tsx`
        //     (l. 165-166, 275). Those rows disclose or navigate; they do not commit.
        //   • a PROSE link — `[&_a]:text-accent` in `components/Markdown.tsx` (l. 44),
        //     which is what a link has looked like since long before this palette.
        //   • a dialog's HEADER icon — `bg-brand/10` / `text-brand` in
        //     `components/Modal.tsx` (l. 64, 66). Decoration above the copy; the
        //     modal's CTA is the `Button` in its footer.
        // Left as they are rather than retoned. When `brand` was banned from CTAs
        // this was the "documented as non-CTA" route the acceptance criterion
        // allowed; now that `brand` is the CTA fill, the list above is no longer an
        // exemption to justify but simply an inventory of where blue means state,
        // measurement or decoration instead of action.
        accent: {
          DEFAULT: ACCENT,
          hover: '#818cf8',
        },
        brand: BRAND,
        regie: {
          // A deeper tint of the app's own blue than the user canvas (#F4F7FE), so
          // white panels floating on it read as cards rather than as page. Between
          // `canvas` and `softblue` on purpose: `canvas` would be indistinguishable
          // from a user page, `softblue` is a login-screen wash and fights a dense
          // table for attention.
          ground: '#E9F0FF',
          panel: '#FFFFFF',
          // Cool-toned to sit on blue. Two weights: `rule` outlines a panel,
          // `rule-soft` separates rows — one weight for both makes a dense table
          // read as a grid of boxes instead of a list.
          rule: 'rgba(29, 42, 92, 0.12)',
          'rule-soft': 'rgba(29, 42, 92, 0.07)',
          // Blue-leaning secondary text, so labels feel part of the surface rather
          // than dropped on it. Still passes contrast on both ground and panel.
          dim: '#5a6684',
          // Row hover and the tinted fills. Kept as a token rather than a
          // `bg-brand/[0.04]` at each site so every hover in the console matches.
          tint: 'rgba(57, 59, 255, 0.05)',
          rail: BRAND,
        },
        // macOS'S NOTIFICATION BANNER, sampled from a real one, for the drawing beside
        // the Notifications row on `/features`.
        //
        // Somebody else's UI, so the same rule the product plates are under: a borrowed
        // value pasted at a call site is the one nobody dares retune later because nobody
        // can tell whether it was chosen or copied. These three were read off a screenshot
        // of the actual banner in dark mode — a neutral #3A3A3A ground with #E1E1E1 for
        // BOTH the title and the body (the title is semibold, not brighter) and a dimmer
        // #B1B1B1 for the age in the corner.
        //
        // Neutral greys, not this site's blue-tinted ink: Apple does not tint them, and a
        // banner in our ink would be a banner from a different operating system.
        macos: {
          /** The banner's ground, dark mode. */
          notification: '#3A3A3A',
          /** Its title and its body — the same value for both. */
          'notification-ink': '#E1E1E1',
          /** The age in its corner. */
          'notification-dim': '#B1B1B1',
          // THE THREE WINDOW BUTTONS, for the drawn app window on the homepage
          // (`components/site/home/AppWindowMockup.tsx`).
          //
          // Here for the same reason the banner above is: macOS draws these, the desktop
          // app's markup only leaves the 64px gutter they sit in, and a web page has no
          // native chrome to fill it. So the mockup draws them — and a borrowed colour
          // pasted at that call site is the one nobody dares retune later, because nobody
          // can tell whether it was chosen or copied. Sampled from the real buttons in
          // their ACTIVE state (the window is focused in the drawing); an unfocused window
          // greys all three to one value, which nothing here needs.
          /** The close button, leftmost. */
          close: '#FF5F57',
          /** Minimise, in the middle. */
          minimize: '#FEBC2E',
          /** Zoom, rightmost. */
          zoom: '#28C840',
        },
        // THE DESKTOP APP'S OWN TWO INKS, for the reproductions on `/features`.
        //
        // SOLID, AND THAT IS THE WHOLE POINT. The `onink` ramp above is white at an
        // alpha, which is right for the footer plate it was built for — one surface, one
        // known ground. A drawing of the app is not that: it stacks a panel on a panel on
        // a window, so a glyph at 50% white takes its colour from whatever happens to be
        // behind it and comes out a different grey in each. Magnified, that reads as
        // washed out rather than as quiet.
        //
        // These are the values `desktop/src/themes.ts` actually declares — `textSecondary`
        // (161 161 170) and `icon` (138 138 146) — so a reproduction using them is not
        // merely more solid, it is more accurate. Nothing outside a mockup may reach for
        // them; the site's own dark ground is `onink`.
        appink: {
          /** `text-text-secondary`: a row's label, and a list's rows. */
          DEFAULT: '#A1A1AA',
          /** `text-icon`: the glyph in an icon-only control. */
          icon: '#8A8A92',
          /** `text-icon-muted`: decoration — the pencil beside an editable field. */
          muted: '#65656A',
        },
        purple: '#a855f7',
        green: '#22c55e',
        red: '#ef4444',
        yellow: '#eab308',
        // TWO MORE OF THE APP'S TONES, for the two info-sidebar cards on `/features`.
        // `orange` is the context gauge between 40% and 70%, and that turn is the
        // picture; `blue` is the "in review" status pill. Both are `themes.ts`'s values.
        // Nothing outside a mockup may reach for them.
        orange: '#f97316',
        blue: '#3b82f6',
        // Two more for the status table under the ticket card: `planned`/`committed` wear
        // cyan, `review addressed` teal. `themes.ts`'s values, like the two above.
        cyan: '#22d3ee',
        teal: '#2dd4bf',
        // THE APP'S THREE BACKGROUNDS AND ITS BORDER, `themes.ts`'s dark values, for the
        // menus and pills the repository and PR cards on `/features` reproduce. Solid,
        // for the reason `appink` is: a menu floats over a card over a panel, and an
        // alpha would come out a different grey on each.
        appbg: {
          DEFAULT: '#0a0a0b',
          secondary: '#141416',
          tertiary: '#1c1c1f',
        },
        appline: '#27272a',
      },
      fontFamily: {
        sans: ['Avenir', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cera Pro"', 'system-ui', 'sans-serif'],
      },
      // Spread rather than written out twice: `TONES` and `PLATES` above are the
      // declarations and their comments, and a second copy here is the copy that would
      // go stale. Two objects and not one merged constant, because they are two
      // different KINDS of ground — see the note on `PLATES`.
      backgroundImage: { ...TONES, ...PLATES, ...MARKS },
      // The elevation scale. Four rungs, deliberately few: a white-on-white
      // interface separates things by space and by a whisper of a shadow, and a
      // seven-step ramp only invites two neighbouring surfaces to differ by an
      // amount nobody can see.
      //
      // Every one of them is declared HERE and used as `shadow-<token>`. An
      // arbitrary `shadow-[0_1px_2px_…]` at a call site is the failure this scale
      // exists to prevent, and `lib/designTokens.test.ts` fails the build on one.
      boxShadow: {
        // The primary button at rest. Two layers because one cannot do both jobs:
        // the 1px contact shadow gives the white face an edge to sit on, the wide
        // soft one lifts it off the card. Small numbers on purpose — a button that
        // floats too far reads as a modal.
        button: `0 1px 2px ${SHADOW_TINT(0.06)}, 0 2px 8px -2px ${SHADOW_TINT(0.1)}`,
        // Hover. The contact layer barely moves; the diffuse one roughly doubles.
        // The button appears to rise without changing colour, which is the only
        // affordance a white button has left once the fill is gone.
        'button-hover': `0 1px 2px ${SHADOW_TINT(0.07)}, 0 6px 16px -4px ${SHADOW_TINT(0.16)}`,
        // Surfaces (`Card`, `Section`). Quieter than the button by design: this one
        // lands on ~35 elements, and a card that competes with the button it
        // contains inverts the hierarchy of the whole page.
        card: `0 1px 2px ${SHADOW_TINT(0.04)}, 0 8px 24px -12px ${SHADOW_TINT(0.1)}`,
        // The one dramatic shadow, for something genuinely off the page: the tilted
        // illustration in `SkillHoursOptIn`. Transplanted verbatim from the
        // arbitrary class it replaces, so the pixels are unchanged.
        //
        // Shadows do not compose: a second `shadow-*` on an element REPLACES the
        // first rather than stacking on it. The illustration is a `Card`, so
        // `shadow-lift` has to displace the `shadow-card` that surface carries —
        // and it does so through `Card`'s `shadow` SLOT (`components/ui.tsx`),
        // which substitutes the class instead of appending a rival to it. Nothing
        // here rides on a specificity or ordering race, and the position of this
        // key in the object decides nothing: Tailwind emits `boxShadow` utilities
        // sorted by class NAME, not in declaration order, so any comment promising
        // that "declared last wins" was describing an alphabetical coincidence.
        lift: `0 16px 36px -18px ${SHADOW_TINT(0.4)}`,
        // `lift` on the mint tone: the same shape, tinted with a green two steps deeper
        // than the plate's own — a grey shadow on a green ground reads as dirt, a green one
        // as depth. TWO CONSUMERS, and both are a panel on a mint plate: the usage card's
        // on `/features`, and the browser in the homepage's cloud band
        // (`CloudBrowserMockup`). That is the rung's whole rule — anything sitting on
        // `tone-mint` takes this instead of `lift` — and it is the reason it is a declared
        // token rather than the arbitrary value it began as.
        'lift-mint': '0 12px 32px -8px rgba(21, 94, 58, 0.45), 0 2px 6px -2px rgba(21, 94, 58, 0.3)',
        // THE ONLY RUNG THAT CASTS SIDEWAYS, and it exists because the other four
        // cannot: every one of them is a DOWNWARD shadow with a negative spread, which
        // is right for a card sitting on a page and useless for a panel whose only
        // visible boundary is a vertical edge.
        //
        // That is exactly the Agents drawing on `/features`: the application is cut by
        // its frame on three sides, so the one edge with a boundary to sell is the left
        // one, against the plate's blue band. `lift` there resolved to nothing — 16px
        // down and 18px in contracts to zero horizontally — and a shadow you cannot see
        // is a shadow nobody can tell was asked for.
        //
        // Two layers, for `button`'s reason: the wide soft one is the depth, the tight
        // one gives the edge something to sit on so the panel does not float free of the
        // ground it is cut against.
        //
        // THE OFFSET HAS TO BEAT THE SPREAD, which is the one number worth checking if
        // this is ever retuned. A negative spread pulls the shadow's box in from every
        // side, so an offset smaller than it leaves nothing to spill past the edge — the
        // first attempt here was `-6px 0 20px -6px` and rendered, correctly, as almost
        // nothing at all.
        edge: `-10px 0 24px -4px ${SHADOW_TINT(0.25)}, -1px 0 2px ${SHADOW_TINT(0.1)}`,
        // THE FOUR RUNGS THE `/desktop` OPENING AND THE HOMEPAGE HERO ADDED, named for what
        // casts them rather than for a height, because none of them is a surface rung a
        // second caller should reach for by size.
        //
        // `window`: the app's drawn window rising out of a band's floor — long, soft and
        // heavy, in the indigo tint, because it is the one object on either page meant to
        // read as SITTING on the canvas rather than floating a hair above it.
        window: `0 40px 80px -30px ${SHADOW_TINT(0.55)}`,
        // `pane` and `bubble`: the "before" pile's grey windows and the two speech
        // bubbles over them. Neutral black, NOT the indigo tint, on purpose: the pile is
        // `grayscale` and the bubbles sit on it, so a tinted shadow would be the one
        // coloured thing in a panel drawn to have no colour.
        pane: '0 20px 40px -20px rgba(0, 0, 0, 0.6)',
        bubble: '0 8px 20px -10px rgba(0, 0, 0, 0.4)',
        // `ring-green`: not a shadow at all but a halo — a 4px spread of the success
        // green at 18% around the check that closes the hero's ladder. A `ring` utility
        // would do the same job and take the element's own `ring-offset` colour with it;
        // this keeps the halo in the shadow scale where the test can see it.
        'ring-green': '0 0 0 4px rgba(34, 197, 94, 0.18)',
        // THE RUNG THAT CASTS NOWHERE IN PARTICULAR, for a panel cut by its plate on TWO
        // sides at once.
        //
        // That is the homepage's app band (`home/AppSection.tsx`): the window is inset
        // from the plate's top and left and runs off its bottom and right, so BOTH a
        // horizontal and a vertical boundary are on show. `edge` above answers the
        // one-vertical-edge case and casts only leftward, which leaves the top edge sitting
        // on the blue with nothing under it; `lift` casts only downward and, as the note on
        // `edge` records, resolves to nothing at all on an edge that is not the bottom one.
        //
        // So this one has NO OFFSET: it spills evenly, and both visible edges get the same
        // boundary. That is also the honest reading of the composition — a screenshot
        // floating on a coloured plate is not lit from anywhere in particular, where a card
        // sitting on the page is lit from above like everything else on it.
        //
        // THE BLUR HAS TO BEAT THE SPREAD, which is `edge`'s rule in the form it takes
        // when the offset is zero: the negative spread pulls the shadow's box in from every
        // side, and with nothing pushing it out it is the blur alone that spills past the
        // edge.
        //
        // AND IT IS HALF THE BLUR, not the blur — which is the arithmetic this rung got
        // wrong on its first pass and is worth stating so nobody redoes it. A CSS blur of
        // `n` fades over `n`, centred on the shadow's edge, so only `n/2` of it lands
        // OUTSIDE. `0 0 40px -12px` therefore spilled 20 − 12 = 8px, not the ~28 it was
        // written for, and rendered as a smudge you had to look for. 64 against −8 spills
        // 24px, and that is a number the plate's 16-32px of visible ground can show.
        //
        // Two layers, for `button`'s reason: the wide soft one is the depth, the tight one
        // gives the silhouette something to sit on so the window does not float free of
        // the ground it is cut against.
        panel: `0 0 64px -8px ${SHADOW_TINT(0.42)}, 0 0 4px ${SHADOW_TINT(0.16)}`,
      },
      borderRadius: {
        // The soft radius of the button. `rounded-xl` (0.75rem) rather than the
        // `rounded-full` pill it replaces, and named rather than used directly so
        // the button's corner can be retuned without auditing every `rounded-xl`
        // in the app.
        //
        // 0.75rem is also what `FIELD` spells as `rounded-xl` in `components/ui.tsx`,
        // so a button and the field beside it share a corner today. Two spellings of
        // one number rather than a link, on purpose: retuning this token moves the
        // button alone, which is the whole point of it having a name.
        //
        // Pills, badges, avatars and switches keep `rounded-full`: they are shapes,
        // not buttons, and there is no `borderRadius.card` because `rounded-2xl` is
        // already the surface convention everywhere.
        button: '0.75rem',
      },
      // The public site's column. One number, 1100px, and it was written by hand in
      // three files before it had a name — the header pill, the footer plate and every
      // band of the homepage (`components/site/home/Shell.tsx`) each carried their own
      // `max-w-[1100px]`, which is the same failure an arbitrary `shadow-[…]` is: the
      // width of the site cannot be retuned without finding all three, and a fourth
      // structural component would be a coin toss between 1100 and 1120.
      //
      // Named `site` rather than `container` because it is not Tailwind's `container`
      // (that one is a component with its own breakpoint map and centring behaviour,
      // and shadowing the name would make `max-w-container` read as a reference to it)
      // and not `page` because `/admin` is full-bleed on purpose — see the `regie`
      // note above. This is the width of the MARKETING column specifically.
      //
      // The signed-in product does not use it: its pages are on `max-w-*` sizes from
      // Tailwind's own scale, tuned per page, and nothing here changes them.
      maxWidth: {
        site: '1100px',
      },
      // THE ENTRANCE OF THE PUBLIC SITE'S FIRST SCREEN — the header bar, and each
      // element of the hero staggered behind it by an `animation-delay`. Named here and
      // used only through `components/site/Reveal.tsx`; read the note at the top of
      // that file for why the resting state is the ABSENCE of these classes.
      //
      // AN ANIMATION AND NOT A TRANSITION, which is the whole reason the entrance is
      // in the config at all instead of being two utility classes at the call site. A
      // transition needs its from-state to be in the markup and resolved by the browser
      // before the to-state lands — and the only state the server may emit is the
      // resting one, because the page has to be readable without JavaScript. Driving
      // that from React means rendering a from-state and then a to-state and trusting
      // the browser to resolve a style between two commits React is free to batch;
      // measured, it does not, and the entrance silently never plays. These frames
      // carry their own from-state, so adding the class is enough.
      //
      // `translate` — the individual transform property — and NOT `transform`: the
      // header centres itself with `-translate-x-1/2`, and a keyframe writing
      // `transform` would replace that for the length of the animation and throw the
      // bar half its own width to the right. `translate` composes with `transform`
      // rather than overwriting it.
      //
      // `--reveal-from` is how far, and which way. Unset, an element rises 12px, which
      // is the `translate-y-3` the hero used to spell out; the bar drops in from 20px
      // above and asks for that with `[--reveal-from:-1.25rem]` at its own call site.
      //
      // TWO NAMES, IDENTICAL FRAMES, and the duplication is load-bearing rather than a
      // copy-paste: the entrance REPLAYS on a language change (the copy is what it
      // introduces, so new copy earns a new entrance) and the only thing that restarts
      // a CSS animation is a change of `animation-name`. `Reveal` alternates between
      // the two. Do not "clean this up" into one.
      keyframes: {
        /**
         * The homepage timeline (`components/site/home/SkillsTimeline.tsx`): one ticket's
         * life, played out and then rewound.
         *
         * FOUR BEATS, and the percentages are the whole choreography:
         *
         *   0 → 4%    still at the start, so the first stops can be read before anything
         *             moves. A row already sliding when you arrive has no beginning.
         *   4 → 70%   the run. Two thirds of the cycle spent covering the distance, which
         *             is what makes it read as work being done rather than as a carousel.
         *   70 → 88%  THE HALT. The run ends on the merge, and the row stops dead there
         *             for a fifth of the cycle — the beat the whole drawing is built
         *             around, because a merged pull request is where a ticket's story
         *             actually lands.
         *   88 → 92%  the rewind, and it is deliberately violent: the same distance the
         *             run took 16 seconds to cover, taken in one. Back to the plan, ready
         *             for the next idea.
         *   92 → 100% still at the start again, so the snap has somewhere to land.
         *
         * `-65%` IS A PERCENTAGE OF THE TRACK, not a pixel count, so it survives a stop
         * being added or the pitch changing. It is the distance that brings the LAST stop
         * to the card's right edge at the two-column width; on a wider card the run simply
         * ends with a little more rail showing past `Done`.
         */
        'timeline-run': {
          '0%, 3%': {
            transform: 'translateX(0)',
            // Governs the RUN, 5% → 55%. The curve is the reason the row reads as
            // something being scrolled rather than something being conveyed: it leaves
            // the plan gently, covers the middle at speed, and settles onto the merge
            // instead of hitting it. `linear` was correct while the loop was seamless and
            // wrong the moment it grew a beginning and an end.
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          },
          '68%, 82%': {
            transform: 'translateX(calc(-100% + 480px))',
            // Governs the REWIND, 76% → 84%. Steeper in the middle than the run's curve
            // and symmetrical, so the way back reads as one flick rather than as the run
            // played backwards.
            animationTimingFunction: 'cubic-bezier(0.6, 0, 0.4, 1)',
          },
          '88%, 100%': { transform: 'translateX(0)' },
        },
        'reveal-a': {
          from: { opacity: '0', translate: '0 var(--reveal-from, 0.75rem)' },
          to: { opacity: '1', translate: '0 0' },
        },
        // The `/desktop` headline's strike-through, drawn once across the word it
        // crosses: a bar that GROWS from the left, for the reason `strikeAt` gives above
        // — a bar that fades in has already crossed the word before you see it.
        'strike-in': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'reveal-b': {
          from: { opacity: '0', translate: '0 var(--reveal-from, 0.75rem)' },
          to: { opacity: '1', translate: '0 0' },
        },
        // ── The `/features` start card's terminal ────────────────────────────────
        //
        // A LOOP, unlike the two above, which play once on entry. This one is the
        // visual inside a card in a grid: a reader arrives at it by scrolling, at a
        // moment nothing can predict, so a run that had already finished would be a
        // still image. It restarts instead, and the long tail on each keyframe is
        // what keeps that from reading as a GIF stuck on repeat.
        //
        // ELEVEN SECONDS, and the whole sequence is timed against that one number:
        // typing, then five lines arriving in order, then the panel scrolling the
        // prompt away as the last of them lands. Change the duration in the
        // `animation` block below and every percentage here moves with it.
        //
        // `caret-type` drives a `max-width` in ch units on the command, so the reveal
        // is per character without a JS scheduler. It only reads as typing because
        // the text is monospace: `steps()` over a proportional face would jump by
        // uneven amounts. TWENTY-ONE CHARACTERS — `/magic:start PROJ-142` — so both
        // the `ch` and the `steps()` below are that number, and both have to change
        // together if the command does.
        'caret-type': {
          '0%': { maxWidth: '0ch' },
          // ~1.9s of the 11s loop for 21 characters: around 11 a second, a person
          // typing a command they know.
          '17%, 100%': { maxWidth: '21ch' },
        },
        /**
         * A command typed once, per character: `max-width` from nothing to the line's own
         * width, which the caller hands over as `--type-chars` (in `ch`) along with a
         * `steps()` count and a duration to match, since every command is a different
         * length. `/workflow`'s step terminals (`workflow/StepTerminal.tsx`) type four
         * different commands through this one keyframe.
         */
        'type-in': {
          from: { maxWidth: '0ch' },
          to: { maxWidth: 'var(--type-chars, 100%)' },
        },
        'caret-blink': {
          '0%, 45%': { opacity: '1' },
          '50%, 95%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Five keyframes, one per line, and the order lives in their percentages —
        // see `statusIn` at the top of this file for why it cannot live in a delay.
        //
        // The arrival times are ~2.4s, 3.3s, 4.2s, 5.2s and 6.4s of the 11s loop.
        // Each holds hidden until just before its turn and shown for the rest of the
        // loop, so the finished list is what the card shows most of the time.
        'status-1': statusIn(21, 27),
        'status-2': statusIn(29, 35),
        'status-3': statusIn(37, 43),
        'status-4': statusIn(46, 52),
        // The last one is the step still running when the loop rests, so it gets a
        // longer beat after the fourth than the others get between them — the pause
        // before work starts is the one this sequence is about.
        'status-5': statusIn(57, 63),
        // ── The `/features` PR card's checks ─────────────────────────────────────
        //
        // Three checks resolving in order over an 8s loop, at 30%, 48% and 66% — a
        // beat and a half apart, because CI jobs do not finish together and three
        // ticks landing at once would read as a progress bar reaching the end.
        'ci-pending-1': ciPending(30),
        'ci-settled-1': ciSettled(30),
        'ci-pending-2': ciPending(48),
        'ci-settled-2': ciSettled(48),
        'ci-pending-3': ciPending(66),
        'ci-settled-3': ciSettled(66),
        // ── The `/features` Agents sidebar ───────────────────────────────────────
        //
        // TWO ANIMATIONS LIFTED FROM THE APP'S OWN `index.css`, keyframe for keyframe,
        // because the sidebar drawing beside them is a reproduction and a state that
        // moves differently there is a state the reader will not recognise.
        //
        // `wave-bar` is `WaveLoader`: three parallel bars scaled on the Y axis, the
        // middle one tallest, 1.2s, with the three copies 0.15s apart. The stagger is an
        // `animation-delay` at the call site rather than three keyframes here, exactly as
        // the app does it.
        'wave-bar': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '35%': { transform: 'scaleY(0.55)' },
          '70%': { transform: 'scaleY(1.1)' },
        },
        /**
         * ── THE SHARE GRAPH'S THREE BEATS ──────────────────────────────────────
         *
         * `components/site/home/OrgArt.tsx`'s `PlanSharingArt` plays one story on a 9s
         * loop, and the product owner wrote the running order: "1 personne à gauche => le
         * plan qui s'écrit en live => le plan qui se partage à deux autres personnes avec
         * l'animation des points". Three keyframes, one per beat, and they share a period
         * so the beats stay in the stated order forever rather than only on the first
         * pass.
         *
         * THE WHOLE LOOP, in one place, because no single keyframe below shows it:
         *
         *     84 → 98%   `plan-arrive`  the idea reaches the author's sheet
         *      0 → 25%   `plan-write`   the plan writes itself, line after line
         *     30 → 62%   `plan-share`   two dots carry it out to two people
         *     60 → 81%   `plan-write`   the sheet clears
         *     81 → 84%                  rest
         *
         * `plan-arrive` RUNS AT THE END OF THE CYCLE AND NOT THE START, which is the trick
         * that makes this readable. The beat has to come BEFORE the writing, and the
         * writing owns 0%; putting the arrival at 84–98% means it lands at the loop
         * boundary, which IS just before 0% on every pass but the first. Nothing else
         * would have worked without giving the writing a dead 15% to start after.
         *
         * `offsetDistance` AND NOT A `transform`, which is the only reason the two dot
         * keyframes can exist at all. The wires are bezier curves; a translate would have
         * to trace each one by hand in its own set of keyframes, and they would silently
         * stop matching the moment a curve moved. CSS motion path takes the path itself —
         * the caller passes the SAME `d` string the `<path>` is drawn from as an inline
         * `offset-path`, so a dot is on its wire by construction rather than by
         * arithmetic. (It was by arithmetic for one round: three hard-coded `cx`/`cy` pairs
         * that were simply not on the curves, which is the bug this replaced.)
         */

        /**
         * BEAT ONE: the idea arriving. One dot, up the author's wire, into the sheet.
         *
         * The wire is drawn FROM the sheet outwards like every other, so the author's end
         * is `offset-distance: 100%` and the run is 100% → 0%. The long invisible stretch
         * from 0 to 84% is the dot drifting back out to the author with `opacity: 0` — a
         * jump would be free too, but interpolating costs nothing and keeps the keyframe
         * to one readable shape.
         */
        'plan-arrive': {
          '0%': { offsetDistance: '0%', opacity: '0' },
          '84%': { offsetDistance: '100%', opacity: '0' },
          '86%': { opacity: '1' },
          '98%': { offsetDistance: '0%', opacity: '1' },
          '100%': { offsetDistance: '0%', opacity: '0' },
        },

        /**
         * BEAT TWO: the plan writing itself. One keyframe, worn by the sheet's four rules
         * — the title and three stories — each with its own `animation-delay`.
         *
         * `strokeDashoffset` FROM 1 TO 0 IS THE PEN. The rules carry `pathLength="1"` and
         * `stroke-dasharray="1"`, which normalises each one's length to a single unit
         * whatever it actually measures — so one keyframe draws a 26px line and a 40px
         * line at the same rate, and moving a rule cannot desynchronise it.
         *
         * DELAYS ARE SAFE HERE AND THEY WERE NOT SAFE IN THE FIRST DRAFT, which is worth
         * writing down because it is the trap this file's `done-*` group avoids by using
         * five keyframes instead of one. A delay shifts an element's ENTIRE cycle, so with
         * the clear at 86–94% a 1.2s (13%) delay put the last rule's clear at 99–107% —
         * past the boundary, landing modulo 9s on top of the next pass's writing, and the
         * sheet cleared itself while it was still being written. Pulling the clear back to
         * 60–68% leaves 32% of headroom, which is more than the 13% of stagger the four
         * rules spend. The rule to keep: `max delay% + clear-end% <= 100%`.
         *
         * THE BULLETS WEAR THIS TOO, and only the opacity half of it reaches them: a
         * `<circle>` with a fill and no stroke has no dash to offset. One keyframe for a
         * row's marker and its rule is what keeps the two arriving together.
         */
        'plan-write': {
          '0%': { strokeDashoffset: '1', opacity: '0' },
          '2%': { opacity: '1' },
          '12%': { strokeDashoffset: '0', opacity: '1' },
          '60%': { strokeDashoffset: '0', opacity: '1' },
          '68%': { strokeDashoffset: '0', opacity: '0' },
          '100%': { strokeDashoffset: '1', opacity: '0' },
        },

        /**
         * BEAT THREE: the plan going out. Two dots, down the two recipients' wires,
         * starting once the last rule is written.
         *
         * 0% → 100%, THE OTHER WAY ROUND FROM `plan-arrive` and from what this drawing did
         * for a round. It ran people → plan on the owner's own earlier suggestion; the
         * brief that replaced it puts an author on the left and the recipients on the
         * right, which makes the outward direction the only one that reads — a plan is
         * written once and picked up by whoever is free.
         *
         * The two dots differ by an `animation-delay` at the call site rather than by a
         * second keyframe here, and the same headroom rule as `plan-write` applies: the
         * run ends at 62%, so a 0.5s (5.6%) stagger is nowhere near the boundary.
         */
        'plan-share': {
          '0%': { offsetDistance: '0%', opacity: '0' },
          '30%': { offsetDistance: '0%', opacity: '0' },
          '33%': { opacity: '1' },
          '58%': { offsetDistance: '100%', opacity: '1' },
          '62%': { offsetDistance: '100%', opacity: '0' },
          '100%': { offsetDistance: '100%', opacity: '0' },
        },
        // `ask-arrive` is the `waiting` badge: the question bubble ARRIVES rather than
        // gestures — a small lift with a tilt into it, a settle back past level, then
        // rest — because that state is the agent asking you something, not the agent
        // being slow. One arrival per 3s loop, and the rest is most of it. The lift is a
        // PERCENTAGE of the glyph's own height, so it reads the same at any size.
        'ask-arrive': {
          '0%, 44%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '14%': { transform: 'translateY(-14%) rotate(-5deg)' },
          '30%': { transform: 'translateY(0) rotate(2deg)' },
        },
        // ── The `/features` done card's checklist ────────────────────────────────
        //
        // Five boxes ticking 400ms apart on a 5s loop, so each is 8% further in: 8, 16,
        // 24, 32, 40. `statusIn`'s 2% ramp is 100ms at this duration, which is what
        // makes them read as ticking rather than fading.
        'done-1': statusIn(6, 8),
        'done-2': statusIn(14, 16),
        'done-3': statusIn(22, 24),
        'done-4': statusIn(30, 32),
        'done-5': statusIn(38, 40),
        // The strike-throughs, on the same five beats as the ticks above so a line is
        // drawn as its box is filled.
        'strike-1': strikeAt(6),
        'strike-2': strikeAt(14),
        'strike-3': strikeAt(22),
        'strike-4': strikeAt(30),
        'strike-5': strikeAt(38),
        // ── The homepage's "Make it yours" switch ────────────────────────────────
        //
        // ONE CLICK, ON AND OFF AGAIN, over a 4.8s loop. Three keyframes rather than one
        // because three different properties move on three different elements — the
        // knob's position, the track's colour and the pointer's press — and a single
        // keyframe cannot address three boxes. They share the same percentages, which is
        // what keeps them one gesture: change a beat here and change it in all three.
        //
        // THE BEATS: rest to 15%, the press at 15–20% (the knob's travel and the track's
        // turn happen inside it), on and at rest to 60%, the second press at 60–65%, then
        // off and at rest for the last third. The rest either side is deliberately the
        // majority of the loop — a switch flicking continuously is a fidget, and what the
        // card is illustrating is that the app HAS switches, not that they are being
        // thrashed. The OFF rest is longer than the ON one so the loop's seam lands in the
        // middle of a still, where nobody sees it.
        //
        // 5% IS ~240ms AT THIS DURATION, which is what makes the move read as a mechanism
        // rather than as a fade. macOS's own switch settles in about that.
        // A TIMING FUNCTION INSIDE A KEYFRAME GOVERNS THE SEGMENT THAT STARTS THERE, and
        // getting that backwards is what made the first version wrong in a way the product
        // owner spotted immediately: "j'aime bien l'animation de la désactivation, mais
        // l'animation de l'activation est trop lente". The two moves were the same length,
        // so it was not the duration — the bezier was declared on the `20%` keyframe, which
        // governs 20→65 and therefore the move OFF. The move ON ran on the shorthand's
        // `linear` and had no snap at all, which at this size reads as slow rather than as
        // flat. The curve now sits on the keyframes the moves START from.
        //
        // AND THE ON IS NOW GENUINELY FASTER THAN THE OFF: 16→19 against 60→65, ~145ms
        // against ~240ms. Deliberately asymmetric, and it is how a switch behaves — the one
        // that answers you is the one you pressed FOR, so it wants to arrive; going back is
        // an undo and can take its time. The owner liked the off exactly as it was, so only
        // the on moved.
        'switch-knob': {
          // `cubic-bezier(.32,1.4,.55,1)` overshoots slightly on arrival, which is the
          // difference between a knob that slides and one that is thrown. Declared INSIDE
          // the keyframe, as `timeline-run` does: a function on the shorthand would apply
          // to every segment, including the two long rests where there is nothing to ease.
          '0%, 16%': { transform: 'translateX(0)', animationTimingFunction: 'cubic-bezier(.32,1.4,.55,1)' },
          '19%, 60%': { transform: 'translateX(3rem)', animationTimingFunction: 'cubic-bezier(.32,1.4,.55,1)' },
          '65%, 100%': { transform: 'translateX(0)' },
        },
        // 3rem IS NOT A GUESS: the track is `w-28` (112px) with `p-2` (8px a side), so its
        // inside measures 96px and the knob is `h-12 w-12`. 96 − 48 = 48 = 3rem. The three
        // numbers have to agree, which is why they are written out here as well as at the
        // call site.
        'switch-track': {
          // OFF is ink at 12% — the switch's own off state on a light ground, not a grey
          // token, because it has to sit on the card's gradient without picking a fight
          // with it. ON is `brand`, the same blue the primary button is filled with.
          //
          // THE SAME BEATS AS THE KNOB, to the percent. A track still turning after the
          // knob has arrived is a switch with a lag in it.
          '0%, 16%': { backgroundColor: 'rgba(10, 10, 10, 0.12)' },
          '19%, 60%': { backgroundColor: BRAND },
          '65%, 100%': { backgroundColor: 'rgba(10, 10, 10, 0.12)' },
        },
        // The pointer: it ARRIVES from the card's lower right, presses, backs off a little
        // while the switch answers, comes back to press again, then leaves the way it came.
        // It does NOT travel with the knob — a cursor that follows the thing it just
        // switched is a DRAG, which is not how a switch is operated — so the two presses
        // land on the same spot and the knob moves under a hand that stays put.
        //
        // IT MOVED FOR ONE ROUND ONLY WITH THE PRESS, a dip in place, and the owner asked
        // for it to move ("tu peux le faire bouger le cursor"). The travel is in glyph
        // widths (`4.5em`-ish at the size the card draws it) so it scales with the arrow.
        //
        // THE PRESS HAS TO BEGIN BEFORE THE KNOB MOVES, or the cursor is reacting to the
        // switch instead of causing it. It goes down at 14% and the knob leaves at 16%;
        // down at 59% and the knob leaves at 60%. Two percent is ~96ms, which is about the
        // gap between a real click landing and a real switch answering it. The two glides
        // (4%→11%, 46%→56%) are what `ease-in-out` on the shorthand shapes.
        'switch-cursor': {
          '0%, 4%': { transform: 'translate(140%, 120%) scale(1)', opacity: '0' },
          '6%': { opacity: '1' },
          '11%, 13%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '14%, 18%': { transform: 'translate(-4%, 5%) scale(0.9)' },
          '23%, 30%': { transform: 'translate(0, 0) scale(1)' },
          '36%, 46%': { transform: 'translate(45%, 40%) scale(1)' },
          '56%, 58%': { transform: 'translate(0, 0) scale(1)' },
          '59%, 63%': { transform: 'translate(-4%, 5%) scale(0.9)' },
          '69%, 74%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '86%, 100%': { transform: 'translate(140%, 120%) scale(1)', opacity: '0' },
        },
        // ── The security band's secrets table ────────────────────────────────────
        //
        // TWO SECRETS DISSOLVING INTO BIG PIXELS, one after the other, over a 7-second
        // loop — the drawing in `SecuritySection`'s secrets card, `home/SecurityArt.tsx`.
        //
        // WHAT IS ANIMATED IS AN OPACITY, AND THAT IS THE WHOLE POINT. The mosaic is
        // ALWAYS there, underneath, with a static SVG filter on it; what moves is a
        // readable copy of the same string lying on top of it, fading away. So each row is
        // legible for a beat, dissolves into its own blocks, and STAYS unreadable for the
        // rest of the cycle — five of the seven seconds, which is what makes "we cannot
        // read this" the panel's resting state rather than a moment in it.
        //
        // IT ANIMATED `filter` DIRECTLY FIRST, AND IT SNAPPED. The product owner spotted it
        // — "j'ai l'impression qu'elle sacade un peu" — and the cause is worth writing down
        // precisely, because the obvious explanation is the wrong one.
        //
        // IT WAS NOT A PERFORMANCE PROBLEM. The first diagnosis was that an active
        // animation on `filter` forces the browser to re-evaluate an expensive SVG filter
        // every frame; that was measured, in Chromium, against a page with three of these
        // cells, and it is false. Both versions hold a steady frame interval with nothing
        // over 24ms across four seconds. Nothing was being dropped.
        //
        // WHAT IT WAS: `filter: url(...)` IS NOT INTERPOLABLE. CSS falls back to DISCRETE
        // interpolation between two filter references, so the old animation did not move at
        // all — it JUMPED, none → 3px → 5px, three states and two hard cuts. That is what
        // "saccade" describes, and no amount of frame budget would have smoothed it.
        //
        // SO THE FIX IS TO ANIMATE SOMETHING THAT CAN BE INTERPOLATED. `opacity` can, so
        // the readable copy now travels continuously over ~0.35s where the filter used to
        // cut. The filtered layer underneath is static, which is a real if incidental
        // saving: it is rasterised once and never looked at again.
        //
        // IT WAS A `blur()` BEFORE EITHER OF THOSE, and the owner asked for pixels. The
        // change is not cosmetic: a blur says the text is out of FOCUS, which is a property
        // of whoever is looking, where a mosaic says the RESOLUTION is gone, which is a
        // property of what was kept. The second is the claim the card actually makes.
        //
        // ONE ANIMATION PER ROW AND NOT TWO, which falls out of stacking them in that
        // order: the mosaic needs no animation because it is never hidden, so the readable
        // copy fading out is the entire effect. Cross-fading two layers would have been two
        // keyframes per row saying the same thing twice.
        //
        // THE STAGGER IS IN THE PERCENTAGES, not in an `animation-delay`, for the reason
        // `statusIn` at the top of this file sets out at length: a delay on an `infinite`
        // animation applies to the FIRST iteration only, so the second row would keep its
        // own phase for ever and by the third cycle the two would be dissolving in the
        // wrong order.
        //
        // FIVE WAVES AND NOT TWO, since the table went from three rows to five. Two
        // staggers alternated across five rows would have read as the table going dark in
        // two clumps; four percent apart, top to bottom, it reads as one pass sweeping
        // down it. The last row still has its ~4.5 seconds redacted.
        'secret-reveal-1': {
          '0%, 18%': { opacity: '1' },
          '23%, 100%': { opacity: '0' },
        },
        'secret-reveal-2': {
          '0%, 22%': { opacity: '1' },
          '27%, 100%': { opacity: '0' },
        },
        'secret-reveal-3': {
          '0%, 26%': { opacity: '1' },
          '31%, 100%': { opacity: '0' },
        },
        'secret-reveal-4': {
          '0%, 30%': { opacity: '1' },
          '35%, 100%': { opacity: '0' },
        },
        'secret-reveal-5': {
          '0%, 34%': { opacity: '1' },
          '39%, 100%': { opacity: '0' },
        },
      },
      // `backwards` and not `both`: the fill has to hold the FROM state through the
      // stagger's delay, but once the animation is over the element belongs to the
      // cascade again — an end state pinned by `both` would keep `translate: 0 0` on
      // the bar for the life of the page and quietly outrank anything that wanted to
      // move it later.
      animation: {
        /**
         * The timeline. `linear`, and that is what makes the four beats read as four:
         * every segment's SPEED is then just its distance over its slice of the cycle, so
         * the slow run, the dead stop and the snap back all come out of one keyframe with
         * no easing to soften the contrast between them.
         *
         * 24s, and the RHYTHM is what these numbers are tuned against rather than the
         * pixel speed — a stop passing the card is the event a reader tracks, not a
         * distance. The run takes 65% of the cycle: 15.6s for ~1250px, about 80px a
         * second, and with columns averaging ~166px a stop passes every ~2.1s. Then 3.4s
         * of halt on the merge, 1.4s for the way back, and 2.9s at rest.
         *
         * IT WAS 26s AND THE OWNER ASKED FOR "A TOUCH FASTER", so the cycle came down by
         * two seconds — about 11% off the time a stop takes to cross. The history is worth
         * keeping because the speed has been wrong in both directions: 16s was too fast at
         * ~145px a second, 30s too slow once the columns tightened, and every change to
         * the spacing moves the distance underneath all of it.
         *
         * `calc(-100% + 560px)` RATHER THAN A PERCENTAGE, and this is the fix for a
         * fragility that has cost four rounds. The halt has to land with `Done` near the
         * card's right edge, and a percentage of the track cannot express that: the track
         * is as wide as its labels happen to set, so every reword moved the ending. It was
         * 65%, then 66, 67, 70, 71 — each one re-measured against a screenshot after a
         * label changed, and wrong again the next time one did.
         *
         * `-100%` puts the track's RIGHT EDGE at the viewport's left; adding 480px puts it
         * 480px in instead. `Done` is the last column, so its bead sits a fixed ~77px from
         * that edge whatever the labels ahead of it do — which means the run now ends in
         * the same place by construction, and a reword changes only how far it travels to
         * get there.
         *
         * WHY 480 AND NOT 560. The number IS the padding to the right of `Done`, which is
         * what makes it worth reading as one: the bead lands at `value − 77 + 24` from the
         * card's left edge (the 24 being the drawing's own `pl-6`), so against a ~550px
         * card, 560 left it 43px from the right edge and looking jammed against it. 480
         * gives ~123px — `Done` reads as having ARRIVED somewhere rather than as having
         * been stopped by the frame. Lower it further to bring the ending further in.
         *
         * NO TIMING FUNCTION OUT HERE, which is the change that matters: each beat carries
         * its own inside the keyframe. A function declared on the shorthand would apply to
         * EVERY segment, including the two holds, and would fight the two curves that make
         * the run and the rewind feel different from each other.
         */
        'timeline-run': 'timeline-run 24s infinite',
        // 400ms, down from 600: the entrance plays when a band scrolls into view now, and
        // a rise that took most of a second after the reader had arrived read as slow.
        // See `STEP_MS` in `components/site/Reveal.tsx`, which came down with it.
        'reveal-a': 'reveal-a 400ms ease-out backwards',
        'reveal-b': 'reveal-b 400ms ease-out backwards',
        // Starts once the headline has landed (the copy's reveal is 400ms), and holds.
        'strike-in': 'strike-in 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) 700ms both',
        // The start card's run: one 11s loop, and EVERY animation in it shares that
        // duration with no delay on any of them. That is what keeps them in phase —
        // see `statusIn` at the top of this file. The order the lines arrive in is in
        // their keyframes, not out here.
        //
        // `steps(21)` for the twenty-one characters of `/magic:start PROJ-142`.
        // `linear` on the lines: an eased status line arriving looks like it is being
        // placed, and these are meant to look like they are landing.
        //
        // No `backwards` anywhere any more. It was there to hold the from-state
        // through a delay, and there is no delay left to hold.
        'caret-type': 'caret-type 11s steps(21, end) infinite',
        'caret-blink': 'caret-blink 1.1s step-end infinite',
        // Duration and step count are overridden inline per command: see the keyframe.
        'type-in': 'type-in 1s steps(20, end) both',
        'status-1': 'status-1 11s linear infinite',
        'status-2': 'status-2 11s linear infinite',
        'status-3': 'status-3 11s linear infinite',
        'status-4': 'status-4 11s linear infinite',
        'status-5': 'status-5 11s linear infinite',
        // The PR card's checks: one 8s loop, no delay on any of them, the order in the
        // keyframes. Same discipline as the five status lines above, and for the same
        // reason — a delay on an `infinite` animation applies to the first iteration
        // only, so delayed siblings drift out of phase for ever.
        'ci-pending-1': 'ci-pending-1 8s linear infinite',
        'ci-settled-1': 'ci-settled-1 8s linear infinite',
        'ci-pending-2': 'ci-pending-2 8s linear infinite',
        'ci-settled-2': 'ci-settled-2 8s linear infinite',
        'ci-pending-3': 'ci-pending-3 8s linear infinite',
        'ci-settled-3': 'ci-settled-3 8s linear infinite',
        // The sidebar's two states. The wave's stagger is a delay at the call site, so
        // one animation serves all three bars.
        'wave-bar': 'wave-bar 1.2s ease-in-out infinite',
        // THE SHARE GRAPH'S THREE BEATS, and the 9s has to be IDENTICAL across all three:
        // they are one story told by three keyframes, and a period that differed by even a
        // tenth would have the beats drift out of order over a minute of watching. See the
        // keyframes above for the running order.
        //
        // 9s BECAUSE THE MIDDLE BEAT SETS IT. Four rules writing on at ~0.4s apart, each
        // taking ~1s to draw, is 2.5s of writing before anything can be shared; the
        // arrival and the two runs out want about a second each, and the sheet has to stand
        // finished long enough to be read as finished. Faster and it is a flicker.
        //
        // `linear` ON THE TWO DOT BEATS, because the curve's own shape is the only easing
        // they want — a dot easing in and out along a bezier reads as hesitant. `ease-out`
        // on the writing, where a pen slowing as it finishes a line is exactly right.
        'plan-arrive': 'plan-arrive 9s linear infinite',
        'plan-write': 'plan-write 9s ease-out infinite',
        'plan-share': 'plan-share 9s linear infinite',
        // The done checklist: 400ms between ticks means a 5s loop and 8% steps.
        'done-1': 'done-1 5s linear infinite',
        'done-2': 'done-2 5s linear infinite',
        'done-3': 'done-3 5s linear infinite',
        'done-4': 'done-4 5s linear infinite',
        'done-5': 'done-5 5s linear infinite',
        'strike-1': 'strike-1 5s linear infinite',
        'strike-2': 'strike-2 5s linear infinite',
        'strike-3': 'strike-3 5s linear infinite',
        'strike-4': 'strike-4 5s linear infinite',
        'strike-5': 'strike-5 5s linear infinite',
        // The switch. `linear` on the shorthand and the easing inside the keyframes, for
        // `timeline-run`'s reason: two of the three beats are RESTS, and a curve applied
        // to the whole cycle would ease its way through them for no effect while flattening
        // the one move that wants a curve. The three share a duration to the millisecond —
        // they are one gesture drawn on three elements, and a knob arriving a frame before
        // its track changes colour is a switch that looks broken.
        //
        // THE CARD USED TO MOVE WITH THEM and no longer does. Three more keyframes turned
        // the card's own ground dark while the switch was on, ink and all; the product
        // owner tried it and cut it — "retire le changement de background sur À votre
        // main". Worth recording because it was not a bug: it worked, and a card that
        // repaints itself twice every five seconds is simply louder than a grid of five
        // wants. The switch is the thing that moves; the card holds still around it.
        'switch-knob': 'switch-knob 4.8s linear infinite',
        'switch-track': 'switch-track 4.8s linear infinite',
        'switch-cursor': 'switch-cursor 4.8s ease-in-out infinite',
        // The secrets table's two rows: one 7s loop, no delay on either, the order in
        // the keyframes.
        //
        // `ease-in`, and it is the first curve in this table that changes anything the eye
        // can see: the property being animated is now interpolable (see the keyframes), so
        // the easing actually governs a travel rather than decorating a cut. The readable
        // copy holds nearly still through the start of its fade and then goes, which reads
        // as being taken away rather than as dimming steadily. ~0.35s — long enough to see
        // the text become its own blocks, short enough that the superimposed frames in the
        // middle never look like a rendering fault.
        'secret-reveal-1': 'secret-reveal-1 7s ease-in infinite',
        'secret-reveal-2': 'secret-reveal-2 7s ease-in infinite',
        'secret-reveal-3': 'secret-reveal-3 7s ease-in infinite',
        'secret-reveal-4': 'secret-reveal-4 7s ease-in infinite',
        'secret-reveal-5': 'secret-reveal-5 7s ease-in infinite',
      },
    },
  },
  plugins: [],
}

export default config
