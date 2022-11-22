import { safetyPatchRes, get, sendRestResponse } from '../utils'
import { TemplatedApp } from 'uWebSockets.js'

import {
  ACCESS_CONTROL_ALLOW_HEADERS,
  ACCESS_CONTROL_ALLOW_METHODS
} from '../constants'

export function setOptionsHeaders(app: TemplatedApp): void {
  app.options('/*', (res, req) => {
    res.cork(() => {
      res
        .writeStatus('204 No Content')
        .writeHeader('Access-Control-Allow-Origin', req.getHeader('origin'))
        .writeHeader('Access-Control-Allow-Credentials', 'true')
        .writeHeader(
          'Access-Control-Allow-Headers',
          ACCESS_CONTROL_ALLOW_HEADERS
        )
        .writeHeader(
          'Access-Control-Allow-Methods',
          ACCESS_CONTROL_ALLOW_METHODS
        )
        .writeHeader('Content-Length', '0')
        .end()
    })
  })
}

export function restAPI(app: TemplatedApp): void {
  // GET PROXY ENDPOINT
  app.get('/proxy', async (res, req) => {
    safetyPatchRes(res)

    const origin = req.getHeader('origin')
    const url = req.getHeader('target-url')

    try {
      new URL(url)
    } catch (error) {
      sendRestResponse({
        res,
        status: '400 Bad Request',
        origin,
        data: JSON.stringify({ error: 'Invalid URL' })
      })

      return
    }

    const result = await get(url)

    sendRestResponse({
      res,
      status: '200 OK',
      origin,
      data: JSON.stringify(result)
    })
  })
}
