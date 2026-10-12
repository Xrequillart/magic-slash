import { describe, expect, it } from 'vitest'
import {
  EMPTY_BLOCK, caretAfterChange, applySpecBlock, mergeSpecBlocks, openSpecBlock, retypeSpecBlock, specBlockTypeOf, splitSpecBlock,
} from './specEditing'

const at = (doc: string, needle: string) => {
  const start = doc.indexOf(needle)
  return { start, end: start + needle.length }
}

describe('openSpecBlock', () => {
  it('hands a paragraph over whole, markup included', () => {
    const doc = 'Intro\n\nSome **bold** text.\n\nOutro'
    const block = openSpecBlock(doc, 'p', at(doc, 'Some **bold** text.'))
    expect(block.prefix).toBe('')
    expect(block.text).toBe('Some **bold** text.')
  })

  it('keeps the heading marker out of the text', () => {
    const doc = '# Title\n\n## Scope\n\nBody'
    const block = openSpecBlock(doc, 'h2', at(doc, '## Scope'))
    expect(block.prefix).toBe('## ')
    expect(block.text).toBe('Scope')
  })

  it('keeps a list marker and its checkbox out of the text', () => {
    const doc = '- [ ] first\n- [x] second\n'
    const block = openSpecBlock(doc, 'li', at(doc, '- [x] second'))
    expect(block.prefix).toBe('- [x] ')
    expect(block.text).toBe('second')
  })

  it('keeps the fences of a code block out of the text', () => {
    const doc = 'A\n\n```ts\nconst a = 1\n```\n\nB'
    const block = openSpecBlock(doc, 'pre', at(doc, '```ts\nconst a = 1\n```'))
    expect(block.text).toBe('const a = 1')
    expect(applySpecBlock(doc, block, 'const a = 2')).toBe('A\n\n```ts\nconst a = 2\n```\n\nB')
  })

  it('puts back the whitespace a block ended on', () => {
    const doc = '- parent\n  - child\n'
    const block = openSpecBlock(doc, 'li', { start: 0, end: doc.indexOf('- child') })
    expect(block.text).toBe('parent')
    expect(applySpecBlock(doc, block, 'renamed')).toBe('- renamed\n  - child\n')
  })
})

describe('applySpecBlock', () => {
  it('rewrites the block and nothing around it', () => {
    const doc = '# Title\n\n## Scope\n\nBody'
    const block = openSpecBlock(doc, 'h2', at(doc, '## Scope'))
    expect(applySpecBlock(doc, block, 'Out of scope')).toBe('# Title\n\n## Out of scope\n\nBody')
  })

  it('removes a block written down to nothing, marker and line with it', () => {
    const doc = '- a\n- b\n- c\n'
    const block = openSpecBlock(doc, 'li', at(doc, '- b'))
    expect(applySpecBlock(doc, block, '   ')).toBe('- a\n- c\n')
  })

  it('removes a block left holding only the placeholder Enter gave it', () => {
    const doc = `A\n\n${EMPTY_BLOCK}\n\nB`
    const block = openSpecBlock(doc, 'p', at(doc, EMPTY_BLOCK))
    expect(applySpecBlock(doc, block, EMPTY_BLOCK)).toBe('A\n\n\nB')
  })

  it('removes an emptied indented item from the start of its line', () => {
    const doc = '- a\n  - b\n'
    const block = openSpecBlock(doc, 'li', at(doc, '- b'))
    expect(applySpecBlock(doc, block, '')).toBe('- a\n')
  })
})

describe('splitSpecBlock', () => {
  it('splits a paragraph into two, and names the second', () => {
    const doc = 'A\n\nBC\n\nD'
    const block = openSpecBlock(doc, 'p', at(doc, 'BC'))
    const split = splitSpecBlock(doc, block, 'B', 'C')
    expect(split.doc).toBe('A\n\nB\n\nC\n\nD')
    expect(split.keys).toEqual([`p@${split.doc.indexOf('C')}`])
  })

  it('makes the next item of a tight list, unchecked', () => {
    const doc = '- [x] ab\n- c\n'
    const block = openSpecBlock(doc, 'li', at(doc, '- [x] ab'))
    const split = splitSpecBlock(doc, block, 'a', 'b')
    expect(split.doc).toBe('- [x] a\n- [ ] b\n- c\n')
    expect(split.keys).toContain(`li@${split.doc.indexOf('- [ ] b')}`)
  })

  it('makes the next item of a loose list, a blank line down', () => {
    const doc = '- a\n\n- bc\n\n- d'
    // In a loose list the line is the paragraph, after the marker.
    const block = openSpecBlock(doc, 'p', at(doc, 'bc'))
    expect(block.item).toBe('loose')
    const split = splitSpecBlock(doc, block, 'b', 'c')
    expect(split.doc).toBe('- a\n\n- b\n\n- c\n\n- d')
    expect(split.keys).toContain(`p@${split.doc.indexOf('c\n')}`)
  })

  it('follows a heading with a paragraph, holding a placeholder when empty', () => {
    const doc = '## Title\n\nBody'
    const block = openSpecBlock(doc, 'h2', at(doc, '## Title'))
    const split = splitSpecBlock(doc, block, 'Title', '')
    expect(split.doc).toBe(`## Title\n\n${EMPTY_BLOCK}\n\nBody`)
    expect(split.keys).toEqual([`p@${split.doc.indexOf(EMPTY_BLOCK)}`])
  })

  it('stays inside a quote', () => {
    const doc = '> ab\n\nC'
    const block = openSpecBlock(doc, 'p', at(doc, 'ab'))
    expect(splitSpecBlock(doc, block, 'a', 'b').doc).toBe('> a\n>\n> b\n\nC')
  })

  it('keeps a nested item nested', () => {
    const doc = '- a\n  - bc\n'
    const block = openSpecBlock(doc, 'li', at(doc, '- bc'))
    expect(splitSpecBlock(doc, block, 'b', 'c').doc).toBe('- a\n  - b\n  - c\n')
  })
})

describe('mergeSpecBlocks', () => {
  it('folds a paragraph into the one above', () => {
    const doc = 'A\n\nB\n\nC'
    const previous = openSpecBlock(doc, 'p', at(doc, 'A'))
    const current = openSpecBlock(doc, 'p', at(doc, 'B'))
    expect(mergeSpecBlocks(doc, previous, current, 'B')).toBe('AB\n\n\nC')
  })

  it('folds an empty item away', () => {
    const doc = '- a\n- \n'
    const previous = openSpecBlock(doc, 'li', at(doc, '- a'))
    const current = openSpecBlock(doc, 'li', { start: 4, end: 6 })
    expect(mergeSpecBlocks(doc, previous, current, '')).toBe('- a\n')
  })
})

describe('retypeSpecBlock', () => {
  it('turns a paragraph into a heading', () => {
    const doc = 'A\n\nB\n\nC'
    const block = openSpecBlock(doc, 'p', at(doc, 'B'))
    const next = retypeSpecBlock(doc, block, 'B', 'h2')
    expect(next.doc).toBe('A\n\n## B\n\nC')
    expect(next.keys).toEqual(['h2@3'])
  })

  it('takes an item out of its list with a blank line either side', () => {
    const doc = '- a\n- b\n- c'
    const block = openSpecBlock(doc, 'li', at(doc, '- b'))
    const next = retypeSpecBlock(doc, block, 'b', 'p')
    expect(next.doc).toBe('- a\n\nb\n\n- c')
    expect(next.keys).toEqual([`p@${next.doc.indexOf('b')}`])
  })

  it('joins a paragraph turned into an item to the list above, tight', () => {
    const doc = '- a\n- b\n\nc\n\nNext'
    const block = openSpecBlock(doc, 'p', at(doc, 'c'))
    const next = retypeSpecBlock(doc, block, 'c', 'ul')
    expect(next.doc).toBe('- a\n- b\n- c\n\nNext')
    expect(next.keys).toContain(`li@${next.doc.indexOf('- c')}`)
  })

  it('joins an item to the list below, tight', () => {
    const doc = 'Intro\n\na\n\n- b\n- c'
    const block = openSpecBlock(doc, 'p', at(doc, 'a'))
    expect(retypeSpecBlock(doc, block, 'a', 'ul').doc).toBe('Intro\n\n- a\n- b\n- c')
  })

  it('turns a heading into a task', () => {
    const doc = '## T\n\nx'
    const block = openSpecBlock(doc, 'h2', at(doc, '## T'))
    const next = retypeSpecBlock(doc, block, 'T', 'todo')
    expect(next.doc).toBe('- [ ] T\n\nx')
    expect(next.keys).toContain('li@0')
  })

  it('takes a loose item out of its list', () => {
    const doc = '- a\n\n- b\n\n- c'
    const block = openSpecBlock(doc, 'p', at(doc, 'b'))
    expect(retypeSpecBlock(doc, block, 'b', 'p').doc).toBe('- a\n\nb\n\n- c')
  })

  it('quotes a paragraph, and names the paragraph inside the quote', () => {
    const doc = 'A\n\nB'
    const block = openSpecBlock(doc, 'p', at(doc, 'B'))
    const next = retypeSpecBlock(doc, block, 'B', 'quote')
    expect(next.doc).toBe('A\n\n> B')
    expect(next.keys).toEqual(['p@5'])
  })

  it('takes a quoted paragraph out of its quote', () => {
    const doc = 'A\n\n> B'
    const block = openSpecBlock(doc, 'p', at(doc, 'B'))
    expect(retypeSpecBlock(doc, block, 'B', 'p').doc).toBe('A\n\nB')
  })
})

describe('specBlockTypeOf', () => {
  it('reads the kind off the tag and the marker', () => {
    expect(specBlockTypeOf('', 'li', { start: 0, end: 0, prefix: '- [ ] ', suffix: '', text: '', item: 'tight' })).toBe('todo')
    expect(specBlockTypeOf('', 'li', { start: 0, end: 0, prefix: '2. ', suffix: '', text: '', item: 'tight' })).toBe('ol')
    const loose = '- a\n\n- b'
    expect(specBlockTypeOf(loose, 'p', openSpecBlock(loose, 'p', at(loose, 'b')))).toBe('ul')
    expect(specBlockTypeOf('> B', 'p', { start: 2, end: 3, prefix: '', suffix: '', text: 'B' })).toBe('quote')
  })
})

describe('caretAfterChange', () => {
  it('lands at the end of what changed', () => {
    expect(caretAfterChange('abc def', 'abc')).toBe(3)
    expect(caretAfterChange('abc', 'abc def')).toBe(7)
    expect(caretAfterChange('a X b', 'a b')).toBe(1)
    expect(caretAfterChange('a b', 'a X b')).toBe(3)
  })
})
