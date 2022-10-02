import { Socket } from 'net'
import { WebSocket } from 'uWebSockets.js'

function handleClose(ws: WebSocket): void {
  ws.closed = true

  // close connection to node
  const { nodeSocket } = ws as WebSocket & { nodeSocket: Socket }
  nodeSocket.removeAllListeners()
  nodeSocket.end()
}

export default handleClose
