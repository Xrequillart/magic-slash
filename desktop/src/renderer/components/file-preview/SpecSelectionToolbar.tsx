import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { FormatToolbar, type FormatToolbarItem } from '@ds/desktop'
import { Bold, Code, Italic, Link, MessageSquarePlus, Strikethrough, Underline } from '@ds/desktop/icons'
import { useT } from '../../i18n'
import { useEditableLines } from './CommentLines'

/**
 * THE CARD OVER A SELECTION IN THE SPEC: the marks and a link — and the way
 * to comment on the passage, which is the ONLY way to comment on a passage now. Selecting
 * words used to open a comment straight away; it offers this instead, and "Comment" is one
 * of the things on it.
 *
 * WHERE IT IS. Above the selection, centred on it, below it when the selection is too close
 * to the top of the window for the card to fit. Fixed, and portalled to the body: the page
 * scrolls under it and a panel's own `overflow` would otherwise clip it.
 *
 * WHEN IT IS. While words are selected inside the spec and the pointer is up — a drag still
 * in progress is not a selection yet, and a card chasing the pointer across the page is
 * noise. Gone when the selection collapses or leaves the spec.
 *
 * WHAT IT CAN DO depends on what is selected. Inside ONE block, everything: formatting a
 * block the reader was only reading opens it for writing first, with the selection kept. A
 * selection across blocks offers only the comment — a mark that starts in one paragraph and
 * ends in another is two edits to two blocks, which this editor does not make.
 *
 * The marks go through the browser's own editing commands, so Cmd+Z undoes them like
 * typing, and `RichTextBlock`'s input event carries the result back to the page like any
 * other keystroke.
 */
export function SpecSelectionToolbar({
  rootRef,
  onComment,
}: {
  rootRef: RefObject<HTMLElement>
  /** Comment on the selected passage. Absent where comments cannot be written. */
  onComment?: () => void
}) {
  const t = useT()
  const edit = useEditableLines()
  const [at, setAt] = useState<{ top: number; left: number; below: boolean; key: string | null } | null>(null)
  const [link, setLink] = useState<{ value: string; range: Range; key: string } | null>(null)
  /**
   * The link field is open. Read by `update`, which must leave the card where it is while
   * it is: typing an address moves the focus into the field, the selection in the text
   * reads as collapsed from there, and a card placed off a collapsed selection was a card
   * sent to (0, 0) — off screen, with the field in it still holding the focus.
   */
  const linkRef = useRef(link)
  linkRef.current = link
  const pointerDown = useRef(false)
  // Bumped after a command, so the active states are read again off the new DOM.
  const [, setTick] = useState(0)

  const update = useCallback(() => {
    if (linkRef.current) return
    const root = rootRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed || pointerDown.current) {
      setAt(null)
      return
    }
    const range = selection.getRangeAt(0)
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      setAt(null)
      return
    }
    const hostOf = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest('[data-rich-block]')
    const start = hostOf(range.startContainer)
    const key = start && start === hostOf(range.endContainer) ? start.getAttribute('data-rich-block') : null
    const rect = range.getBoundingClientRect()
    const below = rect.top < 64
    setAt({
      top: below ? rect.bottom + 8 : rect.top - 8,
      left: Math.min(Math.max(rect.left + rect.width / 2, 200), window.innerWidth - 200),
      below,
      key: key || null,
    })
  }, [rootRef])

  useEffect(() => {
    const onSelection = () => { if (!link) update() }
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-format-toolbar]')) return
      pointerDown.current = true
      setAt(null)
      // A press elsewhere while the link field is open is a change of mind.
      if (link) {
        edit?.hold(false)
        setLink(null)
      }
    }
    const onUp = () => {
      pointerDown.current = false
      requestAnimationFrame(update)
    }
    document.addEventListener('selectionchange', onSelection)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    window.addEventListener('scroll', onSelection, true)
    window.addEventListener('resize', onSelection)
    return () => {
      document.removeEventListener('selectionchange', onSelection)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('scroll', onSelection, true)
      window.removeEventListener('resize', onSelection)
    }
  }, [update, link, edit])

  const hostFor = (key: string) => document.querySelector<HTMLElement>(`[data-rich-block="${CSS.escape(key)}"]`)

  /**
   * The block under the selection, open for writing with the selection still on it. A block
   * the reader was only reading turns editable first — the DOM stays the same nodes, so the
   * range survives — and gets the focus the editing commands need.
   */
  const writable = (key: string, range?: Range): HTMLElement | null => {
    const line = edit?.lines.get(key)
    if (!edit || !line) return null
    const kept = range ?? window.getSelection()?.getRangeAt(0).cloneRange()
    if (edit.editing !== key) flushSync(() => edit.onStart(line, 'keep'))
    const host = hostFor(key)
    if (!host) return null
    host.focus({ preventScroll: true })
    if (kept) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(kept)
    }
    return host
  }

  const run = (key: string, command: string) => {
    if (!writable(key)) return
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(command)
    setTick((n) => n + 1)
  }

  const closestIn = (selector: string): Element | null => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const node = selection.getRangeAt(0).commonAncestorContainer
    return (node instanceof Element ? node : node.parentElement)?.closest(`[data-rich-block] ${selector}`) ?? null
  }

  const toggleCode = (key: string) => {
    const host = writable(key)
    if (!host) return
    const code = closestIn('code')
    if (code) {
      code.replaceWith(document.createTextNode(code.textContent ?? ''))
      edit?.onInput(host)
    } else {
      const text = window.getSelection()?.toString() ?? ''
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      document.execCommand('insertHTML', false, `<code>${escaped}</code>`)
    }
    setTick((n) => n + 1)
  }

  const startLink = (key: string) => {
    if (closestIn('a')) {
      run(key, 'unlink')
      return
    }
    const range = window.getSelection()?.getRangeAt(0).cloneRange()
    if (!range || !writable(key, range)) return
    edit?.hold(true)
    setLink({ value: '', range, key })
  }

  const finishLink = (url: string | null) => {
    const current = link
    setLink(null)
    if (!current || !edit) return
    const host = writable(current.key, current.range)
    edit.hold(false)
    if (host && url?.trim()) {
      const href = /^[a-z][a-z0-9+.-]*:|^#|^\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
      document.execCommand('createLink', false, href)
    }
    requestAnimationFrame(update)
  }

  if (!at && !link) return null
  const key = link?.key ?? at?.key ?? null
  const line = key ? edit?.lines.get(key) : undefined
  const formattable = !!edit && !!line

  const code = line?.tag === 'pre'

  const mark = (command: string, icon: FormatToolbarItem['icon'], label: string): FormatToolbarItem => ({
    key: command, icon, label, active: document.queryCommandState(command),
    onSelect: () => { if (key) run(key, command) },
  })

  const groups: FormatToolbarItem[][] = formattable && !code
    ? [
      [
        mark('bold', Bold, t('plans.format.bold')),
        mark('italic', Italic, t('plans.format.italic')),
        mark('underline', Underline, t('plans.format.underline')),
        mark('strikeThrough', Strikethrough, t('plans.format.strike')),
        {
          key: 'code', icon: Code, label: t('plans.format.code'), active: !!closestIn('code'),
          onSelect: () => { if (key) toggleCode(key) },
        },
        {
          key: 'link', icon: Link, label: t('plans.format.link'), active: !!closestIn('a'),
          onSelect: () => { if (key) startLink(key) },
        },
      ],
    ]
    : []

  if (groups.length === 0 && !onComment) return null
  const position = link ? { top: at?.top ?? 0, left: at?.left ?? 0, below: at?.below ?? false } : at!

  return createPortal(
    <div
      className="fixed z-[80]"
      style={{
        top: position.top,
        left: position.left,
        transform: `translate(-50%, ${position.below ? '0' : '-100%'})`,
      }}
    >
      <FormatToolbar
        groups={groups}
        action={onComment ? { icon: MessageSquarePlus, label: t('plans.format.comment'), onSelect: () => { setAt(null); onComment() } } : undefined}
        link={link ? {
          value: link.value,
          placeholder: t('plans.format.linkPlaceholder'),
          submitLabel: t('plans.format.linkApply'),
          onChange: (value) => setLink((prev) => (prev ? { ...prev, value } : prev)),
          onSubmit: () => finishLink(link.value),
          onCancel: () => finishLink(null),
        } : undefined}
      />
    </div>,
    document.body,
  )
}
