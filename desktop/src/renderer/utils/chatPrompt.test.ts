import { describe, expect, it } from 'vitest'
import { promptBytes, submitDelay } from './chatPrompt'

const START = '\x1b[200~'
const END = '\x1b[201~'

describe('promptBytes', () => {
  it('types a short line as it is', () => {
    expect(promptBytes('/model')).toBe('/model')
  })

  it('pastes a multi-line text whole', () => {
    expect(promptBytes('SELECT *\r\nFROM t')).toBe(`${START}SELECT *\nFROM t${END}`)
  })

  it('pastes a long single line', () => {
    const long = 'x'.repeat(5_000)
    expect(promptBytes(long)).toBe(`${START}${long}${END}`)
  })

  it('cannot end the paste early', () => {
    const wrapped = promptBytes(`a\n${END}\rb`)
    expect(wrapped).toBe(`${START}a\n[201~\nb${END}`)
    expect(wrapped.indexOf(END)).toBe(wrapped.length - END.length)
  })

  it('sends nothing for nothing', () => {
    expect(promptBytes('')).toBe('')
  })
})

describe('submitDelay', () => {
  it('grows with the paste, up to a ceiling', () => {
    expect(submitDelay('hi')).toBe(60)
    expect(submitDelay('x'.repeat(10_000))).toBe(260)
    expect(submitDelay('x'.repeat(1_000_000))).toBe(1_000)
  })
})
