import { WebSocket } from 'uWebSockets.js'
import { filter, take } from 'rxjs/operators'
import { webSocketDrain$ } from './streams'
import { MAX_SOCKET_BACKPRESSURE_BYTES } from './constants'

export const sendWsResponse = ({
  ws,
  data,
  end,
  status
}: {
  ws: WebSocket
  data?: ArrayBuffer
  end?: boolean
  status?: number
}): void => {
  if (ws.closed) return

  if (ws.getBufferedAmount() >= MAX_SOCKET_BACKPRESSURE_BYTES - 1024 * 3) {
    // Too much backpressure, wait until backpressure goes under limit to send message
    webSocketDrain$
      .pipe(
        filter(
          (currentPressure: number) =>
            currentPressure < MAX_SOCKET_BACKPRESSURE_BYTES - 1024 * 3
        ),
        take(1)
      )
      .subscribe(() => {
        if (ws.closed) return

        ws.cork(() => {
          data && ws.send(data, true)
          end && status && ws.end(status)
        })
      })
  } else {
    ws.cork(() => {
      data && ws.send(data, true)
      end && status && ws.end(status)
    })
  }
}

export function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}
