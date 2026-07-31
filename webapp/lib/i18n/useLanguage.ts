'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  preferredLanguage,
  type LanguageId,
} from './languages'
import { localeOf, t as translate, type MessageKey, type Translate } from '.'

/**
 * The chosen interface language, as a store every client component reads.
 *
 * A MODULE-LEVEL store rather than a context provider, deliberately: the root layout
 * is a server component, and wrapping it in a client provider would pull the whole
 * tree into the client bundle to publish one string. Nothing needs to be mounted for
 * `useT()` to work — which is what lets the login and invitation pages, which render
 * outside any app chrome, translate themselves.
 *
 * LOCAL TO THE BROWSER, and nothing else. There is no column for this: the visitor
 * choosing it on the login page has no account yet, and `user_settings.language` is
 * the DESKTOP app's language — writing this one there would make picking French on
 * the website silently re-language the desktop app on every machine.
 */

/** Resolved on first read, then cached — `null` means "not resolved yet". */
let current: LanguageId | null = null
const listeners = new Set<() => void>()

function resolve(): LanguageId {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  let stored: string | null = null
  try {
    stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    // Safari in private mode throws on localStorage access. A visitor who cannot
    // store a choice still gets their browser's language for this page load.
  }
  return preferredLanguage(stored, window.navigator.languages ?? [window.navigator.language])
}

function getSnapshot(): LanguageId {
  if (current === null) current = resolve()
  return current
}

/**
 * What the server renders with, and what React hydrates with. Always the default:
 * the server cannot know what is in this browser's localStorage, so anything else
 * would be a hydration mismatch. React re-reads the store right after hydrating and
 * re-renders if they differ — which is why `app/layout.tsx` also sets `<html lang>`
 * from an inline script, so the DOCUMENT is never briefly wrong.
 */
function getServerSnapshot(): LanguageId {
  return DEFAULT_LANGUAGE
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

/**
 * Another tab changed the language. Same browser, same preference — following it
 * keeps two open tabs from disagreeing about what language this site is in.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== LANGUAGE_STORAGE_KEY) return
    const next = preferredLanguage(event.newValue, window.navigator.languages ?? [])
    if (next === current) return
    current = next
    applyDocumentLanguage(next)
    emit()
  })
}

/**
 * Tell the user agent which language the document is in. Not decoration: `lang`
 * drives spellcheck in every input, hyphenation, `:lang()` and the voice a screen
 * reader picks.
 */
function applyDocumentLanguage(lang: LanguageId): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

/** Change the language for this browser, everywhere on the site at once. */
export function setLanguage(next: LanguageId): void {
  if (next === getSnapshot()) return
  current = next
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
  } catch {
    // Unstorable (private mode, storage full): the change still applies to this
    // page load, it just will not survive a reload.
  }
  applyDocumentLanguage(next)
  emit()
}

/** The language in use. Re-renders the caller when it changes. */
export function useLanguage(): LanguageId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * The translator, with the current language already bound, plus the language itself
 * and its locale for the callers that format a date or hand the language to a
 * non-hook helper.
 *
 * `t` is stable for a given language, so passing it to a memoised child does not
 * defeat the memo.
 */
export function useT(): { t: Translate; lang: LanguageId; locale: string } {
  const lang = useLanguage()
  const t = useCallback<Translate>(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(key, lang, vars),
    [lang],
  )
  return { t, lang, locale: localeOf(lang) }
}
