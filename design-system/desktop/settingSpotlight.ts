/**
 * WHERE THE SETTINGS SEARCH LANDS, and the blue ring it draws there.
 *
 * A result picked in `SettingsRail` opens its page; this finds, on that page, the setting
 * the result named and rings it, so the reader's eye goes straight to the switch instead
 * of scanning a page for a word it just read.
 *
 * FOUND BY ITS NAME, not by an id every page would have to thread through. The name is
 * already on screen, it is what the result showed, and the rows that draw it mark their
 * own box — `data-setting-row` on `SettingRow` and on each `FieldTable` row,
 * `data-section-header` on `SectionHeader` — so the ring goes round the whole row rather
 * than round a word. A heading rings the block it opens: the element right after it, the
 * card or the grid. Not its parent, which pages nest the next section inside as often as
 * not.
 *
 * A RESULT FOUND BY A CHOICE lands on that choice when the choice is on screen as a thing
 * of its own — a theme tile, marked `data-setting-choice`. A select's choices are not: only
 * the current one is drawn, so those land on the row.
 *
 * HERE AND NOT IN THE APP because the markers are this folder's: the app would otherwise
 * be reaching into the DOM of components it only knows as props.
 */

/**
 * The ring, as literals so Tailwind emits them — see the README's second rule. Blue and
 * not the accent: the accent is the theme's and can be any colour, where this is a
 * pointer and has to read as one on every theme.
 */
const RING = ['outline', 'outline-2', 'outline-blue', 'outline-offset-4'] as const

/** Every element inside `root` whose own text is exactly `text`. */
function* carrying(root: HTMLElement, text: string): Generator<HTMLElement> {
  const wanted = text.trim()
  if (!wanted) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.trim() === wanted && node.parentElement) yield node.parentElement
  }
}

/**
 * The box to ring for the setting named `label` inside `root` — or for its choice `option`,
 * when that choice is drawn as a box of its own — or null while it is not there.
 */
export function findSettingTarget(root: HTMLElement, label: string, option?: string): HTMLElement | null {
  if (option) {
    for (const at of carrying(root, option)) {
      const choice = at.closest<HTMLElement>('[data-setting-choice]')
      if (choice && root.contains(choice)) return choice
    }
  }

  for (const at of carrying(root, label)) {
    const row = at.closest<HTMLElement>('[data-setting-row]')
    if (row && root.contains(row)) return row

    const header = at.closest<HTMLElement>('[data-section-header]')
    if (header && root.contains(header)) {
      const block = header.nextElementSibling
      return block instanceof HTMLElement ? block : header
    }

    return at
  }
  return null
}

/**
 * Rings `target` and scrolls it to the middle of its scroller. Returns the undo.
 *
 * A RADIUS ONLY WHEN IT HAS NONE: an outline follows the box's corners, and a square ring
 * round a row inside a rounded card reads as a selection rectangle rather than a mark.
 * A box that already has corners keeps its own.
 */
export function spotlightSetting(target: HTMLElement): () => void {
  target.classList.add(...RING)
  const squared = getComputedStyle(target).borderTopLeftRadius === '0px'
  const radius = target.style.borderRadius
  if (squared) target.style.borderRadius = '8px'

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })

  return () => {
    target.classList.remove(...RING)
    if (squared) target.style.borderRadius = radius
  }
}
