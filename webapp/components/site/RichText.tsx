'use client'

import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'

/**
 * A translated string that carries inline markup — `<br>` in a headline, `<strong>`
 * around a command name, `<code>` around a path.
 *
 * The alternative is splitting every such sentence into three keys and reassembling
 * them in JSX, which puts the word order in the COMPONENT instead of the catalogue.
 * That works in English and breaks the moment a language wants the emphasis
 * somewhere else, so the markup stays in the string where a translator can move it.
 *
 * `dangerouslySetInnerHTML` is safe here for a narrow, checkable reason: the only
 * possible input is `lib/i18n/marketing/*.ts`, which is checked into this repo and
 * never interpolates anything from a user, a URL, or the network. `i18n.test.ts`
 * pins that down from the other side — it fails on any tag outside `<br>`,
 * `<strong>` and `<code>`, so widening this surface is a deliberate act rather than
 * a copy-paste. Do NOT pass a key whose value came from anywhere else.
 */
export function RichText({
  k,
  as: Tag = 'span',
  className,
}: {
  k: MessageKey
  /** The element to render. `span` by default; pass `h1`, `p`, … to keep the outline honest. */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div' | 'li'
  className?: string
}) {
  const { t } = useT()
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: t(k) }} />
}
