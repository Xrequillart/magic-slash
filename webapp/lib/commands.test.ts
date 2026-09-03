import { describe, expect, it } from 'vitest'
import { MAGIC_COMMANDS } from './commands'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/commands.ts` may not import anything at all — see the note on that file. This
 * test existing is what keeps that true: add a `lucide-react` import over there and
 * this fails to RESOLVE rather than shipping a broken build.
 *
 * What it pins is the two things a reader of the landing page would notice and a type
 * would not: that all eight are there, and that they are in the order a job goes
 * through them.
 */

/** The cycle, written out rather than derived — the point is to fix it. */
const CYCLE = ['plan', 'start', 'continue', 'commit', 'pr', 'review', 'resolve', 'done']

describe('magic commands', () => {
  it('lists the eight commands in cycle order', () => {
    expect(MAGIC_COMMANDS.map((command) => command.id)).toEqual(CYCLE)
  })

  it('spells every command the way it is typed', () => {
    for (const command of MAGIC_COMMANDS) {
      expect(command.command, command.id).toMatch(/^\/magic:[a-z]+$/)
      // The command is `/magic:` plus the id, not merely shaped like it: a typo here
      // would put a command on the page that does not exist.
      expect(command.command).toBe(`/magic:${command.id}`)
    }
  })

  it('names an icon for each one', () => {
    // A string, checked as one — the component it resolves to cannot be imported here.
    for (const command of MAGIC_COMMANDS) {
      expect(command.icon, command.id).toMatch(/^[A-Z][A-Za-z]+$/)
    }
  })
})
