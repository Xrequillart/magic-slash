import { describe, expect, it } from 'vitest'
import WebSocketImpl from 'ws'
import { QuietWebSocket } from './quiet-websocket'

describe('QuietWebSocket', () => {
  // What realtime-js does on disconnect: close while connecting, then drop `onerror`.
  // A plain `ws` throws the resulting error as uncaught, which fails this run.
  it('survives being closed before the handshake, with no handler left', async () => {
    const socket = new QuietWebSocket('ws://127.0.0.1:9')
    socket.close()
    socket.onerror = null
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(socket.readyState).toBe(WebSocketImpl.CLOSED)
  })

  it('still hands errors to the handler that is set', async () => {
    const socket = new QuietWebSocket('ws://127.0.0.1:9')
    const seen = new Promise<string>((resolve) => {
      socket.onerror = (event) => resolve(event.message)
    })
    socket.close()
    await expect(seen).resolves.toMatch(/closed before the connection was established/)
  })
})
