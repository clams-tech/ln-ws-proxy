import { HttpResponse, RecognizedString, WebSocket } from 'uWebSockets.js'
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

// patch uWS res so that closing methods always called once and only once
// https://dev.to/mattkrick/replacing-express-with-uwebsockets-48ph
export const safetyPatchRes = (res: HttpResponse): void => {
  if (res._end) {
    throw new Error('already patched')
  }

  res.onAborted(() => {
    res.done = true

    if (res.abortEvents) {
      res.abortEvents.forEach((f: () => void) => f())
    }
  })

  res.onAborted = (handler: () => void) => {
    res.abortEvents = res.abortEvents || []
    res.abortEvents.push(handler)
    return res
  }

  res._end = res.end

  res.end = (body?: RecognizedString) => {
    if (res.done) {
      return res
    }

    res.done = true

    return res._end(body)
  }

  res._close = res.close

  res.close = () => {
    if (res.done) {
      return res
    }

    res.done = true

    return res._close()
  }

  res._tryEnd = res.tryEnd

  res.tryEnd = (fullBodyOrChunk: RecognizedString, totalSize: number) => {
    if (res.done) {
      return [true, true]
    }

    return res._tryEnd(fullBodyOrChunk, totalSize)
  }

  res._write = res.write

  res.write = (chunk: RecognizedString) => {
    if (res.done) {
      return res
    }
    return res._write(chunk)
  }

  res._writeHeader = res.writeHeader

  res.writeHeader = (key: RecognizedString, value: RecognizedString) => {
    if (res.done) {
      return res
    }
    return res._writeHeader(key, value)
  }

  res._writeStatus = res.writeStatus

  res.writeStatus = (status: RecognizedString) => {
    if (res.done) {
      return res
    }
    return res._writeStatus(status)
  }
}
