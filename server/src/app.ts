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
// (e.g. "https://your-app.vercel.app,https://www.your-domain.com").
// Development: defaults to http://localhost:5173 plus its loopback-alias
// http://127.0.0.1:5173 (same machine, same port — browsers treat these as
// different origins, so both must be accepted or calculator POSTs from the
// alias are rejected before reaching the route).
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
};

// Apply security middleware
app.use(helmet());
app.set('trust proxy', 1); // honor X-Forwarded-* from Render/load balancers
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Rate limiters (with test environment bypass / relaxed limits)
const isTest = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const calculationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isTest ? 10000 : 30,
  message: 'Too many calculation requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 100000 : 1000,
  message: 'Too many requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req: Request, res: Response) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  const state = dbStates[readyState] ?? 'unknown';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler (no stack leak)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const message = err?.message ?? '';
  // CORS rejections are client configuration errors, not server crashes.
  if (message.startsWith('CORS: origin')) {
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