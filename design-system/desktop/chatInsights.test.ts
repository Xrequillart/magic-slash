import { describe, expect, it } from 'vitest'
import { splitInsights } from './chatInsights'

describe('splitInsights', () => {
  it('cuts the insight out of the text around it', () => {
    const text = 'Before.\n\n`★ Insight ─────────────────────────────────────`\n- one\n- two\n`─────────────────────────────────────────────────`\n\nAfter.'
    expect(splitInsights(text)).toEqual([
      { kind: 'text', text: 'Before.' },
      { kind: 'insight', text: '- one\n- two' },
      { kind: 'text', text: 'After.' },
    ])
  })
  it('leaves an opener with no closer as text', () => {
    const text = '`★ Insight ─────`\n- one'
    expect(splitInsights(text)).toEqual([{ kind: 'text', text }])
  })
  it('is the text alone when there is no insight', () => {
    expect(splitInsights('Just text.')).toEqual([{ kind: 'text', text: 'Just text.' }])
  })
})
