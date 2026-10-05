/**
 * Where Claude Code's explanatory output style frames an insight in a message: between a
 * `★ Insight ───` rule and a closing `───` rule. Drawn by `ChatInsightCard`. Apart from it
 * so it can be tested without React.
 */

/** `★ Insight ─────`, the backticks Claude Code wraps it in optional. */
const OPENER = /^\s*`?\s*★\s*Insight\s*─+\s*`?\s*$/
/** The closing rule: nothing but box-drawing dashes, backticked or not. */
const CLOSER = /^\s*`?\s*─{5,}\s*`?\s*$/

export type ChatMessagePart = { kind: 'text' | 'insight'; text: string }

/**
 * A message of Claude's cut into its plain parts and its insights, in order. An opener
 * with no closer after it (a message still being written, or a rule Claude forgot) is
 * left as text: a card that swallowed the rest of the message would hide it.
 */
export function splitInsights(text: string): ChatMessagePart[] {
  const lines = text.split('\n')
  const parts: ChatMessagePart[] = []
  let plain: string[] = []
  const flush = () => {
    const joined = plain.join('\n').trim()
    if (joined) parts.push({ kind: 'text', text: joined })
    plain = []
  }
  for (let i = 0; i < lines.length; i++) {
    if (!OPENER.test(lines[i])) {
      plain.push(lines[i])
      continue
    }
    const end = lines.findIndex((line, j) => j > i && CLOSER.test(line))
    if (end < 0) {
      plain.push(lines[i])
      continue
    }
    flush()
    const inner = lines.slice(i + 1, end).join('\n').trim()
    if (inner) parts.push({ kind: 'insight', text: inner })
    i = end
  }
  flush()
  return parts
}
