# ---------------------------------------------------------------------------
# poc-gen — multi-stage production image (Next.js standalone output).
# No Redis, no worker, no queue: one app container + PostgreSQL (compose).
# ---------------------------------------------------------------------------

# 1. Dependencies (cached layer; full toolchain for the Next.js build)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build the standalone server bundle
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A placeholder DATABASE_URL keeps the build hermetic — `next build` performs
# no database connection (the client is lazy), and this value never ships.
RUN DATABASE_URL="postgres://build:build@localhost:5432/build" npm run build

# 3. Migration dependencies only (the standalone trace does not include the
#    database driver; pinned to the lockfile versions)
FROM node:22-alpine AS migrate-deps
WORKDIR /migrate
RUN npm install --no-save --no-audit --no-fund drizzle-orm@0.45.3 postgres@3.4.9

# 4. Runtime (small, non-root, standalone)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone server bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Merge the migration dependencies into the standalone node_modules
COPY --from=migrate-deps --chown=nextjs:nodejs /migrate/node_modules ./node_modules
# Static assets and public files are NOT part of the standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Committed SQL migrations + the runtime entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/src/server/db/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
