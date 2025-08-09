# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.20.8
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ARG YARN_VERSION=1.22.22
RUN npm install -g yarn@$YARN_VERSION --force

# Install TOR and supervisor for process management
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    tor \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git node-gyp pkg-config python-is-python3

# Install node modules
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Copy application code
COPY . .

# Build application
RUN yarn run build

# Remove development dependencies
RUN yarn install --production=true

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Create TOR configuration
RUN mkdir -p /etc/tor /var/lib/tor /var/log/tor && \
    chown -R debian-tor:debian-tor /var/lib/tor /var/log/tor

# TOR configuration file
COPY <<EOF /etc/tor/torrc
# TOR configuration for proxy use
SocksPort 0.0.0.0:9050
ControlPort 9051
DataDirectory /var/lib/tor
Log notice file /var/log/tor/tor.log
ExitPolicy reject *:*
EOF

# Supervisor configuration to run both TOR and Node.js
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:tor]
command=/usr/bin/tor -f /etc/tor/torrc
user=debian-tor
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/tor.err.log
stdout_logfile=/var/log/supervisor/tor.out.log

[program:nodejs]
command=yarn run start
directory=/app
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/nodejs.err.log
stdout_logfile=/var/log/supervisor/nodejs.out.log
EOF

# Create startup script
COPY <<EOF /app/start.sh
#!/bin/bash
# Ensure proper permissions
chown -R debian-tor:debian-tor /var/lib/tor /var/log/tor
chmod 700 /var/lib/tor

# Start supervisor which will manage both processes
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /app/start.sh

# Expose both the app port and TOR SOCKS port (though TOR port is internal)
EXPOSE 3000
EXPOSE 9050

# Start both services using supervisor
CMD ["/app/start.sh"]
