import { describe, it, expect } from 'vitest'
import { planChangePrompt } from './planChangePrompt'

const SPEC = '/Users/me/api/.magic/spec-sso-login-20260922-101500.md'

describe('planChangePrompt', () => {
  it('names the command and the spec, and ends on a space for the change request', () => {
    expect(planChangePrompt(SPEC)).toBe(`/magic:plan-change ${SPEC} `)
  })

  it('stays on one line, since a newline in the input box is the send', () => {
    const prompt = planChangePrompt('/Users/me/api/.magic/spec-a\nb.md')
    expect(prompt).not.toMatch(/[\r\n]/)
  })

  it('quotes a path with a space, so the skill reads it as one argument', () => {
    expect(planChangePrompt('/Users/me/My Repos/api/.magic/spec-x.md')).toBe(
      '/magic:plan-change "/Users/me/My Repos/api/.magic/spec-x.md" ',
    )
  })

  it('escapes a double quote and a backslash inside a quoted path', () => {
    expect(planChangePrompt('/Users/me/a "b"\\c/.magic/spec-x.md')).toBe(
      '/magic:plan-change "/Users/me/a \\"b\\"\\\\c/.magic/spec-x.md" ',
    )
  })
})
