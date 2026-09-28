import { describe, expect, it } from 'vitest'
import { desktopUserAgent, parseSessionAgent } from './sessionAgent'

describe('desktopUserAgent', () => {
  it('names the version, the OS and the machine', () => {
    expect(desktopUserAgent('0.101.0', 'darwin', 'Studio-de-Xavier.local')).toBe(
      'MagicSlash/0.101.0 (macOS; Studio-de-Xavier)',
    )
  })

  it('keeps the format intact whatever the machine is called', () => {
    expect(desktopUserAgent('1.0.0', 'win32', 'PC (bureau); 2')).toBe('MagicSlash/1.0.0 (Windows; PC  bureau   2)')
    expect(desktopUserAgent('1.0.0', 'linux', '')).toBe('MagicSlash/1.0.0 (Linux)')
  })
})

describe('parseSessionAgent', () => {
  it('reads the app back from its own agent', () => {
    expect(parseSessionAgent(desktopUserAgent('0.101.0', 'darwin', 'Studio.local'))).toEqual({
      kind: 'desktop',
      name: 'Studio',
      os: 'macOS',
    })
  })

  it('reads a session opened before the app named itself as the app, unnamed', () => {
    for (const ua of ['node', 'undici', '', null]) {
      expect(parseSessionAgent(ua)).toEqual({ kind: 'desktop', name: null, os: null })
    }
  })

  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'Chrome', 'macOS'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15', 'Safari', 'macOS'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 'Edge', 'Windows'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox', 'Linux'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', 'Safari', 'iOS'],
    ['Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', 'Chrome', 'Android'],
  ])('names the browser and OS of %s', (ua, name, os) => {
    expect(parseSessionAgent(ua)).toEqual({ kind: 'browser', name, os })
  })

  it('leaves an agent it cannot read as other', () => {
    expect(parseSessionAgent('curl/8.7.1')).toEqual({ kind: 'other', name: null, os: null })
  })
})
