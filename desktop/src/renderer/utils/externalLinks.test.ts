import { describe, expect, it } from 'vitest'
import { detectLinkKind, linkDisplayName, parseLinkUrl, toLinkKind } from './externalLinks'

describe('detectLinkKind', () => {
  it.each([
    ['https://www.figma.com/design/AbC123/Plans-page', 'figma'],
    ['https://www.figma.com/proto/AbC123/Prototype', 'figma'],
    ['https://www.figma.com/file/AbC123/Old-file', 'figma'],
    ['https://www.figma.com/board/AbC123/Brainstorm', 'figjam'],
    ['https://www.notion.so/team/Spec-0123456789abcdef', 'notion'],
    ['https://acme.notion.site/Public-page', 'notion'],
    ['https://claude.ai/public/artifacts/0e4b5c1a', 'claude_artifact'],
    ['https://claude.site/artifacts/0e4b5c1a', 'claude_artifact'],
    ['https://docs.google.com/document/d/1/edit', 'google_docs'],
    ['https://docs.google.com/spreadsheets/d/1/edit', 'google_sheets'],
    ['https://docs.google.com/presentation/d/1/edit', 'google_slides'],
    ['https://miro.com/app/board/uXj=/', 'miro'],
    ['https://www.loom.com/share/abc', 'loom'],
    ['https://github.com/Xrequillart/magic-slash/pull/313', 'github'],
    ['https://example.com/page', 'other'],
    ['figma.com/design/AbC123', 'figma'],
  ])('reads %s as %s', (url, kind) => {
    expect(detectLinkKind(url)).toBe(kind)
  })

  it('is not fooled by a lookalike host', () => {
    expect(detectLinkKind('https://notfigma.com/design/x')).toBe('other')
    expect(detectLinkKind('https://figma.com.evil.io/design/x')).toBe('other')
    expect(detectLinkKind('https://claude.ai/chat/123')).toBe('other')
  })
})

describe('parseLinkUrl', () => {
  it('takes an address without its scheme as https', () => {
    expect(parseLinkUrl('notion.so/page')?.href).toBe('https://notion.so/page')
  })

  it('refuses what a plan must not carry', () => {
    expect(parseLinkUrl('javascript:alert(1)')).toBeNull()
    expect(parseLinkUrl('file:///etc/passwd')).toBeNull()
    expect(parseLinkUrl('https://a b.com')).toBeNull()
    expect(parseLinkUrl('')).toBeNull()
    expect(parseLinkUrl('localhost')).toBeNull()
  })
})

describe('linkDisplayName', () => {
  it('draws the host and path, without www', () => {
    expect(linkDisplayName('https://www.figma.com/design/AbC/Plans%20page')).toBe('figma.com/design/AbC/Plans page')
  })
})

describe('toLinkKind', () => {
  it('reads a kind this build does not know as other', () => {
    expect(toLinkKind('figma')).toBe('figma')
    expect(toLinkKind('pitch')).toBe('other')
  })
})
