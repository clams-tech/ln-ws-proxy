import net, { isIP } from 'net'
import { HttpResponse, HttpRequest, us_socket_context_t } from 'uWebSockets.js'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { arrayBufferToString, safetyPatchRes } from '../utils'
import { Socket } from 'net'
import { RESTRICT_ORIGINS } from '../constants'

const connectionsRateLimiter = new RateLimiterMemory({
  points: 10, // connection attempts
  duration: 1, // per second per ip
  execEvenly: false, // Do not delay actions evenly
  blockDuration: 0, // Do not block if consumed more than points
  keyPrefix: 'ws-connection-limit-ip' // must be unique for limiters with different purpose
})

async function handleUpgrade(
  res: HttpResponse,
  req: HttpRequest,
  context: us_socket_context_t
): Promise<void> {
  safetyPatchRes(res)

  const secWebSocketKey = req.getHeader('sec-websocket-key')
  const secWebSocketProtocol = req.getHeader('sec-websocket-protocol')
  const secWebSocketExtensions = req.getHeader('sec-websocket-extensions')
  const origin = req.getHeader('origin')
  const ip = arrayBufferToString(res.getRemoteAddressAsText())
  const nodeHost = req.getParameter(0)

  if (RESTRICT_ORIGINS && !RESTRICT_ORIGINS.includes(origin)) {
    res.cork(() => {
      if (res.done) return
      res.writeStatus('400 Bad Request').end()
    })

    return
  }

  if (!nodeHost) {
    if (res.done) return

    res.cork(() => {
      res.writeStatus('400 Bad Request').end()
    })

    return
  }

  const [nodeIP, nodePort = '9735'] = nodeHost.split(':')

  if (!isIP(nodeIP)) {
    if (res.done) return

    res.cork(() => {
      res.writeStatus('400 Bad Request').end()
    })

    return
  }

  try {
    await connectionsRateLimiter.consume(ip)
  } catch {
    if (res.done) return

    res.cork(() => {
      res.writeStatus('429 Too Many Requests').end()
    })

    return
  }

  let nodeSocket: Socket

  // create connection to ln node
  try {
    nodeSocket = await new Promise((resolve, reject) => {
      const connection = net.createConnection(parseInt(nodePort), nodeIP)

      connection.on('connect', () => resolve(connection))

      connection.on('error', err => {
        reject(err)
      })
    })
  } catch (error) {
    if (res.done) return

    res.cork(() => {
      res
        .writeStatus('404 Not Found')
        .end((error as { message: string }).message)
    })

    return
  }

  if (res.done) return

  res.cork(() => {
    // upgrade to WebSocket and attach additional data
    res.upgrade(
      {
        origin,
        ip,
        nodeSocket
      },
      secWebSocketKey,
      secWebSocketProtocol,
      secWebSocketExtensions,
      context
    )
  })
}

export default handleUpgrade
