# syntax=docker/dockerfile:1

# Debian, not Alpine: bcrypt ships no prebuilt binary for musl.
FROM node:26-bookworm-slim AS base
# Prisma's migration engine needs OpenSSL.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# ---- build: compile TypeScript and generate the Prisma client ----
FROM base AS build
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime: production dependencies + compiled code only ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# prisma stays installed: the container applies pending migrations on start.
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]
