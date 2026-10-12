/**
 * A long paste in the chat's composer, folded the way Claude Code's own prompt folds it:
 * the field shows `[Pasted text #1 +42 lines]` and the text itself waits beside it, put
 * back in that token's place when the message is sent.
 *
 * A textarea holding a 300-line query is a field nobody can read or edit around, and it
 * gives no sign that the whole of it arrived. The token says both.
 *
 * Pure, and importing nothing, so the root suite can test it (see vitest.config.ts).
 */

/** Past this many characters, a paste is folded. Claude Code folds from the same size. */
const FOLD_CHARS = 800

/** Or past this many lines, however short they are. */
const FOLD_LINES = 10

export interface ChatPaste {
  /** What stands in the draft for the text, brackets included. */
  token: string
  text: string
}

/** How many lines `text` spans: a trailing newline does not open one more. */
export function lineCount(text: string): number {
  return text.replace(/\n$/, '').split('\n').length
}

/** Whether a paste is long enough to be folded behind a token. */
export function shouldFold(text: string): boolean {
  const normalised = text.replace(/\r\n?/g, '\n')
  return normalised.length > FOLD_CHARS || lineCount(normalised) > FOLD_LINES
}

/**
 * The token for the `n`th paste. `label` carries `{n}` and `{lines}` (the composer's
 * `pastedText` label), and the brackets are added here so no translation can drop them.
 */
export function pasteToken(label: string, n: number, text: string): string {
  return `[${label.replace('{n}', String(n)).replace('{lines}', String(lineCount(text)))}]`
}

/**
 * The draft with every token still in it replaced by its text. A token the person has
 * edited or deleted is no longer there to replace, and its text goes nowhere: what is sent
 * is what the field shows, as in the terminal.
 */
export function expandPastes(draft: string, pastes: readonly ChatPaste[]): string {
  // A function replacer, so a `$&` or `$1` in pasted SQL is not read as a pattern.
  return pastes.reduce((text, paste) => text.replace(paste.token, () => paste.text), draft)
}

/** `text` cut around the tokens still in it, so the composer can draw them apart. */
export function pasteSpans(text: string, pastes: readonly ChatPaste[]): { text: string; paste: boolean }[] {
  const spans: { text: string; paste: boolean }[] = []
  let rest = text
  while (rest) {
    const next = pastes
      .map((p) => ({ token: p.token, at: rest.indexOf(p.token) }))
      .filter((m) => m.at >= 0)
      .sort((a, b) => a.at - b.at)[0]
    if (!next) break
    if (next.at > 0) spans.push({ text: rest.slice(0, next.at), paste: false })
    spans.push({ text: next.token, paste: true })
    rest = rest.slice(next.at + next.token.length)
  }
  if (rest) spans.push({ text: rest, paste: false })
  return spans
}
