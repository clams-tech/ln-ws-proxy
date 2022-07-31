import { RateLimiterMemory } from 'rate-limiter-flexible'
import { WebSocket } from 'uWebSockets.js'
import { sendWsResponse } from '../utils'

const messagesRateLimiter = new RateLimiterMemory({
  points: 20, // messages per ip
  duration: 1, // per second
  execEvenly: false, // Do not delay actions evenly
  blockDuration: 0, // Do not block if consumed more than points
  keyPrefix: 'ws-messages-limit-ip' // must be unique for limiters with different purpose
})

async function handleMessage(
  ws: WebSocket,
  message: ArrayBuffer
): Promise<void> {
  const { ip } = ws

  try {
    await messagesRateLimiter.consume(ip)
  } catch {
    sendWsResponse({
      ws,
      status: 429,
      end: true
    })

    return
  }

  ws.nodeSocket.write(Buffer.from(message))
}

export default handleMessage
