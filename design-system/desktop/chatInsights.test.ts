import { describe, expect, it } from 'vitest'
import { splitInsights, splitRisks } from './chatInsights'

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
  it('cuts a titled banner out, down to its closing rule', () => {
    const rule = '━'.repeat(54)
    const text = `Intro.\n\n${rule}\n📋 PLAN - PER-1\n${rule}\n\n## Résumé\nDo it.\n\n${rule}\n\nAfter.`
    expect(splitInsights(text)).toEqual([
      { kind: 'text', text: 'Intro.' },
      { kind: 'banner', title: '📋 PLAN - PER-1', text: '## Résumé\nDo it.' },
      { kind: 'text', text: 'After.' },
    ])
  })
  it('runs a banner with no closing rule to the end of the message', () => {
    const rule = '━'.repeat(54)
    expect(splitInsights(`${rule}\nTitle\n${rule}\nBody`)).toEqual([{ kind: 'banner', title: 'Title', text: 'Body' }])
  })
  it('leaves a rule with no title under it as text', () => {
    const rule = '━'.repeat(54)
    const text = `${rule}\n\n✅ Done\n\n${rule}`
    expect(splitInsights(text)).toEqual([{ kind: 'text', text }])
  })
})

describe('splitRisks', () => {
  it('cuts the risks section out, down to the next heading, and drops the warning signs', () => {
    const text = "## Résumé\nDo it.\n\n## Risques et points d'attention\n- ⚠️ **One.** Careful.\n- ⚠️ Two.\n\n## Après\nMore."
    expect(splitRisks(text)).toEqual({
      before: '## Résumé\nDo it.',
      title: "Risques et points d'attention",
      risks: '- **One.** Careful.\n- Two.',
      after: '## Après\nMore.',
    })
  })
  it('runs the section to the end, in English too', () => {
    expect(splitRisks('Intro.\n## Risks and Considerations\n- ⚠️ One.')).toEqual({ before: 'Intro.', title: 'Risks and Considerations', risks: '- One.', after: '' })
  })
  it('is null without a risks section', () => {
    expect(splitRisks('## Summary\nDo it.')).toBeNull()
  })
})
