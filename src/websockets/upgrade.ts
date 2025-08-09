import net from 'net'
import { HttpResponse, HttpRequest, us_socket_context_t } from 'uWebSockets.js'
import { SocksClient, SocksClientOptions } from 'socks'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { arrayBufferToString, safetyPatchRes } from '../utils'
import { Socket } from 'net'
import { RESTRICT_ORIGINS } from '../constants'

import {
  SocksCommandOption,
  SocksProxyType
} from 'socks/typings/common/constants'

const connectionsRateLimiter = new RateLimiterMemory({
  points: 10, // connection attempts
  duration: 1, // per second per ip
  execEvenly: false, // Do not delay actions evenly
  blockDuration: 0, // Do not block if consumed more than points
  keyPrefix: 'ws-connection-limit-ip' // must be unique for limiters with different purpose
})

function isTor(address: string): boolean {
  return address.endsWith('.onion')
}

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

  const torProxyHost = process.env.TOR_PROXY_HOST || 'localhost'
  const torProxyPort = process.env.TOR_PROXY_PORT || '9050'

  if (RESTRICT_ORIGINS && !RESTRICT_ORIGINS.includes(origin)) {
    res.cork(() => {
      if (res.done) return
      res.writeStatus('400 Bad Request').end('Invalid origin')
    })

    return
  }

  if (!nodeHost) {
    if (res.done) return

    res.cork(() => {
      res
        .writeStatus('400 Bad Request')
        .end('Invalid node host, must be a valid IP or Domain')
    })

    return
  }

  const [hostname, nodePort = '9735'] = nodeHost.split(':')

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

  if (isTor(hostname)) {
    // create Tor connections
    const commandOption: SocksCommandOption = 'connect'
    const proxyType: SocksProxyType = 5

    const sockOptions: SocksClientOptions = {
      proxy: {
        host: torProxyHost,
        port: parseInt(torProxyPort),
        type: proxyType
      },
      command: commandOption,
      destination: {
        host: hostname,
        port: parseInt(nodePort)
      }
    }

    const connection = await SocksClient.createConnection(sockOptions)
    nodeSocket = connection.socket
  } else {
    try {
      nodeSocket = await new Promise((resolve, reject) => {
        const connection = net.createConnection(parseInt(nodePort), hostname)

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
