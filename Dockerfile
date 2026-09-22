# Multi-stage hardened build for Standalone Self-Hosted Mailops
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY api/package*.json ./api/
COPY web/package*.json ./web/

# Install dependencies for compilation
WORKDIR /app/api
RUN npm ci --ignore-scripts

WORKDIR /app/web
RUN npm ci --ignore-scripts

# Copy full source trees
WORKDIR /app
COPY api ./api
COPY web ./web

# Build client-side React assets
WORKDIR /app/web
RUN npm run build

# Compile TypeScript API into JavaScript
WORKDIR /app/api
RUN npm run build

# --- Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create persistent storage directory with node user ownership
RUN mkdir -p /app/data && chown -R node:node /app

# Copy production package descriptors and install production-only dependencies
COPY --chown=node:node api/package*.json ./api/
WORKDIR /app/api
RUN npm ci --omit=dev --ignore-scripts

WORKDIR /app

# Copy compiled artifacts from builder stage
COPY --chown=node:node --from=builder /app/api/dist ./api/dist
COPY --chown=node:node --from=builder /app/web/dist ./web/dist

# Switch to unprivileged node user (UID 1000)
USER node

# Expose HTTP Web/API port, plus optional SMTP and IMAP daemon ports
EXPOSE 3000 1025 1143

# Container Healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start standalone Mailops server
CMD ["node", "api/dist/server.js"]
