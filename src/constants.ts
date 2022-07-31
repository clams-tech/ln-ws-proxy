// load env vars
// eslint-disable-next-line
const env = require('dotenv')
env.config()

export const PORT = Number(process.env.PORT)

export const MAX_SOCKET_BACKPRESSURE_BYTES = 1024 * 1024 // 1mb
