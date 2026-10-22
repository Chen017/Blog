# syntax=docker/dockerfile:1.7

# Stage 1: build Astro site
FROM node:24.13.0-alpine AS builder

WORKDIR /app

RUN corepack enable
ENV NODE_OPTIONS=--no-deprecation

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .
RUN --mount=type=secret,id=umami_api_key \
    UMAMI_API_KEY="$(cat /run/secrets/umami_api_key 2>/dev/null || true)" pnpm build

# Stage 2: serve static files with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN nginx -t

EXPOSE 80
