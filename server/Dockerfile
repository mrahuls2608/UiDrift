# Build context: repository root.  docker build -f server/Dockerfile .
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=1 HUSKY=0
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --ignore-scripts
COPY shared shared
COPY server server
RUN npm run build -w shared && npm run build -w server

# Production dependencies only, for the server and shared workspaces.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=1 HUSKY=0
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace server --workspace shared --ignore-scripts

FROM node:22-bookworm-slim
# System Chromium + fonts instead of Puppeteer's download; dumb-init reaps Chrome zombies.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji dumb-init ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production CHROME_PATH=/usr/bin/chromium PUPPETEER_SKIP_DOWNLOAD=1
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/dist server/dist
USER node
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
