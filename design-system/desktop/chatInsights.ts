/**
 * Where Claude Code's explanatory output style frames an insight in a message: between a
 * `★ Insight ───` rule and a closing `───` rule. Drawn by `ChatInsightCard`. Apart from it
 * so it can be tested without React.
 *
 * And where a magic skill frames a document of its own (an implementation plan): a title
 * between two `━━━` rules, then its body down to the next `━━━` rule or the message's end.
 * Drawn by `ChatBannerCard`.
 */

/** `★ Insight ─────`, the backticks Claude Code wraps it in optional. */
const OPENER = /^\s*`?\s*★\s*Insight\s*─+\s*`?\s*$/
/** The closing rule: nothing but box-drawing dashes, backticked or not. */
const CLOSER = /^\s*`?\s*─{5,}\s*`?\s*$/

/** A heavy box-drawing rule standing alone on its line, as the skills' templates draw it. */
const BANNER_RULE = /^\s*━{10,}\s*$/

export type ChatMessagePart =
  | { kind: 'text' | 'insight'; text: string }
  | { kind: 'banner'; title: string; text: string }

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
    const title = lines[i + 1]?.trim()
    if (BANNER_RULE.test(lines[i]) && title && !BANNER_RULE.test(lines[i + 1]) && BANNER_RULE.test(lines[i + 2] ?? '')) {
      flush()
      const close = lines.findIndex((line, j) => j > i + 2 && BANNER_RULE.test(line))
      const end = close < 0 ? lines.length : close
      parts.push({ kind: 'banner', title, text: lines.slice(i + 3, end).join('\n').trim() })
      i = end
      continue
    }
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

/** A plan's risks heading, in the words of `/magic:start`'s templates, either language. */
const RISKS_HEADING = /^##\s+(Risques?\b|Risks?\b)/i

/**
 * A banner's body cut around its risks section (`## Risques et points d'attention`,
 * `## Risks and Considerations`), which `ChatBannerCard` draws as a warning: what comes
 * before it, its heading and items, and what follows down to the next `##` heading.
 * Null when there is none. The `⚠️` each item opens with is dropped: the card says it.
 */
export function splitRisks(text: string): { before: string; title: string; risks: string; after: string } | null {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => RISKS_HEADING.test(line))
  if (start < 0) return null
  const next = lines.findIndex((line, i) => i > start && /^##\s/.test(line))
  const end = next < 0 ? lines.length : next
  const risks = lines.slice(start + 1, end)
    .map((line) => line.replace(/^(\s*[-*]\s+)⚠️?\uFE0F?\s*/u, '$1'))
    .join('\n').trim()
  return {
    before: lines.slice(0, start).join('\n').trim(),
    title: lines[start].replace(/^##\s+/, '').trim(),
    risks,
    after: lines.slice(end).join('\n').trim(),
  }
}
