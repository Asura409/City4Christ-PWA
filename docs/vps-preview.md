# Combined preview on the Hostinger VPS

The preview serves the React app and the API from one CyberPanel/OpenLiteSpeed
website:

```text
https://pwa.city4christ.org/          -> /home/pwa.city4christ.org/public_html
https://pwa.city4christ.org/api/*     -> 127.0.0.1:3000
https://pwa.city4christ.org/health/*  -> 127.0.0.1:3000
```

This removes the cross-site cookie problem. The refresh cookie, Google callback,
WebSocket connection and service worker are all first-party.

Do **not** install Caddy on this VPS. CyberPanel owns ports 80 and 443 through
OpenLiteSpeed (`lsws`).

## 1. DNS and CyberPanel site

In Hostinger hPanel → DNS Zone Editor, add:

```text
Type: A
Name: pwa
Value: 31.220.111.181
TTL: 300
```

The subdomain user is `pwaci4903`. Confirm its docroot:

```bash
ls -la /home/pwa.city4christ.org/public_html
```

The frontend uses a release directory and an atomic symlink:

```bash
cd /home/pwa.city4christ.org
mkdir -p releases
if [ -d public_html ] && [ ! -L public_html ]; then
  mv public_html public_html.initial
fi
ln -sfn current public_html
```

Each deploy writes `releases/<commit-sha>`, keeps the previous release, merges
the old hashed assets into the new release, then switches `current` atomically.
Tabs that loaded the old `index.html` can still request their old asset hashes.

Issue or confirm SSL for the site in CyberPanel before testing sign-in; cookies
require HTTPS.

## 2. Frontend deploy user

Use `pwaci4903` or create a dedicated static deploy account with write access to
`/home/pwa.city4christ.org/public_html` and `releases`. Do not use the backend
deploy receiver account for interactive uploads.

Create a GitHub Actions key on a trusted machine:

```bash
ssh-keygen -t ed25519 -f preview-actions -C github-actions-preview -N ''
```

Install the public key for the selected user:

```bash
install -d -m 700 ~/.ssh
cat preview-actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Prepare the host-key line for `VPS_SSH_KNOWN_HOSTS`:

```bash
ssh-keyscan -H -t ed25519 31.220.111.181 > known_hosts
ssh-keygen -lf known_hosts
```

## 3. GitHub Actions setup

In the frontend repository, create an environment named `vps-preview`.

Variables:

| Variable | Value |
| --- | --- |
| `VPS_HOST` | `31.220.111.181` |
| `VPS_USER` | The SSH user with write access, e.g. `pwaci4903` |
| `VPS_PATH` | `/home/pwa.city4christ.org` |
| `MEDIA_ORIGIN` | The private R2 HTTPS origin |

Secrets:

| Secret | Value |
| --- | --- |
| `VPS_SSH_PRIVATE_KEY` | Private `preview-actions` key |
| `VPS_SSH_KNOWN_HOSTS` | Verified host-key line |

The workflow is `.github/workflows/deploy-vps-frontend.yml`. It builds with
`API_URL=/`, uploads each commit to `releases/<sha>`, merges the previous
hashed assets, then switches the `current` symlink. A failed upload leaves the
previous release active.

## 4. CyberPanel/OpenLiteSpeed proxy

In CyberPanel, open the `pwa.city4christ.org` website → **vHost Conf**, and
append the blocks from
[`deploy/vps/openlitespeed-vhost.conf`](../deploy/vps/openlitespeed-vhost.conf).
They add:

- a proxy to `127.0.0.1:3000`
- `/api/` and `/health/` contexts

Do not replace the existing `docRoot`, SSL, or rewrite settings.

Validate and restart OpenLiteSpeed:

```bash
/usr/local/lsws/bin/openlitespeed -t
systemctl restart lsws
```

Open ports 80 and 443 in the VPS firewall. The API must remain bound to
`127.0.0.1:3000`; do not expose port 3000 directly.

OpenLiteSpeed forwards the proxy connection; test `/api/v1/realtime` after the
first deploy. If the WebSocket does not upgrade, the realtime proxy context may
need to be adjusted separately from the normal API context.

## 5. Backend environment

In `~/.config/city4christ/api.env` on the VPS, change:

```dotenv
APP_ORIGIN=https://pwa.city4christ.org
CORS_ORIGINS=https://pwa.city4christ.org
REFRESH_COOKIE_SAME_SITE=lax
```

Set `TRUSTED_PROXY_CIDRS` to the source address the API container sees from
OpenLiteSpeed. Start with `127.0.0.1/32` if that is the observed address;
otherwise use the actual Docker gateway CIDR. Never use `0.0.0.0/0`.

Keep the existing `DATABASE_URL`, `VERIFICATION_KEY_BASE64`, Google credentials,
R2 settings and email-worker settings.

Because `APP_ORIGIN` is now the combined host, register this exact Google OAuth
redirect URI:

```text
https://pwa.city4christ.org/api/v1/auth/google/callback
```

Redeploy the API through its existing `hostinger-vps` workflow, then check:

```bash
curl -fsS https://pwa.city4christ.org/health/ready
```

## 6. Media storage

Add this exact origin to the R2 bucket CORS policy, alongside any existing
origins:

```text
https://pwa.city4christ.org
```

The frontend workflow gets `MEDIA_ORIGIN` from the `vps-preview` environment
variable, so the generated CSP allows signed R2 media.

## 7. Verify

1. Open `https://preview.city4christ.org`.
2. Sign in with email/password and Google.
3. Confirm the refresh cookie is on `preview.city4christ.org` and
   `POST /api/v1/auth/refresh` returns 200.
4. Reload and wait past the access-token lifetime; you should remain signed in.
5. Open group chat and confirm the WebSocket connects.
6. Check the community feed, media images and service worker update.
7. Test on an iPhone.

## Rollback

Redeploy the previous commit with the workflow, or restore the previous static
files in `public_html`. If you return to the Vercel setup, also restore the
previous `APP_ORIGIN`, `CORS_ORIGINS` and `REFRESH_COOKIE_SAME_SITE` values, then
redeploy the API. Keep the Vercel deployment until the VPS preview has passed
sign-in, Google, realtime and media checks.
