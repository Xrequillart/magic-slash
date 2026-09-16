import { useEffect, useMemo, useRef, useState } from 'react'
import { WhatsNewDialog, type WhatsNewCategory, type WhatsNewHue } from '@ds/desktop'
import { useModalExit } from '../hooks/useModalExit'
import { useLocale, useT, type MessageKey, type Translate } from '../i18n'

/**
 * THE WIRING BEHIND `WhatsNewDialog` — when it opens, and what the release actually said.
 *
 * The drawing is `@ds/desktop/WhatsNewDialog.tsx`: the band, the version and its date,
 * the categories typeset the way the public `/changelog` typesets them, the close button
 * and the one button at the foot. What is left here is everything a design system cannot
 * do — the IPC, the Escape key, the exit animation, the translator, the reader's locale,
 * and the parser below.
 *
 * WHY THERE IS A PARSER AT ALL. The notes arrive as GitHub's rendered HTML, because that
 * is what electron-updater carries in the feed and what the releases API hands back. The
 * old dialog injected that string with `dangerouslySetInnerHTML` and dressed it with nine
 * `.whats-new-content` rules in `index.css` — a stylesheet reaching into markup nobody in
 * this repo wrote. Those rules are gone: the HTML is read into DATA here, and the dialog
 * draws its own markup from it, which is the only way the thing can be a component.
 */

/**
 * `### Added` → a green dot, and the word in the reader's language.
 *
 * THE SAME THREE THE WEBAPP'S `/changelog` DRESSES, with the same hues — `CATEGORIES` in
 * `webapp/lib/changelogPage.ts`. Both read the same `CHANGELOG.md`, so a release that
 * looked like two different documents in two places would be this table disagreeing with
 * that one.
 *
 * KEYED BY THE ENGLISH HEADING, which is what the file holds whatever the reader speaks:
 * the release notes are written once, in English, and translating the three GROUP names
 * is all this app can honestly do to them.
 */
const CATEGORIES: Record<string, { labelKey: MessageKey; hue: WhatsNewHue }> = {
  added: { labelKey: 'whatsNew.added', hue: 'green' },
  changed: { labelKey: 'whatsNew.changed', hue: 'accent' },
  fixed: { labelKey: 'whatsNew.fixed', hue: 'yellow' },
}

/** What the dialog is handed: the release, read out of its own HTML. */
interface Release {
  version: string
  releaseNotes: string
  releaseDate?: string
}

/**
 * GitHub's rendered release body → the categories the dialog draws.
 *
 * WHAT IT WALKS: the body's own children, in order. An `h2`/`h3` opens a group, a `ul`
 * under it fills that group, and an `li`'s leading `<strong>` is lifted out as the
 * entry's SCOPE — every line in `CHANGELOG.md` opens `**Desktop**: …`, and a column of
 * bold scopes is what makes a release of twenty lines scannable.
 *
 * WHERE IT STOPS is the one rule inherited from the version this replaces, and it earns
 * its place: a GitHub release ends with an "Installation" section and a "Full changelog"
 * link, which are about obtaining the release rather than about what is in it. A person
 * who is already running it has no use for either.
 *
 * ENTRIES BEFORE ANY HEADING ARE KEPT, under a group with no label and a neutral dot: a
 * release published without the three headings is a real thing, and swallowing its notes
 * because they arrived in an unexpected shape is the one outcome worse than an unstyled
 * list.
 *
 * `DOMParser` AND NOT A REGEX, as before. This is a renderer, the parser is free, and the
 * string comes from a network response — reading it as a document rather than pattern
 * matching it is also what keeps the scripts in it inert.
 */
function parseRelease(html: string, t: Translate): WhatsNewCategory[] {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const stop = /installation|full changelog/i

  const categories: WhatsNewCategory[] = []
  let current: WhatsNewCategory | null = null

  // Returns the group rather than assigning it, so the narrowing on `current` survives:
  // TypeScript cannot see through a closure that writes to a `let` in the enclosing
  // scope, and it had narrowed the variable to `never` at the push below.
  const open = (id: string, label: string, hue: WhatsNewHue): WhatsNewCategory => {
    const category: WhatsNewCategory = { id, label, hue, entries: [] }
    categories.push(category)
    return category
  }

  for (const node of Array.from(body.children)) {
    if (/^H[1-3]$/.test(node.tagName)) {
      const heading = (node.textContent || '').trim()
      if (stop.test(heading)) break
      const known = CATEGORIES[heading.toLowerCase()]
      current = open(heading, known ? t(known.labelKey) : heading, known ? known.hue : 'neutral')
      continue
    }

    if (node.tagName !== 'UL' && node.tagName !== 'OL') continue

    // A list before any heading — see the note above. The id is fixed because there can
    // only ever be one of these, and it is always first.
    if (!current) current = open('ungrouped', '', 'neutral')

    for (const item of Array.from(node.querySelectorAll(':scope > li'))) {
      // The scope is the leading `<strong>` and only the leading one: a bold word in the
      // middle of a sentence is emphasis, not a label, and lifting it would rewrite the
      // line. `firstElementChild` is what says "leading" without a second check.
      const lead = item.firstElementChild
      const scope = lead?.tagName === 'STRONG' ? (lead.textContent || '').trim() : undefined
      if (scope) lead?.remove()

      // Whatever is left, as text, with the separator the scope left behind trimmed off:
      // the source writes `**Desktop**: the list…`, and the dialog draws its own colon.
      const text = (item.textContent || '').trim().replace(/^[:—–-]\s*/, '')
      if (!text) continue

      current?.entries.push({ scope, text })
    }
  }

  // A heading with nothing under it is a group the dialog would draw as a label over
  // empty space — which happens the moment a release ends on a heading the stop rule cut
  // the body out from under.
  return categories.filter((category) => category.entries.length > 0)
}

/**
 * `2026-09-16T08:26:16Z` → `16 September 2026` (`16 septembre 2026` in French).
 *
 * BUILT FROM THE THREE NUMBERS rather than handed to `toLocaleDateString` directly, which
 * is the correctness fix `webapp/lib/changelogPage.ts` writes out at length: a UTC
 * instant printed in the reader's own zone lands a day EARLY for everyone west of
 * Greenwich. The day a release shipped is a calendar date, not an instant, so the parts
 * are what matter.
 *
 * Undefined for anything that is not a date, so the dialog draws no line at all rather
 * than "Invalid Date" under the version.
 *
 * The LOCALE is passed in rather than read here, which is `useLocale`'s own rule: a tag
 * resolved at module scope freezes at the language the app booted in.
 */
function formatReleaseDate(iso: string | undefined, locale: string): string | undefined {
  if (!iso) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return undefined

  const at = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(at.getTime())) return undefined

  return at.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function WhatsNewModal() {
  const t = useT()
  const locale = useLocale()
  const [release, setRelease] = useState<Release | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const manualOpen = useRef(false)

  // Production: read from main process file on mount
  useEffect(() => {
    if (import.meta.env.DEV) return

    window.electronAPI.updater.getPendingWhatsNew().then((pending) => {
      if (!pending) return

      window.electronAPI.updater.getVersion().then((currentVersion) => {
        if (currentVersion === pending.version) {
          setRelease(pending)
          setIsOpen(true)
        } else {
          // Stale data (version mismatch) — clean up
          window.electronAPI.updater.clearPendingWhatsNew()
        }
      })
    })
  }, [])

  // Listen for manual trigger (from Settings or debug menu)
  useEffect(() => {
    function handleShow(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.version && detail?.releaseNotes) {
        manualOpen.current = true
        setRelease(detail)
        setIsOpen(true)
      }
    }

    window.addEventListener('show:whats-new', handleShow)
    return () => window.removeEventListener('show:whats-new', handleShow)
  }, [])

  function handleClose() {
    setIsOpen(false)
    // `release` is deliberately kept: the dialog still needs its content while it
    // animates out, and dropping it here would make the modal vanish instead.
    // The next open overwrites it.
    if (!manualOpen.current && !import.meta.env.DEV) {
      window.electronAPI.updater.clearPendingWhatsNew()
    }
    manualOpen.current = false
  }

  // Escape, and it stops here: this listener sits on `document` and `PageModal`'s sits on
  // `window`, the next hop in the bubble chain — so without this, dismissing a What's New
  // opened from inside Settings would tear down the Settings overlay behind it. The same
  // rule the app's own `Modal` states, for the same reason.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  // Outlives `isOpen` by the length of the exit animation, so every way out of this
  // dialog animates rather than one of them blinking.
  const { mounted, closing, onExitAnimationEnd } = useModalExit(isOpen)

  // Parsed once per release rather than once per render: `useModalExit` re-renders this
  // component on every frame of the exit, and a DOM parse per frame for markup that
  // cannot have changed is the kind of cost nobody goes looking for.
  const categories = useMemo(
    () => (release ? parseRelease(release.releaseNotes, t) : []),
    [release, t],
  )

  if (!mounted || !release) return null

  return (
    <WhatsNewDialog
      title={t('whatsNew.title')}
      version={`v${release.version}`}
      date={formatReleaseDate(release.releaseDate, locale)}
      categories={categories}
      confirmLabel={t('whatsNew.gotIt')}
      onClose={handleClose}
      // The app's keyframes, which is the one thing the design system cannot supply: they
      // live in `index.css` and that folder cannot reach them. Ground and panel animate
      // separately, hence two classes rather than one.
      backdropClassName={closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}
      className={closing ? 'animate-modal-content-out' : 'animate-modal-content'}
      onAnimationEnd={onExitAnimationEnd}
    />
  )
}
