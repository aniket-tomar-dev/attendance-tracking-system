# Gym Attendance (WhatsApp + React owner panel)

Members scan a QR, WhatsApp marks attendance and replies. Owners use a React panel or WhatsApp commands
(`ADD`, `TODAY`, `CUSTOMERS`, `ABSENT`, `HISTORY`, `PROGRESS`, `HELP`). One service layer powers both.

## Run locally
```bash
docker compose up -d                       # Postgres
cp apps/api/.env.example apps/api/.env     # edit JWT_SECRET
npm install
npm run migrate && npm run seed            # demo gym DEMO01, login demo@gym.test / password123
npm run dev:api                            # :4000
npm run dev:web                            # :5173 (proxies /api)
npm test                                   # phone, streak, milestone unit tests
```
Without `WHATSAPP_TOKEN`, replies are logged to the API console ("dry-run"), so you can test locally:
```bash
curl -X POST localhost:4000/api/webhook/whatsapp -H 'Content-Type: application/json' -d \
'{"entry":[{"changes":[{"value":{"messages":[{"id":"t1","from":"919800000001","type":"text","text":{"body":"CHECKIN DEMO01"}}]}}]}]}'
```

## Connect WhatsApp
1. Create a Meta app with WhatsApp Cloud API and a dedicated business number (not one used in the normal app).
2. Expose the API (ngrok/Render). Webhook URL: `https://<host>/api/webhook/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`; subscribe to `messages`.
3. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`.
4. Register your gym with that number; download the QR from **Gym & QR**.

## Deploy
API: any Node host (`npm -w apps/api start`), set env vars, `NODE_ENV=production`, run `npm run migrate` once.
Web: `npm -w apps/web run build`, host `apps/web/dist` (SPA fallback to index.html); set `VITE_API_URL=https://<api>/api` and `WEB_ORIGIN` on the API. Cookies need same-site hosting or a shared parent domain.

## Assumptions
- REST endpoints are under `/api` (PRD paths + prefix). API runs through `tsx` so the shared TS package needs no build step.
- Owner phone in registration is the WhatsApp number used for owner commands; gym code is auto-generated.
- Streak counts today or yesterday as live; a missed day resets it. Milestones fire at every 10 total days.
- Not included in this first cut: frontend tests, API integration tests (tenant isolation, webhook idempotency), customer name/phone edit UI (API supports it).
