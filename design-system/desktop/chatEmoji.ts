/**
 * THE `:+1` THAT ENTER WOULD HAVE TURNED INTO 👍 IN THE TERMINAL.
 *
 * Claude Code's prompt opens an emoji list as soon as the text before the caret ends on
 * a colon and two shortcode characters (`:+1`, `:ta`), and Enter then takes the list's
 * first row instead of sending. The chat types its message into that prompt and follows
 * it with the Enter that sends: with such an ending, that Enter only picked the emoji,
 * the prompt kept "👍 " and the chat, which had already emptied its box, showed nothing.
 *
 * So the chat does what the terminal would have done, before typing anything: the Enter
 * swaps the shortcode for its emoji in the chat's own box, and the next one sends. The
 * text that reaches the prompt then never ends on a shortcode.
 *
 * Mirrors Claude Code 2.1: the same pattern, the same ranking (names that start with
 * what was typed, then the shortest), and the same space after the emoji.
 */

import { EMOJI_SHORTCODES } from './chatEmojiTable'

/** What opens the list in Claude Code's prompt, read on the text before the caret. */
const TRAILING_SHORTCODE = /(^|\s):([a-z0-9_+-]{2,})$/

const NAMES = Object.keys(EMOJI_SHORTCODES)

/** The emoji Claude Code's list would put first for what was typed after the colon. */
function firstEmoji(query: string): string | undefined {
  let best: string | undefined
  let bestRank = Infinity
  for (const name of NAMES) {
    if (!name.includes(query)) continue
    const rank = (name.startsWith(query) ? 0 : 1_000) + name.length
    if (rank < bestRank) {
      best = name
      bestRank = rank
    }
  }
  return best === undefined ? undefined : EMOJI_SHORTCODES[best]
}

/**
 * The text with its trailing shortcode swapped for the emoji, as Enter in the terminal
 * would have left it. Null when the text does not end on one Claude Code would complete:
 * then Enter sends.
 */
export function completeTrailingShortcode(text: string): string | null {
  const match = TRAILING_SHORTCODE.exec(text)
  if (!match) return null
  const emoji = firstEmoji(match[2])
  if (emoji === undefined) return null
  return `${text.slice(0, match.index + match[1].length)}${emoji} `
}
