# ── Stage 1: Build Dependencies ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build tools required by canvas & native dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    giflib-tools \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install production dependencies
RUN (npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund) && npm cache clean --force

# ── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install runtime libraries for canvas and poppler-utils for pdf-poppler
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    librsvg2-2 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user (Debian style)
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

# Copy installed dependencies and application files
COPY --chown=appuser:appgroup --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Ensure uploads directory exists with correct ownership
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

USER appuser
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
