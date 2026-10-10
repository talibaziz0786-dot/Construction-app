# Deployment Runbook (manual steps — code is ready, accounts are not)

> No deployment has been performed by Cline. This file makes the repo
> deployment-ready and lists the exact manual actions the owner must take.

## 0. Preconditions

- MongoDB Atlas account + cluster (see Step 1).
- Render account (backend) + Vercel account (frontend).
- `main` branch pushed to GitHub (both services deploy from the repo).

## 1. MongoDB Atlas

1. Create cluster → database user → allow `0.0.0.0/0` (or Render IPs).
2. Copy the SRV URI (`mongodb+srv://…`).

## 2. Backend — Render (`render.yaml` blueprint included)

1. New Web Service → connect repo → Root Directory: `server`.
2. Build: `npm install && npm run build` · Start: `node dist/server.js`.
3. Health Check Path: `/api/health`.
4. Environment variables (dashboard only — never commit):
   - `MONGODB_URI=<atlas-srv>`
   - `JWT_SECRET=<long-random-string>`
   - `FRONTEND_URL=https://<your-vercel-app>.vercel.app`
   - `NODE_ENV=production`
5. Deploy; verify `GET https://<render-service>/api/health` returns
   `{"status":"ok", …}`.

Startup gate: the server refuses to boot in production when
`MONGODB_URI`, `JWT_SECRET` or `FRONTEND_URL` is missing
(`server/src/server.ts`).

## 3. Frontend — Vercel (`client/vercel.json` SPA rewrite included)

1. Import repo → Root Directory: `client`.
2. Build: `npm install && npm run build` · Output: `dist`.
3. Environment variables:
   - `VITE_API_BASE_URL=https://<render-service>.onrender.com`
   - `VITE_ADSENSE_PUBLISHER_ID=` (optional) · `VITE_ADSENSE_ENABLED=false`.
4. Deploy; verify hub + brick/plaster/concrete/tile calculators work and no
   request points at localhost.

## 4. Mobile — Expo Android (offline-first)

1. `cd apps/mobile` → set `EXPO_PUBLIC_API_BASE_URL` to the Render URL.
2. `npm run offline:parity` (methodology parity) → `npm run validate`.
3. `npx expo export --platform android` (or EAS build for a store APK/AAB).
4. Install on device → test the offline plan in `docs/mobile-offline-test-plan.md`.

## 5. Post-deploy smoke

- Backend: `GET /api/health` → 200 `{status:"ok"}`.
- Web: guest brick calculation; login/logout; unauthorized project access 403.
- Mobile: online calculate → airplane mode → recalculate → restart offline →
  reconnect → sync verified.
