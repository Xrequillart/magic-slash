import { describe, expect, it } from 'vitest'
import type { ChatEntry } from '../../types'
import { chatPush, numberedSnapshot } from './chat-push'

const entry = (id: string, text = id): ChatEntry => ({ kind: 'assistant', id, text })
const chat = (entries: ChatEntry[]) => ({ entries, queue: [], background: [] })

describe('chatPush', () => {
  it('sends everything the first time, numbered from 1', () => {
    const a = entry('a')
    expect(chatPush('t1', chat([a]))).toMatchObject({ id: 't1', seq: 1, base: 0, from: 0, tail: [a] })
  })

  it('sends only what follows the first entry that is not the one sent', () => {
    const a = entry('a'), b = entry('b'), c = entry('c')
    chatPush('t2', chat([a, b]))
    const b2 = entry('b', 'b, done')
    expect(chatPush('t2', chat([a, b2, c]))).toMatchObject({ seq: 2, base: 1, from: 1, tail: [b2, c] })
    // Nothing changed in the entries: only the queue or the background did.
    expect(chatPush('t2', chat([a, b2, c]))).toMatchObject({ seq: 3, base: 2, from: 3, tail: [] })
  })

  it('starts over from 0 when the chat is emptied, without restarting the numbers', () => {
    chatPush('t3', chat([entry('a')]))
    expect(chatPush('t3', chat([]))).toMatchObject({ seq: 2, base: 1, from: 0, tail: [] })
  })

  it('numbers a snapshot by the last push sent', () => {
    expect(numberedSnapshot('t4', chat([])).seq).toBe(0)
    chatPush('t4', chat([]))
    expect(numberedSnapshot('t4', chat([])).seq).toBe(1)
  })
})
