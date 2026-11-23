# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps

# argon2 requires a C compiler; openssl is needed by Prisma
RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client for the linux-musl target (Alpine)
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

# openssl is required at runtime by the Prisma query engine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# node:20-alpine ships with the `node` user (uid 1000 / gid 1000)
# Keep the CLI dependencies and seed sources available for documented DB commands.
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next

# Copy public assets (favicon, robots.txt, etc.)
COPY --from=build --chown=node:node /app/public           ./public

# Persistent upload directory (mounted as a volume in compose)
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
