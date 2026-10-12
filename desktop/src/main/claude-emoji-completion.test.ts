import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readEmojiCompletion, writeEmojiCompletion } from './claude-emoji-completion'

let root: string
let configDir: string
let project: string
const previousConfigDir = process.env.CLAUDE_CONFIG_DIR

const write = (file: string, content: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
}
const userFile = () => path.join(configDir, 'settings.json')

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'emoji-completion-'))
  configDir = path.join(root, 'claude')
  project = path.join(root, 'project')
  process.env.CLAUDE_CONFIG_DIR = configDir
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
})

describe('readEmojiCompletion', () => {
  it('is on when nothing says otherwise, as in Claude Code', () => {
    expect(readEmojiCompletion()).toBe(true)
    expect(readEmojiCompletion(project)).toBe(true)
  })
  it('reads the user file, then lets the project and its local file override it', () => {
    write(userFile(), { emojiCompletionEnabled: false })
    expect(readEmojiCompletion(project)).toBe(false)
    write(path.join(project, '.claude', 'settings.json'), { emojiCompletionEnabled: true })
    expect(readEmojiCompletion(project)).toBe(true)
    write(path.join(project, '.claude', 'settings.local.json'), { emojiCompletionEnabled: false })
    expect(readEmojiCompletion(project)).toBe(false)
    // Without a session, the user's own value.
    expect(readEmojiCompletion()).toBe(false)
  })
  it('skips a file it cannot parse', () => {
    write(userFile(), '{ not json')
    expect(readEmojiCompletion()).toBe(true)
  })
})

describe('writeEmojiCompletion', () => {
  it('writes off as false and on as the key gone, keeping the rest of the file', () => {
    write(userFile(), { theme: 'dark', emojiCompletionEnabled: true })
    writeEmojiCompletion(false)
    expect(JSON.parse(fs.readFileSync(userFile(), 'utf-8'))).toEqual({ theme: 'dark', emojiCompletionEnabled: false })
    writeEmojiCompletion(true)
    expect(JSON.parse(fs.readFileSync(userFile(), 'utf-8'))).toEqual({ theme: 'dark' })
  })
  it('creates the file when there is none', () => {
    writeEmojiCompletion(false)
    expect(readEmojiCompletion()).toBe(false)
  })
  it('refuses to rewrite a file it cannot parse', () => {
    write(userFile(), '{ not json')
    expect(() => writeEmojiCompletion(false)).toThrow()
    expect(fs.readFileSync(userFile(), 'utf-8')).toBe('{ not json')
  })
})
