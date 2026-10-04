#!/bin/sh
# Container entrypoint: apply migrations (idempotent), then start the app.
set -e
echo "[entrypoint] applying database migrations…"
node scripts/migrate.mjs
echo "[entrypoint] starting poc-gen…"
exec node server.js
