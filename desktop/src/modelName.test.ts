import { describe, expect, it } from 'vitest'
import { isValidModelName } from './types'

// The value reaches `claude --model …` on a shell command line, so this gate must keep
// every real model name and refuse anything a shell reads as more than one word.
describe('isValidModelName', () => {
  it('accepts aliases, full ids, context suffixes and provider ids', () => {
    for (const name of ['opus', 'sonnet[1m]', 'claude-fable-5-1[1m]', 'claude-opus-4-8', 'us.anthropic.claude-opus-5-5-v1:0']) {
      expect(isValidModelName(name)).toBe(true)
    }
  })

  it('refuses shell syntax, spaces, empties and overlong values', () => {
    for (const name of ['x;rm -rf ~', 'a b', '$(id)', '`id`', '-rf', '', 'a'.repeat(101), 42, null]) {
      expect(isValidModelName(name)).toBe(false)
    }
  })
})
