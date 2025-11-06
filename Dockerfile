# Multi-stage build for MacCamera
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY renderer/package*.json ./renderer/

# Install dependencies
RUN npm install
RUN cd renderer && npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Install FFmpeg and X11 dependencies for GUI
RUN apk add --no-cache \
    ffmpeg \
    chromium \
    mesa-gl \
    mesa-dri-gallium \
    libx11 \
    libxext \
    libxrender \
    libxtst \
    libxi \
    libxrandr \
    libxcursor \
    libxcomposite \
    libxdamage \
    libxfixes \
    libxinerama \
    libxshmfence \
    alsa-lib \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    terminus-font \
    dbus-x11 \
    xvfb

# Create non-root user
RUN addgroup -g 1000 maccamera && \
    adduser -D -u 1000 -G maccamera maccamera

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/renderer/build ./renderer/build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create recordings directory
RUN mkdir -p /app/recordings && \
    chown -R maccamera:maccamera /app

USER maccamera

# Expose display for X11 forwarding
ENV DISPLAY=:99
ENV ELECTRON_DISABLE_SANDBOX=1

# Start script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

VOLUME ["/app/recordings"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
