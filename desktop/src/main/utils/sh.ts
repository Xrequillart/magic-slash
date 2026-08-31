/**
 * Turning a value into one shell WORD.
 *
 * Every use of this module is a place where a string that came from somewhere else —
 * a person typing a prompt, a ticket id another org member wrote, a path — ends up
 * inside a command line handed to `sh -c`. There are two ways to get that wrong and
 * only one way to get it right.
 *
 * WHY NOT `JSON.stringify`. It is the wrong tool and it looks like the right one,
 * which is what made this a vulnerability rather than a bug. `JSON.stringify` escapes
 * what JSON cares about — the quote and the backslash — and produces a DOUBLE-quoted
 * string. Inside double quotes a POSIX shell still expands `$(…)`, backticks and
 * `${…}`, none of which JSON escapes, because none of them mean anything in JSON. So
 * `JSON.stringify('$(id)')` is `"$(id)"`, and the shell runs `id`.
 *
 * WHY SINGLE QUOTES. They are the only quoting in POSIX sh with no exceptions at all:
 * every byte between them is literal, including `$`, backticks and backslashes. The
 * one thing that cannot appear inside is the single quote itself, so each one is
 * closed, escaped outside the quotes, and reopened — `it's` becomes `'it'\''s'`. That
 * is the whole trick, and it is why this function is four lines and needs no options.
 */

/**
 * `value` as a single shell word, safe to interpolate into a command string.
 *
 * The result is ALWAYS quoted, even for a value that needs nothing — an unquoted fast
 * path would be a second code path whose correctness depends on a character class
 * staying in step with every shell the app might spawn, and the quotes cost nothing.
 *
 * The empty string round-trips as `''`, which is a real empty argument rather than no
 * argument at all. That distinction matters at a call site passing a value that may
 * legitimately be empty: unquoted, the word would vanish and shift every argument
 * after it one place to the left.
 */
export function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
