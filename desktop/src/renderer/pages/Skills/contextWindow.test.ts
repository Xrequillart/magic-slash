import { describe, it, expect } from 'vitest'
import { detectContextWindow, migrateSkillsContextWindow, resolveContextWindow, formatWindow, DEFAULT_CONTEXT_WINDOW } from './contextWindow'
import type { TerminalInfo, TerminalState } from '../../../types'

const terminal = (
  id: string,
  state: TerminalState,
  contextWindowSize?: number,
): TerminalInfo => ({
  id,
  name: id,
  state,
  repositories: [],
  metadata: contextWindowSize === undefined ? undefined : { usage: { contextWindowSize } },
})

describe('detectContextWindow', () => {
  it('takes the window of the agent being inspected', () => {
    const terminals = [
      terminal('other', 'working', 200_000),
      terminal('focused', 'working', 1_000_000),
    ]
    expect(detectContextWindow(terminals, 'focused')).toBe(1_000_000)
  })

  it('reads the inspected agent whatever live state it is in', () => {
    for (const state of ['idle', 'working', 'waiting'] as const) {
      expect(detectContextWindow([terminal('a', state, 1_000_000)], 'a')).toBe(1_000_000)
    }
  })

  it('ignores a finished agent still carrying its last reported window', () => {
    // Usage is never cleared when an agent completes, so the focused terminal
    // here holds a 1M window from a session that is over. The live 200K agent is
    // the one describing what is running now.
    const terminals = [
      terminal('done', 'completed', 1_000_000),
      terminal('running', 'working', 200_000),
    ]
    expect(detectContextWindow(terminals, 'done')).toBe(200_000)
  })

  it('falls back to the largest window across the live agents', () => {
    const terminals = [
      terminal('small', 'idle', 200_000),
      terminal('big', 'working', 1_000_000),
      terminal('middle', 'waiting', 500_000),
    ]
    expect(detectContextWindow(terminals, null)).toBe(1_000_000)
  })

  it('does not let a finished agent win the fallback either', () => {
    const terminals = [
      terminal('done', 'error', 1_000_000),
      terminal('running', 'idle', 200_000),
    ]
    expect(detectContextWindow(terminals, null)).toBe(200_000)
  })

  it('returns undefined when nothing is running', () => {
    expect(detectContextWindow([], null)).toBeUndefined()
    expect(detectContextWindow([terminal('done', 'completed', 1_000_000)], 'done')).toBeUndefined()
  })

  it('returns undefined when the live agents have reported no usage yet', () => {
    expect(detectContextWindow([terminal('fresh', 'working')], 'fresh')).toBeUndefined()
  })

  it('ignores an inspected id that matches no terminal', () => {
    expect(detectContextWindow([terminal('a', 'working', 1_000_000)], 'ghost')).toBe(1_000_000)
  })
})

describe('migrateSkillsContextWindow', () => {
  it('turns the legacy 200K default into auto', () => {
    expect(migrateSkillsContextWindow(200_000)).toBe('auto')
  })

  it('keeps an explicit 1M override', () => {
    expect(migrateSkillsContextWindow(1_000_000)).toBe(1_000_000)
  })

  it('falls back to auto for a missing or corrupted value', () => {
    expect(migrateSkillsContextWindow(undefined)).toBe('auto')
    expect(migrateSkillsContextWindow(null)).toBe('auto')
    expect(migrateSkillsContextWindow('1000000')).toBe('auto')
    expect(migrateSkillsContextWindow({ size: 1_000_000 })).toBe('auto')
  })

  it('leaves an already-migrated auto alone', () => {
    expect(migrateSkillsContextWindow('auto')).toBe('auto')
  })
})

describe('resolveContextWindow', () => {
  it('lets a forced preset win regardless of what is detected', () => {
    expect(resolveContextWindow(200_000, 1_000_000)).toBe(200_000)
    expect(resolveContextWindow(1_000_000, 200_000)).toBe(1_000_000)
    expect(resolveContextWindow(1_000_000, undefined)).toBe(1_000_000)
  })

  it('resolves auto to the detected window', () => {
    expect(resolveContextWindow('auto', 500_000)).toBe(500_000)
  })

  it('falls back to the default when auto has nothing detected', () => {
    expect(resolveContextWindow('auto', undefined)).toBe(DEFAULT_CONTEXT_WINDOW)
  })
})

describe('formatWindow', () => {
  it('renders the two presets the way the switch labels them', () => {
    expect(formatWindow(200_000)).toBe('200K')
    expect(formatWindow(1_000_000)).toBe('1M')
  })

  it('renders a window that is neither preset', () => {
    expect(formatWindow(350_000)).toBe('350K')
    expect(formatWindow(1_500_000)).toBe('1.5M')
    // Rounded to the nearest thousand, then to one decimal — never "1.0M".
    expect(formatWindow(1_048_576)).toBe('1M')
  })
})
