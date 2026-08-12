# =============================================================================
# Stage 1: Build — Install deps + compile TypeScript → dist/
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Leverage Docker layer caching: copy only dependency manifests first
COPY package*.json ./
RUN npm ci

# Copy source and build config, then compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# =============================================================================
# Stage 2: Runtime — Minimal production image
# =============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# --- Non-root user for security hardening ---
RUN addgroup -S mcp && \
    adduser -S mcp -u 1001 -G mcp

# --- Copy production artifacts from builder ---
COPY --from=builder /app/dist   ./dist

# Copy node_modules, then strip devDependencies to minimise image size
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev && \
    npm cache clean --force && \
    rm -f package*.json

# --- Runtime ---
USER mcp
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

ENTRYPOINT ["node", "dist/index.js"]

# --- OCI metadata labels ---
LABEL org.opencontainers.image.title="mcp-coolify" \
      org.opencontainers.image.description="Production-grade Coolify MCP Server \u2014 manage Coolify infrastructure via Model Context Protocol" \
      org.opencontainers.image.version="1.0.0"
