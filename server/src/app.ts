import express, { Request, Response, NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';

import calculatorRoutes from './modules/estimation/routes/calculatorRoutes.js';
import projectRoutes from './modules/project/routes/projectRoutes.js';
import projectCalculate from './modules/project/routes/projectCalculate.js';
import authRoutes from './auth/auth.routes.js';
import protectedProjectRoutes from './modules/project/routes/protectedProjectRoutes.js';
import { EstimationOrchestrator } from './modules/estimation/engine/orchestration/EstimationOrchestrator.js';
import { registerCanonicalCalculators } from './modules/estimation/calculators/canonicalCalculators.js';

const app = express();

// Register every verified calculator once per process. Routes never register calculators.
registerCanonicalCalculators(EstimationOrchestrator.getInstance());

// --- CORS origin allowlist ---
// Production: configure FRONTEND_URL as a comma-separated list of allowed origins
// (e.g. "https://construction-app-tan.vercel.app,https://www.your-domain.com").
// Parser: split on ',', trim whitespace, drop empties. Verified comma-separated
// support lives here — Render FRONTEND_URL must use this exact format.
// Development: defaults to http://localhost:5173 plus its loopback-alias
// http://127.0.0.1:5173 (same machine, same port — browsers treat these as
// different origins, so both must be accepted or calculator POSTs from the
// alias are rejected before reaching the route).
function parseAllowedOrigins(raw: string | undefined): string[] {
  if (raw === undefined) {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  const parsed = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (parsed.length === 0) {
    // Malformed/empty env: fail closed (deny cross-origin) instead of falling
    // back to localhost in production. Never log raw values (may be echoed in
    // dashboards); log only the count.
    console.warn('[cors] FRONTEND_URL is set but parsed to 0 origins — denying cross-origin requests');
    return [];
  }
  return [...new Set(parsed)];
}

const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);
if (allowedOrigins.length > 0) {
  console.log(`[cors] allowlist configured with ${allowedOrigins.length} exact origin(s)`);
}

// --- Vercel preview origins (anchored, project/team restricted) ---
// Allows the current preview workflow origin shape:
//   https://construction-<hash>-talibaziz0786-dots-projects.vercel.app
// Anchored (^…$) and restricted to this project ("construction-") and this
// team/user scope ("-talibaziz0786-dots-projects"). This is NOT an arbitrary
// "*.vercel.app" allow — any other team/project (attacker) still fails closed.
// Disable with FRONTEND_ALLOW_VERCEL_PREVIEW=false when previews are unused.
const VERCEL_PREVIEW_ORIGIN_RE =
  /^https:\/\/construction-[a-z0-9-]+-talibaziz0786-dots-projects\.vercel\.app$/;
const allowVercelPreview = process.env.FRONTEND_ALLOW_VERCEL_PREVIEW !== 'false';

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (allowVercelPreview && VERCEL_PREVIEW_ORIGIN_RE.test(origin)) return true;
  return false;
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    // Fail closed: no origin echo, no wildcard. Never log the raw origin value
    // beyond what cors internals need — the error handler returns a generic 403.
    return callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  // Actual client behavior: AuthContext uses credentials:'include' (cookies);
  // calculator POSTs send Content-Type: application/json. Preflight must allow
  // both, and must never emit Access-Control-Allow-Origin: * with credentials.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};

// Apply security middleware — CORS FIRST so preflight (OPTIONS) and error
// responses always carry CORS headers, before auth/rate-limit/routes.
app.use(cors(corsOptions));
app.use(helmet());
app.set('trust proxy', 1); // honor X-Forwarded-* from Render/load balancers
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Rate limiters (with test environment bypass / relaxed limits)
// Preflight OPTIONS must never count toward limits — browsers send one
// automatically before credentialed POSTs, so limiting it breaks login.
const isTest = process.env.NODE_ENV === 'test';
const skipPreflight = (req: Request): boolean => req.method === 'OPTIONS';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

const calculationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isTest ? 10000 : 30,
  message: 'Too many calculation requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 100000 : 1000,
  message: 'Too many requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

app.get('/api/health', (req: Request, res: Response) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  const state = dbStates[readyState] ?? 'unknown';
  // Render health checks only need the process to answer; persistence
  // readiness is reported explicitly so dashboards never mistake the
  // in-memory fallback for a healthy database.
  const db = readyState === 1 ? 'connected' : 'unavailable';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db,
    mongo: {
      readyState,
      state,
      name: mongoose.connection.name || null,
    },
  });
});

// Auth routes (public) - Apply auth limiter
app.use('/api/auth', authLimiter, authRoutes);

// Calculator hub + quick calculations (public, server-authoritative) - Apply calculation limiter
app.use('/api', calculationLimiter, calculatorRoutes);

app.use('/api', apiLimiter, projectRoutes);

// Protected project routes (require authentication) - Apply general API limiter
app.use('/api/projects', apiLimiter, protectedProjectRoutes);

// Calculation routes (public, server-authoritative) - Apply calculation limiter
app.use('/api/projects/calculate', calculationLimiter, projectCalculate);

// 404 handler — CORS headers are already set by the cors() middleware above,
// so denied/unknown paths still expose the correct ACAO to allowed origins.
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler (no stack leak)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const message = err?.message ?? '';
  // CORS rejections are client configuration errors, not server crashes.
  // The cors() middleware does NOT attach ACAO on rejection, so re-emit it
  // here for origins we trust — otherwise the browser reports a bare
  // "No Access-Control-Allow-Origin header" with no usable status/body.
  if (message.startsWith('CORS: origin')) {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // Malformed JSON bodies should be 400, not 500.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error('[error]', message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;