import WebSocketImpl from 'ws'

/**
 * `ws`, with an `error` listener that is never removed.
 *
 * WHY: realtime-js's `disconnect()` closes the socket and then, synchronously, sets its
 * `onerror` to null (`_teardownConnection`). When the socket was still CONNECTING, `ws`
 * answers that close with an `error` event ("WebSocket was closed before the connection
 * was established") on the NEXT tick, by which time nobody is listening, and an
 * EventEmitter with no `error` listener throws. In the main process that is an uncaught
 * exception, raised whenever a channel is torn down mid-handshake: a sign-out, a session
 * revoked from another device, a resubscribe after the network came back.
 *
 * The listener only keeps the process alive. The errors realtime-js cares about still
 * reach it through its own `onerror` while it holds one.
 */
export class QuietWebSocket extends WebSocketImpl {
  constructor(...args: ConstructorParameters<typeof WebSocketImpl>) {
    super(...args)
    this.on('error', () => {})
  }
}
