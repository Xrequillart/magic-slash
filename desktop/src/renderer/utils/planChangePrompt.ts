/**
 * The draft the plan page's "Rework the plan" button types into a fresh agent:
 * `/magic:plan-change <spec path> `, and nothing else.
 *
 * WHY IT STOPS AT THE PATH
 * ---------------------------------------------------------------------------
 * The change request is the one thing only the person can say, so the draft names the
 * spec and hands them the caret. The trailing space is load-bearing: the draft lands in
 * the input box with the caret after it, and they carry straight on typing what should
 * change. Not translated, for `discussPrompt`'s reason and a stronger one: this is a
 * command and its argument, and the skill parses it.
 *
 * ONE LINE, ALWAYS. It is typed into the input box, where a newline IS the send, so a
 * two-line draft would post its first line with no change request and leave the second
 * behind. A path cannot sensibly hold a line break, but the draft must not depend on that.
 *
 * QUOTED ONLY WHEN IT HAS TO BE. `skills/magic-plan-change/SKILL.md` Step 1 takes the
 * first argument as the path, and a double-quoted one (with `\"` and `\\` escapes) as a
 * single argument. A plain path stays plain, so the common draft reads as the command a
 * person would have typed themselves.
 */
export function planChangePrompt(specPath: string): string {
  const oneLine = specPath.replace(/[\r\n]+/g, ' ').trim()
  const needsQuotes = /[\s"'\\]/.test(oneLine)
  const arg = needsQuotes ? `"${oneLine.replace(/[\\"]/g, (c) => `\\${c}`)}"` : oneLine
  return `/magic:plan-change ${arg} `
}
