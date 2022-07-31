import { WebSocket } from 'uWebSockets.js'

function handleClose(ws: WebSocket): void {
  ws.closed = true
}

export default handleClose
