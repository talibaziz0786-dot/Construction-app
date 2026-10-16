import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from './app.js';
import { isDbReady, isProduction, requirePersistence } from './config/database.js';

describe('Production persistence readiness', () => {
  it('reports db readiness on /api/health without changing the 200 contract', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(['connected', 'unavailable']).toContain(res.body.db);
    expect(res.body.mongo.readyState).toBe(mongoose.connection.readyState);
  });

  it('isDbReady mirrors the mongoose connection state', () => {
    expect(isDbReady()).toBe(mongoose.connection.readyState === 1);
  });

  it('requirePersistence passes through outside production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    let nextCalled = false;
    const res = { status: () => ({ json: () => undefined }) } as never;
    requirePersistence({} as never, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(isProduction()).toBe(false);
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });

  it('requirePersistence returns 503 in production when the db is unavailable', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const original = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', {
      get: () => 0,
      configurable: true,
    });
    let statusCode: number | undefined;
    let payload: unknown;
    const res = {
      status: (code: number) => ({
        json: (body: unknown) => {
          statusCode = code;
          payload = body;
        },
      }),
    } as never;
    let nextCalled = false;
    requirePersistence({} as never, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(503);
    expect(payload).toMatchObject({ error: 'Persistence unavailable' });
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: original,
      configurable: true,
      writable: true,
    });
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });
});
