# Production VPS deployment

The production workflow deploys `main` to `pocgen.daimooma.com` after the
`CI` workflow succeeds. It can also be started manually from **Actions →
Deploy production VPS → Run workflow**.

The first run installs missing base packages, clones the repository, starts a
private PostgreSQL 16 container, builds and migrates the application, starts
Next.js with PM2, and configures Nginx with a Let's Encrypt certificate. Later
runs use a fast-forward-only pull, rebuild, migrate, and reload PM2.

## Server layout

| Item | Value |
|---|---|
| Application checkout | `/var/www/poc-gen` |
| PM2 process | `poc-gen` |
| Next.js listener | `127.0.0.1:3010` |
| PostgreSQL listener | `127.0.0.1:54329` |
| PostgreSQL volume | `poc_gen_postgres_data` |
| Public URL | `https://pocgen.daimooma.com` |
| Nginx site | `/etc/nginx/sites-available/poc-gen` |

Only Nginx ports 80 and 443 are public. The application and database bind to
loopback.

## One-time server key

Create a dedicated key on your own computer (do not reuse a personal key):

```bash
ssh-keygen -t ed25519 -f poc-gen-github-actions -C poc-gen-github-actions
```

Append `poc-gen-github-actions.pub` to `/root/.ssh/authorized_keys` on the
VPS. Store the complete private key as the GitHub secret
`VPS_SSH_PRIVATE_KEY`. Never commit either the private key or the production
environment file.

## GitHub production secrets

Create a `production` environment in the repository, then add these secrets:

| Secret | Value |
|---|---|
| `VPS_HOST` | `72.61.155.4` |
| `VPS_USER` | `root` |
| `VPS_SSH_PORT` | `22` |
| `VPS_SSH_PRIVATE_KEY` | Complete dedicated private key |
| `LETSENCRYPT_EMAIL` | Email used for certificate expiry notices |
| `PRODUCTION_ENV_FILE` | Complete multiline production environment file |
| `VPS_KNOWN_HOSTS` | Optional pinned SSH host-key line |

Leave automatic deployment disabled while adding the secrets. After the first
manual deployment succeeds, create the repository variable
`DEPLOY_ENABLED=true`; subsequent successful `main` CI runs will deploy
automatically.

For stronger host verification, obtain the public host key from the VPS:

```bash
printf '72.61.155.4 '
cat /etc/ssh/ssh_host_ed25519_key.pub
```

Join those outputs on one line and save the result as `VPS_KNOWN_HOSTS`. If
the secret is absent, the workflow uses `ssh-keyscan` on the first connection
and prints a warning.

Copy `deploy/.env.production.example`, replace every placeholder, and store
the complete contents in `PRODUCTION_ENV_FILE`. GitHub Actions transfers it as
`/var/www/poc-gen/.env.production` with mode `0600`.

Generate the random secrets locally:

```bash
openssl rand -base64 48  # AUTH_SECRET
openssl rand -base64 32  # CONTACT_DATA_ENCRYPTION_KEYS value
openssl rand -base64 36  # POSTGRES_PASSWORD / OPERATOR_PASSWORD
```

If the PostgreSQL password contains reserved URL characters, URL-encode it in
`DATABASE_URL`; keep the raw value in `POSTGRES_PASSWORD`.

## Before the first deployment

1. Point the DNS A record for `pocgen.daimooma.com` to `72.61.155.4`.
2. Ensure inbound TCP 22, 80, and 443 are allowed by the VPS provider.
3. Add the dedicated GitHub Actions public key to the VPS.
4. Add the production GitHub secrets above.
5. Keep `OUTREACH_SEND_ENABLED=false` and `EMAILJS_DRY_RUN=true` for the first
   deployment.
6. Run the workflow manually once and verify the website and a controlled POC
   link before enabling live outreach.

Production MCP remains fail-closed until `MCP_EXPECTED_ISSUER`,
`MCP_EXPECTED_AUDIENCE`, and `MCP_JWKS_URL` point to a real OAuth issuer.

## Useful checks on the VPS

```bash
pm2 status
pm2 logs poc-gen --lines 100
docker ps --filter name=poc-gen-postgres
docker logs --tail 100 poc-gen-postgres
nginx -t
systemctl status nginx --no-pager
```

The deployment refuses to overwrite server-side Git changes and uses
`git pull --ff-only`. If deployment fails before PM2 reload, the currently
running PM2 process is left in place.
