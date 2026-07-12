# Deploying "The Intent" to a Hostinger KVM2 VPS

This app is a TanStack Start (React 19 + Vite) application. For **your own server**
it builds to a plain **Node server** (Nitro `node_server` preset) and talks to
**your own Supabase project**.

Everything you need is in this `deploy/` folder plus `.env.production.example`
at the project root.

---

## 0. What you need

- A Hostinger KVM2 VPS (Ubuntu 22.04/24.04).
- Your Supabase project (already referenced in `.env.production.example`).
- A domain pointed at the VPS IP (optional but recommended for HTTPS).

---

## 1. Load the database schema into YOUR Supabase

Run the schema once against your Supabase Postgres. From your laptop or the VPS:

```bash
psql "postgresql://postgres.laxyyifsboedsccqnfhc:<DB_PASSWORD>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  -f deploy/schema.sql
```

This creates `intents`, `rooms`, `room_messages`, `audit_logs`, `waitlist`
with RLS, grants, indexes, and realtime — the exact schema the app expects.

> Enable **Email** auth (and Google if you want it) in your Supabase project's
> Auth settings, and add your domain to the allowed redirect URLs.

---

## 2. Prepare the VPS

```bash
sudo apt update && sudo apt install -y nginx git
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Get the code + env

```bash
sudo mkdir -p /var/www/the-intent && sudo chown -R $USER /var/www/the-intent
cd /var/www/the-intent
# copy your project here (git clone / scp / rsync)

cp .env.production.example .env
# edit .env: set APP_DOMAIN to your domain. Supabase values are already yours.
```

---

## 4. Build (Node preset)

The `VITE_*` values must be present at build time — they are baked into the
client bundle. `.env` already contains them; export them for the build:

```bash
set -a; source .env; set +a
npm install
npm run build          # NITRO_PRESET=node_server from .env produces .output/
```

The result is a self-contained server at `.output/server/index.mjs`.

---

## 5. Run it — pick ONE

### A) systemd (recommended)
```bash
sudo cp deploy/the-intent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now the-intent
sudo systemctl status the-intent
```

### B) PM2
```bash
sudo npm i -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup
```

### C) Docker
```bash
cd /var/www/the-intent
docker compose -f deploy/docker-compose.yml up -d --build
```

The app now listens on `http://127.0.0.1:8080`.

---

## 6. Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/the-intent
# edit server_name to your domain
sudo ln -s /etc/nginx/sites-available/the-intent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 7. Verify end to end

1. Open `https://your-domain.com` → landing page loads.
2. Sign up / sign in → redirected to the dashboard.
3. Declare an intent → policy engine responds, feed updates in realtime.
4. Two accounts declaring the same intent → a room forms; chat is live.
5. `/audit` shows the hash-chained trail.

---

## Updating later

```bash
cd /var/www/the-intent && git pull
set -a; source .env; set +a
npm install && npm run build
sudo systemctl restart the-intent   # or: pm2 restart the-intent
```

---

## Voice/Video calls on restrictive networks (optional TURN)

Calls use WebRTC with Google STUN by default. Users behind strict/corporate
NAT may fail to connect peer-to-peer. To fix this, add a TURN relay:

1. Get a TURN server (self-hosted `coturn`, or a provider like Twilio,
   Metered, or Cloudflare Calls).
2. Fill these in `.env` **before** `npm run build` (they are baked into the
   client bundle):
   ```
   VITE_TURN_URL=turn:turn.your-domain.com:3478
   VITE_TURN_USERNAME=your-username
   VITE_TURN_CREDENTIAL=your-credential
   ```
   `VITE_TURN_URL` also accepts a comma-separated list
   (e.g. `turn:host:3478,turns:host:5349`).
3. Rebuild. Leaving them blank keeps STUN-only behavior.

The incoming/outgoing ringing tone is served from `/ringtone.mp3` and is
downloadable from the call panel.

## Notes

- `SUPABASE_SERVICE_ROLE_KEY` in `.env` holds your Supabase **secret** key
  (`sb_secret_...`); the server-side admin client uses it. Never expose it to
  the browser — it is only read in server code.
- Keep `.env` out of version control.
- Health/logs: `sudo journalctl -u the-intent -f` (systemd) or
  `pm2 logs the-intent`.
