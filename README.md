# lnsocket-proxy

A simple WebSocket proxy for use with [lnsocket](https://github.com/jb55/lnsocket) in a browser app that is running on https.

The code is inspired by and functions mostly the same as [ln-ws-proxy](https://github.com/jb55/ln-ws-proxy), but with some additional validation, rate limiting and built with [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) for performance.

## Installing Dependencies

`yarn`

## Updating Env Vars

The following env vars will be picked up by the WebSocket server and can be set in your env to modify the defaults:

```
HOST=localhost
PORT=3000
```

You can also add a `RESTRICT_ORIGINS` var if you would like the server to only accept connections from specified origins:

```
RESTRICT_ORIGINS=https://yourapp.com,https://staging.yourapp.com
```

## Starting the server

`yarn start`
