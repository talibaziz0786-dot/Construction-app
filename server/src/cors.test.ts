import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

const PRODUCTION_ORIGIN = 'https://construction-app-tan.vercel.app';
// Live preview origin from the reported browser console (Oct 2026 evidence).
const PREVIEW_ORIGIN =
  'https://construction-vrehk38ie-talibaziz0786-dots-projects.vercel.app';
const ATTACKER_ORIGIN = 'https://evil.example.com';
const OTHER_TEAM_PREVIEW = 'https://construction-abc123-other-team.vercel.app';

async function loadAppWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const mod = await import('./app.js');
  return mod.default;
}

async function loadAppWithFrontendUrl(value: string | undefined) {
  return loadAppWithEnv({ FRONTEND_URL: value });
}

describe('CORS frontend origin handling', () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousPreviewFlag = process.env.FRONTEND_ALLOW_VERCEL_PREVIEW;

  afterEach(() => {
    if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousFrontendUrl;
    if (previousPreviewFlag === undefined) delete process.env.FRONTEND_ALLOW_VERCEL_PREVIEW;
    else process.env.FRONTEND_ALLOW_VERCEL_PREVIEW = previousPreviewFlag;
    vi.resetModules();
  });

  beforeEach(() => {
    vi.resetModules();
  });

  it('allows the exact production frontend origin on GET /api/calculators', async () => {
    const app = await loadAppWithFrontendUrl(PRODUCTION_ORIGIN);
    const res = await request(app)
      .get('/api/calculators')
      .set('Origin', PRODUCTION_ORIGIN);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(PRODUCTION_ORIGIN);
    // Credentials are used (auth cookies) so the origin must be echoed exactly —
    // a wildcard with credentials would be rejected by browsers.
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('answers OPTIONS preflight for auth, calculator and project-calculate endpoints with required headers', async () => {
    const app = await loadAppWithFrontendUrl(PRODUCTION_ORIGIN);
    for (const path of ['/api/auth/login', '/api/calculators', '/api/projects/calculate']) {
      const res = await request(app)
        .options(path)
        .set('Origin', PRODUCTION_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');
      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe(PRODUCTION_ORIGIN);
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      const methods = String(res.headers['access-control-allow-methods'] ?? '');
      expect(methods).toMatch(/POST/);
      expect(methods).toMatch(/OPTIONS/);
      const headers = String(res.headers['access-control-allow-headers'] ?? '');
      expect(headers.toLowerCase()).toMatch(/content-type/);
      expect(headers.toLowerCase()).toMatch(/authorization/);
    }
  });

  it('denies OPTIONS preflight for an unrelated origin on /api/projects/calculate', async () => {
    const app = await loadAppWithFrontendUrl(PRODUCTION_ORIGIN);
    const res = await request(app)
      .options('/api/projects/calculate')
      .set('Origin', ATTACKER_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('supports comma-separated FRONTEND_URL allowlist entries', async () => {
    const app = await loadAppWithFrontendUrl(
      ` ${PRODUCTION_ORIGIN} , https://www.example.com `
    );
    for (const origin of [PRODUCTION_ORIGIN, 'https://www.example.com']) {
      const res = await request(app).get('/api/calculators').set('Origin', origin);
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
  });

  it('allows the current anchored Vercel preview origin, denies other teams', async () => {
    const app = await loadAppWithFrontendUrl(PRODUCTION_ORIGIN);
    const allowed = await request(app)
      .get('/api/calculators')
      .set('Origin', PREVIEW_ORIGIN);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(PREVIEW_ORIGIN);
    expect(allowed.headers['access-control-allow-origin']).not.toBe('*');

    const denied = await request(app)
      .get('/api/calculators')
      .set('Origin', OTHER_TEAM_PREVIEW);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('denies an unrelated attacker origin without a wildcard', async () => {
    const app = await loadAppWithFrontendUrl(PRODUCTION_ORIGIN);
    const res = await request(app)
      .get('/api/calculators')
      .set('Origin', ATTACKER_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    // The denial path (403 JSON) must not smuggle a wildcard either.
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('rejects origins outside the FRONTEND_URL allowlist', async () => {
    const app = await loadAppWithFrontendUrl(PRODUCTION_ORIGIN);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
