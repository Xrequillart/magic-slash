'use client'

import { Fragment, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { SiteNavTone } from '@/lib/siteNav'

/**
 * One dropdown in the site header: a trigger, and a panel of links under it.
 *
 * Carried over from the menu that lived inline in `SiteHeader` — the outside-click and
 * Escape handling is the same, and for the same reasons. It is a component now because
 * the header grew a second popover (the language picker) and the two behaved
 * identically while sharing nothing; anything the next one needs is fixed here once.
 *
 * WHICH IS WHY THIS FILE EXPORTS MORE THAN A COMPONENT. `LanguageMenu` cannot BE a
 * `NavDropdown` — it is a radio group over a setting, not a list of links, and its aria
 * contract says so — but everything below the markup is the same popover, so the
 * behaviour (`useDismiss`) and the dress (`POPOVER_*`) live here and it imports them.
 * `Reveal.tsx` is the precedent: a hook beside the component that uses it, exported for
 * the second caller that needs the behaviour without the element.
 *
 * WHAT THE PANEL IS. A rendered-then-hidden `<div>`, not a conditional: `hidden`
 * removes it from the accessibility tree and from the tab order while keeping the
 * markup in the document, which is what lets `aria-controls` on the trigger point at
 * something that exists before it is opened.
 *
 * Listening on the DOCUMENT rather than drawing a backdrop, because a backdrop makes
 * the rest of the bar unclickable while the menu is open: with the listener, one click
 * both closes this and follows the link under the cursor.
 */

/**
 * EVERY CONTROL IN THE BAR, and that is now literally every one: the two nav triggers,
 * the language picker, the two bare links (the FAQ and the repository) and the way in.
 * One recipe, one baseline, one focus ring, one hover.
 *
 * Shared because the drift already happened once: a "How it works" link was written out
 * separately and arrived without the focus ring, so two adjacent controls announced
 * keyboard focus differently. Call sites append only what differs (`sm:block`), which
 * is additive and cannot race the recipe — see the rule in `components/ui.tsx`.
 *
 * ── THE DRESS IS THE REFERENCE'S, AND IT MOVED TWICE ────────────────────────────────
 *
 * It read `text-sm font-medium text-muted` on `rounded-button`, which is the dress of a
 * SECONDARY link: grey, medium weight, and a radius shared with the buttons. Measured
 * against the reference bar it was wrong on both counts. A nav row there is near-black
 * and semibold — the same weight as the wordmark beside it, because the nav is the
 * primary thing in a bar that holds nothing else — and it is a PILL rather than a
 * rounded rectangle, so the ground that appears under it reads as a chip and not as a
 * button somebody forgot to fill.
 *
 * `text-ink/80` and not `text-ink`: full ink puts the nav at the wordmark's exact weight,
 * and 80% is the one step back that keeps the mark first while staying unmistakably
 * dark. `hover:text-ink` closes that gap on the control under the cursor.
 *
 * `rounded-full` is not a new token — the radius scale in `tailwind.config.ts` is for
 * boxes, and a pill is what `Badge` already uses for the same reason: it is a SHAPE, not
 * a rung.
 *
 * THE GREY CHIP IS IN HERE, BY DECISION OF THE OWNER, and it is the one line of this
 * note that reversed. It used to be `NAV_ITEM_GROUND_HOVER`, a separate constant two
 * call sites appended, on the rule that a control which OPENS something answers the
 * cursor with a chip while a control that merely navigates does not. That distinction
 * is gone: the bar's links and its dropdowns are meant to be one format, so the chip
 * belongs to the recipe rather than to a subset of its call sites — which also means a
 * link added to the bar tomorrow cannot arrive without it, the way the focus ring once
 * did. `NAV_ITEM_GROUND` below is what is left of the split, and it is a different
 * state: a chip with no cursor on it, for a menu that is OPEN.
 *
 * `hover:bg-black/[0.05]` IS SPELLED OUT, never a variant wrapped around an
 * interpolated constant — Tailwind
 * extracts candidates from the raw TEXT of a file, so an interpolated variant is a class
 * it never sees and never emits. (This shipped that way for about a minute.) The
 * interpolations below are safe because the literal they splice in already carries its
 * own variant; a variant added AROUND one has to be written where the scanner reads it.
 */
const NAV_ITEM_BASE =
  'rounded-full font-display text-sm font-semibold text-ink/80 transition hover:bg-black/[0.05] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

/**
 * A control with a LABEL in it — which, since the repository link went from a mark to
 * the word "GitHub", is all of them.
 *
 * THE PADDING IS THE SLOT, and the base holds everything else, for the mechanical reason
 * `POPOVER_ROW_BASE` states one level down: a `p-2` handed to a string that already says
 * `px-3.5 py-2` does not win by being later in it — both are utilities in the same
 * group, so the one Tailwind emitted LAST in the sheet wins, and it emits padding by
 * ascending value. The split cost nothing to keep, and it is what a second shape (an
 * icon-only control, which the bar held for exactly one iteration) would need again.
 */
export const NAV_ITEM = `px-3.5 py-2 ${NAV_ITEM_BASE}`

/**
 * The pill's fill with NO CURSOR ON IT — for a control whose menu is open, and for the
 * way in, which rests on it.
 *
 * `black/[0.05]` is the same tint `POPOVER_ROW_REST` uses for a hovered row, one point
 * up: a chip in the bar is read against a white sheet (or against the hero, at rest,
 * where nothing is behind it at all), and 4% disappears there. It is the same value the
 * hover in `NAV_ITEM_BASE` fades in, which is the point — an open menu looks exactly
 * like the control you are pointing at, because it is the one you pointed at.
 *
 * WHY IT IS NOT IN THE RECIPE. Above the fold the bar has no surface of its own — no
 * fill, no rule, no blur, just the controls floating on the hero (see `SiteHeader`) —
 * and a row of grey chips sitting on that wash is a strip of small boxes in the middle
 * of the bloom. Resting on nothing is what makes the chip mean something when it
 * arrives.
 */
export const NAV_ITEM_GROUND = 'bg-black/[0.05]'

/**
 * The floating panel, minus the edge it hangs from and how wide it is — those differ
 * per menu and are additive, so they stay at the call site.
 *
 * THE ELEVATION IS `shadow-button-hover`, and it is a rung of OUR scale rather than
 * Tailwind's. For one iteration this wore Tailwind's own `lg` rung instead, on the
 * reasoning that a built-in is not an arbitrary value — but the scale in
 * `tailwind.config.ts` declares FOUR rungs and nothing else, so a fifth weight borrowed
 * from the framework is exactly the drift the scale exists to prevent. It also slipped
 * past `lib/designTokens.test.ts`, which allow-lists Tailwind's built-in `boxShadow`
 * keys: the one shadow in the design system that no guard could see. (Which is also why
 * that rung is not spelled out as a class here — Tailwind extracts candidates from the
 * raw text of a file, comments included, and a mention would emit the very utility this
 * note is about.)
 *
 * `shadow-button-hover` and not `shadow-card`: `card` is deliberately the quietest rung
 * — it lands on ~35 surfaces and is tuned to sit UNDER the button it contains — and a
 * panel floating over the page needs the lifted two-layer weight instead. Nothing new
 * is declared for it, because the brief's rule is "do not invent a new shadow" and a
 * popover is not a new kind of depth, it is the lifted one.
 */
export const POPOVER_PANEL =
  'absolute top-full z-10 mt-2 rounded-2xl border border-hairline bg-white p-2 shadow-button-hover'

/**
 * WHAT EVERY ROW SHARES, minus the two things the three shapes below disagree about:
 * how it lays out its children, and how much padding it takes.
 *
 * A BASE AND NOT A RECIPE ONE SHAPE OVERRIDES, and this is worth stating precisely
 * because the first version of the tiled row got it wrong. Appending `flex px-2 py-1.5`
 * to a string that already says `block px-3 py-2` does not win by being later in the
 * string: both are utilities in the same group, so the one Tailwind emitted LAST in the
 * stylesheet wins — and Tailwind emits padding by ascending value, so `px-3` beats the
 * `px-2` written after it. Two of those three conflicts silently kept the old value.
 *
 * So nothing here conflicts with anything: the shapes state their own display and their
 * own padding, and share the radius, the size and the transition. The rule in
 * `components/ui.tsx` — a call site may only ADD — is exactly this, one level down.
 */
const POPOVER_ROW_BASE = 'rounded-button text-sm transition'

/** A plain row: a block of text, and the padding the panel was built on. */
export const POPOVER_ROW = `block px-3 py-2 ${POPOVER_ROW_BASE}`

/** The ground a row answers the cursor with. Every dress below shares it. */
const POPOVER_ROW_GROUND = 'hover:bg-black/[0.04]'

/**
 * A row's colours at rest — the QUIET dress, for a popover whose rows are options rather
 * than destinations.
 *
 * NOTHING WEARS IT TODAY. `LanguageMenu`'s two options did, which is what it was written
 * for, and they took `POPOVER_ROW_NAV` instead when the picker moved back into the bar:
 * two panels hanging off the same header, one of them at `muted` body weight and the
 * other semibold ink, read as one menu and one disabled menu. It is kept rather than
 * deleted for the reason the picker's own `header` dress was kept through the release it
 * spent unused — and because it is the dress `FeaturesSidebar` measures its own rail
 * against, in a note that only makes sense while this exists to be compared to.
export const POPOVER_ROW_REST = `text-muted ${POPOVER_ROW_GROUND} hover:text-ink`

/**
 * A NAV row's colours at rest, which is a different weight of thing.
 *
 * Measured off the reference menu: its rows are near-black and semibold in the display
 * face, the same as the bar above them, because they are the site's own destinations and
 * not settings. `text-muted` — what these rows wore, and what `POPOVER_ROW_REST` still
 * is — read as a list of things that had been disabled. The language picker's options
 * now take THIS one, for the same reason one step further out: see the note above it.
 *
 * A SEPARATE CONSTANT AND NOT AN APPENDED CLASS, and that is the mechanical half: two
 * text colours in one string do not resolve by their order in the string, they resolve
 * by which utility Tailwind emitted later. A dress that overrides a colour has to
 * REPLACE the colour, which is why this restates the ground rather than adding to it.
 */
export const POPOVER_ROW_NAV = `font-display font-semibold text-ink/80 ${POPOVER_ROW_GROUND} hover:text-ink`

/**
 * THE WHITE TILE A GLYPH SITS IN — the reference menu's own plate, measured off it.
 *
 * 40px rather than its ~56px: that panel is 560px wide against this one's 288px, and a
 * tile scaled from the wider layout would take a seventh of the row. 40px with an 18px
 * glyph keeps the same ratio of plate to mark.
 *
 * `bg-white` ON A WHITE PANEL, which sounds like nothing and is the whole effect: what
 * draws the tile is the hairline around it and `shadow-card` under it, so the plate
 * reads as a raised surface rather than as a filled box. `shadow-card` is the scale's
 * quietest rung and is tuned to sit UNDER something — a 40px plate in a menu row is
 * exactly that, and inventing a lighter shadow for it is what `designTokens.test.ts`
 * exists to prevent.
 *
 * `rounded-xl` (12px) on 40px is the reference's own proportion — a squircle, not a
 * circle and not a square.
 */
export const POPOVER_TILE =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white shadow-card'

/**
 * A row that carries a bare glyph. Same padding as the plain row — the glyph sits inside
 * the text column rather than beside it — with `gap-2.5`: 10px, which sets a 16px mark
 * off the label without the row reading as two columns.
 */
export const POPOVER_ROW_WITH_ICON = `flex items-center gap-2.5 px-3 py-2 ${POPOVER_ROW_BASE}`

/**
 * A row whose glyph is TILED: the same shape, with the padding pulled in and the gap
 * opened out.
 *
 * `px-2` rather than `px-3` because the tile brings its own visual inset — 12px of row
 * padding plus a 40px plate sets the label 52px in, which is further than the
 * reference's own measure — and `py-1.5` because a 40px tile already makes the row 52px
 * tall without help. `gap-3` is 12px, one step up from the bare row's 10px: a plate needs
 * more air beside it than a mark does.
 */
export const POPOVER_ROW_WITH_TILE = `flex items-center gap-3 px-2 py-1.5 ${POPOVER_ROW_BASE}`

/**
 * A GLYPH'S COLOUR, and in this menu the colour is what says which family a row is in
 * — see `SiteNavTone` in `lib/siteNav.ts`, which is where the three are decided and why.
 *
 * EXPORTED, like the rest of the `POPOVER_*` family and for its reason: `MobileMenu` in
 * `SiteHeader.tsx` draws these same rows below `md`, and a second copy of a three-row
 * colour table is how the two surfaces come to disagree about what green means.
 *
 * The row's own type stays `muted` in every case: the glyph carries the family, the
 * label carries the row, and colouring both would make a menu of seven coloured
 * sentences. Only the glyph is tinted, and it keeps its tint on hover — the row's ground
 * is what answers the cursor.
 */
export const POPOVER_ICON_TONES: Record<SiteNavTone, string> = {
  accent: 'text-accent',
  purple: 'text-purple',
  green: 'text-green',
}

/**
 * The rule BETWEEN two groups of rows.
 *
 * `bg-hairline` and not a `border`: it is the same token the panel's own edge uses, and
 * as a 1px filled box it cannot pick up the row padding a bordered element would need
 * negative margins to escape. `-mx-2` pulls it out to the panel's inner edges — `p-2` on
 * the panel is what it is cancelling — so the line spans the panel rather than floating
 * inside the rows' own inset, which is what makes it read as a division and not as an
 * underline belonging to the row above it.
 *
 * EXPORTED for `MobileMenu`, which draws the same divisions in a panel that is not a
 * menu — so it renders this line `aria-hidden` instead. The line itself is one line.
 *
 * `role="separator"` because the panel is a `role="menu"`: a bare `<div>` in a menu is a
 * child with no role, which is invalid, and `separator` is what a menu's own divider is
 * called. It is announced as a group boundary rather than skipped, which is exactly what
 * it is.
 */
export const POPOVER_RULE = '-mx-2 my-2 h-px bg-hairline'

/**
 * Closes a popover on a click outside it or on Escape, and hands focus back to the
 * trigger — while it is OPEN and not otherwise, so a closed menu costs no listeners.
 *
 * The refocus is not a nicety: Escape leaves the keyboard on an element that is now
 * `hidden`, and the next Tab starts from the top of the document. `root` is expected to
 * contain the trigger as its first `<button>`, which is true of both callers.
 *
 * It takes the SETTER rather than a `close` callback so the effect's dependencies are
 * stable: React guarantees `setState` is referentially constant, where an inline
 * `() => setOpen(false)` would be a new function every render and tear the two document
 * listeners down and back up on each one.
 */
export function useDismiss(
  open: boolean,
  setOpen: (open: boolean) => void,
  root: React.RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (root.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      root.current?.querySelector('button')?.focus()
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen, root])
}

/** One row of a dropdown, with its label already resolved by the caller. */
export type NavDropdownItem = {
  href: string
  label: string
  /**
   * Resolved to a COMPONENT by the caller, not named here. `lib/siteNav.ts` carries
   * icon names — it may not import lucide, for the reason stated on it — and
   * `SiteHeader.tsx` holds the map. This component only draws what it is handed.
   */
  icon?: LucideIcon
  tone?: SiteNavTone
  /** Draws the glyph on a white plate instead of bare — see `POPOVER_TILE`. */
  tile?: boolean
  /** A pill beside the label, already translated: the page is announced, not written. */
  soon?: string
}

/** The "coming soon" pill: `Badge`'s accent tone at the size a menu row can carry. */
export const SOON_PILL =
  'ml-auto shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent'

export function NavDropdown({
  label,
  groups,
}: {
  label: string
  /**
   * The rows, in menu order, DIVIDED INTO FAMILIES — a rule is drawn between one group
   * and the next, and nothing is drawn above the first or below the last.
   *
   * A nested array rather than a `divider` flag on a row: the reasoning is on
   * `PRODUCT_MENU_GROUPS` in `lib/siteNav.ts`, and the half that belongs here is that
   * this component cannot draw a stray rule at the top of a panel or two rules with
   * nothing between them — there is no arrangement of groups that expresses either.
   *
   * Every destination is on this site — see the note in `SiteHeader`.
   */
  groups: NavDropdownItem[][]
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useDismiss(open, setOpen, root)

  return (
    <div ref={root} className="relative">
      {/* THE PILL. The hover is `NAV_ITEM`'s own now (every control in the bar takes it);
          what is added here is the OPEN state — the same fill without a cursor, because a
          panel hanging off a control that looks untouched is a panel with no owner.
          `gap-1.5` sets the chevron off the label at the weight the label now has. */}
      <button
        type="button"
        className={`flex items-center gap-1.5 ${NAV_ITEM} ${
          open ? `${NAV_ITEM_GROUND} text-ink` : ''
        }`}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
      >
        <span>{label}</span>
        {/* QUIETER THAN THE LABEL, which is the reference's own reading and the fix for a
            chevron that inherited semibold ink: the glyph is a hint about the control,
            not part of its name. It does not take the label's hover — a mark at 40% that
            darkens on hover draws the eye to the arrow rather than to the word. */}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {/* `w-56` was right for six bare labels. Six rows with a glyph each needed 16rem,
          and three of them on a 40px plate need 18: 288px carries a 40px tile, 12px of gap
          and the 185px of "Toutes les fonctionnalités" with air to spare, where `w-64`
          wrapped it. The panel is anchored to the bar's content box and only exists at
          `md` and up, so nothing here is bounded by a phone's viewport — which is exactly
          what `MobileMenu` IS bounded by, and why its rows go untiled at `w-64`. */}
      <div id={panelId} role="menu" hidden={!open} className={`${POPOVER_PANEL} left-0 w-72`}>
        {groups.map((group, index) => (
          // A FRAGMENT KEYED BY THE FIRST ROW'S PATH, not by the index: paths are unique
          // across the whole menu (`siteNav.test.ts` asserts it), so a group that moves
          // keeps its identity where an index would hand it a sibling's.
          <Fragment key={group[0]?.href ?? index}>
            {/* Between groups, never above the first. */}
            {index > 0 && <div role="separator" className={POPOVER_RULE} />}

            {group.map((item) => {
              // Assigned to a capitalised local because JSX reads a lower-case tag as an
              // HTML element — the same shape `buttonContent` in `components/ui.tsx` uses.
              const Glyph = item.icon

              // THREE SHAPES, and which one a row takes is the row's business: a tiled
              // glyph, a bare glyph, or no glyph at all. The last is not hypothetical —
              // `LanguageMenu` aside, any future menu handing this component plain rows
              // gets the recipe the panel started with.
              const shape = !Glyph
                ? POPOVER_ROW
                : item.tile
                  ? POPOVER_ROW_WITH_TILE
                  : POPOVER_ROW_WITH_ICON

              // `aria-hidden` on every glyph: the label beside it already names the row,
              // so the mark is a second reading of the same thing, not another one.
              // `shrink-0` on both shapes, so a label that wraps cannot squeeze it.
              const tone = item.tone ? POPOVER_ICON_TONES[item.tone] : ''

              return (
                <Link
                  key={item.href}
                  role="menuitem"
                  href={item.href}
                  className={`${shape} ${POPOVER_ROW_NAV}`}
                  onClick={() => setOpen(false)}
                >
                  {Glyph && item.tile && (
                    <span className={POPOVER_TILE} aria-hidden>
                      {/* 18px in a 40px plate — the reference's ratio, and half a step up
                          from the 16px a bare row uses: a mark inside a frame has to hold
                          its own against the frame's edge. */}
                      <Glyph className={`h-[18px] w-[18px] ${tone}`} />
                    </span>
                  )}
                  {Glyph && !item.tile && (
                    <Glyph className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                  )}
                  {item.label}
                  {item.soon && <span className={SOON_PILL}>{item.soon}</span>}
                </Link>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
