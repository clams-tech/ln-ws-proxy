// load env vars
export const HOST = process.env.HOST || 'localhost'
export const PORT = Number(process.env.PORT) || 3000
export const MAX_SOCKET_BACKPRESSURE_BYTES = 1024 * 1024 // 1mb
export const RESTRICT_ORIGINS =
  process.env.RESTRICT_ORIGINS && process.env.RESTRICT_ORIGINS.split(',')

export const ACCESS_CONTROL_ALLOW_HEADERS =
  'Origin, X-Requested-With, Content-Type, Accept, target-url'

export const ACCESS_CONTROL_ALLOW_METHODS = 'GET, POST, PUT'
