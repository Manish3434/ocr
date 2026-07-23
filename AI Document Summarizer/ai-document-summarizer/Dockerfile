# ── Stage 1: Build Frontend SPA ──────────────────────────────────────────────
FROM node:20-alpine AS build

ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ── Stage 2: Production Nginx Server ─────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy built SPA assets and custom nginx configuration
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
