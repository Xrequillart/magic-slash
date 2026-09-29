/**
 * THE SETTINGS SEARCH'S MATCHER, on its own so the root suite can test it: the catalogue
 * it reads (`settingsCatalogue`) imports option tables from the pages, and a page pulls
 * React, which that suite cannot resolve.
 */

/** A catalogue entry once translated — what the matcher reads. */
export interface SettingsSearchItem {
  key: string
  label: string
  help: string
  page: string
  /** What the setting can be set to, translated. See `SettingsSearchEntry.options`. */
  options: readonly string[]
}

/** A match, and the choice it was found by when it was found by one. */
export type SettingsSearchHit<T extends SettingsSearchItem> = T & { option?: string }

/**
 * Case and ACCENTS folded, so « reglage » finds « Réglage » and « theme » finds « Thème »:
 * the French catalogue is full of them and nobody types them into a search box.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/**
 * The items `query` finds, best first.
 *
 * EVERY WORD MUST APPEAR, anywhere in the name, the page's name, one of the choices or the
 * help line — so « notif agent » narrows to the agent notifications rather than widening
 * to everything that mentions either. Then ranked by WHERE the words were found: a name
 * that starts with the query, a name holding every word, the page, a choice, then the
 * help line. Ties keep the catalogue's order, which is the rail's.
 *
 * A MATCH FOUND BY A CHOICE SAYS WHICH (`option`): « Dracula » landing on a row called
 * Theme would otherwise read as the search misfiring.
 */
export function searchSettings<T extends SettingsSearchItem>(items: readonly T[], query: string): SettingsSearchHit<T>[] {
  const folded = foldForSearch(query.trim())
  const words = folded.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const holdsAll = (text: string) => words.every((word) => text.includes(word))

  const ranked: { hit: SettingsSearchHit<T>; rank: number; at: number }[] = []
  items.forEach((item, at) => {
    const label = foldForSearch(item.label)
    const named = `${label} ${foldForSearch(item.page)}`
    const help = foldForSearch(item.help)

    let rank: number
    let option: string | undefined
    if (label.startsWith(folded)) rank = 0
    else if (holdsAll(label)) rank = 1
    else if (holdsAll(named)) rank = 2
    else if ((option = item.options.find((one) => holdsAll(`${named} ${foldForSearch(one)}`))) !== undefined) rank = 3
    else if (holdsAll(`${named} ${help}`)) rank = 4
    else return

    ranked.push({ hit: option === undefined ? item : { ...item, option }, rank, at })
  })

  return ranked.sort((a, b) => a.rank - b.rank || a.at - b.at).map(({ hit }) => hit)
}
