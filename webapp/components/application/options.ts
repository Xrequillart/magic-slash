import type { KeyedOption } from '@/lib/settings'
import type { Translate } from '@/lib/i18n'

/**
 * Turns the keyed option lists in `lib/settings` into what Dropdown renders.
 *
 * The lists carry message KEYS rather than text, because they are data shared with
 * the back-office, which renders them in a different language from the one the
 * person editing their settings picked. Whoever renders an option decides which
 * language to render it in — this is that decision, on the product side.
 */
export function translateOptions(options: KeyedOption[], t: Translate) {
  return options.map(({ value, labelKey, descriptionKey }) => ({
    value,
    label: t(labelKey),
    description: descriptionKey ? t(descriptionKey) : undefined,
  }))
}
