import { describe, expect, it } from 'vitest'
import { expandPastes, lineCount, pasteSpans, pasteToken, shouldFold } from './chatPaste'

describe('shouldFold', () => {
  it('leaves a short paste as text', () => {
    expect(shouldFold('SELECT 1')).toBe(false)
    expect(shouldFold('a\nb\nc')).toBe(false)
  })

  it('folds a long one-line paste', () => {
    expect(shouldFold('x'.repeat(801))).toBe(true)
  })

  it('folds a paste of many short lines', () => {
    expect(shouldFold(Array.from({ length: 11 }, (_, i) => `l${i}`).join('\n'))).toBe(true)
  })

  it('counts Windows line endings once', () => {
    expect(shouldFold(Array.from({ length: 10 }, () => 'l').join('\r\n'))).toBe(false)
  })
})

describe('lineCount', () => {
  it('does not count a trailing newline as a line', () => {
    expect(lineCount('a\nb\n')).toBe(2)
  })
})

describe('pasteToken', () => {
  it('fills the label and brackets it', () => {
    expect(pasteToken('Pasted text #{n} +{lines} lines', 2, 'a\nb\nc')).toBe('[Pasted text #2 +3 lines]')
  })
})

describe('expandPastes', () => {
  const sql = 'SELECT *\nFROM t\nWHERE a = \'$&\''

  it('puts each text back in its token\'s place', () => {
    const pastes = [{ token: '[P #1]', text: sql }, { token: '[P #2]', text: 'two' }]
    expect(expandPastes('fix [P #1] then [P #2]', pastes)).toBe(`fix ${sql} then two`)
  })

  it('drops a paste whose token was removed', () => {
    expect(expandPastes('nothing left', [{ token: '[P #1]', text: sql }])).toBe('nothing left')
  })
})

describe('pasteSpans', () => {
  it('cuts the text around the tokens', () => {
    const pastes = [{ token: '[P #1]', text: 'x' }, { token: '[P #2]', text: 'y' }]
    expect(pasteSpans('a [P #2] b [P #1]', pastes)).toEqual([
      { text: 'a ', paste: false },
      { text: '[P #2]', paste: true },
      { text: ' b ', paste: false },
      { text: '[P #1]', paste: true },
    ])
  })

  it('leaves text without tokens whole', () => {
    expect(pasteSpans('plain', [])).toEqual([{ text: 'plain', paste: false }])
  })
})
