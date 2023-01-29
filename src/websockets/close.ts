import { Socket } from 'net'
import { connections$ } from '../streams'
import { WebSocket } from 'uWebSockets.js'

function handleClose(ws: WebSocket): void {
  ws.closed = true

  // close connection to node
  const { nodeSocket } = ws as WebSocket & { nodeSocket: Socket }
  nodeSocket.removeAllListeners()
  nodeSocket.destroy()
  connections$.next(connections$.value - 1)
  console.log(`connections: ${connections$.value}`)
}

export default handleClose
