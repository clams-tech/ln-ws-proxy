# lnsocket-proxy

A simple WebSocket proxy for use with [lnsocket](https://github.com/jb55/lnsocket) in a browser app that is running on https.

The code is inspired by and functions mostly the same as [ln-ws-proxy](https://github.com/jb55/ln-ws-proxy), but with some additional validation, rate limiting and built with [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) for performance.

## Installing Dependencies

`yarn`

## Updating Env Vars

The WebSocket server is setup to run on port 3000, but can be modified by creating a .env file and placing it in the root directory with the following var:

```
HOST=localhost
PORT=3000
```

## Starting the server

`yarn start`
