'use client'

import { type HTMLAttributes, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Switch } from '@ds/desktop'
import { useT } from '@/lib/i18n/useLanguage'
import { isStill } from '@/lib/stillness'
import { AppGround } from '../AppGround'
import { TasksWindow } from '../features/TasksModalMockup'
import { Pointer } from '../Pointer'

/**
 * The five drawings inside `BuiltForSection`'s five cards.
 *
 * ONE FILE AND NOT FIVE, for `WorkflowArt.tsx`'s reason and with the same caveat: what
 * these share is the light panel — `ART_PANEL` / `PANEL_GROUND` below, stated once — and
 * three of them deliberately do not use it. Tasks is a DARK window, and the Mac and switch
 * cards are not panels at all. Splitting the file to keep one constant pure would have put
 * three short components in files of their own for the sake of a string two of them read.
 *
 * WHAT THEY ARE NOT: five reproductions of the app. `/features` measures its mockups off
 * `desktop/src/renderer/` file by file because that page's promise is "this is the
 * product". This band's promise is "the app is built for you, whoever you are", and five
 * faithful crops of one window would say the opposite of that — a wall of the same grey
 * screen. So each drawing shows ONE thing, at the fidelity that one thing needs: the Tasks
 * window is the real screen because a backlog has to look like a backlog; the switch is a
 * switch with nothing around it, because a preference is an idea and not a settings pane.
 *
 * THE LITERALS ARE ENGLISH IN BOTH LANGUAGES and they are not catalogue keys — the GitHub
 * logins and labels, the Jira statuses, epics and priorities, the repository slugs, the
 * key names on the keycaps. Same rule the whole site follows (`CommitsCardMockup.tsx`
 * states it): a string the TOOL or the PLATFORM prints stays in the language it is printed
 * in. A Jira status is the word a site's own board column is called and the app translates
 * none of them, so a French reader sees exactly what the French app would show them. And
 * macOS names its modifiers with glyphs (⌘, ⌃) rather than with words in either language.
 *
 * THE SHORTCUTS ARE THE REAL ONES, which is the one thing on this band that could quietly
 * become a lie. ⌘N is `pages/Terminals/index.tsx`, ⌘↓ is the Command+Arrow handler beside
 * it, and ⌘/ is `App.tsx`'s split-view toggle. Their labels mirror the app's own
 * `settings.shortcuts.*` strings in both languages rather than paraphrasing them, so the
 * site and the Settings pane name the same key the same way.
 *
 * `aria-hidden` ON EVERY ONE OF THEM, at the outermost node. Each paraphrases the
 * description directly above it in its card; a screen reader walking into this would hear
 * the same claim twice, the second time as a handful of disconnected fragments.
 */

/**
 * The panel the two light drawings stand on — `WorkflowArt`'s recipe, restated here rather
 * than exported from there.
 *
 * NOT AN IMPORT, and it is worth being explicit because the duplication is two short
 * strings. `WorkflowArt`'s panels are cropped by their cards and are all light; three of
 * these are neither, so the constant those five share is not the constant these five
 * share. Reaching across for it would have made one band's chrome the other band's
 * dependency, and the first drawing that needed a different ground would have added a prop
 * to a file it does not belong to.
 */
const ART_PANEL = 'overflow-hidden rounded-xl border border-hairline shadow-lift'

/** `canvas`, the site's off-white: page → coloured card → panel, three distinct steps. */
const PANEL_GROUND = 'bg-canvas'

/* ── ① Tasks ────────────────────────────────────────────────────────────────────── */

/**
 * The Tasks window, DRAWN WITH THE APP'S OWN COMPONENTS, cropped by the card's bottom and
 * right edges.
 *
 * IT IS `/features`'s WINDOW, NOT A COPY OF IT: `TasksWindow` in `TasksModalMockup.tsx` is
 * the themed panel with the real `ModalHeader` and the real `TaskBoard` — the file the
 * desktop's Tasks page renders — given invented tickets. It replaces a card-scale tracing
 * of a screen the app no longer has (a list of repository cards with a row per ticket);
 * the app deals one repository's tickets into four columns now, and so does this.
 *
 * AT THE APP'S OWN PIXELS, NOT SHRUNK. `min-w-[880px]` is the board's floor (see
 * `TasksWindow`'s note), wider than this card, so the card's right edge cuts through the
 * last column — Done, the one a reader can least act on — exactly as the plate on
 * `/features` does. The HEIGHT is this wrapper's: a backlog is never something you have
 * seen all of, so the frame stops partway down the columns and the card's bottom edge is
 * the cut.
 *
 * THE LEFT GUTTER STAYS, `pl-7`, so the window starts under the copy above it; there is no
 * right gutter because there is nothing to its right but the crop.
 */
export function TasksArt() {
  return (
    <div className="h-[380px] overflow-hidden pl-7">
      <TasksWindow className="min-w-[880px]" />
    </div>
  )
}

/* ── ② Keyboard navigation ──────────────────────────────────────────────────────── */

/**
 * A keycap. `min-w-` and not a fixed width, because ⌘ and ↓ are one glyph and a word is
 * several: a square that fitted the widest would leave the modifiers swimming, and one
 * that fitted ⌘ would clip the word.
 *
 * WHITE ON A HAIRLINE WITH A SHADOW, which is what makes it a KEY rather than a code span.
 * The shadow is the one detail doing that work — a key is a thing standing off the board,
 * and a flat rounded rectangle with monospace in it is a token. `shadow-button` is the
 * declared rung for exactly that (a control at rest); nothing here invents a shadow.
 */
function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-md border border-hairline bg-white px-1.5 py-1 font-mono text-xs font-semibold text-ink shadow-button">
      {children}
    </span>
  )
}

/**
 * Three rows of the app's own shortcut sheet: what it does on the left, the keys on the
 * right.
 *
 * THE SHEET AND NOT A FLOATING PAIR OF KEYCAPS, which was the first sketch. Two big caps
 * on a coloured ground are a nice object and say nothing — a reader sees "keyboard" and
 * learns no more than the title told them. The rows say which moves have keys, and three
 * of them is enough to imply the rest without turning the card into documentation.
 *
 * SEVEN, AND IT WAS THREE. The product owner asked for more — "tu peux mettre plus de key
 * words pour agrandir l'illustration" — and the request came with the layout change next
 * door: the Tasks card beside this one is now a full-width window and grew a good deal
 * taller, so a three-row sheet left this card as a headline over a strip of nothing.
 *
 * SEVEN IS ALSO THE HONEST NUMBER. These are every chord in the app that MOVES you — a new
 * agent, the next, the previous, the split, the two sidebars, and closing one —  * what the card's title claims since the owner renamed it from "Keyboard shortcuts" to
 * "Keyboard navigation". ⌘D (duplicate an agent) is the one the app has that is not here,
 * because duplicating is not navigating; the Settings pane lists all eight.
 *
 * THE LAST ROW IS CUT BY THE CARD, and the list is ordered so that the row losing its
 * bottom half is the least load-bearing of the seven. A sheet that ends neatly is a sheet
 * you have read all of, which is the wrong thing to say about a set of shortcuts.
 *
 * TWO OF THE LABELS ARE SHORTER THAN THE APP'S OWN, which is a deliberate break from this
 * file's rule that a label mirrors `settings.shortcuts.*` word for word. The app says
 * "Toggle agents list" and "Toggle agent info" — 34 characters in French
 * ("Afficher/masquer la liste des agents") against a keycap pair on a third-width card, so
 * they wrap to three lines and the sheet stops being a sheet. "Agents list" and "Agent
 * info" name the same thing and are what anyone would say out loud. The other five are
 * verbatim.
 *
 * THE LABELS CARRY `font-semibold text-ink`, at the owner's request and it reads better
 * for it: they went in at `font-medium text-ink/80`, which is the weight a caption takes,
 * and against a keycap — white, edged, shadowed — a caption loses. A shortcut sheet is two
 * columns of equal standing, so the left one has to hold its own.
 */
const SHORTCUTS = [
  { id: 'new', label: 'site.builtFor.shortcutNew', keys: ['⌘', 'N'] },
  { id: 'next', label: 'site.builtFor.shortcutNext', keys: ['⌘', '↓'] },
  { id: 'prev', label: 'site.builtFor.shortcutPrev', keys: ['⌘', '↑'] },
  { id: 'split', label: 'site.builtFor.shortcutSplit', keys: ['⌘', '/'] },
  { id: 'agents', label: 'site.builtFor.shortcutAgents', keys: ['⌘', 'B'] },
  { id: 'info', label: 'site.builtFor.shortcutInfo', keys: ['⌘', 'I'] },
  { id: 'close', label: 'site.builtFor.shortcutClose', keys: ['⌘', 'W'] },
] as const

export function ShortcutsArt() {
  const { t } = useT()

  return (
    // Cropped at the BOTTOM rather than at the side: the rows are a list, and a list
    // running off the bottom edge says there are more of them — which is true, and is the
    // claim the card makes in one line. The wrapper's negative bottom margin pulls the
    // panel past the card's own edge and `ToneCard`'s `overflow-hidden` does the cutting.
    <div aria-hidden className="-mb-6 px-7">
      <div className={`${ART_PANEL} ${PANEL_GROUND} p-3`}>
        <ul className="space-y-1">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-white"
            >
              <span className="min-w-0 truncate text-xs font-semibold text-ink">
                {t(shortcut.label)}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <Keycap key={key}>{key}</Keycap>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ── ③ Tailored ───────────────────────────────────────────────────────────────────── */

/**
 * THE TAILORED CARD'S ILLUSTRATION: a measuring tape, from the site's own set
 * (`illustration-measure.svg`), because the card says "made to measure" and the tape says
 * it before the title is read. It replaced the "truly Mac-native" card and its Apple mark,
 * on the owner's call: this band is titled for product builders, and the profile the skills
 * read (role, technical level, tone) is the one feature that proves the claim.
 *
 * ON THE CARD'S BOTTOM EDGE, with no gutter under it: the two arms are cut off at the
 * drawing's own bottom, so they have to come in from the card's edge or they read as
 * stumps floating mid-card. `ToneCard`'s default `end` slot pins it there. The file's
 * `viewBox` is cropped to the drawing's measured box (`25 208 950 584` out of a 1000²
 * canvas), a landscape strip, so it is sized by WIDTH. `alt=""`: the title says it.
 */
export function TailoredArt() {
  return <img src="/img/illustration-measure.svg" alt="" className="mx-auto w-full max-w-sm px-7" />
}

/* ── ④ Make it yours ────────────────────────────────────────────────────────────── */

/**
 * One big switch, clicking itself on and off, with the pointer pressing it.
 *
 * IT IS THE COMPONENT NOW, not a drawing of one. `Switch` comes from
 * `design-system/desktop/`, the same file the Electron renderer compiles, on a patch of
 * the app's own light theme (`AppGround`). This is `UsageCardMockup`'s move and it was
 * made here for the same reason and at the product owner's asking — "j'aimerai qu'on
 * utilise ce composant dans l'animation. comme ça si je change de design". Change the
 * switch and this card changes with it.
 *
 * WHAT THAT REPLACED: a track and a knob built by hand out of `w-28 h-16 p-2` and
 * `h-12 w-12`, with their own colours and their own idea of the knob's shape. It was a
 * faithful drawing of the switch as it stood, and the switch has since grown a pill knob
 * and three sizes that the drawing knew nothing about. A drawing that IS the component
 * cannot fall behind one.
 *
 * `size="lg"` AT 2× IS THE OLD FOOTPRINT TO THE PIXEL. The component's largest rung is
 * 56×32 and the hand-built track was 112×64, so `scale-2` lands exactly where the card
 * already was — the drawing is the same size on the page as it was before, and nothing
 * in the band's rhythm moved. The scale is a MAGNIFICATION and not a size: this is a
 * settings control shown at four times life, which is why it is right to take the real
 * component's proportions up wholesale rather than to ask it for a bigger rung.
 *
 * THE APP'S OWN COLOURS, at the owner's choosing: `AppGround` in the `light` theme hands
 * the component `--c-accent` (#4F46E5) for the on track, ink at 20% for the off one and
 * white for the knob. The card used to paint the track `brand` (#393BFF), the primary
 * button's blue, and the two are close enough that the band did not move — but they are
 * not the same decision. This one says "here is the control the app ships"; the old one
 * said "here is a switch in our blue", and the first is what the card is claiming.
 *
 * NO PANEL, and that is unchanged. A switch inside a settings row would be a drawing of
 * the Settings PANE, and the app has eleven tabs of those — picking one to photograph
 * would say "this preference" where the card says "your preferences". A switch with
 * nothing around it is the preference as an idea.
 *
 * THE CARD ANSWERED THE CLICK FOR ONE ROUND, and it does not any more. The product owner
 * asked for the ground to go dark while the switch was on — "ça peut être funny" — which
 * it was; it shipped as `CARD_TONES.flick`, a ninth tone whose ground and both ink tiers
 * animated together. They then cut it: "retire le changement de background sur À votre
 * main". Worth a paragraph rather than a silent deletion, because nothing about it was
 * broken — a card that repaints itself twice every five seconds is simply louder than a
 * grid of five wants, and this drawing already has something moving in it.
 *
 * THE KNOB AND THE TRACK ARE NO LONGER KEYFRAMES. `switch-knob` and `switch-track` are
 * gone from `tailwind.config.ts` along with the 3rem translate that had to be kept in
 * agreement with the track's width by hand — the component owns both now, and moving a
 * rung can no longer leave a keyframe lying about the geometry. `switch-cursor` STAYS:
 * the pointer is the card's own and has nothing to do with the control.
 *
 * WHICH COSTS A TIMER, and it is the one thing this move gives up. The old loop was
 * three declared keyframes and no JavaScript; a React component's state cannot be driven
 * by a CSS animation, so `checked` is flipped on the same two beats the keyframes used —
 * 16% and 60% of one 4.8s turn — by the `requestAnimationFrame` loop every other
 * JS-driven drawing on this site runs. It reads the clock modulo the cycle rather than
 * counting ticks, so it cannot drift out of step with the cursor beside it, and
 * `isStill()` is what keeps it off phones, tablets and reduced-motion.
 *
 * THE ON IS NO LONGER FASTER THAN THE OFF. The two moves were asymmetric here — ~145ms
 * on, ~240ms off — and the component eases both at 200ms. What survived the move is the
 * part that was actually doing the work: the overshoot curve, which is in
 * `design-system/desktop/Switch.tsx` now and which the app's own sixteen switches wear
 * too. The asymmetry was a second answer to the same complaint and did not need to come.
 *
 * THE ARROW IS THE SITE'S SHARED `Pointer`, with the preset `drop-shadow` utility (no
 * bracketed value, so `lib/designTokens.test.ts` has nothing to refuse). It was a
 * hand-traced path with a second copy of itself for a shadow; the owner asked for the
 * workflow page's cursor on every drawing, and that is where the two paths went.
 */

/** One turn of the loop, and the two beats in it where the switch answers the pointer.
 *  The percentages are `switch-cursor`'s own — it presses at 14% and at 59%, and a
 *  control that moved on the press rather than just after it would be a control causing
 *  the cursor instead of the other way round. */
const SWITCH_CYCLE_MS = 4800
const SWITCH_ON_AT_MS = 768 // 16%
const SWITCH_OFF_AT_MS = 2880 // 60%

/** Nothing is listening: the beat is the drawing's, not the reader's. */
const noop = () => undefined

export function MakeItYoursArt() {
  const { t } = useT()
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (isStill()) return

    const start = performance.now()
    let frame = 0
    const tick = () => {
      const elapsed = (performance.now() - start) % SWITCH_CYCLE_MS
      // Read off the clock rather than counted: a loop that toggled on a timer would
      // drift against the cursor's CSS animation over a few hundred turns, and the
      // press landing on a switch that has already moved is the one thing this
      // drawing cannot afford.
      setOn(elapsed >= SWITCH_ON_AT_MS && elapsed < SWITCH_OFF_AT_MS)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div aria-hidden className="relative flex h-44 items-center justify-center">
      {/* `paint={false}`: the theme's variables are all a real component needs from this,
          and the window colour under them would be a dark rectangle on a card whose whole
          ground is the `sky` tone. `light` and not the app's default `dark`, because the
          card is a light surface and `bg-ink/20` on a dark theme is white at 20% — which
          on this ground is a track you cannot see.

          `inert` beside the card's `aria-hidden`: the switch is a real `<button>`, and a
          control nobody can see has no business in the tab order. It has to reach the DOM
          as a STRING — React 18 does not know the attribute and drops a boolean with a
          warning — which is the cast `AgentsSidebarMockup` and `components/ui.tsx` make. */}
      <AppGround
        theme="light"
        paint={false}
        className="inline-flex scale-[2] rounded-full shadow-lift"
      >
        <div {...({ inert: '' } as unknown as HTMLAttributes<HTMLDivElement>)}>
          {/* `noop`, because nothing is listening: the beat is the drawing's, not the
              reader's. The label is still required and still right — it names what the
              control would be if this were a settings page. */}
          <Switch
            size="lg"
            checked={on}
            onChange={noop}
            label={t('site.builtFor.yoursTitle')}
          />
        </div>
      </AppGround>

      {/* THE POINTER, over the track's right half — where a thumb lands on a switch that
          is about to go on. It does NOT travel with the knob: a cursor following the thing
          it just switched is a DRAG, and a switch is not dragged. `left`/`top` in
          percentages of the wrapper so it holds its place at every card width, which is
          also what keeps it clear of the switch's own `scale-[2]`. */}
      <div className="pointer-events-none absolute left-[52%] top-[52%] animate-switch-cursor">
        {/* THE SITE'S ONE CURSOR (`components/site/Pointer.tsx`), at the size the switch
            wants; the keyframe on the wrapper is what presses it. It was a hand-traced path
            with a second copy for a shadow until the owner asked for the workflow page's
            pointer on every drawing. */}
        <Pointer className="h-11 w-11" />
      </div>
    </div>
  )
}

/* ── ⑤ Spotlight ────────────────────────────────────────────────────────────────── */

/**
 * Quick Launch: the bar, and nothing else.
 *
 * THE PANEL IS THE APP'S OWN, and `SpotlightBarMockup` on `/features` is where this shape
 * was settled — Quick Launch has no chrome, no title and no edges, so a dark rounded bar
 * floating on a ground is not a simplification of that window, it IS that window.
 *
 * NOT REUSED, though, and the reason is one line inside it: that component hard-codes
 * `bg-tone-sky` as its own plate, because on `/features` it is a drawing beside a row
 * rather than a visual inside a coloured card. Dropping it in here would put a blue
 * rectangle inside a pink one. Adding a ground prop to serve one call site is the caller
 * dressing a component, which is the conflict `components/ui.tsx`'s header warns about —
 * so the bar is drawn again, at that component's own type sizes, and the PLACEHOLDER is
 * shared instead (`site.spotlightCard.placeholder`, a ticket id and a command, identical
 * in both catalogues).
 *
 * IT HAD KEYCAPS ABOVE IT — ⌃ Space, the real global shortcut — and the product owner cut
 * them: "tu peux supprimer le raccourci clavier ^ Space dans l'illustration Spotlight et
 * mettre l'input en plus gros". The right call, and not only for the room it buys. The
 * card next door but one is now titled "Keyboard navigation" and IS a sheet of keycaps, so
 * this card was answering a question the band had already answered — and doing it in the
 * two smallest objects on the screen. The bar at full size is one thing said once, and the
 * global shortcut is still in the card's own sentence where a shortcut can be named.
 *
 * `text-3xl` AND A `w-7` MAGNIFIER, one step past Quick Launch's own `text-2xl`, and the
 * step up is the owner's second pass — "peux-tu agrandir l'input mockup du spotlight pour
 * qu'il soit plus centré dans la card". Drawn at the app's literal size the bar was a
 * third of the height of the space it had, and the difference between a small object with
 * air around it and a big one is whether the card reads as having something IN it.
 *
 * CENTRED RATHER THAN PINNED TO THE BOTTOM, which is the other half of the same note and
 * needed a slot in `ToneCard` rather than a class here: a stacked visual is `mt-auto` by
 * default, so no amount of padding at this end would lift it off the bottom edge. `visual`
 * is that slot — see `ToneCardVisual`, which sets out why an OBJECT centres and a cropped
 * panel does not.
 *
 * THE CROP WENT AND CAME BACK, which is the one thing here that changed twice. Enlarging
 * the bar meant centring it, and a centred object cropped on one side reads as an object
 * that has slipped — so the `-mr-10` was dropped. The product owner put it back: "peux-tu
 * faire en sorte que le spotlight l'input soit croppé sur la droite". They are right, and
 * the argument against it was the wrong one. This is not an object like the switch next
 * door; it is a WINDOW, and Quick Launch is the one window on this site with no edges of
 * its own — running it off the card is the only thing that says so. An input that ends
 * neatly inside its own picture is also one you have already filled, where a cut one has
 * room in it. Centred vertically, cropped horizontally: the two are not in tension, they
 * answer different questions.
 */
export function SpotlightArt() {
  const { t } = useT()

  return (
    // `overflow-hidden` here rather than relying on the card's: this wrapper has a left
    // gutter and the card does not, so cutting at this box keeps the bar's overhang the
    // same 40px whatever the card's own padding is.
    <div aria-hidden className="overflow-hidden px-7">
      {/* `-mr-10` past the wrapper's own padding, cut by the `overflow-hidden` above.
          `whitespace-nowrap` and not `truncate`: the placeholder has to leave the frame
          sideways, and an ellipsis is the drawing admitting the text did not fit. */}
      <div className="-mr-10 flex items-center gap-4 rounded-2xl bg-ink px-5 py-5 shadow-lift">
        <Search className="h-7 w-7 shrink-0 text-appink" />
        {/* The PLACEHOLDER tier, not typed text: the app draws it in `zinc-600`, which on
            black is dark enough to disappear at this size on a page nobody is focused on.
            `appink-icon` is the nearest declared ink that still reads. */}
        <span className="whitespace-nowrap font-display text-3xl font-medium text-appink-icon">
          {t('site.spotlightCard.placeholder')}
        </span>
      </div>
    </div>
  )
}
