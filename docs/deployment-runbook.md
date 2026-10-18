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
4. Environment variables (dashboard only — never commit; values below are
   exact origins, not secrets):
   - `MONGODB_URI=<atlas-srv>`
   - `JWT_SECRET=<long-random-string>`
   - `FRONTEND_URL=https://construction-app-tan.vercel.app` — comma-separated
     allowlist (parser: split on `,`, trim, drop empties; confirmed in
     `server/src/app.ts` `parseAllowedOrigins`). To also list a second origin,
     use `https://construction-app-tan.vercel.app,https://www.example.com`
     (no spaces required, no wildcard). Missing/malformed value fails closed:
     cross-origin requests are denied and only the origin count is logged.
   - `FRONTEND_ALLOW_VERCEL_PREVIEW=` unset (default allow) or `false` to deny
     previews. When allowed, only the anchored project/team rule matches:
     `^https://construction-[hash]-talibaziz0786-dots-projects.vercel.app$`
     — arbitrary `*.vercel.app` is never allowed.
   - `NODE_ENV=production`
5. Deploy; verify `GET https://<render-service>/api/health` returns
   `{"status":"ok", …}`.

Startup gate: the server refuses to boot in production when
`MONGODB_URI`, `JWT_SECRET` or `FRONTEND_URL` is missing
(`server/src/server.ts`).

## 3. Frontend — Vercel (`client/vercel.json` SPA rewrite included)

1. Import repo → Root Directory: `client`.
2. Build: `npm install && npm run build` · Output: `dist`.
3. Environment variables (client API base key is `VITE_API_BASE_URL` — the
   single source is `client/src/services/apiBase.ts`; `VITE_`-prefixed so Vite
   inlines it at build time):
   - `VITE_API_BASE_URL=https://construction-app-qqlp.onrender.com` (no
     trailing slash, no `/api` suffix — `apiBase.ts` appends `/api`; do NOT
     assume any other key name)
   - `VITE_ADSENSE_PUBLISHER_ID=` (optional) · `VITE_ADSENSE_ENABLED=false`.
4. Deploy; verify hub + brick/plaster/concrete/tile calculators work and no
   request points at localhost. Confirm the production build targets Render:
   open DevTools → Network → a `/api/calculators` request must show
   `https://construction-app-qqlp.onrender.com/api/calculators`, not `/api`.
   NOTE: `client/dist/` is gitignored build output, so the check must be done
   on the deployed Vercel build (or a fresh local `npm run build`), not on a
   stale `dist` folder.

### 3a. `/site.webmanifest` → Vercel SSO redirect (separate from API CORS)

Symptom: opening `/site.webmanifest` in a browser lands on a Vercel SSO/login
endpoint instead of the manifest JSON. This is NOT a backend CORS failure —
CORS only governs `fetch()`/XHR from JS; direct navigations never send an
`Origin` preflight. Evidence that they are separate:

- The blocked API call has `Origin: https://construction-<preview>.vercel.app`
  and misses `Access-Control-Allow-Origin` on
  `https://construction-app-qqlp.onrender.com/api/calculators`.
- The manifest request is same-origin (`/site.webmanifest` on the Vercel host)
  and receives a 302/SSO redirect from Vercel itself.

Repo state inspected (no app-code change made, per instruction not to treat
the manifest fetch as a backend-CORS fix):

- `client/index.html` references `/site.webmanifest` (standard PWA link).
- `client/public/site.webmanifest` exists (437 bytes) and ships to `dist/`.
- Root `vercel.json` + `client/vercel.json` both contain a catch-all rewrite
  `{ "source": "/(.*)", "destination": "/index.html" }` — a static file in
  `public/` normally takes precedence, but if the deployment's Root Directory
  is the repo root instead of `client`, the rewrite can shadow static assets.

Separate resolution (Vercel dashboard only, no code change):

1. Vercel project → Settings → General → Root Directory must be `client`.
2. Vercel project → Settings → Deployment Protection → disable
   "Vercel Authentication"/SSO (or add yourself to the access group) for the
   preview deployment, then open `/site.webmanifest` in an incognito window.
3. Redeploy the preview and confirm `/site.webmanifest` returns 200
   `application/manifest+json` instead of a 302 to SSO.

## 4. Mobile — Expo Android (offline-first)

1. `cd apps/mobile` → set `EXPO_PUBLIC_API_BASE_URL` to the Render URL.
2. `npm run offline:parity` (methodology parity) → `npm run validate`.
3. `npx expo export --platform android` (or EAS build for a store APK/AAB).
4. Install on device → test the offline plan in `docs/mobile-offline-test-plan.md`.

## 5. Post-deploy smoke

- Backend: `GET /api/health` → 200 `{status:"ok"}`.
- Web: guest brick calculation; login/logout; unauthorized project access 403.
- CORS live check (from the PRODUCTION domain only —
  `https://construction-app-tan.vercel.app`, never from a preview when
  validating prod): open DevTools → Console must show no
  "No Access-Control-Allow-Origin" error on `/api/calculators`; Network →
  response headers must show
  `Access-Control-Allow-Origin: https://construction-app-tan.vercel.app` and
  `Access-Control-Allow-Credentials: true` (never `*`).
- Mobile: online calculate → airplane mode → recalculate → restart offline →
  reconnect → sync verified.

> Scope note: local `vitest`/`tsc`/`vite build` passing proves the code fix is
> sound, not that the live Render/Vercel hosts serve it — only the checks
> above (run against `https://construction-app-tan.vercel.app` +
> `https://construction-app-qqlp.onrender.com`) prove the hosted fix.
