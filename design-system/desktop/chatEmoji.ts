/**
 * THE `:+1` THAT ENTER WOULD HAVE TURNED INTO 👍 IN THE TERMINAL.
 *
 * Claude Code's prompt opens an emoji list as soon as the text before the caret ends on
 * a colon and two shortcode characters (`:+1`, `:ta`), and Enter then takes the list's
 * first row instead of sending. The chat types its message into that prompt and follows
 * it with the Enter that sends: with such an ending, that Enter only picked the emoji,
 * the prompt kept "👍 " and the chat, which had already emptied its box, showed nothing.
 *
 * So the chat does what the terminal would have done, before typing anything: it shows the
 * same list over its composer (`ChatEmojiMenu`), Enter or Tab takes the highlighted row,
 * and the next Enter sends. Even with the list closed by Escape, Enter swaps the shortcode
 * for the first row: the text that reaches the prompt never ends on a shortcode.
 *
 * Mirrors Claude Code 2.1: the same pattern, the same ranking (names that start with
 * what was typed, then the shortest), and the same space after the emoji.
 */

import { EMOJI_SHORTCODES } from './chatEmojiTable'

/** What opens the list in Claude Code's prompt, read on the text before the caret. */
const TRAILING_SHORTCODE = /(^|\s):([a-z0-9_+-]{2,})$/

const NAMES = Object.keys(EMOJI_SHORTCODES)

/** One row of the `:` list: the emoji and the name it is found by. */
export interface EmojiMatch {
  name: string
  emoji: string
}

/** How many rows the `:` list shows, as Claude Code's does. */
const LIST_LENGTH = 8

/**
 * The emoji Claude Code's list would offer for what was typed after the colon, in its
 * order: names that start with it, then the shortest. An emoji with several matching
 * names shows once, under its best one.
 */
export function matchEmoji(query: string, limit = LIST_LENGTH): EmojiMatch[] {
  const ranked: { name: string; rank: number }[] = []
  for (const name of NAMES) {
    if (!name.includes(query)) continue
    ranked.push({ name, rank: (name.startsWith(query) ? 0 : 1_000) + name.length })
  }
  ranked.sort((a, b) => a.rank - b.rank)
  const seen = new Set<string>()
  const out: EmojiMatch[] = []
  for (const { name } of ranked) {
    const emoji = EMOJI_SHORTCODES[name]
    if (seen.has(emoji)) continue
    seen.add(emoji)
    out.push({ name, emoji })
    if (out.length === limit) break
  }
  return out
}

/**
 * THE `:` BEING TYPED: a colon that opens the prompt or follows a space or a line break,
 * then two shortcode characters or more, right before the caret, as Claude Code reads it.
 * `start` is the colon, `end` the end of the word (it may run past the caret), `query`
 * what was typed between the colon and the caret. Null otherwise: `10:30` is a time.
 */
export interface EmojiToken {
  start: number
  end: number
  query: string
}

export function emojiTokenAt(text: string, caret: number): EmojiToken | null {
  const match = TRAILING_SHORTCODE.exec(text.slice(0, caret))
  if (!match) return null
  const start = match.index + match[1].length
  let end = caret
  while (end < text.length && !/\s/.test(text[end])) end++
  return { start, end, query: match[2] }
}

/**
 * The text with its trailing shortcode swapped for the emoji, as Enter in the terminal
 * would have left it. Null when the text does not end on one Claude Code would complete:
 * then Enter sends.
 */
export function completeTrailingShortcode(text: string): string | null {
  const token = emojiTokenAt(text, text.length)
  const first = token && matchEmoji(token.query, 1)[0]
  if (!token || !first) return null
  return `${text.slice(0, token.start)}${first.emoji} `
}
