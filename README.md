# The Intent

A production-ready, intent-matching web app built with React, Vite, TanStack Start, and Supabase. This project is designed to run as a single Node process behind PM2 and a reverse proxy such as Nginx.

## Stack

- Frontend: React + Vite + TanStack Start
- Runtime: Node.js server
- Auth/database: Supabase
- Process manager: PM2
- Hosting model: VPS / cloud VM with Nginx + SSL

## Production startup

```bash
npm install
cp .env.example .env
npm run build
pm2 start ecosystem.config.cjs
```

## PM2 commands

```bash
pm2 start ecosystem.config.cjs
pm2 reload ecosystem.config.cjs
pm2 stop ecosystem.config.cjs
pm2 logs the-intent
```

## Required environment variables

Create a real `.env` file with values like:

```bash
NODE_ENV=production
PORT=5173
HOST=0.0.0.0
NITRO_PRESET=node_server

DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=your-project-id

APP_DOMAIN=https://your-domain.com
```

## Production run notes

- The app listens on port `5173` by default.
- PM2 is the recommended production runner.
- Set `APP_DOMAIN` to your public production URL, not localhost.
- Keep `.env` off Git and use a real Supabase project.
- Nginx should proxy traffic to `127.0.0.1:5173`.

## Local development

```bash
npm install
npm run dev
```

## Build verification

```bash
npm run build
```

This repo is intentionally simplified to a PM2-first deployment model. Legacy Docker and multi-service setup files are no longer the primary production path for the current app.
