# Multi-stage hardened build for Standalone Self-Hosted Mailops
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY api/package*.json ./api/
COPY web/package*.json ./web/

# Install dependencies in isolated working directories
WORKDIR /app/api
RUN npm ci --ignore-scripts

WORKDIR /app/web
RUN npm ci --ignore-scripts

# Copy source trees
WORKDIR /app
COPY api ./api
COPY web ./web

# Build client-side assets
WORKDIR /app/web
RUN npm run build

# Production runner with non-root security context
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create application directories and set permissions for node user
RUN mkdir -p /app/data && chown -R node:node /app

COPY --chown=node:node --from=builder /app/api ./api
COPY --chown=node:node --from=builder /app/web/dist ./web/dist

# Switch to unprivileged node user (UID 1000)
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "api/src/server.js"]
