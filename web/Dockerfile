# Build context: repository root.  docker build -f web/Dockerfile .
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=1 HUSKY=0 NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --ignore-scripts
COPY shared shared
COPY web web
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
RUN npm run build -w shared && npm run build -w web

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static web/.next/static
USER node
EXPOSE 3000
CMD ["node", "web/server.js"]
