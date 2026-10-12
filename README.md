# Unified Inbox — WhatsApp + Gmail Integration

> **Intern assignment demo.** A single-user local web app that integrates WhatsApp (via QR scan) and Gmail (via OAuth 2.0) into a unified inbox inspired by Turia's communication tab.

---

## What It Is

<!-- TODO Step 30: fill in full description -->

## Architecture

```
 Browser (Next.js app, :3000)
   |-- Redux store (connections, whatsapp, email slices)
   |-- socket.io-client  ----------------------->  WA server (Node, :4000)
   |                                                 |-- whatsapp-web.js (Chromium) <-> user's phone
   |-- fetch /api/...  -->  Next.js route handlers (:3000)
                              |-- googleapis (OAuth2 + Gmail API) <-> Google
                              |-- tokens in httpOnly cookie (iron-session)
```

## Prerequisites

<!-- TODO Step 30: Google Cloud Console steps -->

## Install & Run

```bash
# Terminal 1 — WhatsApp server
cd server
cp .env.example .env        # then fill in PORT and WEB_ORIGIN
npm install --legacy-peer-deps
npm run dev

# Terminal 2 — Next.js app
cd web
cp .env.local.example .env.local   # then fill in Google credentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `web/.env.local` | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `web/.env.local` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | `web/.env.local` | Must be `http://localhost:3000/api/auth/google/callback` |
| `SESSION_SECRET` | `web/.env.local` | Random 32+ char string for iron-session encryption |
| `NEXT_PUBLIC_WA_SERVER_URL` | `web/.env.local` | `http://localhost:4000` |
| `PORT` | `server/.env` | `4000` |
| `WEB_ORIGIN` | `server/.env` | `http://localhost:3000` |


