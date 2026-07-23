# ── Stage 1: Build Frontend SPA ──────────────────────────────────────────────
FROM node:20-alpine AS build

ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Stage 2: Production Nginx Server ─────────────────────────────────────────
FROM nginx:1.27-alpine

# Set permissions for unprivileged nginx execution on port 8080
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html

# Copy built SPA assets and custom nginx configuration
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
