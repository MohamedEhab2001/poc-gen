#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

APP_NAME="${APP_NAME:-poc-gen}"
APP_DIR="${APP_DIR:-/var/www/poc-gen}"
APP_PORT="${APP_PORT:-3010}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-}"
DOMAIN="${DOMAIN:-}"
EXPECTED_IP="${EXPECTED_IP:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
ENV_FILE_SOURCE="${ENV_FILE_SOURCE:-/tmp/poc-gen-deploy/.env.production}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_value() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "${name} is required."
}

require_env_key() {
  local name="$1"
  grep -qE "^${name}=.+$" "${ENV_FILE_SOURCE}" || fail "${name} is missing from PRODUCTION_ENV_FILE."
}

render_nginx() {
  local template="$1"
  local destination="$2"
  sed \
    -e "s/__DOMAIN__/${DOMAIN}/g" \
    -e "s/__APP_PORT__/${APP_PORT}/g" \
    "${template}" > "${destination}"
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run this deployment as root; package, Nginx, and PM2 service setup require it."
fi

require_value REPO_URL
require_value DOMAIN
require_value EXPECTED_IP
require_value LETSENCRYPT_EMAIL

[[ "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]] || fail "DOMAIN contains unsupported characters."
[[ "${APP_PORT}" =~ ^[0-9]+$ ]] || fail "APP_PORT must be numeric."
[[ -s "${ENV_FILE_SOURCE}" ]] || fail "The transferred production environment file is missing or empty."

for key in \
  AUTH_SECRET \
  ADMIN_EMAILS \
  NEXT_PUBLIC_SITE_URL \
  SHARE_LINK_BASE_URL \
  MCP_PUBLIC_BASE_URL \
  POSTGRES_DB \
  POSTGRES_USER \
  POSTGRES_PASSWORD \
  POSTGRES_HOST_PORT \
  DATABASE_URL \
  CONTACT_DATA_ENCRYPTION_KEYS \
  CONTACT_DATA_ACTIVE_KEY_ID; do
  require_env_key "${key}"
done

export DEBIAN_FRONTEND=noninteractive
log "Ensuring base server packages are installed."
apt-get update -qq
apt-get install -y -qq ca-certificates curl git nginx certbot >/dev/null

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  log "Allowing SSH and Nginx through the already-active UFW firewall."
  ufw allow OpenSSH >/dev/null
  ufw allow 'Nginx Full' >/dev/null
fi

command -v docker >/dev/null 2>&1 || fail "Docker is required but is not installed."
docker compose version >/dev/null 2>&1 || fail "The Docker Compose plugin is required but is not installed."

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
fi
if (( node_major < 20 )); then
  log "Installing Node.js 22 LTS."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2."
  npm install --global pm2@6 >/dev/null
fi

install -d -m 755 "$(dirname "${APP_DIR}")"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  if [[ -e "${APP_DIR}" ]] && [[ -n "$(find "${APP_DIR}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    fail "${APP_DIR} exists and is not an empty Git repository directory."
  fi
  log "Cloning ${BRANCH} into ${APP_DIR}."
  git clone --branch "${BRANCH}" --single-branch "${REPO_URL}" "${APP_DIR}"
else
  log "Updating the existing checkout with a fast-forward-only pull."
  cd "${APP_DIR}"
  [[ -z "$(git status --porcelain)" ]] || fail "The server checkout has local changes; refusing to overwrite them."
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
fi

install -m 600 "${ENV_FILE_SOURCE}" "${APP_DIR}/.env.production"
cd "${APP_DIR}"

log "Starting the private PostgreSQL container."
docker compose \
  --project-name "${APP_NAME}" \
  --env-file "${APP_DIR}/.env.production" \
  -f "${APP_DIR}/deploy/docker-compose.postgres.yml" \
  up -d

for attempt in $(seq 1 30); do
  postgres_health="$(docker inspect --format '{{.State.Health.Status}}' poc-gen-postgres 2>/dev/null || true)"
  if [[ "${postgres_health}" == "healthy" ]]; then
    break
  fi
  if [[ "${attempt}" -eq 30 ]]; then
    docker logs --tail 80 poc-gen-postgres >&2 || true
    fail "PostgreSQL did not become healthy."
  fi
  sleep 2
done

log "Installing locked dependencies and building Next.js."
npm ci
npm run build

log "Applying database migrations."
DOTENV_CONFIG_PATH="${APP_DIR}/.env.production" npm run db:migrate

if ! pm2 describe "${APP_NAME}" >/dev/null 2>&1 && ss -ltnH "sport = :${APP_PORT}" | grep -q .; then
  fail "Port ${APP_PORT} is already in use by another service."
fi

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  log "Reloading the existing PM2 process."
  pm2 reload "${APP_DIR}/ecosystem.config.cjs" --only "${APP_NAME}" --update-env
else
  log "Starting the PM2 process for the first time."
  pm2 start "${APP_DIR}/ecosystem.config.cjs" --only "${APP_NAME}"
fi
pm2 save --force >/dev/null

if ! systemctl list-unit-files 'pm2-root.service' --no-legend 2>/dev/null | grep -q '^pm2-root.service'; then
  log "Registering PM2 for startup after reboot."
  env PATH="${PATH}" pm2 startup systemd -u root --hp /root >/dev/null
  pm2 save --force >/dev/null
fi

log "Waiting for the local application health check."
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "http://127.0.0.1:${APP_PORT}/login" >/dev/null; then
    break
  fi
  if [[ "${attempt}" -eq 30 ]]; then
    pm2 logs "${APP_NAME}" --lines 80 --nostream >&2 || true
    fail "The application did not pass its local health check."
  fi
  sleep 2
done

install -d -m 755 /var/www/certbot
if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  log "Using the existing Let's Encrypt certificate."
  render_nginx "${APP_DIR}/deploy/nginx-https.conf.template" "${NGINX_SITE}"
else
  resolved_ips="$(getent ahostsv4 "${DOMAIN}" | awk '{print $1}' | sort -u || true)"
  if ! grep -qxF "${EXPECTED_IP}" <<<"${resolved_ips}"; then
    fail "${DOMAIN} does not resolve to ${EXPECTED_IP}; refusing to request a certificate."
  fi

  log "Installing the temporary HTTP Nginx configuration for ACME validation."
  render_nginx "${APP_DIR}/deploy/nginx-http.conf.template" "${NGINX_SITE}"
  ln -sfn "${NGINX_SITE}" "${NGINX_ENABLED}"
  nginx -t
  systemctl enable --now nginx >/dev/null
  systemctl reload nginx

  log "Requesting the first Let's Encrypt certificate."
  certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --domain "${DOMAIN}" \
    --email "${LETSENCRYPT_EMAIL}" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring

  render_nginx "${APP_DIR}/deploy/nginx-https.conf.template" "${NGINX_SITE}"
fi

ln -sfn "${NGINX_SITE}" "${NGINX_ENABLED}"
nginx -t
systemctl enable --now nginx >/dev/null
systemctl reload nginx

if systemctl list-unit-files 'certbot.timer' --no-legend 2>/dev/null | grep -q '^certbot.timer'; then
  systemctl enable --now certbot.timer >/dev/null
fi

curl -fsS --max-time 10 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/login" >/dev/null
log "Deployment completed successfully: https://${DOMAIN}"
