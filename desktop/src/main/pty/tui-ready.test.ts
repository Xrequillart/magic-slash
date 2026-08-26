import { describe, it, expect } from 'vitest'
import { createTuiReadyScanner, TUI_READY_MARKER } from './tui-ready'

/**
 * When a freshly launched agent is ready to be typed into.
 *
 * The rules the "Discuss with an agent" draft depends on: the prompt is written to
 * the PTY the moment this says so, and a false negative leaves the text echoed
 * above the banner rather than in the input box.
 *
 * This file imports ONLY `./tui-ready` — reaching the scanner through
 * `terminal-manager` would pull `node-pty`, which CI does not install.
 */
describe('createTuiReadyScanner', () => {
  it('fires on the marker inside a chunk', () => {
    const scanner = createTuiReadyScanner()
    expect(scanner.seen(`\x1b[?1049h${TUI_READY_MARKER}\x1b[?1004h`)).toBe(true)
  })

  it('fires on a marker split across two chunks', () => {
    const scanner = createTuiReadyScanner()
    const half = Math.floor(TUI_READY_MARKER.length / 2)
    expect(scanner.seen(`banner\x1b[?25l${TUI_READY_MARKER.slice(0, half)}`)).toBe(false)
    expect(scanner.seen(`${TUI_READY_MARKER.slice(half)}❯ `)).toBe(true)
  })

  it('fires on a marker split one byte at a time', () => {
    const scanner = createTuiReadyScanner()
    const results = [...TUI_READY_MARKER].map((byte) => scanner.seen(byte))
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(results[results.length - 1]).toBe(true)
  })

  it('stays quiet on output that never enables bracketed paste', () => {
    const scanner = createTuiReadyScanner()
    // The mode-RESET is one byte from the marker and is emitted at shutdown: a
    // scanner that matched it would type the draft into a dying terminal.
    expect(scanner.seen('\x1b[?2004l')).toBe(false)
    expect(scanner.seen('\x1b[?25h\x1b[?1049h\x1b[?1000h')).toBe(false)
    expect(scanner.seen('plain text with no escapes at all')).toBe(false)
  })

  it('latches, so a later re-enable is not a second signal', () => {
    const scanner = createTuiReadyScanner()
    expect(scanner.seen(TUI_READY_MARKER)).toBe(true)
    expect(scanner.seen(TUI_READY_MARKER)).toBe(false)
  })

  it('does not carry more than one marker of output between chunks', () => {
    const scanner = createTuiReadyScanner()
    // A long quiet stream must not accumulate: the marker only ever appears whole
    // within one chunk plus the tail of the one before it.
    for (let i = 0; i < 500; i++) expect(scanner.seen('x'.repeat(4096))).toBe(false)
    expect(scanner.seen(TUI_READY_MARKER)).toBe(true)
  })
})
