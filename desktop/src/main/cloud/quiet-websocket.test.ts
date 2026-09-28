import { describe, expect, it, vi } from 'vitest'

/**
 * `ws` is a desktop dependency, and CI's test job installs the root's only: like every
 * other main-process test, this one runs against a stand-in. It reproduces the one
 * behaviour the fix is about: closing a socket that is still CONNECTING emits `error` on
 * the next tick, and an EventEmitter with no `error` listener throws it (see `ws`'s
 * `abortHandshake`).
 */
const { FakeWebSocket } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('events') as typeof import('events')
  class FakeWebSocket extends EventEmitter {
    onerror: ((error: Error) => void) | null = null
    constructor(..._args: unknown[]) {
      super()
      // `ws` routes `onerror` through a listener of its own; so does this.
      this.on('error', (error: Error) => this.onerror?.(error))
      this.removeAllListeners('error')
    }
    close() {
      process.nextTick(() => {
        const error = new Error('WebSocket was closed before the connection was established')
        this.onerror?.(error)
        this.emit('error', error)
      })
    }
  }
  return { FakeWebSocket }
})

vi.mock('ws', () => ({ default: FakeWebSocket }))

const { QuietWebSocket } = await import('./quiet-websocket')

describe('QuietWebSocket', () => {
  it('reproduces the crash with the plain socket', async () => {
    const plain = new FakeWebSocket()
    const thrown = new Promise<unknown>((resolve) => {
      const original = plain.emit.bind(plain)
      plain.emit = (event: string, ...args: unknown[]) => {
        try {
          return original(event, ...args)
        } catch (error) {
          resolve(error)
          return false
        }
      }
    })
    plain.close()
    await expect(thrown).resolves.toMatchObject({ message: expect.stringMatching(/closed before/) })
  })

  // What realtime-js does on disconnect: close while connecting, then drop `onerror`.
  it('survives being closed before the handshake, with no handler left', async () => {
    const socket = new QuietWebSocket('ws://127.0.0.1:9')
    socket.close()
    socket.onerror = null
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(socket.listenerCount('error')).toBe(1)
  })

  it('still hands errors to the handler that is set', async () => {
    const socket = new QuietWebSocket('ws://127.0.0.1:9')
    const seen = new Promise<string>((resolve) => {
      socket.onerror = (error) => resolve((error as unknown as Error).message)
    })
    socket.close()
    await expect(seen).resolves.toMatch(/closed before the connection was established/)
  })
})
