import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

const FRONTEND_ORIGIN = 'https://construction-app-tan.vercel.app';

async function loadAppWithFrontendUrl(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = value;
  const mod = await import('./app.js');
  return mod.default;
}

describe('CORS frontend origin handling', () => {
  const previous = process.env.FRONTEND_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previous;
    vi.resetModules();
  });

  beforeEach(() => {
    vi.resetModules();
  });

  it('allows the exact production frontend origin on API GET', async () => {
    const app = await loadAppWithFrontendUrl(FRONTEND_ORIGIN);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', FRONTEND_ORIGIN);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
  });

  it('answers OPTIONS preflight for auth and calculator endpoints', async () => {
    const app = await loadAppWithFrontendUrl(FRONTEND_ORIGIN);
    for (const path of ['/api/auth/login', '/api/calculators']) {
      const res = await request(app)
        .options(path)
        .set('Origin', FRONTEND_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');
      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
    }
  });

  it('rejects origins outside the FRONTEND_URL allowlist', async () => {
    const app = await loadAppWithFrontendUrl(FRONTEND_ORIGIN);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
