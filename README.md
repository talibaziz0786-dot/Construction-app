# Construction Estimator

A professional construction estimation and home-planning platform that helps homeowners and contractors calculate material quantities, costs, and Bill of Quantities (BOQ) for house construction projects.

## Status
Production-ready. Phase 0 complete.

## Technology Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4
- **Backend**: Node.js, Express 5, TypeScript, MongoDB, Mongoose

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)

### Development

```bash
npm install
npm run dev   # Client: http://localhost:5173 | Server: http://localhost:3000
```

### Production Build

```bash
npm run build      # Build client and server
npm run type-check # TypeScript check
npm test           # Server tests (44 tests)
```

---

## Deployment Overview

```
Browser → Vercel (Frontend) → Render (Backend) → MongoDB Atlas
```

### Step 1: MongoDB Atlas

1. Create a cluster at mongodb.com
2. Create a database user
3. Whitelist IP `0.0.0.0/0`
4. Copy the SRV connection string

### Step 2: Backend (Render)

1. New Web Service → Connect GitHub repo
2. Root Directory: `server`
3. Build: `npm install && npm run build`
4. Start: `node dist/server.js`
5. Environment variables:

```
MONGODB_URI=<your-atlas-srv>
JWT_SECRET=<long-random-string>
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Step 3: Frontend (Vercel)

1. Import repo → Root Directory: `client`
2. Build: `npm install && npm run build`
3. Output: `dist`
4. Environment variables:

```
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_ADSENSE_PUBLISHER_ID=    # optional
VITE_ADSENSE_ENABLED=false    # set true after AdSense approval
```

### Step 4: Verify

- `GET /api/health` returns `200 {"status":"ok"}`
- Signup/login/project creation flow works
- BOQ export and 2D/3D visualization load
- No CORS errors, no localhost URLs in production

---

## Environment Variables

**Server (`server/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas SRV string |
| `JWT_SECRET` | Yes | Long random string for JWT signing |
| `FRONTEND_URL` | Yes | Frontend origin(s) for CORS (comma-separated) |
| `PORT` | No | Default 3000 |
| `NODE_ENV` | No | `production` in prod |

**Client (`client/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No | Backend URL (default: `/api` same-origin) |
| `VITE_ADSENSE_PUBLISHER_ID` | No | AdSense publisher ID |
| `VITE_ADSENSE_ENABLED` | No | Set `true` to enable live ads |

---

## Important Rules
- Calculation methodology must be verified before implementation.
- Refer to `.clinerules/00-project-rules.md` for project guidelines.
- Do NOT hard-code secrets — use environment variables only.
- Do NOT commit `.env` files — they are in `.gitignore`.