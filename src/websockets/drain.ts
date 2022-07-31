import { WebSocket } from 'uWebSockets.js'
import { webSocketDrain$ } from '../streams'

function handleDrain(ws: WebSocket): void {
  const currentBackpressureBytes = ws.getBufferedAmount()
  webSocketDrain$.next(currentBackpressureBytes)
}

export default handleDrain
