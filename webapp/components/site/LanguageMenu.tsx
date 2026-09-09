'use client'

import { useId, useRef, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { LANGUAGE_AUTONYM, LANGUAGE_IDS, type LanguageId } from '@/lib/i18n/languages'
import { setLanguage, useLanguage, useT } from '@/lib/i18n/useLanguage'
import {
  NAV_ITEM,
  NAV_ITEM_GROUND,
  POPOVER_PANEL,
  POPOVER_ROW,
  POPOVER_ROW_NAV,
  useDismiss,
} from './NavDropdown'

/**
 * The site's language picker, in its two dresses.
 *
 * The header shows the code (`EN`) because it sits in a crowded bar; the footer shows
 * the autonym (`English`) because it has the room and is where someone goes LOOKING for
 * the control. Same behaviour, same state, two sets of classes — which is why this is
 * one component with a `variant` rather than two files that would drift.
 *
 * IN TAILWIND now, where the two dresses used to be four `marketing.css` class prefixes
 * (`header-lang-*` / `footer-lang-*`). The stylesheet is gone from these routes, so the
 * dresses are two entries in the map below and the behaviour above them is untouched.
 * The footer sits on a dark plate, which is the whole reason the variants differ at all:
 * `muted` on `#0a0a0a` is unreadable, so down there the dress comes from the `onink`
 * ladder in `tailwind.config.ts` instead — `body` for the label and a resting option,
 * `rule` for the filet, `tint` for a hover and `selected` for the chosen language. It
 * shares that ladder with `SiteFooter`, which is the plate it stands on; before the
 * tokens existed both files spelled the same `white/{60,10,5}` alphas out by hand.
 *
 * It writes through `setLanguage()` from the app's own i18n store, so choosing French on
 * the landing page carries into the signed-in app and vice versa. The old static site
 * kept its own `magic-slash-lang` key; that key is NOT read here, so a visitor who chose
 * French on the static site starts from their browser language once — the same fallback a
 * first-time visitor gets — rather than the two stores disagreeing forever.
 *
 * THE ARIA CONTRACT is load-bearing: `aria-haspopup="menu"`, `aria-expanded` and
 * `aria-controls` on the trigger, `role="menu"` on the panel, and each option a
 * `menuitemradio` carrying `aria-checked`. Radio and not `menuitem` because these are
 * not two actions, they are one setting with two values, and the current one has to be
 * announced as chosen rather than merely styled that way. The trigger also carries an
 * `aria-label`, for the reason spelled out beside it: its visible text is the setting's
 * VALUE in both dresses, so nothing in it named the setting.
 *
 * WHAT IT BORROWS FROM `NavDropdown`. It cannot BE one — that is a list of links and
 * this is a radio group over a setting — but everything under the markup is the same
 * header popover, so the dismiss behaviour, the header's panel dress and, since the
 * bar took a picker back, the header TRIGGER's dress come from there rather than being
 * kept in step by hand. See the note in that file.
 */

/**
 * The two dresses, as what DIFFERS between them. `panel` differs in more than colour:
 * the header's opens DOWNWARD from a bar at the top of the viewport, the footer's opens
 * UPWARD from a strip at the bottom, and either one flipped would open off-screen —
 * which is why only the header's builds on the shared panel.
 */
const OPTION = `${POPOVER_ROW} w-full text-left`

const DRESS = {
  header: {
    // THE BAR'S OWN RECIPE, not a dress of its own — `NAV_ITEM`, which every control up
    // there wears, chip on hover included. It used to be `text-xs font-medium text-muted`
    // on a tighter pill, which was right for the bar this dress was written for: a 52px
    // floating pill whose nav was grey and medium too. That bar is gone (see
    // `SiteHeader`), its controls are semibold ink at `text-sm`, and a small grey chip
    // beside them read as a leftover rather than as one control among five.
    toggle: `flex items-center gap-1.5 ${NAV_ITEM}`,
    // While the panel is open, the same fill without a cursor — a panel hanging off a
    // control that looks untouched is a panel with no owner. The footer's trigger has a
    // border of its own and needs none.
    toggleOpen: `${NAV_ITEM_GROUND} text-ink`,
    // Quieter than the label, and the size the bar's other chevrons take: the glyph is a
    // hint about the control, not part of its name.
    chevron: 'h-4 w-4 text-ink/40',
    panel: `${POPOVER_PANEL} right-0 w-36`,
    // THE ROWS ARE THE NAV MENUS' ROWS — semibold display ink, the same dress the
    // Product and Help panels put on a destination. `POPOVER_ROW_REST` is what these
    // wore, and it is the QUIET recipe written for a panel of options: `text-muted` at
    // the body weight. Two panels hanging off the same bar, one of them noticeably
    // lighter than the other, read as one menu and one disabled menu — and the
    // distinction it was drawing (options are not destinations) is not worth a bar that
    // looks inconsistent. The footer's own dress is untouched: it sits on a dark plate
    // and shares the `onink` ladder with the footer around it.
    optionRest: POPOVER_ROW_NAV,
    // The CHOSEN row, at the same weight: only the colour and the tint say it is
    // selected. A full dress rather than a class appended to the one above, because two
    // text colours in one string resolve by which utility Tailwind emitted last, not by
    // their order — the rule stated on `POPOVER_ROW_NAV` itself.
    optionActive: 'bg-accent/[0.06] font-display font-semibold text-accent',
  },
  footer: {
    toggle:
      'flex items-center gap-1.5 rounded-full border border-onink-rule px-3 py-1.5 font-display text-xs font-medium text-onink-body transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
    toggleOpen: '',
    chevron: 'h-3.5 w-3.5',
    panel:
      'absolute bottom-full right-0 z-10 mb-2 w-36 rounded-2xl border border-onink-rule bg-ink p-2',
    optionRest: 'text-onink-body hover:bg-onink-tint hover:text-white',
    optionActive: 'bg-onink-selected font-medium text-white',
  },
} as const

export function LanguageMenu({ variant }: { variant: 'header' | 'footer' }) {
  const { t } = useT()
  const lang = useLanguage()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // Click anywhere else, or Escape, closes it — the same effect the nav dropdown runs,
  // from the same hook, so the three popovers in the bar cannot drift again.
  useDismiss(open, setOpen, root)

  const dress = DRESS[variant]
  const label = variant === 'header' ? lang.toUpperCase() : LANGUAGE_AUTONYM[lang]

  const choose = (next: LanguageId) => {
    setLanguage(next)
    setOpen(false)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className={`${dress.toggle} ${open ? dress.toggleOpen : ''}`}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        // NAMES THE CONTROL, because neither visible label does: the header shows `EN`
        // and the footer shows `English`, which is the VALUE, and the glyph beside it is
        // `aria-hidden`. So a screen reader announced "EN, menu button" — the setting's
        // current value, with nothing saying what setting it is. The value is still
        // announced, by the `aria-checked` option inside the panel, which is where a
        // radio group is supposed to carry it.
        aria-label={t('site.nav.language')}
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
        <span>{label}</span>
        <ChevronDown
          className={`${dress.chevron} shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {/* `hidden` rather than a conditional render, so the panel is out of the tab order
          and out of the accessibility tree while it is closed without the menu having to
          be rebuilt on every open — and so `aria-controls` above points at something
          that exists before it is opened. */}
      <div id={panelId} className={dress.panel} role="menu" hidden={!open}>
        {LANGUAGE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={id === lang}
            className={`${OPTION} ${id === lang ? dress.optionActive : dress.optionRest}`}
            onClick={() => choose(id)}
          >
            {LANGUAGE_AUTONYM[id]}
          </button>
        ))}
      </div>
    </div>
  )
}
