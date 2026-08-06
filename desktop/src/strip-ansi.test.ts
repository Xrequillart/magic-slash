import { describe, expect, it } from 'vitest'
import { stripAnsi } from './strip-ansi'

describe('stripAnsi', () => {
  it('strips colours and cursor movement', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red')
    expect(stripAnsi('\x1b[2J\x1b[Hcleared')).toBe('cleared')
    expect(stripAnsi('\x1b[3;1Hplaced')).toBe('placed')
  })

  it('strips the private CSI forms a TUI redraw is wrapped in', () => {
    // The regression: `?` is not in `[0-9;]`, so only the ESC used to go and the
    // preview filled up with `[?25l` / `[?25h`.
    expect(stripAnsi('\x1b[?25lhidden\x1b[?25h')).toBe('hidden')
    expect(stripAnsi('\x1b[?1049h\x1b[?1049l')).toBe('')
  })

  it('strips the OSC window title, terminated either way', () => {
    expect(stripAnsi('\x1b]0;title\x07after')).toBe('after')
    expect(stripAnsi('\x1b]0;title\x1b\\after')).toBe('after')
    expect(stripAnsi('\x1b]8;;https://example.com\x07link')).toBe('link')
  })

  it('keeps an unterminated OSC from swallowing the rest of the output', () => {
    expect(stripAnsi('\x1b]0;never closed\nreal content')).toBe('\nreal content')
  })

  it('strips charset designators and single-byte sequences', () => {
    expect(stripAnsi('\x1b(Bascii')).toBe('ascii')
    expect(stripAnsi('\x1b7saved\x1b8')).toBe('saved')
    expect(stripAnsi('\x1bMup')).toBe('up')
  })

  it('drops a sequence truncated by the end of the string', () => {
    expect(stripAnsi('text\x1b')).toBe('text')
    expect(stripAnsi('text\x1b[')).toBe('text')
  })

  it('leaves ordinary text alone, brackets included', () => {
    expect(stripAnsi('plain text')).toBe('plain text')
    expect(stripAnsi('npm run lint [ok] 100%')).toBe('npm run lint [ok] 100%')
    expect(stripAnsi('')).toBe('')
  })

  it('cleans a real Claude Code frame end to end', () => {
    const frame =
      '\x1b[?25l\x1b]0;⣿ Test askquestion avec toolbar\x07' +
      '\x1b[1m\x1b[38;5;3mBash\x1b[0m(sw_vers)\n' +
      '\x1b[2m│\x1b[0m  Print macOS version info\x1b[?25h'
    expect(stripAnsi(frame)).toBe('Bash(sw_vers)\n│  Print macOS version info')
  })
})
