import { describe, expect, it } from 'vitest'
import { codeToMarkdown, richTextToMarkdown, type RichNode } from './richText'

const text = (data: string): RichNode => ({ nodeType: 3, nodeName: '#text', textContent: data, childNodes: [] })
const el = (name: string, kids: RichNode[] = [], attrs: Record<string, string> = {}): RichNode => ({
  nodeType: 1,
  nodeName: name.toUpperCase(),
  textContent: kids.map((kid) => kid.textContent ?? '').join(''),
  childNodes: kids,
  getAttribute: (attr) => attrs[attr] ?? null,
})
const md = (...kids: RichNode[]) => richTextToMarkdown(el('span', kids))

describe('richTextToMarkdown', () => {
  it('writes plain text back as it is', () => {
    expect(md(text('Un paragraphe simple.'))).toBe('Un paragraphe simple.')
  })

  it('writes the marks a browser produces and the ones markdown renders alike', () => {
    expect(md(text('du '), el('b', [text('gras')]), text(' et '), el('strong', [text('fort')]))).toBe('du **gras** et **fort**')
    expect(md(el('i', [text('penché')]), text(' '), el('em', [text('aussi')]))).toBe('*penché* *aussi*')
    expect(md(el('strike', [text('barré')]), text(' '), el('del', [text('rayé')]))).toBe('~~barré~~ ~~rayé~~')
  })

  it('writes underline as <ins>, which the sanitiser keeps', () => {
    expect(md(el('u', [text('souligné')]))).toBe('<ins>souligné</ins>')
  })

  it('nests marks', () => {
    expect(md(el('strong', [text('gras '), el('em', [text('et penché')])]))).toBe('**gras *et penché***')
  })

  it('merges two runs of the same mark side by side', () => {
    expect(md(el('b', [text('deux')]), el('b', [text(' mots')]))).toBe('**deux mots**')
  })

  it('moves the whitespace a mark caught outside it', () => {
    expect(md(text('un'), el('b', [text(' mot ')]), text('ici'))).toBe('un **mot** ici')
  })

  it('writes code with a fence longer than any backtick run inside', () => {
    expect(md(el('code', [text('npm test')]))).toBe('`npm test`')
    expect(md(el('code', [text('a ` b')]))).toBe('``a ` b``')
  })

  it('writes links and escapes their text', () => {
    expect(md(el('a', [text('le site')], { href: 'https://example.com' }))).toBe('[le site](https://example.com)')
    expect(md(el('a', [text('x')], { href: 'https://e.com/a (b)' }))).toBe('[x](<https://e.com/a (b)>)')
  })

  it('escapes what would otherwise become markup', () => {
    expect(md(text('2 * 3 et snake_case [x]'))).toBe('2 \\* 3 et snake\\_case \\[x\\]')
  })

  it('escapes a line that would start a block', () => {
    expect(md(text('# pas un titre'))).toBe('\\# pas un titre')
    expect(md(text('- pas une puce'))).toBe('\\- pas une puce')
    expect(md(text('1. pas une liste'))).toBe('1\\. pas une liste')
  })

  it('skips the checkbox and the comment mark', () => {
    const mark = el('span', [text('3')], { 'data-comment-overlay': '' })
    expect(md(el('input'), text('tâche'), mark)).toBe('tâche')
  })

  it('writes a hard break, and a browser line spelled as a div', () => {
    expect(md(text('a'), el('br'), text('b'))).toBe('a\\\nb')
    expect(md(text('a'), el('div', [text('b')]))).toBe('a\\\nb')
  })

  it('drops the trailing break a browser keeps for an empty last line', () => {
    expect(md(text('a'), el('br'), text('b'), el('br'))).toBe('a\\\nb')
  })

  it('drops the zero-width space a shortcut leaves after a mark', () => {
    expect(md(el('code', [text('x')]), text('\u200b fin'))).toBe('`x` fin')
  })

  it('turns the spaces a browser keeps with nbsp back into spaces', () => {
    expect(md(text('a  b '))).toBe('a  b')
  })
})

describe('codeToMarkdown', () => {
  it('keeps code as typed', () => {
    expect(codeToMarkdown(el('code', [text('const a = **b**\n')]))).toBe('const a = **b**')
  })
})
