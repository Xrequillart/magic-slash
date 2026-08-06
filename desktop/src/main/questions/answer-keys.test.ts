import { describe, it, expect } from 'vitest'
import { keysFor, answerableOptionCount } from './answer-keys'
import type { TrayAnswerChoice, TrayQuestion } from '../../types'

const ask = (overrides: Partial<TrayQuestion> = {}): TrayQuestion => ({
  token: 't',
  kind: 'ask',
  prompt: 'Which database?',
  options: [{ label: 'Postgres' }, { label: 'MySQL' }, { label: 'SQLite' }],
  receivedAt: Date.now(),
  ...overrides,
})

const permission = (overrides: Partial<TrayQuestion> = {}): TrayQuestion => ({
  token: 't',
  kind: 'permission',
  prompt: 'Claude needs your permission to use Bash',
  options: [],
  receivedAt: Date.now(),
  ...overrides,
})

const option = (index: number): TrayAnswerChoice => ({ kind: 'option', index })
const options = (...indexes: number[]): TrayAnswerChoice => ({ kind: 'options', indexes })

/** Four boxes to tick, as the TUI numbers them 1..4. */
const multi = (overrides: Partial<TrayQuestion> = {}): TrayQuestion =>
  ask({
    multiSelect: true,
    options: [{ label: 'Red' }, { label: 'Green' }, { label: 'Blue' }, { label: 'Yellow' }],
    ...overrides,
  })

const DIGIT_1 = '1'
const DIGIT_3 = '3'
const RIGHT = '\x1b[C'
const ENTER = '\r'

describe('keysFor', () => {
  it('sends Enter alone for the first option (the row already highlighted)', () => {
    expect(keysFor(ask(), option(0))).toEqual(['\r'])
  })

  it('sends one arrow per row to walk down to the option, then Enter', () => {
    expect(keysFor(ask(), option(1))).toEqual(['\x1b[B', '\r'])
    expect(keysFor(ask(), option(2))).toEqual(['\x1b[B', '\x1b[B', '\r'])
  })

  it('keeps every keypress a separate element, never one concatenated burst', () => {
    // The regression this whole module was rewritten for: `\x1b[B\x1b[B\r` written as
    // one chunk had all its arrows dropped, so option 3 answered option 1. Each
    // element must be exactly one keypress for the caller to be able to space them.
    const keys = keysFor(ask(), option(2))
    expect(keys).toHaveLength(3)
    expect(keys?.every((key) => key === '\x1b[B' || key === '\r')).toBe(true)
  })

  it('refuses an index past the last option rather than writing an approximation', () => {
    expect(keysFor(ask(), option(3))).toBeNull()
    expect(keysFor(ask(), option(-1))).toBeNull()
    expect(keysFor(ask(), option(1.5))).toBeNull()
  })

  it('refuses everything for a question v1 cannot drive', () => {
    expect(keysFor(ask({ unsupported: true }), option(0))).toBeNull()
    expect(keysFor(permission({ unsupported: true }), { kind: 'deny' })).toBeNull()
  })

  it('denies with a bare Escape, independent of how many options there are', () => {
    expect(keysFor(permission(), { kind: 'deny' })).toEqual(['\x1b'])
    expect(keysFor(permission({ options: [{ label: 'a' }, { label: 'b' }] }), { kind: 'deny' }))
      .toEqual(['\x1b'])
  })

  it('does not offer a refusal on an AskUserQuestion (Escape would interrupt it)', () => {
    expect(keysFor(ask(), { kind: 'deny' })).toBeNull()
  })

  it('treats a permission Allow as the first row of an implicit one-option list', () => {
    expect(answerableOptionCount(permission())).toBe(1)
    expect(keysFor(permission(), option(0))).toEqual(['\r'])
    expect(keysFor(permission(), option(1))).toBeNull()
  })
})

describe('keysFor, multiSelect', () => {
  it('ticks each box by its digit, then submits from the review page', () => {
    // The sequence measured against a live TUI: `1`, `3`, `→`, Enter answered
    // "Red, Blue" on a four-option question. See the header comment in answer-keys.
    expect(keysFor(multi(), options(0, 2))).toEqual([DIGIT_1, DIGIT_3, RIGHT, ENTER])
  })

  it('uses a digit for a single box too, never the arrows-and-Enter recipe', () => {
    // Enter TOGGLES on a multiSelect prompt, so the single-select sequence would tick
    // a box and leave the question hanging, unsubmitted.
    expect(keysFor(multi(), options(0))).toEqual([DIGIT_1, RIGHT, ENTER])
    expect(keysFor(multi(), option(0))).toEqual([DIGIT_1, RIGHT, ENTER])
  })

  it('sorts the digits, so the keystrokes match what was asked whatever the click order', () => {
    expect(keysFor(multi(), options(2, 0))).toEqual([DIGIT_1, DIGIT_3, RIGHT, ENTER])
  })

  it('de-duplicates, because the same digit twice un-ticks the box', () => {
    expect(keysFor(multi(), options(0, 0, 2))).toEqual([DIGIT_1, DIGIT_3, RIGHT, ENTER])
  })

  it('answers every box when they are all ticked', () => {
    expect(keysFor(multi(), options(0, 1, 2, 3))).toEqual(['1', '2', '3', '4', RIGHT, ENTER])
  })

  it('refuses an empty selection rather than submitting a blank answer', () => {
    expect(keysFor(multi(), options())).toBeNull()
  })

  it('refuses an index no digit could reach', () => {
    expect(keysFor(multi(), options(4))).toBeNull()
    expect(keysFor(multi(), options(0, 9))).toBeNull()
    expect(keysFor(multi(), options(-1))).toBeNull()
    expect(keysFor(multi(), options(1.5))).toBeNull()
    // Past the tenth option there is no single digit left, whatever the TUI shows.
    const eleven = multi({ options: Array.from({ length: 11 }, (_, i) => ({ label: `#${i}` })) })
    expect(keysFor(eleven, options(9))).toBeNull()
    expect(keysFor(eleven, options(8))).toEqual(['9', RIGHT, ENTER])
  })

  it('refuses a multi answer on a question that has no checkboxes', () => {
    // Digits on a single-select prompt answer immediately, so a partial sequence would
    // pick an option nobody asked for.
    expect(keysFor(ask(), options(0, 1))).toBeNull()
    expect(keysFor(permission(), options(0))).toBeNull()
  })

  it('still refuses everything once the question is marked unsupported', () => {
    expect(keysFor(multi({ unsupported: true }), options(0))).toBeNull()
  })

  it('offers no refusal, exactly as on any other AskUserQuestion', () => {
    expect(keysFor(multi(), { kind: 'deny' })).toBeNull()
  })

  it('keeps every keypress a separate element', () => {
    const keys = keysFor(multi(), options(0, 1, 2))
    expect(keys).toHaveLength(5)
    expect(keys!.every((key) => key.length === 1 || key === RIGHT)).toBe(true)
  })
})
