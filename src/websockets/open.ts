import { Socket } from 'net'
import { sendWsResponse } from '../utils'
import { WebSocket } from 'uWebSockets.js'

async function handleOpen(ws: WebSocket): Promise<void> {
  const { nodeSocket } = ws as WebSocket & { nodeSocket: Socket }

  // listen for data from ln node
  nodeSocket.on('data', data => {
    sendWsResponse({ ws, data })
  })

  nodeSocket.on('close', () => {
    ws.close()
  })
}

export default handleOpen
