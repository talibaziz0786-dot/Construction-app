import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' }); // Use .env.test for test environment

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/construction_test';
  if (mongoose.connection.readyState === 0) {
    try {
      // CORS/pure-unit tests import app without needing persistence. Fail fast
      // here so they don't hang on the default 30s server-selection timeout
      // when no local Mongo is running; DB-backed suites still fail loudly on
      // their first model call.
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    } catch (err) {
      console.warn('[test-setup] Mongo unavailable, continuing without DB:', (err as Error)?.message ?? err);
    }
  }
}, 15000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});