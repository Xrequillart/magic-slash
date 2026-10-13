import { describe, expect, it } from 'vitest'
import { INTERACTIVE_COMMANDS, opensInTerminal, remotePromptRefusal } from './prompt-submit'
import { opensInTerminal as chatOpensInTerminal } from './renderer/components/chatCommands'

// promptBytes and submitDelay keep their tests in renderer/utils/chatPrompt.test.ts, through
// the re-export: the bytes a phone's prompt is typed as are the chat's, by construction.

describe('remotePromptRefusal', () => {
  it('refuses a shell line, wherever its leading space ends', () => {
    expect(remotePromptRefusal('!ls')).toBe(true)
    expect(remotePromptRefusal('  \n\t! git push --force')).toBe(true)
  })

  it('refuses every command that opens a TUI dialog', () => {
    for (const name of INTERACTIVE_COMMANDS) expect(remotePromptRefusal(`/${name}`)).toBe(true)
    expect(remotePromptRefusal('  /model opus')).toBe(true)
  })

  it('judges the text as typed, once control bytes are dropped', () => {
    expect(remotePromptRefusal('\x00!rm -rf build')).toBe(true)
    expect(remotePromptRefusal('\x07/model')).toBe(true)
    expect(remotePromptRefusal(' \x1b ! ls')).toBe(true)
  })

  it('lets a prompt, a plain command or a skill through', () => {
    for (const text of ['Fix the refund bug!', 'what does `!important` do?', '/clear', '/compact', '/magic:start PROJ-1', 'talk about /mcp']) {
      expect(remotePromptRefusal(text)).toBe(false)
    }
  })
})

describe('opensInTerminal', () => {
  it('is the chat\'s own, so the phone and the chat cannot disagree on the list', () => {
    expect(chatOpensInTerminal).toBe(opensInTerminal)
  })
})
