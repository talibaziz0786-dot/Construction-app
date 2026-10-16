import mongoose from 'mongoose';
import type { Request, Response, NextFunction } from 'express';

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Fail-fast guard for persistence-backed writes.
 * Local dev/test keep the historical in-memory fallback so stateless
 * calculator flows stay usable offline. In production the in-memory Map
 * is ephemeral (lost on restart/redeploy), so accepting writes there
 * would look like data was saved when it was not. Return 503 instead.
 */
export function requirePersistence(req: Request, res: Response, next: NextFunction): void {
  if (isProduction() && !isDbReady()) {
    res.status(503).json({
      error: 'Persistence unavailable',
      details: 'Database is not connected; writes are disabled until connectivity is restored.',
    });
    return;
  }
  next();
}

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/construction-app';
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB Connected...');
  } catch (err: unknown) {
    // Graceful degradation - log warning, continue with in-memory store
    const message = err instanceof Error ? err.message : 'MongoDB connection failed';
    console.warn(`[database] MongoDB unavailable, using in-memory fallback: ${message}`);
    // Do NOT exit; let routes operate in guest/in-memory mode
  }
};

export default connectDB;
